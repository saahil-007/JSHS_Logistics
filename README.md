# Next-Gen Logistics Platform (Hackathon MVP)
Monorepo with:
- `frontend/`: React (Vite) + Tailwind + Leaflet map + Socket.IO client
- `backend/`: Express (ESM) + MongoDB (Atlas/local via Mongoose) + Socket.IO + JWT auth

## Features implemented (demo-ready)
- Role-based auth: MANAGER / DRIVER / CUSTOMER
- Shipment management: create/list/detail, assign (API), dispatch, deliver
- Real-time shipment tracking: driver sends location pings via Socket.IO, manager/customer see live updates on map
- Documents: upload POD (and other doc types), manager verification
- Payments: invoices list + mock settlement gated by verified POD
- Escrow & disputes (winning factor): customer can pre-fund escrow; manager verifies POD; escrow auto-releases; customer can raise dispute and manager can resolve (release/refund)
- Realtime split payouts (winning factor): when invoice becomes PAID, system instantly pays driver + logistics org (mock) and pushes realtime updates
- Analytics: basic KPI dashboard
- Notifications: assignment/dispatch/delivery notifications + realtime push

## Setup
### 1) Backend env
Copy and edit:
- `backend/.env.example` → `backend/.env`

Set `MONGODB_URI` to MongoDB Atlas connection string (recommended).

Note: if `MONGODB_URI` is not set, backend falls back to local `mongodb://127.0.0.1:27017/nextgen_logistics`.

### 2) Install
From repo root:
- `npm install`

### 3) Seed demo data
- `npm run db:seed`

Seed creates demo users:
- `manager@test.com` / `password123`
- `driver@test.com` / `password123`
- `customer@test.com` / `password123`

### 4) Run dev servers
- `npm run dev`

Frontend: http://localhost:5173
Backend: http://localhost:4000

## Demo flow (recommended)
1. Login as **manager@test.com**
2. Go to Shipments → open a shipment → keep the map open
3. In a second browser/tab (or incognito), login as **driver@test.com**
4. Go to Driver Mode → Start Tracking
5. Switch back to Manager shipment map: you should see the marker move in realtime
6. Driver: Shipment → Mark Delivered
7. Customer/Driver: upload POD from Shipment Detail
8. Manager: Shipment Detail → verify POD under "Shipment documents"
9. Payments: open invoice → Pay (mock)


<!-- hellodosto -->