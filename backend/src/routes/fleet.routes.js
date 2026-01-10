import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  listDrivers,
  listPendingDrivers,
  approveDriver,
  rejectDriver,
} from '../controllers/fleetController.js'

export const fleetRouter = Router()

fleetRouter.use(requireAuth)

fleetRouter.get('/vehicles', requireRole('MANAGER'), asyncHandler(listVehicles))
fleetRouter.post('/vehicles', requireRole('MANAGER'), asyncHandler(createVehicle))
fleetRouter.patch('/vehicles/:id', requireRole('MANAGER'), asyncHandler(updateVehicle))

fleetRouter.get('/drivers', requireRole('MANAGER'), asyncHandler(listDrivers))
fleetRouter.get('/drivers/pending', requireRole('MANAGER'), asyncHandler(listPendingDrivers))
fleetRouter.post('/drivers/:id/approve', requireRole('MANAGER'), asyncHandler(approveDriver))
fleetRouter.post('/drivers/:id/reject', requireRole('MANAGER'), asyncHandler(rejectDriver))
