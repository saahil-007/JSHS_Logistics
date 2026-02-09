import axios, { AxiosError } from 'axios'
import { handleApiError } from '../utils/errorHandler'

export const API_URL = import.meta.env.VITE_API_URL || 'https://jshs-logistics.onrender.com/api'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 120000, // Increased to 120s for cold starts
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('API Error:', error);
    throw handleApiError(error);
  }
)
