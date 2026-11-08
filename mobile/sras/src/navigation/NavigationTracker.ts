import type { GoongRoute } from '../api/goongApi';
import {
  bearingDeg,
  buildRouteIndex,
  distanceM,
  LatLng,
  pointAlong,
  projectOnRoute,
  RouteIndex,
} from './routeGeometry';

// Xa tuyến hơn ngưỡng này thì coi như GPS lệch khỏi đường.
const OFF_ROUTE_M = 40;
const MAX_OFF_ROUTE_M = 80;
// Sai số GPS quá lớn thì không đủ tin để kết luận đã đi lệch.
const UNRELIABLE_ACCURACY_M = 60;
// Số lần lệch liên tiếp trước khi xác nhận, để một điểm GPS nhiễu không kéo mũi tên ra khỏi đường.
const OFF_ROUTE_FIXES = 3;
const BACK_WINDOW_M = 40;
const MIN_FORWARD_WINDOW_M = 300;
const BEARING_LOOKAHEAD_M = 20;
// Dưới tốc độ này la bàn GPS không đáng tin.
const MIN_HEADING_SPEED_MPS = 1;
const MIN_MOVE_FOR_BEARING_M = 3;

export interface GpsFix extends LatLng {
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  timestamp: number;
}

/** Nhãn tên đường đặt tại điểm rẽ kế tiếp. */
export interface NavManeuver extends LatLng {
  street: string;
  distanceM: number;
}

/** Trạng thái gửi cho bản đồ sau mỗi lần có GPS. */
export interface NavFrame extends LatLng {
  onRoute: boolean;
  /** Quãng đường đã đi trên tuyến (mét). */
  s: number;
  /** Hướng mũi tên khi đang lệch tuyến; lúc bám tuyến bản đồ tự lấy hướng theo đường. */
  b: number;
  remainingM: number;
  remainingSec: number;
  next: NavManeuver | null;
}

interface LocatedStep extends LatLng {
  alongM: number;
  street: string;
  maneuver: string;
}

/** Bám vị trí GPS vào lộ trình. Không phụ thuộc React Native để kiểm thử được bằng node. */
export class NavigationTracker {
  private route: RouteIndex | null = null;
  private durationSec = 0;
  private steps: LocatedStep[] = [];
  private alongM = 0;
  private anchored = false;
  private offRouteFixes = 0;
  private lastFix: GpsFix | null = null;
  private lastBearing = 0;
  private lastRemainingSec = 0;

  /** Chưa có tuyến dùng được, hoặc đã xác nhận đi lệch tuyến. */
  get needsRoute(): boolean {
    return !this.route || this.offRouteFixes >= OFF_ROUTE_FIXES;
  }

  get routeIndex(): RouteIndex | null {
    return this.route;
  }

  reset() {
    this.route = null;
    this.durationSec = 0;
    this.steps = [];
    this.alongM = 0;
    this.anchored = false;
    this.offRouteFixes = 0;
    this.lastFix = null;
    this.lastRemainingSec = 0;
  }

  setRoute(route: GoongRoute) {
    if (route.coordinates.length < 2) {
      this.route = null;
      return;
    }
    this.route = buildRouteIndex(route.coordinates);
    this.durationSec = route.durationSec;
    this.steps = this.locateSteps(route);
    this.alongM = 0;
    this.anchored = false;
    this.offRouteFixes = 0;
    this.lastRemainingSec = route.durationSec;
  }

  update(fix: GpsFix): NavFrame {
    const route = this.route;
    const frame = route ? this.trackOnRoute(route, fix) : this.offRouteFrame(fix);
    this.lastFix = fix;
    return frame;
  }

  private locateSteps(route: GoongRoute): LocatedStep[] {
    const index = this.route!;
    let cursorM = 0;
    return route.steps.map((step, i) => {
      if (i > 0) {
        // Mỗi bước chỉ tìm trong tầm bước liền trước, tránh gán nhầm khi tuyến đi qua một chỗ hai lần.
        const toM = cursorM + route.steps[i - 1].distanceM + 100;
        cursorM = projectOnRoute(index, step, cursorM, toM)?.alongM ?? cursorM;
      }
      return { alongM: cursorM, lat: step.lat, lng: step.lng, street: step.street, maneuver: step.maneuver };
    });
  }

