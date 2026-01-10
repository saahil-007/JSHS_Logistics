import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { FuelAnalytics, MaintenanceOverview } from '../../types'
import {
    Fuel,
    Wrench,
    AlertTriangle,
    Clock,
    DollarSign,
    Activity,
    Users,
    Calendar,
    BarChart3
} from 'lucide-react'
import Skeleton from '../../components/Skeleton'
import { Link } from 'react-router-dom'

export default function FleetPerformance() {
    const [fuelDateRange] = useState({ days: 30 })

    // Fetch fuel analytics
    const fuelAnalyticsQ = useQuery({
        queryKey: ['fuelAnalytics', fuelDateRange],
        queryFn: async () => {
            const res = await api.get('/fleet-performance/fuel/analytics')
            return res.data as FuelAnalytics
        }
    })

    // Fetch maintenance overview
    const maintenanceQ = useQuery({
        queryKey: ['maintenanceOverview'],
        queryFn: async () => {
            const res = await api.get('/fleet-performance/maintenance/overview')
            return res.data as MaintenanceOverview
        }
    })

    // Fetch driver leaderboard
    const driverLeaderboardQ = useQuery({
        queryKey: ['driverLeaderboard'],
        queryFn: async () => {
            const res = await api.get('/fleet-performance/drivers/leaderboard', {
                params: { limit: 5 }
            })
            return res.data.leaderboard as Array<{
                driverId: string
                name: string
                score: number
                speedingCount: number
                harshTurnCount: number
                completedShipments?: number
            }>
        }
    })

    // Fetch fuel alerts
    const fuelAlertsQ = useQuery({
        queryKey: ['fuelAlerts'],
        queryFn: async () => {
            const res = await api.get('/fleet-performance/fuel/alerts')
            return res.data.alerts as Array<{
                type: string
                severity: string
                plateNumber: string
                message: string
                actualEfficiency: number
                expectedEfficiency: number
            }>
        }
    })

    // Fetch maintenance alerts
    const maintenanceAlertsQ = useQuery({
        queryKey: ['maintenanceAlerts'],
        queryFn: async () => {
            const res = await api.get('/fleet-performance/maintenance/alerts')
            return res.data.alerts as Array<{
                type: string
                severity: string
                plateNumber: string
                message: string
                daysOverdue?: number
            }>
        }
    })

    const isLoading = fuelAnalyticsQ.isLoading || maintenanceQ.isLoading || driverLeaderboardQ.isLoading

    if (isLoading) return <FleetPerformanceSkeleton />

    const fuelData = fuelAnalyticsQ.data
    const maintenanceData = maintenanceQ.data
    const driverData = driverLeaderboardQ.data || []
    const fuelAlerts = fuelAlertsQ.data || []
    const maintenanceAlerts = maintenanceAlertsQ.data || []

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-white shadow-2xl border border-white/5">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-80 w-80 rounded-full bg-blue-500/10 blur-[100px] animate-pulse" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-80 w-80 rounded-full bg-purple-500/10 blur-[100px] animate-pulse delay-700" />

                <div className="relative">
                    <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
                        Fleet <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Performance</span>
                    </h1>
                    <p className="mt-2 text-slate-400 font-medium max-w-2xl text-lg">
                        Monitor fuel efficiency, maintenance schedules, and driver behavior analytics in real-time
                    </p>
                </div>
            </div>

            {/* Alerts Section */}
            {(fuelAlerts.length > 0 || maintenanceAlerts.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Fuel Alerts */}
                    {fuelAlerts.length > 0 && (
                        <div className="glass-card border-l-4 border-l-amber-500">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">Fuel Efficiency Alerts</h3>
                                    <p className="text-xs text-slate-500">{fuelAlerts.length} vehicle(s) need attention</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {fuelAlerts.slice(0, 3).map((alert, idx) => (
                                    <div key={idx} className="p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-200/50 dark:border-amber-800/50">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{alert.plateNumber}</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{alert.message}</p>
                                            </div>
                                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                                {alert.actualEfficiency} kmpl
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Maintenance Alerts */}
                    {maintenanceAlerts.length > 0 && (
                        <div className="glass-card border-l-4 border-l-red-500">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                    <Wrench className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">Maintenance Alerts</h3>
                                    <p className="text-xs text-slate-500">{maintenanceAlerts.length} overdue/upcoming</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {maintenanceAlerts.slice(0, 3).map((alert, idx) => (
                                    <div key={idx} className="p-3 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-200/50 dark:border-red-800/50">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{alert.plateNumber}</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{alert.message}</p>
                                            </div>
                                            {alert.daysOverdue && (
                                                <span className="text-xs font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                                                    {alert.daysOverdue}d overdue
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    label="Total Fuel Cost"
                    value={`₹${(fuelData?.summary.totalCost || 0).toLocaleString()}`}
                    icon={DollarSign}
                    color="text-green-500"
                    bgColor="bg-green-50 dark:bg-green-900/20"
                    subtitle={`${fuelData?.summary.totalFuelConsumed || 0}L consumed`}
                />
                <MetricCard
                    label="Avg Efficiency"
                    value={`${(fuelData?.summary.avgEfficiency || 0).toFixed(1)} kmpl`}
                    icon={Fuel}
                    color="text-blue-500"
                    bgColor="bg-blue-50 dark:bg-blue-900/20"
                    subtitle={`${fuelData?.summary.fillCount || 0} refills`}
                />
                <MetricCard
                    label="Pending Maintenance"
                    value={maintenanceData?.stats.scheduled || 0}
                    icon={Wrench}
                    color="text-amber-500"
                    bgColor="bg-amber-50 dark:bg-amber-900/20"
                    subtitle={`${maintenanceData?.stats.overdue || 0} overdue`}
                />
                <MetricCard
                    label="Avg Driver Score"
                    value={driverData.length > 0 ? Math.round(driverData.reduce((sum, d) => sum + d.score, 0) / driverData.length) : 0}
                    icon={Users}
                    color="text-purple-500"
                    bgColor="bg-purple-50 dark:bg-purple-900/20"
                    subtitle={`${driverData.length} drivers tracked`}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Fuel Consumption Breakdown */}
                <div className="lg:col-span-2 glass-card">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Fuel className="h-5 w-5 text-blue-500" />
                            Top Fuel Consumers
                        </h2>
                        <Link to="/fleet" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                            View All →
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {fuelData?.topConsumers.slice(0, 5).map((vehicle, idx) => (
                            <div key={vehicle.vehicleId} className="flex items-center gap-4 p-4 bg-slate-50/50 dark:bg-white/5 rounded-xl hover:bg-slate-100/50 dark:hover:bg-white/10 transition-colors">
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">#{idx + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white">{vehicle.plateNumber}</p>
                                    <p className="text-xs text-slate-500">{vehicle.model || 'Unknown Model'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">₹{vehicle.totalCost.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500">{vehicle.avgEfficiency.toFixed(1)} kmpl</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500">{vehicle.totalFuel.toFixed(0)}L</p>
                                    <p className="text-xs text-slate-400">{vehicle.fillCount} fills</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Driver Safety Leaderboard */}
                <div className="glass-card">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Activity className="h-5 w-5 text-purple-500" />
                            Safety Leaders
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {driverData.slice(0, 5).map((driver, idx) => (
                            <div key={driver.driverId} className="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-white/5 rounded-xl">
                                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${idx === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                                    idx === 1 ? 'bg-slate-200 dark:bg-slate-700/30' :
                                        idx === 2 ? 'bg-amber-100 dark:bg-amber-900/30' :
                                            'bg-slate-100 dark:bg-slate-800/30'
                                    }`}>
                                    <span className={`text-sm font-bold ${idx === 0 ? 'text-yellow-600 dark:text-yellow-400' :
                                        idx === 1 ? 'text-slate-600 dark:text-slate-400' :
                                            idx === 2 ? 'text-amber-600 dark:text-amber-400' :
                                                'text-slate-500'
                                        }`}>
                                        {idx + 1}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{driver.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {driver.speedingCount} speeding • {driver.harshTurnCount} harsh turns
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className={`text-lg font-black ${driver.score >= 90 ? 'text-green-600 dark:text-green-400' :
                                        driver.score >= 70 ? 'text-blue-600 dark:text-blue-400' :
                                            driver.score >= 50 ? 'text-amber-600 dark:text-amber-400' :
                                                'text-red-600 dark:text-red-400'
                                        }`}>
                                        {driver.score}
                                    </div>
                                    <p className="text-[10px] text-slate-500">SCORE</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Maintenance Schedule */}
            <div className="glass-card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-amber-500" />
                        Upcoming Maintenance
                    </h2>
                    <Link to="/fleet" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                        View Schedule →
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {maintenanceData?.upcoming.slice(0, 6).map((record) => {
                        const vehicle = typeof record.vehicleId === 'object' ? record.vehicleId : null
                        return (
                            <div key={record._id} className="p-4 bg-slate-50/50 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/10">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-900 dark:text-white">{vehicle?.plateNumber || 'Unknown'}</p>
                                        <p className="text-xs text-slate-500">{record.type.replace(/_/g, ' ')}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${record.priority === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                        record.priority === 'HIGH' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        }`}>
                                        {record.priority}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                    <Clock className="h-3 w-3" />
                                    {new Date(record.scheduledDate).toLocaleDateString()}
                                </div>
                                {record.estimatedCost && (
                                    <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                                        ₹{record.estimatedCost.toLocaleString()}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickActionCard
                    title="Log Fuel"
                    description="Record fuel transaction"
                    icon={Fuel}
                    color="blue"
                    to="/fleet"
                />
                <QuickActionCard
                    title="Schedule Maintenance"
                    description="Plan vehicle service"
                    icon={Wrench}
                    color="amber"
                    to="/fleet"
                />
                <QuickActionCard
                    title="Driver Analytics"
                    description="View behavior reports"
                    icon={BarChart3}
                    color="purple"
                    to="/drivers"
                />
                <QuickActionCard
                    title="Fleet Schedule"
                    description="Manage driver shifts"
                    icon={Calendar}
                    color="green"
                    to="/fleet"
                />
            </div>
        </div>
    )
}

function MetricCard({ label, value, icon: Icon, color, bgColor, subtitle }: {
    label: string
    value: string | number
    icon: any
    color: string
    bgColor: string
    subtitle?: string
}) {
    return (
        <div className="glass-card">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider">{label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
                </div>
                <div className={`rounded-xl ${bgColor} p-2`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                </div>
            </div>
        </div>
    )
}

function QuickActionCard({ title, description, icon: Icon, color, to }: {
    title: string
    description: string
    icon: any
    color: string
    to: string
}) {
    const colorClasses = {
        blue: 'from-blue-500 to-cyan-500',
        amber: 'from-amber-500 to-orange-500',
        purple: 'from-purple-500 to-pink-500',
        green: 'from-green-500 to-emerald-500'
    }

    return (
        <Link to={to} className="group">
            <div className="glass-card hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer">
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} p-2.5 mb-4`}>
                    <Icon className="h-full w-full text-white" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
                <p className="text-xs text-slate-500">{description}</p>
            </div>
        </Link>
    )
}

function FleetPerformanceSkeleton() {
    return (
        <div className="space-y-8 pb-12">
            <Skeleton className="h-48 w-full rounded-[2.5rem]" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-card h-28">
                        <Skeleton className="h-full w-full" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card h-96">
                    <Skeleton className="h-full w-full" />
                </div>
                <div className="glass-card h-96">
                    <Skeleton className="h-full w-full" />
                </div>
            </div>
        </div>
    )
}
