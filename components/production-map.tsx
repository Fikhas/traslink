'use client';

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MlMap, Marker } from 'maplibre-gl';
import type { RoutePoint } from '@/db/schema';

type VehiclePin = {
  id: string;
  latitude: number;
  longitude: number;
  label?: string;
};
type PickupPin = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
};
type FocusPoint = RoutePoint & { id: number; label: string };

export default function ProductionMap({
  path = [],
  color = '#ff5a47',
  vehicles = [],
  pickups = [],
  editable = false,
  onPathChange,
  fitKey,
  focusPoint,
  className = '',
}: {
  path?: RoutePoint[];
  color?: string;
  vehicles?: VehiclePin[];
  pickups?: PickupPin[];
  editable?: boolean;
  onPathChange?: (path: RoutePoint[]) => void;
  fitKey?: string;
  focusPoint?: FocusPoint | null;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const editorMarkers = useRef<Marker[]>([]);
  const focusMarker = useRef<Marker | null>(null);
  const pathRef = useRef(path);
  const onPathChangeRef = useRef(onPathChange);
  const fitKeyRef = useRef(fitKey);
  const lastFitKey = useRef<string | undefined>(undefined);
  const initialConfig = useRef({ color, editable, path });

  useEffect(() => {
    pathRef.current = path;
    onPathChangeRef.current = onPathChange;
    fitKeyRef.current = fitKey;
  }, [fitKey, path, onPathChange]);

  // MapLibre owns this imperative instance for the lifetime of the DOM node.
  useEffect(() => {
    if (!el.current || map.current) return;
    const config = initialConfig.current;
    maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
    const center = config.path[0] ?? { lng: 107.6191, lat: -6.9175 };
    const instance = new maplibregl.Map({
      container: el.current,
      style:
        process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
        'https://tiles.openfreemap.org/styles/liberty',
      center: [center.lng, center.lat],
      zoom: 13.2,
      attributionControl: { compact: true },
    });
    map.current = instance;
    instance.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      'bottom-right',
    );
    instance.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'bottom-right',
    );
    instance.on('load', () => {
      instance.addSource('route', {
        type: 'geojson',
        data: routeGeoJson(pathRef.current),
      });
      instance.addLayer({
        id: 'route-shadow',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#fff', 'line-width': 12, 'line-opacity': 0.9 },
      });
      instance.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        paint: { 'line-color': config.color, 'line-width': 7 },
      });
      if (pathRef.current.length > 1) {
        fitMapToPath(instance, pathRef.current);
        lastFitKey.current = fitKeyRef.current;
      }
    });
    if (config.editable) {
      instance.getCanvas().style.cursor = 'crosshair';
      instance.on('click', (event) => {
        onPathChangeRef.current?.([
          ...pathRef.current,
          { lng: event.lngLat.lng, lat: event.lngLat.lat },
        ]);
      });
    }
    return () => {
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance?.isStyleLoaded()) return;
    const source = instance.getSource('route') as GeoJSONSource | undefined;
    source?.setData(routeGeoJson(path));
    if (path.length > 1 && lastFitKey.current !== fitKey) {
      fitMapToPath(instance, path);
      lastFitKey.current = fitKey;
    }
  }, [fitKey, path]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !focusPoint) return;
    focusMarker.current?.remove();
    const node = document.createElement('div');
    node.className = 'location-search-marker';
    node.title = focusPoint.label;
    focusMarker.current = new maplibregl.Marker({ element: node })
      .setLngLat([focusPoint.lng, focusPoint.lat])
      .addTo(instance);
    instance.flyTo({
      center: [focusPoint.lng, focusPoint.lat],
      zoom: 16,
      duration: 700,
    });
  }, [focusPoint]);

  useEffect(() => {
    editorMarkers.current.forEach((marker) => marker.remove());
    editorMarkers.current = [];
    const instance = map.current;
    if (!instance || !editable) return;
    path.forEach((point, index) => {
      const node = document.createElement('button');
      const endpoint = index === 0 || index === path.length - 1;
      node.type = 'button';
      node.className = `route-point-marker${endpoint ? ' route-point-marker--endpoint' : ''}`;
      node.textContent =
        index === 0 ? 'A' : index === path.length - 1 ? 'B' : String(index + 1);
      node.title = `Titik ${index + 1}: geser untuk mengubah, klik dua kali untuk menghapus`;
      node.setAttribute('aria-label', node.title);
      node.addEventListener('click', (event) => event.stopPropagation());
      node.addEventListener('dblclick', (event) => {
        event.stopPropagation();
        onPathChangeRef.current?.(
          pathRef.current.filter((_, pointIndex) => pointIndex !== index),
        );
      });
      const marker = new maplibregl.Marker({ element: node, draggable: true })
        .setLngLat([point.lng, point.lat])
        .addTo(instance);
      marker.on('dragend', () => {
        const nextPath = [...pathRef.current];
        const position = marker.getLngLat();
        nextPath[index] = { lng: position.lng, lat: position.lat };
        onPathChangeRef.current?.(nextPath);
      });
      editorMarkers.current.push(marker);
    });
  }, [editable, path]);

  useEffect(() => {
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    const instance = map.current;
    if (!instance) return;
    for (const vehicle of vehicles) {
      const node = document.createElement('div');
      node.className = 'live-vehicle-marker';
      node.textContent = '🚌';
      node.title = vehicle.label ?? vehicle.id;
      markers.current.push(
        new maplibregl.Marker({ element: node })
          .setLngLat([vehicle.longitude, vehicle.latitude])
          .addTo(instance),
      );
    }
    for (const pickup of pickups) {
      const node = document.createElement('div');
      node.className = 'live-pickup-marker';
      node.textContent = pickup.label;
      markers.current.push(
        new maplibregl.Marker({ element: node })
          .setLngLat([pickup.longitude, pickup.latitude])
          .addTo(instance),
      );
    }
    if (
      path.length > 1 &&
      vehicles.some(
        (vehicle) =>
          !instance.getBounds().contains([vehicle.longitude, vehicle.latitude]),
      )
    ) {
      fitMapToPath(instance, [
        ...path,
        ...vehicles.map((vehicle) => ({
          lng: vehicle.longitude,
          lat: vehicle.latitude,
        })),
      ]);
    }
  }, [path, vehicles, pickups]);

  return (
    <div
      ref={el}
      className={`h-full w-full ${className}`}
      aria-label="Peta angkutan umum interaktif"
    />
  );
}

function fitMapToPath(instance: MlMap, path: RoutePoint[]) {
  const coordinates = path.map(
    (point) => [point.lng, point.lat] as [number, number],
  );
  instance.fitBounds(
    coordinates.reduce(
      (bounds, coordinate) => bounds.extend(coordinate),
      new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
    ),
    { padding: 90, maxZoom: 14, duration: 0 },
  );
}

function routeGeoJson(path: RoutePoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features:
      path.length > 1
        ? [
            {
              type: 'Feature' as const,
              properties: {},
              geometry: {
                type: 'LineString' as const,
                coordinates: path.map((point) => [point.lng, point.lat]),
              },
            },
          ]
        : [],
  };
}
