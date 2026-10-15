import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Linking,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
  Dimensions,
  PanResponder,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { WebView } from 'react-native-webview';
import {
  ChevronLeft,
  ArrowLeft,
  Phone,
  PhoneCall,
  MessageCircle,
  Star,
  ShieldCheck,
  CheckCircle2,
  X,
  SearchX,
  Share2,
  Lightbulb,
  CreditCard,
  RotateCcw,
  Navigation,
  Banknote,
  Clock,
  AlertTriangle,
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto, RescueStatus } from '../../api/rescueApi';
import { complaintApi, ComplaintDto } from '../../api/complaintApi';
import { ratingApi } from '../../api/ratingApi';
import { goongApi } from '../../api/goongApi';
import { GOONG_MAPTILES_KEY } from '../../config/goong';
import { formatVnd } from '../../utils/rescueFee';
import RatingModal from '../../components/RatingModal';
import ComplaintModal from '../../components/ComplaintModal';
import ComplaintTrackingModal from '../../components/ComplaintTrackingModal';

// Design tokens — 1 accent thương hiệu (cam-đỏ) cho hành động/khẩn; xanh dương = thông tin/bản đồ;
// xanh lá = đến/hoàn tất; hổ phách = chờ; đỏ = huỷ.
const BRAND = '#ea580c';
const INFO = '#2563eb';
const GREEN = '#16a34a';
const AMBER_BG = '#fef3c7';
const AMBER_INK = '#b45309';
const DANGER = '#dc2626';
const DANGER_BG = '#fef2f2';
const INK = '#1c1917';
const SUB = '#78716c';
const LINE = '#e7e5e4';
const CARD = '#ffffff';
const BG = '#f7f7f5';
const FIELD = '#f5f5f4';

const STEPS = ['Tìm gara', 'Nhận', 'Đang tới', 'Đã đến', 'Thanh toán'];
const POLL_MS = 4000;
const TERMINAL: RescueStatus[] = ['NO_GARAGE_FOUND', 'DECLINED', 'COMPLETED', 'CANCELLED', 'PAID'];

const SAFETY_TIPS = [
  'Bật đèn cảnh báo (hazard) để xe khác dễ nhận thấy.',
  'Rời khỏi lòng đường, đứng ở nơi an toàn phía sau rào chắn nếu có.',
  'Đặt vật cảnh báo cách xe khoảng 5–10 m về phía sau.',
];

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_MAX = Math.round(SCREEN_H * 0.72);
const SHEET_MIN = Math.round(SCREEN_H * 0.42);
const DRAG_RANGE = SHEET_MAX - SHEET_MIN;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function stepOf(status?: RescueStatus): number {
  switch (status) {
    case 'ACCEPTED':
    case 'ASSIGNED':
      return 1;
    case 'EN_ROUTE':
      return 2;
    case 'ARRIVED':
    case 'DIAGNOSED':
    case 'REPAIRING_ONSITE':
    case 'TOW_TO_GARAGE':
    case 'TOWING':
      return 3;
    case 'COMPLETED':
    case 'AWAITING_PAYMENT':
    case 'PAID':
      return 4;
    default:
      return 0;
  }
}

function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── BẢN ĐỒ THEO DÕI TIẾN TRÌNH (KIỂU MAP CŨ NGUYÊN BẢN) ──
function buildMapHtml(lat: number, lng: number) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet" />
  <style>html, body, #map { height: 100%; margin: 0; padding: 0; background: #e5e7eb; }</style>
</head>
<body>
  <div id="map"></div>
  <script>
    var __state = { pickup: null, rescuer: null, route: null, ready: false, autoFit: true };
    function rnlog(m){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify({type:'log',message:String(m)})); } }
    window.onerror = function(m){ rnlog('js-error: ' + m); };
    window.setPickup = function(la, ln){ __state.pickup = (la != null && ln != null) ? [ln, la] : null; window.__apply && window.__apply(); };
    window.setRescuer = function(la, ln){ __state.rescuer = (la != null && ln != null) ? [ln, la] : null; window.__apply && window.__apply(); };
    window.setStaff = window.setRescuer;
    window.setRoute = function(json){
      try {
        var r = json;
        if (typeof r === 'string') {
          try { r = JSON.parse(r); } catch(e){}
        }
        if (typeof r === 'string') {
          try { r = JSON.parse(r); } catch(e){}
        }
        __state.route = (Array.isArray(r) && r.length >= 2) ? r : null;
      } catch(e){
        __state.route = null;
      }
      window.__apply && window.__apply();
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <script>
    if (typeof goongjs !== 'undefined') {
      goongjs.accessToken = '${GOONG_MAPTILES_KEY}';
      var map = new goongjs.Map({ container:'map', style:'https://tiles.goong.io/assets/goong_map_web.json', center:[${lng}, ${lat}], zoom:15 });
      window.__map = map;
      map.on('error', function(e){ rnlog('map lỗi: ' + (e && e.error ? e.error.message : '?')); });
      map.on('dragstart', function(){ __state.autoFit = false; });
      var pickupMarker = null, rescuerMarker = null;
      function ensureRouteLayer(){
        if (!map || map.getSource('route')) return;
        try {
          map.addSource('route', { type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates: [] } } });
          map.addLayer({
            id:'route-line',
            type:'line',
            source:'route',
            layout:{ 'line-cap':'round','line-join':'round' },
            paint:{ 'line-color':'${INFO}','line-width':5,'line-opacity':0.95 }
          });
        } catch(e) {}
      }
      function fit(){
        var s = __state, pts = [];
        var routeCoords = (s.route && s.route.length >= 2) ? s.route : (
          (s.pickup && s.rescuer) ? [s.rescuer, s.pickup] : []
        );
        if (routeCoords && routeCoords.length) pts = routeCoords.slice();
        if (s.pickup) pts.push(s.pickup);
        if (s.rescuer) pts.push(s.rescuer);
        if (pts.length === 0) return;
        if (pts.length === 1){ map.easeTo({ center: pts[0], zoom: 15 }); return; }
        var b = new goongjs.LngLatBounds(pts[0], pts[0]);
        for (var i = 1; i < pts.length; i++) b.extend(pts[i]);
        map.fitBounds(b, { padding: { top: 80, left: 50, right: 50, bottom: ${SHEET_MIN + 25} }, maxZoom: 16, duration: 600 });
      }
      window.__apply = function(){
        var s = __state;
        if (!s.ready || !window.__map) return;
        var map = window.__map;
        if (s.pickup){
          if (!pickupMarker) pickupMarker = new goongjs.Marker({ color:'${BRAND}' }).setLngLat(s.pickup).addTo(map);
          else pickupMarker.setLngLat(s.pickup);
        } else if (pickupMarker) {
          pickupMarker.remove();
          pickupMarker = null;
        }
        if (s.rescuer){
          if (!rescuerMarker) rescuerMarker = new goongjs.Marker({ color:'${INFO}' }).setLngLat(s.rescuer).addTo(map);
          else rescuerMarker.setLngLat(s.rescuer);
        } else if (rescuerMarker) {
          rescuerMarker.remove();
          rescuerMarker = null;
        }
        
        // Luôn đảm bảo vẽ đường nối giữa 2 định vị
        ensureRouteLayer();
        var routeCoords = (s.route && s.route.length >= 2) ? s.route : (
          (s.pickup && s.rescuer) ? [s.rescuer, s.pickup] : []
        );
        if (map.getSource('route')) {
          map.getSource('route').setData({
            type:'Feature',
            geometry:{ type:'LineString', coordinates: routeCoords }
          });
        }
        if (s.autoFit) fit();
      };
      map.on('load', function(){
        __state.ready = true;
        ensureRouteLayer();
        window.__apply();
        setTimeout(function(){ map.resize(); }, 300);
      });
    }
  </script>
