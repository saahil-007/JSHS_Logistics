import { Vehicle } from '../models/Vehicle.js'

export async function createVehicle(data) {
  return Vehicle.create(data)
}

export async function updateVehicle(id, data) {
  const vehicle = await Vehicle.findByIdAndUpdate(id, data, { new: true })
  if (!vehicle) {
    const err = new Error('Vehicle not found')
    err.statusCode = 404
    throw err
  }
  return vehicle
}
