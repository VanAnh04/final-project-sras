import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import {
  Phone,
  MessageCircle,
  X,
  LogOut,
  MapPin,
  AlertTriangle,
  Coins,
  ChevronUp,
  Navigation,
  ShieldCheck,
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto, RescueStatus } from '../../api/rescueApi';
import { goongApi } from '../../api/goongApi';
import { GOONG_MAPTILES_KEY } from '../../config/goong';
import { resolveFileUrl } from '../../api/axiosClient';
import { formatVnd, resolveRescueFee } from '../../utils/rescueFee';
import { useAuth } from '../../contexts/AuthContext';
import SlideToConfirm from '../../components/SlideToConfirm';

const BRAND = '#ea580c';
const BLUE = '#2563eb';
const GREEN = '#16a34a';
const INK = '#0f172a';
const SUB = '#64748b';
const MUTE = '#94a3b8';
const POLL_MS = 5000;

const VEHICLE_LABEL: Record<string, string> = { CAR: 'Ô tô', MOTORBIKE: 'Xe máy' };

const NEXT: Record<string, { to: RescueStatus; label: string; color: string }> = {
  ASSIGNED: { to: 'EN_ROUTE', label: 'Trượt để bắt đầu di chuyển', color: BRAND },
  EN_ROUTE: { to: 'ARRIVED', label: 'Trượt xác nhận ĐÃ ĐẾN nơi', color: BLUE },
  ARRIVED: { to: 'COMPLETED', label: 'Trượt xác nhận HOÀN THÀNH', color: GREEN },
};

