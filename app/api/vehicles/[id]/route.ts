import { NextResponse } from 'next/server';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { vehicles } from '@/db/schema';
import { requireRole } from '@/lib/auth';
const input = z.object({
  plateNumber: z.string().trim().min(5).optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  routeId: z.string().uuid().nullable().optional(),
  driverId: z.string().uuid().nullable().optional(),
  gpsDeviceId: z.string().uuid().nullable().optional(),
  status: z.enum(['ACTIVE', 'RESTING', 'MAINTENANCE', 'INACTIVE']).optional(),
});
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(['ADMIN']);
    const { id } = await params;
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
        .where(
          and(
            eq(vehicles.gpsDeviceId, parsed.data.gpsDeviceId),
            ne(vehicles.id, id),
          ),
        )
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
        .where(
          and(eq(vehicles.driverId, parsed.data.driverId), ne(vehicles.id, id)),
        )
        .limit(1);
      if (used)
        return NextResponse.json(
          { error: 'Supir sudah ditugaskan pada angkot lain' },
          { status: 409 },
        );
    }
    const values = {
      ...parsed.data,
      ...(parsed.data.plateNumber
        ? { plateNumber: parsed.data.plateNumber.toUpperCase() }
        : {}),
      updatedAt: new Date(),
    };
    const [vehicle] = await db()
      .update(vehicles)
      .set(values)
      .where(eq(vehicles.id, id))
      .returning();
    if (!vehicle)
      return NextResponse.json(
        { error: 'Angkot tidak ditemukan' },
        { status: 404 },
      );
    return NextResponse.json({ vehicle });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Gagal memperbarui angkot' },
      { status: 500 },
    );
  }
}
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(['ADMIN']);
    const { id } = await params;
    const [vehicle] = await db()
      .delete(vehicles)
      .where(eq(vehicles.id, id))
      .returning({ id: vehicles.id });
    if (!vehicle)
      return NextResponse.json(
        { error: 'Angkot tidak ditemukan' },
        { status: 404 },
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Gagal menghapus angkot' },
      { status: 500 },
    );
  }
}
