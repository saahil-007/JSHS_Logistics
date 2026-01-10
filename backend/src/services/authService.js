import { User, USER_ROLES } from '../models/User.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { signToken } from '../utils/jwt.js'
import { createNotification } from './notificationService.js'

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function registerUser({ name, email, phone, password, role }) {
  const cleanEmail = String(email ?? '').trim().toLowerCase()
  const cleanName = String(name ?? '').trim()
  const cleanPhone = String(phone ?? '').trim()

  if (!cleanEmail) {
    const err = new Error('Email is required')
    err.statusCode = 400
    throw err
  }

  if (!USER_ROLES.includes(role)) {
    const err = new Error('Invalid role')
    err.statusCode = 400
    throw err
  }

  const emailRe = new RegExp(`^\\s*${escapeRegex(cleanEmail)}\\s*$`, 'i')
  const existing = await User.findOne({ email: emailRe }).lean()
  if (existing) {
    const err = new Error('Email already registered')
    err.statusCode = 409
    throw err
  }

  const passwordHash = await hashPassword(String(password ?? ''))

  const userData = { name: cleanName, email: cleanEmail, phone: cleanPhone, passwordHash, role }
  if (role === 'DRIVER') {
    userData.driverApprovalStatus = 'PENDING'
  }

  const user = await User.create(userData)

  const token = signToken({ sub: user._id.toString(), role: user.role })
  return { user, token }
}

export async function loginUser({ email, password }) {
  const cleanEmail = String(email ?? '').trim().toLowerCase()
  const cleanPassword = String(password ?? '')

  const emailRe = new RegExp(`^\\s*${escapeRegex(cleanEmail)}\\s*$`, 'i')
  const user = await User.findOne({ email: emailRe })
  if (!user) {
    const err = new Error('Invalid credentials')
    err.statusCode = 401
    throw err
  }

  const ok = await verifyPassword(cleanPassword, user.passwordHash)
  if (!ok) {
    const err = new Error('Invalid credentials')
    err.statusCode = 401
    throw err
  }

  const token = signToken({ sub: user._id.toString(), role: user.role })
  return { user, token }
}
