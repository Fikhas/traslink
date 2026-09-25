import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { hash } from 'bcryptjs';
import { gpsDevices, transitRoutes, users, vehicles, vehiclePositions } from '../db/schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL wajib diisi');
const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

const bandungRoutes = [
  { code:'05', name:'Cicaheum — Ciroyom', origin:'Cicaheum', destination:'Ciroyom', via:'Jl. Ahmad Yani', color:'#ff5a47', pathA:[{lng:107.6595,lat:-6.9057},{lng:107.6468,lat:-6.9092},{lng:107.6317,lat:-6.9128},{lng:107.6148,lat:-6.9175},{lng:107.5958,lat:-6.9198},{lng:107.5758,lat:-6.9147}], pathB:[{lng:107.5758,lat:-6.9147},{lng:107.5958,lat:-6.9198},{lng:107.6148,lat:-6.9175},{lng:107.6317,lat:-6.9128},{lng:107.6468,lat:-6.9092},{lng:107.6595,lat:-6.9057}] },
  { code:'03', name:'Sadang Serang — Caringin', origin:'Sadang Serang', destination:'Caringin', via:'Jl. Dipatiukur', color:'#2970ff', pathA:[{lng:107.6258,lat:-6.8853},{lng:107.6177,lat:-6.8956},{lng:107.6096,lat:-6.9068},{lng:107.6012,lat:-6.9194},{lng:107.5894,lat:-6.9368},{lng:107.5801,lat:-6.9455}], pathB:[{lng:107.5801,lat:-6.9455},{lng:107.5894,lat:-6.9368},{lng:107.6012,lat:-6.9194},{lng:107.6096,lat:-6.9068},{lng:107.6177,lat:-6.8956},{lng:107.6258,lat:-6.8853}] },
  { code:'10', name:'Cicadas — Elang', origin:'Cicadas', destination:'Elang', via:'Jl. Asia Afrika', color:'#e9a319', pathA:[{lng:107.6452,lat:-6.9148},{lng:107.6301,lat:-6.9186},{lng:107.6139,lat:-6.9214},{lng:107.5972,lat:-6.9224},{lng:107.5797,lat:-6.9178},{lng:107.5662,lat:-6.9103}], pathB:[{lng:107.5662,lat:-6.9103},{lng:107.5797,lat:-6.9178},{lng:107.5972,lat:-6.9224},{lng:107.6139,lat:-6.9214},{lng:107.6301,lat:-6.9186},{lng:107.6452,lat:-6.9148}] },
];

async function seed() {
  const passwordHash = await hash('Traslink123!', 12);
  const createdUsers = await db.insert(users).values([
    { name:'Admin Traslink', email:'admin@traslink.id', passwordHash, role:'ADMIN', phone:'081100000001' },
    { name:'Asep Suhendar', email:'supir@traslink.id', passwordHash, role:'DRIVER', phone:'081100000002' },
    { name:'Nadia Pratama', email:'penumpang@traslink.id', passwordHash, role:'PASSENGER', phone:'081100000003' },
  ]).onConflictDoNothing().returning();
  const createdRoutes = await db.insert(transitRoutes).values(bandungRoutes).onConflictDoNothing().returning();
  const routeRows = createdRoutes.length ? createdRoutes : await db.select().from(transitRoutes);
  const userRows = createdUsers.length ? createdUsers : await db.select().from(users);
  const [device] = await db.insert(gpsDevices).values({ deviceCode:'GPS-TL-001', imei:'861234050001921' }).onConflictDoNothing().returning();
  const deviceRow = device ?? (await db.select().from(gpsDevices))[0];
  const driver = userRows.find(u=>u.role==='DRIVER'); const route = routeRows.find(r=>r.code==='05');
  if (driver && route && deviceRow) {
    const [vehicle] = await db.insert(vehicles).values({ plateNumber:'D 1924 UA', routeId:route.id, driverId:driver.id, gpsDeviceId:deviceRow.id, status:'ACTIVE' }).onConflictDoNothing().returning();
    const vehicleRow = vehicle ?? (await db.select().from(vehicles))[0];
    if (vehicleRow) await db.insert(vehiclePositions).values({ vehicleId:vehicleRow.id, latitude:-6.9128, longitude:107.6317, heading:245, speedKph:22 });
  }
  console.log('Seed selesai. Password akun demo: Traslink123!');
}
seed().finally(()=>sql.end());
