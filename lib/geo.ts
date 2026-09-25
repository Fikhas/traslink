import type { RoutePoint } from '@/db/schema';

const R = 6371000;
const rad = (n: number) => n * Math.PI / 180;
export function haversine(a: RoutePoint, b: RoutePoint) {
  const dLat=rad(b.lat-a.lat), dLng=rad(b.lng-a.lng); const x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
export function distanceToRoute(point: RoutePoint, path: RoutePoint[]) {
  return Math.min(...path.map(p=>haversine(point,p)));
}
