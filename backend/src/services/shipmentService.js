import { Shipment } from '../models/Shipment.js'
import { LocationPing } from '../models/LocationPing.js'
import { Vehicle } from '../models/Vehicle.js'
import { User } from '../models/User.js'
import { DriverEvent } from '../models/DriverEvent.js'
import { env } from '../config/env.js'
import { createNotification, createShipmentNotification, createPredictiveNotifications, sendMilestoneNotifications, sendProactiveNotifications } from './notificationService.js'
import { audit } from './auditService.js'
import { estimateEta, haversineKm } from '../utils/geo.js'
import { getDrivingRoute, getRealTimeEta, getRealTimeOptimizedRoute } from './routeService.js'
import { createWeatherTrafficAlerts } from './weatherTrafficService.js'
import { ShipmentEvent } from '../models/ShipmentEvent.js'
import { calculateShipmentProgress, calculateEstimatedArrival, detectRouteDeviation, checkGeofenceViolations } from './gpsTrackingService.js'
import * as pricingService from './pricingService.js'

export async function addLocationPing({ shipmentId, driverId, lat, lng, speedKmph, heading, ts }) {
  if (!shipmentId) {
    const err = new Error('shipmentId is required')
    err.statusCode = 400
    throw err
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    const err = new Error('lat/lng are required')
    err.statusCode = 400
    throw err
  }

  const shipment = await Shipment.findById(shipmentId)
  if (!shipment) {
    const err = new Error('Shipment not found')
    err.statusCode = 404
    throw err
  }

  // Security: only the assigned, approved driver may ping a shipment
  if (!driverId) {
    const err = new Error('driverId is required')
    err.statusCode = 401
    throw err
  }

  const driver = await User.findById(driverId).lean()
  if (!driver || driver.role !== 'DRIVER') {
    const err = new Error('Driver not found')
    err.statusCode = 404
    throw err
  }

  if (driver.driverApprovalStatus !== 'APPROVED') {
    const err = new Error('Driver not approved')
    err.statusCode = 403
    throw err
  }

  if (String(shipment.assignedDriverId ?? '') !== String(driverId)) {
    const err = new Error('Forbidden')
    err.statusCode = 403
    throw err
  }

  const pingTs = ts ?? new Date()

  const prev = await LocationPing.findOne({ shipmentId: shipment._id, driverId }).sort({ ts: -1 }).lean()

  const ping = await LocationPing.create({
    shipmentId: shipment._id,
    vehicleId: shipment.assignedVehicleId,
    driverId,
    lat,
    lng,
    speedKmph,
    heading,
    ts: pingTs,
  })

  // Driver behavior analytics (heuristics)
  const cooldownMs = env.DRIVER_EVENT_COOLDOWN_SEC * 1000

  async function recentlyEmitted(type) {
    const last = await DriverEvent.findOne({ shipmentId: shipment._id, driverId, type }).sort({ ts: -1 }).select('ts').lean()
    if (!last?.ts) return false
    return pingTs.getTime() - new Date(last.ts).getTime() < cooldownMs
  }

  // SPEEDING
  if (typeof speedKmph === 'number' && speedKmph > env.SPEED_LIMIT_KMPH) {
    if (!(await recentlyEmitted('SPEEDING'))) {
      await DriverEvent.create({
        shipmentId: shipment._id,
        driverId,
        vehicleId: shipment.assignedVehicleId,
        type: 'SPEEDING',
        severity: Math.max(1, Math.round((speedKmph - env.SPEED_LIMIT_KMPH) / 5)),
        ts: pingTs,
        metadata: { speedKmph, limitKmph: env.SPEED_LIMIT_KMPH },
      })
    }
  }

  // HARSH_TURN (requires previous ping)
  if (
    prev &&
    typeof prev.heading === 'number' &&
    typeof heading === 'number' &&
    typeof prev.ts !== 'undefined' &&
    typeof speedKmph === 'number' &&
    speedKmph > 10
  ) {
    const dtSec = (pingTs.getTime() - new Date(prev.ts).getTime()) / 1000
    if (dtSec > 0 && dtSec <= env.HARSH_TURN_WINDOW_SEC) {
      const raw = Math.abs(heading - prev.heading)
      const delta = Math.min(raw, 360 - raw)
      if (delta >= env.HARSH_TURN_DEG) {
        if (!(await recentlyEmitted('HARSH_TURN'))) {
          await DriverEvent.create({
            shipmentId: shipment._id,
            driverId,
            vehicleId: shipment.assignedVehicleId,
            type: 'HARSH_TURN',
            severity: Math.max(1, Math.round(delta / 30)),
            ts: pingTs,
            metadata: { deltaDeg: delta, windowSec: dtSec },
          })
        }
      }
    }
  }

  // IDLING: if speed is near zero for a while
  if (prev && typeof prev.ts !== 'undefined') {
    const prevSpeed = typeof prev.speedKmph === 'number' ? prev.speedKmph : null
    const dtSec = (pingTs.getTime() - new Date(prev.ts).getTime()) / 1000
    const nowIdle = typeof speedKmph === 'number' && speedKmph < 2
    const prevIdle = typeof prevSpeed === 'number' && prevSpeed < 2

    if (nowIdle && prevIdle && dtSec >= env.IDLE_WINDOW_SEC) {
      if (!(await recentlyEmitted('IDLING'))) {
        await DriverEvent.create({
          shipmentId: shipment._id,
          driverId,
          vehicleId: shipment.assignedVehicleId,
          type: 'IDLING',
          severity: 1,
          ts: pingTs,
          metadata: { idleForSec: Math.round(dtSec) },
        })
      }
    }
  }

  // Compute distance once (straight-line as a demo heuristic)
  if (typeof shipment.distanceKm !== 'number') {
    shipment.distanceKm = Math.round(haversineKm(shipment.origin, shipment.destination) * 100) / 100
  }

  shipment.currentLocation = { lat, lng, updatedAt: ping.ts }

  // Update predicted ETA based on current location using real-time calculation
  try {
    shipment.predictedEta = await getRealTimeEta({
      shipmentId: shipment._id,
      currentLocation: { lat, lng },
      speedKmph
    });
  } catch (etaErr) {
    // Fallback to original method if real-time calculation fails
    shipment.predictedEta = estimateEta({ from: { lat, lng }, to: shipment.destination, speedKmph, now: ping.ts });
    console.warn('Real-time ETA calculation failed, using fallback:', etaErr.message);
  }

  shipment.predictedEtaUpdatedAt = ping.ts

  // Update distance remaining using optimized route
  let distanceRemaining;
  try {
    const route = await getRealTimeOptimizedRoute({
      shipmentId: shipment._id,
      currentLocation: { lat, lng }
    });
    distanceRemaining = route.distanceKm || haversineKm({ lat, lng }, shipment.destination);
  } catch (routeErr) {
    // Fallback to haversine distance if optimized route fails
    distanceRemaining = haversineKm({ lat, lng }, shipment.destination);
    console.warn('Real-time route optimization failed, using fallback:', routeErr.message);
  }

  shipment.distanceRemainingKm = distanceRemaining;

  // Calculate progress percentage
  if (shipment.distanceKm && shipment.distanceKm > 0) {
    shipment.progressPercentage = Math.min(100, Math.round(((shipment.distanceKm - distanceRemaining) / shipment.distanceKm) * 100));
  }

  // Check if shipment status should be updated to IN_TRANSIT
  if (shipment.status === 'DISPATCHED') {
    shipment.status = 'IN_TRANSIT';

    // Create notification for shipment in transit
    try {
      await createShipmentNotification(shipment, 'SHIPMENT_IN_TRANSIT');
    } catch (err) {
      console.error('Error creating IN_TRANSIT notification:', err.message);
    }
  }

  // **WORKFLOW 1: OUT_FOR_DELIVERY auto-trigger when near destination (< 5km)**
  if (shipment.status === 'IN_TRANSIT' && distanceRemaining < 5) {
    shipment.status = 'OUT_FOR_DELIVERY';
    try {
      await createShipmentNotification(shipment, 'SHIPMENT_NEAR_DESTINATION', `Shipment ${shipment.referenceId} is out for delivery and approaching destination.`);
    } catch (err) {
      console.error('Error creating OUT_FOR_DELIVERY notification:', err.message);
    }
  }

  // **WORKFLOW 1: DELAYED state handling based on significant delay (> 30 min)**
  const delayThresholdMs = 30 * 60 * 1000; // 30 minutes
  const delayCooldownMs = 15 * 60 * 1000;

  if (shipment.eta && shipment.predictedEta && shipment.predictedEta.getTime() > shipment.eta.getTime() + delayThresholdMs) {
    // Mark as DELAYED if currently IN_TRANSIT
    if (shipment.status === 'IN_TRANSIT') {
      shipment.status = 'DELAYED';
    }

    const last = shipment.lastDelayNotifiedAt ? shipment.lastDelayNotifiedAt.getTime() : 0;
    if (!last || ping.ts.getTime() - last > delayCooldownMs) {
      shipment.lastDelayNotifiedAt = ping.ts;
      await createShipmentNotification(shipment, 'SHIPMENT_DELAYED', `Shipment ${shipment.referenceId} is experiencing delays. New ETA: ${shipment.predictedEta.toLocaleString()}`);
    }
  } else if (shipment.status === 'DELAYED' && shipment.eta && shipment.predictedEta && shipment.predictedEta.getTime() <= shipment.eta.getTime() + delayThresholdMs) {
    // **WORKFLOW 1: Recovery from DELAYED back to IN_TRANSIT**
    shipment.status = 'IN_TRANSIT';
    await createShipmentNotification(shipment, 'DELAY_RESOLVED', `Shipment ${shipment.referenceId} is back on schedule.`);
  }

  await shipment.save()

  // Create predictive notifications based on updated shipment data
  try {
    await createPredictiveNotifications(shipment);
  } catch (err) {
    console.error('Error creating predictive notifications:', err.message);
  }

  // Send milestone notifications
  try {
    await sendMilestoneNotifications(shipment);
  } catch (err) {
    console.error('Error sending milestone notifications:', err.message);
  }

  // Send proactive notifications
  try {
    await sendProactiveNotifications(shipment);
  } catch (err) {
    console.error('Error sending proactive notifications:', err.message);
  }

  // Create weather and traffic alerts if needed
  try {
    await createWeatherTrafficAlerts(shipment);
  } catch (err) {
    console.error('Error creating weather/traffic alerts:', err.message);
  }

  // Check geofence violations
  try {
    const { checkGeofenceViolations } = await import('./geofencingService.js')
    await checkGeofenceViolations({
      lat,
      lng,
      shipmentId: shipment._id,
      driverId,
      speedKmph
    })
  } catch (err) {
    console.error('Error checking geofence violations:', err.message);
  }

  return ping
}

