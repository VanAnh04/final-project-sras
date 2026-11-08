import { RefObject, useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { LatLng } from './routeGeometry';
import { useRouteTracker } from './useRouteTracker';

const KEEP_AWAKE_TAG = 'rescue-navigation';
const GPS_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 1000,
  distanceInterval: 2,
};

interface Options {
  webRef: RefObject<WebView | null>;
  /** null thì không có lộ trình, bản đồ xoá đường đang vẽ. */
  destination: LatLng | null;
  /** Điểm xuất phát cho tuyến đầu tiên, khi chưa bật dẫn đường. */
  origin: LatLng | null;
  vehicle: 'car' | 'bike';
  /** Bật camera bám xe và GPS tần suất cao. */
  navigating: boolean;
}

/** Dẫn đường cho nhân viên: GPS của máy, camera bám xe, giữ màn hình sáng. */
export function useRescueNavigation({ webRef, destination, origin, vehicle, navigating }: Options) {
  const { routeInfo, pushFix, callMap, onMapLoadEnd: resendToMap } = useRouteTracker({
    webRef,
    destination,
    origin,
    vehicle,
  });
  const [following, setFollowing] = useState(true);
  const hasDestination = destination != null;

  useEffect(() => {
    if (!navigating || !hasDestination) return;
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});

    const onFix = (pos: Location.LocationObject) => {
      if (cancelled) return;
      pushFix({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      });
    };

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const watch = await Location.watchPositionAsync(GPS_OPTIONS, onFix);
        if (cancelled) watch.remove();
        else sub = watch;
      } catch {}
    })();

    return () => {
      cancelled = true;
      sub?.remove();
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
      callMap('setNavMode', 'overview');
    };
  }, [navigating, hasDestination, callMap, pushFix]);

  const recenter = useCallback(() => {
    setFollowing(true);
    callMap('setFollow', true);
  }, [callMap]);

  const onMapMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg?.type === 'follow') setFollowing(!!msg.value);
    } catch {}
  }, []);

  /** Trang mới tải thì camera luôn bám xe. */
  const onMapLoadEnd = useCallback(() => {
    resendToMap();
    setFollowing(true);
  }, [resendToMap]);

  return { routeInfo, following, recenter, onMapMessage, onMapLoadEnd };
}
