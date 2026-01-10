import mongoose from 'mongoose'

export const VEHICLE_STATUS = ['AVAILABLE', 'IN_USE', 'MAINTENANCE']

const vehicleSchema = new mongoose.Schema(
  {
    plateNumber: { type: String, required: true, unique: true, index: true },
    model: { type: String },
    status: { type: String, enum: VEHICLE_STATUS, default: 'AVAILABLE' },
    odometerKm: { type: Number, default: 0 },
    nextServiceAtKm: { type: Number, default: 10000 },
    fuelEfficiencyKmpl: { type: Number, default: 10 },
    pucNumber: { type: String, sparse: true },
    rcNumber: { type: String, sparse: true },
    capacityKg: { type: Number, required: true, default: 1000 },
    type: { type: String, enum: ['TRUCK_LG', 'TRUCK_SM', 'VAN', 'BIKE'], default: 'TRUCK_SM' },
    fuelType: { type: String, enum: ['DIESEL', 'PETROL', 'ELECTRIC', 'CNG'], default: 'DIESEL' },
    gpsDeviceId: { type: String, unique: true, sparse: true }, // IMEI or Device ID
  },
  { timestamps: true }
)

export const Vehicle = mongoose.model('Vehicle', vehicleSchema)
