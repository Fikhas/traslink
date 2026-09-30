import { NextResponse } from 'next/server';
import { and, eq, gte, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  gpsDevices,
  pickupRequests,
  transitRoutes,
  vehicles,
} from '@/db/schema';
import { requireRole } from '@/lib/auth';

function jakartaDayRange(now = new Date()) {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const start = new Date(`${date}T00:00:00+07:00`);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

export async function GET() {
  try {
    await requireRole(['ADMIN']);
    const { start, end } = jakartaDayRange();
    const [routeRows, vehicleRows, deviceRows, todayPickups] =
      await Promise.all([
        db()
          .select({
            id: transitRoutes.id,
            code: transitRoutes.code,
            name: transitRoutes.name,
            via: transitRoutes.via,
            color: transitRoutes.color,
          })
          .from(transitRoutes)
          .where(eq(transitRoutes.active, true)),
        db()
          .select({
            id: vehicles.id,
            routeId: vehicles.routeId,
            status: vehicles.status,
          })
          .from(vehicles),
        db()
          .select({
            active: gpsDevices.active,
            lastSeenAt: gpsDevices.lastSeenAt,
          })
          .from(gpsDevices),
        db()
          .select({ createdAt: pickupRequests.createdAt })
          .from(pickupRequests)
          .where(
            and(
              gte(pickupRequests.createdAt, start),
              lt(pickupRequests.createdAt, end),
            ),
          ),
      ]);

    const activeVehicles = vehicleRows.filter(
      (vehicle) => vehicle.status === 'ACTIVE',
    ).length;
    const onlineThreshold = Date.now() - 5 * 60_000;
    const onlineGps = deviceRows.filter(
      (device) =>
        device.active &&
        device.lastSeenAt &&
        device.lastSeenAt.getTime() >= onlineThreshold,
    ).length;
    const gpsPercent = deviceRows.length
      ? Math.round((onlineGps / deviceRows.length) * 100)
      : 0;
    const routeActivity = routeRows.map((route) => {
      const routeVehicles = vehicleRows.filter(
        (vehicle) => vehicle.routeId === route.id,
      );
      return {
        ...route,
        fleet: routeVehicles.length,
        activeVehicles: routeVehicles.filter(
          (vehicle) => vehicle.status === 'ACTIVE',
        ).length,
      };
    });
    const pickupTrend = Array.from({ length: 13 }, (_, index) => {
      const hour = index + 6;
      const count = todayPickups.filter((pickup) => {
        const pickupHour = Number(
          new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            hourCycle: 'h23',
          }).format(pickup.createdAt),
        );
        return pickupHour === hour;
      }).length;
      return { hour: `${String(hour).padStart(2, '0')}.00`, count };
    });

    return NextResponse.json({
      stats: {
        activeRoutes: routeRows.length,
        totalVehicles: vehicleRows.length,
        activeVehicles,
        pickupsToday: todayPickups.length,
        totalGps: deviceRows.length,
        onlineGps,
        gpsPercent,
      },
      routeActivity,
      pickupTrend,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Gagal memuat ringkasan dashboard' },
      { status: 500 },
    );
  }
}
