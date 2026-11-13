'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeftRight,
  BusFront,
  Check,
  ChevronDown,
  Clock3,
  Edit3,
  Flag,
  Gauge,
  LayoutDashboard,
  LogIn,
  LogOut,
  Map as MapIcon,
  MapPin,
  Menu,
  MoreHorizontal,
  MousePointer2,
  Navigation,
  Phone,
  Plus,
  Radio,
  RotateCcw,
  Route,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import ProductionMap from '@/components/production-map';
import type { RoutePoint } from '@/db/schema';
import { distanceToRoute } from '@/lib/geo';

type View = 'passenger' | 'driver' | 'admin';
type AdminTab = 'overview' | 'routes' | 'vehicles' | 'gps';

type AppRoute = {
  id?: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  via: string;
  stops: number;
  color: string;
  operatingStart?: string;
  operatingEnd?: string;
  updatedAt?: string;
  fare?: number;
  active: boolean;
  activeVehicles?: number;
  fleet: number;
  pathA: RoutePoint[];
  pathB: RoutePoint[];
};
type LocationSearchResult = RoutePoint & {
  id: string;
  name: string;
  type: string;
};
type MapFocusPoint = RoutePoint & { id: number; label: string };

function normalizeDatabaseRoutes(data: unknown): AppRoute[] {
  if (!Array.isArray(data)) return [];
  return data.map((route: AppRoute) => ({
    ...route,
    stops: route.stops ?? 0,
    active: route.active ?? 0,
    fleet: route.fleet ?? 0,
    pathA: Array.isArray(route.pathA) ? route.pathA : [],
    pathB: Array.isArray(route.pathB) ? route.pathB : [],
  }));
}

async function fetchDatabaseRoutes() {
  const response = await fetch('/api/routes', { cache: 'no-store' });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string'
        ? data.error
        : 'Gagal memuat trayek dari database.',
    );
  }
  return normalizeDatabaseRoutes(data?.routes);
}

const ROUTES_UPDATED_EVENT = 'traslink:routes-updated';
const ROUTES_PER_PAGE = 5;

function announceRoutesUpdated() {
  window.dispatchEvent(new Event(ROUTES_UPDATED_EVENT));
  localStorage.setItem(ROUTES_UPDATED_EVENT, String(Date.now()));
}

type VehicleStatus = 'ACTIVE' | 'RESTING' | 'MAINTENANCE' | 'INACTIVE';
type VehicleRecord = {
  id: string;
  plateNumber: string;
  capacity: number;
  status: VehicleStatus;
  routeId: string | null;
  routeCode: string | null;
  driverId: string | null;
  driverName: string | null;
  gpsDeviceId: string | null;
  gpsCode: string | null;
  latitude: number | null;
  longitude: number | null;
  recordedAt: string | null;
  locationFresh: boolean;
};
type DriverRecord = { id: string; name: string; email: string };
type GpsRecord = {
  id: string;
  deviceCode: string;
  imei: string;
  active: boolean;
  online: boolean;
  lastSeenAt: string | null;
  vehicleId: string | null;
  plateNumber: string | null;
};

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-coral text-white shadow-sm">
        <Navigation className="size-5" />
      </span>
      {!compact && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-400">
            Transportation Link
          </p>
          <p className="font-extrabold leading-tight text-ink">Traslink</p>
        </div>
      )}
    </div>
  );
}

function MapCanvas({
  routeData,
  vehicles = [],
  pickups = [],
  editor = false,
  direction = 'A',
  onPathChange,
  focusPoint,
}: {
  routeData?: AppRoute;
  vehicles?: Array<{
    id: string;
    label?: string;
    latitude: number;
    longitude: number;
  }>;
  pickups?: Array<{
    id: string;
    label: string;
    latitude: number;
    longitude: number;
  }>;
  editor?: boolean;
  direction?: 'A' | 'B';
  onPathChange?: (p: RoutePoint[]) => void;
  focusPoint?: MapFocusPoint | null;
}) {
  const pathA = Array.isArray(routeData?.pathA) ? routeData.pathA : [];
  const pathB = Array.isArray(routeData?.pathB) ? routeData.pathB : [];
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#e8eee9]">
      <ProductionMap
        path={direction === 'A' ? pathA : pathB}
        color={routeData?.color ?? '#ff5a47'}
        vehicles={editor ? [] : vehicles}
        pickups={pickups}
        editable={editor}
        onPathChange={onPathChange}
        fitKey={`${routeData?.id ?? 'empty'}-${direction}-${editor ? 'editor' : (routeData?.updatedAt ?? 'current')}`}
        focusPoint={focusPoint}
      />
    </div>
  );
}

function TopNav({
  view,
  setView,
  allowedViews,
  authenticated = true,
  onAdminLogin,
}: {
  view: View;
  setView: (v: View) => void;
  allowedViews: View[];
  authenticated?: boolean;
  onAdminLogin?: () => void;
}) {
  return (
    <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-4 md:px-7">
      <div className="rounded-2xl border border-white/70 bg-white/90 p-2 pr-4 shadow-map backdrop-blur-xl">
        <Logo />
      </div>
      <div className="flex gap-2">
        {allowedViews.length > 1 && (
          <nav className="flex items-center gap-1 rounded-xl border border-white/70 bg-white/90 p-1 shadow-map backdrop-blur-xl">
            {(
              [
                ['passenger', 'Penumpang'],
                ['driver', 'Supir'],
                ['admin', 'Admin'],
              ] as const
            )
              .filter(([key]) => allowedViews.includes(key))
              .map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition md:px-4 ${view === key ? 'bg-ink text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {label}
                </button>
              ))}
          </nav>
        )}
        {authenticated ? (
          <Button
            onClick={() =>
              fetch('/api/auth/logout', { method: 'POST' }).then(() =>
                location.reload(),
              )
            }
            variant="outline"
            size="icon-lg"
            className="rounded-xl border-white bg-white shadow-map"
            aria-label="Keluar"
          >
            <LogOut />
          </Button>
        ) : (
          <Button
            onClick={onAdminLogin}
            variant="outline"
            className="h-11 rounded-xl border-white bg-white px-3 text-xs font-bold shadow-map"
          >
            <LogIn />
            <span className="hidden sm:inline">Masuk Petugas</span>
            <span className="sm:hidden">Masuk</span>
          </Button>
        )}
      </div>
    </header>
  );
}

