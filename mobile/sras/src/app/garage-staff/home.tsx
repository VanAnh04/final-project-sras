import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Linking,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Alert,
  Switch,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import {
  Phone,
  MessageCircle,
  X,
  MapPin,
  AlertTriangle,
  Coins,
  ChevronUp,
  ShieldCheck,
  Radio,
  Navigation,
  RefreshCw,
  LocateFixed,
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto, RescueStatus } from '../../api/rescueApi';
import { goongApi } from '../../api/goongApi';
import { GOONG_MAPTILES_KEY } from '../../config/goong';
import axiosClient, { resolveFileUrl } from '../../api/axiosClient';
import { formatVnd, resolveRescueFee } from '../../utils/rescueFee';
import { useAuth } from '../../contexts/AuthContext';
import { resolveUserAvatar } from '../../utils/avatar';
import SlideToConfirm from '../../components/SlideToConfirm';

const { width } = Dimensions.get('window');

const BRAND = '#ea580c';
const BLUE = '#2563eb';
const GREEN = '#16a34a';
const INK = '#0f172a';
const SUB = '#64748b';
const MUTE = '#94a3b8';
const POLL_MS = 5000;
const TRACKING_STATUSES = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'DIAGNOSED', 'REPAIRING_ONSITE', 'TOWING', 'TOW_TO_GARAGE'];

const VEHICLE_LABEL: Record<string, string> = { CAR: 'Ô tô', MOTORBIKE: 'Xe máy' };

const NEXT: Record<string, { to: RescueStatus; label: string; color: string }> = {
  ACCEPTED: { to: 'EN_ROUTE', label: 'Trượt để bắt đầu di chuyển', color: BRAND },
  ASSIGNED: { to: 'EN_ROUTE', label: 'Trượt để bắt đầu di chuyển', color: BRAND },
  EN_ROUTE: { to: 'ARRIVED', label: 'Trượt xác nhận ĐÃ ĐẾN nơi', color: BLUE },
  ARRIVED: { to: 'COMPLETED', label: 'Trượt xác nhận HOÀN THÀNH', color: GREEN },
  TOW_TO_GARAGE: { to: 'COMPLETED', label: 'Trượt xác nhận HOÀN THÀNH', color: GREEN },
};

const STATUS_TEXT: Record<string, string> = {
  ACCEPTED: 'Đã nhận cuốc · Chuẩn bị xuất phát',
  ASSIGNED: 'Chuẩn bị xuất phát tới khách',
  EN_ROUTE: 'Đang tới chỗ khách',
  ARRIVED: 'Đã đến nơi khách',
  DIAGNOSED: 'Đã gửi báo giá · Chờ khách duyệt',
  REPAIRING_ONSITE: 'Đang sửa chữa tại chỗ',
  TOWING: 'Đang kéo xe về garage',
  TOW_TO_GARAGE: 'Đã tới garage & đang sửa chữa',
  COMPLETED: 'Hoàn thành sửa chữa · Chờ thanh toán',
  AWAITING_PAYMENT: 'Chờ khách thanh toán',
  PAID: 'Đã thanh toán thành công',
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── BẢN ĐỒ THẬT GOONG KHI CÓ ĐƠN CỨU HỘ (DẪN ĐƯỜNG TỚI KHÁCH) ──
function buildJobMapHtml(lat: number, lng: number) {
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
    var __s = { pickup: null, me: null, route: null, ready: false, autoFit: true };
    window.setPickup = function(la, ln){ __s.pickup = [ln, la]; window.__apply && window.__apply(); };
    window.setMe = function(la, ln){ __s.me = [ln, la]; window.__apply && window.__apply(); };
    window.setRoute = function(j){
      try {
        var r = (typeof j === 'string') ? JSON.parse(j) : j;
        if (typeof r === 'string') { try { r = JSON.parse(r); } catch(e){} }
        __s.route = (Array.isArray(r) && r.length >= 2) ? r : null;
      } catch(e){ __s.route = null; }
      window.__apply && window.__apply();
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <script>
    if (typeof goongjs !== 'undefined') {
      goongjs.accessToken = '${GOONG_MAPTILES_KEY}';
      var map = new goongjs.Map({ container:'map', style:'https://tiles.goong.io/assets/goong_map_web.json', center:[${lng}, ${lat}], zoom:15 });
      map.on('dragstart', function(){ __s.autoFit = false; });
      var pm = null, mm = null;
      function ensureRoute(){ if (map.getSource('route')) return;
        map.addSource('route', { type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates: [] } } });
        map.addLayer({ id:'route-line', type:'line', source:'route', layout:{ 'line-cap':'round','line-join':'round' }, paint:{ 'line-color':'#2563eb','line-width':5,'line-opacity':0.9 } });
      }
      function fit(){ var pts=[]; if(Array.isArray(__s.route)&&__s.route.length) pts=__s.route.slice(); if(__s.pickup) pts.push(__s.pickup); if(__s.me) pts.push(__s.me);
        if(pts.length===0) return; if(pts.length===1){ map.easeTo({center:pts[0],zoom:15}); return; }
        var b=new goongjs.LngLatBounds(pts[0],pts[0]); for(var i=1;i<pts.length;i++) b.extend(pts[i]); map.fitBounds(b,{padding:{top:80,left:50,right:50,bottom:230},maxZoom:16,duration:600}); }
      window.__apply = function(){ if(!__s.ready) return;
        if(__s.pickup){ if(!pm) pm=new goongjs.Marker({color:'#ea580c'}).setLngLat(__s.pickup).addTo(map); else pm.setLngLat(__s.pickup); }
        if(__s.me){ if(!mm) mm=new goongjs.Marker({color:'#2563eb'}).setLngLat(__s.me).addTo(map); else mm.setLngLat(__s.me); }
        if(__s.route){ ensureRoute(); map.getSource('route').setData({ type:'Feature', geometry:{ type:'LineString', coordinates: __s.route } }); }
        if(__s.autoFit) fit();
      };
      map.on('load', function(){ __s.ready = true; ensureRoute(); window.__apply(); setTimeout(function(){ map.resize(); }, 300); });
    }
  </script>
</body>
</html>`;
}

// ── BẢN ĐỒ THẬT GOONG KHI RẢNH (HIỂN THỊ CHÍNH XÁC VỊ TRÍ GPS HIỆN TẠI) ──
function buildIdleRealMapHtml(lat: number, lng: number) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #e2e8f0; }
    .staff-pin {
      width: 26px;
      height: 26px;
      border-radius: 13px;
      background: #ea580c;
      border: 3.5px solid #ffffff;
      box-shadow: 0 3px 12px rgba(234, 88, 12, 0.7);
      position: relative;
    }
    .staff-pin::after {
      content: '';
      position: absolute;
      top: -10px; left: -10px; right: -10px; bottom: -10px;
      border-radius: 50%;
      background: rgba(234, 88, 12, 0.35);
      animation: pulseRadar 2.2s infinite ease-out;
    }
    @keyframes pulseRadar {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(2.2); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var __coords = [${lng}, ${lat}];
    window.setMe = function(la, ln){
      __coords = [ln, la];
      if(window.__marker) { window.__marker.setLngLat(__coords); }
    };
    window.recenter = function(la, ln){
      if(window.__map) {
        window.__map.flyTo({ center: [ln, la], zoom: 16, duration: 600 });
      }
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <script>
    if (typeof goongjs !== 'undefined') {
      goongjs.accessToken = '${GOONG_MAPTILES_KEY}';
      var map = new goongjs.Map({
        container: 'map',
        style: 'https://tiles.goong.io/assets/goong_map_web.json',
        center: __coords,
        zoom: 16
      });
      window.__map = map;

      var el = document.createElement('div');
      el.className = 'staff-pin';
      window.__marker = new goongjs.Marker(el).setLngLat(__coords).addTo(map);

      map.on('load', function(){
        setTimeout(function(){ map.resize(); }, 300);
      });
      window.addEventListener('resize', function(){ map.resize(); });
    }
  </script>
</body>
</html>`;
}

