import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { transitRoutes } from '@/db/schema';
import { requireRole } from '@/lib/auth';
import { z } from 'zod';
const point = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});
const updateInput = z.object({
  name: z.string().trim().min(3).optional(),
  origin: z.string().trim().min(2).optional(),
  destination: z.string().trim().min(2).optional(),
  via: z.string().trim().min(2).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  operatingStart: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  operatingEnd: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  pathA: z.array(point).min(2).optional(),
  pathB: z.array(point).min(2).optional(),
  fare: z.number().int().positive().optional(),
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
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Data trayek tidak valid', details: parsed.error.flatten() },
        { status: 400 },
      );
    const [route] = await db()
      .update(transitRoutes)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(transitRoutes.id, id))
      .returning();
    if (!route)
      return NextResponse.json(
        { error: 'Trayek tidak ditemukan' },
        { status: 404 },
      );
    return NextResponse.json({ route });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Gagal memperbarui trayek' },
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
    const [route] = await db()
      .update(transitRoutes)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(transitRoutes.id, id))
      .returning({ id: transitRoutes.id });
    if (!route)
      return NextResponse.json(
        { error: 'Trayek tidak ditemukan' },
        { status: 404 },
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Gagal menghapus trayek' },
      { status: 500 },
    );
  }
}
