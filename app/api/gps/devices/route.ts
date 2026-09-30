import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { gpsDevices, vehicles } from '@/db/schema';
import { requireRole } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
export async function GET() {
  try {
    await requireRole(['ADMIN']);
    return NextResponse.json({
      devices: await db()
        .select({
          id: gpsDevices.id,
          deviceCode: gpsDevices.deviceCode,
          imei: gpsDevices.imei,
          active: gpsDevices.active,
        online: sql<boolean>`coalesce(${gpsDevices.active} and ${gpsDevices.lastSeenAt} >= now() - interval '5 minutes', false)`,
          lastSeenAt: gpsDevices.lastSeenAt,
          createdAt: gpsDevices.createdAt,
          vehicleId: vehicles.id,
          plateNumber: vehicles.plateNumber,
        })
        .from(gpsDevices)
        .leftJoin(vehicles, eq(vehicles.gpsDeviceId, gpsDevices.id)),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'Gagal memuat GPS' }, { status: 500 });
  }
}
const input = z.object({
  deviceCode: z.string().min(3),
  imei: z.string().min(10),
  apiKey: z.string().min(16).optional(),
});
export async function POST(request: Request) {
  try {
    await requireRole(['ADMIN']);
    const parsed = input.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        {
          error: 'Data perangkat GPS tidak valid',
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    const [device] = await db()
      .insert(gpsDevices)
      .values({
        deviceCode: parsed.data.deviceCode.trim(),
        imei: parsed.data.imei.trim(),
        apiKeyHash: parsed.data.apiKey
          ? await hashPassword(parsed.data.apiKey)
          : null,
      })
      .returning();
    return NextResponse.json({ device }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      {
        error:
          'Gagal menambah GPS. Pastikan kode perangkat dan IMEI belum digunakan.',
      },
      { status: 500 },
    );
  }
}