// **WORKFLOW 3: Enhanced function to find drivers within radius, filter by capacity, sort by rating**
export async function findNearestAvailableResources({ origin, requiredCapacityKg = 0, vehicleType = null, radiusKm = 10 }) {
  // Find available vehicles matching criteria
  const vehicleQuery = { status: 'AVAILABLE' };
  if (vehicleType) vehicleQuery.type = vehicleType;
  if (requiredCapacityKg > 0) vehicleQuery.capacityKg = { $gte: requiredCapacityKg };

  const availableVehicles = await Vehicle.find(vehicleQuery).lean();

  // Find approved drivers sorted by rating (descending) and utilization
  const availableDrivers = await User.find({
    role: 'DRIVER',
    driverApprovalStatus: 'APPROVED'
  }).sort({ performanceRating: -1 }).lean();

  // Get latest location pings for each driver to calculate distance
  const candidatesWithDistance = [];

  // Parallelize driver checks
  const driverPromises = availableDrivers.map(async (driver) => {
    // Get driver's last known location from their most recent shipment ping
    const lastPing = await LocationPing.findOne({ driverId: driver._id }).sort({ ts: -1 }).lean();

    let driverLocation = null;
    let distance = Infinity;

    if (lastPing) {
      driverLocation = { lat: lastPing.lat, lng: lastPing.lng };
      distance = haversineKm(origin, driverLocation);
    } else {
      // If no ping, assume driver is available but distance unknown (assign lower priority)
      distance = radiusKm; // Place at edge of radius
    }

    // **WORKFLOW 3: Filter by radius (10km default)**
    if (distance <= radiusKm) {
      // Check if driver is not currently assigned to an active shipment
      const activeShipment = await Shipment.findOne({
        assignedDriverId: driver._id,
        status: { $in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] }
      }).lean();

      if (!activeShipment) {
        return {
          driver,
          distance,
          location: driverLocation,
          utilizationScore: activeShipment ? 1 : 0, // 0 = available, 1 = busy
          rating: driver.performanceRating || 5
        };
      }
    }
    return null;
  });

  const results = await Promise.all(driverPromises);
  candidatesWithDistance.push(...results.filter(r => r !== null));

  // **WORKFLOW 3: Sort by rating (desc) then distance (asc)**
  candidatesWithDistance.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.distance - b.distance;
  });

  // Fallback: If no drivers in radius, try picking ANY approved driver
  let nearestDriver = candidatesWithDistance.length > 0 ? candidatesWithDistance[0].driver : null;
  if (!nearestDriver && availableDrivers.length > 0) {
    nearestDriver = availableDrivers[0];
    console.log(`[Demo Fallback] No drivers in ${radiusKm}km radius. Picking first available approved driver: ${nearestDriver.name}`);
  }

  // Find first available vehicle for the best candidate
  let nearestVehicle = availableVehicles.length > 0 ? availableVehicles[0] : null;

  // Fallback: If no vehicle matches criteria, try picking ANY available vehicle
  if (!nearestVehicle) {
    const anyAvailableRecord = await Vehicle.findOne({ status: 'AVAILABLE' }).lean();
    if (anyAvailableRecord) {
      nearestVehicle = anyAvailableRecord;
      console.log(`[Demo Fallback] No vehicle matching criteria. Picking any available vehicle: ${nearestVehicle.plateNumber}`);
    }
  }

  // SUPER FALLBACK for demo: If still null, pick literally any record from DB
  if (!nearestDriver) {
    const anyDriver = await User.findOne({ role: 'DRIVER' }).lean();
    if (anyDriver) {
      nearestDriver = anyDriver;
      console.log(`[Super Fallback] Picking literally ANY driver: ${anyDriver.name}`);
    }
  }

  if (!nearestVehicle) {
    const anyVehicle = await Vehicle.findOne({}).lean();
    if (anyVehicle) {
      nearestVehicle = anyVehicle;
      console.log(`[Super Fallback] Picking literally ANY vehicle: ${anyVehicle.plateNumber}`);
    }
  }

  let candidatesList = candidatesWithDistance;

  return {
    vehicle: nearestVehicle,
    driver: nearestDriver,
    candidates: candidatesList,
    matchedVehicles: availableVehicles
  };
}

