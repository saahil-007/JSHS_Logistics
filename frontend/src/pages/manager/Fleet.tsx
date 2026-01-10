import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Vehicle } from '../../types'
import Modal from '../../components/Modal'
import FleetTrackingMap from '../../components/FleetTrackingMap'
import Skeleton from '../../components/Skeleton'
import { Plus, Truck, AlertTriangle, CheckCircle2, Gauge, Zap, Activity, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'

function serviceRemainingKm(v: Vehicle) {
  return (v.nextServiceAtKm ?? 0) - (v.odometerKm ?? 0)
}

export default function Fleet() {
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const initialFormState = {
    plateNumber: '',
    model: '',
    pucNumber: '',
    rcNumber: '',
    capacityKg: 1000,
    fuelType: 'DIESEL'
  }
  const [formData, setFormData] = useState(initialFormState)

  const vehiclesQ = useQuery({
    queryKey: ['vehicles', page],
    queryFn: async () => {
      const res = await api.get('/fleet/vehicles', { params: { page, limit: 10 } })
      return res.data as {
        vehicles: Vehicle[],
        total: number,
        pages: number,
        currentPage: number,
        stats: { total: number, active: number, maintenance: number, dueSoon: number }
      }
    },
  })
  const trackingQ = useQuery({
    queryKey: ['fleetPositions'],
    queryFn: async () => {
      const res = await api.get('/shipments/fleet/positions')
      return res.data.vehicles as {
        vehicle: Vehicle;
        position: any;
        lastUpdate: string;
        status: string;
      }[]
    },
    refetchInterval: 4000, // Refresh every 4 seconds as requested
  })

  if (vehiclesQ.isError) return (
    <div className="p-8 text-center bg-red-50 border border-red-200 rounded-3xl">
      <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-red-900">Fleet Data Error</h2>
      <p className="text-red-700 mt-2">{vehiclesQ.error instanceof Error ? vehiclesQ.error.message : 'Failed to fetch vehicles list'}</p>
      <button onClick={() => vehiclesQ.refetch()} className="btn-primary mt-6">Retry Sync</button>
    </div>
  )

  if (trackingQ.isError) {
    console.error('Fleet positions sync failed:', trackingQ.error)
  }

  const stats = useMemo(() => {
    if (!vehiclesQ.data?.stats) return { total: 0, active: 0, maintenance: 0, dueSoon: 0 }
    return vehiclesQ.data.stats
  }, [vehiclesQ.data])

  if (vehiclesQ.isLoading || trackingQ.isLoading) return <FleetSkeleton />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingId) {
        await api.patch(`/fleet/vehicles/${editingId}`, formData)
      } else {
        await api.post('/fleet/vehicles', formData)
      }
      setFormData(initialFormState)
      setEditingId(null)
      setIsModalOpen(false)
      await vehiclesQ.refetch()
    } catch (err) {
      alert('Failed to save vehicle')
    }
  }

  function handleEdit(v: Vehicle) {
    setFormData({
      plateNumber: v.plateNumber,
      model: v.model || '',
      pucNumber: v.pucNumber || '',
      rcNumber: v.rcNumber || '',
      capacityKg: v.capacityKg,
      fuelType: v.fuelType as string
    })
    setEditingId(v._id)
    setIsModalOpen(true)
  }

  function handleCreate() {
    setFormData(initialFormState)
    setEditingId(null)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-10 text-white shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-80 w-80 rounded-full bg-blue-500/10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-80 w-80 rounded-full bg-indigo-500/10 blur-[100px] animate-pulse delay-700" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-4">
              Fleet <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Management</span>
            </h1>
            <p className="mt-2 text-slate-400 font-medium max-w-xl text-lg">
              Real-time telemetry and operational health of your logistics assets.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="group relative flex items-center gap-3 bg-white text-slate-950 px-8 py-4 rounded-2xl font-black transition-all hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]"
          >
            <Plus className="h-5 w-5 stroke-[3]" />
            Register Asset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Fleet" value={stats.total} icon={Truck} color="text-blue-500" />
        <StatCard label="Operational" value={stats.active} icon={CheckCircle2} color="text-emerald-500" />
        <StatCard label="In Service" value={stats.maintenance} icon={AlertTriangle} color="text-amber-500" />
        <StatCard label="Service Due" value={stats.dueSoon} icon={Activity} color="text-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Vehicle Inventory (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Vehicle Inventory</h2>
            <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full font-medium">
              Sorted by Latest
            </span>
          </div>
          <div className="table-glass overflow-hidden">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm dark:bg-slate-900/90 z-10 border-b border-slate-200/60 dark:border-white/10">
                  <tr className="">
                    <th className="p-3 font-semibold text-slate-900 dark:text-white">Vehicle Details</th>
                    <th className="p-3 font-semibold text-slate-900 dark:text-white">Status & Compliance</th>
                    <th className="p-3 font-semibold text-slate-900 dark:text-white text-right">Utility</th>
                    <th className="p-3 font-semibold text-slate-900 dark:text-white w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
                  {vehiclesQ.data?.vehicles.map((v) => (
                    <tr key={v._id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5 group">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{v.plateNumber}</div>
                            <div className="text-xs text-slate-500 dark:text-white/50">{v.model} • {v.type}</div>
                            <div className="text-[10px] text-slate-400 mt-1 flex gap-2">
                              <span className="bg-slate-100 dark:bg-white/10 px-1.5 rounded">{v.fuelType}</span>
                              <span className="bg-slate-100 dark:bg-white/10 px-1.5 rounded">{v.capacityKg}kg</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1.5">
                          <span className={`inline-flex items-center w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${v.status === 'AVAILABLE' ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400' :
                            v.status === 'IN_USE' ? 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}>
                            {v.status}
                          </span>
                          {serviceRemainingKm(v) <= 500 && (
                            <div className="flex items-center gap-1 text-[10px] text-red-500 font-bold">
                              <AlertTriangle className="h-3 w-3" />
                              SERVICE DUE ({Math.round(serviceRemainingKm(v))}km)
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {Math.round(v.odometerKm / 1000).toLocaleString()}k km
                        </div>
                        <div className="text-[10px] text-slate-500">Total Odometer</div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleEdit(v)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {vehiclesQ.data && vehiclesQ.data.pages > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t border-slate-200/60 dark:border-white/10">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(vehiclesQ.data.pages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`h-7 w-7 rounded-md text-xs font-bold transition-colors ${page === i + 1
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  disabled={page === vehiclesQ.data.pages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tracking & Performance (lg:col-span-1) */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Live Tracking</h2>
            <FleetTrackingMap vehicles={trackingQ.data!} height="400px" />
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Fleet Performance</h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="glass-card p-4 border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Gauge className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Efficiency</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">94%</div>
                  <div className="text-[10px] text-green-500 font-bold">↑ 2.4%</div>
                </div>
                <div className="text-xs text-slate-500 mt-1">Overall fleet utilization</div>
              </div>

              <div className="glass-card p-4 border-l-4 border-l-green-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-8 w-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Compliance</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">98.2</div>
                <div className="text-xs text-slate-500 mt-1">Safety & regulatory score</div>
              </div>

              <div className="glass-card p-4 border-l-4 border-l-purple-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Health</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">Low Risk</div>
                <div className="text-xs text-slate-500 mt-1">Predictive maintenance alerts</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Asset Details" : "Register New Vehicle"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-white/60 uppercase">Plate Number</label>
              <input
                required
                value={formData.plateNumber}
                onChange={e => setFormData({ ...formData, plateNumber: e.target.value })}
                placeholder="MH 12 AB 1234"
                className="input-glass"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-white/60 uppercase">Model / Make</label>
              <input
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
                placeholder="Tata Prima"
                className="input-glass"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-white/60 uppercase">Capacity (kg)</label>
              <input
                type="number"
                value={formData.capacityKg}
                onChange={e => setFormData({ ...formData, capacityKg: Number(e.target.value) })}
                className="input-glass"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-white/60 uppercase">Fuel Type</label>
              <select
                value={formData.fuelType}
                onChange={e => setFormData({ ...formData, fuelType: e.target.value })}
                className="input-glass"
              >
                <option value="DIESEL">Diesel</option>
                <option value="PETROL">Petrol</option>
                <option value="CNG">CNG</option>
                <option value="ELECTRIC">Electric</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-white/60 uppercase">RC Number</label>
            <input
              value={formData.rcNumber}
              onChange={e => setFormData({ ...formData, rcNumber: e.target.value })}
              placeholder="Enter RC Number"
              className="input-glass"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-white/60 uppercase">PUC Number</label>
            <input
              value={formData.pucNumber}
              onChange={e => setFormData({ ...formData, pucNumber: e.target.value })}
              placeholder="Enter PUC Number"
              className="input-glass"
            />
          </div>
          <div className="pt-4">
            <button type="submit" className="btn-primary w-full py-3 text-base">
              {editingId ? "Save Changes" : "Register Vehicle"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
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

function FleetSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card h-24">
            <div className="flex justify-between">
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="table-glass">
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-12 ml-auto" />
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-[300px] w-full border border-slate-100 dark:border-white/5 rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card h-28 flex flex-col justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
