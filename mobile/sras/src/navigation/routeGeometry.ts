// Hình học lộ trình dùng cho dẫn đường. Toạ độ tuyến là [lng, lat] (giống goong-js).

export type LngLat = [number, number];

export interface LatLng {
  lat: number;
  lng: number;
}

/** Tuyến đường kèm quãng đường cộng dồn tới từng đỉnh (mét). */
export interface RouteIndex {
  coords: LngLat[];
  cumM: number[];
  totalM: number;
}

export interface RouteProjection extends LatLng {
  /** Quãng đường từ đầu tuyến tới điểm chiếu (mét). */
  alongM: number;
  /** Khoảng cách từ vị trí thật tới tuyến (mét). */
  offsetM: number;
}

const EARTH_RADIUS_M = 6371000;
// Mỗi mét xa điểm dự kiến bị tính như lệch thêm 0,2 mét khỏi đường.
const EXPECTED_ALONG_WEIGHT = 0.2;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Hướng từ a tới b, 0–360 độ tính từ Bắc theo chiều kim đồng hồ. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const vertex = (c: LngLat): LatLng => ({ lat: c[1], lng: c[0] });

export function buildRouteIndex(coords: LngLat[]): RouteIndex {
  const cumM = [0];
  for (let i = 1; i < coords.length; i++) {
    cumM.push(cumM[i - 1] + distanceM(vertex(coords[i - 1]), vertex(coords[i])));
  }
  return { coords, cumM, totalM: cumM[cumM.length - 1] ?? 0 };
}

/** Điểm nằm trên tuyến cách đầu tuyến `alongM` mét (tự kẹp vào đầu/cuối tuyến). */
export function pointAlong(route: RouteIndex, alongM: number): LatLng {
  const { coords, cumM, totalM } = route;
  if (alongM <= 0) return vertex(coords[0]);
  if (alongM >= totalM) return vertex(coords[coords.length - 1]);
  let lo = 0;
  let hi = cumM.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cumM[mid] <= alongM) lo = mid;
    else hi = mid;
  }
  const span = cumM[hi] - cumM[lo];
  const t = span > 0 ? (alongM - cumM[lo]) / span : 0;
  return {
    lat: coords[lo][1] + (coords[hi][1] - coords[lo][1]) * t,
    lng: coords[lo][0] + (coords[hi][0] - coords[lo][0]) * t,
  };
}

/**
 * Chiếu vị trí lên đoạn tuyến trong khoảng [fromM, toM]. Tuyến đi vào rồi quay đầu trên cùng con đường
 * (hẻm cụt) có hai điểm trùng nhau: giới hạn khoảng tìm và ưu tiên điểm gần `expectedM` để không
 * bám nhầm sang chiều ngược lại.
 */
export function projectOnRoute(
  route: RouteIndex,
  p: LatLng,
  fromM = 0,
  toM = route.totalM,
  expectedM?: number
): RouteProjection | null {
  const { coords, cumM } = route;
  // Mặt phẳng cục bộ quanh p: đủ chính xác ở quy mô một đoạn đường.
  const mPerLat = (Math.PI / 180) * EARTH_RADIUS_M;
  const mPerLng = mPerLat * Math.cos(toRad(p.lat));
  let best: RouteProjection | null = null;
  let bestScore = Infinity;

  for (let i = 0; i + 1 < coords.length; i++) {
    if (cumM[i + 1] < fromM) continue;
    if (cumM[i] > toM) break;
    const ax = (coords[i][0] - p.lng) * mPerLng;
    const ay = (coords[i][1] - p.lat) * mPerLat;
    const dx = (coords[i + 1][0] - p.lng) * mPerLng - ax;
    const dy = (coords[i + 1][1] - p.lat) * mPerLat - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq > 0 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lenSq)) : 0;
    const offsetM = Math.hypot(ax + dx * t, ay + dy * t);
    const alongM = cumM[i] + (cumM[i + 1] - cumM[i]) * t;
    const score = offsetM + (expectedM == null ? 0 : Math.abs(alongM - expectedM) * EXPECTED_ALONG_WEIGHT);
    if (score < bestScore) {
      bestScore = score;
      best = {
        alongM,
        offsetM,
        lat: coords[i][1] + (coords[i + 1][1] - coords[i][1]) * t,
        lng: coords[i][0] + (coords[i + 1][0] - coords[i][0]) * t,
      };
    }
  }
  return best;
}
