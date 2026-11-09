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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Image,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
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
  AlertCircle,
  MapPin,
  Building2,
  Camera,
  Copy,
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
import { canFreeCall } from '../../utils/call';
import { callManager } from '../../realtime/callManager';

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
const TERMINAL: RescueStatus[] = ['NO_GARAGE_FOUND', 'DECLINED', 'CANCELLED', 'PAID', 'RATED'];

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${hh}:${mm} · ${dd}/${MM}/${yyyy}`;
};

const SAFETY_TIPS = [
  'Bật đèn cảnh báo (hazard) để xe khác dễ nhận thấy.',
  'Rời khỏi lòng đường, đứng ở nơi an toàn phía sau rào chắn nếu có.',
  'Đặt vật cảnh báo cách xe khoảng 5–10 m về phía sau.',
];

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_MAX = Math.round(SCREEN_H * 0.88);
const SHEET_MIN = Math.round(SCREEN_H * 0.58);
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
  freeCallDisabled,
  onCall,
}: {
  phone?: string;
  onMessage: () => void;
  onFreeCall: () => void;
  /** Đơn chưa/không còn ở trạng thái cho phép gọi thoại trong app. */
  freeCallDisabled?: boolean;
  onCall: () => void;
}) {
  return (
    <View style={styles.actionRow}>
      <TouchableOpacity style={styles.action} onPress={onMessage} activeOpacity={0.65}>
        <MessageCircle size={17} color={INFO} strokeWidth={2.3} />
        <Text style={[styles.actionText, { color: INFO }]}>Nhắn tin</Text>
      </TouchableOpacity>
      <View style={styles.actionSep} />
      <TouchableOpacity
        style={[styles.action, freeCallDisabled && styles.actionDisabled]}
        onPress={onFreeCall}
        disabled={freeCallDisabled}
        activeOpacity={0.65}
      >
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

  // Giải trình cáo buộc bom đơn
  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [counterExplanation, setCounterExplanation] = useState('');
  const [counterPhotoUri, setCounterPhotoUri] = useState<string | null>(null);
  const [submittingCounter, setSubmittingCounter] = useState(false);

  // Thanh toán cọc 50.000đ qua PayOS VietQR ngay trong app
  const [creatingDepositLink, setCreatingDepositLink] = useState(false);
  const [depositPayOSData, setDepositPayOSData] = useState<any | null>(null);
  const [depositPayOSModalVisible, setDepositPayOSModalVisible] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {}
  };

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
  const paidModalShownRef = useRef(false);

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
  const searching = status === 'DRAFT' || status === 'SEARCHING' || status === 'PENDING_GARAGE' || !status;

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
    completedRedirectedRef.current = false;
    paidModalShownRef.current = false;
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

        // Khi đơn hoàn tất thanh toán (PAID / RATED) -> tự động mở modal đánh giá
        if ((res.status === 'PAID' || res.status === 'RATED') && !res.rated && !paidModalShownRef.current) {
          paidModalShownRef.current = true;
          setTimeout(() => {
            setShowRatingModal(true);
          }, 600);
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
          // Khi đang chờ gara nhận, hoặc khi khách đang chờ nhân viên xác nhận tiền mặt -> poll nhanh hơn (2s)
          const isWaitingCash = res.cashConfirmedByCustomer || res.paymentMethod === 'CASH';
          const nextPollMs =
            (res.status === 'PENDING_GARAGE' || res.status === 'SEARCHING' || isWaitingCash)
              ? 2000
              : POLL_MS;
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

  // Gọi miễn phí qua Internet ngay trong app (không lộ số điện thoại thật, không tốn cước).
  const startFreeCall = (peer: 'GARAGE' | 'STAFF', name: string) =>
    callManager.startCall({ rescueRequestId: requestId, peer, peerName: name });
  const freeCallDisabled = !canFreeCall(status);

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

  const onCancel = () => {
    let confirmMsg = 'Đơn sẽ bị huỷ và hệ thống ngừng tìm gara.';
    if (status === 'EN_ROUTE') {
      confirmMsg =
        'Kỹ thuật viên đang di chuyển trên đường tới bạn. Nếu kỹ thuật viên đã xuất phát trên 3 phút, hệ thống sẽ ghi nhận đối soát hỗ trợ chi phí xăng xe. Bạn có chắc chắn muốn huỷ không?';
    } else if (status === 'ASSIGNED') {
      confirmMsg =
        'Gara đã phân công kỹ thuật viên chuẩn bị tới bạn. Bạn có chắc chắn muốn huỷ không?';
    }
    Alert.alert('Huỷ yêu cầu cứu hộ?', confirmMsg, [
      { text: 'Không', style: 'cancel' },
      { text: 'Huỷ yêu cầu', style: 'destructive', onPress: doCancel },
    ]);
  };

  const handlePickCounterImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setCounterPhotoUri(res.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể chọn ảnh từ thư viện.');
    }
  };

  const handleTakeCounterPhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Cần quyền camera', 'Vui lòng cấp quyền chụp ảnh để cung cấp bằng chứng đối soát.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setCounterPhotoUri(res.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể khởi động camera.');
    }
  };

  const handleChooseCounterSource = () => {
    Alert.alert('Đính kèm bằng chứng đối chứng', 'Chọn nguồn ảnh chứng minh bạn có mặt tại điểm hẹn', [
      { text: 'Chụp ảnh mới', onPress: handleTakeCounterPhoto },
      { text: 'Chọn từ thư viện', onPress: handlePickCounterImage },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  };

  const handleSubmitCounter = async () => {
    if (!counterExplanation.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập nội dung giải trình của bạn.');
      return;
    }
    if (!data?.id) return;
    try {
      setSubmittingCounter(true);
      let uploadedAttachmentUrl: string | undefined = undefined;
      if (counterPhotoUri) {
        try {
          uploadedAttachmentUrl = await rescueApi.uploadPhoto(counterPhotoUri);
        } catch {
          console.warn('Không thể upload ảnh minh chứng kháng cáo');
        }
      }
      const updated = await rescueApi.counterBom(data.id, {
        explanation: counterExplanation.trim(),
        attachmentUrl: uploadedAttachmentUrl,
      });
      setData(updated);
      setCounterModalVisible(false);
      setCounterPhotoUri(null);
      Alert.alert('Thành công', 'Giải trình và bằng chứng của bạn đã được gửi tới Ban quản trị để đối soát 2 chiều.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể gửi giải trình.');
    } finally {
      setSubmittingCounter(false);
    }
  };

  // Mở modal thanh toán cọc 50.000đ bằng VietQR PayOS ngay trong ứng dụng
  const handleOpenDepositPayOS = async () => {
    if (!requestId || Number.isNaN(requestId)) return;
    try {
      setCreatingDepositLink(true);
      const linkData = await rescueApi.createDepositLink(requestId);
      setDepositPayOSData(linkData);
      setDepositPayOSModalVisible(true);
    } catch (e: any) {
      Alert.alert(
        'Không thể tạo mã QR đặt cọc',
        e?.response?.data?.message || e?.message || 'Vui lòng thử lại sau giây lát.'
      );
    } finally {
      setCreatingDepositLink(false);
    }
  };

  // Kiểm tra trạng thái thanh toán cọc PayOS (tự động polling 3s)
  const handleCheckDepositPayOS = useCallback(
    async (silent = false) => {
      if (!depositPayOSData?.orderCode && (!requestId || Number.isNaN(requestId))) return;
      try {
        let updatedReq: RescueRequestDto | null = null;
        if (depositPayOSData?.orderCode) {
          try {
            const res = await rescueApi.checkDepositPayOSStatus(depositPayOSData.orderCode);
            if (res && res.id) updatedReq = res;
          } catch {}
        }
        if ((!updatedReq || updatedReq.depositStatus === 'PENDING') && requestId) {
          try {
            const fresh = await rescueApi.getStatus(requestId);
            if (fresh && fresh.depositStatus && fresh.depositStatus !== 'PENDING') {
              updatedReq = fresh;
            }
          } catch {}
        }
        if (updatedReq && updatedReq.depositStatus && updatedReq.depositStatus !== 'PENDING') {
          setDepositPayOSModalVisible(false);
          setDepositPayOSData(null);
          setData(updatedReq);
        } else if (!silent) {
          Alert.alert('Chưa ghi nhận giao dịch', 'Hệ thống đang chờ ngân hàng xác nhận chuyển khoản cọc 50.000đ.');
        }
      } catch {}
    },
    [depositPayOSData?.orderCode, requestId]
  );

  useEffect(() => {
    if (!depositPayOSModalVisible || !depositPayOSData?.orderCode) return;
    const poll = setInterval(() => {
      handleCheckDepositPayOS(true);
    }, 3000);
    return () => clearInterval(poll);
  }, [depositPayOSModalVisible, depositPayOSData?.orderCode, handleCheckDepositPayOS]);

  // Huỷ được khi nhân viên chưa tới nơi: DRAFT / SEARCHING / PENDING_GARAGE / ACCEPTED / ASSIGNED / EN_ROUTE.
  const canCancel =
    status === 'DRAFT' ||
    status === 'SEARCHING' ||
    status === 'PENDING_GARAGE' ||
    status === 'ACCEPTED' ||
    status === 'ASSIGNED' ||
    status === 'EN_ROUTE' ||
    !status;
  const isCompleted =
    status === 'COMPLETED' || status === 'AWAITING_PAYMENT' || status === 'PAID';
  const showStepper = status !== 'NO_GARAGE_FOUND' && status !== 'DECLINED' && status !== 'CANCELLED';

  const isDeclined = data?.quoteStatus === 'DECLINED';
  const isTow = !isDeclined && (data?.quoteType === 'TOW' || data?.isTowing === true || ((data?.towingFee ?? 0) > 0 && !!data?.towingReason));
  const isCash = Boolean(data?.cashConfirmedByCustomer);
  const towingFee = isDeclined ? 0 : (data?.towingFee ?? 0);
  const repairFee = isDeclined ? 0 : (data?.repairFee ?? data?.serviceFee ?? 0);
  const hasPaidDeposit =
    Boolean(data?.depositRequired) &&
    (data?.depositStatus === 'PAID' || data?.depositStatus === 'TRANSFERRED_TO_GARAGE');
  const depositDeduction = hasPaidDeposit ? (data?.depositAmount || 50000) : 0;

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

        {/* Khấu trừ tiền cọc 50.000đ đã nộp trước (nếu có) */}
        {hasPaidDeposit && (
          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { color: GREEN, fontWeight: '700' }]}>
              Tiền cọc đã nộp (Sàn giữ & trả Gara)
            </Text>
            <Text style={[styles.feeVal, { color: GREEN }]}>-{formatVnd(depositDeduction)}</Text>
          </View>
        )}

        {/* Tổng chi phí dự kiến / Còn cần thanh toán */}
        {!isDeclined && data.totalAmount != null && (data.totalAmount !== data.rescueFee || hasPaidDeposit) && (
          <View style={[styles.feeRow, { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8, marginTop: 4 }]}>
            <Text style={[styles.feeLabel, { fontWeight: '700', color: INK }]}>
              {hasPaidDeposit ? 'Còn cần thanh toán' : 'Tổng chi phí dự kiến'}
            </Text>
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
      <StatusBar barStyle="dark-content" />

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
              <View style={[styles.stateIcon, { backgroundColor: data?.bomReason ? '#fef3c7' : DANGER_BG }]}>
                {data?.bomReason ? (
                  <AlertTriangle size={28} color="#d97706" strokeWidth={2.4} />
                ) : (
                  <X size={28} color={DANGER} strokeWidth={2.6} />
                )}
              </View>
              <Text style={styles.title}>
                {data?.bomReason ? 'Đơn bị báo bom đơn' : 'Yêu cầu đã huỷ'}
              </Text>
              <Text style={styles.subText}>
                {data?.bomReason
                  ? `Kỹ thuật viên đã báo cáo bom đơn với lý do: "${data.bomReason}" (sau ${data.bomWaitingMinutes ?? 10} phút chờ).`
                  : `Yêu cầu cứu hộ này đã được huỷ${(data?.cancelledAt || (data as any)?.updatedAt) ? ` lúc ${formatDateTime(data?.cancelledAt || (data as any)?.updatedAt)}` : ''}.`}
              </Text>

              {data?.depositStatus === 'REFUNDED_TO_WALLET' && (
                <View
                  style={{
                    width: '100%',
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: '#f0fdf4',
                    borderWidth: 1,
                    borderColor: '#86efac',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803d', textAlign: 'center' }}>
                    ✓ Đã bảo lưu {formatVnd(data?.depositAmount || 50000)} tiền cọc vào tài khoản
                  </Text>
                  <Text style={{ fontSize: 12, color: '#166534', textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
                    Do bạn huỷ đơn trước khi Gara xác nhận, số tiền cọc này được lưu vào tài khoản của bạn để tự động dùng cho lần cứu hộ tiếp theo.
                  </Text>
                </View>
              )}

              {data?.depositStatus === 'FORFEITED_TO_SYSTEM' && (
                <View
                  style={{
                    width: '100%',
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: '#fef2f2',
                    borderWidth: 1,
                    borderColor: '#fecaca',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#b91c1c', textAlign: 'center' }}>
                    ⚠️ Tiền cọc {formatVnd(data?.depositAmount || 50000)} đã thuộc về sàn
                  </Text>
                  <Text style={{ fontSize: 12, color: '#991b1b', textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
                    Đơn bị huỷ sau khi Gara đã xác nhận hoặc bị phê duyệt báo cáo bom đơn nên khoản tiền cọc thuộc về sàn theo quy định.
                  </Text>
                </View>
              )}

              {/* Giải trình của khách nếu bị báo bom */}
              {data?.bomReason && (
                <View style={{ width: '100%', marginTop: 12, paddingHorizontal: 16 }}>
                  {data?.customerCounterExplanation ? (
                    <View style={styles.counterSubmittedBox}>
                      <Text style={styles.counterSubmittedTitle}>Đã gửi giải trình phản hồi</Text>
                      <Text style={styles.counterSubmittedText}>{`"${data.customerCounterExplanation}"`}</Text>
                      <Text style={styles.counterSubmittedSub}>Ban quản trị đang tiến hành đối soát 2 chiều.</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => setCounterModalVisible(true)}
                      activeOpacity={0.88}
                    >
                      <AlertCircle size={16} color="#ffffff" strokeWidth={2.2} />
                      <Text style={styles.counterBtnText}>Tôi không bom đơn! Gửi giải trình</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <TouchableOpacity style={[styles.primaryBtn, { flexDirection: 'row', gap: 6, marginTop: 14 }]} onPress={goBack} activeOpacity={0.9}>
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

              {data?.depositStatus === 'REFUNDED_TO_WALLET' && (
                <View
                  style={{
                    width: '100%',
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: '#f0fdf4',
                    borderWidth: 1,
                    borderColor: '#86efac',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803d', textAlign: 'center' }}>
                    ✓ Đã bảo lưu {formatVnd(data?.depositAmount || 50000)} tiền cọc vào tài khoản
                  </Text>
                  <Text style={{ fontSize: 12, color: '#166534', textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
                    Khoản tiền cọc 50.000đ của bạn đã được lưu lại trong tài khoản và sẽ tự động áp dụng khi bạn chọn Gara khác hoặc tạo lại yêu cầu.
                  </Text>
                </View>
              )}

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
            data?.depositRequired && data?.depositStatus === 'PENDING' ? (
              <View style={styles.centerBlock}>
                <View style={[styles.stateIcon, { backgroundColor: '#fff7ed', borderWidth: 1.5, borderColor: '#fed7aa' }]}>
                  <ShieldCheck size={30} color={BRAND} strokeWidth={2.4} />
                </View>
                <Text style={styles.title}>Yêu cầu đặt cọc {formatVnd(data?.depositAmount || 50000)}</Text>
                <Text style={styles.subText}>
                  Tài khoản hoặc thiết bị này đã ghi nhận 2 lần bom đơn được Quản trị viên phê duyệt khiếu nại. Vui lòng đặt cọc trước{' '}
                  <Text style={{ fontWeight: '800', color: BRAND }}>{formatVnd(data?.depositAmount || 50000)}</Text> phí di chuyển để hệ thống điều phối Gara.
                </Text>

                <View
                  style={{
                    width: '100%',
                    backgroundColor: '#fffbeb',
                    borderWidth: 1,
                    borderColor: '#fde68a',
                    borderRadius: 14,
                    padding: 14,
                    marginTop: 14,
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400e' }}>
                    Quy định bảo vệ tiền cọc trên sàn SRAS:
                  </Text>
                  <Text style={{ fontSize: 12.5, color: '#78350f', lineHeight: 18 }}>
                    • <Text style={{ fontWeight: '800' }}>Hoàn thành đơn:</Text> Trừ trực tiếp {formatVnd(data?.depositAmount || 50000)} vào hoá đơn của bạn và hoàn trả đủ về Gara.
                  </Text>
                  <Text style={{ fontSize: 12.5, color: '#78350f', lineHeight: 18 }}>
                    • <Text style={{ fontWeight: '800' }}>Huỷ trước khi Gara xác nhận:</Text> Tiền cọc được bảo lưu vào tài khoản để tự động dùng cho lần cứu hộ tiếp theo.
                  </Text>
                  <Text style={{ fontSize: 12.5, color: '#78350f', lineHeight: 18 }}>
                    • <Text style={{ fontWeight: '800' }}>Bom đơn tiếp:</Text> Tiền cọc thuộc về sàn.
                  </Text>
                  <Text style={{ fontSize: 12.5, color: '#15803d', fontWeight: '700', lineHeight: 18 }}>
                    • Hoàn thành 2 đơn đặt cọc (lần 3 & lần 4) thành công thì từ lần thứ 5 sẽ được gỡ bỏ yêu cầu đặt cọc.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 16 }, creatingDepositLink && { opacity: 0.7 }]}
                  onPress={handleOpenDepositPayOS}
                  disabled={creatingDepositLink}
                  activeOpacity={0.9}
                >
                  {creatingDepositLink ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <CreditCard size={18} color="#ffffff" strokeWidth={2.4} />
                      <Text style={styles.primaryText}>
                        Thanh toán cọc {formatVnd(data?.depositAmount || 50000)} (VietQR PayOS)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.dangerBtn} onPress={onCancel} activeOpacity={0.85} disabled={cancelling}>
                  {cancelling ? (
                    <ActivityIndicator size="small" color={DANGER} />
                  ) : (
                    <X size={16} color={DANGER} strokeWidth={2.4} />
                  )}
                  <Text style={styles.dangerText}>Huỷ yêu cầu</Text>
                </TouchableOpacity>
              </View>
            ) : (
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

                {hasPaidDeposit && (
                  <View
                    style={{
                      width: '100%',
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: '#f0fdf4',
                      borderWidth: 1,
                      borderColor: '#86efac',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803d', textAlign: 'center' }}>
                      ✓ Đã ghi nhận cọc {formatVnd(data?.depositAmount || 50000)} (Sàn đang giữ)
                    </Text>
                    <Text style={{ fontSize: 12, color: '#166534', textAlign: 'center', marginTop: 3, lineHeight: 16 }}>
                      Tiền cọc sẽ được trừ trực tiếp vào hoá đơn khi hoàn tất hoặc bảo lưu vào tài khoản nếu bạn huỷ trước khi Gara xác nhận.
                    </Text>
                  </View>
                )}

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
            )
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
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        backgroundColor: '#fffbeb',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#fde68a',
                      }}
                    >
                      <ActivityIndicator size="small" color="#b45309" />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#b45309' }}>
                        Đang chờ nhân viên xác nhận (tự động cập nhật)...
                      </Text>
                    </View>

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
              {status === 'DIAGNOSED' ? (
                <View>
                  <View style={[styles.statusBanner, { backgroundColor: '#fff7ed', borderColor: '#ffedd5', borderWidth: 1 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.statusText, { color: '#c2410c', fontWeight: '800' }]}>
                        Thợ đã gửi báo giá sửa chữa
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
              ) : status === 'ARRIVED' ? (
                <View style={[styles.statusBanner, { backgroundColor: '#fff7ed', borderColor: '#fed7aa', borderWidth: 1 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statusText, { color: '#c2410c', fontWeight: '800' }]}>
                      📍 Đội cứu hộ đã đến nơi
                    </Text>
                    <Text style={{ fontSize: 12, color: '#9a3412', marginTop: 2 }}>
                      Nhân viên cứu hộ đang kiểm tra tình trạng phương tiện và lập bảng báo giá. Vui lòng đợi trong giây lát...
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <ActivityIndicator size="small" color="#c2410c" />
                      <Text style={{ fontSize: 12, color: '#c2410c', fontWeight: '700' }}>
                        Đang chờ nhân viên cập nhật bảng giá...
                      </Text>
                    </View>
                  </View>
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

              {/* 1. Nhân viên cứu hộ (người trực tiếp thực hiện nhiệm vụ) */}
              {data?.staff ? (
                <View style={styles.peerBlock}>
                  <View style={styles.hr} />
                  <View style={styles.peerHead}>
                    <Avatar name={data.staff.name} size={52} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.peerNameRow}>
                        <Text style={styles.peerName}>{data.staff.name}</Text>
                        {data.rescueVehicle?.licensePlate && (
                          <Text style={styles.plate}>{data.rescueVehicle.licensePlate}</Text>
                        )}
                      </View>
                      <View style={styles.metaLine}>
                        <RatingInline rating={data.staff.rating} count={data.staff.ratingCount} />
                        <Text style={styles.dot}>·</Text>
                        <Text style={styles.peerMeta}>Nhân viên cứu hộ</Text>
                      </View>
                      {data?.garage?.name ? (
                        <View style={styles.addressRow}>
                          <Building2 size={12} color={SUB} style={{ marginTop: 2, marginRight: 4 }} />
                          <Text style={styles.peerAddressText}>
                            Trực thuộc {data.garage.name}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <ActionRow
                    phone={data.staff.phone}
                    onMessage={() => openMessages('STAFF', data.staff!.name, data.staff!.phone, 'Nhân viên cứu hộ')}
                    onFreeCall={() => startFreeCall('STAFF', data.staff!.name)}
                    freeCallDisabled={freeCallDisabled}
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

              {/* 2. Thông tin Gara cứu hộ phụ trách */}
              {data?.garage && (
                <View style={styles.peerBlock}>
                  <View style={styles.hr} />
                  <View style={styles.peerHead}>
                    <Avatar name={data.garage.name} dark size={52} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.peerNameRow}>
                        <Text style={styles.peerName}>{data.garage.name}</Text>
                        <View style={styles.verifyBadge}>
                          <ShieldCheck size={11} color={GREEN} strokeWidth={2.6} />
                          <Text style={styles.verifyText}>Đã xác minh</Text>
                        </View>
                      </View>
                      <View style={styles.metaLine}>
                        <RatingInline rating={data.garage.avgRating} count={data.garage.ratingCount} />
                        <Text style={styles.dot}>·</Text>
                        <Text style={styles.peerMeta}>Gara đối tác cứu hộ</Text>
                      </View>
                      {data.garage.address ? (
                        <View style={styles.addressRow}>
                          <MapPin size={12} color={SUB} style={{ marginTop: 2, marginRight: 4 }} />
                          <Text style={styles.peerAddressText}>
                            {data.garage.address}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <ActionRow
                    phone={data.garage.phone}
                    onMessage={() => openMessages('GARAGE', data.garage!.name, data.garage!.phone, 'Gara')}
                    onFreeCall={() => startFreeCall('GARAGE', data.garage!.name)}
                    freeCallDisabled={freeCallDisabled}
                    onCall={() => callPhone(data.garage!.phone)}
                  />
                </View>
              )}

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

      {/* Counter Bom Modal */}
      <Modal
        visible={counterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCounterModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Giải trình không bom đơn</Text>
              <TouchableOpacity onPress={() => setCounterModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={SUB} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Kỹ thuật viên đã báo cáo bạn không có mặt. Nếu đây là nhầm lẫn, hãy giải trình chi tiết kèm lý do để Ban quản trị đối soát 2 chiều và bảo vệ quyền lợi của bạn.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập nội dung giải trình (VD: Tôi vẫn đang đứng chờ trước số nhà 12, thợ gọi máy bận lúc 10h15...)"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={counterExplanation}
              onChangeText={setCounterExplanation}
            />

            {/* Đính kèm ảnh minh chứng đối chứng */}
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: INK, marginBottom: 6 }}>
                Ảnh minh chứng (nếu có):
              </Text>
              {counterPhotoUri ? (
                <View
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 140,
                    borderRadius: 12,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                  }}
                >
                  <Image
                    source={{ uri: counterPhotoUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(0,0,0,0.65)',
                      padding: 6,
                      borderRadius: 20,
                    }}
                    onPress={() => setCounterPhotoUri(null)}
                  >
                    <X size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: '#cbd5e1',
                    backgroundColor: '#f8fafc',
                  }}
                  onPress={handleChooseCounterSource}
                  activeOpacity={0.7}
                >
                  <Camera size={18} color="#64748b" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>
                    Chụp ảnh / Chọn ảnh minh chứng
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#f3f4f6' }]}
                onPress={() => setCounterModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: INK }]}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: BRAND, flex: 1 }]}
                onPress={handleSubmitCounter}
                disabled={submittingCounter}
              >
                {submittingCounter ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#ffffff' }]}>Gửi giải trình</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL THANH TOÁN CỌC 50.000Đ PAYOS (QUÉT MÃ VIETQR TRONG APP) ── */}
      <Modal
        visible={depositPayOSModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDepositPayOSModalVisible(false)}
      >
        <View style={styles.payOSOverlay}>
          <View style={styles.payOSModalContainer}>
            <View style={styles.payOSHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.payOSIconPill}>
                  <CreditCard size={18} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.payOSHeaderTitle}>Thanh toán trực tuyến PayOS</Text>
                  <Text style={styles.payOSHeaderSub}>Đặt cọc chi phí di chuyển VietQR 24/7</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.payOSCloseBtn}
                onPress={() => setDepositPayOSModalVisible(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={BRAND} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.payOSScrollContent}>
              <View style={styles.payOSAmountBox}>
                <Text style={styles.payOSAmountLabel}>Số tiền cọc cần thanh toán</Text>
                <Text style={styles.payOSAmountValue}>
                  {formatVnd(depositPayOSData?.amount || data?.depositAmount || 50000)}
                </Text>
              </View>

              {depositPayOSData && (
                <View style={styles.payOSQRCard}>
                  <Text style={styles.payOSQRInstruction}>Mở app ngân hàng bất kỳ để quét mã QR:</Text>
                  <View style={styles.payOSQRImageWrap}>
                    <Image
                      source={{
                        uri:
                          depositPayOSData.bin && depositPayOSData.accountNumber
                            ? `https://img.vietqr.io/image/${depositPayOSData.bin}-${depositPayOSData.accountNumber}-compact2.png?amount=${depositPayOSData.amount || 50000}&addInfo=${encodeURIComponent(depositPayOSData.description || '')}&accountName=${encodeURIComponent(depositPayOSData.accountName || '')}`
                            : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(depositPayOSData.checkoutUrl || '')}`,
                      }}
                      style={styles.payOSQRImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.payOSQRStatusRow}>
                    <ActivityIndicator size="small" color={BRAND} />
                    <Text style={styles.payOSQRStatusText}>Đang chờ bạn quét mã thanh toán...</Text>
                  </View>
                </View>
              )}

              {depositPayOSData && (
                <View style={styles.payOSInfoCard}>
                  {depositPayOSData.accountName ? (
                    <View style={styles.payOSInfoRow}>
                      <Text style={styles.payOSInfoLabel}>Người nhận:</Text>
                      <Text style={styles.payOSInfoValBold}>{depositPayOSData.accountName}</Text>
                    </View>
                  ) : null}
                  {depositPayOSData.accountNumber ? (
                    <View style={styles.payOSInfoRow}>
                      <Text style={styles.payOSInfoLabel}>Số tài khoản:</Text>
                      <TouchableOpacity
                        style={styles.payOSCopyRow}
                        onPress={() => copyToClipboard(depositPayOSData.accountNumber, 'acc')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.payOSInfoValMono}>{depositPayOSData.accountNumber}</Text>
                        <Copy size={13} color={copiedField === 'acc' ? GREEN : BRAND} />
                        <Text style={[styles.copyTip, copiedField === 'acc' && { color: GREEN }]}>
                          {copiedField === 'acc' ? 'Đã chép' : 'Sao chép'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  <View style={styles.payOSInfoRow}>
                    <Text style={styles.payOSInfoLabel}>Số tiền:</Text>
                    <Text style={[styles.payOSInfoValBold, { color: BRAND, fontSize: 16 }]}>
                      {formatVnd(depositPayOSData.amount || data?.depositAmount || 50000)}
                    </Text>
                  </View>
                </View>
              )}

              {depositPayOSData && (
                <View style={styles.payOSDescCard}>
                  <View style={styles.payOSDescHeader}>
                    <Text style={styles.payOSDescLabel}>Nội dung chuyển khoản (bắt buộc):</Text>
                    <TouchableOpacity
                      style={styles.payOSDescCopyBtn}
                      onPress={() =>
                        copyToClipboard(depositPayOSData.description || `COC ${data?.code || ''}`, 'desc')
                      }
                      activeOpacity={0.7}
                    >
                      <Copy size={13} color={copiedField === 'desc' ? GREEN : BRAND} />
                      <Text style={[styles.copyTip, copiedField === 'desc' && { color: GREEN }]}>
                        {copiedField === 'desc' ? 'Đã chép' : 'Sao chép'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.payOSDescBox}>
                    <Text style={styles.payOSDescText} selectable>
                      {depositPayOSData.description || `COC ${data?.code || ''}`}
                    </Text>
                  </View>
                  <Text style={styles.payOSDescNote}>
                    * Vui lòng giữ đúng nội dung chuyển khoản để hệ thống tự động xác nhận cọc và điều phối Gara.
                  </Text>
                </View>
              )}

              <View style={styles.payOSActionGroup}>
                <View style={styles.payOSAutoStatusBox}>
                  <View style={styles.payOSAutoStatusPulse}>
                    <ActivityIndicator size="small" color="#16a34a" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.payOSAutoStatusTitle}>Đang tự động ghi nhận chuyển khoản...</Text>
                    <Text style={styles.payOSAutoStatusSub}>
                      Sau khi chuyển khoản thành công, hệ thống sẽ tự động kích hoạt tìm kiếm Gara ngay lập tức.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  peerHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarDark: { backgroundColor: INK },
  avatarBrand: { backgroundColor: '#0f766e' },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  peerNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  peerName: { fontSize: 15, fontWeight: '800', color: INK },
  peerMeta: { fontSize: 12, fontWeight: '600', color: SUB },
  peerSubDetail: { fontSize: 12, fontWeight: '500', color: SUB, marginTop: 4, lineHeight: 17 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  peerAddressText: { flex: 1, fontSize: 12, fontWeight: '500', color: SUB, lineHeight: 17 },
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

  /* Counter bom & Modal */
  counterSubmittedBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  counterSubmittedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 4,
  },
  counterSubmittedText: {
    fontSize: 13,
    color: '#78350f',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 6,
  },
  counterSubmittedSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309',
  },
  counterBtn: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  counterBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: INK,
  },
  modalSub: {
    fontSize: 13,
    color: SUB,
    lineHeight: 18,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: INK,
    minHeight: 90,
    textAlignVertical: 'top',
    backgroundColor: '#f9fafb',
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  /* PayOS Deposit VietQR Modal Styles */
  payOSOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  payOSModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    maxHeight: '90%',
    paddingBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 16 },
      android: { elevation: 16 },
    }),
  },
  payOSHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  payOSIconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payOSHeaderTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: INK,
  },
  payOSHeaderSub: {
    fontSize: 12,
    color: SUB,
    marginTop: 1,
  },
  payOSCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payOSScrollContent: {
    padding: 20,
    gap: 16,
  },
  payOSAmountBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  payOSAmountLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#9a3412',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  payOSAmountValue: {
    fontSize: 26,
    fontWeight: '900',
    color: BRAND,
    marginTop: 4,
  },
  payOSQRCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LINE,
  },
  payOSQRInstruction: {
    fontSize: 13,
    fontWeight: '600',
    color: SUB,
    marginBottom: 12,
    textAlign: 'center',
  },
  payOSQRImageWrap: {
    width: 220,
    height: 220,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  payOSQRImage: {
    width: '100%',
    height: '100%',
  },
  payOSQRStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  payOSQRStatusText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: BRAND,
  },
  payOSInfoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  payOSInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payOSInfoLabel: {
    fontSize: 13,
    color: SUB,
    fontWeight: '600',
  },
  payOSInfoValBold: {
    fontSize: 13.5,
    fontWeight: '800',
    color: INK,
  },
  payOSInfoValMono: {
    fontSize: 14,
    fontWeight: '800',
    color: INK,
    letterSpacing: 0.5,
  },
  payOSCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  copyTip: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND,
  },
  payOSDescCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fef08a',
    gap: 8,
  },
  payOSDescHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payOSDescLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#854d0e',
    flex: 1,
  },
  payOSDescCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  payOSDescBox: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  payOSDescText: {
    fontSize: 14,
    fontWeight: '900',
    color: INK,
    letterSpacing: 0.3,
  },
  payOSDescNote: {
    fontSize: 11.5,
    color: '#a16207',
    lineHeight: 16,
  },
  payOSActionGroup: {
    gap: 10,
    marginTop: 4,
  },
  payOSAutoStatusBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  payOSAutoStatusPulse: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  payOSAutoStatusTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#15803d',
  },
  payOSAutoStatusSub: {
    fontSize: 11.5,
    color: '#166534',
    marginTop: 2,
    lineHeight: 16,
  },
});
