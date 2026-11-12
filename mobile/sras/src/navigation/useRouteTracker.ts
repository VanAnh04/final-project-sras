import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WebView } from 'react-native-webview';
import { goongApi, GoongRoute } from '../api/goongApi';
import { GpsFix, NavFrame, NavigationTracker } from './NavigationTracker';
import { distanceM, LatLng } from './routeGeometry';

// Giãn cách giữa các lần gọi Goong Directions, tránh tốn quota khi GPS chập chờn.
const ROUTE_REQUEST_COOLDOWN_MS = 8000;
// Ước lượng khi không có tuyến thật: khoảng 20 km/h trong phố.
const STRAIGHT_LINE_SEC_PER_KM = 180;

export interface NavRouteInfo {
  distanceKm: number;
  durationMin: number;
}

interface Options {
  webRef: RefObject<WebView | null>;
  /** null thì không có lộ trình, bản đồ xoá đường đang vẽ. */
  destination: LatLng | null;
  /** Điểm xuất phát cho tuyến đầu tiên, khi chưa có vị trí nào được đẩy vào. */
  origin: LatLng | null;
  vehicle: 'car' | 'bike';
  /** Goong lỗi thì vẽ đường thẳng tới đích thay vì để trống bản đồ. */
  straightLineFallback?: boolean;
}

function toRouteInfo(frame: NavFrame): NavRouteInfo {
  return {
    distanceKm: Math.round(frame.remainingM / 100) / 10,
    durationMin: Math.ceil(frame.remainingSec / 60),
  };
}

function straightLineRoute(from: LatLng, to: LatLng): GoongRoute {
  const distanceKm = distanceM(from, to) / 1000;
  const durationSec = distanceKm * STRAIGHT_LINE_SEC_PER_KM;
  return {
    coordinates: [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ],
    distanceKm,
    durationMin: Math.max(1, Math.round(durationSec / 60)),
    durationSec,
    steps: [],
  };
}

/**
 * Giữ lộ trình tới một điểm đến và bám các vị trí nhận được vào đó (buildNavMapHtml).
 * Chỉ gọi lại Goong khi chưa có tuyến hoặc xe đã lệch tuyến, không gọi theo quãng đường đi được.
 */
export function useRouteTracker({ webRef, destination, origin, vehicle, straightLineFallback = false }: Options) {
  const tracker = useMemo(() => new NavigationTracker(), []);
  const destinationKey = destination ? `${destination.lat},${destination.lng}` : null;
  // Gắn với điểm đến để đổi điểm đến là thông tin tuyến cũ tự mất hiệu lực.
  const [routeState, setRouteState] = useState<{ key: string; info: NavRouteInfo } | null>(null);
  const routeInfo = routeState && routeState.key === destinationKey ? routeState.info : null;

  const lastFrameRef = useRef<NavFrame | null>(null);
  // Tăng mỗi khi đổi điểm đến, để bỏ kết quả của lần gọi Goong đã lỗi thời.
  const generationRef = useRef(0);
  const requestingRef = useRef(false);
  const lastRequestAtRef = useRef(0);

  const callMap = useCallback(
    (fn: string, ...args: unknown[]) => {
      const params = args.map((a) => JSON.stringify(a)).join(', ');
      webRef.current?.injectJavaScript(`window.${fn} && window.${fn}(${params}); true;`);
    },
    [webRef]
  );

  const sendRoute = useCallback(() => {
    const route = tracker.routeIndex;
    callMap('setRoute', route?.coords ?? null, route?.cumM ?? null);
  }, [callMap, tracker]);

  const requestRoute = useCallback(
    async (from: LatLng) => {
      const now = Date.now();
      if (!destination || !destinationKey || requestingRef.current || now - lastRequestAtRef.current < ROUTE_REQUEST_COOLDOWN_MS) return;
      const generation = generationRef.current;
      requestingRef.current = true;
      lastRequestAtRef.current = now;
      try {
        let route = await goongApi.directions(from, destination, vehicle).catch(() => null);
        if (generation !== generationRef.current) return;
        if (!route && straightLineFallback && tracker.needsRoute) route = straightLineRoute(from, destination);
        // Không có gì mới thì giữ tuyến cũ, lần sau sẽ thử lại.
        if (!route) return;
        tracker.setRoute(route);
        setRouteState({
          key: destinationKey,
          info: { distanceKm: route.distanceKm, durationMin: route.durationMin },
        });
        sendRoute();
      } finally {
        if (generation === generationRef.current) requestingRef.current = false;
      }
    },
    [destination, destinationKey, sendRoute, straightLineFallback, tracker, vehicle]
  );

  useEffect(() => {
    tracker.reset();
    generationRef.current++;
    requestingRef.current = false;
    lastRequestAtRef.current = 0;
    lastFrameRef.current = null;
    sendRoute();
  }, [destinationKey, sendRoute, tracker]);

  const hasRoute = routeInfo != null;
  const originLat = origin?.lat;
  const originLng = origin?.lng;
  useEffect(() => {
    if (originLat != null && originLng != null && !hasRoute) requestRoute({ lat: originLat, lng: originLng });
  }, [originLat, originLng, hasRoute, requestRoute]);

  const pushFix = useCallback(
    (fix: GpsFix) => {
      const frame = tracker.update(fix);
      lastFrameRef.current = frame;
      callMap('navFrame', frame);
      if (tracker.needsRoute) {
        requestRoute(fix);
      } else if (destinationKey) {
        const info = toRouteInfo(frame);
        // Hai màn dùng hook này đều nặng, chỉ render lại khi số hiển thị thật sự đổi.
        setRouteState((prev) =>
          prev?.key === destinationKey &&
          prev.info.distanceKm === info.distanceKm &&
          prev.info.durationMin === info.durationMin
            ? prev
            : { key: destinationKey, info }
        );
      }
    },
    [callMap, destinationKey, requestRoute, tracker]
  );

  /** Trang bản đồ vừa tải (hoặc tải lại): gửi lại toàn bộ trạng thái. */
  const onMapLoadEnd = useCallback(() => {
    sendRoute();
    if (lastFrameRef.current) callMap('navFrame', lastFrameRef.current);
  }, [callMap, sendRoute]);

  return { routeInfo, pushFix, callMap, onMapLoadEnd };
}