</body>
</html>`;
}

// Avatar phẳng do app render (initials) — không dùng ảnh giả. Ảnh thật sẽ thay khi DTO có avatarUrl.
function Avatar({ name, dark, size = 48 }: { name?: string; dark?: boolean; size?: number }) {
  const ch = (name?.trim()?.[0] || '?').toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: Math.round(size * 0.29) },
        dark ? styles.avatarDark : styles.avatarBrand,
      ]}
    >
      <Text style={[styles.avatarText, size >= 56 && { fontSize: 22 }]}>{ch}</Text>
    </View>
  );
}

// Hàng hành động dưới mỗi mục: Nhắn tin | Gọi miễn phí | Gọi (ngăn bằng vạch dọc).
function ActionRow({
  phone,
  onMessage,
  onFreeCall,
  onCall,
}: {
  phone?: string;
  onMessage: () => void;
  onFreeCall: () => void;
  onCall: () => void;
}) {
  return (
    <View style={styles.actionRow}>
      <TouchableOpacity style={styles.action} onPress={onMessage} activeOpacity={0.65}>
        <MessageCircle size={17} color={INFO} strokeWidth={2.3} />
        <Text style={[styles.actionText, { color: INFO }]}>Nhắn tin</Text>
      </TouchableOpacity>
      <View style={styles.actionSep} />
      <TouchableOpacity style={styles.action} onPress={onFreeCall} activeOpacity={0.65}>
        <PhoneCall size={17} color={GREEN} strokeWidth={2.3} />
        <Text style={[styles.actionText, { color: GREEN }]}>Gọi miễn phí</Text>
      </TouchableOpacity>
      <View style={styles.actionSep} />
      <TouchableOpacity
        style={[styles.action, !phone && styles.actionDisabled]}
        onPress={onCall}
        disabled={!phone}
        activeOpacity={0.65}
      >
        <Phone size={17} color={BRAND} strokeWidth={2.3} />
        <Text style={[styles.actionText, { color: BRAND }]}>Gọi</Text>
      </TouchableOpacity>
    </View>
  );
}

// Đốm sáng chạy dọc đoạn "đang diễn ra" — kích thước & khoảng chừa để không đè lên chấm.
const COMET = 10;
const SEG_START_INSET = 9; // chừa mép chấm hiện tại (to hơn)
const SEG_END_INSET = 4; // để đốm chạy sát tới chấm kế tiếp

function RatingInline({ rating, count }: { rating?: number | null; count?: number | null }) {
  if (rating != null && (count ?? 0) > 0) {
    return (
      <View style={styles.ratingChip}>
        <Star size={12} color={AMBER_INK} fill={AMBER_INK} strokeWidth={0} />
        <Text style={styles.ratingVal}>{Number(rating).toFixed(1)}</Text>
        <Text style={styles.ratingCnt}>({count})</Text>
      </View>
    );
  }
  return <Text style={styles.noRating}>Chưa có đánh giá</Text>;
}

export default function RescueTrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; lat?: string; lng?: string; from?: string; cashConfirmed?: string }>();
  const requestId = params.id ? parseInt(params.id, 10) : NaN;
  const webRef = useRef<WebView>(null);

  const [data, setData] = useState<RescueRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [etaSec, setEtaSec] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [existingComplaint, setExistingComplaint] = useState<ComplaintDto | null>(null);
  const [showComplaintTrackingModal, setShowComplaintTrackingModal] = useState(false);

  const pulse = useRef(new Animated.Value(0)).current;
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 2.2] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const cometX = useRef(new Animated.Value(0)).current;
  const [stepperW, setStepperW] = useState(0);
  const routeCoordsRef = useRef<[number, number][] | null>(null);
  const lastOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const quoteRedirectedRef = useRef(false);
  const declinedAlertShownRef = useRef(false);
  const completedRedirectedRef = useRef(false);

  // Khi điều hướng từ màn hình thanh toán tiền mặt về, đồng bộ cờ tiền mặt ngay lập tức
  useEffect(() => {
    if (params.cashConfirmed === '1') {
      completedRedirectedRef.current = true;
      setData((prev) => (prev ? { ...prev, cashConfirmedByCustomer: true, paymentMethod: 'CASH' } : prev));
    }
  }, [params.cashConfirmed]);

  // 2-snap bottom sheet (thu gọn / mở rộng).
  const translateY = useRef(new Animated.Value(DRAG_RANGE)).current;
  const startYRef = useRef(DRAG_RANGE);
  const snapTo = (to: number) =>
    Animated.spring(translateY, { toValue: to, useNativeDriver: true, bounciness: 2, speed: 14 }).start();
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderGrant: () => translateY.stopAnimation((v) => (startYRef.current = v)),
      onPanResponderMove: (_, g) => {
        const next = Math.max(0, Math.min(DRAG_RANGE, startYRef.current + g.dy));
        translateY.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const cur = startYRef.current + g.dy;
        snapTo(cur > DRAG_RANGE / 2 ? DRAG_RANGE : 0);
      },
    })
  ).current;

  const status = data?.status;
  const activeStep = stepOf(status);
  const searching = status === 'SEARCHING' || status === 'PENDING_GARAGE' || !status;

  // Lập tức reset state đơn cũ khi đổi requestId để không bị hiển thị chồng chéo dữ liệu đơn trước
  useEffect(() => {
    setData(null);
    setExistingComplaint(null);
    setLoading(true);
    setRouteInfo(null);
    setEtaSec(null);
    setShowRatingModal(false);
    setShowComplaintModal(false);
    setShowComplaintTrackingModal(false);
    quoteRedirectedRef.current = false;
    declinedAlertShownRef.current = false;
    lastOriginRef.current = null;
    routeCoordsRef.current = null;
  }, [requestId]);

  // Poll trạng thái thật (lỗi mạng → thử lại êm).
  useEffect(() => {
    if (Number.isNaN(requestId)) {
      setLoading(false);
      return;
    }
    let alive = true;
    let timer: any;
    const tick = async () => {
      try {
        const res = await rescueApi.getStatus(requestId);
        if (!alive) return;
        setData(res);
        setLoading(false);

        // Khi thợ vừa gửi báo giá (DIAGNOSED) -> tự động mở màn hình duyệt báo giá cho khách
        if (res.status === 'DIAGNOSED' && !quoteRedirectedRef.current) {
          quoteRedirectedRef.current = true;
          router.push({
            pathname: '/customer/rescue-quote',
            params: { id: String(requestId) },
          });
        }

        // Khi thợ hoàn thành sửa chữa (COMPLETED) -> tự động mở màn hình thanh toán cho khách (nếu chưa chọn tiền mặt)
        if (res.status === 'COMPLETED' && !res.cashConfirmedByCustomer && res.paymentMethod !== 'CASH' && !completedRedirectedRef.current) {
          completedRedirectedRef.current = true;
          router.push({
            pathname: '/customer/payment',
            params: {
              id: String(requestId),
              amount: String(res.totalAmount ?? res.rescueFee ?? ''),
            },
          });
        }

        // Khi thợ hoàn thành sửa chữa (COMPLETED) -> tự động mở màn hình thanh toán cho khách (nếu chưa chọn tiền mặt)
        if (res.status === 'COMPLETED' && !res.cashConfirmedByCustomer && res.paymentMethod !== 'CASH' && !completedRedirectedRef.current) {
          completedRedirectedRef.current = true;
          router.push({
            pathname: '/customer/payment',
            params: {
              id: String(requestId),
              amount: String(res.totalAmount ?? res.rescueFee ?? ''),
            },
          });
        }

        // Khi gara từ chối hoặc hết hạn 90s -> lập tức thông báo để khách chọn gara khác ngay
        if (res.status === 'DECLINED' && !declinedAlertShownRef.current) {
          declinedAlertShownRef.current = true;
          Alert.alert(
            'Gara không thể nhận yêu cầu',
            `${res.garage?.name || 'Gara bạn chọn'} đã từ chối tiếp nhận hoặc không phản hồi sau 90 giây.\n\nBạn có muốn chọn ngay một Gara khác gần đây hoặc chuyển sang Cứu hộ khẩn cấp không?`,
            [
              {
                text: 'Cứu hộ khẩn cấp',
                onPress: () => goEmergencyDirect(res),
                style: 'cancel',
              },
              {
                text: 'Chọn Gara khác ngay',
                onPress: () => goPickAnotherGarage(res),
              },
            ],
            { cancelable: false }
          );
        }

        if (!TERMINAL.includes(res.status)) {
          // Khi đang chờ gara nhận, poll nhanh hơn (2.5s) để bắt ngay sự kiện gara từ chối hoặc nhận
          const nextPollMs = (res.status === 'PENDING_GARAGE' || res.status === 'SEARCHING') ? 2500 : POLL_MS;
          timer = setTimeout(tick, nextPollMs);
        }
      } catch {
        if (!alive) return;
        setLoading(false);
        timer = setTimeout(tick, POLL_MS);
      }
    };
    tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [requestId]);

  // Kiểm tra xem đơn này đã từng khiếu nại hoặc đánh giá chưa (truy xuất từ bảng ratings và complaints)
  useEffect(() => {
    if (Number.isNaN(requestId)) {
      setExistingComplaint(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const [c, r] = await Promise.all([
          complaintApi.getByRequest(requestId).catch(() => null),
          ratingApi.getByRequest(requestId).catch(() => null),
        ]);
        if (alive) {
          // Luôn cập nhật c (dù null hay có giá trị), không bao giờ giữ lại khiếu nại của đơn cũ
          setExistingComplaint(c || null);
          if (r) {
            setData((prev) => (prev ? { ...prev, rated: true } : null));
          }
        }
      } catch (err) {
        console.warn('Lỗi kiểm tra khiếu nại / đánh giá của đơn:', err);
        if (alive) {
          setExistingComplaint(null);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [requestId]);

  // Đồng bộ lại khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      if (Number.isNaN(requestId)) return;
      complaintApi
        .getByRequest(requestId)
        .then((c) => setExistingComplaint(c || null))
        .catch(() => setExistingComplaint(null));
    }, [requestId])
  );


  // Radar khi đang quét.
  useEffect(() => {
    if (!searching) return;
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [searching, pulse]);

  // Đốm sáng chạy dọc đoạn đang diễn ra: lặp lại khi còn bước kế tiếp.
  const hasRunningStep = activeStep < STEPS.length - 1;
  useEffect(() => {
    if (!hasRunningStep) return;
    cometX.setValue(0);
    const loop = Animated.loop(
      Animated.timing(cometX, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [hasRunningStep, activeStep, cometX]);

  // Đồng hồ đếm ngược ETA khi xe đang tới; refresh khi Directions cập nhật.
  useEffect(() => {
    if (status === 'EN_ROUTE' && routeInfo?.durationMin != null) setEtaSec(routeInfo.durationMin * 60);
    else setEtaSec(null);
  }, [status, routeInfo?.durationMin]);
  useEffect(() => {
    if (etaSec == null) return;
    const t = setInterval(() => setEtaSec((s) => (s == null ? s : Math.max(0, s - 1))), 1000);
    return () => clearInterval(t);
  }, [etaSec == null]);

  // Ghim khách + marker xe cứu hộ.
  useEffect(() => {
    if (data?.pickupLat != null && data?.pickupLng != null) {
      webRef.current?.injectJavaScript(`window.setPickup && window.setPickup(${data.pickupLat}, ${data.pickupLng}); true;`);
    }
  }, [data?.pickupLat, data?.pickupLng]);
  // Toạ độ khởi tạo an toàn (dùng fallback nếu API chưa trả về hoặc chưa có toạ độ)
  const initialCoord = useMemo(() => {
    const pLat = params.lat ? parseFloat(params.lat) : NaN;
    const pLng = params.lng ? parseFloat(params.lng) : NaN;
    if (!isNaN(pLat) && !isNaN(pLng)) {
      return { lat: pLat, lng: pLng };
    }
    return { lat: 21.0285, lng: 105.8542 }; // Mặc định Hà Nội
  }, [params.lat, params.lng]);

  // Tạo mapHtml 1 lần duy nhất, tránh reload lại WebView liên tục mỗi chu kỳ polling
  const mapHtml = useMemo(() => {
    const lat = data?.pickupLat ?? initialCoord.lat;
    const lng = data?.pickupLng ?? initialCoord.lng;
    return buildMapHtml(lat, lng);
  }, [initialCoord.lat, initialCoord.lng]);

  // Định vị người nhân viên sửa chữa của gara:
  // CHỈ lấy tọa độ GPS của người nhân viên sửa chữa (rescuerLat, rescuerLng).
  // Tuyệt đối KHÔNG lấy tọa độ của Gara để theo dõi chính xác vị trí thực tế giữa khách hàng và nhân viên sửa chữa.
  const rescuerCoord = useMemo(() => {
    if (data?.rescuerLat != null && data?.rescuerLng != null) {
      return { lat: data.rescuerLat, lng: data.rescuerLng };
    }
    return null;
  }, [data?.rescuerLat, data?.rescuerLng]);

  // Ghim vị trí người nhân viên cứu hộ (sử dụng cả setRescuer và setStaff đồng bộ với kiểu map cũ)
  useEffect(() => {
    if (rescuerCoord != null) {
      webRef.current?.injectJavaScript(`window.setRescuer && window.setRescuer(${rescuerCoord.lat}, ${rescuerCoord.lng}); true;`);
    } else {
      webRef.current?.injectJavaScript('window.setRescuer && window.setRescuer(null, null); true;');
    }
  }, [rescuerCoord?.lat, rescuerCoord?.lng]);

  // Lộ trình: Tính từ vị trí người nhân viên tới khách hàng (luôn đảm bảo có đường nối 2 định vị)
  useEffect(() => {
    const pLat = data?.pickupLat ?? initialCoord.lat;
    const pLng = data?.pickupLng ?? initialCoord.lng;
    const oLat = rescuerCoord?.lat;
    const oLng = rescuerCoord?.lng;

    // Chưa có vị trí nhân viên cứu hộ -> xóa lộ trình
    if (oLat == null || oLng == null) {
      routeCoordsRef.current = null;
      setRouteInfo(null);
      webRef.current?.injectJavaScript('window.setRoute && window.setRoute(null); true;');
      return;
    }

    // Vẽ ngay đường nối giữa 2 định vị để giao diện không bị trống
    const directLine: [number, number][] = [[oLng, oLat], [pLng, pLat]];
    if (!routeCoordsRef.current) {
      webRef.current?.injectJavaScript(`window.setRoute && window.setRoute(${JSON.stringify(directLine)}); true;`);
    }

    const last = lastOriginRef.current;
    if (last && haversineKm(last.lat, last.lng, oLat, oLng) < 0.03 && routeCoordsRef.current) return;

    let alive = true;
    (async () => {
      try {
        const r = await goongApi.directions(
          { lat: oLat, lng: oLng },
          { lat: pLat, lng: pLng },
          data?.vehicleType === 'MOTORBIKE' ? 'bike' : 'car'
        );
        if (!alive) return;
        if (r && r.coordinates && r.coordinates.length >= 2) {
          lastOriginRef.current = { lat: oLat, lng: oLng };
          routeCoordsRef.current = r.coordinates;
          setRouteInfo({ distanceKm: r.distanceKm, durationMin: r.durationMin });
          webRef.current?.injectJavaScript(`window.setRoute && window.setRoute(${JSON.stringify(r.coordinates)}); true;`);
        } else {
          // Fallback đường nối trực tiếp nếu Goong directions không trả về kết quả
          const distKm = haversineKm(oLat, oLng, pLat, pLng);
          setRouteInfo({ distanceKm: distKm, durationMin: Math.max(1, Math.round(distKm * 3)) });
          routeCoordsRef.current = directLine;
          webRef.current?.injectJavaScript(`window.setRoute && window.setRoute(${JSON.stringify(directLine)}); true;`);
        }
      } catch (err) {
        console.warn('Lỗi lấy lộ trình nhân viên:', err);
        if (alive) {
          const distKm = haversineKm(oLat, oLng, pLat, pLng);
          setRouteInfo({ distanceKm: distKm, durationMin: Math.max(1, Math.round(distKm * 3)) });
          routeCoordsRef.current = directLine;
          webRef.current?.injectJavaScript(`window.setRoute && window.setRoute(${JSON.stringify(directLine)}); true;`);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [rescuerCoord?.lat, rescuerCoord?.lng, data?.pickupLat, data?.pickupLng, data?.vehicleType, initialCoord.lat, initialCoord.lng]);

  const onMapLoadEnd = () => {
    let js = '';
    const pLat = data?.pickupLat ?? initialCoord.lat;
    const pLng = data?.pickupLng ?? initialCoord.lng;
    if (pLat != null && pLng != null) {
      js += `window.setPickup && window.setPickup(${pLat}, ${pLng});`;
    }

    // Ghim vị trí nhân viên cứu hộ
    if (rescuerCoord != null) {
      js += `window.setRescuer && window.setRescuer(${rescuerCoord.lat}, ${rescuerCoord.lng});`;
    } else {
      js += 'window.setRescuer && window.setRescuer(null, null);';
    }

    // Luôn vẽ đường nối 2 định vị ngay khi map tải xong
    if (rescuerCoord != null && pLat != null && pLng != null) {
      const coordsToDraw = (routeCoordsRef.current && routeCoordsRef.current.length >= 2)
        ? routeCoordsRef.current
        : [[rescuerCoord.lng, rescuerCoord.lat], [pLng, pLat]];
      js += `window.setRoute && window.setRoute(${JSON.stringify(coordsToDraw)});`;
    } else {
      js += 'window.setRoute && window.setRoute(null);';
    }
    webRef.current?.injectJavaScript(js + ' true;');
  };

  const callPhone = (phone?: string) => phone && Linking.openURL(`tel:${phone}`);

  const openMessages = (peer: 'GARAGE' | 'STAFF', name: string, phone?: string, role?: string) =>
    router.push({
      pathname: '/chat',
      params: { requestId: String(requestId), peer, peerName: name, peerPhone: phone || '', peerRole: role || '' },
    } as any);

  // Gọi miễn phí (VoIP trong app) chưa có hạ tầng — báo rõ thay vì giả lập cuộc gọi.
  const onFreeCall = () =>
    Alert.alert('Gọi miễn phí', 'Gọi trong ứng dụng (VoIP) sắp ra mắt. Bạn có thể dùng "Nhắn tin" hoặc "Gọi" trong lúc này.');

  const onShare = () => {
    const code = data?.code ? ` #${data.code}` : '';
    Share.share({ message: `Mình đang theo dõi chuyến cứu hộ SRAS${code}. Đội cứu hộ đang xử lý xe của mình.` });
  };

  const goBack = () => {
    if (params.from) {
      router.replace(params.from as any);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/customer/activity');
  };
  const goHome = () => router.replace('/customer');
  const goRecreate = () => router.replace('/customer/rescue-options' as any);
  const goPickAnotherGarage = (currData?: RescueRequestDto | null) => {
    const d = currData || data;
    router.replace({
      pathname: '/customer/rescue-garage-select',
      params: {
        lat: String(d?.pickupLat || ''),
        lng: String(d?.pickupLng || ''),
        address: d?.pickupAddress || '',
        vehicleType: d?.vehicleType || 'MOTORBIKE',
        symptom: d?.symptom || '',
        issueType: (d as any)?.issueType || '',
        contactPhone: (d as any)?.contactPhone || '',
        paymentMethod: d?.paymentMethod || 'CASH',
        customerVehicleId: d?.customerVehicle?.id ? String(d.customerVehicle.id) : '',
        photoUrls: JSON.stringify(d?.photos || []),
      },
    } as any);
  };
  const goEmergencyDirect = (currData?: RescueRequestDto | null) => {
    const d = currData || data;
    router.replace({
      pathname: '/customer/rescue-emergency',
      params: d?.pickupLat && d?.pickupLng
        ? { lat: String(d.pickupLat), lng: String(d.pickupLng), address: d.pickupAddress || '', mode: 'EMERGENCY' }
        : { mode: 'EMERGENCY' },
    } as any);
  };
  const goPayment = () =>
    router.push({
      pathname: '/customer/payment',
      params: {
        id: String(requestId),
        amount: String(isDeclined ? (data?.rescueFee ?? 0) : (data?.totalAmount ?? data?.rescueFee ?? '')),
        rejectQuote: isDeclined ? '1' : undefined,
      },
    } as any);

  const doCancel = async () => {
    try {
      setCancelling(true);
      await rescueApi.cancel(requestId);
      goHome();
    } catch (e: any) {
      Alert.alert('Không huỷ được yêu cầu', e?.response?.data?.message || e?.message || 'Vui lòng thử lại.');
    } finally {
      setCancelling(false);
    }
  };
  const onCancel = () =>
    Alert.alert('Huỷ yêu cầu cứu hộ?', 'Đơn sẽ bị huỷ và hệ thống ngừng tìm gara.', [
      { text: 'Không', style: 'cancel' },
      { text: 'Huỷ yêu cầu', style: 'destructive', onPress: doCancel },
    ]);

  // Huỷ được khi còn tìm gara hoặc vừa được nhận (khớp backend).
  const canCancel = status === 'SEARCHING' || status === 'PENDING_GARAGE' || status === 'ACCEPTED' || !status;
  const isCompleted =
    status === 'COMPLETED' || status === 'AWAITING_PAYMENT' || status === 'PAID';
  const showStepper = status !== 'NO_GARAGE_FOUND' && status !== 'DECLINED' && status !== 'CANCELLED';

  const isDeclined = data?.quoteStatus === 'DECLINED';
  const isTow = !isDeclined && (data?.quoteType === 'TOW' || data?.isTowing === true || ((data?.towingFee ?? 0) > 0 && !!data?.towingReason));
  const isCash = Boolean(data?.cashConfirmedByCustomer);
  const towingFee = isDeclined ? 0 : (data?.towingFee ?? 0);
  const repairFee = isDeclined ? 0 : (data?.repairFee ?? data?.serviceFee ?? 0);

  const feeBlock =
    data?.rescueFee != null ? (
      <View style={styles.feeCard}>
        {/* 1. Phí di chuyển */}
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Phí di chuyển</Text>
          <Text style={styles.feeVal}>{formatVnd(data.rescueFee)}</Text>
        </View>

        {/* 2. Phí kéo xe về garage (nếu có và không từ chối) */}
        {!isDeclined && towingFee > 0 && (
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Phí kéo xe về garage</Text>
            <Text style={[styles.feeVal, { color: '#2563eb' }]}>{formatVnd(towingFee)}</Text>
          </View>
        )}

        {/* 3. Phí sửa chữa dự kiến (nếu có và không từ chối) */}
        {!isDeclined && repairFee > 0 && (
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Phí sửa chữa (Dự kiến)</Text>
            <Text style={styles.feeVal}>{formatVnd(repairFee)}</Text>
          </View>
        )}

        {/* Tổng chi phí dự kiến */}
        {!isDeclined && data.totalAmount != null && data.totalAmount !== data.rescueFee && (
          <View style={[styles.feeRow, { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8, marginTop: 4 }]}>
            <Text style={[styles.feeLabel, { fontWeight: '700', color: INK }]}>Tổng chi phí dự kiến</Text>
            <Text style={[styles.feeVal, { fontWeight: '800', color: BRAND }]}>{formatVnd(data.totalAmount)}</Text>
          </View>
        )}

        <Text style={styles.feeNote}>
          {isDeclined
            ? 'Bạn đã từ chối báo giá nên chỉ thanh toán phí di chuyển đến & kiểm tra xe. Không tính phí kéo xe hay sửa chữa.'
            : isTow
              ? 'Đã duyệt kéo xe về garage. Chi phí sửa chữa mang tính chất dự kiến.'
              : 'Phí kéo xe (nếu phát sinh) sẽ được báo trước khi thực hiện.'}
        </Text>
      </View>
    ) : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Map nền toàn màn */}
      <View style={styles.mapRegion}>
        {mapHtml ? (
          <WebView
            ref={webRef}
            originWhitelist={['*']}
            source={{ html: mapHtml, baseUrl: 'https://cdn.jsdelivr.net/' }}
            style={styles.map}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            mixedContentMode="always"
            setSupportMultipleWindows={false}
            onMessage={(e) => {
              try {
                const d = JSON.parse(e.nativeEvent.data);
                if (d?.type === 'log') console.log('[track-map]', d.message);
              } catch { }
            }}
            onLoadEnd={onMapLoadEnd}
            androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
          />
        ) : (
          <View style={[styles.map, styles.mapPlaceholder]}>
            <ActivityIndicator color={BRAND} />
            <Text style={styles.mapPlaceholderText}>Đang tải bản đồ...</Text>
          </View>
        )}

        {/* Nút nổi: back + chia sẻ (nguyên bản khách hàng) */}
        <SafeAreaView edges={['top']} style={styles.floatHeader} pointerEvents="box-none">
          <TouchableOpacity style={styles.roundBtn} onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.85}>
            <ChevronLeft size={22} color={INK} strokeWidth={2.4} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.roundBtn} onPress={onShare} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.85}>
            <Share2 size={20} color={INK} strokeWidth={2.2} />
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* Bottom sheet 2 nấc */}
      <Animated.View style={[styles.sheet, { height: SHEET_MAX, transform: [{ translateY }] }]}>
        <View style={styles.handleZone} {...pan.panHandlers}>
          <View style={styles.handle} />
        </View>

        <Animated.ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetBody}
          keyboardShouldPersistTaps="handled"
        >
          {/* Stepper 5 bước */}
          {showStepper && (
            <View style={styles.stepper} onLayout={(e) => setStepperW(e.nativeEvent.layout.width)}>
              {STEPS.map((label, i) => {
                const done = i < activeStep;
                const current = i === activeStep;
                return (
                  <View key={label} style={styles.stepItem}>
                    <View style={styles.stepLine}>
                      {/* Luôn có 2 bar (bar ngoài cùng trong suốt) để mọi chấm nằm đúng tâm cột, cách đều nhau */}
                      <View style={[styles.stepBar, i === 0 && styles.stepBarHidden, i > 0 && i <= activeStep && styles.stepBarOn]} />
                      <View style={[styles.stepDot, (done || current) && styles.stepDotOn, current && styles.stepDotCurrent]} />
                      <View style={[styles.stepBar, i === STEPS.length - 1 && styles.stepBarHidden, i < STEPS.length - 1 && i < activeStep && styles.stepBarOn]} />
                    </View>
                    <Text style={[styles.stepLabel, (done || current) && styles.stepLabelOn]} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                );
              })}

              {/* Đốm sáng chạy trọn đoạn từ chấm hiện tại → chấm kế tiếp */}
              {stepperW > 0 && hasRunningStep && (() => {
                const itemW = stepperW / STEPS.length;
                const segLeft = (activeStep + 0.5) * itemW + SEG_START_INSET;
                const segWidth = itemW - SEG_START_INSET - SEG_END_INSET;
                if (segWidth <= 0) return null;
                const tx = cometX.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, segWidth - COMET)] });
                return (
                  <View pointerEvents="none" style={[styles.runTrack, { left: segLeft, width: segWidth }]}>
                    <Animated.View style={[styles.comet, { transform: [{ translateX: tx }] }]} />
                  </View>
                );
              })()}
            </View>
          )}

          {loading && !data ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator color={BRAND} />
              <Text style={styles.subText}>Đang tải yêu cầu...</Text>
            </View>
          ) : Number.isNaN(requestId) ? (
            <View style={styles.centerBlock}>
              <Text style={styles.title}>Không tìm thấy yêu cầu</Text>
              <TouchableOpacity style={[styles.primaryBtn, { flexDirection: 'row', gap: 6 }]} onPress={goBack} activeOpacity={0.9}>
                <ArrowLeft size={18} color="#ffffff" strokeWidth={2.4} />
                <Text style={styles.primaryText}>Quay lại</Text>
              </TouchableOpacity>
            </View>
          ) : status === 'CANCELLED' ? (
            <View style={styles.centerBlock}>
              <View style={[styles.stateIcon, { backgroundColor: DANGER_BG }]}>
                <X size={28} color={DANGER} strokeWidth={2.6} />
              </View>
              <Text style={styles.title}>Yêu cầu đã huỷ</Text>
              <Text style={styles.subText}>Bạn đã huỷ yêu cầu cứu hộ này.</Text>
              <TouchableOpacity style={[styles.primaryBtn, { flexDirection: 'row', gap: 6, marginTop: 10 }]} onPress={goBack} activeOpacity={0.9}>
                <ArrowLeft size={18} color="#ffffff" strokeWidth={2.4} />
                <Text style={styles.primaryText}>Quay lại</Text>
              </TouchableOpacity>
            </View>
          ) : status === 'NO_GARAGE_FOUND' || status === 'DECLINED' ? (
            <View style={styles.centerBlock}>
              <View style={[styles.stateIcon, { backgroundColor: DANGER_BG }]}>
                <SearchX size={28} color={DANGER} strokeWidth={2.3} />
              </View>
              <Text style={styles.title}>
                {status === 'NO_GARAGE_FOUND' ? 'Chưa tìm được gara phù hợp' : 'Gara đã từ chối yêu cầu'}
              </Text>
              <Text style={styles.subText}>
                {status === 'NO_GARAGE_FOUND'
                  ? 'Hiện chưa có gara nào nhận đơn trong khu vực sau khi quét bán kính tối đa. Bạn có thể thử gửi lại yêu cầu hoặc liên hệ hotline 1900 6868.'
                  : `${data?.garage?.name || 'Gara'} không thể tiếp nhận yêu cầu lúc này (đã từ chối hoặc hết thời gian 90 giây). Bạn có thể chọn gara khác hoặc chuyển sang cứu hộ khẩn cấp.`}
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => (status === 'DECLINED' ? goPickAnotherGarage() : goRecreate())}
                activeOpacity={0.9}
              >
                <RotateCcw size={18} color="#ffffff" strokeWidth={2.4} />
                <Text style={styles.primaryText}>{status === 'DECLINED' ? 'Chọn Gara khác ngay' : 'Tạo lại yêu cầu'}</Text>
              </TouchableOpacity>
              {status === 'DECLINED' && (
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: '#1c1917', marginTop: 10 }]}
                  onPress={() => goEmergencyDirect()}
                  activeOpacity={0.9}
                >
                  <Navigation size={18} color="#ffffff" strokeWidth={2.4} />
                  <Text style={styles.primaryText}>Chuyển sang Cứu hộ khẩn cấp</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.ghostLink} onPress={goBack} activeOpacity={0.7}>
                <Text style={styles.ghostLinkText}>Quay lại</Text>
              </TouchableOpacity>
            </View>
          ) : searching ? (
            <View style={styles.centerBlock}>
              <View style={styles.radarWrap}>
                <Animated.View style={[styles.radarRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
                <View style={styles.radarCore}>
                  <Navigation size={22} color="#ffffff" strokeWidth={2.4} />
                </View>
              </View>
              <Text style={styles.title}>
                {status === 'PENDING_GARAGE' && data?.garage?.name
                  ? `Đang chờ ${data.garage.name} xác nhận`
                  : 'Đang tìm gara gần nhất'}
              </Text>
              <Text style={styles.subText}>
                {status === 'PENDING_GARAGE' && data?.garage?.name
                  ? 'Yêu cầu cứu hộ đã được gửi tới gara. Gara có tối đa 90 giây để phản hồi tiếp nhận.'
                  : 'Đã gửi lời mời tới các gara trực gần bạn. Đang chờ gara nhận yêu cầu.'}
              </Text>

              <SafetyTips />

              <TouchableOpacity style={styles.dangerBtn} onPress={onCancel} activeOpacity={0.85} disabled={cancelling}>
                {cancelling ? (
                  <ActivityIndicator size="small" color={DANGER} />
                ) : (
                  <X size={16} color={DANGER} strokeWidth={2.4} />
                )}
                <Text style={styles.dangerText}>Huỷ yêu cầu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.ghostBtn,
                  {
                    alignSelf: 'stretch',
                    height: 48,
                    marginTop: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  },
                ]}
                onPress={goBack}
                activeOpacity={0.85}
              >
                <ArrowLeft size={16} color={INK} strokeWidth={2.4} />
                <Text style={[styles.ghostText, { fontSize: 14, fontWeight: '800' }]}>Quay lại</Text>
              </TouchableOpacity>
            </View>
          ) : isCompleted ? (
            <View>
              {data?.status === 'PAID' || data?.status === 'RATED' ? (
                /* 1. ĐÃ THANH TOÁN XONG (PAID / RATED) */
                <View>
                  <View style={styles.centerBlock}>
                    <View style={[styles.stateIcon, { backgroundColor: GREEN }]}>
                      <CheckCircle2 size={30} color="#ffffff" strokeWidth={2.4} />
                    </View>
                    <Text style={styles.title}>Chuyến cứu hộ đã hoàn tất!</Text>
                    <Text style={styles.subText}>
                      Bạn đã thanh toán thành công {formatVnd(data?.totalAmount ?? data?.rescueFee ?? 0)}. Cảm ơn bạn đã tin tưởng dịch vụ cứu hộ xe SRAS!
                    </Text>
                  </View>

                  {feeBlock}

                  {/* Nút Đánh giá (khi chưa gửi đánh giá) */}
                  {!data?.rated && data?.status !== 'RATED' && (
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: '#f59e0b', marginTop: 10, flexDirection: 'row', gap: 8 }]}
                      onPress={() => setShowRatingModal(true)}
                      activeOpacity={0.9}
                    >
                      <Star size={18} color="#ffffff" fill="#ffffff" />
                      <Text style={styles.primaryText}>Đánh giá dịch vụ cứu hộ</Text>
                    </TouchableOpacity>
                  )}

                  {/* Huy hiệu Đã gửi đánh giá */}
                  {(data?.rated || data?.status === 'RATED') && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        marginTop: 10,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        backgroundColor: '#ecfdf5',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#a7f3d0',
                      }}
                    >
                      <Star size={16} color="#16a34a" fill="#16a34a" />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#16a34a' }}>
                        Bạn đã gửi đánh giá cho dịch vụ này
                      </Text>
                    </View>
                  )}

                  {/* Hàng nút Khiếu nại & Quay lại */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    {existingComplaint ? (
                      <TouchableOpacity
                        style={[
                          styles.ghostBtn,
                          {
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            borderColor: existingComplaint.status === 'RESOLVED' ? '#bbf7d0' : '#fde68a',
                            backgroundColor: existingComplaint.status === 'RESOLVED' ? '#f0fdf4' : '#fffbeb',
                          },
                        ]}
                        onPress={() => setShowComplaintTrackingModal(true)}
                        activeOpacity={0.85}
                      >
                        <Clock
                          size={15}
                          color={existingComplaint.status === 'RESOLVED' ? '#16a34a' : '#d97706'}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: existingComplaint.status === 'RESOLVED' ? '#16a34a' : '#d97706',
                          }}
                        >
                          Theo dõi khiếu nại
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.ghostBtn,
                          {
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            borderColor: '#fecaca',
                            backgroundColor: '#fef2f2',
                          },
                        ]}
                        onPress={() => setShowComplaintModal(true)}
                        activeOpacity={0.85}
                      >
                        <AlertTriangle size={15} color="#dc2626" />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#dc2626' }}>Khiếu nại</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.ghostBtn,
                        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
                      ]}
                      onPress={goBack}
                      activeOpacity={0.85}
                    >
                      <ArrowLeft size={15} color={INK} strokeWidth={2.2} />
                      <Text style={styles.ghostText}>Quay lại</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : isCash ? (
                /* 2. KHÁCH ĐÃ CHỌN TIỀN MẶT - CHỜ NHÂN VIÊN / GARA DUYỆT ĐÃ NHẬN TIỀN */
                <View>
                  <View style={styles.centerBlock}>
                    <View style={[styles.stateIcon, { backgroundColor: '#fef3c7' }]}>
                      <Banknote size={30} color="#b45309" strokeWidth={2.4} />
                    </View>
                    <Text style={styles.title}>
                      {isTow
                        ? 'Đang chờ garage duyệt nhận tiền mặt'
                        : 'Đang chờ nhân viên duyệt nhận tiền mặt'}
                    </Text>
                    <Text style={styles.subText}>
                      {isTow
                        ? `Phương tiện đã được sửa xong tại ${data?.garage?.name || 'garage'}. Bạn đã chọn thanh toán ${formatVnd(data?.totalAmount ?? data?.rescueFee ?? 0)} bằng tiền mặt khi nhận xe. Vui lòng thanh toán cho nhân viên garage, nhân viên sẽ xác nhận trên ứng dụng để hoàn tất.`
                        : `Bạn đã chọn thanh toán ${formatVnd(data?.totalAmount ?? data?.rescueFee ?? 0)} tiền mặt trực tiếp. Vui lòng gửi tiền cho nhân viên cứu hộ, nhân viên sẽ trượt xác nhận nhận tiền trên ứng dụng để hoàn tất đơn.`}
                    </Text>
                  </View>

                  {feeBlock}

                  <View style={{ marginTop: 10, gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: BRAND }]}
                      onPress={async () => {
                        try {
                          const refreshed = await rescueApi.getStatus(requestId);
                          setData(refreshed);
                          if (refreshed.status === 'PAID' || refreshed.status === 'RATED') {
                            Alert.alert('Hoàn tất!', 'Nhân viên đã xác nhận nhận tiền mặt. Đơn cứu hộ đã hoàn tất.');
                          } else {
                            Alert.alert('Đang chờ duyệt', 'Nhân viên/garage chưa trượt xác nhận nhận tiền mặt. Vui lòng nhắc nhân viên kiểm tra ứng dụng.');
                          }
                        } catch { }
                      }}
                      activeOpacity={0.88}
                    >
                      <RotateCcw size={18} color="#ffffff" strokeWidth={2.4} />
                      <Text style={styles.primaryText}>Kiểm tra nhân viên đã duyệt chưa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: '#475569', height: 44 }]}
                      onPress={goPayment}
                      activeOpacity={0.9}
                    >
                      <CreditCard size={17} color="#ffffff" strokeWidth={2.2} />
                      <Text style={[styles.primaryText, { fontSize: 13 }]}>Xem hoá đơn / Đổi sang PayOS</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                      {existingComplaint ? (
                        <TouchableOpacity
                          style={[
                            styles.ghostBtn,
                            {
                              flex: 1,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              borderColor: existingComplaint.status === 'RESOLVED' ? '#bbf7d0' : '#fde68a',
                              backgroundColor: existingComplaint.status === 'RESOLVED' ? '#f0fdf4' : '#fffbeb',
                            },
                          ]}
                          onPress={() => setShowComplaintTrackingModal(true)}
                          activeOpacity={0.85}
                        >
                          <Clock
                            size={15}
                            color={existingComplaint.status === 'RESOLVED' ? '#16a34a' : '#d97706'}
                          />
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '700',
                              color: existingComplaint.status === 'RESOLVED' ? '#16a34a' : '#d97706',
                            }}
                          >
                            Theo dõi khiếu nại
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.ghostBtn,
                            {
                              flex: 1,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              borderColor: '#fecaca',
                              backgroundColor: '#fef2f2',
                            },
                          ]}
                          onPress={() => setShowComplaintModal(true)}
                          activeOpacity={0.85}
                        >
                          <AlertTriangle size={15} color="#dc2626" />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#dc2626' }}>Khiếu nại</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.ghostBtn,
                          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
                        ]}
                        onPress={goBack}
                        activeOpacity={0.85}
                      >
                        <ArrowLeft size={15} color={INK} strokeWidth={2.2} />
                        <Text style={styles.ghostText}>Quay lại</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                /* 3. CHƯA CHỌN PHƯƠNG THỨC THANH TOÁN */
                <View>
                  <View style={styles.centerBlock}>
                    <View style={[styles.stateIcon, { backgroundColor: '#ffedd5' }]}>
                      <Clock size={30} color={BRAND} strokeWidth={2.4} />
                    </View>
                    <Text style={styles.title}>
                      {isDeclined
                        ? 'Đã từ chối báo giá · Chờ thanh toán'
                        : isTow
                          ? 'Sửa xong tại garage · Mời bạn đến nhận xe'
                          : 'Sửa chữa hoàn tất · Chờ thanh toán'}
                    </Text>
                    <Text style={styles.subText}>
                      {isDeclined
                        ? `Bạn đã từ chối phương án sửa chữa/kéo xe về garage. Vui lòng thanh toán phí di chuyển đến & kiểm tra xe tại hiện trường: ${formatVnd(data?.rescueFee ?? 0)}.`
                        : isTow
                          ? `Phương tiện của bạn đã được sửa chữa hoàn tất tại garage. Mời bạn đến ${data?.garage?.name || 'garage'} ${data?.garage?.address ? `(${data.garage.address})` : ''} để nhận xe và thanh toán.`
                          : 'Vui lòng chọn phương thức thanh toán để hoàn tất chuyến đi.'}
                    </Text>
                  </View>

                  {feeBlock}

                  <View style={{ marginTop: 10, gap: 10 }}>
                    <TouchableOpacity style={styles.primaryBtn} onPress={goPayment} activeOpacity={0.9}>
                      <CreditCard size={18} color="#ffffff" strokeWidth={2.4} />
                      <Text style={styles.primaryText}>Thanh toán ngay</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {existingComplaint ? (
                        <TouchableOpacity
                          style={[
                            styles.ghostBtn,
                            {
                              flex: 1,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              borderColor: existingComplaint.status === 'RESOLVED' ? '#bbf7d0' : '#fde68a',
                              backgroundColor: existingComplaint.status === 'RESOLVED' ? '#f0fdf4' : '#fffbeb',
                            },
                          ]}
                          onPress={() => setShowComplaintTrackingModal(true)}
                          activeOpacity={0.85}
                        >
                          <Clock
                            size={15}
                            color={existingComplaint.status === 'RESOLVED' ? '#16a34a' : '#d97706'}
                          />
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '700',
                              color: existingComplaint.status === 'RESOLVED' ? '#16a34a' : '#d97706',
                            }}
                          >
                            Theo dõi khiếu nại
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.ghostBtn,
                            {
                              flex: 1,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              borderColor: '#fecaca',
                              backgroundColor: '#fef2f2',
                            },
                          ]}
                          onPress={() => setShowComplaintModal(true)}
                          activeOpacity={0.85}
                        >
                          <AlertTriangle size={15} color="#dc2626" />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#dc2626' }}>Khiếu nại</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.ghostBtn,
                          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
                        ]}
                        onPress={goBack}
                        activeOpacity={0.85}
                      >
                        <ArrowLeft size={15} color={INK} strokeWidth={2.2} />
                        <Text style={styles.ghostText}>Quay lại</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ) : (
            // ACCEPTED / ASSIGNED / EN_ROUTE / ARRIVED
            <View>
              {/* Banner trạng thái theo màu ngữ nghĩa */}
              {status === 'ARRIVED' || status === 'DIAGNOSED' ? (
                <View>
                  <View style={[styles.statusBanner, { backgroundColor: '#fff7ed', borderColor: '#ffedd5', borderWidth: 1 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.statusText, { color: '#c2410c', fontWeight: '800' }]}>
                        {status === 'DIAGNOSED' ? 'Thợ đã gửi báo giá sửa chữa' : 'Đội cứu hộ đã đến nơi'}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#9a3412', marginTop: 2 }}>
                        Vui lòng xem và duyệt báo giá để thợ tiến hành sửa xe
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { marginTop: 10, height: 46 }]}
                    onPress={() => router.push({
                      pathname: '/customer/rescue-quote',
                      params: { id: String(requestId) },
                    })}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.primaryText, { fontSize: 14 }]}>📋 Xem & Duyệt báo giá sự cố</Text>
                  </TouchableOpacity>
                </View>
              ) : status === 'TOW_TO_GARAGE' ? (
                <View style={[styles.statusBanner, { backgroundColor: '#fff7ed', borderColor: '#fed7aa', borderWidth: 1 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statusText, { color: '#c2410c', fontWeight: '800' }]}>
                      🛠️ Xe đã về tới garage · Đang sửa chữa
                    </Text>
                    <Text style={{ fontSize: 12, color: '#9a3412', marginTop: 2 }}>
                      Phương tiện đã được đưa về an toàn tới {data?.garage?.name || 'garage'} và đang được sửa chữa. Sau khi hoàn tất, bạn sẽ nhận được thông báo đến nhận xe.
                    </Text>
                  </View>
                </View>
              ) : (status === 'TOWING' || (status === 'REPAIRING_ONSITE' && isTow)) ? (
                <View style={[styles.statusBanner, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statusText, { color: '#1d4ed8', fontWeight: '800' }]}>
                      🚚 Đang kéo xe về garage
                    </Text>
                    <Text style={{ fontSize: 12, color: '#1e40af', marginTop: 2 }}>
                      Phương tiện đang được chuyển về {data?.garage?.name || 'garage'} để chuẩn bị sửa chữa.
                    </Text>
                  </View>
                </View>
              ) : status === 'REPAIRING_ONSITE' ? (
                <View style={[styles.statusBanner, { backgroundColor: '#eff6ff', borderColor: '#dbeafe', borderWidth: 1 }]}>
                  <Text style={[styles.statusText, { color: '#1e40af' }]}>🔧 Đang tiến hành sửa chữa tại chỗ</Text>
                </View>
              ) : status === 'EN_ROUTE' ? (
                <View style={[styles.statusBanner, styles.enrouteBanner]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.enrouteLabel}>Nhân viên cứu hộ đang tới</Text>
                    {routeInfo && <Text style={styles.enrouteSub}>Còn khoảng {routeInfo.distanceKm.toFixed(1)} km</Text>}
                  </View>
                  {etaSec != null && (
                    <View style={styles.etaPill}>
                      <Text style={styles.etaPillVal}>{mmss(etaSec)}</Text>
                      <Text style={styles.etaPillUnit}>phút</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.statusBanner, { backgroundColor: AMBER_BG }]}>
                  <Text style={[styles.statusText, { color: AMBER_INK }]}>
                    {status === 'ACCEPTED' ? 'Gara đã nhận yêu cầu' : 'Nhân viên chuẩn bị xuất phát'}
                  </Text>
                  {data?.dispatchDistanceKm != null && (
                    <Text style={[styles.statusText, { color: AMBER_INK }]}>{Number(data.dispatchDistanceKm).toFixed(1)} km</Text>
                  )}
                </View>
              )}

              {/* Khi chưa có nhân viên: hiển thị Gara tiếp nhận */}
              {!data?.staff && data?.garage && (
                <View style={styles.peerBlock}>
                  <View style={styles.hr} />
                  <View style={styles.peerHead}>
                    <Avatar name={data.garage.name} dark size={56} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.peerNameRow}>
                        <Text style={styles.peerName} numberOfLines={1}>{data.garage.name}</Text>
                        <View style={styles.verifyBadge}>
                          <ShieldCheck size={11} color={GREEN} strokeWidth={2.6} />
                          <Text style={styles.verifyText}>Đã xác minh</Text>
                        </View>
                      </View>
                      <View style={styles.metaLine}>
                        <RatingInline rating={data.garage.avgRating} count={data.garage.ratingCount} />
                        <Text style={styles.dot}>·</Text>
                        <Text style={styles.peerMeta}>Gara cứu hộ</Text>
                      </View>
                    </View>
                  </View>
                  <ActionRow
                    phone={data.garage.phone}
                    onMessage={() => openMessages('GARAGE', data.garage!.name, data.garage!.phone, 'Gara')}
                    onFreeCall={onFreeCall}
                    onCall={() => callPhone(data.garage!.phone)}
                  />
                </View>
              )}

              {/* Nhân viên cứu hộ (người trực tiếp thực hiện nhiệm vụ) */}
              {data?.staff ? (
                <View style={styles.peerBlock}>
                  <View style={styles.hr} />
                  <View style={styles.peerHead}>
                    <Avatar name={data.staff.name} size={56} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.peerNameRow}>
                        <Text style={styles.peerName} numberOfLines={1}>{data.staff.name}</Text>
                        {data.rescueVehicle?.licensePlate && <Text style={styles.plate}>{data.rescueVehicle.licensePlate}</Text>}
                      </View>
                      <View style={styles.metaLine}>
                        <RatingInline rating={data.staff.rating} count={data.staff.ratingCount} />
                        <Text style={styles.dot}>·</Text>
                        <Text style={styles.peerMeta}>
                          {data?.garage?.name ? `Nhân viên cứu hộ · ${data.garage.name}` : 'Nhân viên cứu hộ'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <ActionRow
                    phone={data.staff.phone}
                    onMessage={() => openMessages('STAFF', data.staff!.name, data.staff!.phone, 'Nhân viên cứu hộ')}
                    onFreeCall={onFreeCall}
                    onCall={() => callPhone(data.staff!.phone)}
                  />
                </View>
              ) : data?.garage ? (
                <View style={styles.peerBlock}>
                  <View style={styles.hr} />
                  <View style={styles.assigningRow}>
                    <ActivityIndicator size="small" color={BRAND} />
                    <Text style={styles.assigningText}>Gara đang phân công nhân viên cứu hộ...</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.hr} />

              {feeBlock}
              <SafetyTips />

              {canCancel && (
                <TouchableOpacity style={styles.ghostLink} onPress={onCancel} activeOpacity={0.7} disabled={cancelling}>
                  <Text style={styles.cancelLinkText}>{cancelling ? 'Đang huỷ...' : 'Huỷ yêu cầu'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.ghostBtn,
                  {
                    alignSelf: 'stretch',
                    height: 48,
                    marginTop: canCancel ? 8 : 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  },
                ]}
                onPress={goBack}
                activeOpacity={0.85}
              >
                <ArrowLeft size={16} color={INK} strokeWidth={2.4} />
                <Text style={[styles.ghostText, { fontSize: 14, fontWeight: '800' }]}>Quay lại</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.ScrollView>
      </Animated.View>

      {/* Rating Modal */}
      {!Number.isNaN(requestId) && (
        <RatingModal
          visible={showRatingModal}
          requestId={requestId}
          requestCode={data?.code}
          garageName={data?.garage?.name}
          staffName={data?.staff?.name}
          onClose={() => setShowRatingModal(false)}
          onSuccess={() => {
            setData((prev) => (prev ? { ...prev, rated: true } : null));
          }}
        />
      )}

      {/* Complaint Modal */}
      {!Number.isNaN(requestId) && (
        <ComplaintModal
          visible={showComplaintModal}
          requestId={requestId}
          requestCode={data?.code}
          targetType="GARAGE"
          targetName={data?.garage?.name}
          onClose={() => setShowComplaintModal(false)}
          onSuccess={(created) => {
            const comp = created || {
              id: Date.now(),
              requestId,
              requestCode: data?.code,
              targetType: 'GARAGE',
              content: '',
              status: 'OPEN',
              createdByUserId: 0,
              createdAt: new Date().toISOString(),
            };
            setExistingComplaint(comp);
            setShowComplaintModal(false);
            if (!Number.isNaN(requestId)) {
              complaintApi.getByRequest(requestId).then((c) => {
                if (c) setExistingComplaint(c);
              }).catch(() => { });
            }
          }}
        />
      )}

      {/* Complaint Tracking Modal */}
      {existingComplaint && (
        <ComplaintTrackingModal
          visible={showComplaintTrackingModal}
          complaint={existingComplaint}
          requestCode={data?.code}
          garageName={data?.garage?.name}
          onClose={() => setShowComplaintTrackingModal(false)}
        />
      )}
    </View>
  );
}

