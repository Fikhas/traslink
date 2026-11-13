import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { stops, transitRoutes, vehicles } from '@/db/schema';
import { requireRole } from '@/lib/auth';
const point = z.object({ lng: z.number(), lat: z.number() });
const routeInput = z.object({
  code: z.string().trim().min(1).max(8),
  name: z.string().trim().min(3),
  origin: z.string().trim().min(2),
  destination: z.string().trim().min(2),
  via: z.string().trim().min(2),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  operatingStart: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  operatingEnd: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  pathA: z.array(point).min(2),
  pathB: z.array(point).min(2),
  fare: z.number().int().positive().optional(),
});
export async function GET() {
  try {
    const [routeRows, vehicleRows, stopRows] = await Promise.all([
      db().select().from(transitRoutes).where(eq(transitRoutes.active, true)),
      db()
        .select({ routeId: vehicles.routeId, status: vehicles.status })
        .from(vehicles),
      db().select({ routeId: stops.routeId }).from(stops),
    ]);
    const routes = routeRows.map((route) => {
      const routeVehicles = vehicleRows.filter(
        (vehicle) => vehicle.routeId === route.id,
      );
      return {
        ...route,
        stops: stopRows.filter((stop) => stop.routeId === route.id).length,
        fleet: routeVehicles.length,
        activeVehicles: routeVehicles.filter(
          (vehicle) => vehicle.status === 'ACTIVE',
        ).length,
      };
    });
    return NextResponse.json(
      { routes },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal memuat trayek' },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  try {
    await requireRole(['ADMIN']);
    const parsed = routeInput.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    const [route] = await db()
      .insert(transitRoutes)
      .values(parsed.data)
      .returning();
    return NextResponse.json({ route }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Gagal menambah trayek' },
      { status: 500 },
    );
  }
}
