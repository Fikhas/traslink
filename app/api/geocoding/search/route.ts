import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';

const input = z.string().trim().min(3).max(120);
const cache = new Map<
  string,
  { expiresAt: number; results: LocationSearchResult[] }
>();
let lastRequestAt = 0;
let requestQueue: Promise<void> = Promise.resolve();

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
};

type LocationSearchResult = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
};

async function searchNominatim(query: string, referer: string) {
  let releaseQueue = () => {};
  const previousRequest = requestQueue;
  requestQueue = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });
  await previousRequest;

  try {
    const delay = Math.max(0, 1_000 - (Date.now() - lastRequestAt));
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    lastRequestAt = Date.now();

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '5');
    url.searchParams.set('countrycodes', 'id');
    url.searchParams.set('viewbox', '107.45,-6.75,107.85,-7.15');
    url.searchParams.set('accept-language', 'id');

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Referer: referer,
        'User-Agent':
          process.env.NOMINATIM_USER_AGENT ||
          'Traslink/0.1 (route-planning dashboard)',
      },
      cache: 'no-store',
    });
    if (!response.ok)
      throw new Error('Layanan pencarian lokasi tidak tersedia.');
    const data = (await response.json()) as NominatimResult[];
    return data.flatMap((item) => {
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      return Number.isFinite(lat) && Number.isFinite(lng)
        ? [
            {
              id: String(item.place_id),
              name: item.display_name,
              lat,
              lng,
              type: item.type ?? 'lokasi',
            },
          ]
        : [];
    });
  } finally {
    releaseQueue();
  }
}

export async function GET(request: Request) {
  try {
    await requireRole(['ADMIN']);
    const query = input.safeParse(new URL(request.url).searchParams.get('q'));
    if (!query.success)
      return NextResponse.json(
        { error: 'Masukkan minimal 3 karakter untuk mencari lokasi.' },
        { status: 400 },
      );

    const key = query.data.toLocaleLowerCase('id-ID');
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now())
      return NextResponse.json({ results: cached.results });

    const results = await searchNominatim(
      query.data,
      new URL(request.url).origin,
    );
    cache.set(key, { expiresAt: Date.now() + 60 * 60_000, results });
    return NextResponse.json(
      { results },
      { headers: { 'Cache-Control': 'private, max-age=3600' } },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Gagal mencari lokasi. Coba lagi beberapa saat.',
      },
      { status: 502 },
    );
  }
}
