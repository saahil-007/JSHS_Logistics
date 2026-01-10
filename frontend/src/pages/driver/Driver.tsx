import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAuth } from '../../auth/AuthContext'
import type { Payout, Shipment } from '../../types'

type NotificationMsg = { type?: string }

type GeoState =
  | { status: 'idle' }
  | { status: 'unsupported' }
  | { status: 'watching'; lat: number; lng: number; accuracyM?: number; heading?: number | null; speedMps?: number | null }
  | { status: 'error'; message: string }

export default function Driver() {
  const { socket } = useAuth()
  const [selectedIdState, setSelectedIdState] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' })

  const shipmentsQ = useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
      const res = await api.get('/shipments')
      return res.data.shipments as Shipment[]
    },
  })

  const payoutsQ = useQuery({
    queryKey: ['payouts'],
    queryFn: async () => {
      const res = await api.get('/payments/payouts')
      return res.data.payouts as Payout[]
    },
  })

  const selectedId = selectedIdState ?? (shipmentsQ.data ?? [])[0]?._id ?? ''

  const selected = useMemo(
    () => (shipmentsQ.data ?? []).find((s) => s._id === selectedId) ?? null,
    [shipmentsQ.data, selectedId]
  )

  useEffect(() => {
    if (!socket) return

    const handler = (msg: NotificationMsg) => {
      // When manager assigns a shipment, backend emits notification:new to user room.
      if (msg?.type === 'ASSIGNMENT') {
        shipmentsQ.refetch()
      }

      // Realtime payment: when driver is paid, refresh payouts.
      if (msg?.type === 'PAYOUT') {
        payoutsQ.refetch()
      }
    }

    const payoutHandler = () => {
      payoutsQ.refetch()
    }

    socket.on('notification:new', handler)
    socket.on('payment:payout', payoutHandler)
    return () => {
      socket.off('notification:new', handler)
      socket.off('payment:payout', payoutHandler)
    }
  }, [socket, shipmentsQ, payoutsQ])


  function stop() {
    setRunning(false)

    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    setGeo({ status: 'idle' })
  }

  function startLiveGps() {
    if (!socket || !selected) return

    // Redirect/open OpenStreetMap navigation to the shipment destination.
    // (We open in a new tab so tracking can continue in the app during the demo.)
    const dest = selected.destination
    if (dest?.lat && dest?.lng) {
      const url = `https://www.openstreetmap.org/directions?to=${dest.lat}%2C${dest.lng}`
      window.open(url, '_blank', 'noopener,noreferrer')
    }

    if (!navigator.geolocation) {
      setGeo({ status: 'unsupported' })
      return
    }

    stop()
    setRunning(true)

    // NOTE: Browser geolocation requires HTTPS in production.
    // It works on localhost during development.
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const accuracyM = pos.coords.accuracy
        const heading = pos.coords.heading
        const speedMps = pos.coords.speed

        setGeo({ status: 'watching', lat, lng, accuracyM, heading, speedMps })

        socket.emit('driver:locationPing', {
          shipmentId: selected._id,
          lat,
          lng,
          speedKmph: typeof speedMps === 'number' ? Math.round(speedMps * 3.6) : undefined,
          heading: typeof heading === 'number' ? heading : undefined,
          ts: new Date(pos.timestamp).toISOString(),
        })
      },
      (err) => {
        setGeo({ status: 'error', message: err.message || 'Failed to read GPS location' })
        setRunning(false)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 15000,
      }
    )
  }

  const totalEarned = (payoutsQ.data ?? []).reduce((sum, p) => sum + (p.status === 'SUCCEEDED' ? p.amount : 0), 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Driver Mode</h1>
        <p className="text-sm text-slate-600 dark:text-white/70">Simulate live GPS updates to demonstrate realtime tracking.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="glass-card">
          <div className="text-sm text-slate-600 dark:text-white/60">Realtime earnings (paid)</div>
          <div className="text-2xl font-semibold">₹ {totalEarned}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-white/60">Updates instantly when invoice settles.</div>
        </div>
        <div className="glass-card lg:col-span-2">
          <div className="mb-2 text-sm font-medium">Recent payouts</div>
          <div className="overflow-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500 dark:text-white/60">
                  <th className="py-2">Invoice</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(payoutsQ.data ?? []).slice(0, 6).map((p) => (
                  <tr key={p._id} className="border-t border-slate-200/60 dark:border-white/10">
                    <td className="py-2 font-medium">{p.invoiceId.slice(-6)}</td>
                    <td className="py-2">
                      {p.currency} {p.amount}
                    </td>
                    <td className="py-2">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div className="mb-2 text-sm font-medium">Select assigned shipment</div>
        <select value={selectedId} onChange={(e) => setSelectedIdState(e.target.value)} className="input-glass">
          {(shipmentsQ.data ?? []).map((s) => (
            <option key={s._id} value={s._id} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
              {s.referenceId} • {s.status}
            </option>
          ))}
        </select>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={startLiveGps} disabled={!socket || running || !selected} className="btn-primary disabled:opacity-50">
            Start GPS + Google Maps
          </button>
          <button
            onClick={stop}
            disabled={!running}
            className="btn-ghost border border-slate-200/60 hover:bg-slate-900/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
          >
            Stop
          </button>
        </div>

        <div className="mt-2 text-xs text-slate-500 dark:text-white/60">
          Uses browser Geolocation (web-only) + Socket.IO event <code>driver:locationPing</code>.
        </div>

        {geo.status === 'unsupported' ? (
          <div className="mt-2 rounded-xl bg-yellow-500/10 p-3 text-sm text-yellow-900 ring-1 ring-yellow-400/20 dark:text-yellow-200">
            Geolocation is not supported in this browser.
          </div>
        ) : null}

        {geo.status === 'error' ? (
          <div className="mt-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-800 ring-1 ring-red-400/20 dark:text-red-200">
            GPS error: {geo.message}
          </div>
        ) : null}

        {geo.status === 'watching' ? (
          <div className="mt-2 text-xs text-slate-600 dark:text-white/70">
            Live: {geo.lat.toFixed(6)}, {geo.lng.toFixed(6)}
            {typeof geo.accuracyM === 'number' ? ` • ±${Math.round(geo.accuracyM)}m` : ''}
          </div>
        ) : null}
      </div>
    </div>
  )
}
