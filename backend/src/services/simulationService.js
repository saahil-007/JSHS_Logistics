import { Shipment } from '../models/Shipment.js';
import { Vehicle } from '../models/Vehicle.js';
import { LocationPing } from '../models/LocationPing.js';
import { getIO } from '../sockets/io.js';

let simulationInterval = null;

import { getDrivingRoute } from './routeService.js';



export function startSimulation() {
    if (simulationInterval) return { message: 'Simulation already running', running: true };

    console.log('[SIMULATION] Engine Started');

    simulationInterval = setInterval(async () => {
        try {
            const shipments = await Shipment.find({
                status: { $in: ['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'PICKED_UP'] }
            });

            const io = getIO();

            if (shipments.length === 0) return;

            for (const s of shipments) {
                // Ensure Route Exists
                if (!s.routeGeoJson || !s.routeGeoJson.coordinates || s.routeGeoJson.coordinates.length < 2) {
                    try {
                        const route = await getDrivingRoute({ origin: s.origin, destination: s.destination });
                        if (route.geojson) {
                            s.routeProvider = route.provider;
                            s.routeGeoJson = route.geojson;
                            s.distanceKm = route.distanceKm || s.distanceKm;
                            s.currentRouteIndex = 0; // Start at beginning
                            await s.save();
                        }
                    } catch (err) {
                        console.error(`[SIMULATION] Route calc failed for ${s.referenceId}:`, err.message);
                        continue; // Skip this shipment this tick
                    }
                }

                if (!s.routeGeoJson || !s.routeGeoJson.coordinates) continue;

                const routePoints = s.routeGeoJson.coordinates; // [[lng, lat]]
                let idx = s.currentRouteIndex || 0;

                // Move forward by constant steps (e.g. 5 points per tick to be visible)
                // OSRM points are dense.
                const speedMultiplier = 3;
                let nextIdx = idx + speedMultiplier;

                if (nextIdx >= routePoints.length) {
                    nextIdx = routePoints.length - 1;
                    // Arrived? Maybe stop? allow looping or stay at end
                }

                const nextPoint = routePoints[nextIdx]; // [lng, lat]
                if (!nextPoint) continue;

                const newLat = nextPoint[1];
                const newLng = nextPoint[0];

                // Update location
                s.currentLocation = {
                    lat: newLat,
                    lng: newLng,
                    updatedAt: new Date()
                };
                s.currentRouteIndex = nextIdx;

                // Progress
                const progress = Math.min(100, Math.round((nextIdx / routePoints.length) * 100));
                s.progressPercentage = progress;

                await s.save();

                // Update Associated Vehicle
                if (s.assignedVehicleId) {
                    await Vehicle.findByIdAndUpdate(s.assignedVehicleId, {
                        currentLocation: { lat: newLat, lng: newLng, updatedAt: new Date() }
                    });
                }

                // Emit Events
                if (io) {
                    io.to(`shipment:${s._id}`).emit('shipment:locationUpdate', {
                        shipmentId: s._id,
                        lat: newLat,
                        lng: newLng,
                        ts: new Date().toISOString()
                    });

                    if (s.assignedVehicleId) {
                        io.emit('fleet:locationUpdate', {
                            vehicleId: s.assignedVehicleId,
                            lat: newLat,
                            lng: newLng,
                            ts: new Date().toISOString()
                        });
                    }
                }
            }
        } catch (e) {
            console.error('[SIMULATION] Step Error:', e);
        }
    }, 2000);

    return { message: 'Simulation started', running: true };
}

export function stopSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
        console.log('[SIMULATION] Engine Stopped');
    }
    return { message: 'Simulation stopped', running: false };
}

export function getSimulationStatus() {
    return { running: !!simulationInterval };
}
