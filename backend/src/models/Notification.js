import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    severity: { type: String, enum: ['INFO', 'WARNING', 'ERROR', 'SUCCESS'], default: 'INFO' },
    message: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    readAt: { type: Date },
  },
  { timestamps: true }
)

export const Notification = mongoose.model('Notification', notificationSchema)