// **WORKFLOW 3: Enhanced auto-assign with manager fallback and driver request**
export async function autoAssignShipment({ shipmentId, actorId, requiredCapacityKg = 0, vehicleType = null }) {
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) {
    const err = new Error('Shipment not found');
    err.statusCode = 404;
    throw err;
  }

  // Find nearest available vehicle and driver within 10km radius
  const { vehicle, driver, candidates, matchedVehicles } = await findNearestAvailableResources({
    origin: shipment.origin,
    requiredCapacityKg: requiredCapacityKg || shipment.packageDetails?.weight || 0,
    vehicleType
  });

  // **WORKFLOW 3: If no candidate found, alert manager**
  if (!vehicle || !driver) {
    // Find a manager to notify
    const manager = await User.findOne({ role: 'MANAGER' }).select('_id').lean();
    if (manager?._id) {
      await createNotification({
        userId: manager._id,
        type: 'ASSIGNMENT_FAILED',
        severity: 'WARNING',
        message: `Auto-assignment failed for shipment ${shipment.referenceId}. No available vehicle/driver within range. Manual intervention required.`,
        metadata: { shipmentId: shipment._id, availableVehicles: matchedVehicles.length, availableDrivers: candidates.length }
      });
    }
    const err = new Error('No available vehicle or driver found within 10km radius. Manager has been notified.');
    err.statusCode = 400;
    throw err;
  }

  // **WORKFLOW 3: Create assignment request for driver (pending acceptance)**
  shipment.assignedVehicleId = vehicle._id;
  shipment.assignedDriverId = driver._id;
  shipment.status = 'ASSIGNED';
  shipment.lastEventAt = new Date();
  await shipment.save();

  // Mark vehicle as in use
  await Vehicle.findByIdAndUpdate(vehicle._id, { status: 'IN_USE' }, { new: true });

  await audit({
    actorId,
    action: 'SHIPMENT_AUTO_ASSIGNED',
    entityType: 'Shipment',
    entityId: shipment._id,
    metadata: { vehicleId: vehicle._id, driverId: driver._id, radiusKm: 10 }
  });

  await ShipmentEvent.create({
    shipmentId: shipment._id,
    type: 'SHIPMENT_ASSIGNED',
    description: `Auto-assigned to driver ${driver.name} and vehicle ${vehicle.plateNumber}`,
    location: shipment.origin,
    actorId: actorId || driver._id, // If actorId is null (system), use driverId or keep undefined if schema allows
    metadata: {
      vehicleId: vehicle._id,
      driverId: driver._id,
      method: 'AUTO'
    }
  });

  // **WORKFLOW 3: Send request notification to driver**
  await createNotification({
    userId: driver._id,
    type: 'ASSIGNMENT_REQUEST',
    severity: 'INFO',
    message: `New shipment ${shipment.referenceId} assigned to you. Origin: ${shipment.origin.name}, Destination: ${shipment.destination.name}. Please accept or reject.`,
    metadata: { shipmentId: shipment._id, referenceId: shipment.referenceId }
  });

  return shipment;
}

