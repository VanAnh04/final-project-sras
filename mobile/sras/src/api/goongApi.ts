import { GOONG_API_KEY } from '../config/goong';

// Goong REST API (KHÔNG dùng axiosClient vì đó trỏ về backend + gắn JWT).
const BASE = 'https://rsapi.goong.io';

export interface GoongPrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface GoongPlace {
  lat: number;
  lng: number;
  address: string;
}

/** Gợi ý địa chỉ khi khách gõ vào thanh search. `location` để ưu tiên kết quả gần đó. */
async function autocomplete(input: string, location?: { lat: number; lng: number }): Promise<GoongPrediction[]> {
  const q = input.trim();
  if (!q) return [];
  const params = new URLSearchParams({ api_key: GOONG_API_KEY, input: q });
  if (location) params.append('location', `${location.lat},${location.lng}`);
  const res = await fetch(`${BASE}/Place/AutoComplete?${params.toString()}`);
  const data = await res.json();
  return (data.predictions ?? []).map((p: any) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? '',
  }));
}

/** Đổi place_id (từ autocomplete) thành toạ độ + địa chỉ đầy đủ. */
async function placeDetail(placeId: string): Promise<GoongPlace | null> {
  const params = new URLSearchParams({ api_key: GOONG_API_KEY, place_id: placeId });
  const res = await fetch(`${BASE}/Place/Detail?${params.toString()}`);
  const data = await res.json();
  const r = data.result;
  const loc = r?.geometry?.location;
  if (!loc) return null;
  return { lat: loc.lat, lng: loc.lng, address: r.formatted_address ?? r.name ?? '' };
}

/** Toạ độ → địa chỉ (hiện tên đường dưới ghim khi kéo map). */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const params = new URLSearchParams({ api_key: GOONG_API_KEY, latlng: `${lat},${lng}` });
  const res = await fetch(`${BASE}/Geocode?${params.toString()}`);
  const data = await res.json();
  return data.results?.[0]?.formatted_address ?? '';
}

export interface GoongRoute {
  /** Toạ độ tuyến đường dạng [lng, lat] (để vẽ lên goong-js). */
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
}

/** Giải mã encoded polyline (Google/Goong) → mảng [lng, lat]. */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lng / 1e5, lat / 1e5]);
  }
  return points;
}

/** Lộ trình xe → khách. `vehicle`: 'car' | 'bike'. */
async function directions(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  vehicle: 'car' | 'bike' = 'car'
): Promise<GoongRoute | null> {
  const params = new URLSearchParams({
    api_key: GOONG_API_KEY,
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    vehicle,
  });
  const res = await fetch(`${BASE}/Direction?${params.toString()}`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) return null;
  const encoded = route.overview_polyline?.points;
  const leg = route.legs?.[0];
  return {
    coordinates: encoded ? decodePolyline(encoded) : [],
    distanceKm: leg?.distance?.value ? leg.distance.value / 1000 : 0,
    durationMin: leg?.duration?.value ? Math.round(leg.duration.value / 60) : 0,
  };
}

export const goongApi = { autocomplete, placeDetail, reverseGeocode, directions };
