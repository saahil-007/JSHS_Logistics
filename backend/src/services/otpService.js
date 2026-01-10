import { OtpCode } from '../models/OtpCode.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { sendOtpSms } from './twilioService.js'

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function sendOtp({ phone, purpose }) {
  const code = generateOtp()
  const codeHash = await hashPassword(code)

  await OtpCode.create({ phone, codeHash, purpose })

  const body =
    purpose === 'RESET_PASSWORD'
      ? `Your JSHS Logistics password reset OTP is ${code}. It is valid for 5 minutes.`
      : `Your JSHS Logistics registration OTP is ${code}. It is valid for 5 minutes.`

  await sendOtpSms({ to: phone, body })
}

export async function verifyOtp({ phone, purpose, code }) {
  const record = await OtpCode.findOne({ phone, purpose }).sort({ createdAt: -1 })
  if (!record) return false
  const ok = await verifyPassword(code, record.codeHash)
  if (!ok) return false

  // Optionally delete after successful verification
  await OtpCode.deleteMany({ phone, purpose })
  return true
}