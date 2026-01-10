import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'

import { api } from '../../lib/api'
import { useShipmentData } from '../../hooks/useShipmentData'
import { useVehicleHealth } from '../../hooks/useVehicleHealth'
import { useDateTimeFormatter } from '../../hooks/useDateTimeFormatter'
import { useAuth } from '../../auth/AuthContext'
import LiveShipmentTracker from '../../components/LiveShipmentTracker'
import { SHIPMENT_STATUSES } from '../../constants'
import type { Shipment } from '../../types'
import { formatDate, formatDistance, buildDocumentUrl } from '../../utils'
import { handleApiError } from '../../utils/errorHandler'
import { getAppType } from '../../utils/subdomainUtils'
import { shipmentApi, documentApi, simulationApi } from '../../services/apiService'
import ErrorDisplay from '../../components/ErrorDisplay'
import Skeleton from '../../components/Skeleton'
import { FileText, CheckCircle2, Zap, Navigation, BarChart3, MapPin, Settings, Radio, Trash2, Shield, Plus, Upload, Package, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Modal from '../../components/Modal'

type Driver = { _id: string; name: string; email: string; role: string }
type Vehicle = { _id: string; plateNumber: string; model?: string; status: string }

type Doc = {
  _id: string
  type: string
  filePath: string
  verified: boolean
  createdAt: string
}

export default function ShipmentDetail() {
  const { formatToLocalDateTime } = useDateTimeFormatter()

  const { id } = useParams()
  const nav = useNavigate()
  const { socket, user } = useAuth()
  const appType = getAppType()
  const isManagerPortal = appType === 'MANAGER'
  const [live, setLive] = useState<{ lat: number; lng: number; ts?: string } | null>(null)

  const [assignDriverId, setAssignDriverId] = useState<string | null>(null)
  const [assignVehicleId, setAssignVehicleId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<string | null>(null)
  const [editEta, setEditEta] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false)
  const [otpInput, setOtpInput] = useState('')
  const [otpType, setOtpType] = useState<'START' | 'COMPLETE' | null>(null)

  const shipmentData = useShipmentData(id);

  const vehicleHealthQuery = useVehicleHealth(shipmentData.shipment);

  // Use the original queries for other data
  const docsQ = useQuery({
    queryKey: ['docs', id],
    queryFn: async () => {
      const res = await api.get(`/docs/shipments/${id}`)
      return res.data.documents as Doc[]
    },
    enabled: !!id,
  })

  const driversQ = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await api.get('/fleet/drivers')
      return res.data.drivers as Driver[]
    },
    enabled: isManagerPortal && user?.role === 'MANAGER',
  })

  const vehiclesQ = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get('/fleet/vehicles')
      return res.data.vehicles as Vehicle[]
    },
    enabled: isManagerPortal && user?.role === 'MANAGER',
  })

  const simStatusQuery = useQuery({
    queryKey: ['sim-status'],
    queryFn: () => simulationApi.getStatus(),
    refetchInterval: (query) => (query.state.data as any)?.running ? 10000 : false,
    refetchOnWindowFocus: true
  })

  const eventsQ = useQuery({
    queryKey: ['shipment-events', id],
    queryFn: async () => {
      const res = await shipmentApi.getEvents(id!)
      return res.events
    },
    enabled: !!id,
    refetchInterval: () => simStatusQuery.data?.running ? 5000 : false
  })

  useEffect(() => {
    if (!socket || !id) return

    socket.emit('join:shipment', { shipmentId: id })

    const handler = (msg: { shipmentId?: string; lat: number; lng: number; ts?: string }) => {
      if (msg?.shipmentId !== id) return
      setLive({ lat: msg.lat, lng: msg.lng, ts: msg.ts })
    }

    socket.on('shipment:locationUpdate', handler)

    return () => {
      socket.off('shipment:locationUpdate', handler)
      socket.emit('leave:shipment', { shipmentId: id })
    }
  }, [socket, id])


  if (shipmentData.isLoading) return <ShipmentDetailSkeleton />
  if (shipmentData.isError || !shipmentData.shipment) {
    return (
      <ErrorDisplay
        message="Failed to load shipment. Please try again later."
        onRetry={() => shipmentData.refetch()}
        className="m-4"
      />
    );
  }

  const shipment = shipmentData.shipment as Shipment
  const locations = shipmentData.locations || []
  const last = locations.slice(-1)[0]
  const current = live || (last ? { lat: last.lat, lng: last.lng } : null)

  if (!shipment) {
    return (
      <ErrorDisplay
        message="Shipment not found."
        className="m-4"
      />
    );
  }



  async function dispatch() {
    if (!id) {
      alert('Shipment ID is required');
      return;
    }
    try {
      await shipmentApi.dispatch(id);
      await shipmentData.refetch();
    } catch (error) {
      const apiError = handleApiError(error);
      alert(`Failed to dispatch shipment: ${apiError.message}`);
    }
  }

  async function handleRequestOtp(type: 'START' | 'COMPLETE') {
    if (!id) return
    try {
      const res = await shipmentApi.requestOtp(id, type)
      setOtpType(type)
      setIsOtpModalOpen(true)
      alert(res.message)
    } catch (error) {
      const apiError = handleApiError(error)
      alert(`Failed to request OTP: ${apiError.message}`)
    }
  }

  async function handleVerifyOtp() {
    if (!id || !otpType || !otpInput) return
    try {
      if (otpType === 'START') {
        await shipmentApi.start(id, otpInput)
        alert('Delivery started successfully!')
      } else {
        await shipmentApi.deliver(id, otpInput)
        alert('Delivery completed successfully!')
      }
      setIsOtpModalOpen(false)
      setOtpInput('')
      await shipmentData.refetch()
    } catch (error) {
      const apiError = handleApiError(error)
      alert(`OTP Verification failed: ${apiError.message}`)
    }
  }

  async function deliver() {
    handleRequestOtp('COMPLETE')
  }

  async function startDelivery() {
    handleRequestOtp('START')
  }

  async function assign() {
    if (!id || !shipment) return;
    const driverId = assignDriverId ?? shipment.assignedDriverId ?? '';
    const vehicleId = assignVehicleId ?? shipment.assignedVehicleId ?? '';
    if (!driverId || !vehicleId) return alert('Select driver and vehicle');
    try {
      await shipmentApi.assign(id, { driverId, vehicleId });
      await shipmentData.refetch();
      alert('Shipment assigned');
    } catch (error) {
      const apiError = handleApiError(error);
      alert(`Failed to assign shipment: ${apiError.message}`);
    }
  }

  async function updateShipment() {
    if (!id || !shipment) return;
    const payload: Record<string, unknown> = {};

    const status = editStatus ?? shipment.status;
    if (status && status !== shipment.status) payload.status = status;

    const etaLocal = editEta ?? formatToLocalDateTime(shipment.eta);
    const originalEta = formatToLocalDateTime(shipment.eta);
    if (etaLocal !== originalEta) payload.eta = etaLocal ? new Date(etaLocal).toISOString() : null;

    if (!Object.keys(payload).length) return alert('No changes to update');

    try {
      await shipmentApi.update(id, payload);
      await shipmentData.refetch();
      alert('Shipment updated');
    } catch (error) {
      const apiError = handleApiError(error);
      alert(`Failed to update shipment: ${apiError.message}`);
    }
  }

  async function remove() {
    if (!id) {
      alert('Shipment ID is required');
      return;
    }
    if (!confirm('Delete this shipment? This will remove related pings/docs/invoices.')) return;
    try {
      await shipmentApi.delete(id);
      nav('/app/shipments');
    } catch (error) {
      const apiError = handleApiError(error);
      alert(`Failed to delete shipment: ${apiError.message}`);
    }
  }


  async function generateDoc(type: string) {
    if (!id) return;
    setIsGenerating(true);
    try {
      await api.post(`/docs/shipments/${id}/generate`, { type });
      await docsQ.refetch();
      alert(`${type.replace(/_/g, ' ')} generated successfully`);
    } catch (error) {
      const apiError = handleApiError(error);
      alert(`Failed to generate document: ${apiError.message}`);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleUploadDoc(type: string, file: File) {
    if (!id) return;
    try {
      await documentApi.upload(id, file, type);
      await docsQ.refetch();
      toast.success(`${type.replace(/_/g, ' ')} uploaded successfully`);
    } catch (error) {
      const apiError = handleApiError(error);
      toast.error(`Failed to upload document: ${apiError.message}`);
    }
  }

  async function toggleSimulation() {
    const isRunning = simStatusQuery.data?.running;
    try {
      if (isRunning) {
        await simulationApi.stop();
        toast.success('Simulation Engine Stopped');
      } else {
        await simulationApi.start();
        toast.success('Simulation Engine Active');
      }
      simStatusQuery.refetch();
    } catch (error) {
      toast.error('Failed to control simulation');
    }
  }

  return (
    <div className="space-y-6">
      <Modal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        title="Shipment Administration"
      >
        <div className="space-y-6 text-left">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assign Driver</label>
              <select
                value={assignDriverId ?? shipment.assignedDriverId ?? ''}
                onChange={(e) => setAssignDriverId(e.target.value)}
                className="input-glass w-full"
              >
                <option value="">Select driver…</option>
                {(driversQ.data || []).map((d) => (
                  <option key={d._id} value={d._id}>{d.name} ({d.email})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assign Vehicle</label>
              <select
                value={assignVehicleId ?? shipment.assignedVehicleId ?? ''}
                onChange={(e) => setAssignVehicleId(e.target.value)}
                className="input-glass w-full"
              >
                <option value="">Select vehicle…</option>
                {(vehiclesQ.data || []).map((v) => (
                  <option key={v._id} value={v._id}>{v.plateNumber} {v.model ? `(${v.model})` : ''}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => { assign(); setIsManageModalOpen(false); }}
              className="btn-primary w-full py-3 shadow-xl shadow-blue-500/20"
              disabled={!(assignDriverId ?? shipment.assignedDriverId) || !(assignVehicleId ?? shipment.assignedVehicleId)}
            >
              Update Resource Allocation
            </button>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Override</label>
                <select
                  value={editStatus ?? shipment.status}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="input-glass w-full"
                >
                  {SHIPMENT_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adjust ETA</label>
                <input
                  value={editEta ?? formatToLocalDateTime(shipment.eta)}
                  onChange={(e) => setEditEta(e.target.value)}
                  type="datetime-local"
                  className="input-glass w-full"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { updateShipment(); setIsManageModalOpen(false); }} className="btn-primary flex-1 py-3">Save Metadata</button>
              <button
                onClick={remove}
                className="p-3 rounded-2xl border border-rose-100 text-rose-600 hover:bg-rose-50 dark:border-rose-900/30 dark:hover:bg-rose-950/20 transition-all"
                title="Delete Shipment"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        title={`Verify Delivery ${otpType === 'START' ? 'Start' : 'Completion'}`}
      >
        <div className="space-y-4 py-4">
          <p className="text-sm text-slate-500">
            Please enter the 6-digit OTP provided by the {otpType === 'START' ? 'consignor' : 'consignee'} to proceed.
          </p>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification Code</label>
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
              className="input-glass w-full text-center text-2xl tracking-[0.5em] font-mono py-4"
            />
          </div>
          <button
            onClick={handleVerifyOtp}
            disabled={otpInput.length !== 6}
            className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Verify & Proceed
          </button>
          <div className="text-center">
            <button
              onClick={() => handleRequestOtp(otpType!)}
              className="text-xs text-blue-500 font-bold hover:underline"
            >
              Resend OTP
            </button>
          </div>
        </div>
      </Modal>

      {/* Premium Role-Specific Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-5">
          <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-2xl ${shipment.status === 'DELIVERED' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'
            }`}>
            <Package className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                {shipment.referenceId}
              </h1>
              {isManagerPortal && (
                <button
                  onClick={() => setIsManageModalOpen(true)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-blue-500 transition-all border border-slate-200 dark:border-white/10 hover:shadow-lg"
                >
                  <Settings className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest ring-1 ring-inset ${shipment.status === 'DELIVERED'
                ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30'
                : 'bg-blue-600/10 text-blue-600 ring-blue-600/30'
                }`}>
                {shipment.status.replace(/_/g, ' ')}
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <Clock className="h-3 w-3" />
                SCHED: {formatDate(shipment.eta)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Manager Specific Actions */}
          {isManagerPortal && (
            <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
              {['IN_TRANSIT', 'DISPATCHED', 'OUT_FOR_DELIVERY'].includes(shipment.status) && (
                <button
                  onClick={toggleSimulation}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border ${simStatusQuery.data?.running
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <Radio className={`h-3.5 w-3.5 ${simStatusQuery.data?.running ? 'animate-pulse' : ''}`} />
                  {simStatusQuery.data?.running ? 'Live' : 'Simulate'}
                </button>
              )}
              {shipment.status === 'ASSIGNED' && (
                <button
                  onClick={dispatch}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all"
                >
                  Dispatch
                </button>
              )}
            </div>
          )}

          {/* Driver Specific Actions */}
          {user?.role === 'DRIVER' && String(shipment.assignedDriverId) === String(user.id) && (
            <div className="flex gap-2">
              {shipment.status === 'ASSIGNED' && (
                <>
                  <button onClick={async () => {
                    try {
                      await api.post(`/shipments/${id}/accept`);
                      await shipmentData.refetch();
                      toast.success('Assignment Accepted');
                    } catch (err: any) {
                      toast.error(err.response?.data?.error?.message || 'Failed to accept');
                    }
                  }} className="btn-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20">Accept</button>
                  <button onClick={async () => {
                    const reason = prompt('Reason?');
                    if (!reason) return;
                    try {
                      await api.post(`/shipments/${id}/reject`, { reason });
                      await shipmentData.refetch();
                      toast.error('Assignment Rejected');
                    } catch (err: any) {
                      toast.error(err.response?.data?.error?.message || 'Failed to reject');
                    }
                  }} className="btn-ghost border-rose-200 text-rose-600 hover:bg-rose-50">Reject</button>
                </>
              )}
              {['PICKED_UP', 'ASSIGNED'].includes(shipment.status) && (
                <button onClick={startDelivery} className="btn-primary bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Start Journey
                </button>
              )}
              {['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(shipment.status) && (
                <button onClick={deliver} className="btn-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Delivery
                </button>
              )}
            </div>
          )}

          {/* Cancellation Option */}
          {['CREATED', 'ASSIGNED'].includes(shipment.status) && (isManagerPortal || (user?.role === 'CUSTOMER' && String(shipment.customerId) === String(user.id))) && (
            <button
              onClick={async () => {
                const reason = prompt('Cancellation Reason?');
                if (!reason) return;
                try {
                  await api.post(`/shipments/${id}/cancel`, { reason });
                  await shipmentData.refetch();
                  toast.success('Shipment Cancelled');
                } catch (err: any) {
                  toast.error(err.response?.data?.error?.message || 'Failed to cancel');
                }
              }}
              className="p-2.5 rounded-xl border border-rose-100 text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
              title="Cancel Shipment"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Info + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryItem label="Type" value={shipment.shipmentType || 'KIRANA'} icon={<BarChart3 className="h-3 w-3 text-indigo-500" />} />
            <SummaryItem label="Origin" value={shipment.origin.name} icon={<MapPin className="h-3 w-3 text-blue-500" />} />
            <SummaryItem label="Destination" value={shipment.destination.name} icon={<Navigation className="h-3 w-3 text-cyan-500" />} />
            <SummaryItem
              label="Distance"
              value={formatDistance(shipment.distanceKm)}
              sub={shipment.predictedEta ? `ETA: ${formatDate(shipment.predictedEta)}` : undefined}
              icon={<Zap className="h-3 w-3 text-amber-500" />}
            />
          </div>

          {/* Unified Live Tracking View */}
          <div className="h-[800px] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10">
            <LiveShipmentTracker
              shipment={shipment}
              locations={shipmentData.locations || []}
              liveLocation={current}
              events={eventsQ.data || []}
              vehicleHealth={vehicleHealthQuery.data?.healthStatus}
            />
          </div>

        </div>

        {/* Right Column: Journey Paperwork Center */}
        <div className="space-y-6">
          <div className="glass-card border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden p-0">
            <div className="p-6 bg-slate-900 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-400" />
                  Paperwork Center
                </h3>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-blue-500 rounded-full">
                  Journey Compliance
                </span>
              </div>
              <p className="text-slate-400 text-xs font-bold leading-relaxed">
                Automated compliance tracking for global standards {shipment.referenceId}
              </p>
            </div>

            <div className="p-6 space-y-8">
              {/* Pre-Journey Phase */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[10px] font-black text-blue-600">1</div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pre-Journey Dispatch</h4>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <DocActionItem
                    label="Dispatch Manifest"
                    doc={docsQ.data?.find(d => d.type === 'DISPATCH_MANIFEST')}
                    onGenerate={() => generateDoc('DISPATCH_MANIFEST')}
                    onUpload={(file: File) => handleUploadDoc('DISPATCH_MANIFEST', file)}
                    isGenerating={isGenerating}
                    isManagerPortal={isManagerPortal}
                  />
                  <DocActionItem
                    label="Vehicle Inspection"
                    doc={docsQ.data?.find(d => d.type === 'VEHICLE_INSPECTION')}
                    onGenerate={() => generateDoc('VEHICLE_INSPECTION')}
                    onUpload={(file: File) => handleUploadDoc('VEHICLE_INSPECTION', file)}
                    isGenerating={isGenerating}
                    isManagerPortal={isManagerPortal}
                  />
                </div>
              </div>

              {/* Mid-Journey Phase */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-[10px] font-black text-purple-600">2</div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transit Compliance</h4>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <DocActionItem
                    label="E-Way Bill"
                    doc={docsQ.data?.find(d => d.type === 'E_WAY_BILL')}
                    onGenerate={() => generateDoc('E_WAY_BILL')}
                    onUpload={(file: File) => handleUploadDoc('E_WAY_BILL', file)}
                    isGenerating={isGenerating}
                    isManagerPortal={isManagerPortal}
                  />
                  <DocActionItem
                    label="Consignment Note"
                    doc={docsQ.data?.find(d => d.type === 'CONSIGNMENT_NOTE')}
                    onGenerate={() => generateDoc('CONSIGNMENT_NOTE')}
                    onUpload={(file: File) => handleUploadDoc('CONSIGNMENT_NOTE', file)}
                    isGenerating={isGenerating}
                    isManagerPortal={isManagerPortal}
                  />
                </div>
              </div>

              {/* Post-Journey Phase */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-[10px] font-black text-emerald-600">3</div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivery & Billing</h4>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <DocActionItem
                    label="Proof of Delivery (POD)"
                    doc={docsQ.data?.find(d => d.type === 'POD')}
                    onGenerate={() => generateDoc('POD')}
                    onUpload={(file: File) => handleUploadDoc('POD', file)}
                    isGenerating={isGenerating}
                    isManagerPortal={isManagerPortal}
                  />
                  <DocActionItem
                    label="GST Final Invoice"
                    doc={docsQ.data?.find(d => d.type === 'GST_INVOICE')}
                    onGenerate={() => generateDoc('GST_INVOICE')}
                    onUpload={(file: File) => handleUploadDoc('GST_INVOICE', file)}
                    isGenerating={isGenerating}
                    isManagerPortal={isManagerPortal}
                  />
                </div>
              </div>
            </div>

            {/* Verification Status Banner */}
            <div className="p-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`h-4 w-4 ${docsQ.data?.every(d => d.verified) ? 'text-emerald-500' : 'text-slate-300'}`} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Compliance Status</span>
              </div>
              <span className={`text-[10px] font-black uppercase ${docsQ.data?.every(d => d.verified) ? 'text-emerald-500' : 'text-amber-500'}`}>
                {docsQ.data?.filter(d => d.verified).length || 0} / {docsQ.data?.length || 0} VERIFIED
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DocActionItemProps {
  label: string;
  doc?: { filePath: string; verified: boolean };
  onGenerate: () => void;
  onUpload: (file: File) => void;
  isGenerating: boolean;
  isManagerPortal: boolean;
}

function DocActionItem({ label, doc, onGenerate, onUpload, isGenerating, isManagerPortal }: DocActionItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 hover:border-blue-500/30 transition-all group">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${doc ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}>
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-black text-slate-900 dark:text-white truncate">{label}</div>
          {doc ? (
            <div className="flex items-center gap-2">
              <a href={buildDocumentUrl(doc.filePath)} target="_blank" rel="noreferrer" className="text-[9px] font-black text-blue-500 uppercase hover:underline">View File</a>
              {doc.verified && <CheckCircle2 className="h-2 w-2 text-emerald-500" />}
            </div>
          ) : (
            <div className="text-[9px] font-bold text-slate-400 uppercase">Awaiting Action</div>
          )}
        </div>
      </div>

      {!doc && isManagerPortal && (
        <div className="flex gap-1">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            title="Auto-generate"
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
          <label className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm cursor-pointer" title="Manual Upload">
            <Upload className="h-4 w-4" />
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) onUpload(e.target.files[0]);
              }}
            />
          </label>
        </div>
      )}
    </div>
  )
}


function ShipmentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card h-20 flex flex-col justify-between">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
          <Skeleton className="h-[400px] w-full border border-slate-100 dark:border-white/5 rounded-2xl" />
          <div className="glass-card h-32 space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="glass-card h-40 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="glass-card h-64 space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2 pt-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryItem({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="glass-card group hover:scale-[1.02] transition-transform">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</div>
      </div>
      <div className="font-bold text-slate-900 dark:text-white truncate">{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}
