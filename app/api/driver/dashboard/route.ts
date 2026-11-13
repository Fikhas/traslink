import { NextResponse } from 'next/server';
import { and, desc, eq, gt, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  pickupRequests,
  transitRoutes,
  users,
  vehiclePositions,
  vehicles,
} from '@/db/schema';
import { requireRole } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireRole(['DRIVER']);
    const [vehicle] = await db()
      .select({
        id: vehicles.id,
        plateNumber: vehicles.plateNumber,
        capacity: vehicles.capacity,
        status: vehicles.status,
        routeId: vehicles.routeId,
        routeCode: transitRoutes.code,
        routeName: transitRoutes.name,
        origin: transitRoutes.origin,
        destination: transitRoutes.destination,
        via: transitRoutes.via,
        color: transitRoutes.color,
        operatingStart: transitRoutes.operatingStart,
        operatingEnd: transitRoutes.operatingEnd,
        fare: transitRoutes.fare,
        pathA: transitRoutes.pathA,
        pathB: transitRoutes.pathB,
        routeActive: transitRoutes.active,
        routeUpdatedAt: transitRoutes.updatedAt,
      })
      .from(vehicles)
      .leftJoin(transitRoutes, eq(vehicles.routeId, transitRoutes.id))
      .where(eq(vehicles.driverId, user.id))
      .limit(1);

    if (!vehicle) {
      return NextResponse.json({
        vehicle: null,
        route: null,
        position: null,
        pickups: [],
      });
    }

    const [position] = await db()
      .select({
        latitude: vehiclePositions.latitude,
        longitude: vehiclePositions.longitude,
        recordedAt: vehiclePositions.recordedAt,
      })
      .from(vehiclePositions)
      .where(eq(vehiclePositions.vehicleId, vehicle.id))
      .orderBy(desc(vehiclePositions.recordedAt))
      .limit(1);

    const pickups = vehicle.routeId
      ? await db()
          .select({
            id: pickupRequests.id,
            status: pickupRequests.status,
            direction: pickupRequests.direction,
            latitude: pickupRequests.latitude,
            longitude: pickupRequests.longitude,
            distanceToRouteMeters: pickupRequests.distanceToRouteMeters,
            createdAt: pickupRequests.createdAt,
            expiresAt: pickupRequests.expiresAt,
            passengerName: users.name,
            passengerPhone: users.phone,
            acceptedByVehicleId: pickupRequests.acceptedByVehicleId,
          })
          .from(pickupRequests)
          .innerJoin(users, eq(pickupRequests.passengerId, users.id))
          .where(
            and(
              eq(pickupRequests.routeId, vehicle.routeId),
              gt(pickupRequests.expiresAt, new Date()),
              or(
                eq(pickupRequests.status, 'WAITING'),
                and(
                  eq(pickupRequests.status, 'ACCEPTED'),
                  eq(pickupRequests.acceptedByVehicleId, vehicle.id),
                ),
              ),
            ),
          )
          .orderBy(desc(pickupRequests.createdAt))
      : [];

    return NextResponse.json({
      vehicle: {
        id: vehicle.id,
        plateNumber: vehicle.plateNumber,
        capacity: vehicle.capacity,
        status: vehicle.status,
      },
      route:
        vehicle.routeId && vehicle.routeCode
          ? {
              id: vehicle.routeId,
              code: vehicle.routeCode,
              name: vehicle.routeName,
              origin: vehicle.origin,
              destination: vehicle.destination,
              via: vehicle.via,
              color: vehicle.color,
              operatingStart: vehicle.operatingStart,
              operatingEnd: vehicle.operatingEnd,
              fare: vehicle.fare,
              pathA: vehicle.pathA,
              pathB: vehicle.pathB,
              active: vehicle.routeActive,
              updatedAt: vehicle.routeUpdatedAt,
              stops: 0,
              fleet: 1,
              activeVehicles: vehicle.status === 'ACTIVE' ? 1 : 0,
            }
          : null,
      position: position
        ? {
            ...position,
            locationFresh:
              Date.now() - position.recordedAt.getTime() <= 2 * 60_000,
          }
        : null,
      pickups,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Gagal memuat data operasional sopir.' },
      { status: 500 },
    );
  }
}

const statusInput = z.object({
  status: z.enum(['ACTIVE', 'RESTING']),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireRole(['DRIVER']);
    const parsed = statusInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Status operasional tidak valid.' },
        { status: 400 },
      );
    }
    const [vehicle] = await db()
      .update(vehicles)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(vehicles.driverId, user.id))
      .returning({ id: vehicles.id, status: vehicles.status });
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Akun sopir belum ditugaskan ke angkot.' },
        { status: 422 },
      );
    }
    return NextResponse.json({ vehicle });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Gagal memperbarui status operasional.' },
      { status: 500 },
    );
  }
}
