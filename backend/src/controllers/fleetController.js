import { z } from 'zod'
import { Vehicle } from '../models/Vehicle.js'
import { User } from '../models/User.js'
import { createVehicle as createVehicleSvc, updateVehicle as updateVehicleSvc } from '../services/fleetService.js'

const createVehicleSchema = z.object({
  plateNumber: z.string().min(3),
  model: z.string().optional(),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE']).optional(),
  odometerKm: z.number().optional(),
  nextServiceAtKm: z.number().optional(),
  fuelEfficiencyKmpl: z.number().optional(),
  pucNumber: z.string().optional(),
  rcNumber: z.string().optional(),
  capacityKg: z.number().positive().optional(),
  fuelType: z.enum(['DIESEL', 'PETROL', 'ELECTRIC', 'CNG']).optional(),
  type: z.enum(['TRUCK_LG', 'TRUCK_SM', 'VAN', 'BIKE']).optional(),
})

const updateVehicleSchema = createVehicleSchema.partial()

export async function listVehicles(req, res) {
  const { page = 1, limit = 10 } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const [rows, total, statsData] = await Promise.all([
    Vehicle.find({}).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Vehicle.countDocuments({}),
    Vehicle.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'IN_USE'] }, 1, 0] } },
          maintenance: { $sum: { $cond: [{ $eq: ['$status', 'MAINTENANCE'] }, 1, 0] } },
          // We can't easily do 'dueSoon' in aggregation because it's a calculated field in JS, 
          // but we can approximate it if we know the threshold. OdometerKm and nextServiceAtKm are in DB.
          dueSoon: { $sum: { $cond: [{ $lte: [{ $subtract: ['$nextServiceAtKm', '$odometerKm'] }, 500] }, 1, 0] } }
        }
      }
    ])
  ])

  const stats = statsData[0] || { total: 0, active: 0, maintenance: 0, dueSoon: 0 }

  res.json({
    vehicles: rows,
    total,
    pages: Math.ceil(total / Number(limit)),
    currentPage: Number(page),
    stats
  })
}

export async function createVehicle(req, res) {
  const data = createVehicleSchema.parse(req.body)
  const vehicle = await createVehicleSvc(data)
  res.status(201).json({ vehicle })
}

export async function updateVehicle(req, res) {
  const data = updateVehicleSchema.parse(req.body)
  const vehicle = await updateVehicleSvc(req.params.id, data)
  res.json({ vehicle })
}

export async function listDrivers(req, res) {
  const rows = await User.find({
    role: 'DRIVER',
    driverApprovalStatus: 'APPROVED',
  })
    .select('_id name email role driverApprovalStatus')
    .lean()

  res.json({ drivers: rows })
}

export async function listPendingDrivers(req, res) {
  const rows = await User.find({
    role: 'DRIVER',
    driverApprovalStatus: 'PENDING',
  })
    .select('_id name email role driverApprovalStatus')
    .lean()

  res.json({ drivers: rows })
}

export async function approveDriver(req, res) {
  const driver = await User.findById(req.params.id)
  if (!driver || driver.role !== 'DRIVER') return res.status(404).json({ error: { message: 'Driver not found' } })

  driver.driverApprovalStatus = 'APPROVED'
  await driver.save()

  // Lazy import to avoid circular deps between controllers/services
  const { createNotification } = await import('../services/notificationService.js')
  await createNotification({
    userId: driver._id,
    type: 'DRIVER_APPROVED',
    message: 'Your driver account has been approved. You can now receive assignments.',
  })

  res.json({ driver })
}

export async function rejectDriver(req, res) {
  const driver = await User.findById(req.params.id)
  if (!driver || driver.role !== 'DRIVER') return res.status(404).json({ error: { message: 'Driver not found' } })

  driver.driverApprovalStatus = 'REJECTED'
  await driver.save()

  const { createNotification } = await import('../services/notificationService.js')
  await createNotification({
    userId: driver._id,
    type: 'DRIVER_REJECTED',
    message: 'Your driver request was rejected by the logistics owner.',
  })

  res.json({ driver })
}
