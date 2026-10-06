import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { ChevronLeft, Phone, Truck, User as UserIcon, MapPin, MessageCircle } from 'lucide-react-native';
import { rescueApi, RescueRequestDto, RescueStatus } from '../../api/rescueApi';
import { goongApi } from '../../api/goongApi';
import { GOONG_MAPTILES_KEY } from '../../config/goong';

const POLL_MS = 4000;
const STEPS = ['Đã nhận', 'Đã phân công', 'Đang tới', 'Đã đến'];
const TERMINAL: RescueStatus[] = ['NO_GARAGE_FOUND', 'DECLINED', 'COMPLETED', 'CANCELLED'];

function stepOf(status?: RescueStatus): number {
  switch (status) {
    case 'ACCEPTED': return 0;
    case 'ASSIGNED': return 1;
    case 'EN_ROUTE': return 2;
    case 'ARRIVED':
    case 'COMPLETED': return 3;
    default: return 0;
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Map goong-js: marker khách (cam) + marker xe cứu hộ (xanh) + lộ trình. Setter định
// nghĩa trước khi tải goong-js để inject từ RN không bị mất.
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
  ASSIGNED: 'Đã phân công · chờ nhân viên xuất phát',
  EN_ROUTE: 'Nhân viên đang tới hiện trường',
  ARRIVED: 'Nhân viên đã đến nơi',
  COMPLETED: 'Đã hoàn thành cứu hộ',
};

export default function GarageOrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const requestId = params.id ? parseInt(params.id, 10) : NaN;
  const webRef = useRef<WebView>(null);

  const [data, setData] = useState<RescueRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const routeCoordsRef = useRef<[number, number][] | null>(null);
  const lastOriginRef = useRef<{ lat: number; lng: number } | null>(null);

  const status = data?.status;
  const activeStep = stepOf(status);

  useEffect(() => {
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
    if (data?.pickupLat != null && data?.pickupLng != null) return buildMapHtml(data.pickupLat, data.pickupLng);
    return null;
  }, [data?.pickupLat, data?.pickupLng]);

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

  const openChat = (peer: 'CUSTOMER' | 'STAFF', name?: string, phone?: string, role?: string) =>
    router.push({
      pathname: '/chat',
      params: { requestId: String(requestId), peer, peerName: name || '', peerPhone: phone || '', peerRole: role || '' },
    } as any);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/garage-owner/orders');
              }
            }} 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={22} color="#ea580c" strokeWidth={2.6} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết cứu hộ</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

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
            onMessage={(e) => { try { const d = JSON.parse(e.nativeEvent.data); if (d?.type === 'log') console.log('[detail-map]', d.message); } catch {} }}
            onLoadEnd={onMapLoadEnd}
            androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
          />
        ) : (
          <View style={[styles.map, styles.mapPlaceholder]}><ActivityIndicator color="#ea580c" /></View>
        )}
      </View>

      <View style={styles.sheet}>
        {/* Stepper */}
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

        {loading && !data ? (
          <View style={styles.center}><ActivityIndicator color="#ea580c" /></View>
        ) : (
          <>
            <View style={styles.statusBanner}>
              <Text style={styles.statusText}>{STATUS_TEXT[status || ''] || status}</Text>
              {routeInfo && (status === 'EN_ROUTE' || status === 'ASSIGNED') && (
                <Text style={styles.etaText}>~{routeInfo.durationMin} phút · {routeInfo.distanceKm.toFixed(1)} km</Text>
              )}
            </View>

            {/* Khách cần cứu hộ */}
            <View style={styles.infoCard}>
              <View style={[styles.infoIcon, { backgroundColor: '#fff7ed' }]}>
                <MapPin size={18} color="#ea580c" strokeWidth={2.3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoName}>{data?.customer?.name || 'Khách hàng'}</Text>
                <Text style={styles.infoSub} numberOfLines={1}>{data?.pickupAddress || data?.symptom || 'Vị trí khách'}</Text>
              </View>
              <TouchableOpacity
                style={[styles.callBtn, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]}
                onPress={() => openChat('CUSTOMER', data?.customer?.name || 'Khách hàng', data?.customer?.phone, 'Khách cần cứu hộ')}
                activeOpacity={0.8}
              >
                <MessageCircle size={16} color="#2563eb" strokeWidth={2.4} />
              </TouchableOpacity>
              {!!data?.customer?.phone && (
                <TouchableOpacity style={styles.callBtn} onPress={() => callPhone(data?.customer?.phone)} activeOpacity={0.8}>
                  <Phone size={16} color="#ea580c" strokeWidth={2.4} />
                </TouchableOpacity>
              )}
            </View>

            {/* Nhân viên cứu hộ */}
            {data?.staff ? (
              <View style={styles.infoCard}>
                <View style={[styles.infoIcon, { backgroundColor: '#eff6ff' }]}>
                  <Truck size={18} color="#2563eb" strokeWidth={2.3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoName}>{data.staff.name}</Text>
                  <Text style={styles.infoSub}>
                    Nhân viên cứu hộ{data.rescueVehicle?.licensePlate ? ` · ${data.rescueVehicle.licensePlate}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.callBtn, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]}
                  onPress={() => openChat('STAFF', data?.staff?.name || 'Nhân viên', data?.staff?.phone, 'Nhân viên cứu hộ')}
                  activeOpacity={0.8}
                >
                  <MessageCircle size={16} color="#2563eb" strokeWidth={2.4} />
                </TouchableOpacity>
                {!!data.staff.phone && (
                  <TouchableOpacity style={[styles.callBtn, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]} onPress={() => callPhone(data?.staff?.phone)} activeOpacity={0.8}>
                    <Phone size={16} color="#2563eb" strokeWidth={2.4} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.assigningRow}>
                <UserIcon size={16} color="#94a3b8" strokeWidth={2.3} />
                <Text style={styles.assigningText}>Chưa gán nhân viên</Text>
              </View>
            )}

            <Text style={styles.note}>
              Trạng thái sẽ tự cập nhật khi nhân viên xác nhận xuất phát / đã đến / hoàn thành.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  headerSafe: { backgroundColor: '#ffffff', zIndex: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#ea580c' },

  mapRegion: { flex: 1, backgroundColor: '#e5e7eb' },
  map: { flex: 1, backgroundColor: '#e5e7eb' },
  mapPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  sheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 26,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 16,
  },
  stepper: { flexDirection: 'row', marginBottom: 16 },
  stepItem: { flex: 1, alignItems: 'center' },
  stepLine: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  stepBar: { flex: 1, height: 3, backgroundColor: '#e2e8f0', borderRadius: 2 },
  stepBarOn: { backgroundColor: '#ea580c' },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#e2e8f0' },
  stepDotOn: { backgroundColor: '#ea580c' },
  stepDotCurrent: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#fed7aa', backgroundColor: '#ea580c' },
  stepLabel: { fontSize: 10.5, color: '#94a3b8', marginTop: 6, fontWeight: '600' },
  stepLabelOn: { color: '#ea580c', fontWeight: '800' },

  center: { paddingVertical: 20, alignItems: 'center' },
  statusBanner: {
    backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ffedd5', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12,
  },
  statusText: { fontSize: 14, fontWeight: '800', color: '#c2410c' },
  etaText: { fontSize: 12.5, fontWeight: '700', color: '#ea580c', marginTop: 3 },

  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, marginBottom: 10,
  },
  infoIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoName: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  infoSub: { fontSize: 12.5, color: '#64748b', marginTop: 1 },
  callBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#fed7aa', backgroundColor: '#fff7ed',
    alignItems: 'center', justifyContent: 'center',
  },
  assigningRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 10,
  },
  assigningText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  note: { fontSize: 12, color: '#94a3b8', lineHeight: 18, marginTop: 4 },
});
