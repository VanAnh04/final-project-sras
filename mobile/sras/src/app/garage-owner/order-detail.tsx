import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import {
  ChevronLeft,
  Phone,
  PhoneCall,
  Truck,
  User as UserIcon,
  MapPin,
  MessageCircle,
  Clock,
  Camera,
  CreditCard,
  AlertCircle,
  Wrench,
  X,
  Calendar,
  CheckCircle2,
  ZoomIn,
  ShieldCheck,
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto, RescueStatus } from '../../api/rescueApi';
import { goongApi } from '../../api/goongApi';
import { GOONG_MAPTILES_KEY } from '../../config/goong';
import { resolveFileUrl } from '../../api/axiosClient';
import { canFreeCall } from '../../utils/call';
import { callManager } from '../../realtime/callManager';

const POLL_MS = 4000;
const STEPS = ['Đã nhận', 'Đã phân công', 'Đang tới', 'Đã đến'];
const TERMINAL: RescueStatus[] = ['NO_GARAGE_FOUND', 'DECLINED', 'COMPLETED', 'PAID', 'RATED', 'CANCELLED'];

const VEHICLE_LABEL: Record<string, string> = { CAR: 'Ô tô', MOTORBIKE: 'Xe máy' };

function stepOf(data?: RescueRequestDto | null): number {
  if (!data) return 0;
  const status = data.status;
  switch (status) {
    case 'ACCEPTED': return 0;
    case 'ASSIGNED': return 1;
    case 'EN_ROUTE': return 2;
    case 'ARRIVED':
    case 'COMPLETED':
    case 'PAID':
    case 'RATED': return 3;
    case 'CANCELLED':
    case 'DECLINED':
    default:
      // Với đơn đã huỷ hoặc kết thúc bất thường, hiển thị đúng tiến trình cao nhất đơn đã từng đạt được
      if (data.arrivedAt) return 3;
      if (data.enRouteAt) return 2;
      if (data.staff || data.rescueVehicle) return 1;
      return 0;
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const formatVnd = (num?: number) => {
  if (!num) return '0 đ';
  return num.toLocaleString('vi-VN') + ' đ';
};

const formatDateTime = (iso?: string) => {
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
    var __s = { pickup: null, rescuer: null, route: null, ready: false, autoFit: true };
    function rnlog(m){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify({type:'log',message:String(m)})); } }
    window.onerror = function(m){ rnlog('js-error: ' + m); };
    window.setPickup = function(la, ln){ __s.pickup = [ln, la]; window.__apply && window.__apply(); };
    window.setRescuer = function(la, ln){ __s.rescuer = [ln, la]; window.__apply && window.__apply(); };
    window.setRoute = function(j){ try { __s.route = JSON.parse(j); } catch(e){} window.__apply && window.__apply(); };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <script>
    if (typeof goongjs === 'undefined') { rnlog('goong-js CDN chưa tải được.'); }
    else {
      goongjs.accessToken = '${GOONG_MAPTILES_KEY}';
      var map = new goongjs.Map({ container:'map', style:'https://tiles.goong.io/assets/goong_map_web.json', center:[${lng}, ${lat}], zoom:15 });
      window.__map = map;
      map.on('error', function(e){ rnlog('map lỗi: ' + (e && e.error ? e.error.message : '?')); });
      map.on('dragstart', function(){ __s.autoFit = false; });
      var pm = null, rm = null;
      function ensureRoute(){ if (map.getSource('route')) return;
        map.addSource('route', { type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates: [] } } });
        map.addLayer({ id:'route-line', type:'line', source:'route', layout:{ 'line-cap':'round','line-join':'round' }, paint:{ 'line-color':'#ea580c','line-width':4,'line-opacity':0.85 } });
      }
      function fit(){ var pts=[]; if(__s.route&&__s.route.length) pts=__s.route.slice(); if(__s.pickup) pts.push(__s.pickup); if(__s.rescuer) pts.push(__s.rescuer);
        if(pts.length===0) return; if(pts.length===1){ map.easeTo({center:pts[0],zoom:15}); return; }
        var b=new goongjs.LngLatBounds(pts[0],pts[0]); for(var i=1;i<pts.length;i++) b.extend(pts[i]); map.fitBounds(b,{padding:60,maxZoom:16,duration:600}); }
      window.__apply = function(){ if(!__s.ready) return;
        if(__s.pickup){ if(!pm) pm=new goongjs.Marker({color:'#ea580c'}).setLngLat(__s.pickup).addTo(map); else pm.setLngLat(__s.pickup); }
        if(__s.rescuer){ if(!rm) rm=new goongjs.Marker({color:'#2563eb'}).setLngLat(__s.rescuer).addTo(map); else rm.setLngLat(__s.rescuer); }
        if(__s.route){ ensureRoute(); map.getSource('route').setData({ type:'Feature', geometry:{ type:'LineString', coordinates: __s.route } }); }
        if(__s.autoFit) fit();
      };
      map.on('load', function(){ __s.ready = true; ensureRoute(); window.__apply(); setTimeout(function(){ map.resize(); }, 300); });
    }
  </script>