export default function GarageStaffHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // WebRefs cho 2 chế độ bản đồ thật
  const jobWebRef = useRef<WebView>(null);
  const idleWebRef = useRef<WebView>(null);

  // ── 1. ACTIVE RESCUE JOB STATES ──
  const [job, setJob] = useState<RescueRequestDto | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  const jobRef = useRef<RescueRequestDto | null>(null);
  const staffPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const routeCoordsRef = useRef<[number, number][] | null>(null);
  jobRef.current = job;

  // ── 2. DASHBOARD / IDLE STATES ──
  const [isOnline, setIsOnline] = useState(true);
  const [refreshingDashboard, setRefreshingDashboard] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);

  // Vị trí GPS THẬT của thợ (KHÔNG dùng toạ độ mặc định hay toạ độ Gara)
  const [staffPos, setStaffPos] = useState<{ lat: number; lng: number } | null>(null);
  const [myCurrentAddress, setMyCurrentAddress] = useState<string>('Đang định vị vị trí hiện tại của bạn...');

  const [staffData, setStaffData] = useState<any>({
    fullName: user?.fullName || 'NGUYỄN VĂN BÌNH',
    garageName: 'Gara Cứu Hộ',
    todayCompletedJobs: 0,
    todayEarnings: 0,
    isOnline: true,
  });

  // Tải dữ liệu thợ từ backend (chỉ lấy thông tin cá nhân/hiệu suất, KHÔNG đè vị trí GPS thợ)
  const fetchDashboardData = useCallback(async () => {
    try {
      setRefreshingDashboard(true);
      const res: any = await axiosClient.get('/garages/staff/me');
      if (res?.data) {
        setStaffData((prev: any) => ({
          ...prev,
          ...res.data,
          fullName: res.data.fullName || user?.fullName || prev.fullName,
          garageName: res.data.garageName || prev.garageName,
        }));
        if (res.data.isOnline !== undefined) {
          setIsOnline(res.data.isOnline);
        }
      }
    } catch (e: any) {
      console.log('Error fetching staff dashboard data:', e.message);
    } finally {
      setRefreshingDashboard(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Bật/tắt trạng thái nhận ca
  const handleToggleOnline = async (value: boolean) => {
    setIsOnline(value);
    try {
      await axiosClient.put('/garages/staff/me/status', { isOnline: value });
    } catch (e: any) {
      console.log('Error updating online status:', e.message);
      Alert.alert('Thông báo', 'Không thể cập nhật trạng thái nhận đơn.');
    }
  };

  // ── 3. POLL ĐƠN ĐANG ĐƯỢC GÁN ──
  useEffect(() => {
    let alive = true;
    let timer: any;
    const tick = async () => {
      try {
        const res = await rescueApi.staffActive();
        if (!alive) return;
        // Nếu đơn đã thanh toán xong (PAID / RATED)
        if (res && (res.status === 'PAID' || res.status === 'RATED')) {
          const finishedId = res.id;
          setJob(null);
          router.replace({
            pathname: '/garage-staff/order-detail',
            params: { id: String(finishedId) },
          });
          return;
        }
        if (!res || res.status === 'CANCELLED') {
          setJob(null);
        } else {
          setJob(res);
        }
      } catch {
        /* giữ dữ liệu cũ */
      } finally {
        if (alive) {
          setLoadingJob(false);
          timer = setTimeout(tick, POLL_MS);
        }
      }
    };
    tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // ── 4. LẤY VÀ THEO DÕI VỊ TRÍ GPS THỰC TẾ (KHÔNG DÙNG MẶC ĐỊNH) ──
  const initGpsLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsPermissionDenied(true);
        return;
      }
      setGpsPermissionDenied(false);

      // 1. Thử lấy vị trí cache đã biết gần nhất của OS (rất nhanh, 0ms)
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown?.coords) {
        const { latitude, longitude } = lastKnown.coords;
        staffPosRef.current = { lat: latitude, lng: longitude };
        setStaffPos({ lat: latitude, lng: longitude });

        goongApi
          .reverseGeocode(latitude, longitude)
          .then((addr) => {
            if (addr) setMyCurrentAddress(addr);
          })
          .catch(() => {});
      }

      // 2. Lấy vị trí GPS chính xác cao thời gian thực từ phần cứng
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (current?.coords) {
        const { latitude, longitude } = current.coords;
        staffPosRef.current = { lat: latitude, lng: longitude };
        setStaffPos({ lat: latitude, lng: longitude });

        idleWebRef.current?.injectJavaScript(`window.setMe && window.setMe(${latitude}, ${longitude}); true;`);
        idleWebRef.current?.injectJavaScript(`window.recenter && window.recenter(${latitude}, ${longitude}); true;`);

        goongApi
          .reverseGeocode(latitude, longitude)
          .then((addr) => {
            if (addr) setMyCurrentAddress(addr);
          })
          .catch(() => {});
      }
    } catch (e: any) {
      console.log('Error getting initial GPS:', e.message);
    }
  }, []);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      await initGpsLocation();

      // Bắt đầu theo dõi di chuyển thời gian thực
      try {
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 10 },
          (pos) => {
            if (cancelled) return;
            const { latitude, longitude } = pos.coords;
            staffPosRef.current = { lat: latitude, lng: longitude };
            setStaffPos({ lat: latitude, lng: longitude });

            // Cập nhật vị trí lên cả 2 webview map
            jobWebRef.current?.injectJavaScript(`window.setMe && window.setMe(${latitude}, ${longitude}); true;`);
            idleWebRef.current?.injectJavaScript(`window.setMe && window.setMe(${latitude}, ${longitude}); true;`);

            // Giải mã tên đường thực tế nơi thợ đang đứng
            goongApi
              .reverseGeocode(latitude, longitude)
              .then((addr) => {
                if (addr && !cancelled) setMyCurrentAddress(addr);
              })
              .catch(() => {});
          }
        );
      } catch {}
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [initGpsLocation]);

  // Định vị lại vị trí hiện tại của tôi trên bản đồ
  const handleLocateMe = async () => {
    try {
      setLocatingGps(true);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      staffPosRef.current = { lat: latitude, lng: longitude };
      setStaffPos({ lat: latitude, lng: longitude });

      idleWebRef.current?.injectJavaScript(`window.setMe && window.setMe(${latitude}, ${longitude}); true;`);
      idleWebRef.current?.injectJavaScript(`window.recenter && window.recenter(${latitude}, ${longitude}); true;`);

      const addr = await goongApi.reverseGeocode(latitude, longitude);
      if (addr) {
        setMyCurrentAddress(addr);
      }
    } catch {
      Alert.alert('Định vị', 'Không thể xác định vị trí GPS hiện tại.');
    } finally {
      setLocatingGps(false);
    }
  };

  // Cấp quyền GPS hoặc mở cài đặt nếu đã bị chặn
  const handleRequestGpsPermission = async () => {
    try {
      const check = await Location.getForegroundPermissionsAsync();
      if (!check.canAskAgain && check.status !== 'granted') {
        Alert.alert(
          'Mở Cài đặt quyền vị trí',
          'Ứng dụng cần quyền vị trí để định vị và hiển thị bản đồ. Vui lòng mở Cài đặt thiết bị -> Quyền ứng dụng -> Cho phép quyền "Vị trí".',
          [
            { text: 'Để sau', style: 'cancel' },
            { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const req = await Location.requestForegroundPermissionsAsync();
      if (req.status === 'granted') {
        setGpsPermissionDenied(false);
        await initGpsLocation();
      } else {
        setGpsPermissionDenied(true);
        Linking.openSettings();
      }
    } catch {
      Linking.openSettings();
    }
  };

  // ── 5. HTML CHO BẢN ĐỒ THẬT ──
  const pickupLat = job?.pickupLat;
  const pickupLng = job?.pickupLng;

  // Bản đồ khi có đơn cứu hộ
  const jobMapHtml = useMemo(() => {
    if (pickupLat == null || pickupLng == null) return null;
    return buildJobMapHtml(pickupLat, pickupLng);
  }, [pickupLat, pickupLng]);

  useEffect(() => {
    if (pickupLat != null && pickupLng != null) {
      jobWebRef.current?.injectJavaScript(`window.setPickup && window.setPickup(${pickupLat}, ${pickupLng}); true;`);
    }
  }, [pickupLat, pickupLng]);

  // Bản đồ thật khi rảnh: CHỈ TẠO KHI ĐÃ CÓ TOẠ ĐỘ GPS THẬT CỦA THIẾT BỊ
  const idleMapHtml = useMemo(() => {
    if (!staffPos) return null;
    return buildIdleRealMapHtml(staffPos.lat, staffPos.lng);
  }, [staffPos?.lat, staffPos?.lng]);

  // ── 6. LỘ TRÌNH ETA TỚI KHÁCH KHI CÓ ĐƠN ──
  useEffect(() => {
    if (pickupLat == null || pickupLng == null) return;
    const o =
      staffPosRef.current ?? (job?.garage?.lat != null ? { lat: job.garage.lat, lng: job.garage!.lng! } : null);
    if (!o) return;
    const last = lastOriginRef.current;
    if (last && haversineKm(last.lat, last.lng, o.lat, o.lng) < 0.05) return;
    lastOriginRef.current = o;
    let alive = true;
    (async () => {
      const r = await goongApi.directions(
        o,
        { lat: pickupLat, lng: pickupLng },
        job?.vehicleType === 'MOTORBIKE' ? 'bike' : 'car'
      );
      if (!alive || !r) return;
      routeCoordsRef.current = r.coordinates;
      setRouteInfo({ distanceKm: r.distanceKm, durationMin: r.durationMin });
      jobWebRef.current?.injectJavaScript(
        `window.setRoute && window.setRoute(${JSON.stringify(r.coordinates)}); true;`
      );
    })();
    return () => {
      alive = false;
    };
  }, [pickupLat, pickupLng, job?.status, job?.garage?.lat, routeInfo == null]);

  const onJobMapLoadEnd = () => {
    let js = '';
    if (pickupLat != null) js += `window.setPickup && window.setPickup(${pickupLat}, ${pickupLng});`;
    if (staffPosRef.current) js += `window.setMe && window.setMe(${staffPosRef.current.lat}, ${staffPosRef.current.lng});`;
    if (routeCoordsRef.current) js += `window.setRoute && window.setRoute(${JSON.stringify(routeCoordsRef.current)});`;
    if (js) jobWebRef.current?.injectJavaScript(js + ' true;');
  };

  const onIdleMapLoadEnd = () => {
    if (staffPosRef.current) {
      const { lat, lng } = staffPosRef.current;
      let js = `window.setMe && window.setMe(${lat}, ${lng});`;
      js += `window.recenter && window.recenter(${lat}, ${lng});`;
      idleWebRef.current?.injectJavaScript(js + ' true;');
    }
  };

  // ── 7. GỌI / NHẮN TIN KHÁCH HÀNG ──
  const callCustomer = () => job?.customer?.phone && Linking.openURL(`tel:${job.customer.phone}`);
  const openChat = () => {
    if (!job?.id) return;
    router.push({
      pathname: '/chat',
      params: {
        requestId: String(job.id),
        peer: 'CUSTOMER',
        peerName: job.customer?.name || 'Khách hàng',
        peerPhone: job.customer?.phone || '',
        peerRole: 'Khách cần cứu hộ',
      },
    } as any);
  };

  // ── 8. TIẾN TRÌNH TRẠNG THÁI ĐƠN ──
  const advance = useCallback(async () => {
    const j = jobRef.current;
    if (!j) return;
    const step = NEXT[j.status];
    if (!step) return;
    try {
      setAdvancing(true);
      const updated = await rescueApi.advance(j.id, step.to);
      if (updated && updated.status === 'COMPLETED' && updated.paymentMethod === 'CASH') {
        setJob(updated);
      } else if (updated && updated.status === 'COMPLETED') {
        setJob(null);
        fetchDashboardData();
        Alert.alert('Đã hoàn thành', 'Ca cứu hộ đã hoàn tất. Cảm ơn bạn!');
      } else if (updated && updated.id) {
        setJob(updated);
      } else {
        const fresh = await rescueApi.staffActive();
        if (fresh) setJob(fresh);
      }
    } catch (e: any) {
      Alert.alert('Không cập nhật được', e?.response?.data?.message || e?.message || 'Vui lòng thử lại.');
    } finally {
      setAdvancing(false);
    }
  }, [fetchDashboardData]);

  const confirmCash = useCallback(async () => {
    const j = jobRef.current;
    if (!j) return;
    try {
      setAdvancing(true);
      await rescueApi.confirmCash(j.id);
      const finishedId = j.id;
      setJob(null);
      fetchDashboardData();
      router.replace({
        pathname: '/garage-staff/order-detail',
        params: { id: String(finishedId) },
      });
    } catch (e: any) {
      Alert.alert('Không xác nhận được', e?.response?.data?.message || e?.message || 'Vui lòng thử lại.');
    } finally {
      setAdvancing(false);
    }
  }, [fetchDashboardData, router]);

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '0đ';
    return amount.toLocaleString('vi-VN') + 'đ';
  };

  // ══════════════════════════════════════════════════════════════════════════
  // GIAO DIỆN 1: KHI CÓ ĐƠN CỨU HỘ ĐƯỢC GÁN (BẢN ĐỒ THẬT DẪN ĐƯỜNG)
  // ══════════════════════════════════════════════════════════════════════════
  if (job) {
    const step = NEXT[job.status];
    const arrived = job.status === 'ARRIVED';
    const awaitingCash = job.status === 'COMPLETED';
    const photos = job.photos || [];
    const feeText = formatVnd(resolveRescueFee(job));
    const isTowJob = job?.quoteType === 'TOW' || job?.isTowing === true || ((job?.towingFee ?? 0) > 0 && !!job?.towingReason);

    const handleArrivedGarage = () => {
      if (!job?.id) return;
      Alert.alert(
        'Xác nhận tới garage?',
        'Bạn đã vận chuyển xe về tới garage an toàn và chuẩn bị bắt đầu sửa chữa tại xưởng?',
        [
          { text: 'Chưa', style: 'cancel' },
          {
            text: 'Đã tới garage',
            onPress: async () => {
              try {
                setAdvancing(true);
                const updated = await rescueApi.advance(job.id, 'TOW_TO_GARAGE');
                setJob(updated);
                router.push({
                  pathname: '/garage-staff/repair-progress',
                  params: {
                    id: String(job.id),
                    selectedServices: JSON.stringify(updated.repairItems || job.repairItems || []),
                  },
                });
              } catch (err: any) {
                const msg = err?.response?.data?.message || err?.message || 'Không thể cập nhật trạng thái';
                Alert.alert('Lỗi cập nhật', msg);
              } finally {
                setAdvancing(false);
              }
            },
          },
        ]
      );
    };

    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />

        {/* Bản đồ Goong thật dẫn đường */}
        <View style={styles.mapRegion}>
          {jobMapHtml ? (
            <WebView
              ref={jobWebRef}
              originWhitelist={['*']}
              source={{ html: jobMapHtml, baseUrl: 'https://cdn.jsdelivr.net/' }}
              style={styles.map}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              mixedContentMode="always"
              setSupportMultipleWindows={false}
              onLoadEnd={onJobMapLoadEnd}
              androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
            />
          ) : (
            <View style={[styles.map, styles.mapPlaceholder]}>
              <ActivityIndicator color={BRAND} />
            </View>
          )}

          {/* Header nổi báo trạng thái đơn */}
          <View style={[styles.floatHeader, { top: insets.top + 8 }]} pointerEvents="box-none">
            <View
              style={[
                styles.statusPill,
                (job.status === 'COMPLETED' || job.status === 'AWAITING_PAYMENT')
                  ? { borderColor: '#fed7aa', backgroundColor: '#fff7ed' }
                  : job.status === 'PAID' || job.status === 'RATED'
                  ? { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }
                  : isTowJob
                  ? { borderColor: '#fed7aa', backgroundColor: '#fff7ed' }
                  : undefined,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      job.status === 'PAID' || job.status === 'RATED'
                        ? GREEN
                        : job.status === 'COMPLETED' || job.status === 'AWAITING_PAYMENT'
                        ? BRAND
                        : isTowJob
                        ? BRAND
                        : arrived
                        ? GREEN
                        : BLUE,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  (job.status === 'COMPLETED' || job.status === 'AWAITING_PAYMENT')
                    ? { color: '#c2410c' }
                    : job.status === 'PAID' || job.status === 'RATED'
                    ? { color: GREEN }
                    : isTowJob
                    ? { color: '#c2410c' }
                    : undefined,
                ]}
              >
                {job.status === 'COMPLETED' || job.status === 'AWAITING_PAYMENT'
                  ? 'Đã sửa xong · Chờ thanh toán'
                  : job.status === 'PAID' || job.status === 'RATED'
                  ? 'Đã hoàn tất thanh toán'
                  : isTowJob
                  ? job.status === 'TOW_TO_GARAGE'
                    ? 'Đã tới garage · Đang sửa chữa'
                    : 'Đang kéo xe về garage'
                  : STATUS_TEXT[job.status] || 'Đang xử lý'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshFloatBtn}
              onPress={() => rescueApi.staffActive().then(setJob).catch(() => {})}
              activeOpacity={0.85}
            >
              <RefreshCw size={17} color="#475569" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Thanh điều khiển dưới đáy (nằm ngay trên Tab Bar) */}
        <View style={styles.bar}>
          <View style={styles.grabber} />

          {/* ETA / Trạng thái tiền */}
          <View style={styles.etaRow}>
            <View style={{ flex: 1 }}>
              {job.status === 'PAID' ? (
                <Text style={[styles.etaBig, { color: GREEN }]}>
                  Đã thanh toán <Text style={styles.etaSub}>· {feeText}</Text>
                </Text>
              ) : job.status === 'COMPLETED' || job.status === 'AWAITING_PAYMENT' ? (
                <Text style={styles.etaBig}>
                  {job.cashConfirmedByCustomer || job.paymentMethod === 'CASH'
                    ? 'Thu tiền mặt'
                    : job.paymentMethod === 'BANK_TRANSFER'
                    ? 'Khách chuyển khoản'
                    : 'Chờ khách thanh toán'}{' '}
                  <Text style={styles.etaSub}>· {feeText}</Text>
                </Text>
              ) : isTowJob ? (
                <Text style={[styles.etaBig, { color: '#c2410c' }]}>
                  {job.status === 'TOW_TO_GARAGE' ? 'Đã tới garage · Đang sửa' : 'Đang kéo xe về garage'}{' '}
                  <Text style={styles.etaSub}>· {feeText}</Text>
                </Text>
              ) : job.status === 'REPAIRING_ONSITE' ? (
                <Text style={styles.etaBig}>
                  Đang sửa tại chỗ <Text style={styles.etaSub}>· {feeText}</Text>
                </Text>
              ) : job.status === 'DIAGNOSED' ? (
                <Text style={styles.etaBig}>
                  Chờ duyệt báo giá <Text style={styles.etaSub}>· {feeText}</Text>
                </Text>
              ) : arrived ? (
                <Text style={styles.etaBig}>Bạn đã đến nơi khách</Text>
              ) : routeInfo ? (
                <Text style={styles.etaBig}>
                  {routeInfo.durationMin ?? 0} phút <Text style={styles.etaSub}>· còn {Number(routeInfo.distanceKm || 0).toFixed(1)} km</Text>
                </Text>
              ) : (
                <Text style={styles.etaBig}>Đang tính lộ trình…</Text>
              )}
            </View>

            <TouchableOpacity style={styles.detailBtn} onPress={() => setShowDetail(true)} activeOpacity={0.8}>
              <Text style={styles.detailText}>Chi tiết</Text>
              <ChevronUp size={15} color={BRAND} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Khách hàng + Nút gọi / chat */}
          <View style={styles.custRow}>
            <View style={styles.custAvatar}>
              <Text style={styles.custAvatarText}>{(job.customer?.name?.trim()?.[0] || 'K').toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.custName} numberOfLines={1}>
                {job.customer?.name || (job.customer?.phone ? `Khách (${job.customer.phone})` : (job.code ? `Khách hàng #${job.code}` : 'Khách hàng'))}
              </Text>
              <Text style={styles.custSub} numberOfLines={1}>
                {VEHICLE_LABEL[job.vehicleType] || job.vehicleType}
                {job.customer?.phone ? ` · ${job.customer.phone}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.circleBtn, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}
              onPress={callCustomer}
              activeOpacity={0.85}
            >
              <Phone size={19} color={GREEN} strokeWidth={2.4} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.circleBtn, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]}
              onPress={openChat}
              activeOpacity={0.85}
            >
              <MessageCircle size={19} color={BLUE} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {/* 1. KHI ĐÃ ĐẾN NƠI (ARRIVED): Nút Lập báo giá */}
          {arrived && (
            <TouchableOpacity
              style={{
                backgroundColor: '#FF5500',
                borderRadius: 12,
                height: 48,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 10,
                marginTop: 4,
              }}
              onPress={() => router.push({
                pathname: '/garage-staff/create-quote',
                params: { id: String(job.id) },
              })}
              activeOpacity={0.88}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                📝 Lập Báo Giá & Gửi Khách
              </Text>
            </TouchableOpacity>
          )}

          {/* 2. KHI ĐÃ GỬI BÁO GIÁ - CHỜ KHÁCH DUYỆT (DIAGNOSED / PENDING) */}
          {job.status === 'DIAGNOSED' && (
            <View style={{ marginBottom: 10, marginTop: 4 }}>
              <View style={{ backgroundColor: '#fff7ed', borderWidth: 1.5, borderColor: '#fed7aa', borderRadius: 14, padding: 14, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 16 }}>⏳</Text>
                  <Text style={{ color: '#c2410c', fontWeight: '800', fontSize: 15, marginLeft: 6 }}>
                    ĐÃ GỬI BÁO GIÁ ({feeText})
                  </Text>
                </View>
                <Text style={{ color: '#9a3412', fontSize: 13, lineHeight: 18 }}>
                  Đang chờ khách hàng xem và duyệt báo giá trên ứng dụng.{'\n'}
                  <Text style={{ fontWeight: '700' }}>Lưu ý:</Text> Đồng hồ thời gian thực hiện chỉ bắt đầu tính khi khách hàng bấm ĐỒNG Ý sửa chữa.
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: '#ea580c',
                  borderRadius: 12,
                  height: 48,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => {
                  rescueApi.staffActive().then(res => {
                    if (res) {
                      setJob(res);
                      if (res.quoteStatus === 'ACCEPTED' || res.status === 'REPAIRING_ONSITE') {
                        Alert.alert('Khách đã duyệt!', 'Khách hàng đã đồng ý báo giá. Bạn có thể bắt đầu sửa chữa xe và tính giờ.');
                      } else if (res.quoteStatus === 'DECLINED' || res.status === 'AWAITING_PAYMENT') {
                        Alert.alert('Khách từ chối', 'Khách hàng đã từ chối sửa chữa và chỉ thanh toán Phí kiểm tra xe.');
                      } else {
                        Alert.alert('Đang chờ duyệt', 'Khách hàng chưa duyệt báo giá. Vui lòng nhắc khách kiểm tra ứng dụng.');
                      }
                    }
                  }).catch(() => {});
                }}
                activeOpacity={0.88}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                  🔄 Kiểm tra phản hồi của khách
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 3. KHI ĐƠN LÀ KÉO VỀ GARAGE (isTowJob) VÀ ĐANG TRONG QUÁ TRÌNH KÉO / SỬA CHỮA (CHƯA HOÀN THÀNH) */}
          {isTowJob && job.status !== 'COMPLETED' && job.status !== 'AWAITING_PAYMENT' && job.status !== 'PAID' && job.status !== 'RATED' ? (
            <View style={{ marginBottom: 10, marginTop: 4 }}>
              {job.status === 'TOW_TO_GARAGE' ? (
                /* 3.1 ĐÃ TỚI GARAGE: TIẾN HÀNH SỬA CHỮA */
                <>
                  <View style={{ backgroundColor: '#fff7ed', borderWidth: 1.5, borderColor: '#fed7aa', borderRadius: 14, padding: 14, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 16 }}>🛠️</Text>
                      <Text style={{ color: '#c2410c', fontWeight: '800', fontSize: 15, marginLeft: 6 }}>
                        ĐÃ TỚI GARAGE & ĐANG SỬA CHỮA ({feeText})
                      </Text>
                    </View>
                    <Text style={{ color: '#9a3412', fontSize: 13, lineHeight: 18 }}>
                      Xe đã được đưa về garage an toàn. Nhấn nút bên dưới để mở Bảng tiến độ sửa chữa, cập nhật dịch vụ hoặc bấm hoàn thành sau khi sửa xong.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      backgroundColor: BRAND,
                      borderRadius: 12,
                      height: 48,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: BRAND,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.25,
                      shadowRadius: 5,
                      elevation: 3,
                    }}
                    onPress={() => router.push({
                      pathname: '/garage-staff/repair-progress',
                      params: {
                        id: String(job.id),
                        selectedServices: JSON.stringify(job.repairItems || []),
                      },
                    })}
                    activeOpacity={0.88}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                      ⚙️ Bảng Tiến Độ Sửa Chữa Tại Garage
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* 3.2 ĐANG KÉO XE VỀ GARAGE: NÚT CẬP NHẬT TỚI GARAGE */
                <>
                  <View style={{ backgroundColor: '#fff7ed', borderWidth: 1.5, borderColor: '#fed7aa', borderRadius: 14, padding: 14, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 16 }}>🚚</Text>
                      <Text style={{ color: '#c2410c', fontWeight: '800', fontSize: 15, marginLeft: 6 }}>
                        ĐANG KÉO XE VỀ GARAGE ({feeText})
                      </Text>
                    </View>
                    <Text style={{ color: '#9a3412', fontSize: 13, lineHeight: 18 }}>
                      Khách hàng đã đồng ý kéo xe về garage {job.towingReason ? `(Lý do: ${job.towingReason})` : ''}.
                      {'\n'}Vui lòng kéo xe về xưởng. Khi đã kéo xe về tới garage, nhấn nút bên dưới để cập nhật trạng thái tới garage và sửa chữa.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      backgroundColor: BRAND,
                      borderRadius: 12,
                      height: 48,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: BRAND,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.25,
                      shadowRadius: 5,
                      elevation: 3,
                    }}
                    onPress={handleArrivedGarage}
                    activeOpacity={0.88}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                      🚚 Đã Tới Garage & Bắt Đầu Sửa Chữa
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : job.status === 'REPAIRING_ONSITE' ? (
            /* 3.3 SỬA CHỮA TẠI CHỖ THÔNG THƯỜNG - MÀU CAM CHỦ ĐẠO */
            <View style={{ marginBottom: 10, marginTop: 4 }}>
              <View style={{ backgroundColor: '#fff7ed', borderWidth: 1.5, borderColor: '#fed7aa', borderRadius: 14, padding: 14, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 16 }}>✅</Text>
                  <Text style={{ color: '#c2410c', fontWeight: '800', fontSize: 15, marginLeft: 6 }}>
                    KHÁCH ĐÃ DUYỆT BÁO GIÁ ({feeText})
                  </Text>
                </View>
                <Text style={{ color: '#9a3412', fontSize: 13, lineHeight: 18 }}>
                  Khách hàng đã đồng ý sửa chữa xe tại chỗ. Bấm nút bên dưới để mở Bảng tiến độ và kích hoạt đồng hồ tính thời gian thực hiện.
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: BRAND,
                  borderRadius: 12,
                  height: 48,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: BRAND,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 5,
                  elevation: 3,
                }}
                onPress={() => router.push({
                  pathname: '/garage-staff/repair-progress',
                  params: {
                    id: String(job.id),
                    selectedServices: JSON.stringify(job.repairItems || []),
                  },
                })}
                activeOpacity={0.88}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                  🛠️ Bắt Đầu Sửa Xe & Tính Giờ Thực Hiện
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* 4. KHI HOÀN THÀNH HOẶC KHÁCH TỪ CHỐI SỬA CHỜ THANH TOÁN (COMPLETED / AWAITING_PAYMENT) */}
          {(job.status === 'COMPLETED' || job.status === 'AWAITING_PAYMENT') && (
            <View style={{ marginBottom: 10, marginTop: 4 }}>
              {/* Nếu khách từ chối sửa chữa */}
              {(job.quoteStatus === 'DECLINED' || (!job.repairFee && !job.serviceFee && job.status === 'AWAITING_PAYMENT')) && (
                <View style={{ backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#fecaca', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 16 }}>⚠️</Text>
                    <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 15, marginLeft: 6 }}>
                      KHÁCH HÀNG TỪ CHỐI SỬA CHỮA
                    </Text>
                  </View>
                  <Text style={{ color: '#b91c1c', fontSize: 13, lineHeight: 18 }}>
                    Khách hàng đã từ chối bảng báo giá sửa chữa. Không phát sinh chi phí sửa xe. Đơn chuyển sang thu Phí kiểm tra & chẩn đoán xe cố định: <Text style={{ fontWeight: '800' }}>{feeText}</Text>.
                  </Text>
                </View>
              )}
              {job.cashConfirmedByCustomer ? (
                <View>
                  <View style={{ backgroundColor: '#fff7ed', borderWidth: 1.5, borderColor: '#fed7aa', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 16 }}>💵</Text>
                      <Text style={{ color: '#c2410c', fontWeight: '800', fontSize: 15, marginLeft: 6 }}>
                        KHÁCH ĐÃ XÁC NHẬN GỬI TIỀN MẶT
                      </Text>
                    </View>
                    <Text style={{ color: '#9a3412', fontSize: 13, lineHeight: 18 }}>
                      Số tiền cần thu trực tiếp: <Text style={{ fontWeight: '800', color: '#c2410c', fontSize: 15 }}>{feeText}</Text>.{'\n'}
                      Vui lòng nhận đủ tiền từ khách hàng trước khi trượt xác nhận bên dưới.
                    </Text>
                  </View>
                  <View style={styles.slideWrap}>
                    <SlideToConfirm
                      label={`Trượt xác nhận ĐÃ NHẬN ${feeText}`}
                      color={BRAND}
                      onConfirm={confirmCash}
                      busy={advancing}
                    />
                  </View>
                </View>
              ) : job.paymentMethod === 'BANK_TRANSFER' ? (
                <View>
                  <View style={{ backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#bfdbfe', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 16 }}>💳</Text>
                      <Text style={{ color: '#1e40af', fontWeight: '800', fontSize: 15, marginLeft: 6 }}>
                        KHÁCH CHỌN CHUYỂN KHOẢN / PAYOS
                      </Text>
                    </View>
                    <Text style={{ color: '#1e3a8a', fontSize: 13, lineHeight: 18 }}>
                      Số tiền: <Text style={{ fontWeight: '800' }}>{feeText}</Text>. Đang chờ hệ thống PayOS ghi nhận giao dịch của khách hàng...
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#2563eb',
                      borderRadius: 12,
                      height: 48,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      const currentId = job?.id;
                      rescueApi.staffActive().then((res) => {
                        if (!res || res.status === 'PAID') {
                          setJob(null);
                          fetchDashboardData();
                          if (currentId) {
                            router.replace({
                              pathname: '/garage-staff/order-detail',
                              params: { id: String(currentId) },
                            });
                          }
                        } else {
                          setJob(res);
                          Alert.alert('Trạng thái', 'Khách hàng chưa hoàn tất thanh toán. Vui lòng thử lại sau vài giây.');
                        }
                      }).catch(() => {});
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
                      🔄 Kiểm tra thanh toán PayOS
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={{ backgroundColor: '#fff7ed', borderWidth: 1.5, borderColor: '#fed7aa', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 16 }}>⏳</Text>
                      <Text style={{ color: '#c2410c', fontWeight: '800', fontSize: 15, marginLeft: 6 }}>
                        ĐANG CHỜ KHÁCH HÀNG CHỌN THANH TOÁN
                      </Text>
                    </View>
                    <Text style={{ color: '#9a3412', fontSize: 13, lineHeight: 18 }}>
                      Tổng hoá đơn: <Text style={{ fontWeight: '800', color: '#c2410c' }}>{feeText}</Text>.{'\n'}
                      Khách hàng đang xem chi tiết thanh toán trên ứng dụng (PayOS hoặc Tiền mặt).{'\n'}
                      Khi khách bấm xác nhận đưa tiền mặt hoặc thanh toán trực tuyến, hệ thống sẽ mở thao tác xử lý tại đây.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#ea580c',
                      borderRadius: 12,
                      height: 48,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      const currentId = job?.id;
                      rescueApi.staffActive().then((res) => {
                        if (!res || res.status === 'PAID') {
                          setJob(null);
                          fetchDashboardData();
                          if (currentId) {
                            router.replace({
                              pathname: '/garage-staff/order-detail',
                              params: { id: String(currentId) },
                            });
                          }
                        } else {
                          setJob(res);
                          if (res.cashConfirmedByCustomer) {
                            Alert.alert('Khách đã chọn tiền mặt', 'Khách hàng đã bấm xác nhận đưa tiền mặt. Bạn có thể nhận tiền và trượt xác nhận.');
                          } else {
                            Alert.alert('Chờ khách chọn', 'Khách hàng đang mở ứng dụng chọn phương thức thanh toán.');
                          }
                        }
                      }).catch(() => {});
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
                      🔄 Làm mới trạng thái thanh toán
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* 5. KHI ĐÃ THANH TOÁN XONG (PAID) */}
          {job.status === 'PAID' && (
            <View style={{ marginBottom: 10, marginTop: 4 }}>
              <View style={{ backgroundColor: '#fff7ed', borderWidth: 1.5, borderColor: '#fed7aa', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 16 }}>🎉</Text>
                  <Text style={{ color: '#c2410c', fontWeight: '800', fontSize: 15, marginLeft: 6 }}>
                    ĐÃ THANH TOÁN HOÀN TẤT
                  </Text>
                </View>
                <Text style={{ color: '#9a3412', fontSize: 13, lineHeight: 18 }}>
                  Ca cứu hộ đã hoàn tất với tổng số tiền <Text style={{ fontWeight: '800', color: '#c2410c' }}>{feeText}</Text>.
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: BRAND,
                  borderRadius: 12,
                  height: 48,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: BRAND,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 5,
                  elevation: 3,
                }}
                onPress={() => {
                  const finishedId = job.id;
                  setJob(null);
                  fetchDashboardData();
                  router.replace({
                    pathname: '/garage-staff/order-detail',
                    params: { id: String(finishedId) },
                  });
                }}
                activeOpacity={0.88}
              >
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>
                  📋 Xem chi tiết ca cứu hộ đã hoàn tất
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Trượt xác nhận di chuyển (ACCEPTED / ASSIGNED / EN_ROUTE) */}
          {(job.status === 'ACCEPTED' || job.status === 'ASSIGNED' || job.status === 'EN_ROUTE') && step ? (
            <View style={styles.slideWrap}>
              <SlideToConfirm label={step.label} color={step.color} onConfirm={advance} busy={advancing} />
            </View>
          ) : null}
        </View>

        {/* Modal chi tiết đơn */}
        <Modal visible={showDetail} transparent animationType="slide" onRequestClose={() => setShowDetail(false)}>
          <View style={styles.sheetOverlay}>
            <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setShowDetail(false)} />
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Chi tiết đơn {job.code ? `#${job.code}` : ''}</Text>
                <TouchableOpacity onPress={() => setShowDetail(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={20} color={SUB} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                {!!(job.pickupAddress || job.locationNote) && (
                  <View style={styles.dRow}>
                    <MapPin size={15} color={MUTE} strokeWidth={2.3} />
                    <Text style={styles.dText}>{job.pickupAddress || job.locationNote}</Text>
                  </View>
                )}
                {!!job.symptom && (
                  <View style={styles.dRow}>
                    <AlertTriangle size={15} color={MUTE} strokeWidth={2.3} />
                    <Text style={styles.dText}>{job.symptom}</Text>
                  </View>
                )}
                {photos.length > 0 && (
                  <>
                    <Text style={styles.dLabel}>Ảnh khách gửi</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {photos.map((uri, i) => (
                        <TouchableOpacity
                          key={`${uri}-${i}`}
                          activeOpacity={0.85}
                          onPress={() => setViewPhoto(resolveFileUrl(uri) || null)}
                        >
                          <Image source={{ uri: resolveFileUrl(uri) }} style={styles.dThumb} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
                <View style={styles.feeRow}>
                  <Coins size={15} color="#c2410c" strokeWidth={2.4} />
                  <Text style={styles.feeLabel}>Phí dự kiến</Text>
                  <Text style={styles.feeValue}>{feeText}</Text>
                </View>
                {job.rescueVehicle?.licensePlate && (
                  <View style={styles.dRow}>
                    <ShieldCheck size={15} color={MUTE} strokeWidth={2.3} />
                    <Text style={styles.dText}>Xe cứu hộ của bạn: {job.rescueVehicle.licensePlate}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal Lightbox ảnh */}
        <Modal visible={!!viewPhoto} transparent animationType="fade" onRequestClose={() => setViewPhoto(null)}>
          <TouchableOpacity style={styles.lightbox} activeOpacity={1} onPress={() => setViewPhoto(null)}>
            {!!viewPhoto && <Image source={{ uri: viewPhoto }} style={styles.lightboxImg} resizeMode="contain" />}
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GIAO DIỆN 2: KHI RẢNH (BẢN ĐỒ GOONG THẬT TRỰC TUYẾN TẠI VỊ TRÍ HIỆN TẠI)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <View style={[styles.idleRoot, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* ── 1. TOP HEADER BAR ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{
              uri: resolveUserAvatar(user?.avatarUrl, staffData.fullName || user?.fullName),
            }}
            style={styles.avatar}
          />
          <View style={styles.nameBlock}>
            <Text style={styles.staffName} numberOfLines={1}>
              {(staffData.fullName || user?.fullName || 'NGUYỄN VĂN BÌNH').toUpperCase()}
            </Text>
            <Text style={styles.garageName} numberOfLines={1}>
              Nhân viên {staffData.garageName || 'gara Cứu Hộ'}
            </Text>
          </View>
        </View>

        {/* Nút radar signal bên phải */}
        <TouchableOpacity
          style={[styles.signalBtn, isOnline && styles.signalBtnActive]}
          activeOpacity={0.8}
          onPress={fetchDashboardData}
        >
          {refreshingDashboard ? (
            <ActivityIndicator size="small" color={BRAND} />
          ) : (
            <Radio size={20} color={isOnline ? BRAND : SUB} strokeWidth={2.2} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── 2. CARD "SẴN SÀNG NHẬN ĐƠN" ── */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleInfo}>
          <View style={styles.toggleTitleRow}>
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? GREEN : '#cbd5e1' }]} />
            <Text style={styles.toggleTitle}>Sẵn sàng nhận đơn</Text>
          </View>
          <Text style={styles.toggleSub}>
            {isOnline ? 'Bạn đang trực tuyến · Sẵn sàng nhận cuốc mới' : 'Bạn đang ngoại tuyến · Tạm dừng nhận ca'}
          </Text>
        </View>

        <Switch
          value={isOnline}
          onValueChange={handleToggleOnline}
          trackColor={{ false: '#e2e8f0', true: BRAND }}
          thumbColor="#ffffff"
          ios_backgroundColor="#e2e8f0"
          style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] } : {}}
        />
      </View>

      {/* ── 3. KHU VỰC BẢN ĐỒ THẬT GOONG MAP (VỊ TRÍ THỰC TẾ) ── */}
      <View style={styles.mapContainer}>
        {staffPos && idleMapHtml ? (
          <>
            <WebView
              ref={idleWebRef}
              originWhitelist={['*']}
              source={{ html: idleMapHtml, baseUrl: 'https://cdn.jsdelivr.net/' }}
              style={styles.idleMap}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              mixedContentMode="always"
              setSupportMultipleWindows={false}
              onLoadEnd={onIdleMapLoadEnd}
              androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
            />

            {/* Badge trạng thái nổi góc trên trái bản đồ */}
            <View style={styles.mapStatusBadge} pointerEvents="none">
              <View style={[styles.statusDot, { backgroundColor: isOnline ? GREEN : SUB }]} />
              <Text style={styles.mapStatusText}>
                {isOnline ? 'Bản đồ thực tế · Trực tuyến' : 'Bản đồ thực tế · Ngoại tuyến'}
              </Text>
            </View>

            {/* Nút định vị lại GPS góc trên phải bản đồ */}
            <TouchableOpacity
              style={styles.locateBtn}
              onPress={handleLocateMe}
              activeOpacity={0.85}
            >
              {locatingGps ? (
                <ActivityIndicator size="small" color={BRAND} />
              ) : (
                <LocateFixed size={18} color="#334155" strokeWidth={2.4} />
              )}
            </TouchableOpacity>

            {/* Thẻ hiển thị địa chỉ thực tế nơi nhân viên đang đứng */}
            <View style={styles.locationPill}>
              <View style={styles.locationIconWrap}>
                <MapPin size={18} color={BRAND} strokeWidth={2.4} />
              </View>
              <View style={styles.locationTextWrap}>
                <Text style={styles.locationLabel}>Vị trí hiện tại của bạn</Text>
                <Text style={styles.locationAddress} numberOfLines={1}>
                  {myCurrentAddress}
                </Text>
              </View>
            </View>
          </>
        ) : gpsPermissionDenied ? (
          <View style={styles.mapLoadingContainer}>
            <View style={styles.gpsWarningIconWrap}>
              <AlertTriangle size={28} color="#ea580c" strokeWidth={2.3} />
            </View>
            <Text style={styles.mapLoadingTitle}>Cần quyền truy cập vị trí GPS</Text>
            <Text style={styles.mapLoadingSub}>
              Vui lòng cấp quyền vị trí để bản đồ định vị chính xác vị trí trực của bạn.
            </Text>
            <TouchableOpacity style={styles.retryGpsBtn} onPress={handleRequestGpsPermission} activeOpacity={0.85}>
              <Text style={styles.retryGpsBtnText}>Cấp quyền vị trí & Mở Cài đặt</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mapLoadingContainer}>
            <ActivityIndicator size="large" color={BRAND} />
            <Text style={styles.mapLoadingTitle}>Đang xác định vị trí hiện tại của bạn...</Text>
            <Text style={styles.mapLoadingSub}>Bản đồ sẽ hiển thị ngay khi nhận được toạ độ GPS</Text>
          </View>
        )}
      </View>

      {/* ── 4. THỐNG KÊ HIỆU SUẤT HÔM NAY ── */}
      <View style={styles.statsRow}>
        {/* Cột 1: Hoàn thành hôm nay */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>HOÀN THÀNH HÔM NAY</Text>
          <Text style={styles.statsValueLeft}>
            {String(staffData.todayCompletedJobs ?? 0).padStart(2, '0')}
          </Text>
        </View>

        {/* Cột 2: Thu nhập hôm nay */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>THU NHẬP HÔM NAY</Text>
          <Text style={styles.statsValueRight}>
            {formatCurrency(staffData.todayEarnings ?? 0)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 16,
};

const styles = StyleSheet.create({
  /* Root & Map */
  root: { flex: 1, backgroundColor: '#e5e7eb' },
  mapRegion: { flex: 1, backgroundColor: '#e5e7eb' },
  map: { flex: 1, backgroundColor: '#e5e7eb' },
  mapPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  floatHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 13, fontWeight: '800', color: INK },
  refreshFloatBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },

  /* Action Bottom Bar (Sát trên Tab Bar) */
  bar: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    ...CARD_SHADOW,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 10,
  },
  etaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  etaBig: { fontSize: 18, fontWeight: '900', color: INK },
  etaSub: { fontSize: 13.5, fontWeight: '700', color: SUB },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  detailText: { fontSize: 13, fontWeight: '800', color: BRAND },

  custRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  custAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  custAvatarText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  custName: { fontSize: 15, fontWeight: '800', color: INK },
  custSub: { fontSize: 12, fontWeight: '600', color: SUB, marginTop: 2 },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideWrap: {
    marginTop: 2,
  },

  /* Idle Mode */
  idleRoot: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#cbd5e1',
    borderWidth: 2,
    borderColor: '#ffedd5',
  },
  nameBlock: { flex: 1 },
  staffName: { fontSize: 14, fontWeight: '900', color: INK, letterSpacing: 0.3 },
  garageName: { fontSize: 11.5, fontWeight: '700', color: BRAND, marginTop: 1 },
  signalBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  signalBtnActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },

  /* Toggle Card */
  toggleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  toggleInfo: { flex: 1, gap: 3, paddingRight: 10 },
  toggleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  toggleTitle: { fontSize: 14.5, fontWeight: '800', color: INK },
  toggleSub: { fontSize: 11, color: SUB, lineHeight: 15 },

  /* Real Goong Map Container */
  mapContainer: {
    flex: 1,
    minHeight: 250,
    marginBottom: 10,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  idleMap: {
    flex: 1,
    backgroundColor: '#e2e8f0',
  },
  mapStatusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  mapStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: INK,
  },
  locateBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },

  /* Floating Location Pill */
  locationPill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 5,
  },
  locationIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextWrap: { flex: 1 },
  locationLabel: { fontSize: 10, fontWeight: '700', color: SUB, marginBottom: 1 },
  locationAddress: { fontSize: 12, fontWeight: '800', color: INK },

  /* Map Loading / Permission States */
  mapLoadingContainer: {
    flex: 1,
    minHeight: 250,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  gpsWarningIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  mapLoadingTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: INK,
    textAlign: 'center',
  },
  mapLoadingSub: {
    fontSize: 12,
    color: SUB,
    textAlign: 'center',
    lineHeight: 17,
  },
  retryGpsBtn: {
    marginTop: 8,
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryGpsBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: SUB,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  statsValueLeft: {
    fontSize: 20,
    fontWeight: '900',
    color: INK,
  },
  statsValueRight: {
    fontSize: 17,
    fontWeight: '900',
    color: GREEN,
  },

  /* Detail sheet */
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
    maxHeight: '75%',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: INK },
  dRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 12 },
  dText: { flex: 1, fontSize: 13.5, fontWeight: '600', color: '#334155', lineHeight: 19 },
  dLabel: { fontSize: 12, fontWeight: '800', color: SUB, marginBottom: 8 },
  dThumb: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#e9eef4' },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff7ed',
    borderRadius: 12,
  },
  feeLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: '#c2410c' },
  feeValue: { fontSize: 15.5, fontWeight: '900', color: '#9a3412' },

  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxImg: { width: '92%', height: '80%' },
});
