import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import * as Location from 'expo-location';
import { rescueApi, RescueRequestDto, RescueStatus } from '../api/rescueApi';
import { distanceM, LatLng } from './routeGeometry';

const SHARE_STATUSES: RescueStatus[] = ['ASSIGNED', 'EN_ROUTE'];
const GPS_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
  timeInterval: 5000,
  distanceInterval: 5,
};
// Khách thường đứng yên, nên không gửi theo từng điểm GPS mà gửi khi đi đủ xa hoặc tới nhịp giữ kết nối.
const PUSH_MIN_MOVE_M = 15;
const PUSH_HEARTBEAT_MS = 15000;
const PUSH_CHECK_MS = 5000;

interface ShareState {
  requestId: number | null;
  position: LatLng | null;
}

/**
 * Giữ việc chia sẻ ngoài vòng đời màn hình, để khách chuyển sang màn khác trong app vẫn tiếp tục gửi.
 * Chỉ dùng quyền vị trí khi mở app: app xuống nền thì ngừng và nhân viên thấy vị trí đã cũ.
 */
class CustomerLocationShare {
  private state: ShareState = { requestId: null, position: null };
  private listeners = new Set<() => void>();
  private watch: Location.LocationSubscription | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private fix: (LatLng & { accuracy: number | null }) | null = null;
  private lastPushed: LatLng | null = null;
  private lastPushAt = 0;
  private inflight: Promise<void> | null = null;
  // Tăng mỗi lần bật/tắt, để lần bật đang chờ quyền GPS biết mình đã bị huỷ.
  private session = 0;

  getState = () => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private setState(next: ShareState) {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }

  /** Trả false khi chưa có quyền vị trí hoặc GPS đang tắt. */
  async start(requestId: number): Promise<boolean> {
    const previous = this.state.requestId;
    if (previous === requestId) return true;
    if (previous != null) await this.stop();

    const session = ++this.session;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || session !== this.session) return false;
      const watch = await Location.watchPositionAsync(GPS_OPTIONS, (pos) => {
        if (session !== this.session) return;
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        this.fix = { lat, lng, accuracy: accuracy ?? null };
        this.setState({ requestId, position: { lat, lng } });
        void this.push();
      });
      if (session !== this.session) {
        watch.remove();
        return false;
      }
      this.watch = watch;
    } catch {
      return false;
    }

    // Điểm GPS đầu tiên có thể đã tới trước khi watchPositionAsync trả về.
    if (this.state.requestId !== requestId) this.setState({ requestId, position: null });
    this.timer = setInterval(() => void this.push(), PUSH_CHECK_MS);
    return true;
  }

  async stop() {
    const requestId = this.state.requestId;
    this.end();
    if (requestId == null) return;
    // Lần gửi đang chạy dở mà tới sau lệnh tắt thì sẽ ghi lại vị trí vừa xoá.
    await this.inflight;
    await rescueApi.stopCustomerLocation(requestId).catch(() => {});
  }

  /** Ngừng ở máy, không báo server: đơn đã qua giai đoạn chia sẻ thì server tự xoá vị trí. */
  end() {
    this.session++;
    this.watch?.remove();
    this.watch = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.fix = null;
    this.lastPushed = null;
    this.lastPushAt = 0;
    if (this.state.requestId != null) this.setState({ requestId: null, position: null });
  }

  private push(): Promise<void> {
    const { requestId } = this.state;
    const fix = this.fix;
    if (requestId == null || !fix || this.inflight) return this.inflight ?? Promise.resolve();

    const moved = !this.lastPushed || distanceM(this.lastPushed, fix) >= PUSH_MIN_MOVE_M;
    if (!moved && Date.now() - this.lastPushAt < PUSH_HEARTBEAT_MS) return Promise.resolve();

    this.inflight = rescueApi
      .updateCustomerLocation(requestId, fix.lat, fix.lng, fix.accuracy)
      .then(() => {
        this.lastPushed = { lat: fix.lat, lng: fix.lng };
        this.lastPushAt = Date.now();
      })
      .catch((e: any) => {
        // Server từ chối nghĩa là đơn đã xong hoặc đã đổi tài khoản; lỗi mạng thì nhịp sau gửi lại.
        const status = e?.response?.status;
        if (status >= 400 && status < 500 && status !== 429) this.end();
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }
}

const share = new CustomerLocationShare();

/** Đăng xuất: GPS dừng ngay, lệnh xoá vị trí ở server cần gọi trước khi mất token. */
export const stopCustomerLocationShare = () => share.stop();

/** Bật/tắt chia sẻ vị trí cho một đơn của khách. */
export function useCustomerLocationShare(requestId: number, data: RescueRequestDto | null) {
  const state = useSyncExternalStore(share.subscribe, share.getState);
  // Vừa đổi đơn thì data vẫn là của đơn cũ trong một lần render.
  const job = data?.id === requestId ? data : null;
  const status = job?.status;
  const canShare = status != null && SHARE_STATUSES.includes(status);
  const sharing = state.requestId === requestId;
  const sharingOnServer = job?.customerLat != null;

  useEffect(() => {
    if (sharing && status != null && !canShare) share.end();
  }, [sharing, status, canShare]);

  // App bị tắt khi đang chia sẻ: lần đầu thấy đơn thì nối lại, khách phải tự tắt như bình thường.
  const checkedRequestRef = useRef<number | null>(null);
  useEffect(() => {
    if (!job || checkedRequestRef.current === requestId) return;
    checkedRequestRef.current = requestId;
    if (!sharingOnServer || sharing || !canShare) return;
    share.start(requestId).then((ok) => {
      if (!ok) rescueApi.stopCustomerLocation(requestId).catch(() => {});
    });
  }, [job, requestId, sharingOnServer, sharing, canShare]);

  const start = useCallback(() => share.start(requestId), [requestId]);
  const stop = useCallback(() => share.stop(), []);

  return { canShare, sharing, position: sharing ? state.position : null, start, stop };
}
