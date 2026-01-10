import mongoose from 'mongoose'

export const USER_ROLES = ['MANAGER', 'DRIVER', 'CUSTOMER', 'ADMIN']

export const DRIVER_APPROVAL_STATUS = ['PENDING', 'APPROVED', 'REJECTED']

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Normalize email so login works even if user typed spaces / different casing.
    email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true },

    driverApprovalStatus: { type: String, enum: DRIVER_APPROVAL_STATUS },
    performanceRating: { type: Number, default: 5 },
    awards: [{ type: String }],
  },
  { timestamps: true }
)

export const User = mongoose.model('User', userSchema)