</body>
</html>`;
}

const STATUS_TEXT: Record<string, string> = {
  ACCEPTED: 'Đã nhận · chờ gán nhân viên',
  ASSIGNED: 'Đã phân công · chờ xuất phát',
  EN_ROUTE: 'Nhân viên đang tới hiện trường',
  ARRIVED: 'Nhân viên đã đến nơi',
  DIAGNOSED: 'Đã kiểm tra · chờ duyệt báo giá',
  REPAIRING_ONSITE: 'Đang sửa chữa tại chỗ',
  TOWING: 'Đang kéo xe về xưởng',
  AWAITING_PAYMENT: 'Chờ thanh toán',
  COMPLETED: 'Đã hoàn thành',
  PAID: 'Đã thanh toán',
  RATED: 'Đã hoàn tất & đánh giá',
  CANCELLED: 'Đã huỷ',
  DECLINED: 'Đã từ chối',
};

export default function GarageOrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; from?: string }>();
  const requestId = params.id ? parseInt(params.id, 10) : NaN;
  const webRef = useRef<WebView>(null);

  const [data, setData] = useState<RescueRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const routeCoordsRef = useRef<[number, number][] | null>(null);
  const lastOriginRef = useRef<{ lat: number; lng: number } | null>(null);

  const handleBack = useCallback(() => {
    if (params.from === 'reviews') {
      router.replace('/garage-owner/reviews');
    } else if (params.from === 'index') {
      router.replace('/garage-owner');
    } else if (params.from === 'settings') {
      router.replace('/garage-owner/settings');
    } else {
      router.replace('/garage-owner/orders');
    }
  }, [params.from]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  const diagnosisPhotos = useMemo(() => {
    if (data?.diagnosisPhotos && data.diagnosisPhotos.length > 0) {
      return data.diagnosisPhotos;
    }
    return [];
  }, [data?.diagnosisPhotos]);

  const customerPhotos = useMemo(() => {
    if (data?.customerPhotos && data.customerPhotos.length > 0) {
      return data.customerPhotos;
    }
    if (data?.photos && data.photos.length > 0) {
      const diagSet = new Set(data.diagnosisPhotos || []);
      return data.photos.filter((p) => !diagSet.has(p));
    }
    return [];
  }, [data?.customerPhotos, data?.diagnosisPhotos, data?.photos]);

  const status = data?.status;
  const activeStep = stepOf(data);

  useEffect(() => {
    // Reset dữ liệu đơn cũ ngay lập tức để không bị chớp hiển thị đơn A khi mở đơn B
    setData(null);
    setLoading(true);
    setRouteInfo(null);
    routeCoordsRef.current = null;
    lastOriginRef.current = null;

    if (Number.isNaN(requestId)) { setLoading(false); return; }
    let alive = true;
    let timer: any;
    const tick = async () => {
      try {
        const res = await rescueApi.getStatus(requestId);
        if (!alive) return;
        setData(res);
        setLoading(false);
        if (!TERMINAL.includes(res.status)) timer = setTimeout(tick, POLL_MS);
      } catch {
        if (!alive) return;
        setLoading(false);
        timer = setTimeout(tick, POLL_MS);
      }
    };
    tick();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [requestId]);

  const mapHtml = useMemo(() => {
    if (data?.id === requestId && data?.pickupLat != null && data?.pickupLng != null) {
      return buildMapHtml(data.pickupLat, data.pickupLng);
    }
    return null;
  }, [data?.id, requestId, data?.pickupLat, data?.pickupLng]);

  useEffect(() => {
    if (data?.pickupLat != null && data?.pickupLng != null) {
      webRef.current?.injectJavaScript(`window.setPickup && window.setPickup(${data.pickupLat}, ${data.pickupLng}); true;`);
    }
  }, [data?.pickupLat, data?.pickupLng]);

  useEffect(() => {
    if (data?.rescuerLat != null && data?.rescuerLng != null) {
      webRef.current?.injectJavaScript(`window.setRescuer && window.setRescuer(${data.rescuerLat}, ${data.rescuerLng}); true;`);
    }
  }, [data?.rescuerLat, data?.rescuerLng]);

  useEffect(() => {
    const pLat = data?.pickupLat, pLng = data?.pickupLng;
    if (pLat == null || pLng == null) return;
    const oLat = data?.rescuerLat ?? data?.garage?.lat;
    const oLng = data?.rescuerLng ?? data?.garage?.lng;
    if (oLat == null || oLng == null) return;
    const last = lastOriginRef.current;
    if (last && haversineKm(last.lat, last.lng, oLat, oLng) < 0.03) return;
    lastOriginRef.current = { lat: oLat, lng: oLng };
    let alive = true;
    (async () => {
      const r = await goongApi.directions({ lat: oLat, lng: oLng }, { lat: pLat, lng: pLng }, data?.vehicleType === 'MOTORBIKE' ? 'bike' : 'car');
      if (!alive || !r) return;
      routeCoordsRef.current = r.coordinates;
      setRouteInfo({ distanceKm: r.distanceKm, durationMin: r.durationMin });
      webRef.current?.injectJavaScript(`window.setRoute && window.setRoute(${JSON.stringify(JSON.stringify(r.coordinates))}); true;`);
    })();
    return () => { alive = false; };
  }, [data?.rescuerLat, data?.rescuerLng, data?.garage?.lat, data?.garage?.lng, data?.pickupLat, data?.pickupLng]);

  const onMapLoadEnd = () => {
    let js = '';
    if (data?.pickupLat != null) js += `window.setPickup && window.setPickup(${data.pickupLat}, ${data.pickupLng});`;
    if (data?.rescuerLat != null) js += `window.setRescuer && window.setRescuer(${data.rescuerLat}, ${data.rescuerLng});`;
    if (routeCoordsRef.current) js += `window.setRoute && window.setRoute(${JSON.stringify(JSON.stringify(routeCoordsRef.current))});`;
    if (js) webRef.current?.injectJavaScript(js + ' true;');
  };

  const callPhone = (phone?: string) => phone && Linking.openURL(`tel:${phone}`);

  // Gọi miễn phí qua Internet trong app — chỉ khi đơn ở trạng thái cho phép gọi.
  const freeCallEnabled = canFreeCall(data?.status);
  const freeCall = (peer: 'CUSTOMER' | 'STAFF', name: string) =>
    callManager.startCall({ rescueRequestId: requestId, peer, peerName: name });

  const openChat = (peer: 'CUSTOMER' | 'STAFF', name?: string, phone?: string, role?: string) =>
    router.push({
      pathname: '/chat',
      params: { requestId: String(requestId), peer, peerName: name || '', peerPhone: phone || '', peerRole: role || '' },
    } as any);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={22} color="#ea580c" strokeWidth={2.6} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {data && data.id === requestId ? `Chi tiết cứu hộ #${data.code}` : 'Chi tiết cứu hộ'}
          </Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      {loading || !data || data.id !== requestId ? (
        <View style={styles.fullCenter}>
          <ActivityIndicator color="#ea580c" size="large" />
          <Text style={{ marginTop: 10, color: '#64748b', fontSize: 13, fontWeight: '600' }}>
            Đang tải chi tiết đơn...
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Bản đồ định vị */}
          <View style={styles.mapContainer}>
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
                onMessage={(e) => { try { const d = JSON.parse(e.nativeEvent.data); if (d?.type === 'log') console.log('[detail-map]', d.message); } catch { } }}
                onLoadEnd={onMapLoadEnd}
                androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
              />
            ) : (
              <View style={[styles.map, styles.mapPlaceholder]}>
                <ActivityIndicator color="#ea580c" />
              </View>
            )}
          </View>

          {/* Stepper tiến trình */}
          <View style={styles.card}>
            <View style={styles.stepper}>
              {STEPS.map((label, i) => {
                const done = i < activeStep, current = i === activeStep;
                return (
                  <View key={label} style={styles.stepItem}>
                    <View style={styles.stepLine}>
                      {i > 0 && <View style={[styles.stepBar, i <= activeStep && styles.stepBarOn]} />}
                      <View style={[styles.stepDot, (done || current) && styles.stepDotOn, current && styles.stepDotCurrent]} />
                      {i < STEPS.length - 1 && <View style={[styles.stepBar, i < activeStep && styles.stepBarOn]} />}
                    </View>
                    <Text style={[styles.stepLabel, (done || current) && styles.stepLabelOn]}>{label}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.statusBanner}>
              <Text style={styles.statusText}>{STATUS_TEXT[status || ''] || status}</Text>
              {routeInfo && (status === 'EN_ROUTE' || status === 'ASSIGNED') && (
                <Text style={styles.etaText}>~{routeInfo.durationMin} phút · {routeInfo.distanceKm.toFixed(1)} km</Text>
              )}
            </View>

            {/* Dòng thời gian chi tiết */}
            <View style={styles.timelineBox}>
              <View style={styles.timelineItem}>
                <Clock size={13} color="#ea580c" strokeWidth={2.4} />
                <Text style={styles.timelineLabel} numberOfLines={1}>Thời gian tạo:</Text>
                <Text style={styles.timelineValue} numberOfLines={1}>{formatDateTime(data?.createdAt)}</Text>
              </View>
              {data?.enRouteAt && (
                <View style={styles.timelineItem}>
                  <Truck size={13} color="#2563eb" strokeWidth={2.4} />
                  <Text style={styles.timelineLabel} numberOfLines={1}>Xuất phát:</Text>
                  <Text style={styles.timelineValue} numberOfLines={1}>{formatDateTime(data.enRouteAt)}</Text>
                </View>
              )}
              {data?.arrivedAt && (
                <View style={styles.timelineItem}>
                  <MapPin size={13} color="#059669" strokeWidth={2.4} />
                  <Text style={styles.timelineLabel} numberOfLines={1}>Đến nơi:</Text>
                  <Text style={styles.timelineValue} numberOfLines={1}>{formatDateTime(data.arrivedAt)}</Text>
                </View>
              )}
              {data?.completedAt && (
                <View style={styles.timelineItem}>
                  <Clock size={13} color="#059669" strokeWidth={2.4} />
                  <Text style={styles.timelineLabel} numberOfLines={1}>Hoàn tất:</Text>
                  <Text style={styles.timelineValue} numberOfLines={1}>{formatDateTime(data.completedAt)}</Text>
                </View>
              )}
              {data?.status === 'CANCELLED' && (
                <View style={styles.timelineItem}>
                  <AlertCircle size={13} color="#dc2626" strokeWidth={2.4} />
                  <Text style={[styles.timelineLabel, { color: '#dc2626', fontWeight: '700' }]} numberOfLines={1}>
                    {data.cancelledBy === 'CUSTOMER' ? 'Khách huỷ lúc:' : 'Thời gian huỷ:'}
                  </Text>
                  <Text style={[styles.timelineValue, { color: '#dc2626', fontWeight: '800' }]} numberOfLines={1}>
                    {formatDateTime(data.cancelledAt || (data as any).updatedAt)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Thông tin huỷ & Bồi hoàn xăng xe */}
          {(data?.status === 'CANCELLED' || data?.cancelReason || data?.gasCompensationStatus) && (
            <View style={[styles.cancelCard, { flexDirection: 'column', gap: 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <AlertCircle size={20} color="#dc2626" strokeWidth={2.4} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cancelCardTitle}>
                    {data?.bomReason ? 'Đơn bị báo khách bom đơn' : 'Đơn cứu hộ đã huỷ'}
                  </Text>
                  {data?.cancelReason ? (
                    <Text style={styles.cancelCardReason}>Lý do: {data.cancelReason}</Text>
                  ) : data?.bomReason ? (
                    <Text style={styles.cancelCardReason}>Lý do báo bom: {data.bomReason}</Text>
                  ) : null}
                  {data?.bomWaitingMinutes != null && (
                    <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' }}>
                      ⏱️ Thời gian thợ đã chờ tại hiện trường: {data.bomWaitingMinutes} phút
                    </Text>
                  )}
                </View>
              </View>

              {/* Thông tin giải trình của khách nếu có */}
              {data?.customerCounterExplanation && (
                <View style={{ backgroundColor: '#fffbeb', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#fde68a' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400e' }}>
                    Phản hồi giải trình từ khách hàng:
                  </Text>
                  <Text style={{ fontSize: 12, color: '#78350f', marginTop: 2, fontStyle: 'italic' }}>
                    {`"${data.customerCounterExplanation}"`}
                  </Text>
                </View>
              )}

              {/* Trạng thái bồi hoàn xăng xe */}
              {data?.gasCompensationStatus && (
                <View style={{
                  backgroundColor: data.gasCompensationStatus === 'AUTO_CREDITED' || data.gasCompensationStatus === 'APPROVED' ? '#f0fdf4' : data.gasCompensationStatus === 'PENDING_APPROVAL' ? '#fff7ed' : '#f8fafc',
                  borderRadius: 8,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: data.gasCompensationStatus === 'AUTO_CREDITED' || data.gasCompensationStatus === 'APPROVED' ? '#bbf7d0' : data.gasCompensationStatus === 'PENDING_APPROVAL' ? '#fed7aa' : '#e2e8f0',
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: data.gasCompensationStatus === 'AUTO_CREDITED' || data.gasCompensationStatus === 'APPROVED' ? '#16a34a' : data.gasCompensationStatus === 'PENDING_APPROVAL' ? '#ea580c' : '#64748b',
                    }}>
                      {data.gasCompensationStatus === 'AUTO_CREDITED'
                        ? '✅ Đã nhận bồi hoàn xăng xe (Tự động)'
                        : data.gasCompensationStatus === 'PENDING_APPROVAL'
                          ? '⏳ Chờ Admin duyệt bồi hoàn xăng xe (30%)'
                          : data.gasCompensationStatus === 'APPROVED'
                            ? '✅ Admin đã duyệt bồi hoàn xăng xe'
                            : '❌ Từ chối bồi hoàn hỗ trợ xăng xe'}
                    </Text>
                    {data.gasCompensationAmount ? (
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '900',
                        color: data.gasCompensationStatus === 'AUTO_CREDITED' || data.gasCompensationStatus === 'APPROVED' ? '#16a34a' : '#ea580c',
                      }}>
                        +{formatVnd(data.gasCompensationAmount)}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                    {data.gasCompensationStatus === 'AUTO_CREDITED'
                      ? 'Khoản bồi hoàn 30% chi phí xăng xe đã được cộng trực tiếp vào Ví tiền mặt của Gara.'
                      : data.gasCompensationStatus === 'PENDING_APPROVAL'
                        ? 'Hệ thống đang gửi đối soát 2 chiều tới Admin. Tiền sẽ vào Ví tiền mặt ngay khi Admin phê duyệt.'
                        : data.gasCompensationStatus === 'APPROVED'
                          ? 'Admin hệ thống đã xác minh và giải ngân vào Ví tiền mặt của Gara.'
                          : 'Yêu cầu bồi hoàn không được phê duyệt.'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Khách cần cứu hộ */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Khách hàng liên hệ</Text>
            <View style={styles.contactRow}>
              <View style={[styles.avatarBox, { backgroundColor: '#fff7ed' }]}>
                <UserIcon size={18} color="#ea580c" strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{data?.customer?.name || 'Khách hàng'}</Text>
                <Text style={styles.contactPhone}>{data?.customer?.phone || 'Chưa cập nhật SĐT'}</Text>
              </View>
              <TouchableOpacity
                style={[styles.actionIconBtn, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]}
                onPress={() => openChat('CUSTOMER', data?.customer?.name || 'Khách hàng', data?.customer?.phone, 'Khách cần cứu hộ')}
                activeOpacity={0.8}
              >
                <MessageCircle size={16} color="#2563eb" strokeWidth={2.4} />
              </TouchableOpacity>
              {freeCallEnabled && (
                <TouchableOpacity
                  style={[styles.actionIconBtn, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}
                  onPress={() => freeCall('CUSTOMER', data?.customer?.name || 'Khách hàng')}
                  activeOpacity={0.8}
                  accessibilityLabel="Gọi miễn phí trong ứng dụng"
                >
                  <PhoneCall size={16} color="#16a34a" strokeWidth={2.4} />
                </TouchableOpacity>
              )}
              {!!data?.customer?.phone && (
                <TouchableOpacity style={styles.actionIconBtn} onPress={() => callPhone(data?.customer?.phone)} activeOpacity={0.8}>
                  <Phone size={16} color="#ea580c" strokeWidth={2.4} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Phương tiện & Vị trí sự cố */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Thông tin phương tiện & Sự cố</Text>

            <View style={styles.specGrid}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Loại xe:</Text>
                <Text style={styles.specValue}>{VEHICLE_LABEL[data?.vehicleType || ''] || data?.vehicleType}</Text>
              </View>
              {data?.customerVehicle?.licensePlate && (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Biển số xe:</Text>
                  <Text style={[styles.specValue, { color: '#ea580c', fontWeight: '800' }]}>{data.customerVehicle.licensePlate}</Text>
                </View>
              )}
              {data?.customerVehicle?.brand && (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Hãng / Dòng:</Text>
                  <Text style={styles.specValue}>{[data.customerVehicle.brand, data.customerVehicle.model].filter(Boolean).join(' ')}</Text>
                </View>
              )}
            </View>

            <View style={styles.issueBox}>
              <Text style={styles.issueBoxLabel}>Mô tả sự cố:</Text>
              <Text style={styles.issueBoxText}>{data?.symptom || 'Không có mô tả'}</Text>
            </View>

            {(data?.pickupAddress || data?.locationNote) && (
              <View style={styles.addrBox}>
                <MapPin size={14} color="#ea580c" strokeWidth={2.3} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addrMain}>{data.pickupAddress}</Text>
                  {data.locationNote ? <Text style={styles.addrSub}>Ghi chú: {data.locationNote}</Text> : null}
                </View>
              </View>
            )}

            {/* Ảnh sự cố do khách gửi ban đầu */}
            <View style={styles.photoSection}>
              <View style={styles.photoSectionHead}>
                <Camera size={13} color="#64748b" strokeWidth={2.3} />
                <Text style={styles.photoSectionTitle}>
                  Hình ảnh sự cố khách gửi ban đầu {customerPhotos.length > 0 ? `(${customerPhotos.length})` : ''}
                </Text>
                <View style={styles.customerPhotoBadge}>
                  <Text style={styles.customerPhotoBadgeText}>Khách tải lên</Text>
                </View>
              </View>
              {customerPhotos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
                  {customerPhotos.map((uri, idx) => (
                    <TouchableOpacity
                      key={`cust-${uri}-${idx}`}
                      activeOpacity={0.85}
                      onPress={() => setViewPhoto(resolveFileUrl(uri) || null)}
                      style={styles.photoCardWrapper}
                    >
                      <Image source={{ uri: resolveFileUrl(uri) }} style={styles.photoThumb} />
                      <View style={styles.zoomPill}>
                        <ZoomIn size={11} color="#ffffff" strokeWidth={2.4} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.photoEmptyNote}>Khách hàng không đính kèm hình ảnh ban đầu</Text>
              )}
            </View>
          </View>

          {/* Khảo sát hiện trường & Báo giá từ Thợ */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <Wrench size={16} color="#ea580c" strokeWidth={2.4} />
                <Text style={styles.cardSectionTitleClean} numberOfLines={1}>Báo giá & Khảo sát hiện trường</Text>
              </View>
              {/* Badge trạng thái báo giá (chỉ hiện khi có trạng thái thực tế) */}
              {data?.quoteStatus === 'ACCEPTED' || data?.quoteStatus === 'APPROVED' ? (
                <View style={[styles.quoteBadge, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                  <CheckCircle2 size={11} color="#16a34a" strokeWidth={2.5} />
                  <Text style={[styles.quoteBadgeText, { color: '#15803d' }]}>Khách đã duyệt</Text>
                </View>
              ) : data?.quoteStatus === 'DECLINED' ? (
                <View style={[styles.quoteBadge, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                  <AlertCircle size={11} color="#dc2626" strokeWidth={2.5} />
                  <Text style={[styles.quoteBadgeText, { color: '#b91c1c' }]}>Khách từ chối</Text>
                </View>
              ) : data?.quoteStatus === 'PENDING' ? (
                <View style={[styles.quoteBadge, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                  <Clock size={11} color="#d97706" strokeWidth={2.5} />
                  <Text style={[styles.quoteBadgeText, { color: '#b45309' }]}>Chờ duyệt</Text>
                </View>
              ) : null}
            </View>

            {/* Phương án cứu hộ */}
            <View style={styles.quotePlanBox}>
              <View style={styles.quotePlanHeader}>
                {data?.quoteType === 'TOW' || data?.isTowing ? (
                  <>
                    <View style={[styles.planIconBox, { backgroundColor: '#ffedd5' }]}>
                      <Truck size={14} color="#ea580c" strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planTitle}>Phương án: Cứu hộ kéo xe về gara</Text>
                      {!!data?.towingReason && (
                        <Text style={styles.planSub}>Lý do kéo xe: {data.towingReason}</Text>
                      )}
                    </View>
                  </>
                ) : (
                  <>
                    <View style={[styles.planIconBox, { backgroundColor: '#eff6ff' }]}>
                      <Wrench size={14} color="#2563eb" strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planTitle}>Phương án: Sửa chữa tại hiện trường</Text>
                      <Text style={styles.planSub}>Xử lý khắc phục trực tiếp tại chỗ, không kéo xe</Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Ảnh hiện trường khi thợ gửi báo giá */}
            <View style={styles.photoSection}>
              <View style={styles.photoSectionHead}>
                <Camera size={13} color="#ea580c" strokeWidth={2.3} />
                <Text style={[styles.photoSectionTitle, { color: '#0f172a' }]}>
                  Ảnh hiện trường thợ gửi báo giá {diagnosisPhotos.length > 0 ? `(${diagnosisPhotos.length})` : ''}
                </Text>
                <View style={styles.diagnosisPhotoBadge}>
                  <Text style={styles.diagnosisPhotoBadgeText}>Kỹ thuật viên chụp</Text>
                </View>
              </View>

              {diagnosisPhotos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
                  {diagnosisPhotos.map((uri, idx) => (
                    <TouchableOpacity
                      key={`diag-${uri}-${idx}`}
                      activeOpacity={0.85}
                      onPress={() => setViewPhoto(resolveFileUrl(uri) || null)}
                      style={styles.photoCardWrapper}
                    >
                      <Image source={{ uri: resolveFileUrl(uri) }} style={styles.photoThumbDiagnosis} />
                      <View style={styles.zoomPill}>
                        <ZoomIn size={11} color="#ffffff" strokeWidth={2.4} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyPhotoBox}>
                  <Text style={styles.photoEmptyNote}>
                    {data?.quoteStatus
                      ? 'Thợ không tải lên ảnh chụp hiện trường khi gửi báo giá'
                      : 'Đang chờ kỹ thuật viên đến hiện trường kiểm tra và gửi ảnh'}
                  </Text>
                </View>
              )}
            </View>

            {/* Bảng chi tiết phụ tùng & dịch vụ trong báo giá */}
            {data?.repairItems && data.repairItems.length > 0 && (
              <View style={styles.repairItemsWrap}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={styles.repairItemsTitle}>Hạng mục linh kiện & phụ tùng báo giá ({data.repairItems.length}):</Text>
                  <Text style={styles.repairItemsTotalHeader}>
                    {formatVnd(data.repairItems.reduce((acc, it) => acc + (it.price || 0) * (it.quantity || 1), 0))}
                  </Text>
                </View>
                {data.repairItems.map((item, idx) => (
                  <View key={item.id || idx} style={styles.repairItemLine}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.repairItemName}>• {item.name}</Text>
                      <Text style={styles.repairItemSub}>SL: {item.quantity || 1} x {formatVnd(item.price)}</Text>
                    </View>
                    <Text style={styles.repairItemAmount}>{formatVnd((item.price || 0) * (item.quantity || 1))}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Ghi chú báo giá nếu có */}
            {!!data?.quoteNote && (
              <View style={styles.quoteNoteBox}>
                <Text style={styles.quoteNoteLabel}>Ghi chú từ thợ:</Text>
                <Text style={styles.quoteNoteText}>{data.quoteNote}</Text>
              </View>
            )}
          </View>

          {/* Chi tiết tài chính & thanh toán */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Chi tiết chi phí & Thanh toán</Text>

            <View style={styles.feeList}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Phí cứu hộ (cố định):</Text>
                <Text style={styles.feeVal}>{formatVnd(data?.rescueFee)}</Text>
              </View>
              {data?.quoteStatus !== 'DECLINED' && !!data?.towingFee && (
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Phí kéo xe về xưởng:</Text>
                  <Text style={styles.feeVal}>{formatVnd(data.towingFee)}</Text>
                </View>
              )}
              {data?.quoteStatus !== 'DECLINED' && !!data?.serviceFee && (
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Phí sửa chữa & phụ tùng:</Text>
                  <Text style={styles.feeVal}>{formatVnd(data.serviceFee)}</Text>
                </View>
              )}



              {data?.quoteStatus === 'DECLINED' && (
                <View style={{ backgroundColor: '#fef2f2', padding: 10, borderRadius: 10, marginVertical: 6, borderWidth: 1, borderColor: '#fecaca' }}>
                  <Text style={{ fontSize: 12, color: '#b91c1c', fontWeight: '600' }}>
                    Khách hàng từ chối báo giá nên chỉ thu phí di chuyển đến & kiểm tra xe. Không tính phí kéo xe hay sửa chữa.
                  </Text>
                </View>
              )}

              <View style={styles.feeDivider} />

              {data?.depositRequired && (data?.depositStatus === 'PAID' || data?.depositStatus === 'TRANSFERRED_TO_GARAGE') ? (
                <>
                  <View style={styles.feeRow}>
                    <Text style={[styles.feeLabel, { fontWeight: '700', color: '#0f172a' }]}>
                      Tổng giá trị đơn (Gara nhận đủ):
                    </Text>
                    <Text style={[styles.feeVal, { fontWeight: '800', color: '#0f172a' }]}>
                      {formatVnd(
                        data?.quoteStatus === 'DECLINED'
                          ? (data?.rescueFee || 0)
                          : ((data?.rescueFee || 0) + (data?.towingFee || 0) + (data?.serviceFee || 0))
                      )}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: '#f0fdf4',
                      borderWidth: 1,
                      borderColor: '#86efac',
                      borderRadius: 10,
                      padding: 10,
                      marginVertical: 6,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#15803d' }}>
                        ✓ Khách đã đặt cọc tại sàn:
                      </Text>
                      <Text style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                        {data?.depositStatus === 'TRANSFERRED_TO_GARAGE'
                          ? 'Sàn đã chuyển trả đủ 50.000đ về ví tiền mặt Gara'
                          : 'Sàn sẽ chuyển trả đủ 50.000đ về ví tiền mặt Gara khi hoàn tất'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13.5, fontWeight: '900', color: '#15803d' }}>
                      -{formatVnd(data?.depositAmount || 50000)}
                    </Text>
                  </View>
                  <View style={styles.feeTotalRow}>
                    <Text style={styles.feeTotalLabel}>Khách thanh toán thêm:</Text>
                    <Text style={styles.feeTotalVal}>
                      {formatVnd(
                        data?.totalAmount != null
                          ? data.totalAmount
                          : Math.max(
                              0,
                              (data?.quoteStatus === 'DECLINED'
                                ? (data?.rescueFee || 0)
                                : ((data?.rescueFee || 0) + (data?.towingFee || 0) + (data?.serviceFee || 0))) -
                                (data?.depositAmount || 50000)
                            )
                      )}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.feeTotalRow}>
                  <Text style={styles.feeTotalLabel}>Tổng thanh toán:</Text>
                  <Text style={styles.feeTotalVal}>
                    {formatVnd(data?.quoteStatus === 'DECLINED'
                      ? (data?.rescueFee || 0)
                      : (data?.totalAmount && data.totalAmount > 0
                        ? data.totalAmount
                        : ((data?.rescueFee || 0) + (data?.towingFee || 0) + (data?.serviceFee || 0))))}
                  </Text>
                </View>
              )}

              <View style={styles.payMethodRow}>
                <CreditCard size={13} color="#64748b" strokeWidth={2.2} />
                <Text style={styles.payMethodLabel}>Phương thức:</Text>
                <Text style={styles.payMethodVal}>
                  {data?.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản ngân hàng' : 'Tiền mặt'}
                </Text>
              </View>
            </View>
          </View>

          {/* Nhân viên & Xe cứu hộ */}
          {data?.staff && (
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Nhân viên cứu hộ phụ trách</Text>
              <View style={styles.contactRow}>
                <View style={[styles.avatarBox, { backgroundColor: '#eff6ff' }]}>
                  <Truck size={18} color="#2563eb" strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactName}>{data.staff.name}</Text>
                  <Text style={styles.contactPhone}>
                    {data.staff.phone}{data.rescueVehicle?.licensePlate ? ` · Xe ${data.rescueVehicle.licensePlate}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.actionIconBtn, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]}
                  onPress={() => openChat('STAFF', data.staff?.name || 'Nhân viên', data.staff?.phone, 'Nhân viên cứu hộ')}
                  activeOpacity={0.8}
                >
                  <MessageCircle size={16} color="#2563eb" strokeWidth={2.4} />
                </TouchableOpacity>
                {freeCallEnabled && (
                  <TouchableOpacity
                    style={[styles.actionIconBtn, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}
                    onPress={() => freeCall('STAFF', data.staff?.name || 'Nhân viên')}
                    activeOpacity={0.8}
                    accessibilityLabel="Gọi miễn phí trong ứng dụng"
                  >
                    <PhoneCall size={16} color="#16a34a" strokeWidth={2.4} />
                  </TouchableOpacity>
                )}
                {!!data.staff.phone && (
                  <TouchableOpacity style={[styles.actionIconBtn, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]} onPress={() => callPhone(data?.staff?.phone)} activeOpacity={0.8}>
                    <Phone size={16} color="#2563eb" strokeWidth={2.4} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* Xem ảnh phóng to */}
      <Modal visible={!!viewPhoto} transparent animationType="fade" onRequestClose={() => setViewPhoto(null)}>
        <TouchableOpacity style={styles.lightbox} activeOpacity={1} onPress={() => setViewPhoto(null)}>
          <SafeAreaView style={styles.lightboxHeaderSafe} edges={['top']}>
            <View style={styles.lightboxTopBar}>
              <Text style={styles.lightboxTitle}>Chi tiết hình ảnh</Text>
              <TouchableOpacity style={styles.lightboxClose} onPress={() => setViewPhoto(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color="#ffffff" strokeWidth={2.6} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          {!!viewPhoto && <Image source={{ uri: viewPhoto }} style={styles.lightboxImg} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  headerSafe: { backgroundColor: '#ffffff', zIndex: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scrollArea: { flex: 1 },
  scrollContent: { padding: 12, gap: 10 },

  mapContainer: {
    height: 190,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  map: { flex: 1, backgroundColor: '#e5e7eb' },
  mapPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    paddingBottom: 6,
  },

  stepper: { flexDirection: 'row', paddingVertical: 4 },
  stepItem: { flex: 1, alignItems: 'center' },
  stepLine: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  stepBar: { flex: 1, height: 2.5, backgroundColor: '#e2e8f0', borderRadius: 2 },
  stepBarOn: { backgroundColor: '#ea580c' },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e2e8f0' },
  stepDotOn: { backgroundColor: '#ea580c' },
  stepDotCurrent: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: '#fed7aa', backgroundColor: '#ea580c' },
  stepLabel: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
  stepLabelOn: { color: '#ea580c', fontWeight: '800' },

  statusBanner: {
    backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  statusText: { fontSize: 13, fontWeight: '800', color: '#c2410c' },
  etaText: { fontSize: 12, fontWeight: '700', color: '#ea580c', marginTop: 2 },

  timelineBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timelineLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
    width: 104,
  },
  timelineValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },

  cancelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 12,
  },
  cancelCardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#dc2626',
  },
  cancelCardReason: {
    fontSize: 12,
    color: '#b91c1c',
    marginTop: 1,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  contactPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 6,
  },
  specLabel: {
    fontSize: 11.5,
    color: '#64748b',
  },
  specValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
  },

  issueBox: {
    gap: 2,
  },
  issueBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  issueBoxText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
  },

  addrBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
  },
  addrMain: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
    fontWeight: '600',
  },
  addrSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },

  photoSection: {
    gap: 6,
    marginTop: 2,
  },
  photoSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  photoSectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  photoStrip: {
    gap: 8,
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },

  feeList: {
    gap: 6,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  feeVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  repairItemsWrap: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    gap: 4,
    marginVertical: 4,
  },
  repairItemsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
    marginBottom: 2,
  },
  repairItemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  repairItemName: {
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '600',
  },
  repairItemSub: {
    fontSize: 10.5,
    color: '#94a3b8',
  },
  repairItemAmount: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  feeDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  feeTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeTotalLabel: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  feeTotalVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ea580c',
  },
  payMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  payMethodLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  payMethodVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    paddingBottom: 6,
    gap: 8,
  },
  cardSectionTitleClean: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  quoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  quoteBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quotePlanBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  quotePlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  planSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  customerPhotoBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  customerPhotoBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748b',
  },
  diagnosisPhotoBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  diagnosisPhotoBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#ea580c',
  },
  photoCardWrapper: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  photoThumbDiagnosis: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#ffedd5',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  zoomPill: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    padding: 3,
  },
  emptyPhotoBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  photoEmptyNote: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  repairItemsTotalHeader: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ea580c',
  },
  quoteNoteBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    padding: 9,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  quoteNoteLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#c2410c',
  },
  quoteNoteText: {
    fontSize: 11.5,
    color: '#7c2d12',
    marginTop: 2,
  },

  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxHeaderSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  lightboxTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lightboxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  lightboxImg: { width: '92%', height: '80%' },
  lightboxClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});