const STATUS_TEXT: Record<string, string> = {
  ASSIGNED: 'Chuẩn bị xuất phát tới khách',
  EN_ROUTE: 'Đang tới chỗ khách',
  ARRIVED: 'Đã đến nơi khách',
  COMPLETED: 'Hoàn thành · chờ thu tiền mặt',
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Map goong-js: marker khách (cam) + marker nhân viên (xanh) + lộ trình. Setter khai báo
// trước khi tải goong-js để inject từ RN không bị mất.
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
    var __s = { pickup: null, me: null, route: null, ready: false, autoFit: true };
    window.setPickup = function(la, ln){ __s.pickup = [ln, la]; window.__apply && window.__apply(); };
    window.setMe = function(la, ln){ __s.me = [ln, la]; window.__apply && window.__apply(); };
    window.setRoute = function(j){ try { __s.route = JSON.parse(j); } catch(e){} window.__apply && window.__apply(); };
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
      function fit(){ var pts=[]; if(__s.route&&__s.route.length) pts=__s.route.slice(); if(__s.pickup) pts.push(__s.pickup); if(__s.me) pts.push(__s.me);
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

export default function GarageStaffHome() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const webRef = useRef<WebView>(null);

  const [job, setJob] = useState<RescueRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  const jobRef = useRef<RescueRequestDto | null>(null);
  const staffPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const routeCoordsRef = useRef<[number, number][] | null>(null);
  jobRef.current = job;

  // Poll đơn đang được gán.
  useEffect(() => {
    let alive = true;
    let timer: any;
    const tick = async () => {
      try {
        const res = await rescueApi.staffActive();
        if (!alive) return;
        setJob(res);
      } catch {
        /* giữ dữ liệu cũ */
      } finally {
        if (alive) {
          setLoading(false);
          timer = setTimeout(tick, POLL_MS);
        }
      }
    };
    tick();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, []);

  // Theo dõi GPS: cập nhật marker + đẩy vị trí cho đơn đang chạy.
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 15 },
        (pos) => {
          const { latitude, longitude } = pos.coords;
          staffPosRef.current = { lat: latitude, lng: longitude };
          webRef.current?.injectJavaScript(`window.setMe && window.setMe(${latitude}, ${longitude}); true;`);
          const j = jobRef.current;
          if (j && (j.status === 'ASSIGNED' || j.status === 'EN_ROUTE' || j.status === 'ARRIVED')) {
            rescueApi.updateLocation(j.id, latitude, longitude).catch(() => {});
          }
        }
      );
    })();
    return () => { cancelled = true; sub?.remove(); };
  }, []);

  const pickupLat = job?.pickupLat;
  const pickupLng = job?.pickupLng;

  const mapHtml = useMemo(() => {
    if (pickupLat == null || pickupLng == null) return null;
    return buildMapHtml(pickupLat, pickupLng);
  }, [pickupLat, pickupLng]);

  useEffect(() => {
    if (pickupLat != null && pickupLng != null) {
      webRef.current?.injectJavaScript(`window.setPickup && window.setPickup(${pickupLat}, ${pickupLng}); true;`);
    }
  }, [pickupLat, pickupLng]);

  // Lộ trình nhân viên → khách (ETA). Cập nhật khi vị trí đổi đáng kể.
  useEffect(() => {
    if (pickupLat == null || pickupLng == null) return;
    const o = staffPosRef.current ?? (job?.garage?.lat != null ? { lat: job.garage.lat, lng: job.garage!.lng! } : null);
    if (!o) return;
    const last = lastOriginRef.current;
    if (last && haversineKm(last.lat, last.lng, o.lat, o.lng) < 0.05) return;
    lastOriginRef.current = o;
    let alive = true;
    (async () => {
      const r = await goongApi.directions(o, { lat: pickupLat, lng: pickupLng }, job?.vehicleType === 'MOTORBIKE' ? 'bike' : 'car');
      if (!alive || !r) return;
      routeCoordsRef.current = r.coordinates;
      setRouteInfo({ distanceKm: r.distanceKm, durationMin: r.durationMin });
      webRef.current?.injectJavaScript(`window.setRoute && window.setRoute(${JSON.stringify(JSON.stringify(r.coordinates))}); true;`);
    })();
    return () => { alive = false; };
  }, [pickupLat, pickupLng, job?.status, job?.garage?.lat, routeInfo == null]);

  const onMapLoadEnd = () => {
    let js = '';
    if (pickupLat != null) js += `window.setPickup && window.setPickup(${pickupLat}, ${pickupLng});`;
    if (staffPosRef.current) js += `window.setMe && window.setMe(${staffPosRef.current.lat}, ${staffPosRef.current.lng});`;
    if (routeCoordsRef.current) js += `window.setRoute && window.setRoute(${JSON.stringify(JSON.stringify(routeCoordsRef.current))});`;
    if (js) webRef.current?.injectJavaScript(js + ' true;');
  };

  const callCustomer = () => job?.customer?.phone && Linking.openURL(`tel:${job.customer.phone}`);
  const openChat = () =>
    router.push({
      pathname: '/chat',
      params: {
        requestId: String(job?.id ?? ''),
        peer: 'CUSTOMER',
        peerName: job?.customer?.name || 'Khách hàng',
        peerPhone: job?.customer?.phone || '',
        peerRole: 'Khách cần cứu hộ',
      },
    } as any);

  const openChatGarage = () =>
    router.push({
      pathname: '/chat',
      params: {
        requestId: String(job?.id ?? ''),
        peer: 'GARAGE',
        peerName: job?.garage?.name || 'Gara',
        peerPhone: job?.garage?.phone || '',
        peerRole: 'Chủ gara',
      },
    } as any);

  const advance = useCallback(async () => {
    const j = jobRef.current;
    if (!j) return;
    const step = NEXT[j.status];
    if (!step) return;
    try {
      setAdvancing(true);
      const updated = await rescueApi.advance(j.id, step.to);
      if (updated.status === 'COMPLETED' && updated.paymentMethod === 'CASH') {
        setJob(updated); // giữ đơn để nhân viên xác nhận thu tiền mặt
      } else if (updated.status === 'COMPLETED') {
        setJob(null); // chuyển khoản: khách tự thanh toán, nhân viên xong việc
        Alert.alert('Đã hoàn thành', 'Khách sẽ thanh toán bằng chuyển khoản. Cảm ơn bạn!');
      } else {
        setJob(updated);
      }
    } catch (e: any) {
      Alert.alert('Không cập nhật được', e?.response?.data?.message || e?.message || 'Vui lòng thử lại.');
    } finally {
      setAdvancing(false);
    }
  }, []);

  const confirmCash = useCallback(async () => {
    const j = jobRef.current;
    if (!j) return;
    try {
      setAdvancing(true);
      await rescueApi.confirmCash(j.id);
      setJob(null);
      Alert.alert('Đã thu tiền mặt', 'Đơn đã hoàn tất thanh toán. Cảm ơn bạn!');
    } catch (e: any) {
      Alert.alert('Không xác nhận được', e?.response?.data?.message || e?.message || 'Vui lòng thử lại.');
    } finally {
      setAdvancing(false);
    }
  }, []);

  // ── Idle: chưa có nhiệm vụ ──
  if (!job) {
    return (
      <SafeAreaView style={styles.idleRoot}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.idleHeader}>
          <View>
            <Text style={styles.idleName}>{user?.fullName || 'Nhân viên'}</Text>
            <Text style={styles.idleRole}>Thợ cứu hộ</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <LogOut size={18} color="#dc2626" strokeWidth={2.3} />
          </TouchableOpacity>
        </View>
        <View style={styles.idleCenter}>
          {loading ? (
            <ActivityIndicator color={BRAND} />
          ) : (
            <>
              <View style={styles.idleDot}><Navigation size={26} color="#ffffff" strokeWidth={2.4} /></View>
              <Text style={styles.idleTitle}>Đang trực · chưa có nhiệm vụ</Text>
              <Text style={styles.idleSub}>Khi gara phân công đơn cứu hộ cho bạn, màn dẫn đường sẽ hiện ngay tại đây.</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const step = NEXT[job.status];
  const arrived = job.status === 'ARRIVED';
  const awaitingCash = job.status === 'COMPLETED'; // chỉ đơn tiền mặt còn ở đây
  const photos = job.photos || [];
  const feeText = formatVnd(resolveRescueFee(job));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Map nền */}
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
            onLoadEnd={onMapLoadEnd}
            androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
          />
        ) : (
          <View style={[styles.map, styles.mapPlaceholder]}><ActivityIndicator color={BRAND} /></View>
        )}

        <SafeAreaView edges={['top']} style={styles.floatHeader} pointerEvents="box-none">
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: arrived ? GREEN : BLUE }]} />
            <Text style={styles.statusPillText}>{STATUS_TEXT[job.status] || 'Đang xử lý'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutFloat} onPress={logout} activeOpacity={0.85}>
            <LogOut size={18} color="#dc2626" strokeWidth={2.3} />
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* Thanh dưới tối giản */}
      <View style={styles.bar}>
        <View style={styles.grabber} />

        {/* ETA */}
        <View style={styles.etaRow}>
          <View style={{ flex: 1 }}>
            {awaitingCash ? (
              <Text style={styles.etaBig}>Thu tiền mặt <Text style={styles.etaSub}>· {feeText}</Text></Text>
            ) : arrived ? (
              <Text style={styles.etaBig}>Bạn đã đến nơi khách</Text>
            ) : routeInfo ? (
              <Text style={styles.etaBig}>
                {routeInfo.durationMin} phút <Text style={styles.etaSub}>· còn {routeInfo.distanceKm.toFixed(1)} km</Text>
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

        {/* Khách + gọi/chat */}
        <View style={styles.custRow}>
          <View style={styles.custAvatar}>
            <Text style={styles.custAvatarText}>{(job.customer?.name?.trim()?.[0] || 'K').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.custName} numberOfLines={1}>{job.customer?.name || 'Khách hàng'}</Text>
            <Text style={styles.custSub} numberOfLines={1}>
              {VEHICLE_LABEL[job.vehicleType] || job.vehicleType}{job.customer?.phone ? ` · ${job.customer.phone}` : ''}
            </Text>
          </View>
          <TouchableOpacity style={[styles.circleBtn, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]} onPress={callCustomer} activeOpacity={0.85}>
            <Phone size={19} color={GREEN} strokeWidth={2.4} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.circleBtn, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]} onPress={openChat} activeOpacity={0.85}>
            <MessageCircle size={19} color={BLUE} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {/* Trượt để xác nhận */}
        {step ? (
          <View style={styles.slideWrap}>
            <SlideToConfirm key={`step-${job.status}`} label={step.label} color={step.color} onConfirm={advance} busy={advancing} />
          </View>
        ) : awaitingCash ? (
          <View style={styles.slideWrap}>
            <SlideToConfirm key="cash" label="Trượt xác nhận ĐÃ NHẬN TIỀN MẶT" color={GREEN} onConfirm={confirmCash} busy={advancing} />
          </View>
        ) : null}
      </View>

      {/* Chi tiết đơn */}
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
                      <TouchableOpacity key={`${uri}-${i}`} activeOpacity={0.85} onPress={() => setViewPhoto(resolveFileUrl(uri) || null)}>
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
              <TouchableOpacity
                style={styles.ownerChatBtn}
                onPress={() => { setShowDetail(false); openChatGarage(); }}
                activeOpacity={0.85}
              >
                <MessageCircle size={17} color={BLUE} strokeWidth={2.4} />
                <Text style={styles.ownerChatText}>Nhắn tin cho chủ gara</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Lightbox ảnh */}
      <Modal visible={!!viewPhoto} transparent animationType="fade" onRequestClose={() => setViewPhoto(null)}>
        <TouchableOpacity style={styles.lightbox} activeOpacity={1} onPress={() => setViewPhoto(null)}>
          {!!viewPhoto && <Image source={{ uri: viewPhoto }} style={styles.lightboxImg} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#0f172a', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 16,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e5e7eb' },
  mapRegion: { flex: 1, backgroundColor: '#e5e7eb' },
  map: { flex: 1, backgroundColor: '#e5e7eb' },
  mapPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  floatHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 8 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 13, fontWeight: '800', color: INK },
  logoutFloat: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },

  bar: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 30, ...CARD_SHADOW,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', marginBottom: 12 },

  etaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  etaBig: { fontSize: 19, fontWeight: '900', color: INK },
  etaSub: { fontSize: 14, fontWeight: '700', color: SUB },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fff7ed', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11 },
  detailText: { fontSize: 13, fontWeight: '800', color: BRAND },

  custRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  custAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  custAvatarText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  custName: { fontSize: 15.5, fontWeight: '800', color: INK },
  custSub: { fontSize: 12.5, fontWeight: '600', color: SUB, marginTop: 2 },
  circleBtn: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  slideWrap: {},

  /* Idle */
  idleRoot: { flex: 1, backgroundColor: '#f8fafc' },
  idleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  idleName: { fontSize: 18, fontWeight: '900', color: INK },
  idleRole: { fontSize: 12.5, fontWeight: '600', color: SUB, marginTop: 2 },
  logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  idleCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  idleDot: { width: 64, height: 64, borderRadius: 32, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  idleTitle: { fontSize: 17, fontWeight: '900', color: INK, textAlign: 'center' },
  idleSub: { fontSize: 13.5, fontWeight: '600', color: SUB, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  /* Detail sheet */
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30, maxHeight: '75%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: INK },
  dRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 12 },
  dText: { flex: 1, fontSize: 13.5, fontWeight: '600', color: '#334155', lineHeight: 19 },
  ownerChatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6,
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, paddingVertical: 12,
  },
  ownerChatText: { fontSize: 14, fontWeight: '800', color: '#1d4ed8' },
  dLabel: { fontSize: 12, fontWeight: '800', color: SUB, marginBottom: 8 },
  dThumb: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#e9eef4' },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#fff7ed', borderRadius: 12 },
  feeLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: '#c2410c' },
  feeValue: { fontSize: 15.5, fontWeight: '900', color: '#9a3412' },

  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxImg: { width: '92%', height: '80%' },
});
