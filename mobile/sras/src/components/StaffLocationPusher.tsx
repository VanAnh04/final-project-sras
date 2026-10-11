import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { rescueApi, RescueStatus } from '../api/rescueApi';

const TRACKING_STATUSES: RescueStatus[] = [
  'ASSIGNED',
  'EN_ROUTE',
  'ARRIVED',
  'DIAGNOSED',
  'REPAIRING_ONSITE',
  'TOWING',
];

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Tự động đẩy vị trí GPS thời gian thực của nhân viên cứu hộ lên server.
 * Có cơ chế throttling (chỉ gửi khi di chuyển > 20m hoặc mỗi 15s) và concurrency guard
 * để tránh spam kết nối dẫn đến timeout hoặc deadlock.
 */
export default function StaffLocationPusher() {
  const curPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastPushedPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastPushTimeRef = useRef<number>(0);
  const isPushingRef = useRef<boolean>(false);
  const activeJobRef = useRef<{ id: number; status: RescueStatus } | null>(null);
  const lastJobFetchTimeRef = useRef<number>(0);

  useEffect(() => {
    let alive = true;
    let timer: any;

    const doPushGps = async () => {
      if (!alive || isPushingRef.current) return;

      const now = Date.now();
      const pos = curPosRef.current;
      if (!pos) return;

      // Kiểm tra xem đã đủ điều kiện push chưa:
      // 1. Lần đầu tiên có toạ độ
      // 2. Di chuyển cách vị trí cũ > 20 mét
      // 3. Đã trôi qua 15 giây kể từ lần push trước
      const lastPushed = lastPushedPosRef.current;
      const moved = !lastPushed || distanceMeters(lastPushed.lat, lastPushed.lng, pos.lat, pos.lng) >= 20;
      const elapsed = now - lastPushTimeRef.current >= 15000;

      if (!moved && !elapsed) return;

      isPushingRef.current = true;
      try {
        // Chỉ lấy lại active job nếu chưa có hoặc đã quá 20s
        if (!activeJobRef.current || now - lastJobFetchTimeRef.current >= 20000) {
          const job = await rescueApi.staffActive();
          lastJobFetchTimeRef.current = Date.now();
          if (job && TRACKING_STATUSES.includes(job.status)) {
            activeJobRef.current = { id: job.id, status: job.status };
          } else {
            activeJobRef.current = null;
          }
        }

        const currentJob = activeJobRef.current;
        if (currentJob && alive) {
          await rescueApi.updateLocation(currentJob.id, pos.lat, pos.lng);
          lastPushedPosRef.current = { lat: pos.lat, lng: pos.lng };
          lastPushTimeRef.current = Date.now();
        }
      } catch {
        /* Bỏ qua lỗi mạng, không làm crash app */
      } finally {
        isPushingRef.current = false;
      }
    };

    // Kiểm tra định kỳ mỗi 5s
    const loop = () => {
      doPushGps();
      if (alive) {
        timer = setTimeout(loop, 5000);
      }
    };

    loop();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Lắng nghe thay đổi toạ độ GPS từ phần cứng
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;

        // Lấy nhanh vị trí ban đầu
        try {
          const last = await Location.getLastKnownPositionAsync();
          if (last?.coords && !cancelled) {
            curPosRef.current = { lat: last.coords.latitude, lng: last.coords.longitude };
          }
        } catch {}

        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
          (pos) => {
            if (cancelled || !pos?.coords) return;
            curPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          }
        );
      } catch {}
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return null;
}
