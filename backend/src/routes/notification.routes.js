import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { listNotifications, markRead } from '../controllers/notificationController.js'

export const notificationRouter = Router()

notificationRouter.use(requireAuth)
notificationRouter.get('/', asyncHandler(listNotifications))
notificationRouter.post('/:id/read', asyncHandler(markRead))