export async function assignShipment({ shipmentId, vehicleId, driverId, actorId }) {
  const shipment = await Shipment.findById(shipmentId)
  if (!shipment) {
    const err = new Error('Shipment not found')
    err.statusCode = 404
    throw err
  }

  const vehicle = await Vehicle.findById(vehicleId)
  if (!vehicle) {
    const err = new Error('Vehicle not found')
    err.statusCode = 404
    throw err
  }

  const actor = await User.findById(actorId).lean()
  if (!actor || actor.role !== 'MANAGER') {
    const err = new Error('Invalid actor')
    err.statusCode = 403
    throw err
  }

  const driver = await User.findById(driverId)
  if (!driver || driver.role !== 'DRIVER') {
    const err = new Error('Driver not found')
    err.statusCode = 404
    throw err
  }

  if (driver.driverApprovalStatus !== 'APPROVED') {
    const err = new Error('Driver not approved')
    err.statusCode = 403
    throw err
  }

  shipment.assignedVehicleId = vehicle._id
  shipment.assignedDriverId = driver._id
  shipment.status = 'ASSIGNED'
  shipment.lastEventAt = new Date()
  await shipment.save()

  // Mark vehicle in use (simple heuristic)
  if (vehicle.status !== 'IN_USE') {
    vehicle.status = 'IN_USE'
    await vehicle.save()
  }

  await audit({ actorId, action: 'SHIPMENT_ASSIGNED', entityType: 'Shipment', entityId: shipment._id, metadata: { vehicleId, driverId } })

  await ShipmentEvent.create({
    shipmentId: shipment._id,
    type: 'SHIPMENT_ASSIGNED',
    description: `Assigned to driver ${driver.name} and vehicle ${vehicle.plateNumber} by manager`,
    location: shipment.origin,
    actorId,
    metadata: {
      vehicleId: vehicle._id,
      driverId: driver._id,
      method: 'MANUAL'
    }
  });

  if (driverId) {
    await createNotification({
      userId: driverId,
      type: 'ASSIGNMENT',
      message: `You have been assigned shipment ${shipment.referenceId}.`,
    })
  }

  return shipment
}

