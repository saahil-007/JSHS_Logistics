import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import Modal from '../../components/Modal'
import { UserPlus, Star, Award, Search, CheckCircle2, Clock } from 'lucide-react'
import Skeleton from '../../components/Skeleton'

type DriverAccount = {
    _id: string
    name: string
    email: string
    driverApprovalStatus: string
    performanceRating?: number
    awards?: string[]
}

export default function Drivers() {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    const driversQ = useQuery({
        queryKey: ['fleetDrivers'],
        queryFn: async () => {
            const res = await api.get('/fleet/drivers')
            return res.data.drivers as DriverAccount[]
        }
    })

    const pendingQ = useQuery({
        queryKey: ['pendingDrivers'],
        queryFn: async () => {
            const res = await api.get('/fleet/drivers/pending')
            return res.data.drivers as DriverAccount[]
        }
    })

    const filteredDrivers = useMemo(() => {
        if (!driversQ.data) return []
        return driversQ.data.filter(d =>
            d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [driversQ.data, searchTerm])

    const stats = useMemo(() => {
        if (!driversQ.data || !pendingQ.data) return { total: 0, pending: 0, avgRating: '5.0', topDriver: null }
        const data = driversQ.data
        const ratings = data.filter(d => d.performanceRating).map(d => d.performanceRating!)
        const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '5.0'

        // Simulate "Driver of the Month"
        const sorted = [...data].sort((a, b) => (b.performanceRating || 0) - (a.performanceRating || 0))
        const topDriver = sorted[0]

        return {
            total: data.length,
            pending: pendingQ.data.length,
            avgRating,
            topDriver
        }
    }, [driversQ.data, pendingQ.data])

    async function approve(id: string) {
        await api.post(`/fleet/drivers/${id}/approve`)
        await Promise.all([driversQ.refetch(), pendingQ.data && pendingQ.refetch()])
    }

    if (driversQ.isError) return (
        <div className="p-8 text-center bg-red-50 border border-red-200 rounded-3xl">
            <h2 className="text-xl font-bold text-red-900">Drivers Sync Error</h2>
            <p className="text-red-700 mt-2">{driversQ.error instanceof Error ? driversQ.error.message : 'Failed to fetch drivers'}</p>
            <button onClick={() => driversQ.refetch()} className="btn-primary mt-6">Retry Sync</button>
        </div>
    )

    if (driversQ.isLoading || pendingQ.isLoading) return <DriversSkeleton />

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Drivers Management</h1>
                    <p className="text-sm text-slate-500 dark:text-white/60">Manage profiles, performance, and approvals for your fleet.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search drivers..."
                            className="input-glass w-64 pl-10"
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <UserPlus className="h-4 w-4" />
                        Add Driver
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Drivers" value={stats.total} icon={CheckCircle2} color="text-green-600" />
                <StatCard label="Pending Approval" value={stats.pending} icon={Clock} color="text-amber-600" />
                <StatCard label="Avg. Efficiency" value={`${stats.avgRating}/5`} icon={Star} color="text-blue-600" />
                <div className="glass-card flex items-center gap-4 bg-gradient-to-br from-indigo-500/10 to-transparent">
                    <div className="rounded-xl bg-indigo-500/20 p-2 text-indigo-600">
                        <Award className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase">Top Performer</p>
                        <p className="font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                            {stats.topDriver?.name || 'Loading...'}
                        </p>
                    </div>
                </div>
            </div>

            {pendingQ.data && pendingQ.data.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pending Requests</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pendingQ.data.map(d => (
                            <div key={d._id} className="glass-card border-amber-200/50 dark:border-amber-400/20">
                                <div className="mb-3 flex items-start justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">{d.name}</h3>
                                        <p className="text-xs text-slate-500">{d.email}</p>
                                    </div>
                                    <Clock className="h-5 w-5 text-amber-500" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => approve(d._id)}
                                        className="flex-1 rounded-lg bg-green-600 py-1.5 text-xs font-bold text-white shadow-lg shadow-green-600/20 hover:bg-green-700"
                                    >
                                        Approve
                                    </button>
                                    <button className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-white/5 dark:text-slate-400">
                                        Review
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Active Rostre</h2>
                <div className="table-glass">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200/60 dark:border-white/10">
                                <th className="p-4 font-semibold text-slate-900 dark:text-white">Driver Name</th>
                                <th className="p-4 font-semibold text-slate-900 dark:text-white text-center">Efficiency</th>
                                <th className="p-4 font-semibold text-slate-900 dark:text-white">Awards</th>
                                <th className="p-4 font-semibold text-slate-900 dark:text-white">Status</th>
                                <th className="p-4 font-semibold text-slate-900 dark:text-white text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDrivers.map((d) => (
                                <tr key={d._id} className="border-b border-slate-200/60 transition-colors hover:bg-slate-50/50 dark:border-white/5 dark:hover:bg-white/5">
                                    <td className="p-4">
                                        <div className="font-medium text-slate-900 dark:text-white">{d.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-white/50">{d.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-1">
                                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                            <span className="font-bold">{d.performanceRating || '5.0'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {(d.awards || ['Newcomer']).map((award, i) => (
                                                <span key={i} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-300">
                                                    {award}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${d.driverApprovalStatus === 'APPROVED' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                                            }`}>
                                            {d.driverApprovalStatus}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="text-xs font-bold text-blue-600 hover:underline">View Profile</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Onboard New Driver">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    setIsModalOpen(false);
                    // In a real app, this would call an API
                    alert('Invitation sent successfully!');
                }} className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Drivers should ideally register using the mobile app or registration page to link their accounts. However, you can generate an invite link or pre-register a profile.
                    </p>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Driver Email</label>
                        <input required type="email" placeholder="driver@email.com" className="input-glass" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Invitation Message</label>
                        <textarea placeholder="Welcome to the fleet!" className="input-glass h-24" />
                    </div>
                    <button type="submit" className="btn-primary w-full py-3">Send Invitation</button>
                </form>
            </Modal>
        </div>
    )
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
    return (
        <div className="glass-card">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider">{label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                </div>
                <div className={`rounded-xl bg-slate-100 p-2 dark:bg-white/5`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                </div>
            </div>
        </div>
    )
}

function DriversSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-card h-24 flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="space-y-1">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-6 w-16" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="glass-card h-32 space-y-4">
                            <div className="flex justify-between">
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-40" />
                                </div>
                                <Skeleton className="h-5 w-5 rounded-full" />
                            </div>
                            <div className="flex gap-2">
                                <Skeleton className="h-8 flex-1" />
                                <Skeleton className="h-8 w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="table-glass">
                    <div className="p-4 space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-48" />
                                </div>
                                <Skeleton className="h-4 w-12" />
                                <Skeleton className="h-5 w-24 rounded-full" />
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