function SafetyTips() {
  return (
    <View style={styles.tipsCard}>
      <View style={styles.tipsHead}>
        <Lightbulb size={15} color={AMBER_INK} strokeWidth={2.2} />
        <Text style={styles.tipsTitle}>Mẹo an toàn khi chờ</Text>
      </View>
      {SAFETY_TIPS.map((t, i) => (
        <View key={i} style={styles.tipRow}>
          <View style={styles.tipDot} />
          <Text style={styles.tipText}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#1c1917',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 10,
  elevation: 4,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  mapRegion: { flex: 1, backgroundColor: '#e5e7eb' },
  map: { flex: 1, backgroundColor: '#e5e7eb' },
  mapPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  mapPlaceholderText: { fontSize: 13, fontWeight: '600', color: SUB },

  floatHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  roundBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', ...CARD_SHADOW },

  /* Sheet */
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: BG, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#1c1917', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 16,
  },
  handleZone: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 40, height: 4, borderRadius: 12, backgroundColor: '#d6d3d1' },
  // Sheet cao SHEET_MAX nhưng bị dịch xuống DRAG_RANGE khi thu gọn → chừa đủ padding
  // để nội dung luôn cuộn tới đáy dù ở nấc thu gọn.
  scroll: { flex: 1 },
  sheetBody: { paddingHorizontal: 16, paddingBottom: DRAG_RANGE + 40 },

  /* Stepper */
  stepper: { flexDirection: 'row', marginBottom: 18, marginTop: 4 },
  stepItem: { flex: 1, alignItems: 'center' },
  stepLine: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center', height: 16 },
  stepBar: { flex: 1, height: 3, backgroundColor: LINE, borderRadius: 12 },
  stepBarOn: { backgroundColor: BRAND },
  stepBarHidden: { backgroundColor: 'transparent' },
  runTrack: { position: 'absolute', top: 6.5, height: 3, borderRadius: 12, backgroundColor: '#fed7aa' },
  comet: {
    position: 'absolute', left: 0, top: (3 - COMET) / 2, width: COMET, height: COMET, borderRadius: COMET / 2,
    backgroundColor: BRAND, shadowColor: BRAND, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 4, elevation: 4,
  },
  stepDot: { width: 11, height: 11, borderRadius: 12, backgroundColor: LINE },
  stepDotOn: { backgroundColor: BRAND },
  stepDotCurrent: { width: 15, height: 15, borderRadius: 12, borderWidth: 3, borderColor: '#fed7aa', backgroundColor: BRAND },
  stepLabel: { fontSize: 11, color: SUB, marginTop: 6, fontWeight: '600' },
  stepLabelOn: { color: BRAND, fontWeight: '800' },

  centerBlock: { alignItems: 'center', paddingTop: 6 },
  stateIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: INK, marginTop: 12, textAlign: 'center' },
  subText: { fontSize: 14, fontWeight: '600', color: SUB, textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: 8 },

  radarWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  radarRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND },
  radarCore: { width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff4ed' },

  /* Buttons */
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch',
    backgroundColor: BRAND, borderRadius: 12, height: 52, marginTop: 20,
  },
  primaryText: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch',
    borderWidth: 1.5, borderColor: '#fecaca', backgroundColor: DANGER_BG, borderRadius: 12, height: 48, marginTop: 20,
  },
  dangerText: { fontSize: 14, fontWeight: '800', color: DANGER },
  ghostLink: { alignItems: 'center', marginTop: 14, paddingVertical: 8 },
  ghostLinkText: { fontSize: 14, fontWeight: '700', color: SUB },
  cancelLinkText: { fontSize: 14, fontWeight: '700', color: DANGER },

  /* Status banners */
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginTop: 4,
  },
  statusText: { fontSize: 14, fontWeight: '800' },
  enrouteBanner: { backgroundColor: '#eff6ff', flexDirection: 'row', alignItems: 'center' },
  enrouteLabel: { fontSize: 15, fontWeight: '800', color: '#1d4ed8' },
  enrouteSub: { fontSize: 13, fontWeight: '600', color: '#3b82f6', marginTop: 2 },
  etaPill: { backgroundColor: '#1d4ed8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center' },
  etaPillVal: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  etaPillUnit: { fontSize: 10, fontWeight: '600', color: '#bfdbfe' },

  /* Peer — bố cục phẳng, phân tách bằng đường kẻ (không dùng card) */
  peerBlock: {},
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: LINE, marginVertical: 16 },
  peerHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarDark: { backgroundColor: INK },
  avatarBrand: { backgroundColor: '#0f766e' },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  peerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  peerName: { fontSize: 15, fontWeight: '800', color: INK, flexShrink: 1 },
  peerMeta: { fontSize: 12, fontWeight: '600', color: SUB, flexShrink: 1 },
  dot: { fontSize: 12, color: '#d6d3d1' },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingVal: { fontSize: 13, fontWeight: '800', color: AMBER_INK },
  ratingCnt: { fontSize: 12, fontWeight: '600', color: SUB },
  noRating: { fontSize: 12, fontWeight: '600', color: '#a8a29e' },
  verifyBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#dcfce7', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 8 },
  verifyText: { fontSize: 10.5, fontWeight: '800', color: '#15803d' },
  plate: { fontSize: 12, fontWeight: '800', color: INK, backgroundColor: FIELD, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },

  assigningRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  assigningText: { fontSize: 13, fontWeight: '600', color: SUB },

  /* Hàng hành động: Nhắn tin | Gọi miễn phí | Gọi */
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  actionText: { fontSize: 13.5, fontWeight: '800' },
  actionSep: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: '#d6d3d1' },
  actionDisabled: { opacity: 0.4 },

  /* Fee */
  feeCard: { backgroundColor: CARD, borderWidth: 1, borderColor: LINE, borderRadius: 12, padding: 14, marginTop: 12 },
  feeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  feeLabel: { fontSize: 14, fontWeight: '600', color: SUB },
  feeVal: { fontSize: 14, fontWeight: '800', color: INK },
  feeNote: { fontSize: 12, fontWeight: '600', color: SUB, marginTop: 2, lineHeight: 16 },

  /* Safety tips */
  tipsCard: { backgroundColor: AMBER_BG, borderRadius: 12, padding: 14, marginTop: 16 },
  tipsHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  tipsTitle: { fontSize: 13, fontWeight: '800', color: AMBER_INK },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  tipDot: { width: 5, height: 5, borderRadius: 12, backgroundColor: AMBER_INK, marginTop: 7 },
  tipText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#92400e', lineHeight: 18 },

  ghostBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: LINE,
  },
  ghostText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: INK,
  },
});
