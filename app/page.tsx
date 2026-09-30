"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  BusFront,
  Check,
  ChevronDown,
  Clock3,
  Edit3,
  Gauge,
  LayoutDashboard,
  LocateFixed,
  LogOut,
  Map as MapIcon,
  MapPin,
  Menu,
  MoreHorizontal,
  Navigation,
  Phone,
  Plus,
  Radio,
  Route,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ProductionMap from "@/components/production-map";
import type { RoutePoint } from "@/db/schema";

type View = "passenger" | "driver" | "admin";
type AdminTab = "overview" | "routes" | "vehicles" | "gps";

type AppRoute = {
  id?: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  via: string;
  stops: number;
  color: string;
  active: number;
  fleet: number;
  pathA: RoutePoint[];
  pathB: RoutePoint[];
};
const routes: AppRoute[] = [
  {
    code: "05",
    name: "Cicaheum — Ciroyom",
    origin: "Cicaheum",
    destination: "Ciroyom",
    via: "Jl. Ahmad Yani",
    stops: 14,
    color: "#ff5a47",
    active: 3,
    fleet: 12,
    pathA: [
      { lng: 107.6595, lat: -6.9057 },
      { lng: 107.6468, lat: -6.9092 },
      { lng: 107.6317, lat: -6.9128 },
      { lng: 107.6148, lat: -6.9175 },
      { lng: 107.5958, lat: -6.9198 },
      { lng: 107.5758, lat: -6.9147 },
    ],
    pathB: [
      { lng: 107.5758, lat: -6.9147 },
      { lng: 107.5958, lat: -6.9198 },
      { lng: 107.6148, lat: -6.9175 },
      { lng: 107.6317, lat: -6.9128 },
      { lng: 107.6468, lat: -6.9092 },
      { lng: 107.6595, lat: -6.9057 },
    ],
  },
  {
    code: "03",
    name: "Sadang Serang — Caringin",
    origin: "Sadang Serang",
    destination: "Caringin",
    via: "Jl. Dipatiukur",
    stops: 11,
    color: "#2970ff",
    active: 5,
    fleet: 9,
    pathA: [
      { lng: 107.6258, lat: -6.8853 },
      { lng: 107.6177, lat: -6.8956 },
      { lng: 107.6096, lat: -6.9068 },
      { lng: 107.6012, lat: -6.9194 },
      { lng: 107.5894, lat: -6.9368 },
      { lng: 107.5801, lat: -6.9455 },
    ],
    pathB: [
      { lng: 107.5801, lat: -6.9455 },
      { lng: 107.5894, lat: -6.9368 },
      { lng: 107.6012, lat: -6.9194 },
      { lng: 107.6096, lat: -6.9068 },
      { lng: 107.6177, lat: -6.8956 },
      { lng: 107.6258, lat: -6.8853 },
    ],
  },
  {
    code: "10",
    name: "Cicadas — Elang",
    origin: "Cicadas",
    destination: "Elang",
    via: "Jl. Asia Afrika",
    stops: 16,
    color: "#e9a319",
    active: 4,
    fleet: 15,
    pathA: [
      { lng: 107.6452, lat: -6.9148 },
      { lng: 107.6301, lat: -6.9186 },
      { lng: 107.6139, lat: -6.9214 },
      { lng: 107.5972, lat: -6.9224 },
      { lng: 107.5797, lat: -6.9178 },
      { lng: 107.5662, lat: -6.9103 },
    ],
    pathB: [
      { lng: 107.5662, lat: -6.9103 },
      { lng: 107.5797, lat: -6.9178 },
      { lng: 107.5972, lat: -6.9224 },
      { lng: 107.6139, lat: -6.9214 },
      { lng: 107.6301, lat: -6.9186 },
      { lng: 107.6452, lat: -6.9148 },
    ],
  },
];

function normalizeDatabaseRoutes(data: unknown): AppRoute[] {
  if (!Array.isArray(data)) return [];
  return data.map((route: AppRoute) => ({
    ...route,
    stops: route.stops ?? 0,
    active: route.active ?? 0,
    fleet: route.fleet ?? 0,
  }));
}

async function fetchDatabaseRoutes() {
  const response = await fetch("/api/routes", { cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "Gagal memuat trayek dari database.",
    );
  }
  return normalizeDatabaseRoutes(data?.routes);
}

