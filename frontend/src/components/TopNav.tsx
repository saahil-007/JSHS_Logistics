import { Link, useLocation } from 'react-router-dom'
import { Menu, LogOut, Search, Settings, User, Truck } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../auth/AuthContext'
import NotificationDropdown from './NotificationDropdown'
import { SimulationToggle } from './SimulationToggle'
import { ThemeToggle } from './ThemeToggle'

interface TopNavProps {
  onOpenMenu?: () => void
  onToggleSidebar?: () => void
  onMouseEnterSidebar?: () => void
  onMouseLeaveSidebar?: () => void
  isSidebarOpen?: boolean
}

export function TopNav({ onOpenMenu, onToggleSidebar, onMouseEnterSidebar, onMouseLeaveSidebar, isSidebarOpen }: TopNavProps) {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/70 border-b border-white/20 dark:bg-slate-900/70 dark:border-white/10 h-16 shrink-0 shadow-sm supports-[backdrop-filter]:bg-white/60"
    >
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4 max-w-7xl mx-auto">

        {/* Left Side: Logo/Title */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Menu Toggle */}
          {user && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenMenu}
              className="lg:hidden h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100/50 hover:text-indigo-600 transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </motion.button>
          )}

          {/* Desktop Sidebar Toggle */}
          {user && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleSidebar}
              onMouseEnter={onMouseEnterSidebar}
              onMouseLeave={onMouseLeaveSidebar}
              className="hidden lg:flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100/50 hover:text-indigo-600 transition-colors shrink-0 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <Menu className="h-5 w-5" />
            </motion.button>
          )}

          <Link to="/" className={`flex items-center gap-3 group min-w-0 ml-1 lg:ml-0 ${user ? 'hidden lg:flex' : ''}`}>
            <motion.div
              whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30 text-white shrink-0"
            >
              <Truck className="h-5 w-5 fill-white/20" />
              <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
            </motion.div>
            <div className="flex flex-col">
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 text-lg tracking-tight hidden sm:block dark:from-indigo-400 dark:to-violet-400 leading-none">
                JSHS LOGISTICS
              </span>
              <span className="text-[10px] font-medium text-slate-500 tracking-widest hidden sm:block dark:text-slate-400">
                GLOBAL FREIGHT
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Search Bar */}
        {location.pathname !== '/' && (
          <div className="hidden md:flex flex-1 max-w-md items-center gap-3 justify-center">
            {/* Manager Simulation Button */}
            {user?.role === 'MANAGER' && (
              <SimulationToggle />
            )}
            <motion.div
              className="relative w-full group"
              transition={{ duration: 0.2 }}
            >
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search shipments, orders, drivers..."
                className="block w-full rounded-2xl border-0 py-2 pl-10 pr-4 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-slate-50/50 hover:bg-slate-50 transition-all dark:bg-slate-800/50 dark:ring-slate-700 dark:text-white dark:placeholder:text-slate-500"
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                <kbd className="inline-flex items-center rounded border border-slate-200 px-1 font-sans text-xs text-slate-400 dark:border-slate-700">⌘K</kbd>
              </div>
            </motion.div>
          </div>
        )}

        {/* Right Side: Theme Toggle, Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle className="h-10 px-3 flex items-center justify-center" />

          {location.pathname !== '/' && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <Search className="h-5 w-5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
                transition={{ rotate: { duration: 0.2 } }}
                className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors relative dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <Settings className="h-5 w-5" />
              </motion.button>
            </>
          )}


          {user && <NotificationDropdown />}

          {user ? (
            <div className="flex items-center gap-3 ml-1 sm:ml-2 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-700">
              <motion.div
                className="flex items-center gap-3 cursor-pointer group"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex flex-col items-end leading-none hidden lg:flex">
                  <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{user.name}</span>
                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5 uppercase tracking-wide dark:bg-indigo-900/30 dark:text-indigo-300">{user.role}</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 border-2 border-white flex items-center justify-center shadow-md overflow-hidden shrink-0 group-hover:ring-2 group-hover:ring-indigo-500/20 transition-all dark:from-slate-800 dark:to-slate-700 dark:border-slate-600">
                  <User className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                </div>
              </motion.div>

              <motion.button
                onClick={logout}
                whileHover={{ scale: 1.05, backgroundColor: "#fee2e2", color: "#ef4444" }}
                whileTap={{ scale: 0.95 }}
                className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all shrink-0 ml-1"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </motion.button>
            </div>
          ) : null}
        </div>
      </div>
    </motion.header>
  )
}
