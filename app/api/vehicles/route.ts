import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  gpsDevices,
  transitRoutes,
  users,
  vehiclePositions,
  vehicles,
} from '@/db/schema';
import { requireRole } from '@/lib/auth';
export async function GET() {
  try {
    const list = await db()
      .select({
        id: vehicles.id,
        plateNumber: vehicles.plateNumber,
        capacity: vehicles.capacity,
        status: vehicles.status,
        routeId: vehicles.routeId,
        routeCode: transitRoutes.code,
        driverId: vehicles.driverId,
        driverName: users.name,
        gpsDeviceId: vehicles.gpsDeviceId,
        gpsCode: gpsDevices.deviceCode,
        latitude: vehiclePositions.latitude,
        longitude: vehiclePositions.longitude,
        recordedAt: vehiclePositions.recordedAt,
      })
      .from(vehicles)
      .leftJoin(transitRoutes, eq(vehicles.routeId, transitRoutes.id))
      .leftJoin(users, eq(vehicles.driverId, users.id))
      .leftJoin(gpsDevices, eq(vehicles.gpsDeviceId, gpsDevices.id))
      .leftJoin(vehiclePositions, eq(vehiclePositions.vehicleId, vehicles.id))
      .orderBy(desc(vehiclePositions.recordedAt));
    return NextResponse.json({
      vehicles: list.filter(
        (v, i, a) => a.findIndex((x) => x.id === v.id) === i,
      ),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal memuat armada' },
      { status: 500 },
    );
  }
}
const input = z.object({
  plateNumber: z.string().min(5),
  capacity: z.number().int().min(1).max(50).default(12),
  routeId: z.string().uuid().nullable().optional(),
  driverId: z.string().uuid().nullable().optional(),
  gpsDeviceId: z.string().uuid().nullable().optional(),
});
export async function POST(request: Request) {
  try {
    await requireRole(['ADMIN']);
    const parsed = input.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Data angkot tidak valid', details: parsed.error.flatten() },
        { status: 400 },
      );
    if (parsed.data.gpsDeviceId) {
      const [used] = await db()
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(eq(vehicles.gpsDeviceId, parsed.data.gpsDeviceId))
        .limit(1);
      if (used)
        return NextResponse.json(
          { error: 'Perangkat GPS sudah terpasang pada angkot lain' },
          { status: 409 },
        );
    }
    if (parsed.data.driverId) {
      const [used] = await db()
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(eq(vehicles.driverId, parsed.data.driverId))
        .limit(1);
      if (used)
        return NextResponse.json(
          { error: 'Supir sudah ditugaskan pada angkot lain' },
          { status: 409 },
        );
    }
    const [vehicle] = await db()
      .insert(vehicles)
      .values({
        ...parsed.data,
        plateNumber: parsed.data.plateNumber.trim().toUpperCase(),
      })
      .returning();
    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      {
        error: 'Gagal menambah angkot. Pastikan nomor polisi belum digunakan.',
      },
      { status: 500 },
    );
  }
}