const initialVehicles = [
  {
    id: "demo-1",
    plate: "D 1924 UA",
    driver: "Asep Suhendar",
    route: "05",
    gps: "GPS-TL-001",
    status: "Aktif",
  },
  {
    id: "demo-2",
    plate: "D 1842 UB",
    driver: "Dadang Hidayat",
    route: "05",
    gps: "GPS-TL-002",
    status: "Aktif",
  },
  {
    id: "demo-3",
    plate: "D 1721 UC",
    driver: "Ujang Rohman",
    route: "05",
    gps: "GPS-TL-008",
    status: "Istirahat",
  },
  {
    id: "demo-4",
    plate: "D 2011 VD",
    driver: "Rizal Maulana",
    route: "03",
    gps: "GPS-TL-011",
    status: "Aktif",
  },
];

const vehiclePins = [
  { id: "D 1924 UA", x: 36, y: 29, eta: "3 mnt" },
  { id: "D 1842 UB", x: 58, y: 51, eta: "7 mnt" },
  { id: "D 1721 UC", x: 77, y: 68, eta: "11 mnt" },
];

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
  routeIndex = 0,
  routeData,
  driver = false,
  editor = false,
  direction = "A",
  onPathChange,
}: {
  routeIndex?: number;
  routeData?: AppRoute;
  driver?: boolean;
  editor?: boolean;
  direction?: "A" | "B";
  onPathChange?: (p: RoutePoint[]) => void;
}) {
  const route = routeData ?? routes[routeIndex];
  const v = vehiclePins.map((pin, i) => ({
    id: pin.id,
    label: pin.eta,
    longitude: route.pathA[Math.min(i + 1, route.pathA.length - 1)].lng,
    latitude: route.pathA[Math.min(i + 1, route.pathA.length - 1)].lat,
  }));
  const p = driver
    ? [
        {
          id: "p1",
          label: "Nadia · 120 m",
          longitude: 107.6218,
          latitude: -6.9155,
        },
        {
          id: "p2",
          label: "Bima · 650 m",
          longitude: 107.6048,
          latitude: -6.9211,
        },
      ]
    : [];
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#e8eee9]">
      <ProductionMap
        path={direction === "A" ? route.pathA : route.pathB}
        color={route.color}
        vehicles={editor ? [] : v}
        pickups={p}
        editable={editor}
        onPathChange={onPathChange}
      />
    </div>
  );
}