function PassengerView({
  setView,
  allowedViews,
  authenticated = true,
  onAdminLogin,
}: {
  setView: (v: View) => void;
  allowedViews: View[];
  authenticated?: boolean;
  onAdminLogin?: () => void;
}) {
  const [routeList, setRouteList] = useState<AppRoute[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [routesReady, setRoutesReady] = useState(false);
  const [routesError, setRoutesError] = useState('');
  const [routeIndex, setRouteIndex] = useState(0);
  const [direction, setDirection] = useState<'A' | 'B'>('A');
  const [pickup, setPickup] = useState<{ id: string } | null>(null);
  const [requestingPickup, setRequestingPickup] = useState(false);
  const [nearRoute, setNearRoute] = useState(true);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const selectedRouteCodeRef = useRef('');
  const route = routeList[routeIndex] ?? null;
  const selectedPath = route
    ? direction === 'A'
      ? route.pathA
      : route.pathB
    : [];
  const hasUsablePath = Array.isArray(selectedPath) && selectedPath.length >= 2;
  const assignedActiveVehicles = vehicles.filter(
    (vehicle) => vehicle.routeId === route?.id && vehicle.status === 'ACTIVE',
  );
  const vehicleLocations = assignedActiveVehicles.flatMap((vehicle) =>
    vehicle.locationFresh &&
    vehicle.latitude != null &&
    vehicle.longitude != null &&
    distanceToRoute({ lat: vehicle.latitude, lng: vehicle.longitude }, [
      ...(route?.pathA ?? []),
      ...(route?.pathB ?? []),
    ]) <= 1000
      ? [
          {
            id: vehicle.id,
            label: vehicle.plateNumber,
            latitude: vehicle.latitude,
            longitude: vehicle.longitude,
          },
        ]
      : [],
  );
  useEffect(() => {
    let active = true;
    const requestedCode = new URLSearchParams(window.location.search).get(
      'route',
    );
    selectedRouteCodeRef.current =
      requestedCode || localStorage.getItem('traslink:selected-route') || '';
    async function refreshRoutes() {
      try {
        const [nextRoutes, vehiclesResponse] = await Promise.all([
          fetchDatabaseRoutes(),
          fetch('/api/vehicles', { cache: 'no-store' }),
        ]);
        const vehicleData = await vehiclesResponse.json().catch(() => null);
        if (!vehiclesResponse.ok)
          throw new Error('Gagal memuat posisi angkot.');
        if (!active) return;
        setRoutesError('');
        setVehicles(vehicleData?.vehicles ?? []);
        if (nextRoutes.length === 0) {
          setRouteList([]);
          setRouteIndex(0);
          return;
        }
        const preferredCode = selectedRouteCodeRef.current;
        const matchingIndex = nextRoutes.findIndex(
          (item) => item.code === preferredCode,
        );
        const nextIndex = matchingIndex >= 0 ? matchingIndex : 0;
        selectedRouteCodeRef.current = nextRoutes[nextIndex].code;
        setRouteList(nextRoutes);
        setRouteIndex(nextIndex);
      } catch (error) {
        if (active)
          setRoutesError(
            error instanceof Error
              ? error.message
              : 'Gagal memuat data transportasi.',
          );
      } finally {
        if (active) setRoutesReady(true);
      }
    }
    const refreshWhenVisible = () => {
      if (!document.hidden) void refreshRoutes();
    };
    const refreshFromStorage = (event: StorageEvent) => {
      if (event.key === ROUTES_UPDATED_EVENT) void refreshRoutes();
    };

    void refreshRoutes();
    const timer = window.setInterval(refreshRoutes, 5_000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener(ROUTES_UPDATED_EVENT, refreshWhenVisible);
    window.addEventListener('storage', refreshFromStorage);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener(ROUTES_UPDATED_EVENT, refreshWhenVisible);
      window.removeEventListener('storage', refreshFromStorage);
    };
  }, []);
  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    fetch('/api/pickups', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(data?.error ?? 'Gagal memuat jemput.');
        if (active) setPickup(data?.pickups?.[0] ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [authenticated]);
  async function togglePickup() {
    if (requestingPickup) return;
    if (pickup) {
      setRequestingPickup(true);
      const res = await fetch(`/api/pickups/${pickup.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (res.ok) {
        setPickup(null);
        setMessage('Permintaan jemput dibatalkan.');
      } else {
        const data = await res.json().catch(() => null);
        setMessage(data?.error ?? 'Permintaan jemput gagal dibatalkan.');
      }
      setRequestingPickup(false);
      return;
    }
    if (!route?.id) {
      setMessage('Trayek belum tersedia. Hubungi administrator Traslink.');
      return;
    }
    if (!hasUsablePath) {
      setMessage(
        'Rute untuk arah ini belum tersedia. Silakan pilih arah lain.',
      );
      return;
    }
    if (!navigator.geolocation) {
      setMessage('Perangkat ini tidak mendukung pencarian lokasi.');
      return;
    }
    setRequestingPickup(true);
    setMessage('Mencari lokasi Anda...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          setMessage('Mengirim permintaan jemput...');
          const res = await fetch('/api/pickups', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              routeId: route.id,
              direction,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });
          const data = await res.json().catch(() => null);
          if (res.ok) {
            setPickup(data.pickup);
            setNearRoute(true);
            setMessage('Sinyal jemput terkirim ke supir.');
          } else {
            setNearRoute(data?.distance ? data.distance <= 150 : false);
            setMessage(data?.error ?? 'Permintaan gagal.');
          }
        } catch {
          setMessage('Tidak dapat terhubung ke server. Silakan coba lagi.');
        } finally {
          setRequestingPickup(false);
        }
      },
      () => {
        setMessage('Izinkan akses lokasi agar fitur jemput dapat digunakan.');
        setRequestingPickup(false);
      },
      { enableHighAccuracy: true },
    );
  }
  if (!routesReady) {
    return (
      <main className="relative h-dvh min-h-[680px] overflow-hidden bg-[#e8eee9] text-slate-950">
        <TopNav
          view="passenger"
          setView={setView}
          allowedViews={allowedViews}
          authenticated={authenticated}
          onAdminLogin={onAdminLogin}
        />
        <div className="absolute inset-0 grid place-items-center">
          <div className="rounded-xl bg-white/90 px-4 py-3 text-xs font-semibold text-slate-500 shadow-map">
            Memuat rute terbaru...
          </div>
        </div>
      </main>
    );
  }
  if (!route) {
    return (
      <main className="relative h-dvh min-h-[680px] overflow-hidden bg-[#e8eee9] text-slate-950">
        <MapCanvas />
        <TopNav
          view="passenger"
          setView={setView}
          allowedViews={allowedViews}
          authenticated={authenticated}
          onAdminLogin={onAdminLogin}
        />
        <div className="absolute inset-0 z-20 grid place-items-center px-4">
          <div className="max-w-sm rounded-2xl border bg-white/95 p-5 text-center shadow-map">
            <Route className="mx-auto mb-3 size-7 text-slate-400" />
            <h2 className="font-extrabold">Belum ada trayek tersedia</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {routesError ||
                'Trayek akan tampil setelah administrator menambahkannya.'}
            </p>
          </div>
        </div>
      </main>
    );
  }
  return (
    <main className="relative h-dvh min-h-[680px] overflow-hidden text-slate-950">
      <MapCanvas
        routeData={route}
        direction={direction}
        vehicles={vehicleLocations}
      />
      <TopNav
        view="passenger"
        setView={setView}
        allowedViews={allowedViews}
        authenticated={authenticated}
        onAdminLogin={onAdminLogin}
      />
      <section className="absolute left-1/2 top-24 z-30 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-[22px] border border-white/80 bg-white/94 p-3 shadow-map backdrop-blur-xl">
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left"
        >
          <span className="flex items-center gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl font-black"
              style={{ background: `${route.color}15`, color: route.color }}
            >
              {route.code}
            </span>
            <span>
              <b className="block text-sm">{route.name}</b>
              <span className="text-xs text-slate-500">
                Via {route.via} · {route.stops} halte
              </span>
            </span>
          </span>
          <ChevronDown
            className={`size-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {open && (
          <div className="mt-2 space-y-1 border-t pt-2">
            {routeList.map((r, i) => (
              <button
                key={r.code}
                onClick={() => {
                  selectedRouteCodeRef.current = r.code;
                  localStorage.setItem('traslink:selected-route', r.code);
                  const url = new URL(window.location.href);
                  url.searchParams.set('route', r.code);
                  window.history.replaceState(null, '', url);
                  setRouteIndex(i);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate-50 ${i === routeIndex ? 'bg-slate-50' : ''}`}
              >
                <span
                  className="grid size-8 place-items-center rounded-lg text-xs font-black text-white"
                  style={{ background: r.color }}
                >
                  {r.code}
                </span>
                <span className="flex-1 text-xs font-semibold">{r.name}</span>
                {i === routeIndex && (
                  <Check className="size-4 text-emerald-600" />
                )}
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setDirection('A')}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${direction === 'A' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
          >
            Ke {route.destination}
          </button>
          <ArrowLeftRight className="size-3.5 text-slate-400" />
          <button
            onClick={() => setDirection('B')}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${direction === 'B' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
          >
            Ke {route.origin}
          </button>
        </div>
      </section>
      <section className="absolute inset-x-3 bottom-3 z-30 mx-auto max-w-3xl rounded-[26px] border border-white/80 bg-white/96 p-4 shadow-sheet backdrop-blur-xl md:bottom-6 md:p-5">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 md:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ink text-white">
              <BusFront className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold">Angkot {route.code}</h2>
                <Badge className="bg-emerald-50 text-emerald-700">
                  {route.activeVehicles ?? 0} aktif
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {route.name.replace(' — ', ' · ')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Terdekat</p>
            <p className="text-lg font-black text-coral">
              {vehicleLocations.length > 0
                ? `${vehicleLocations.length} terlacak`
                : 'GPS offline'}
            </p>
          </div>
        </div>
        {assignedActiveVehicles.length > 0 && vehicleLocations.length === 0 && (
          <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-[11px] font-semibold text-amber-700">
            Angkot beroperasi, tetapi belum mengirim posisi GPS terbaru di
            sekitar trayek ini.
          </p>
        )}
        <div className="my-4 grid grid-cols-3 divide-x divide-slate-100 rounded-xl bg-slate-50 py-3 text-center">
          <Info
            icon={<Clock3 />}
            text={`${route.operatingStart ?? '—'}–${route.operatingEnd ?? '—'}`}
          />
          <Info icon={<Users />} text={`${route.fleet} angkot`} />
          <Info icon={<ShieldCheck />} text="Terverifikasi" />
        </div>
        <Button
          disabled={!hasUsablePath || requestingPickup}
          onClick={togglePickup}
          className={`h-12 w-full rounded-xl text-sm font-bold ${pickup ? 'bg-rose-50 text-[#e54836] hover:bg-rose-100' : 'bg-coral text-white hover:bg-[#ec4b39]'}`}
        >
          <MapPin />{' '}
          {requestingPickup
            ? 'Memproses...'
            : pickup
              ? 'Batal Jemput di Sini'
              : 'Jemput di Sini'}
        </Button>
        <p
          className={`mt-2 text-center text-[11px] ${nearRoute ? 'text-slate-400' : 'font-semibold text-amber-600'}`}
        >
          {message ||
            (!hasUsablePath
              ? 'Rute untuk arah ini belum digambar oleh admin.'
              : nearRoute
                ? 'Lokasi akan diverifikasi terhadap jalur · Maksimal 150 m'
                : 'Kamu terlalu jauh dari jalur · Dekati jalur untuk meminta jemput')}
        </p>
      </section>
    </main>
  );
}

function Info({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div>
      <span className="mx-auto mb-1 block w-fit text-slate-400 [&_svg]:size-4">
        {icon}
      </span>
      <b className="text-xs">{text}</b>
    </div>
  );
}

type DriverPickup = {
  id: string;
  status: 'WAITING' | 'ACCEPTED';
  passengerName: string;
  passengerPhone: string | null;
  distanceToRouteMeters: number;
  createdAt: string;
  waitMinutes: number;
  latitude: number;
  longitude: number;
};
type DriverDashboardData = {
  vehicle: {
    id: string;
    plateNumber: string;
    capacity: number;
    status: VehicleStatus;
  } | null;
  route: AppRoute | null;
  position: {
    latitude: number;
    longitude: number;
    recordedAt: string;
    locationFresh: boolean;
  } | null;
  pickups: DriverPickup[];
};

function DriverView({
  setView,
  allowedViews,
}: {
  setView: (v: View) => void;
  allowedViews: View[];
}) {
  const [dashboard, setDashboard] = useState<DriverDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [trackingState, setTrackingState] = useState<
    'idle' | 'requesting' | 'tracking' | 'denied' | 'error'
  >('idle');
  const lastLocationSentAtRef = useRef(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/driver/dashboard', { cache: 'no-store' })
        .then(async (response) => {
          const data = await response.json().catch(() => null);
          if (!response.ok)
            throw new Error(data?.error ?? 'Gagal memuat halaman sopir.');
          return data;
        })
        .then((data) => {
          if (!alive) return;
          setDashboard({
            ...data,
            route: data.route ? normalizeDatabaseRoutes([data.route])[0] : null,
            pickups: (data.pickups ?? []).map((pickup: DriverPickup) => ({
              ...pickup,
              waitMinutes: Math.max(
                1,
                Math.round(
                  (Date.now() - new Date(pickup.createdAt).getTime()) / 60000,
                ),
              ),
            })),
          });
          setError('');
        })
        .catch((loadError) => {
          if (alive)
            setError(
              loadError instanceof Error
                ? loadError.message
                : 'Gagal memuat halaman sopir.',
            );
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    const refreshWhenVisible = () => {
      if (!document.hidden) void load();
    };
    const refreshFromStorage = (event: StorageEvent) => {
      if (event.key === ROUTES_UPDATED_EVENT) void load();
    };
    void load();
    const timer = window.setInterval(load, 5_000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener(ROUTES_UPDATED_EVENT, refreshWhenVisible);
    window.addEventListener('storage', refreshFromStorage);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener(ROUTES_UPDATED_EVENT, refreshWhenVisible);
      window.removeEventListener('storage', refreshFromStorage);
    };
  }, [refreshToken]);

  const vehicle = dashboard?.vehicle ?? null;
  const route = dashboard?.route ?? null;
  const signals = dashboard?.pickups ?? [];
  const online = vehicle?.status === 'ACTIVE';
  const vehicleId = vehicle?.id;

  useEffect(() => {
    if (!online || !vehicleId || !navigator.geolocation) return;
    let active = true;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!active) return;
        const now = Date.now();
        if (now - lastLocationSentAtRef.current < 5_000) return;
        lastLocationSentAtRef.current = now;
        void fetch('/api/driver/location', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: position.coords.heading,
            speedKph:
              position.coords.speed == null
                ? null
                : position.coords.speed * 3.6,
            accuracyMeters: position.coords.accuracy,
          }),
        })
          .then(async (response) => {
            const data = await response.json().catch(() => null);
            if (!response.ok)
              throw new Error(data?.error ?? 'Posisi gagal dikirim.');
            if (!active) return;
            setTrackingState('tracking');
            setDashboard((current) =>
              current
                ? {
                    ...current,
                    position: {
                      latitude: data.position.latitude,
                      longitude: data.position.longitude,
                      recordedAt: data.position.recordedAt,
                      locationFresh: true,
                    },
                  }
                : current,
            );
          })
          .catch(() => {
            if (active) setTrackingState('error');
          });
      },
      (locationError) => {
        if (!active) return;
        setTrackingState(locationError.code === 1 ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
    return () => {
      active = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [online, vehicleId]);

  async function updateStatus() {
    if (!dashboard?.vehicle) return;
    const nextStatus =
      dashboard.vehicle.status === 'ACTIVE' ? 'RESTING' : 'ACTIVE';
    const response = await fetch('/api/driver/dashboard', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setNotice(data?.error ?? 'Gagal memperbarui status operasional.');
      return;
    }
    setNotice(
      nextStatus === 'ACTIVE'
        ? 'Angkot mulai beroperasi.'
        : 'Angkot berstatus istirahat.',
    );
    setTrackingState('idle');
    setRefreshToken((value) => value + 1);
  }

  async function updatePickup(id: string, action: 'accept' | 'complete') {
    const response = await fetch(`/api/pickups/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setNotice(data?.error ?? 'Permintaan jemput gagal diperbarui.');
      setRefreshToken((value) => value + 1);
      return;
    }
    setNotice(
      action === 'accept'
        ? 'Permintaan jemput diterima.'
        : 'Penumpang telah dijemput.',
    );
    setRefreshToken((value) => value + 1);
  }

  const vehicleMarkers =
    vehicle && dashboard?.position?.locationFresh
      ? [
          {
            id: vehicle.id,
            label: vehicle.plateNumber,
            latitude: dashboard.position.latitude,
            longitude: dashboard.position.longitude,
          },
        ]
      : [];
  const pickupMarkers = signals.map((signal) => ({
    id: signal.id,
    label: `${signal.passengerName} · ${Math.round(signal.distanceToRouteMeters)} m`,
    latitude: signal.latitude,
    longitude: signal.longitude,
  }));

  return (
    <main className="relative h-dvh min-h-[700px] overflow-hidden">
      <MapCanvas
        routeData={route ?? undefined}
        vehicles={vehicleMarkers}
        pickups={pickupMarkers}
      />
      <TopNav view="driver" setView={setView} allowedViews={allowedViews} />
      <div className="absolute left-4 top-24 z-30 rounded-2xl bg-ink p-3 text-white shadow-map md:left-7">
        <div className="flex items-center gap-3">
          <span
            className={`size-2.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}
          />
          <div>
            <p className="text-[10px] text-white/55">
              {vehicle
                ? `${vehicle.plateNumber} · ${route ? `Trayek ${route.code}` : 'Belum ada trayek'}`
                : 'Belum ada angkot yang ditugaskan'}
            </p>
            <b className="text-sm">
              {loading
                ? 'Memuat data...'
                : online
                  ? 'Sedang beroperasi'
                  : vehicle
                    ? 'Sedang istirahat'
                    : 'Hubungi administrator'}
            </b>
            {online && (
              <p
                className={`mt-0.5 text-[10px] ${trackingState === 'tracking' ? 'text-emerald-300' : trackingState === 'denied' || trackingState === 'error' ? 'text-amber-300' : 'text-white/55'}`}
              >
                {trackingState === 'tracking'
                  ? 'Lokasi GPS sedang dibagikan'
                  : trackingState === 'denied'
                    ? 'Izin lokasi ditolak'
                    : trackingState === 'error'
                      ? 'Lokasi GPS tidak tersedia'
                      : 'Menunggu izin lokasi...'}
              </p>
            )}
          </div>
          <button
            onClick={updateStatus}
            disabled={!vehicle || loading}
            className={`ml-3 rounded-lg px-3 py-1.5 text-xs font-bold ${online ? 'bg-white/12' : 'bg-emerald-500'}`}
          >
            {online ? 'Selesai' : 'Mulai'}
          </button>
        </div>
      </div>
      <section className="absolute inset-x-3 bottom-3 z-30 mx-auto max-w-2xl rounded-[26px] border border-white/80 bg-white/96 p-4 shadow-sheet backdrop-blur-xl md:inset-x-auto md:bottom-6 md:left-7 md:w-[390px]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-coral">
              Permintaan jemput
            </p>
            <h2 className="text-lg font-extrabold">
              {signals.length} permintaan aktif
            </h2>
          </div>
          <Badge className="bg-coral text-white">
            <Radio className="size-3" /> Live
          </Badge>
        </div>
        {(notice || error) && (
          <p
            className={`mb-3 rounded-lg p-2 text-xs font-semibold ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
          >
            {error || notice}
          </p>
        )}
        <div className="space-y-2">
          {!loading && signals.length === 0 && (
            <div className="rounded-2xl border border-dashed bg-slate-50 p-5 text-center">
              <MapPin className="mx-auto mb-2 size-5 text-slate-400" />
              <p className="text-xs font-semibold text-slate-600">
                {route
                  ? 'Belum ada permintaan jemput pada trayek ini.'
                  : 'Trayek belum ditugaskan pada angkot Anda.'}
              </p>
            </div>
          )}
          {signals.map((s) => (
            <div key={s.id} className="rounded-2xl border bg-white p-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-[#fff0ed] font-black text-coral">
                  {s.passengerName[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <b className="text-sm">{s.passengerName}</b>
                  <p className="text-xs text-slate-500">
                    {Math.round(s.distanceToRouteMeters)} m dari trayek ·{' '}
                    {s.waitMinutes} menit
                  </p>
                </div>
                {s.status === 'ACCEPTED' ? (
                  <Badge className="bg-emerald-50 text-emerald-700">
                    <Check />
                    Diterima
                  </Badge>
                ) : (
                  <Button
                    onClick={() => updatePickup(s.id, 'accept')}
                    size="sm"
                    className="bg-ink"
                  >
                    Jemput
                  </Button>
                )}
              </div>
              {s.status === 'ACCEPTED' && (
                <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3">
                  <Button
                    disabled={!s.passengerPhone}
                    onClick={() => {
                      if (!s.passengerPhone) return;
                      setNotice(`Menghubungi ${s.passengerName}.`);
                      location.href = `tel:${s.passengerPhone}`;
                    }}
                    variant="outline"
                    className="px-2"
                  >
                    <Phone /> Hubungi
                  </Button>
                  <Button
                    onClick={() => {
                      setNotice(`Membuka navigasi menuju ${s.passengerName}`);
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`,
                        '_blank',
                        'noopener,noreferrer',
                      );
                    }}
                    className="px-2 bg-coral"
                  >
                    <Navigation /> Navigasi
                  </Button>
                  <Button
                    onClick={() => updatePickup(s.id, 'complete')}
                    className="px-2 bg-emerald-600"
                  >
                    <Check /> Selesai
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <Gauge className="size-3" /> Diperbarui otomatis setiap 5 detik
        </p>
      </section>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  change,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-ink [&_svg]:size-4">
          {icon}
        </span>
        <Badge className="bg-emerald-50 text-emerald-700">{change}</Badge>
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function AdminView({
  setView,
  user,
}: {
  setView: (v: View) => void;
  user: CurrentUser;
}) {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleRecord | null>(
    null,
  );
  const [routeFilter, setRouteFilter] = useState('Semua');
  const [toast, setToast] = useState('');
  const [dbRoutes, setDbRoutes] = useState<AppRoute[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [gpsDevices, setGpsDevices] = useState<GpsRecord[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const filtered = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          (routeFilter === 'Semua' || v.routeCode === routeFilter) &&
          `${v.plateNumber} ${v.driverName ?? ''}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [vehicles, query, routeFilter],
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  }

  async function loadVehicleResources() {
    setVehiclesLoading(true);
    try {
      const [routesResponse, vehiclesResponse, driversResponse, gpsResponse] =
        await Promise.all([
          fetch('/api/routes', { cache: 'no-store' }),
          fetch('/api/vehicles', { cache: 'no-store' }),
          fetch('/api/users?role=DRIVER', { cache: 'no-store' }),
          fetch('/api/gps/devices', { cache: 'no-store' }),
        ]);
      const [routesData, vehiclesData, driversData, gpsData] =
        await Promise.all([
          routesResponse.json(),
          vehiclesResponse.json(),
          driversResponse.json(),
          gpsResponse.json(),
        ]);
      if (
        !routesResponse.ok ||
        !vehiclesResponse.ok ||
        !driversResponse.ok ||
        !gpsResponse.ok
      ) {
        throw new Error('Sebagian data dashboard gagal dimuat.');
      }
      setDbRoutes(normalizeDatabaseRoutes(routesData.routes));
      setVehicles(vehiclesData.vehicles ?? []);
      setDrivers(driversData.users ?? []);
      setGpsDevices(gpsData.devices ?? []);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Gagal memuat data dashboard.',
      );
    } finally {
      setVehiclesLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/routes', { cache: 'no-store' }).then((response) =>
        response.json(),
      ),
      fetch('/api/vehicles', { cache: 'no-store' }).then((response) =>
        response.json(),
      ),
      fetch('/api/users?role=DRIVER', { cache: 'no-store' }).then((response) =>
        response.json(),
      ),
      fetch('/api/gps/devices', { cache: 'no-store' }).then((response) =>
        response.json(),
      ),
    ])
      .then(([routesData, vehiclesData, driversData, gpsData]) => {
        setDbRoutes(normalizeDatabaseRoutes(routesData.routes));
        setVehicles(vehiclesData.vehicles ?? []);
        setDrivers(driversData.users ?? []);
        setGpsDevices(gpsData.devices ?? []);
      })
      .catch(() => setToast('Gagal memuat data dashboard.'))
      .finally(() => setVehiclesLoading(false));
  }, []);

  async function saveVehicle(form: FormData) {
    const payload = {
      plateNumber: String(form.get('plateNumber') || '')
        .trim()
        .toUpperCase(),
      capacity: Number(form.get('capacity') || 12),
      routeId: String(form.get('routeId') || '') || null,
      driverId: String(form.get('driverId') || '') || null,
      gpsDeviceId: String(form.get('gpsDeviceId') || '') || null,
      status: String(form.get('status') || 'INACTIVE') as VehicleStatus,
    };
    const res = await fetch(
      editingVehicle ? `/api/vehicles/${editingVehicle.id}` : '/api/vehicles',
      {
        method: editingVehicle ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      showToast(
        typeof data?.error === 'string'
          ? data.error
          : 'Gagal menyimpan angkot.',
      );
      return;
    }
    setShowForm(false);
    setEditingVehicle(null);
    await loadVehicleResources();
    showToast(
      editingVehicle
        ? 'Data angkot berhasil diperbarui.'
        : 'Angkot berhasil ditambahkan.',
    );
  }

  async function deleteVehicle(vehicle: VehicleRecord) {
    if (
      !window.confirm(
        `Hapus angkot ${vehicle.plateNumber}? Tindakan ini tidak dapat dibatalkan.`,
      )
    )
      return;
    const response = await fetch(`/api/vehicles/${vehicle.id}`, {
      method: 'DELETE',
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      showToast(
        typeof data?.error === 'string'
          ? data.error
          : 'Gagal menghapus angkot.',
      );
      return;
    }
    setVehicles((current) => current.filter((item) => item.id !== vehicle.id));
    showToast(`${vehicle.plateNumber} berhasil dihapus.`);
  }
  return (
    <main className="min-h-dvh bg-[#f4f7f5] text-ink">
      {mobileNav && (
        <button
          aria-label="Tutup menu"
          onClick={() => setMobileNav(false)}
          className="fixed inset-0 z-30 bg-slate-950/25 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-white p-4 ${mobileNav ? '' : 'max-lg:hidden'}`}
      >
        <Logo />
        <div className="mt-9 space-y-1">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Workspace
          </p>
          {(
            [
              ['overview', 'Ringkasan', <LayoutDashboard key="i" />],
              ['routes', 'Trayek & Rute', <Route key="i" />],
              ['vehicles', 'Data Angkot', <BusFront key="i" />],
              ['gps', 'Perangkat GPS', <Radio key="i" />],
            ] as [AdminTab, string, React.ReactNode][]
          ).map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                setMobileNav(false);
                if (key === 'vehicles') void loadVehicleResources();
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold [&_svg]:size-4 ${tab === key ? 'bg-ink text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
        <div className="mt-auto rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-bold">{user.name}</p>
          <p className="text-[10px] text-slate-400">{user.email}</p>
          <Button
            onClick={() =>
              fetch('/api/auth/logout', { method: 'POST' }).then(() =>
                location.reload(),
              )
            }
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start"
          >
            <LogOut /> Keluar akun
          </Button>
        </div>
      </aside>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/90 px-4 backdrop-blur-xl lg:ml-64 lg:px-8">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setMobileNav(true)}
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Buka menu"
          >
            <Menu />
          </Button>
          <div>
            <h1 className="text-base font-extrabold">
              {tab === 'overview'
                ? 'Ringkasan Operasional'
                : tab === 'routes'
                  ? 'Manajemen Trayek'
                  : tab === 'vehicles'
                    ? 'Data Angkutan Kota'
                    : 'Perangkat GPS'}
            </h1>
            <p className="hidden text-[11px] text-slate-400 sm:block">
              {new Intl.DateTimeFormat('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date())}{' '}
              · Kota Bandung
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setView('passenger')}
            variant="outline"
            size="sm"
          >
            <MapIcon /> Lihat peta
          </Button>
          <span className="grid size-9 place-items-center rounded-full bg-ink text-xs font-bold text-white">
            {user.name
              .split(' ')
              .slice(0, 2)
              .map((part) => part[0])
              .join('')
              .toUpperCase()}
          </span>
        </div>
      </header>
      <div className="lg:ml-64">
        <div className="flex gap-1 overflow-auto border-b bg-white px-4 py-2 lg:hidden">
          {(['overview', 'routes', 'vehicles', 'gps'] as AdminTab[]).map(
            (t) => (
              <Button
                key={t}
                onClick={() => {
                  setTab(t);
                  if (t === 'vehicles') void loadVehicleResources();
                }}
                variant={tab === t ? 'default' : 'ghost'}
                size="sm"
              >
                {t}
              </Button>
            ),
          )}
        </div>
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          {tab === 'overview' && <Overview setTab={setTab} />}{' '}
          {tab === 'routes' && <RoutesPanel />}{' '}
          {tab === 'vehicles' && (
            <VehiclesPanel
              vehicles={filtered}
              query={query}
              setQuery={setQuery}
              routeFilter={routeFilter}
              setRouteFilter={setRouteFilter}
              routes={dbRoutes}
              loading={vehiclesLoading}
              onAdd={() => {
                setEditingVehicle(null);
                setShowForm(true);
              }}
              onEdit={(vehicle) => {
                setEditingVehicle(vehicle);
                setShowForm(true);
              }}
              onDelete={deleteVehicle}
            />
          )}{' '}
          {tab === 'gps' && <GpsPanel />}
        </div>
      </div>
      {showForm && (
        <Modal
          title={editingVehicle ? 'Ubah angkutan kota' : 'Tambah angkutan kota'}
          close={() => {
            setShowForm(false);
            setEditingVehicle(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveVehicle(new FormData(e.currentTarget));
            }}
            className="grid gap-4"
          >
            <Field label="Nomor polisi">
              <Input
                name="plateNumber"
                defaultValue={editingVehicle?.plateNumber ?? ''}
                placeholder="D 1234 AB"
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kapasitas">
                <Input
                  name="capacity"
                  type="number"
                  min="1"
                  max="50"
                  defaultValue={editingVehicle?.capacity ?? 12}
                  required
                />
              </Field>
              <Field label="Status">
                <select
                  name="status"
                  defaultValue={editingVehicle?.status ?? 'INACTIVE'}
                  className="h-8 rounded-lg border bg-white px-2 text-sm"
                >
                  <option value="ACTIVE">Aktif</option>
                  <option value="RESTING">Istirahat</option>
                  <option value="MAINTENANCE">Perawatan</option>
                  <option value="INACTIVE">Nonaktif</option>
                </select>
              </Field>
            </div>
            <Field label="Trayek">
              <select
                name="routeId"
                defaultValue={editingVehicle?.routeId ?? ''}
                className="h-8 rounded-lg border bg-white px-2 text-sm"
              >
                <option value="">Belum ditentukan</option>
                {dbRoutes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.code} · {route.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Supir">
                <select
                  name="driverId"
                  defaultValue={editingVehicle?.driverId ?? ''}
                  className="h-8 rounded-lg border bg-white px-2 text-sm"
                >
                  <option value="">Belum ditugaskan</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Perangkat GPS">
                <select
                  name="gpsDeviceId"
                  defaultValue={editingVehicle?.gpsDeviceId ?? ''}
                  className="h-8 rounded-lg border bg-white px-2 text-sm"
                >
                  <option value="">Belum terpasang</option>
                  {gpsDevices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.deviceCode}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Button type="submit" className="h-11 bg-coral">
              {editingVehicle ? 'Simpan perubahan' : 'Simpan angkot'}
            </Button>
          </form>
        </Modal>
      )}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-xl">
          <Check className="size-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </main>
  );
}

function Overview({ setTab }: { setTab: (t: AdminTab) => void }) {
  const [data, setData] = useState<{
    stats: {
      activeRoutes: number;
      totalVehicles: number;
      activeVehicles: number;
      pickupsToday: number;
      totalGps: number;
      onlineGps: number;
      gpsPercent: number;
    };
    routeActivity: Array<{
      id: string;
      code: string;
      name: string;
      via: string;
      color: string;
      fleet: number;
      activeVehicles: number;
    }>;
    pickupTrend: Array<{ hour: string; count: number }>;
  } | null>(null);
  const [error, setError] = useState('');

  async function loadOverview() {
    setError('');
    const response = await fetch('/api/admin/overview', { cache: 'no-store' });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      setError(
        typeof result?.error === 'string'
          ? result.error
          : 'Gagal memuat ringkasan.',
      );
      return;
    }
    setData(result);
  }

  useEffect(() => {
    fetch('/api/admin/overview', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        return result;
      })
      .then(setData)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : 'Gagal memuat ringkasan.',
        ),
      );
  }, []);

  const stats = data?.stats;
  const maxPickup = Math.max(
    1,
    ...(data?.pickupTrend.map((point) => point.count) ?? [1]),
  );
  return (
    <>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm text-slate-500">Selamat datang kembali,</p>
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">
            Transportasi kota dalam satu pantauan.
          </h2>
        </div>
        <div className="hidden gap-2 md:flex">
          <Button onClick={() => void loadOverview()} variant="outline">
            <Activity /> Segarkan
          </Button>
          <Button onClick={() => setTab('routes')} className="bg-coral">
            <Plus /> Kelola trayek
          </Button>
        </div>
      </div>
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Route />}
          label="Trayek aktif"
          value={data ? String(stats?.activeRoutes ?? 0) : '—'}
          change="Data database"
        />
        <StatCard
          icon={<BusFront />}
          label="Angkot beroperasi"
          value={data ? String(stats?.activeVehicles ?? 0) : '—'}
          change={`${stats?.totalVehicles ?? 0} total armada`}
        />
        <StatCard
          icon={<Users />}
          label="Jemput hari ini"
          value={data ? String(stats?.pickupsToday ?? 0) : '—'}
          change="Hari ini"
        />
        <StatCard
          icon={<Activity />}
          label="GPS terhubung"
          value={data ? `${stats?.gpsPercent ?? 0}%` : '—'}
          change={`${stats?.onlineGps ?? 0}/${stats?.totalGps ?? 0} online`}
        />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h3 className="font-extrabold">Aktivitas trayek</h3>
              <p className="text-xs text-slate-400">
                Pergerakan armada saat ini
              </p>
            </div>
            <Button onClick={() => setTab('routes')} variant="ghost" size="sm">
              Kelola semua
            </Button>
          </div>
          <div className="divide-y">
            {(data?.routeActivity ?? []).map((r) => (
              <div key={r.code} className="flex items-center gap-3 p-4">
                <span
                  className="grid size-10 place-items-center rounded-xl font-black text-white"
                  style={{ background: r.color }}
                >
                  {r.code}
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{r.name}</b>
                  <p className="text-xs text-slate-400">via {r.via}</p>
                </div>
                <div className="text-right">
                  <b className="text-sm">{r.activeVehicles} aktif</b>
                  <p className="text-[10px] text-slate-400">
                    dari {r.fleet} armada
                  </p>
                </div>
              </div>
            ))}
            {data && data.routeActivity.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-400">
                Belum ada trayek aktif di database.
              </p>
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-ink p-5 text-white">
          <p className="text-xs text-white/50">Permintaan jemput</p>
          <p className="mt-1 text-3xl font-black">
            {stats?.pickupsToday ?? '—'}
          </p>
          <div className="mt-6 flex h-32 items-end gap-2">
            {(data?.pickupTrend ?? []).map((point) => (
              <span
                key={point.hour}
                title={`${point.hour}: ${point.count} permintaan`}
                className="flex-1 rounded-t bg-coral/90"
                style={{
                  height: `${Math.max(4, (point.count / maxPickup) * 100)}%`,
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-white/35">
            <span>{data?.pickupTrend[0]?.hour ?? '06.00'}</span>
            <span>{data?.pickupTrend[6]?.hour ?? '12.00'}</span>
            <span>{data?.pickupTrend.at(-1)?.hour ?? '18.00'}</span>
          </div>
        </div>
      </div>
    </>
  );
}

function RouteLocationSearch({
  onFocus,
  onAdd,
}: {
  onFocus: (result: LocationSearchResult) => void;
  onAdd: (result: LocationSearchResult) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  async function searchLocation(event: React.FormEvent) {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery.length < 3) {
      setError('Masukkan minimal 3 karakter.');
      return;
    }
    setSearching(true);
    setError('');
    try {
      const response = await fetch(
        `/api/geocoding/search?q=${encodeURIComponent(cleanQuery)}`,
        { cache: 'no-store' },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : 'Gagal mencari lokasi.',
        );
      setResults(Array.isArray(data?.results) ? data.results : []);
      if (!data?.results?.length)
        setError(
          'Lokasi tidak ditemukan. Coba nama jalan atau area yang lebih lengkap.',
        );
    } catch (reason) {
      setResults([]);
      setError(
        reason instanceof Error ? reason.message : 'Gagal mencari lokasi.',
      );
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="absolute left-3 top-3 z-30 w-[min(360px,calc(100%-1.5rem))]">
      <form
        onSubmit={searchLocation}
        className="flex gap-2 rounded-xl border bg-white/95 p-2 shadow-map backdrop-blur"
      >
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari jalan, terminal, atau tempat..."
            className="h-9 bg-white pl-8"
            aria-label="Cari lokasi di peta"
          />
        </div>
        <Button type="submit" disabled={searching} className="h-9 bg-ink px-3">
          {searching ? 'Mencari...' : 'Cari'}
        </Button>
      </form>
      {(results.length > 0 || error) && (
        <div className="mt-2 overflow-hidden rounded-xl border bg-white shadow-map">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Hasil pencarian
            </span>
            <button
              type="button"
              onClick={() => {
                setResults([]);
                setError('');
              }}
              className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup hasil pencarian"
              title="Tutup hasil pencarian"
            >
              <X className="size-4" />
            </button>
          </div>
          {error && (
            <p className="p-3 text-[11px] font-semibold text-amber-700">
              {error}
            </p>
          )}
          {results.map((result) => (
            <div
              key={result.id}
              className="flex items-center gap-1 border-t first:border-t-0"
            >
              <button
                type="button"
                onClick={() => onFocus(result)}
                className="min-w-0 flex-1 px-3 py-2.5 text-left hover:bg-slate-50"
              >
                <b className="line-clamp-1 block text-xs">{result.name}</b>
                <span className="text-[10px] capitalize text-slate-400">
                  {result.type} · {result.lat.toFixed(5)},{' '}
                  {result.lng.toFixed(5)}
                </span>
              </button>
              <Button
                type="button"
                onClick={() => onAdd(result)}
                variant="ghost"
                size="sm"
                className="mr-2 text-coral"
                title="Tambahkan sebagai titik rute berikutnya"
              >
                <Plus /> Titik
              </Button>
            </div>
          ))}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="block border-t px-3 py-1.5 text-[9px] text-slate-400 hover:text-slate-600"
          >
            Pencarian © OpenStreetMap contributors
          </a>
        </div>
      )}
    </div>
  );
}

function RoutesPanel() {
  const [items, setItems] = useState<AppRoute[]>([]);
  const [selected, setSelected] = useState(0);
  const [routeQuery, setRouteQuery] = useState('');
  const [routePage, setRoutePage] = useState(1);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(false);
  const [direction, setDirection] = useState<'A' | 'B'>('A');
  const [focusPoint, setFocusPoint] = useState<MapFocusPoint | null>(null);
  const [savedPaths, setSavedPaths] = useState<
    Record<string, { pathA: RoutePoint[]; pathB: RoutePoint[] }>
  >({});
  const filteredRoutes = useMemo(() => {
    const query = routeQuery.trim().toLocaleLowerCase('id-ID');
    return items
      .map((route, index) => ({ route, index }))
      .filter(({ route }) =>
        query
          ? [
              route.code,
              route.name,
              route.origin,
              route.destination,
              route.via,
            ].some((value) => value.toLocaleLowerCase('id-ID').includes(query))
          : true,
      );
  }, [items, routeQuery]);
  const totalRoutePages = Math.max(
    1,
    Math.ceil(filteredRoutes.length / ROUTES_PER_PAGE),
  );
  const currentRoutePage = Math.min(routePage, totalRoutePages);
  const visibleRoutes = filteredRoutes.slice(
    (currentRoutePage - 1) * ROUTES_PER_PAGE,
    currentRoutePage * ROUTES_PER_PAGE,
  );
  const current = items[selected] ?? items[0] ?? null;
  const routeKey = current?.id ?? current?.code ?? '';
  const currentPath = current
    ? direction === 'A'
      ? current.pathA
      : current.pathB
    : [];
  const reverseDirection = direction === 'A' ? 'B' : 'A';
  const savedRoutePaths = savedPaths[routeKey];
  const hasUnsavedChanges = Boolean(
    current &&
    savedRoutePaths &&
    (JSON.stringify(current.pathA) !== JSON.stringify(savedRoutePaths.pathA) ||
      JSON.stringify(current.pathB) !== JSON.stringify(savedRoutePaths.pathB)),
  );

  function rememberSavedPaths(routeList: AppRoute[]) {
    setSavedPaths(
      Object.fromEntries(
        routeList.map((route) => [
          route.id ?? route.code,
          { pathA: route.pathA, pathB: route.pathB },
        ]),
      ),
    );
  }

  async function loadRoutes() {
    setLoading(true);
    setLoadError('');
    try {
      const databaseRoutes = await fetchDatabaseRoutes();
      setItems(databaseRoutes);
      rememberSavedPaths(databaseRoutes);
      setSelected((index) =>
        Math.min(index, Math.max(databaseRoutes.length - 1, 0)),
      );
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Gagal memuat trayek dari database.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetchDatabaseRoutes()
      .then((databaseRoutes) => {
        if (cancelled) return;
        setItems(databaseRoutes);
        rememberSavedPaths(databaseRoutes);
        setSelected((index) =>
          Math.min(index, Math.max(databaseRoutes.length - 1, 0)),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Gagal memuat trayek dari database.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updatePath(path: RoutePoint[]) {
    setItems((currentItems) =>
      currentItems.map((route, index) =>
        index === selected
          ? direction === 'A'
            ? { ...route, pathA: path }
            : { ...route, pathB: path }
          : route,
      ),
    );
  }

  async function persistRoute(route: AppRoute & { id: string }) {
    const response = await fetch(`/api/routes/${route.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pathA: route.pathA,
        pathB: route.pathB,
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        typeof data?.error === 'string'
          ? data.error
          : 'Gagal menyimpan perubahan rute.',
      );
    }
    return data?.route as AppRoute | undefined;
  }

  async function save() {
    if (!current || saving) return;
    if (current.pathA.length < 2 || current.pathB.length < 2) {
      setNotice('Setiap arah harus memiliki minimal 2 titik sebelum disimpan.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      let routeToSave = current;

      // Pulihkan ID dari database apabila editor sempat memegang data lama.
      if (!routeToSave.id) {
        const databaseRoutes = await fetchDatabaseRoutes();
        const matchingRoute = databaseRoutes.find(
          (route) => route.code === routeToSave.code,
        );
        if (!matchingRoute?.id) {
          throw new Error(
            `Trayek ${routeToSave.code} tidak ditemukan di database. Muat ulang daftar trayek lalu coba lagi.`,
          );
        }
        routeToSave = {
          ...matchingRoute,
          pathA: routeToSave.pathA,
          pathB: routeToSave.pathB,
        };
        setItems((currentItems) =>
          currentItems.map((route, index) =>
            index === selected ? routeToSave : route,
          ),
        );
      }

      const savedRoute = await persistRoute(
        routeToSave as AppRoute & { id: string },
      );
      if (savedRoute) {
        setItems((currentItems) =>
          currentItems.map((route, index) =>
            index === selected
              ? {
                  ...route,
                  ...savedRoute,
                  stops: route.stops,
                  fleet: route.fleet,
                }
              : route,
          ),
        );
      }
      setSavedPaths((paths) => ({
        ...paths,
        [routeToSave.id ?? routeToSave.code]: {
          pathA: routeToSave.pathA,
          pathB: routeToSave.pathB,
        },
      }));
      announceRoutesUpdated();
      setNotice('Perubahan rute berhasil disimpan.');
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Gagal menyimpan perubahan rute.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function add(form: FormData) {
    const code = String(form.get('code') || '')
      .trim()
      .toUpperCase();
    const origin = String(form.get('origin') || '').trim();
    const destination = String(form.get('destination') || '').trim();
    const payload = {
      code,
      name:
        String(form.get('name') || '').trim() || `${origin} — ${destination}`,
      origin,
      destination,
      via: String(form.get('via') || '').trim(),
      color: String(form.get('color') || '#16a085'),
      operatingStart: String(form.get('operatingStart') || '05:00'),
      operatingEnd: String(form.get('operatingEnd') || '21:00'),
      pathA: [
        { lng: 107.6191, lat: -6.9175 },
        { lng: 107.6201, lat: -6.9185 },
      ],
      pathB: [
        { lng: 107.6201, lat: -6.9185 },
        { lng: 107.6191, lat: -6.9175 },
      ],
      fare: Number(form.get('fare') || 5000),
    };
    const res = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      const createdRoute = {
        ...data.route,
        stops: 0,
        activeVehicles: 0,
        fleet: 0,
      };
      setItems([...items, createdRoute]);
      setSavedPaths((paths) => ({
        ...paths,
        [createdRoute.id ?? createdRoute.code]: {
          pathA: createdRoute.pathA,
          pathB: createdRoute.pathB,
        },
      }));
      setSelected(items.length);
      setRouteQuery('');
      setRoutePage(Math.ceil((items.length + 1) / ROUTES_PER_PAGE));
      setDirection('A');
      setShowRouteForm(false);
      announceRoutesUpdated();
      setNotice(
        `Trayek ${code} berhasil dibuat. Sekarang gambar rute arah pergi.`,
      );
    } else
      setNotice(
        typeof data.error === 'string'
          ? data.error
          : 'Gagal menambahkan trayek.',
      );
  }

  async function updateRouteDetails(form: FormData) {
    if (!current?.id) return;
    setSaving(true);
    const payload = {
      name: String(form.get('name') || '').trim(),
      origin: String(form.get('origin') || '').trim(),
      destination: String(form.get('destination') || '').trim(),
      via: String(form.get('via') || '').trim(),
      color: String(form.get('color') || current.color),
      operatingStart: String(form.get('operatingStart') || '05:00'),
      operatingEnd: String(form.get('operatingEnd') || '21:00'),
      fare: Number(form.get('fare') || 5000),
    };
    const response = await fetch(`/api/routes/${current.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (response.ok) {
      setItems((currentItems) =>
        currentItems.map((route, index) =>
          index === selected ? { ...route, ...data.route } : route,
        ),
      );
      setEditingRoute(false);
      announceRoutesUpdated();
      setNotice('Data trayek berhasil diperbarui.');
    } else {
      setNotice(
        typeof data?.error === 'string'
          ? data.error
          : 'Gagal memperbarui trayek.',
      );
    }
    setSaving(false);
  }

  async function deleteRoute() {
    if (!current?.id || !window.confirm(`Nonaktifkan trayek ${current.code}?`))
      return;
    const response = await fetch(`/api/routes/${current.id}`, {
      method: 'DELETE',
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setNotice(
        typeof data?.error === 'string'
          ? data.error
          : 'Gagal menghapus trayek.',
      );
      return;
    }
    setItems((currentItems) =>
      currentItems.filter((route) => route.id !== current.id),
    );
    setSelected(0);
    setDirection('A');
    announceRoutesUpdated();
    setNotice(`Trayek ${current.code} berhasil dinonaktifkan.`);
  }
  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">Daftar trayek</h2>
              <p className="text-xs text-slate-400">
                {routeQuery
                  ? `${filteredRoutes.length} dari ${items.length} trayek`
                  : `${items.length} trayek terdaftar`}
              </p>
            </div>
            <Button
              onClick={() => setShowRouteForm(true)}
              disabled={loading || saving}
              className="bg-coral"
            >
              <Plus /> Tambah
            </Button>
          </div>
          <InputGroup className="mb-3 h-10 bg-white">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              value={routeQuery}
              onChange={(event) => {
                setRouteQuery(event.target.value);
                setRoutePage(1);
              }}
              placeholder="Cari kode, nama, asal, tujuan, atau via..."
              aria-label="Cari trayek"
            />
            {routeQuery && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  onClick={() => {
                    setRouteQuery('');
                    setRoutePage(1);
                  }}
                  size="icon-xs"
                  aria-label="Hapus pencarian trayek"
                >
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
          {loadError && (
            <div className="mb-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
              <p>{loadError}</p>
              <Button
                onClick={() => void loadRoutes()}
                variant="outline"
                size="sm"
                className="mt-2 bg-white"
              >
                Coba lagi
              </Button>
            </div>
          )}
          {notice && (
            <p
              className={`mb-3 rounded-xl p-3 text-xs font-semibold ${notice.includes('berhasil') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
            >
              {notice}
            </p>
          )}
          <div className="space-y-2">
            {loading && (
              <p className="rounded-2xl border bg-white/60 p-4 text-sm text-slate-500">
                Memuat trayek dari database...
              </p>
            )}
            {visibleRoutes.map(({ route: r, index: i }) => (
              <button
                key={r.code}
                onClick={() => {
                  setSelected(i);
                  setDirection('A');
                }}
                className={`w-full rounded-2xl border p-4 text-left transition ${selected === i ? 'border-ink bg-white shadow-sm' : 'bg-white/60 hover:bg-white'}`}
              >
                <div className="flex gap-3">
                  <span
                    className="grid size-11 place-items-center rounded-xl font-black text-white"
                    style={{ background: r.color }}
                  >
                    {r.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-sm">{r.name}</b>
                    <p className="text-xs text-slate-400">
                      {r.stops} halte · {r.fleet} angkot
                    </p>
                  </div>
                  <MoreHorizontal className="size-4 text-slate-400" />
                </div>
              </button>
            ))}
            {!loading && filteredRoutes.length === 0 && (
              <div className="rounded-2xl border border-dashed bg-white/60 p-6 text-center">
                <Search className="mx-auto size-5 text-slate-300" />
                <p className="mt-2 text-xs font-semibold text-slate-600">
                  Trayek tidak ditemukan
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Coba gunakan kode, nama tempat, atau nama jalan lain.
                </p>
              </div>
            )}
          </div>
          {!loading && filteredRoutes.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 text-center text-[10px] text-slate-400">
                Halaman {currentRoutePage} dari {totalRoutePages} ·{' '}
                {filteredRoutes.length} trayek
              </p>
              <Pagination>
                <PaginationContent className="flex-wrap">
                  <PaginationItem>
                    <Button
                      onClick={() =>
                        setRoutePage(Math.max(1, currentRoutePage - 1))
                      }
                      disabled={currentRoutePage === 1}
                      variant="ghost"
                      size="sm"
                    >
                      Sebelumnya
                    </Button>
                  </PaginationItem>
                  {Array.from({ length: totalRoutePages }, (_, index) => {
                    const page = index + 1;
                    return (
                      <PaginationItem key={page}>
                        <Button
                          onClick={() => setRoutePage(page)}
                          variant={
                            page === currentRoutePage ? 'outline' : 'ghost'
                          }
                          size="icon-sm"
                          aria-label={`Buka halaman ${page}`}
                          aria-current={
                            page === currentRoutePage ? 'page' : undefined
                          }
                        >
                          {page}
                        </Button>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <Button
                      onClick={() =>
                        setRoutePage(
                          Math.min(totalRoutePages, currentRoutePage + 1),
                        )
                      }
                      disabled={currentRoutePage === totalRoutePages}
                      variant="ghost"
                      size="sm"
                    >
                      Berikutnya
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl border bg-white">
          {!current ? (
            <div className="grid min-h-[500px] place-items-center p-8 text-center text-sm text-slate-500">
              {loading
                ? 'Menyiapkan editor rute...'
                : 'Belum ada trayek di database. Tambahkan trayek untuk mulai menggambar rute.'}
            </div>
          ) : (
            <>
              <div className="border-b p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <Badge className="bg-rose-50 text-coral">
                        Trayek {current.code}
                      </Badge>
                      {hasUnsavedChanges && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                          <span className="size-1.5 rounded-full bg-amber-500" />
                          Belum disimpan
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold">{current.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Gambar jalur sesuai urutan kendaraan melaju.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setEditingRoute(true)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit3 /> Ubah data
                    </Button>
                    <Button
                      onClick={() => void deleteRoute()}
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                    >
                      <Trash2 /> Nonaktifkan
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(['A', 'B'] as const).map((value) => {
                    const from =
                      value === 'A' ? current.origin : current.destination;
                    const to =
                      value === 'A' ? current.destination : current.origin;
                    const pointCount =
                      value === 'A'
                        ? current.pathA.length
                        : current.pathB.length;
                    return (
                      <button
                        key={value}
                        onClick={() => setDirection(value)}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${direction === value ? 'border-ink bg-ink text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                      >
                        <span
                          className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-black ${direction === value ? 'bg-white/15' : 'bg-white'}`}
                        >
                          {value}
                        </span>
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-xs">
                            {from} → {to}
                          </b>
                          <span
                            className={`text-[10px] ${direction === value ? 'text-white/60' : 'text-slate-400'}`}
                          >
                            {pointCount} titik{' '}
                            {pointCount >= 2 ? '· siap' : '· belum lengkap'}
                          </span>
                        </span>
                        {pointCount >= 2 && (
                          <Check className="size-4 text-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid lg:grid-cols-[minmax(0,1fr)_270px]">
                <div className="relative h-[460px] min-h-[380px] overflow-hidden lg:h-[560px]">
                  <MapCanvas
                    routeData={current}
                    direction={direction}
                    editor
                    onPathChange={updatePath}
                    focusPoint={focusPoint}
                  />
                  <RouteLocationSearch
                    onFocus={(result) =>
                      setFocusPoint({
                        lat: result.lat,
                        lng: result.lng,
                        label: result.name,
                        id: Date.now(),
                      })
                    }
                    onAdd={(result) => {
                      setFocusPoint({
                        lat: result.lat,
                        lng: result.lng,
                        label: result.name,
                        id: Date.now(),
                      });
                      updatePath([
                        ...currentPath,
                        { lat: result.lat, lng: result.lng },
                      ]);
                    }}
                  />
                  <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-xl bg-white/95 px-3 py-2 shadow-map backdrop-blur">
                    <MousePointer2 className="size-4 shrink-0 text-coral" />
                    <p className="text-[11px] font-semibold text-slate-600">
                      Klik peta untuk tambah titik · Geser titik untuk merapikan
                    </p>
                  </div>
                </div>
                <aside className="flex min-h-0 flex-col border-t bg-white lg:h-[560px] lg:border-l lg:border-t-0">
                  <div className="border-b p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-coral">
                      Arah {direction}
                    </p>
                    <h4 className="mt-1 text-sm font-extrabold">
                      {direction === 'A' ? current.origin : current.destination}{' '}
                      ke{' '}
                      {direction === 'A' ? current.destination : current.origin}
                    </h4>
                    <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[9px] font-semibold text-slate-400">
                      <span className="rounded-lg bg-emerald-50 px-1 py-2 text-emerald-700">
                        1. Klik
                      </span>
                      <span className="rounded-lg bg-slate-50 px-1 py-2">
                        2. Geser
                      </span>
                      <span className="rounded-lg bg-slate-50 px-1 py-2">
                        3. Simpan
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 border-b p-3">
                    <Button
                      onClick={() => updatePath(currentPath.slice(0, -1))}
                      disabled={!currentPath.length || saving}
                      variant="outline"
                      size="sm"
                    >
                      <Undo2 /> Urungkan
                    </Button>
                    <Button
                      onClick={() => updatePath([])}
                      disabled={!currentPath.length || saving}
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                    >
                      <Trash2 /> Hapus semua
                    </Button>
                    <Button
                      onClick={() =>
                        updatePath(
                          [
                            ...(direction === 'A'
                              ? current.pathB
                              : current.pathA),
                          ].reverse(),
                        )
                      }
                      disabled={
                        (direction === 'A' ? current.pathB : current.pathA)
                          .length < 2 || saving
                      }
                      variant="outline"
                      size="sm"
                      title={`Salin arah ${reverseDirection}, lalu balik urutannya`}
                    >
                      <ArrowLeftRight /> Dari {reverseDirection}
                    </Button>
                    <Button
                      onClick={() => {
                        const saved =
                          savedRoutePaths?.[
                            direction === 'A' ? 'pathA' : 'pathB'
                          ];
                        if (saved) updatePath(saved);
                      }}
                      disabled={!savedRoutePaths || saving}
                      variant="ghost"
                      size="sm"
                    >
                      <RotateCcw /> Reset
                    </Button>
                  </div>
                  <div className="min-h-[150px] flex-1 overflow-y-auto p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <b className="text-xs">Urutan titik</b>
                      <Badge
                        className={
                          currentPath.length >= 2
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }
                      >
                        {currentPath.length} titik
                      </Badge>
                    </div>
                    {currentPath.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-4 text-center">
                        <MapPin className="mx-auto size-5 text-slate-300" />
                        <p className="mt-2 text-[11px] text-slate-500">
                          Klik lokasi awal di peta untuk mulai.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {currentPath.map((point, index) => (
                          <div
                            key={`${point.lng}-${point.lat}-${index}`}
                            className="group flex items-center gap-2 rounded-lg bg-slate-50 p-2"
                          >
                            <span
                              className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${index === 0 || index === currentPath.length - 1 ? 'bg-ink text-white' : 'bg-white text-slate-500'}`}
                            >
                              {index === 0 ? (
                                <Flag className="size-3" />
                              ) : (
                                index + 1
                              )}
                            </span>
                            <span className="min-w-0 flex-1 text-[10px] text-slate-500">
                              <b className="block text-[11px] text-slate-700">
                                {index === 0
                                  ? 'Titik awal'
                                  : index === currentPath.length - 1
                                    ? 'Titik akhir'
                                    : `Titik ${index + 1}`}
                              </b>
                              {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                            </span>
                            <button
                              onClick={() =>
                                updatePath(
                                  currentPath.filter(
                                    (_, pointIndex) => pointIndex !== index,
                                  ),
                                )
                              }
                              className="grid size-6 place-items-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-600"
                              aria-label={`Hapus titik ${index + 1}`}
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="border-t p-3">
                    {(current.pathA.length < 2 || current.pathB.length < 2) && (
                      <p className="mb-2 flex items-start gap-1.5 text-[10px] font-semibold text-amber-700">
                        <AlertCircle className="mt-0.5 size-3 shrink-0" />
                        Lengkapi minimal 2 titik pada arah A dan B.
                      </p>
                    )}
                    <Button
                      onClick={() => void save()}
                      disabled={
                        saving ||
                        !hasUnsavedChanges ||
                        current.pathA.length < 2 ||
                        current.pathB.length < 2
                      }
                      className="h-10 w-full bg-ink"
                    >
                      <Check /> {saving ? 'Menyimpan...' : 'Simpan semua rute'}
                    </Button>
                    <p className="mt-2 text-center text-[9px] text-slate-400">
                      Perubahan baru aktif setelah disimpan.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
      {showRouteForm && (
        <Modal title="Tambah trayek" close={() => setShowRouteForm(false)}>
          <RouteDetailsForm onSubmit={add} submitLabel="Buat trayek" />
        </Modal>
      )}
      {editingRoute && current && (
        <Modal
          title={`Ubah trayek ${current.code}`}
          close={() => setEditingRoute(false)}
        >
          <RouteDetailsForm
            route={current}
            onSubmit={updateRouteDetails}
            submitLabel="Simpan perubahan"
          />
        </Modal>
      )}
    </>
  );
}

function RouteDetailsForm({
  route,
  onSubmit,
  submitLabel,
}: {
  route?: AppRoute;
  onSubmit: (form: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(new FormData(event.currentTarget));
      }}
      className="grid gap-3"
    >
      {!route && (
        <div className="rounded-xl bg-emerald-50 p-3 text-[11px] leading-5 text-emerald-800">
          Isi informasi dasar terlebih dahulu. Setelah trayek dibuat, Anda akan
          langsung diarahkan untuk menggambar jalur pergi dan pulang di peta.
        </div>
      )}
      {!route && (
        <Field label="Kode trayek">
          <Input name="code" placeholder="Contoh: 05" maxLength={8} required />
        </Field>
      )}
      <Field label={route ? 'Nama trayek' : 'Nama trayek (opsional)'}>
        <Input
          name="name"
          defaultValue={route?.name ?? ''}
          placeholder={
            route
              ? 'Cicaheum — Ciroyom'
              : 'Dibuat otomatis dari titik awal dan akhir'
          }
          required={Boolean(route)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Titik awal">
          <Input name="origin" defaultValue={route?.origin ?? ''} required />
        </Field>
        <Field label="Titik akhir">
          <Input
            name="destination"
            defaultValue={route?.destination ?? ''}
            required
          />
        </Field>
      </div>
      <Field label="Via">
        <Input name="via" defaultValue={route?.via ?? ''} required />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Mulai">
          <Input
            name="operatingStart"
            type="time"
            defaultValue={route?.operatingStart ?? '05:00'}
            required
          />
        </Field>
        <Field label="Selesai">
          <Input
            name="operatingEnd"
            type="time"
            defaultValue={route?.operatingEnd ?? '21:00'}
            required
          />
        </Field>
        <Field label="Tarif">
          <Input
            name="fare"
            type="number"
            min="1"
            defaultValue={route?.fare ?? 5000}
            required
          />
        </Field>
      </div>
      <Field label="Warna rute">
        <Input
          name="color"
          type="color"
          defaultValue={route?.color ?? '#16a085'}
          required
        />
      </Field>
      <Button type="submit" className="mt-2 bg-coral">
        {submitLabel}
      </Button>
    </form>
  );
}

function VehiclesPanel({
  vehicles,
  query,
  setQuery,
  routeFilter,
  setRouteFilter,
  routes,
  loading,
  onAdd,
  onEdit,
  onDelete,
}: {
  vehicles: VehicleRecord[];
  query: string;
  setQuery: (s: string) => void;
  routeFilter: string;
  setRouteFilter: (s: string) => void;
  routes: AppRoute[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (vehicle: VehicleRecord) => void;
  onDelete: (vehicle: VehicleRecord) => void;
}) {
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Armada angkot</h2>
          <p className="text-xs text-slate-400">
            Kelola armada pada setiap trayek
          </p>
        </div>
        <Button onClick={onAdd} className="bg-coral">
          <Plus /> Tambah angkot
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex flex-wrap gap-2 border-b p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              placeholder="Cari polisi atau supir..."
            />
          </div>
          <select
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="h-8 rounded-lg border bg-white px-3 text-xs font-semibold"
          >
            <option>Semua</option>
            {routes.map((r) => (
              <option key={r.code}>{r.code}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Angkot</th>
                <th className="p-4">Supir</th>
                <th className="p-4">Trayek</th>
                <th className="p-4">GPS</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold">{v.plateNumber}</td>
                  <td className="p-4">{v.driverName ?? 'Belum ditugaskan'}</td>
                  <td className="p-4">
                    <Badge className="bg-slate-100 text-ink">
                      {v.routeCode ?? '—'}
                    </Badge>
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-500">
                    {v.gpsCode ?? 'Belum terpasang'}
                  </td>
                  <td className="p-4">
                    <Badge
                      className={
                        v.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : v.status === 'MAINTENANCE'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                      }
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {v.status === 'ACTIVE'
                        ? 'Aktif'
                        : v.status === 'RESTING'
                          ? 'Istirahat'
                          : v.status === 'MAINTENANCE'
                            ? 'Perawatan'
                            : 'Nonaktif'}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        onClick={() => onEdit(v)}
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Ubah ${v.plateNumber}`}
                      >
                        <Edit3 />
                      </Button>
                      <Button
                        onClick={() => onDelete(v)}
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-500"
                        aria-label={`Hapus ${v.plateNumber}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="p-10 text-center text-sm text-slate-400">
              Memuat armada dari database...
            </div>
          )}
          {!loading && vehicles.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-400">
              Tidak ada angkot yang cocok.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function GpsPanel() {
  const [devices, setDevices] = useState<GpsRecord[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GpsRecord | null>(null);

  async function loadGps() {
    setLoading(true);
    const response = await fetch('/api/gps/devices', { cache: 'no-store' });
    const data = await response.json().catch(() => null);
    if (response.ok) setDevices(data.devices ?? []);
    else
      setNotice(
        typeof data?.error === 'string'
          ? data.error
          : 'Gagal memuat perangkat GPS.',
      );
    setLoading(false);
  }

  useEffect(() => {
    fetch('/api/gps/devices', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setDevices(data.devices ?? []))
      .catch(() => setNotice('Gagal memuat perangkat GPS.'))
      .finally(() => setLoading(false));
  }, []);

  async function saveGps(form: FormData) {
    const payload = {
      deviceCode: String(form.get('deviceCode') || '').trim(),
      imei: String(form.get('imei') || '').trim(),
      ...(editing ? { active: form.get('active') === 'on' } : {}),
      ...(!editing && form.get('apiKey')
        ? { apiKey: String(form.get('apiKey')) }
        : {}),
    };
    const response = await fetch(
      editing ? `/api/gps/devices/${editing.id}` : '/api/gps/devices',
      {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setNotice(
        typeof data?.error === 'string'
          ? data.error
          : 'Gagal menyimpan perangkat GPS.',
      );
      return;
    }
    setShowForm(false);
    setEditing(null);
    setNotice(
      editing
        ? 'Perangkat GPS berhasil diperbarui.'
        : 'Perangkat GPS berhasil ditambahkan.',
    );
    await loadGps();
  }

  async function deleteGps(device: GpsRecord) {
    if (!window.confirm(`Hapus perangkat ${device.deviceCode}?`)) return;
    const response = await fetch(`/api/gps/devices/${device.id}`, {
      method: 'DELETE',
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setNotice(
        typeof data?.error === 'string'
          ? data.error
          : 'Gagal menghapus perangkat GPS.',
      );
      return;
    }
    setDevices((current) => current.filter((item) => item.id !== device.id));
    setNotice(`${device.deviceCode} berhasil dihapus.`);
  }
  return (
    <>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Perangkat GPS</h2>
          <p className="text-xs text-slate-400">
            Pantau koneksi pelacak armada
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="bg-coral"
        >
          <Plus /> Tambah GPS
        </Button>
      </div>
      {notice && (
        <p className="mb-4 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-700">
          {notice}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {loading && (
          <p className="rounded-2xl border bg-white p-5 text-sm text-slate-400">
            Memuat perangkat dari database...
          </p>
        )}
        {devices.map((d) => (
          <div key={d.id} className="rounded-2xl border bg-white p-4">
            <div className="flex items-start justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-slate-100">
                <Radio className="size-4" />
              </span>
              <Badge
                className={
                  d.online
                    ? 'bg-emerald-50 text-emerald-700'
                    : d.active
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-slate-100 text-slate-500'
                }
              >
                {d.online ? 'Online' : d.active ? 'Siap' : 'Nonaktif'}
              </Badge>
            </div>
            <h3 className="mt-4 font-extrabold">{d.deviceCode}</h3>
            <p className="font-mono text-[10px] text-slate-400">
              IMEI {d.imei}
            </p>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div>
                <p className="text-[10px] text-slate-400">Terpasang pada</p>
                <b className="text-xs">{d.plateNumber ?? 'Belum terpasang'}</b>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">Sinyal terakhir</p>
                <b className="text-xs">
                  {d.lastSeenAt
                    ? new Date(d.lastSeenAt).toLocaleString('id-ID')
                    : 'Belum ada sinyal'}
                </b>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => {
                  setEditing(d);
                  setShowForm(true);
                }}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Edit3 /> Atur
              </Button>
              <Button
                onClick={() => void deleteGps(d)}
                variant="ghost"
                size="icon-sm"
                className="text-red-500"
                aria-label={`Hapus ${d.deviceCode}`}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
        {!loading && devices.length === 0 && (
          <p className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-400 md:col-span-2 xl:col-span-3">
            Belum ada perangkat GPS di database.
          </p>
        )}
      </div>
      {showForm && (
        <Modal
          title={
            editing ? `Atur ${editing.deviceCode}` : 'Tambah perangkat GPS'
          }
          close={() => {
            setShowForm(false);
            setEditing(null);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveGps(new FormData(event.currentTarget));
            }}
            className="grid gap-4"
          >
            <Field label="Kode perangkat">
              <Input
                name="deviceCode"
                defaultValue={editing?.deviceCode ?? ''}
                placeholder="GPS-TL-001"
                required
              />
            </Field>
            <Field label="IMEI">
              <Input
                name="imei"
                defaultValue={editing?.imei ?? ''}
                minLength={10}
                required
              />
            </Field>
            {!editing && (
              <Field label="API key perangkat (opsional)">
                <Input name="apiKey" type="password" minLength={16} />
              </Field>
            )}
            {editing && (
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={editing.active}
                />
                Perangkat aktif
              </label>
            )}
            <Button type="submit" className="bg-coral">
              {editing ? 'Simpan perubahan' : 'Tambah perangkat'}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-slate-600">
      {label}
      {children}
    </label>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"
      onMouseDown={close}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black">{title}</h2>
          <Button onClick={close} variant="ghost" size="icon">
            <X />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'DRIVER' | 'PASSENGER';
};
function LoginScreen({
  onLogin,
  onBack,
}: {
  onLogin: (u: CurrentUser) => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState('admin@traslink.id');
  const [password, setPassword] = useState('Traslink123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onLogin(data.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal masuk');
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="grid min-h-dvh place-items-center bg-[#eef3f0] p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[28px] border bg-white shadow-2xl md:grid-cols-[1.05fr_.95fr]">
        <div className="relative hidden min-h-[600px] overflow-hidden bg-ink p-10 text-white md:block">
          <div className="absolute inset-0 opacity-30 map-grid" />
          <div className="relative">
            <Logo />
            <Badge className="mt-28 bg-white/10 text-white">
              Transportasi kota, terhubung
            </Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight">
              Angkot lebih dekat.
              <br />
              Perjalanan lebih pasti.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
              Pantau armada secara langsung, minta jemput di sepanjang trayek,
              dan kelola operasional dari satu sistem.
            </p>
          </div>
          <div className="absolute bottom-10 left-10 right-10 grid grid-cols-3 gap-2">
            {[
              ['12', 'Trayek'],
              ['87', 'Angkot'],
              ['96%', 'GPS aktif'],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-white/8 p-3">
                <b className="text-xl">{v}</b>
                <p className="text-[10px] text-white/45">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <form
          onSubmit={submit}
          className="flex flex-col justify-center p-7 md:p-12"
        >
          <div className="mb-8 md:hidden">
            <Logo />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-coral">
            Area terbatas
          </p>
          <h2 className="mt-2 text-3xl font-black">Dashboard Operasional</h2>
          <p className="mt-2 text-sm text-slate-500">
            Masuk menggunakan akun administrator atau sopir Traslink.
          </p>
          <div className="mt-8 grid gap-4">
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Kata sandi">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </Field>
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} className="h-11 bg-coral">
              {loading ? 'Memeriksa...' : 'Masuk ke dashboard'}
            </Button>
            <Button type="button" onClick={onBack} variant="ghost">
              <MapIcon /> Kembali ke peta penumpang
            </Button>
          </div>
          <div className="mt-6 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
            <b>Akun awal setelah seed:</b>
            <br />
            admin@traslink.id / supir@traslink.id
            <br />
            Kata sandi: Traslink123!
          </div>
        </form>
      </div>
    </main>
  );
}

export default function Home() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [view, setView] = useState<View>('passenger');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user);
        if (d.user)
          setView(
            d.user.role === 'ADMIN'
              ? 'admin'
              : d.user.role === 'DRIVER'
                ? 'driver'
                : 'passenger',
          );
      })
      .catch(() => setUser(null));
  }, []);
  if (user === undefined)
    return (
      <main className="grid min-h-dvh place-items-center bg-[#eef3f0]">
        <div className="flex items-center gap-3">
          <span className="size-3 animate-pulse rounded-full bg-coral" />
          <b>Memuat Traslink...</b>
        </div>
      </main>
    );
  if (!user && showAdminLogin)
    return (
      <LoginScreen
        onBack={() => setShowAdminLogin(false)}
        onLogin={(u) => {
          setUser(u);
          setShowAdminLogin(false);
          setView(u.role === 'DRIVER' ? 'driver' : 'admin');
        }}
      />
    );
  if (!user)
    return (
      <PassengerView
        setView={() => {}}
        allowedViews={['passenger']}
        authenticated={false}
        onAdminLogin={() => setShowAdminLogin(true)}
      />
    );
  const allowedViews: View[] =
    user.role === 'ADMIN'
      ? ['admin', 'passenger']
      : user.role === 'DRIVER'
        ? ['driver', 'passenger']
        : ['passenger'];
  const changeView = (next: View) => {
    if (allowedViews.includes(next)) setView(next);
  };
  if (view === 'driver')
    return <DriverView setView={changeView} allowedViews={allowedViews} />;
  if (view === 'admin') return <AdminView setView={changeView} user={user} />;
  return (
    <PassengerView
      setView={changeView}
      allowedViews={allowedViews}
      authenticated
    />
  );
}