/**
 * Automatically assign the best available driver and vehicle for a customer shipment
 */
export async function autoAssignCustomerShipment({ origin, weightKg }) {
  const { vehicle, driver } = await findNearestAvailableResources({
    origin,
    requiredCapacityKg: weightKg,
    radiusKm: 50 // Extended radius for customer self-service
  });

  if (!vehicle || !driver) {
    throw new Error('No available vehicles or drivers found within service range.');
  }

  return { vehicleId: vehicle._id, driverId: driver._id };
}

/**
 * Prepare shipment data without saving to DB
 */
export async function prepareCustomerShipment({ customerId, data }) {
  const { origin, destination, goodsImages, packageDetails, deliveryType, pricingMode, customPrice, category, customCategory } = data;

  // 1. Calculate distance
  const distance = haversineKm(origin, destination);

  // Derive category (fallback to KIRANA if not provided)
  const selectedCategory = category && ['KIRANA', 'DAWAI', 'KAPDA', 'DAIRY', 'AUTO_PARTS', 'ELECTRONICS'].includes(category)
    ? category
    : 'KIRANA';

  // 2. Comprehensive Industrial Pricing Engine
  const pricingData = await pricingService.calculateShipmentFinalCost({
    origin,
    destination,
    weightKg: packageDetails?.weight || 0,
    shipmentType: selectedCategory,
    deliveryType: deliveryType || 'standard'
  });

  let finalPrice = pricingData.grandTotal;
  if (pricingMode === 'CUSTOM' && typeof customPrice === 'number' && customPrice > 0) {
    finalPrice = Math.round(customPrice);
  }

  // 3. Preliminary Driver Payout Calculation
  const payoutData = await pricingService.calculateDriverShipmentPayout({
    totalRevenue: finalPrice,
    distanceKm: distance,
    driverRating: 5.0 // Default for new assignments
  });

  // 3. Auto-assign resources (Dry run to check availability)
  const { vehicleId, driverId } = await autoAssignCustomerShipment({
    origin,
    weightKg: packageDetails?.weight || 0
  });

  // 4. Generate unique reference ID
  const referenceId = `JSHS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // 5. Predict ETA
  const eta = estimateEta({ from: origin, to: destination });

  return {
    referenceId,
    origin,
    destination,
    createdBy: customerId,
    createdByRole: 'CUSTOMER',
    customerId,
    goodsImages,
    packageDetails,
    deliveryType,
    distanceKm: distance,
    // Pricing fields
    price: finalPrice,
    paymentAmount: finalPrice,
    paymentAmountCharged: 1,
    pricingBreakdown: pricingData,
    payoutBreakdown: payoutData,
    driverEarnings: {
      amount: payoutData.netEarnings,
      status: 'PENDING'
    },
    // Category selection (manual)
    shipmentType: selectedCategory,
    // Custom category name (if provided)
    customGoodsCategory: customCategory,
    assignedVehicleId: vehicleId,
    assignedDriverId: driverId,
    status: 'CREATED',
    approvalStatus: 'PENDING_APPROVAL',
    paymentStatus: 'PENDING',
    eta
  };
}

/**
 * Create a new shipment from a customer self-service request (Finalize)
 */
export async function createCustomerShipment({ customerId, shipmentData }) {
  // 1. Create the shipment document
  const shipment = await Shipment.create(shipmentData);

  // 2. Audit and Notifications
  await audit({
    actorId: customerId,
    action: 'SHIPMENT_CREATED_BY_CUSTOMER',
    entityType: 'Shipment',
    entityId: shipment._id,
    metadata: { referenceId: shipment.referenceId, actualPrice: shipment.price }
  });

  await createShipmentNotification(shipment, 'SHIPMENT_CREATED', 'A new customer shipment is awaiting your approval.');

  return shipment;
}

