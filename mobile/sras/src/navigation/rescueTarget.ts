import { useMemo } from 'react';
import type { RescueRequestDto } from '../api/rescueApi';
import type { LatLng } from './routeGeometry';

// Đến nơi khách rồi thì đường tới khách không còn ý nghĩa.
const TO_CUSTOMER_STATUSES = ['ACCEPTED', 'ASSIGNED', 'EN_ROUTE'];

type RescueJob = Pick<RescueRequestDto, 'status' | 'pickupLat' | 'pickupLng' | 'meetLat' | 'meetLng' | 'garage'>;

function toLatLng(lat?: number | null, lng?: number | null): LatLng | null {
  return lat != null && lng != null ? { lat, lng } : null;
}

/** Xe cứu hộ đang đi đâu theo trạng thái đơn. Khách và nhân viên phải luôn thấy cùng một điểm đến. */
export function useRescueTarget(job: RescueJob | null | undefined) {
  const status = job?.status;
  const pickupLat = job?.pickupLat;
  const pickupLng = job?.pickupLng;
  const meetLat = job?.meetLat;
  const meetLng = job?.meetLng;
  const garageLat = job?.garage?.lat;
  const garageLng = job?.garage?.lng;

  return useMemo(() => {
    const pickup = toLatLng(pickupLat, pickupLng);
    const meet = toLatLng(meetLat, meetLng);
    const garage = toLatLng(garageLat, garageLng);
    const towing = status === 'TOWING';
    const atGarageEnd = towing || status === 'TOW_TO_GARAGE';
    return {
      towing,
      /** Đích của lộ trình; null khi xe không di chuyển theo tuyến nào. */
      routeTo: towing ? garage : status && TO_CUSTOMER_STATUSES.includes(status) ? (meet ?? pickup) : null,
      /** Vị trí ghim đích trên bản đồ. Khách đi chỗ khác thì ghim vẫn giữ nơi báo hỏng xe. */
      marker: atGarageEnd ? (garage ?? pickup) : pickup,
      /** Vị trí xuất phát dự kiến khi chưa có GPS. */
      startFrom: towing ? pickup : garage,
    };
  }, [status, pickupLat, pickupLng, meetLat, meetLng, garageLat, garageLng]);
}
