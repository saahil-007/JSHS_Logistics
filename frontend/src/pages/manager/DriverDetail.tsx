
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, ZoomControl, ScaleControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { api } from '../../lib/api';

import type { Shipment } from '../../types';


type Driver = { 
  _id: string; 
  name: string; 
  email: string; 
  role: string;
  driverApprovalStatus: string;
  logisticsOrgId?: string;
};

export default function DriverDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();


  const driverQuery = useQuery({
    queryKey: ['driver', id],
    queryFn: async () => {
      const res = await api.get(`/fleet/drivers/${id}`);
      return res.data.driver as Driver;
    },
  });

  const shipmentsQuery = useQuery({
    queryKey: ['driverShipments', id],
    queryFn: async () => {
      const res = await api.get(`/shipments`);
      const allShipments = res.data.shipments as Shipment[];
      // Filter shipments assigned to this driver
      return allShipments.filter(s => s.assignedDriverId === id);
    },
  });

  const driver = driverQuery.data;

  if (!driver) {
    return (
      <div className="space-y-2">
        {driverQuery.isLoading ? <div>Loading…</div> : null}
        {driverQuery.isError ? <div className="text-red-600">Failed to load driver.</div> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Driver Details</h1>
          <p className="text-sm text-slate-600 dark:text-white/70">Information and active shipments for {driver.name}</p>
        </div>
        <button 
          onClick={() => nav(-1)} 
          className="btn-ghost border border-slate-200/60 hover:bg-slate-900/5 dark:border-white/10 dark:hover:bg-white/10"
        >
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="glass-card">
            <div className="mb-2 text-sm font-medium">Driver Information</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-slate-600 dark:text-white/60">Name</div>
                <div className="font-medium">{driver.name}</div>
              </div>
              <div>
                <div className="text-xs text-slate-600 dark:text-white/60">Email</div>
                <div className="font-medium">{driver.email}</div>
              </div>
              <div>
                <div className="text-xs text-slate-600 dark:text-white/60">Role</div>
                <div className="font-medium">{driver.role}</div>
              </div>
              <div>
                <div className="text-xs text-slate-600 dark:text-white/60">Status</div>
                <div className={`font-medium ${
                  driver.driverApprovalStatus === 'APPROVED' 
                    ? 'text-green-600 dark:text-green-400' 
                    : driver.driverApprovalStatus === 'PENDING' 
                      ? 'text-amber-600 dark:text-amber-400' 
                      : 'text-red-600 dark:text-red-400'
                }`}>
                  {driver.driverApprovalStatus}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="mb-2 text-sm font-medium">Shipments</div>
          <div className="space-y-2">
            {shipmentsQuery.isLoading ? (
              <div>Loading shipments...</div>
            ) : shipmentsQuery.isError ? (
              <div className="text-red-600">Failed to load shipments.</div>
            ) : (
              (shipmentsQuery.data ?? []).length > 0 ? (
                (shipmentsQuery.data ?? []).map(shipment => (
                  <div key={shipment._id} className="p-2 border border-slate-200/60 rounded-lg dark:border-white/10">
                    <div className="font-medium">{shipment.referenceId}</div>
                    <div className="text-xs text-slate-600 dark:text-white/60">
                      {shipment.status} • {shipment.origin.name} → {shipment.destination.name}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-600 dark:text-white/60">No active shipments</div>
              )
            )}
          </div>
        </div>
      </div>

      {(shipmentsQuery.data ?? []).length > 0 && (
        <div className="glass-card">
          <div className="mb-2 text-sm font-medium">Current Location</div>
          <div style={{ height: 500 }} className="w-full rounded-2xl overflow-hidden border border-slate-200/60 dark:border-white/10">
            <MapContainer 
              center={[20.5937, 78.9629]} 
              zoom={6} 
              zoomControl={true}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer 
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
              />
              
              <ZoomControl position="bottomright" />
              <ScaleControl imperial={true} />
              
              {/* Markers for all shipments assigned to this driver */}
              {(shipmentsQuery.data ?? []).map(shipment => {
                if (shipment.currentLocation) {
                  return (
                    <Marker 
                      key={shipment._id} 
                      position={[shipment.currentLocation.lat, shipment.currentLocation.lng]} 
                    />
                  );
                }
                return null;
              })}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
