import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { gpsDevices } from '@/db/schema';
import { requireRole } from '@/lib/auth';

const updateInput = z.object({
  deviceCode: z.string().trim().min(3).optional(),
  imei: z.string().trim().min(10).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(['ADMIN']);
    const { id } = await params;
    const parsed = updateInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data perangkat GPS tidak valid' },
        { status: 400 },
      );
    }
    const [device] = await db()
      .update(gpsDevices)
      .set(parsed.data)
      .where(eq(gpsDevices.id, id))
      .returning();
    if (!device) {
      return NextResponse.json(
        { error: 'Perangkat GPS tidak ditemukan' },
        { status: 404 },
      );
    }
    return NextResponse.json({ device });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Gagal memperbarui perangkat GPS' },
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
    const [device] = await db()
      .delete(gpsDevices)
      .where(eq(gpsDevices.id, id))
      .returning({ id: gpsDevices.id });
    if (!device) {
      return NextResponse.json(
        { error: 'Perangkat GPS tidak ditemukan' },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      {
        error:
          'Gagal menghapus perangkat. Lepaskan dari armada terlebih dahulu.',
      },
      { status: 409 },
    );
  }
}
