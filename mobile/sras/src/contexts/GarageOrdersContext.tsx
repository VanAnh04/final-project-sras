import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { garageApi } from '../api/garageApi';
import { RescueRequestDto } from '../api/rescueApi';

const POLL_MS = 5000;

interface GarageOrders {
  /** Lời mời chờ nhận (garageApi.listOffers). */
  offers: RescueRequestDto[];
  /** Đơn gara đang xử lý (garageApi.listActive). */
  active: RescueRequestDto[];
  /** true tới khi lần tải đầu tiên xong. */
  loading: boolean;
  /** Tải lại ngay (dùng sau khi nhận đơn / gán nhân viên). */
  refresh: () => Promise<void>;
}

const GarageOrdersContext = createContext<GarageOrders>({
  offers: [],
  active: [],
  loading: true,
  refresh: async () => {},
});

/**
 * Nguồn duy nhất cho offers + active của gara: popup nhận đơn và màn Đơn hàng cùng dùng chung.
 * Gọi định kỳ 5s bằng setTimeout nối tiếp (không chồng request), dừng khi app xuống nền.
 */
export function GarageOrdersProvider({ children }: { children: ReactNode }) {
  const [offers, setOffers] = useState<RescueRequestDto[]>([]);
  const [active, setActive] = useState<RescueRequestDto[]>([]);
  const [loading, setLoading] = useState(true);

  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const [o, a] = await Promise.all([garageApi.listOffers(), garageApi.listActive()]);
      if (!aliveRef.current) return;
      setOffers(o || []);
      setActive(a || []);
    } catch {
      /* lỗi mạng tạm thời — giữ dữ liệu cũ */
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;

    // Gọi xong (thành công hay lỗi) mới hẹn lần sau; chỉ chạy khi app đang ở foreground.
    const loop = async () => {
      await refresh();
      if (!aliveRef.current || AppState.currentState !== 'active') return;
      clearTimer();
      timerRef.current = setTimeout(loop, POLL_MS);
    };

    if (AppState.currentState === 'active') loop();

    const subscription = AppState.addEventListener('change', (state) => {
      clearTimer();
      if (state === 'active') loop();
    });

    return () => {
      aliveRef.current = false;
      clearTimer();
      subscription.remove();
    };
  }, [refresh]);

  const value = useMemo(() => ({ offers, active, loading, refresh }), [offers, active, loading, refresh]);

  return <GarageOrdersContext.Provider value={value}>{children}</GarageOrdersContext.Provider>;
}

export const useGarageOrders = () => useContext(GarageOrdersContext);
