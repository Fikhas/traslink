import { boolean, index, integer, jsonb, pgEnum, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['ADMIN', 'DRIVER', 'PASSENGER']);
export const vehicleStatus = pgEnum('vehicle_status', ['ACTIVE', 'RESTING', 'MAINTENANCE', 'INACTIVE']);
export const pickupStatus = pgEnum('pickup_status', ['WAITING', 'ACCEPTED', 'PICKED_UP', 'CANCELLED', 'EXPIRED']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  phone: text('phone'),
  role: userRole('role').notNull().default('PASSENGER'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('sessions_user_idx').on(table.userId), index('sessions_expiry_idx').on(table.expiresAt)]);

export type RoutePoint = { lng: number; lat: number };
export const transitRoutes = pgTable('transit_routes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  via: text('via').notNull(),
  color: text('color').notNull().default('#ff5a47'),
  operatingStart: text('operating_start').notNull().default('05:00'),
  operatingEnd: text('operating_end').notNull().default('21:00'),
  fare: integer('fare').notNull().default(5000),
  pathA: jsonb('path_a').$type<RoutePoint[]>().notNull(),
  pathB: jsonb('path_b').$type<RoutePoint[]>().notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const stops = pgTable('stops', {
  id: uuid('id').defaultRandom().primaryKey(),
  routeId: uuid('route_id').notNull().references(() => transitRoutes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sequence: integer('sequence').notNull(),
  direction: text('direction').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
}, (table) => [index('stops_route_idx').on(table.routeId)]);

export const gpsDevices = pgTable('gps_devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  deviceCode: text('device_code').notNull().unique(),
  imei: text('imei').notNull().unique(),
  apiKeyHash: text('api_key_hash'),
  active: boolean('active').notNull().default(true),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vehicles = pgTable('vehicles', {
  id: uuid('id').defaultRandom().primaryKey(),
  plateNumber: text('plate_number').notNull().unique(),
  capacity: integer('capacity').notNull().default(12),
  routeId: uuid('route_id').references(() => transitRoutes.id, { onDelete: 'set null' }),
  driverId: uuid('driver_id').references(() => users.id, { onDelete: 'set null' }),
  gpsDeviceId: uuid('gps_device_id').references(() => gpsDevices.id, { onDelete: 'set null' }),
  status: vehicleStatus('status').notNull().default('INACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('vehicles_route_idx').on(table.routeId), index('vehicles_driver_idx').on(table.driverId)]);

export const vehiclePositions = pgTable('vehicle_positions', {
  id: uuid('id').defaultRandom().primaryKey(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  heading: real('heading'),
  speedKph: real('speed_kph'),
  accuracyMeters: real('accuracy_meters'),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('positions_vehicle_time_idx').on(table.vehicleId, table.recordedAt)]);

export const pickupRequests = pgTable('pickup_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  passengerId: uuid('passenger_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  routeId: uuid('route_id').notNull().references(() => transitRoutes.id, { onDelete: 'cascade' }),
  direction: text('direction').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  distanceToRouteMeters: real('distance_to_route_meters').notNull(),
  status: pickupStatus('status').notNull().default('WAITING'),
  acceptedByVehicleId: uuid('accepted_by_vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('pickups_route_status_idx').on(table.routeId, table.status), index('pickups_passenger_idx').on(table.passengerId)]);

