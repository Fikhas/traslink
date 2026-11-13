import { NextResponse } from 'next/server';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { pickupRequests, vehicles } from '@/db/schema';
import { requireRole } from '@/lib/auth';

const actionInput = z.object({
  action: z.enum(['cancel', 'accept', 'complete']),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(['ADMIN', 'DRIVER', 'PASSENGER']);
    const { id } = await params;
    const parsed = actionInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
    }

    if (parsed.data.action === 'cancel') {
      if (user.role !== 'PASSENGER' && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Aksi tidak diizinkan' },
          { status: 403 },
        );
      }
      const conditions =
        user.role === 'PASSENGER'
          ? and(
              eq(pickupRequests.id, id),
              eq(pickupRequests.passengerId, user.id),
            )
          : eq(pickupRequests.id, id);
      const [updated] = await db()
        .update(pickupRequests)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(conditions)
        .returning({ id: pickupRequests.id });
      if (!updated)
        return NextResponse.json(
          { error: 'Permintaan jemput tidak ditemukan' },
          { status: 404 },
        );
      return NextResponse.json({ ok: true });
    }

    if (user.role === 'ADMIN' && parsed.data.action === 'complete') {
      const [updated] = await db()
        .update(pickupRequests)
        .set({ status: 'PICKED_UP', updatedAt: new Date() })
        .where(eq(pickupRequests.id, id))
        .returning({ id: pickupRequests.id });
      if (!updated)
        return NextResponse.json(
          { error: 'Permintaan jemput tidak ditemukan' },
          { status: 404 },
        );
      return NextResponse.json({ ok: true });
    }

    if (user.role !== 'DRIVER') {
      return NextResponse.json(
        { error: 'Aksi tidak diizinkan' },
        { status: 403 },
      );
    }
    const [vehicle] = await db()
      .select({ id: vehicles.id, routeId: vehicles.routeId })
      .from(vehicles)
      .where(eq(vehicles.driverId, user.id))
      .limit(1);
    if (!vehicle?.routeId)
      return NextResponse.json(
        { error: 'Supir belum terhubung ke angkot dan trayek' },
        { status: 422 },
      );

    const conditions =
      parsed.data.action === 'accept'
        ? and(
            eq(pickupRequests.id, id),
            eq(pickupRequests.routeId, vehicle.routeId),
            eq(pickupRequests.status, 'WAITING'),
            gt(pickupRequests.expiresAt, new Date()),
          )
        : and(
            eq(pickupRequests.id, id),
            eq(pickupRequests.routeId, vehicle.routeId),
            eq(pickupRequests.status, 'ACCEPTED'),
            eq(pickupRequests.acceptedByVehicleId, vehicle.id),
          );
    const [updated] = await db()
      .update(pickupRequests)
      .set({
        status: parsed.data.action === 'accept' ? 'ACCEPTED' : 'PICKED_UP',
        ...(parsed.data.action === 'accept'
          ? { acceptedByVehicleId: vehicle.id }
          : {}),
        updatedAt: new Date(),
      })
      .where(conditions)
      .returning({ id: pickupRequests.id });
    if (!updated)
      return NextResponse.json(
        {
          error:
            parsed.data.action === 'accept'
              ? 'Permintaan sudah diambil sopir lain, kedaluwarsa, atau bukan pada trayek Anda.'
              : 'Permintaan tidak dapat diselesaikan oleh angkot ini.',
        },
        { status: 409 },
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Gagal memperbarui permintaan' },
      { status: 500 },
    );
  }
}
