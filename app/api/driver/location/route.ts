import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { gpsDevices, vehiclePositions, vehicles } from '@/db/schema';
import { requireRole } from '@/lib/auth';

const input = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).nullable().optional(),
  speedKph: z.number().min(0).max(200).nullable().optional(),
  accuracyMeters: z.number().positive().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireRole(['DRIVER']);
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Posisi kendaraan tidak valid.' },
        { status: 400 },
      );
    }
    const [vehicle] = await db()
      .select({ id: vehicles.id, gpsDeviceId: vehicles.gpsDeviceId })
      .from(vehicles)
      .where(eq(vehicles.driverId, user.id))
      .limit(1);
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Akun sopir belum ditugaskan ke angkot.' },
        { status: 422 },
      );
    }
    const [position] = await db()
      .insert(vehiclePositions)
      .values({
        vehicleId: vehicle.id,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        heading: parsed.data.heading ?? undefined,
        speedKph: parsed.data.speedKph ?? undefined,
        accuracyMeters: parsed.data.accuracyMeters ?? undefined,
      })
      .returning();
    if (vehicle.gpsDeviceId) {
      await db()
        .update(gpsDevices)
        .set({ lastSeenAt: new Date() })
        .where(eq(gpsDevices.id, vehicle.gpsDeviceId));
    }
    return NextResponse.json({ position }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Gagal memperbarui posisi kendaraan.' },
      { status: 500 },
    );
  }
}
