import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogOut, Home, Package, Truck, Users, BarChart3, FileText, Bell, Settings, UserCircle, DollarSign, MapPin, Activity, Shield, PlusCircle, Car, UserCheck } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import type { Role } from '../types'

type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<any>
  roles?: Role[]
  category?: string
}

const NAVIGATION_ITEMS: NavItem[] = [
  // Common Items - Available to All Roles
  { to: '/app/dashboard', label: 'Dashboard', icon: Home },
  { to: '/app/shipments', label: 'Shipments', icon: Package },
  { to: '/app/payments', label: 'Payments', icon: DollarSign },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/profile', label: 'Profile', icon: UserCircle },
  { to: '/app/settings', label: 'Settings', icon: Settings },

  // Manager Specific Items
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3, roles: ['MANAGER'] },
  { to: '/app/fleet', label: 'Fleet Management', icon: Car, roles: ['MANAGER'] },
  { to: '/app/fleet-performance', label: 'Fleet Performance', icon: Activity, roles: ['MANAGER'] },
  { to: '/app/drivers', label: 'Driver Management', icon: Users, roles: ['MANAGER'] },
  { to: '/app/iot-monitor', label: 'IoT Monitor', icon: MapPin, roles: ['MANAGER'] },
  { to: '/app/approvals', label: 'Pending Approvals', icon: Shield, roles: ['MANAGER'] },
  { to: '/app/documents', label: 'Documents', icon: FileText, roles: ['MANAGER'] },
  { to: '/app/audit', label: 'Audit Logs', icon: Shield, roles: ['MANAGER'] },
  { to: '/app/onboarding', label: 'Onboarding Hub', icon: PlusCircle, roles: ['MANAGER'] },
  { to: '/app/onboarding/vehicle', label: 'Vehicle Onboarding', icon: Car, roles: ['MANAGER'] },
  { to: '/app/onboarding/driver', label: 'Driver Onboarding', icon: UserCheck, roles: ['MANAGER'] },

  // Driver Specific Items
  { to: '/app/driver', label: 'Drive Mode', icon: Truck, roles: ['DRIVER'] },
  { to: '/app/earnings', label: 'Earnings', icon: DollarSign, roles: ['DRIVER'] },

  // Customer Specific Items
  { to: '/app/create-shipment', label: 'Create Shipment', icon: PlusCircle, roles: ['CUSTOMER'] },
]

const CATEGORIES = {
  COMMON: 'General',
  MANAGER: 'Manager Tools',
  DRIVER: 'Driver Tools',
  CUSTOMER: 'Customer Tools',
}

export function MobileNav({ open, onClose, role }: { open: boolean; onClose: () => void; role: Role }) {
  const location = useLocation()
  const { logout } = useAuth()

  const filteredItems = useMemo(() => {
    return NAVIGATION_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
  }, [role])

  const categorizedItems = useMemo(() => {
    const categories: Record<string, NavItem[]> = {}
    
    filteredItems.forEach((item) => {
      let category = CATEGORIES.COMMON
      
      if (item.roles?.includes('MANAGER')) {
        category = CATEGORIES.MANAGER
      } else if (item.roles?.includes('DRIVER')) {
        category = CATEGORIES.DRIVER
      } else if (item.roles?.includes('CUSTOMER')) {
        category = CATEGORIES.CUSTOMER
      }
      
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(item)
    })
    
    return categories
  }, [filteredItems])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="absolute left-0 top-0 h-full w-[88%] max-w-sm glass p-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">JSHS Logistics</div>
            <div className="text-sm text-slate-600 dark:text-white/60 capitalize">{role.toLowerCase()} Portal</div>
          </div>
          <button 
            onClick={onClose} 
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {Object.entries(categorizedItems).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-3 px-2">
                {category}
              </h3>
              <div className="space-y-1">
                {items.map((item) => {
                  const isActive = location.pathname === item.to
                  const Icon = item.icon
                  
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-white/60'}`} />
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <div className="h-2 w-2 rounded-full bg-white/80"></div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-white/10 pt-4 mt-auto">
          <button
            onClick={() => {
              logout()
              onClose()
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
          
          <div className="mt-4 text-xs text-slate-500 dark:text-white/60 text-center">
            <p className="mb-2">💡 Pro tip: Open Shipments → Shipment Detail</p>
            <p>to see live tracking and documents.</p>
          </div>
        </div>
      </div>
    </div>
  )
}