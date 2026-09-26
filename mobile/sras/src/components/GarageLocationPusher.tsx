import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { garageApi } from '../api/garageApi';
import { RescueStatus } from '../api/rescueApi';

const LIVE_STATUSES: RescueStatus[] = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED'];

/**
 * TẠM THỜI: đẩy vị trí thiết bị làm vị trí xe cứu hộ cho các đơn đang xử lý của gara,
 * để khách theo dõi được vị trí trên map. Chạy nền ở mọi màn của gara (mount trong layout).
 * Khi có app nhân viên riêng, chuyển phần này sang app nhân viên và bỏ ở đây.
 */
export default function GarageLocationPusher() {
  const liveIdsRef = useRef<number[]>([]);

  // Poll danh sách đơn active để biết id cần đẩy vị trí.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const active = await garageApi.listActive();
        if (alive) liveIdsRef.current = active.filter((r) => LIVE_STATUSES.includes(r.status)).map((r) => r.id);
      } catch {
        /* bỏ qua lỗi mạng */
      }
    };
    tick();
    const timer = setInterval(tick, 6000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // Theo dõi GPS và đẩy lên cho các đơn đang xử lý.
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 15 },
        (pos) => {
          const ids = liveIdsRef.current;
          if (ids.length === 0) return;
          const { latitude, longitude } = pos.coords;
          ids.forEach((id) => garageApi.pushLocation(id, latitude, longitude).catch(() => {}));
        }
      );
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return null;
}