  private trackOnRoute(route: RouteIndex, fix: GpsFix): NavFrame {
    const projection = projectOnRoute(route, fix, ...this.searchWindow(route, fix));
    const accuracy = fix.accuracy ?? 0;
    const thresholdM = Math.min(MAX_OFF_ROUTE_M, Math.max(OFF_ROUTE_M, accuracy * 1.5));
    const unreliable = accuracy > UNRELIABLE_ACCURACY_M;

    if (!projection || (projection.offsetM > thresholdM && !unreliable)) {
      this.offRouteFixes++;
      if (this.offRouteFixes >= OFF_ROUTE_FIXES) return this.offRouteFrame(fix);
    } else if (projection.offsetM <= thresholdM) {
      this.offRouteFixes = 0;
      this.anchored = true;
      // GPS nhiễu lùi vài mét thì giữ nguyên, xe không chạy giật lùi trên tuyến.
      this.alongM = Math.max(this.alongM, projection.alongM);
    }
    return this.onRouteFrame(route);
  }

  /** [từ, tới, vị trí dự kiến] trên tuyến cho điểm GPS này. */
  private searchWindow(route: RouteIndex, fix: GpsFix): [number, number, number?] {
    // Chưa bám tuyến thì tìm toàn tuyến; tuyến tính từ vị trí xe nên dự kiến đang ở đầu tuyến.
    if (!this.anchored) return [0, route.totalM, 0];
    const travelledM = this.travelledSinceLastFix(fix);
    const forwardM = Math.max(MIN_FORWARD_WINDOW_M, travelledM * 3);
    return [Math.max(0, this.alongM - BACK_WINDOW_M), this.alongM + forwardM, this.alongM + travelledM];
  }

  /** Vị trí nhận qua server (phía khách) không kèm tốc độ, nên lấy đường chim bay giữa hai điểm. */
  private travelledSinceLastFix(fix: GpsFix): number {
    if (!this.lastFix) return 0;
    if (fix.speed != null && fix.speed >= 0) {
      return fix.speed * Math.max(0, (fix.timestamp - this.lastFix.timestamp) / 1000);
    }
    return distanceM(this.lastFix, fix);
  }

  private onRouteFrame(route: RouteIndex): NavFrame {
    const point = pointAlong(route, this.alongM);
    this.lastBearing = bearingDeg(point, pointAlong(route, this.alongM + BEARING_LOOKAHEAD_M));
    const remainingM = Math.max(0, route.totalM - this.alongM);
    this.lastRemainingSec = route.totalM > 0 ? (this.durationSec * remainingM) / route.totalM : 0;
    return {
      onRoute: true,
      s: this.alongM,
      lat: point.lat,
      lng: point.lng,
      b: this.lastBearing,
      remainingM,
      remainingSec: this.lastRemainingSec,
      next: this.nextManeuver(),
    };
  }

  private offRouteFrame(fix: GpsFix): NavFrame {
    this.lastBearing = this.bearingFromMotion(fix);
    return {
      onRoute: false,
      s: this.alongM,
      lat: fix.lat,
      lng: fix.lng,
      b: this.lastBearing,
      remainingM: this.route ? Math.max(0, this.route.totalM - this.alongM) : 0,
      remainingSec: this.lastRemainingSec,
      next: null,
    };
  }

  private bearingFromMotion(fix: GpsFix): number {
    if (fix.heading != null && fix.heading >= 0 && (fix.speed ?? 0) >= MIN_HEADING_SPEED_MPS) {
      return fix.heading;
    }
    if (this.lastFix && distanceM(this.lastFix, fix) >= MIN_MOVE_FOR_BEARING_M) {
      return bearingDeg(this.lastFix, fix);
    }
    return this.lastBearing;
  }

  private nextManeuver(): NavManeuver | null {
    let currentStreet = '';
    for (const step of this.steps) {
      if (step.alongM <= this.alongM) {
        if (step.street) currentStreet = step.street;
        continue;
      }
      if (!step.street) continue;
      // "Đi thẳng" mà vẫn cùng tên đường thì không phải điểm cần báo.
      if (step.street === currentStreet && step.maneuver === 'straight') continue;
      return { street: step.street, lat: step.lat, lng: step.lng, distanceM: step.alongM - this.alongM };
    }
    return null;
  }
}