function TopNav({
  view,
  setView,
  allowedViews,
}: {
  view: View;
  setView: (v: View) => void;
  allowedViews: View[];
}) {
  return (
    <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-4 md:px-7">
      <div className="rounded-2xl border border-white/70 bg-white/90 p-2 pr-4 shadow-map backdrop-blur-xl">
        <Logo />
      </div>
      <div className="flex gap-2">
        <nav className="flex items-center gap-1 rounded-xl border border-white/70 bg-white/90 p-1 shadow-map backdrop-blur-xl">
          {(
            [
              ["passenger", "Penumpang"],
              ["driver", "Supir"],
              ["admin", "Admin"],
            ] as const
          )
            .filter(([key]) => allowedViews.includes(key))
            .map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition md:px-4 ${view === key ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {label}
              </button>
            ))}
        </nav>
        <Button
          onClick={() =>
            fetch("/api/auth/logout", { method: "POST" }).then(() =>
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
      </div>
    </header>
  );
}

function PassengerView({
  setView,
  allowedViews,
}: {
  setView: (v: View) => void;
  allowedViews: View[];
}) {
  const [routeList, setRouteList] = useState(routes);
  const [routeIndex, setRouteIndex] = useState(0);
  const [direction, setDirection] = useState<"A" | "B">("A");
  const [pickup, setPickup] = useState<{ id: string } | null>(null);
  const [nearRoute, setNearRoute] = useState(true);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const route = routeList[routeIndex] ?? routes[0];
  useEffect(() => {
    fetch("/api/routes")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.routes?.length)
          setRouteList(
            data.routes.map((r: AppRoute) => ({
              ...r,
              stops: r.stops ?? 0,
              active: r.active ?? 0,
              fleet: r.fleet ?? 0,
            })),
          );
      })
      .catch(() => {});
  }, []);
  async function togglePickup() {
    if (pickup) {
      const res = await fetch(`/api/pickups/${pickup.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (res.ok) {
        setPickup(null);
        setMessage("Permintaan jemput dibatalkan.");
      }
      return;
    }
    if (!route.id) {
      setMessage("Masuk dan jalankan seed database untuk mengaktifkan jemput.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await fetch("/api/pickups", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            routeId: route.id,
            direction,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setPickup(data.pickup);
          setNearRoute(true);
          setMessage("Sinyal jemput terkirim ke supir.");
        } else {
          setNearRoute(data.distance ? data.distance <= 150 : false);
          setMessage(data.error ?? "Permintaan gagal.");
        }
      },
      () =>
        setMessage("Izinkan akses lokasi agar fitur jemput dapat digunakan."),
      { enableHighAccuracy: true },
    );
  }
  return (
    <main className="relative h-dvh min-h-[680px] overflow-hidden text-slate-950">
      <MapCanvas routeData={route} direction={direction} />
      <TopNav view="passenger" setView={setView} allowedViews={allowedViews} />
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
            className={`size-4 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div className="mt-2 space-y-1 border-t pt-2">
            {routeList.map((r, i) => (
              <button
                key={r.code}
                onClick={() => {
                  setRouteIndex(i);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate-50 ${i === routeIndex ? "bg-slate-50" : ""}`}
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
            onClick={() => setDirection("A")}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${direction === "A" ? "bg-white shadow-sm" : "text-slate-500"}`}
          >
            Ke {route.name.split(" — ")[1]}
          </button>
          <ArrowLeftRight className="size-3.5 text-slate-400" />
          <button
            onClick={() => setDirection("B")}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${direction === "B" ? "bg-white shadow-sm" : "text-slate-500"}`}
          >
            Ke {route.name.split(" — ")[0]}
          </button>
        </div>
      </section>
      <div className="absolute bottom-61 right-4 z-20 md:bottom-8 md:right-7">
        <Button
          onClick={() => setNearRoute(!nearRoute)}
          variant="outline"
          size="icon-lg"
          className={`rounded-xl border-white bg-white shadow-map ${nearRoute ? "text-coral" : "text-slate-400"}`}
          aria-label="Simulasikan lokasi"
        >
          <LocateFixed />
        </Button>
      </div>
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
                  {route.active} aktif
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {route.name.replace(" — ", " · ")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Terdekat</p>
            <p className="text-lg font-black text-coral">3 menit</p>
          </div>
        </div>
        <div className="my-4 grid grid-cols-3 divide-x divide-slate-100 rounded-xl bg-slate-50 py-3 text-center">
          <Info icon={<Clock3 />} text="05.00–21.00" />
          <Info icon={<Users />} text="12 kursi" />
          <Info icon={<ShieldCheck />} text="Terverifikasi" />
        </div>
        <Button
          disabled={!nearRoute}
          onClick={togglePickup}
          className={`h-12 w-full rounded-xl text-sm font-bold ${pickup ? "bg-rose-50 text-[#e54836] hover:bg-rose-100" : "bg-coral text-white hover:bg-[#ec4b39]"}`}
        >
          <MapPin /> {pickup ? "Batal Jemput di Sini" : "Jemput di Sini"}
        </Button>
        <p
          className={`mt-2 text-center text-[11px] ${nearRoute ? "text-slate-400" : "font-semibold text-amber-600"}`}
        >
          {message ||
            (nearRoute
              ? "Lokasi akan diverifikasi terhadap jalur · Maksimal 150 m"
              : "Kamu terlalu jauh dari jalur · Dekati jalur untuk meminta jemput")}
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

function DriverView({
  setView,
  allowedViews,
}: {
  setView: (v: View) => void;
  allowedViews: View[];
}) {
  const [online, setOnline] = useState(true);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [signals, setSignals] = useState([
    {
      id: "demo-1",
      name: "Nadia P.",
      distance: "120 m",
      wait: "2 menit",
      phone: "081100000003",
      latitude: -6.9155,
      longitude: 107.6218,
    },
    {
      id: "demo-2",
      name: "Bima A.",
      distance: "650 m",
      wait: "5 menit",
      phone: "081100000004",
      latitude: -6.9211,
      longitude: 107.6048,
    },
  ]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/pickups")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (alive && data?.pickups?.length)
            setSignals(
              data.pickups.map(
                (p: {
                  id: string;
                  passengerName: string;
                  distanceToRouteMeters: number;
                  passengerPhone: string;
                  createdAt: string;
                  latitude: number;
                  longitude: number;
                }) => ({
                  id: p.id,
                  name: p.passengerName,
                  distance: `${Math.round(p.distanceToRouteMeters)} m`,
                  wait: `${Math.max(1, Math.round((Date.now() - new Date(p.createdAt).getTime()) / 60000))} menit`,
                  phone: p.passengerPhone ?? "Tidak tersedia",
                  latitude: p.latitude,
                  longitude: p.longitude,
                }),
              ),
            );
        });
    load();
    const timer = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  async function accept(id: string, name: string) {
    if (!id.startsWith("demo-")) {
      const res = await fetch(`/api/pickups/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (!res.ok) return;
    }
    setAccepted([...accepted, name]);
  }
  return (
    <main className="relative h-dvh min-h-[700px] overflow-hidden">
      <MapCanvas driver />
      <TopNav view="driver" setView={setView} allowedViews={allowedViews} />
      <div className="absolute left-4 top-24 z-30 rounded-2xl bg-ink p-3 text-white shadow-map md:left-7">
        <div className="flex items-center gap-3">
          <span
            className={`size-2.5 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`}
          />
          <div>
            <p className="text-[10px] text-white/55">D 1924 UA · Trayek 05</p>
            <b className="text-sm">
              {online ? "Sedang beroperasi" : "Tidak aktif"}
            </b>
          </div>
          <button
            onClick={() => setOnline(!online)}
            className={`ml-3 rounded-lg px-3 py-1.5 text-xs font-bold ${online ? "bg-white/12" : "bg-emerald-500"}`}
          >
            {online ? "Selesai" : "Mulai"}
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
              {signals.length} penumpang di depan
            </h2>
          </div>
          <Badge className="bg-coral text-white">
            <Radio className="size-3" /> Live
          </Badge>
        </div>
        {notice && (
          <p className="mb-3 rounded-lg bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">
            {notice}
          </p>
        )}
        <div className="space-y-2">
          {signals.map((s) => (
            <div key={s.name} className="rounded-2xl border bg-white p-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-[#fff0ed] font-black text-coral">
                  {s.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <b className="text-sm">{s.name}</b>
                  <p className="text-xs text-slate-500">
                    {s.distance} · menunggu {s.wait}
                  </p>
                </div>
                {accepted.includes(s.name) ? (
                  <Badge className="bg-emerald-50 text-emerald-700">
                    <Check />
                    Diterima
                  </Badge>
                ) : (
                  <Button
                    onClick={() => accept(s.id, s.name)}
                    size="sm"
                    className="bg-ink"
                  >
                    Jemput
                  </Button>
                )}
              </div>
              {accepted.includes(s.name) && (
                <div className="mt-3 flex gap-2 border-t pt-3">
                  <Button
                    onClick={() => {
                      setNotice(`Menghubungi ${s.name} di ${s.phone}`);
                      location.href = `tel:${s.phone}`;
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <Phone /> Hubungi
                  </Button>
                  <Button
                    onClick={() => {
                      setNotice(`Membuka navigasi menuju ${s.name}`);
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                    className="flex-1 bg-coral"
                  >
                    <Navigation /> Navigasi
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <Gauge className="size-3" /> Diperbarui otomatis setiap 10 detik
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

function AdminView({ setView }: { setView: (v: View) => void }) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [routeFilter, setRouteFilter] = useState("Semua");
  const [toast, setToast] = useState("");
  const [dbRoutes, setDbRoutes] = useState<AppRoute[]>([]);
  const [mobileNav, setMobileNav] = useState(false);
  const filtered = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          (routeFilter === "Semua" || v.route === routeFilter) &&
          `${v.plate} ${v.driver}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [vehicles, query, routeFilter],
  );
  useEffect(() => {
    fetch("/api/routes")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.routes && setDbRoutes(d.routes));
    fetch("/api/vehicles")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.vehicles?.length)
          setVehicles(
            d.vehicles.map(
              (v: {
                id: string;
                plateNumber: string;
                driverName: string | null;
                routeCode: string | null;
                gpsCode: string | null;
                status: string;
              }) => ({
                id: v.id,
                plate: v.plateNumber,
                driver: v.driverName ?? "Belum ditugaskan",
                route: v.routeCode ?? "-",
                gps: v.gpsCode ?? "-",
                status:
                  v.status === "ACTIVE"
                    ? "Aktif"
                    : v.status === "RESTING"
                      ? "Istirahat"
                      : "Nonaktif",
              }),
            ),
          );
      });
  }, []);
  async function addVehicle(form: FormData) {
    const plate = String(form.get("plate") || "")
      .trim()
      .toUpperCase();
    const routeCode = String(form.get("route") || "");
    const driver = String(form.get("driver") || "Belum ditugaskan");
    const gps = String(form.get("gps") || "-");
    const route = dbRoutes.find((r) => r.code === routeCode) ?? dbRoutes[0];
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        plateNumber: plate,
        capacity: 12,
        routeId: route?.id ?? null,
      }),
    });
    const data = await res.json();
    if (res.ok)
      setVehicles([
        ...vehicles,
        {
          id: data.vehicle.id,
          plate,
          driver,
          route: route?.code ?? "-",
          gps,
          status: "Nonaktif",
        },
      ]);
    setShowForm(false);
    setToast(
      res.ok
        ? "Angkot baru berhasil ditambahkan"
        : typeof data.error === "string"
          ? data.error
          : "Gagal menambah angkot",
    );
    setTimeout(() => setToast(""), 2500);
  }
  async function deleteVehicle(plate: string) {
    if (
      !window.confirm(
        `Hapus angkot ${plate}? Tindakan ini tidak dapat dibatalkan.`,
      )
    )
      return;
    const vehicle = vehicles.find((v) => v.plate === plate);
    if (vehicle && !vehicle.id.startsWith("demo-"))
      await fetch(`/api/vehicles/${vehicle.id}`, { method: "DELETE" });
    setVehicles(vehicles.filter((v) => v.plate !== plate));
    setToast(`${plate} berhasil dihapus`);
    setTimeout(() => setToast(""), 2500);
  }
  async function editVehicle(plate: string) {
    const vehicle = vehicles.find((v) => v.plate === plate);
    if (!vehicle) return;
    const next = vehicle.status === "Aktif" ? "Istirahat" : "Aktif";
    if (!vehicle.id.startsWith("demo-"))
      await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: next === "Aktif" ? "ACTIVE" : "RESTING",
        }),
      });
    setVehicles(
      vehicles.map((v) => (v.plate === plate ? { ...v, status: next } : v)),
    );
    setToast(`${plate} sekarang ${next.toLowerCase()}`);
    setTimeout(() => setToast(""), 2500);
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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-white p-4 ${mobileNav ? "" : "max-lg:hidden"}`}
      >
        <Logo />
        <div className="mt-9 space-y-1">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Workspace
          </p>
          {(
            [
              ["overview", "Ringkasan", <LayoutDashboard key="i" />],
              ["routes", "Trayek & Rute", <Route key="i" />],
              ["vehicles", "Data Angkot", <BusFront key="i" />],
              ["gps", "Perangkat GPS", <Radio key="i" />],
            ] as [AdminTab, string, React.ReactNode][]
          ).map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                setMobileNav(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold [&_svg]:size-4 ${tab === key ? "bg-ink text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
        <div className="mt-auto rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-bold">Admin Kota Bandung</p>
          <p className="text-[10px] text-slate-400">admin@traslink.id</p>
          <Button
            onClick={() =>
              fetch("/api/auth/logout", { method: "POST" }).then(() =>
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
              {tab === "overview"
                ? "Ringkasan Operasional"
                : tab === "routes"
                  ? "Manajemen Trayek"
                  : tab === "vehicles"
                    ? "Data Angkutan Kota"
                    : "Perangkat GPS"}
            </h1>
            <p className="hidden text-[11px] text-slate-400 sm:block">
              Jumat, 25 September 2026 · Kota Bandung
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setView("passenger")}
            variant="outline"
            size="sm"
          >
            <MapIcon /> Lihat peta
          </Button>
          <span className="grid size-9 place-items-center rounded-full bg-ink text-xs font-bold text-white">
            AF
          </span>
        </div>
      </header>
      <div className="lg:ml-64">
        <div className="flex gap-1 overflow-auto border-b bg-white px-4 py-2 lg:hidden">
          {(["overview", "routes", "vehicles", "gps"] as AdminTab[]).map(
            (t) => (
              <Button
                key={t}
                onClick={() => setTab(t)}
                variant={tab === t ? "default" : "ghost"}
                size="sm"
              >
                {t}
              </Button>
            ),
          )}
        </div>
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          {tab === "overview" && <Overview setTab={setTab} />}{" "}
          {tab === "routes" && <RoutesPanel />}{" "}
          {tab === "vehicles" && (
            <VehiclesPanel
              vehicles={filtered}
              query={query}
              setQuery={setQuery}
              routeFilter={routeFilter}
              setRouteFilter={setRouteFilter}
              onAdd={() => setShowForm(true)}
              onEdit={editVehicle}
              onDelete={deleteVehicle}
            />
          )}{" "}
          {tab === "gps" && <GpsPanel />}
        </div>
      </div>
      {showForm && (
        <Modal title="Tambah angkutan kota" close={() => setShowForm(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addVehicle(new FormData(e.currentTarget));
            }}
            className="grid gap-4"
          >
            <Field label="Nomor polisi">
              <Input name="plate" defaultValue="D 2088 TL" required />
            </Field>
            <Field label="Nama supir">
              <Input name="driver" defaultValue="Sopir Baru" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Trayek">
                <select
                  name="route"
                  className="h-8 rounded-lg border bg-white px-2 text-sm"
                >
                  {(dbRoutes.length ? dbRoutes : routes).map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.code}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="ID GPS">
                <Input name="gps" defaultValue="GPS-TL-016" />
              </Field>
            </div>
            <Button type="submit" className="h-11 bg-coral">
              Simpan angkot
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
  return (
    <>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm text-slate-500">Selamat datang kembali,</p>
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">
            Transportasi kota dalam satu pantauan.
          </h2>
        </div>
        <Button
          onClick={() => setTab("routes")}
          className="hidden bg-coral md:flex"
        >
          <Plus /> Tambah trayek
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Route />}
          label="Trayek aktif"
          value="12"
          change="+2 bulan ini"
        />
        <StatCard
          icon={<BusFront />}
          label="Angkot beroperasi"
          value="87"
          change="76% armada"
        />
        <StatCard
          icon={<Users />}
          label="Jemput hari ini"
          value="1.284"
          change="+18,2%"
        />
        <StatCard
          icon={<Activity />}
          label="GPS terhubung"
          value="96%"
          change="Stabil"
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
            <Button onClick={() => setTab("routes")} variant="ghost" size="sm">
              Kelola semua
            </Button>
          </div>
          <div className="divide-y">
            {routes.map((r) => (
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
                  <b className="text-sm">{r.active} aktif</b>
                  <p className="text-[10px] text-slate-400">
                    dari {r.fleet} armada
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-ink p-5 text-white">
          <p className="text-xs text-white/50">Permintaan jemput</p>
          <p className="mt-1 text-3xl font-black">142</p>
          <div className="mt-6 flex h-32 items-end gap-2">
            {[35, 48, 42, 64, 54, 77, 82, 68, 91, 78, 94, 86].map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-t bg-coral/90"
                style={{ height: `${h}%`, opacity: 0.45 + i * 0.045 }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-white/35">
            <span>06.00</span>
            <span>12.00</span>
            <span>18.00</span>
          </div>
        </div>
      </div>
    </>
  );
}

function RoutesPanel() {
  const [items, setItems] = useState<AppRoute[]>([]);
  const [selected, setSelected] = useState(0);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const current = items[selected] ?? items[0] ?? null;

  async function loadRoutes() {
    setLoading(true);
    setLoadError("");
    try {
      const databaseRoutes = await fetchDatabaseRoutes();
      setItems(databaseRoutes);
      setSelected((index) =>
        Math.min(index, Math.max(databaseRoutes.length - 1, 0)),
      );
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Gagal memuat trayek dari database.",
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
        setSelected((index) =>
          Math.min(index, Math.max(databaseRoutes.length - 1, 0)),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Gagal memuat trayek dari database.",
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
    if (path.length < 2) return;
    setItems((currentItems) =>
      currentItems.map((route, index) =>
        index === selected ? { ...route, pathA: path } : route,
      ),
    );
  }

  async function persistRoute(route: AppRoute & { id: string }) {
    const response = await fetch(`/api/routes/${route.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pathA: route.pathA,
        pathB: [...route.pathA].reverse(),
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        typeof data?.error === "string"
          ? data.error
          : "Gagal menyimpan perubahan rute.",
      );
    }
    return data?.route as AppRoute | undefined;
  }

  async function save() {
    if (!current || saving) return;
    setSaving(true);
    setNotice("");
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
          pathB: [...routeToSave.pathA].reverse(),
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
      setNotice("Perubahan rute berhasil disimpan.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan perubahan rute.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function add() {
    const code = `N${items.length + 1}`;
    const payload = {
      code,
      name: `Trayek Baru ${code}`,
      origin: "Titik A",
      destination: "Titik B",
      via: "Jalur baru",
      color: "#16a085",
      pathA: routes[0].pathA,
      pathB: routes[0].pathB,
      fare: 5000,
    };
    const res = await fetch("/api/routes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      setItems([...items, { ...data.route, stops: 0, active: 0, fleet: 0 }]);
      setSelected(items.length);
      setNotice(`Trayek ${code} berhasil ditambahkan.`);
    } else
      setNotice(
        typeof data.error === "string"
          ? data.error
          : "Gagal menambahkan trayek.",
      );
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Daftar trayek</h2>
            <p className="text-xs text-slate-400">
              {items.length} trayek terdaftar
            </p>
          </div>
          <Button
            onClick={add}
            disabled={loading || saving}
            className="bg-coral"
          >
            <Plus /> Tambah
          </Button>
        </div>
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
            className={`mb-3 rounded-xl p-3 text-xs font-semibold ${notice.includes("berhasil") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
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
          {items.map((r, i) => (
            <button
              key={r.code}
              onClick={() => setSelected(i)}
              className={`w-full rounded-2xl border p-4 text-left transition ${selected === i ? "border-ink bg-white shadow-sm" : "bg-white/60 hover:bg-white"}`}
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
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-white">
        {!current ? (
          <div className="grid min-h-[500px] place-items-center p-8 text-center text-sm text-slate-500">
            {loading
              ? "Menyiapkan editor rute..."
              : "Belum ada trayek di database. Tambahkan trayek untuk mulai menggambar rute."}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <div>
                <Badge className="mb-1 bg-rose-50 text-coral">
                  Editor rute {current.code}
                </Badge>
                <h3 className="font-extrabold">{current.name}</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => updatePath(current.pathA.slice(0, -1))}
                  disabled={current.pathA.length <= 2 || saving}
                  variant="outline"
                >
                  <Undo2 /> Urungkan
                </Button>
                <Button
                  onClick={() => void save()}
                  disabled={saving}
                  className="bg-ink"
                >
                  <Check /> {saving ? "Menyimpan..." : "Simpan rute"}
                </Button>
              </div>
            </div>
            <div className="relative h-[500px]">
              <MapCanvas routeData={current} editor onPathChange={updatePath} />
              <div className="absolute left-4 top-4 z-20 w-48 rounded-xl bg-white/95 p-3 shadow-map">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Petunjuk editor
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Klik peta untuk menambah titik. Gunakan urungkan untuk
                  menghapus titik terakhir.
                </p>
                <Badge className="mt-3 bg-coral text-white">
                  {current.pathA.length} titik
                </Badge>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function VehiclesPanel({
  vehicles,
  query,
  setQuery,
  routeFilter,
  setRouteFilter,
  onAdd,
  onEdit,
  onDelete,
}: {
  vehicles: typeof initialVehicles;
  query: string;
  setQuery: (s: string) => void;
  routeFilter: string;
  setRouteFilter: (s: string) => void;
  onAdd: () => void;
  onEdit: (p: string) => void;
  onDelete: (p: string) => void;
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
                <tr key={v.plate} className="hover:bg-slate-50">
                  <td className="p-4 font-bold">{v.plate}</td>
                  <td className="p-4">{v.driver}</td>
                  <td className="p-4">
                    <Badge className="bg-slate-100 text-ink">{v.route}</Badge>
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-500">
                    {v.gps}
                  </td>
                  <td className="p-4">
                    <Badge
                      className={
                        v.status === "Aktif"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {v.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        onClick={() => onEdit(v.plate)}
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Ubah status ${v.plate}`}
                      >
                        <Edit3 />
                      </Button>
                      <Button
                        onClick={() => onDelete(v.plate)}
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-500"
                        aria-label={`Hapus ${v.plate}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vehicles.length === 0 && (
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
  const [devices, setDevices] = useState([
    {
      id: "GPS-TL-001",
      imei: "861234050001921",
      plate: "D 1924 UA",
      seen: "Baru saja",
      status: "Online",
    },
    {
      id: "GPS-TL-002",
      imei: "861234050001922",
      plate: "D 1842 UB",
      seen: "12 dtk lalu",
      status: "Online",
    },
    {
      id: "GPS-TL-008",
      imei: "861234050001928",
      plate: "D 1721 UC",
      seen: "18 mnt lalu",
      status: "Offline",
    },
  ]);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    fetch("/api/gps/devices")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.devices?.length)
          setDevices(
            d.devices.map(
              (x: {
                deviceCode: string;
                imei: string;
                lastSeenAt: string | null;
                active: boolean;
              }) => ({
                id: x.deviceCode,
                imei: x.imei,
                plate: "Terhubung via armada",
                seen: x.lastSeenAt
                  ? new Date(x.lastSeenAt).toLocaleString("id-ID")
                  : "Belum ada sinyal",
                status: x.active ? "Online" : "Offline",
              }),
            ),
          );
      });
  }, []);
  async function addGps() {
    const number = String(devices.length + 16).padStart(3, "0");
    const id = `GPS-TL-${number}`;
    const imei = `8612340500${Date.now().toString().slice(-5)}`;
    const res = await fetch("/api/gps/devices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceCode: id, imei }),
    });
    if (res.ok) {
      setDevices([
        ...devices,
        { id, imei, plate: "Belum terpasang", seen: "—", status: "Siap" },
      ]);
      setNotice(`${id} berhasil ditambahkan.`);
    } else setNotice("Gagal menambahkan perangkat GPS.");
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
        <Button onClick={addGps} className="bg-coral">
          <Plus /> Tambah GPS
        </Button>
      </div>
      {notice && (
        <p className="mb-4 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-700">
          {notice}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {devices.map((d) => (
          <div
            key={d.id}
            className={`rounded-2xl border bg-white p-4 ${selected === d.id ? "ring-2 ring-coral" : ""}`}
          >
            <div className="flex items-start justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-slate-100">
                <Radio className="size-4" />
              </span>
              <Badge
                className={
                  d.status === "Online"
                    ? "bg-emerald-50 text-emerald-700"
                    : d.status === "Siap"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                }
              >
                {d.status}
              </Badge>
            </div>
            <h3 className="mt-4 font-extrabold">{d.id}</h3>
            <p className="font-mono text-[10px] text-slate-400">
              IMEI {d.imei}
            </p>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div>
                <p className="text-[10px] text-slate-400">Terpasang pada</p>
                <b className="text-xs">{d.plate}</b>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">Sinyal terakhir</p>
                <b className="text-xs">{d.seen}</b>
              </div>
            </div>
            {selected === d.id && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                Mode pengaturan aktif. Perangkat dapat dipasangkan melalui
                formulir armada.
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => {
                  setSelected(selected === d.id ? null : d.id);
                  setNotice(`${d.id} dipilih untuk pengaturan.`);
                }}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Edit3 /> {selected === d.id ? "Selesai" : "Atur"}
              </Button>
              <Button
                onClick={() =>
                  setNotice(`${d.id} · IMEI ${d.imei} · ${d.status}`)
                }
                variant="ghost"
                size="icon-sm"
                aria-label={`Detail ${d.id}`}
              >
                <MoreHorizontal />
              </Button>
            </div>
          </div>
        ))}
      </div>
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
  role: "ADMIN" | "DRIVER" | "PASSENGER";
};
function LoginScreen({ onLogin }: { onLogin: (u: CurrentUser) => void }) {
  const [email, setEmail] = useState("penumpang@traslink.id");
  const [password, setPassword] = useState("Traslink123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onLogin(data.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal masuk");
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
              ["12", "Trayek"],
              ["87", "Angkot"],
              ["96%", "GPS aktif"],
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
            Selamat datang
          </p>
          <h2 className="mt-2 text-3xl font-black">Masuk ke Traslink</h2>
          <p className="mt-2 text-sm text-slate-500">
            Gunakan akun sesuai peran Anda.
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
              {loading ? "Memeriksa..." : "Masuk"}
            </Button>
          </div>
          <div className="mt-6 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
            <b>Akun demo setelah seed:</b>
            <br />
            admin@traslink.id · supir@traslink.id · penumpang@traslink.id
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
  const [view, setView] = useState<View>("passenger");
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user);
        if (d.user)
          setView(
            d.user.role === "ADMIN"
              ? "admin"
              : d.user.role === "DRIVER"
                ? "driver"
                : "passenger",
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
  if (!user)
    return (
      <LoginScreen
        onLogin={(u) => {
          setUser(u);
          setView(
            u.role === "ADMIN"
              ? "admin"
              : u.role === "DRIVER"
                ? "driver"
                : "passenger",
          );
        }}
      />
    );
  const allowedViews: View[] =
    user.role === "ADMIN"
      ? ["admin", "driver", "passenger"]
      : user.role === "DRIVER"
        ? ["driver", "passenger"]
        : ["passenger"];
  const changeView = (next: View) => {
    if (allowedViews.includes(next)) setView(next);
  };
  if (view === "driver")
    return <DriverView setView={changeView} allowedViews={allowedViews} />;
  if (view === "admin") return <AdminView setView={changeView} />;
  return <PassengerView setView={changeView} allowedViews={allowedViews} />;
}
