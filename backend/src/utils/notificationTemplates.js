
/**
 * Utility to generate standardized notification messages based on event types and roles.
 */
export function getNotificationTemplate(eventType, shipment, role = 'CUSTOMER') {
    const ref = shipment.referenceId || 'Unknown';

    // Base templates
    const templates = {
        // Standard Lifecycle
        SHIPMENT_CREATED: {
            default: { message: `Shipment ${ref} has been created.`, severity: 'INFO' },
            CUSTOMER: { message: `Your order ${ref} has been placed successfully.`, severity: 'SUCCESS' },
            MANAGER: { message: `New shipment ${ref} created.`, severity: 'INFO' }
        },
        SHIPMENT_ASSIGNED: {
            default: { message: `Shipment ${ref} has been assigned.`, severity: 'INFO' },
            DRIVER: { message: `You have been assigned to shipment ${ref}. Please start pickup.`, severity: 'INFO' },
            MANAGER: { message: `Driver assigned to shipment ${ref}.`, severity: 'SUCCESS' }
        },
        SHIPMENT_PICKED_UP: {
            default: { message: `Shipment ${ref} has been picked up.`, severity: 'INFO' },
            CUSTOMER: { message: `Driver has picked up your shipment ${ref}.`, severity: 'INFO' }
        },
        SHIPMENT_DISPATCHED: {
            default: { message: `Shipment ${ref} is now in transit.`, severity: 'INFO' },
            CUSTOMER: { message: `Your shipment ${ref} is on its way!`, severity: 'SUCCESS' }
        },
        SHIPMENT_OUT_FOR_DELIVERY: {
            default: { message: `Shipment ${ref} is out for delivery.`, severity: 'INFO' },
            CUSTOMER: { message: `Get ready! Your shipment ${ref} is out for delivery today.`, severity: 'SUCCESS' }
        },
        SHIPMENT_DELIVERED: {
            default: { message: `Shipment ${ref} has been delivered.`, severity: 'SUCCESS' },
            CUSTOMER: { message: `Shipment ${ref} delivered. Thanks for choosing us!`, severity: 'SUCCESS' },
            DRIVER: { message: `Delivery for ${ref} confirmed. Good job!`, severity: 'SUCCESS' }
        },

        // Exceptions & Alerts
        SHIPMENT_DELAYED: {
            default: { message: `Shipment ${ref} is delayed.`, severity: 'WARNING' },
            CUSTOMER: { message: `Sorry, shipment ${ref} is slightly delayed. We're on it.`, severity: 'WARNING' },
            MANAGER: { message: `Delay alert for ${ref}. Check traffic updates.`, severity: 'ERROR' }
        },
        PREDICTED_DELAY: {
            default: { message: `Potential delay detected for ${ref}.`, severity: 'WARNING' },
            MANAGER: { message: `AI Prediction: High risk of delay for ${ref}.`, severity: 'WARNING' }
        },
        MAINTENANCE: {
            default: { message: `Maintenance alert for vehicle attached to ${ref}.`, severity: 'ERROR' }
        },
        GEOFENCE_EXIT: {
            default: { message: `Shipment ${ref} has left the designated zone.`, severity: 'WARNING' }
        },
        // Progress Milestones
        SHIPMENT_25_PERCENT: {
            default: { message: `Shipment ${ref} has reached 25% of its journey.`, severity: 'INFO' },
            CUSTOMER: { message: `Your shipment ${ref} is 25% complete.`, severity: 'INFO' },
            DRIVER: { message: `Shipment ${ref} is 25% done. Keep going!`, severity: 'INFO' },
            MANAGER: { message: `Shipment ${ref} progress at 25%.`, severity: 'INFO' }
        },
        SHIPMENT_50_PERCENT: {
            default: { message: `Shipment ${ref} is halfway through its route.`, severity: 'INFO' },
            CUSTOMER: { message: `Your shipment ${ref} is 50% complete.`, severity: 'INFO' },
            DRIVER: { message: `Halfway there for shipment ${ref}.`, severity: 'INFO' },
            MANAGER: { message: `Shipment ${ref} progress at 50%.`, severity: 'INFO' }
        },
        SHIPMENT_75_PERCENT: {
            default: { message: `Shipment ${ref} has covered 75% of its route.`, severity: 'INFO' },
            CUSTOMER: { message: `Your shipment ${ref} is 75% complete.`, severity: 'INFO' },
            DRIVER: { message: `Almost done! 75% of shipment ${ref} completed.`, severity: 'INFO' },
            MANAGER: { message: `Shipment ${ref} progress at 75%.`, severity: 'INFO' }
        },
        ARRIVAL_SOON: {
            default: { message: `Shipment ${ref} is arriving soon.`, severity: 'INFO' },
            CUSTOMER: { message: `Your shipment ${ref} will arrive shortly.`, severity: 'SUCCESS' },
            DRIVER: { message: `Prepare for delivery of ${ref}.`, severity: 'INFO' },
            MANAGER: { message: `Shipment ${ref} nearing destination.`, severity: 'INFO' }
        },
        LOCATION_UPDATE: {
            default: { message: `Shipment ${ref} location updated.`, severity: 'INFO' },
            CUSTOMER: { message: `Your shipment ${ref} location has been updated.`, severity: 'INFO' },
            DRIVER: { message: `Location ping received for ${ref}.`, severity: 'INFO' },
            MANAGER: { message: `Shipment ${ref} location change logged.`, severity: 'INFO' }
        },
        IOT_ALERT_FUEL: {
            default: { message: `Low fuel alert detected.`, severity: 'WARNING' },
            MANAGER: { message: `CRITICAL: Low fuel detected for vehicle attached to ${ref}.`, severity: 'WARNING' },
            DRIVER: { message: `ATTENTION: Fuel levels are low. Please refill soon.`, severity: 'WARNING' }
        },
        IOT_ALERT_TEMP: {
            default: { message: `Temperature breach alert.`, severity: 'ERROR' },
            MANAGER: { message: `CRITICAL: Temperature breach for vehicle attached to ${ref}.`, severity: 'ERROR' },
            DRIVER: { message: `ALERT: Chiller temperature is out of range! Check system immediately.`, severity: 'ERROR' }
        },
    };

    const eventTemplates = templates[eventType] || {};
    // Return role-specific message if exists, else default, else generic fallback
    return eventTemplates[role] || eventTemplates.default || { message: `${eventType}: Shipment ${ref}`, severity: 'INFO' };
}
