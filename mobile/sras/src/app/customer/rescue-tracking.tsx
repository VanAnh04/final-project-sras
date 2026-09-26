import { useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import {
  ChevronLeft,
  Phone,
  PhoneCall,
  MessageCircle,
  Star,
  ShieldCheck,
  CheckCircle2,
  X,
  SearchX,
  Truck,
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto, RescueStatus } from '../../api/rescueApi';
import { goongApi } from '../../api/goongApi';
import { GOONG_MAPTILES_KEY } from '../../config/goong';

const STEPS = ['Tìm gara', 'Gara nhận', 'Đang tới', 'Đã đến'];
const POLL_MS = 4000;
const TERMINAL: RescueStatus[] = ['NO_GARAGE_FOUND', 'DECLINED', 'COMPLETED', 'CANCELLED'];

// Khoảng cách 2 điểm (km) — dùng để throttle gọi lại Directions khi xe di chuyển.
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
    case 'TOWING':
    case 'COMPLETED':
    case 'AWAITING_PAYMENT':
    case 'PAID':
    case 'RATED':
      return 3;
    default:
      return 0; // SEARCHING / PENDING_GARAGE
  }
}

// Bản đồ theo dõi dựng bằng goong-js. Các setter được định nghĩa TRƯỚC khi tải
// goong-js để injectJavaScript từ RN không bao giờ bị mất (giá trị được lưu lại,
// áp dụng khi map 'load'). Toạ độ goong-js là [lng, lat].
function buildMapHtml(lat: number, lng: number) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #e5e7eb; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // State + setters (không phụ thuộc goong-js, tồn tại ngay khi parse).
    var __state = { pickup: null, rescuer: null, route: null, ready: false, autoFit: true };
    function rnlog(m){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify({type:'log',message:String(m)})); } }
    window.onerror = function(m){ rnlog('js-error: ' + m); };
    window.setPickup = function(la, ln){ __state.pickup = [ln, la]; window.__apply && window.__apply(); };
    window.setRescuer = function(la, ln){ __state.rescuer = [ln, la]; window.__apply && window.__apply(); };
    window.setRoute = function(json){ try { __state.route = JSON.parse(json); } catch(e){} window.__apply && window.__apply(); };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <script>
    if (typeof goongjs === 'undefined') {
      rnlog('goong-js CDN chưa tải được.');
    } else {
      goongjs.accessToken = '${GOONG_MAPTILES_KEY}';
      var map = new goongjs.Map({
        container: 'map',
        style: 'https://tiles.goong.io/assets/goong_map_web.json',
        center: [${lng}, ${lat}],
        zoom: 15,
      });
      window.__map = map;
      map.on('error', function(e){ rnlog('map lỗi: ' + (e && e.error ? e.error.message : '?')); });
      map.on('dragstart', function(){ __state.autoFit = false; });

      var pickupMarker = null, rescuerMarker = null;

      function ensureRouteLayer(){
        if (map.getSource('route')) return;
        map.addSource('route', { type: 'geojson', data: { type:'Feature', geometry:{ type:'LineString', coordinates: [] } } });
        map.addLayer({
          id: 'route-line', type: 'line', source: 'route',
          layout: { 'line-cap':'round', 'line-join':'round' },
          paint: { 'line-color':'#ea580c', 'line-width':4, 'line-opacity':0.85 }
        });
      }

      function fit(){
        var s = __state, pts = [];
        if (s.route && s.route.length) pts = s.route.slice();
        if (s.pickup) pts.push(s.pickup);
        if (s.rescuer) pts.push(s.rescuer);
        if (pts.length === 0) return;
        if (pts.length === 1){ map.easeTo({ center: pts[0], zoom: 15 }); return; }
        var b = new goongjs.LngLatBounds(pts[0], pts[0]);
        for (var i = 1; i < pts.length; i++) b.extend(pts[i]);
        map.fitBounds(b, { padding: 60, maxZoom: 16, duration: 600 });
      }

      window.__apply = function(){
        var s = __state;
        if (!s.ready) return;
        if (s.pickup){
          if (!pickupMarker) pickupMarker = new goongjs.Marker({ color: '#ea580c' }).setLngLat(s.pickup).addTo(map);
          else pickupMarker.setLngLat(s.pickup);
        }
        if (s.rescuer){
          if (!rescuerMarker) rescuerMarker = new goongjs.Marker({ color: '#2563eb' }).setLngLat(s.rescuer).addTo(map);
          else rescuerMarker.setLngLat(s.rescuer);
        }
        if (s.route){
          ensureRouteLayer();
          map.getSource('route').setData({ type:'Feature', geometry:{ type:'LineString', coordinates: s.route } });
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

export default function RescueTrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const requestId = params.id ? parseInt(params.id, 10) : NaN;
  const webRef = useRef<WebView>(null);

  const [data, setData] = useState<RescueRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const routeCoordsRef = useRef<[number, number][] | null>(null);
  const lastOriginRef = useRef<{ lat: number; lng: number } | null>(null);

  const status = data?.status;
  const activeStep = stepOf(status);
  const searching = status === 'SEARCHING' || status === 'PENDING_GARAGE' || !status;

  // Poll trạng thái thật từ backend.
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
        if (!TERMINAL.includes(res.status)) {
          timer = setTimeout(tick, POLL_MS);
        }
      } catch {
        if (!alive) return;
        setLoading(false);
        timer = setTimeout(tick, POLL_MS); // lỗi mạng tạm thời -> thử lại
      }
    };
    tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [requestId]);

  // Radar pulse khi đang quét.
  useEffect(() => {
    if (!searching) return;
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [searching, pulse]);

  // Ghim vị trí khách lên map khi có toạ độ.
  useEffect(() => {
    if (data?.pickupLat != null && data?.pickupLng != null) {
      webRef.current?.injectJavaScript(
        `window.setPickup && window.setPickup(${data.pickupLat}, ${data.pickupLng}); true;`
      );
    }
  }, [data?.pickupLat, data?.pickupLng]);

  // Marker xe cứu hộ di chuyển theo thời gian thực.
  useEffect(() => {
    if (data?.rescuerLat != null && data?.rescuerLng != null) {
      webRef.current?.injectJavaScript(
        `window.setRescuer && window.setRescuer(${data.rescuerLat}, ${data.rescuerLng}); true;`
      );
    }
  }, [data?.rescuerLat, data?.rescuerLng]);

  // Vẽ lộ trình (Goong Directions): xuất phát từ xe cứu hộ nếu đã có vị trí live,
  // nếu chưa thì từ gara → tới điểm của khách. Gọi lại khi điểm xuất phát đổi >30m.
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
      const r = await goongApi.directions(
        { lat: oLat, lng: oLng },
        { lat: pLat, lng: pLng },
        data?.vehicleType === 'MOTORBIKE' ? 'bike' : 'car'
      );
      if (!alive || !r) return;
      routeCoordsRef.current = r.coordinates;
      setRouteInfo({ distanceKm: r.distanceKm, durationMin: r.durationMin });
      webRef.current?.injectJavaScript(
        `window.setRoute && window.setRoute(${JSON.stringify(JSON.stringify(r.coordinates))}); true;`
      );
    })();
    return () => {
      alive = false;
    };
  }, [data?.rescuerLat, data?.rescuerLng, data?.garage?.lat, data?.garage?.lng, data?.pickupLat, data?.pickupLng]);

  // Nạp lại toàn bộ state cho map sau khi trang WebView load xong (tránh mất inject sớm).
  const onMapLoadEnd = () => {
    let js = '';
    if (data?.pickupLat != null && data?.pickupLng != null) {
      js += `window.setPickup && window.setPickup(${data.pickupLat}, ${data.pickupLng});`;
    }
    if (data?.rescuerLat != null && data?.rescuerLng != null) {
      js += `window.setRescuer && window.setRescuer(${data.rescuerLat}, ${data.rescuerLng});`;
    }
    if (routeCoordsRef.current) {
      js += `window.setRoute && window.setRoute(${JSON.stringify(JSON.stringify(routeCoordsRef.current))});`;
    }
    if (js) webRef.current?.injectJavaScript(js + ' true;');
  };

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 2.2] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  const mapHtml = useMemo(() => {
    if (data?.pickupLat != null && data?.pickupLng != null) {
      return buildMapHtml(data.pickupLat, data.pickupLng);
    }
    return null;
  }, [data?.pickupLat, data?.pickupLng]);

  const callPhone = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  // Đối tượng liên hệ: ưu tiên nhân viên đã gán, không thì chủ gara.
  const peerName = data?.staff?.name || data?.garage?.name || 'Đội cứu hộ';
  const peerPhone = data?.staff?.phone || data?.garage?.phone;
  const peerRole = data?.staff ? 'Nhân viên cứu hộ' : 'Gara';

  const onMessage = () => {
    router.push({
      pathname: '/customer/messages',
      params: {
        requestId: String(requestId),
        peerName,
        peerPhone: peerPhone || '',
        peerRole,
      },
    } as any);
  };

  const onFreeCall = () => {
    // Gọi qua Internet (VoIP) — chưa có hạ tầng, tạm dùng gọi thường nếu có số.
    Alert.alert(
      'Gọi miễn phí',
      'Tính năng gọi miễn phí qua Internet đang được phát triển. Bạn có muốn gọi thường không?',
      [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Gọi thường', onPress: () => callPhone(peerPhone) },
      ]
    );
  };

  const goHome = () => router.replace('/customer');

  const onCancel = () => {
    Alert.alert('Huỷ yêu cầu cứu hộ?', 'Bạn có chắc muốn huỷ yêu cầu này?', [
      { text: 'Không', style: 'cancel' },
      { text: 'Huỷ yêu cầu', style: 'destructive', onPress: goHome },
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color="#ea580c" strokeWidth={2.6} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Theo dõi cứu hộ</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      {/* Map */}
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
              } catch {}
            }}
            onLoadEnd={onMapLoadEnd}
            androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
          />
        ) : (
          <View style={[styles.map, styles.mapPlaceholder]}>
            <ActivityIndicator color="#ea580c" />
          </View>
        )}
      </View>

      {/* Sheet */}
      <View style={styles.sheet}>
        {/* Stepper (ẩn ở trạng thái không tìm được gara) */}
        {status !== 'NO_GARAGE_FOUND' && (
          <View style={styles.stepper}>
            {STEPS.map((label, i) => {
              const done = i < activeStep;
              const current = i === activeStep;
              return (
                <View key={label} style={styles.stepItem}>
                  <View style={styles.stepLine}>
                    {i > 0 && <View style={[styles.stepBar, i <= activeStep && styles.stepBarOn]} />}
                    <View
                      style={[
                        styles.stepDot,
                        (done || current) && styles.stepDotOn,
                        current && styles.stepDotCurrent,
                      ]}
                    />
                    {i < STEPS.length - 1 && (
                      <View style={[styles.stepBar, i < activeStep && styles.stepBarOn]} />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, (done || current) && styles.stepLabelOn]}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {loading && !data ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator color="#ea580c" />
            <Text style={styles.searchSub}>Đang tải yêu cầu...</Text>
          </View>
        ) : Number.isNaN(requestId) ? (
          <View style={styles.centerBlock}>
            <Text style={styles.searchTitle}>Không tìm thấy yêu cầu</Text>
            <TouchableOpacity style={styles.doneBtn} onPress={goHome} activeOpacity={0.9}>
              <Text style={styles.doneText}>Về trang chủ</Text>
            </TouchableOpacity>
          </View>
        ) : status === 'NO_GARAGE_FOUND' ? (
          <View style={styles.centerBlock}>
            <View style={styles.noGarageIcon}>
              <SearchX size={28} color="#dc2626" strokeWidth={2.3} />
            </View>
            <Text style={styles.searchTitle}>Chưa tìm được gara phù hợp</Text>
            <Text style={styles.searchSub}>
              Hiện chưa có gara nào trực trong khu vực. Bạn có thể thử lại sau ít phút.
            </Text>
            <TouchableOpacity style={styles.doneBtn} onPress={goHome} activeOpacity={0.9}>
              <Text style={styles.doneText}>Về trang chủ</Text>
            </TouchableOpacity>
          </View>
        ) : searching ? (
          <View style={styles.centerBlock}>
            <View style={styles.radarWrap}>
              <Animated.View
                style={[styles.radarRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
              />
              <View style={styles.radarCore} />
            </View>
            <Text style={styles.searchTitle}>Đang tìm gara gần nhất...</Text>
            <Text style={styles.searchSub}>
              Đã gửi lời mời tới các gara trực gần bạn. Đang chờ gara nhận yêu cầu.
            </Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <X size={16} color="#dc2626" strokeWidth={2.4} />
              <Text style={styles.cancelText}>Huỷ yêu cầu</Text>
            </TouchableOpacity>
          </View>
        ) : status === 'COMPLETED' ? (
          <View style={styles.centerBlock}>
            <View style={styles.arrivedIcon}>
              <CheckCircle2 size={30} color="#ffffff" strokeWidth={2.4} />
            </View>
            <Text style={styles.searchTitle}>Đã hoàn tất cứu hộ</Text>
            <Text style={styles.searchSub}>Cảm ơn bạn đã sử dụng dịch vụ. Chúc bạn lên đường an toàn.</Text>
            <TouchableOpacity style={styles.doneBtn} onPress={goHome} activeOpacity={0.9}>
              <Text style={styles.doneText}>Hoàn tất</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // ACCEPTED / ASSIGNED / EN_ROUTE / ARRIVED
          <View>
            <View style={styles.etaBanner}>
              <Text style={styles.etaLabel}>
                {status === 'ACCEPTED'
                  ? 'Gara đã nhận yêu cầu'
                  : status === 'ASSIGNED'
                  ? 'Nhân viên chuẩn bị xuất phát'
                  : status === 'EN_ROUTE'
                  ? 'Đội cứu hộ đang tới'
                  : 'Đội cứu hộ đã đến nơi'}
              </Text>
              {routeInfo && (status === 'EN_ROUTE' || status === 'ASSIGNED') ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.etaValue}>~{routeInfo.durationMin} phút</Text>
                  <Text style={styles.etaSub}>{routeInfo.distanceKm.toFixed(1)} km</Text>
                </View>
              ) : data?.dispatchDistanceKm != null ? (
                <Text style={styles.etaValue}>{Number(data.dispatchDistanceKm).toFixed(1)} km</Text>
              ) : null}
            </View>

            {/* Gara */}
            {data?.garage && (
              <View style={styles.garageCard}>
                <View style={styles.garageAvatar}>
                  <Text style={styles.garageAvatarText}>
                    {data.garage.name.trim().charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.garageNameRow}>
                    <Text style={styles.garageName} numberOfLines={1}>{data.garage.name}</Text>
                    <ShieldCheck size={15} color="#059669" strokeWidth={2.4} />
                  </View>
                  <View style={styles.garageMetaRow}>
                    {data.garage.avgRating != null && (
                      <>
                        <Star size={13} color="#f59e0b" fill="#f59e0b" />
                        <Text style={styles.garageMeta}>{Number(data.garage.avgRating).toFixed(1)}</Text>
                        <Text style={styles.garageDot}>·</Text>
                      </>
                    )}
                    <Text style={styles.garageMeta} numberOfLines={1}>{data.garage.phone}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Nhân viên + xe cứu hộ — hiện sau khi gara gán */}
            {data?.staff ? (
              <View style={styles.staffCard}>
                <View style={styles.staffIcon}>
                  <Truck size={18} color="#ea580c" strokeWidth={2.3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffName}>{data.staff.name}</Text>
                  <View style={styles.staffMetaRow}>
                    <Text style={styles.staffMeta}>Nhân viên cứu hộ</Text>
                    {data.rescueVehicle?.licensePlate && (
                      <>
                        <Text style={styles.garageDot}>·</Text>
                        <Text style={styles.plate}>{data.rescueVehicle.licensePlate}</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.assigningRow}>
                <ActivityIndicator size="small" color="#ea580c" />
                <Text style={styles.assigningText}>Gara đang phân công nhân viên...</Text>
              </View>
            )}

            {/* Liên hệ kiểu Grab: nhắn tin · gọi miễn phí · gọi */}
            <View style={styles.contactRow}>
              <TouchableOpacity style={styles.contactBtn} onPress={onMessage} activeOpacity={0.85}>
                <View style={[styles.contactIcon, { backgroundColor: '#eff6ff' }]}>
                  <MessageCircle size={20} color="#2563eb" strokeWidth={2.3} />
                </View>
                <Text style={styles.contactText}>Nhắn tin</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactBtn} onPress={onFreeCall} activeOpacity={0.85}>
                <View style={[styles.contactIcon, { backgroundColor: '#ecfdf5' }]}>
                  <PhoneCall size={20} color="#059669" strokeWidth={2.3} />
                </View>
                <Text style={styles.contactText}>Gọi miễn phí</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactBtn} onPress={() => callPhone(peerPhone)} activeOpacity={0.85}>
                <View style={[styles.contactIcon, { backgroundColor: '#fff7ed' }]}>
                  <Phone size={20} color="#ea580c" strokeWidth={2.3} />
                </View>
                <Text style={styles.contactText}>Gọi</Text>
              </TouchableOpacity>
            </View>

            {status === 'ARRIVED' ? (
              <TouchableOpacity style={styles.doneLink} onPress={goHome} activeOpacity={0.7}>
                <Text style={styles.doneLinkText}>Đóng</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.cancelLink} onPress={onCancel} activeOpacity={0.7}>
                <Text style={styles.cancelLinkText}>Huỷ yêu cầu</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },

  headerSafe: { backgroundColor: '#ffffff', zIndex: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#ea580c' },

  mapRegion: { flex: 1, backgroundColor: '#e5e7eb' },
  map: { flex: 1, backgroundColor: '#e5e7eb' },
  mapPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 26,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 16,
  },

  stepper: { flexDirection: 'row', marginBottom: 18 },
  stepItem: { flex: 1, alignItems: 'center' },
  stepLine: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  stepBar: { flex: 1, height: 3, backgroundColor: '#e2e8f0', borderRadius: 2 },
  stepBarOn: { backgroundColor: '#ea580c' },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#e2e8f0' },
  stepDotOn: { backgroundColor: '#ea580c' },
  stepDotCurrent: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fed7aa',
    backgroundColor: '#ea580c',
  },
  stepLabel: { fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: '600' },
  stepLabelOn: { color: '#ea580c', fontWeight: '800' },

  centerBlock: { alignItems: 'center', paddingTop: 6 },
  radarWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  radarRing: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: '#ea580c' },
  radarCore: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#ea580c',
    borderWidth: 4, borderColor: '#fff7ed',
  },
  noGarageIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#fef2f2',
    borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center',
  },
  searchTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a', marginTop: 10 },
  searchSub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 19, paddingHorizontal: 8 },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18,
    paddingVertical: 12, paddingHorizontal: 22, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#fecaca', backgroundColor: '#fef2f2',
  },
  cancelText: { fontSize: 14, fontWeight: '800', color: '#dc2626' },

  etaBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ffedd5',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
  },
  etaLabel: { fontSize: 14, fontWeight: '800', color: '#c2410c', flexShrink: 1 },
  etaValue: { fontSize: 15, fontWeight: '900', color: '#ea580c' },
  etaSub: { fontSize: 11.5, fontWeight: '700', color: '#c2410c', marginTop: 1 },

  garageCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  garageAvatar: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#0f172a',
    alignItems: 'center', justifyContent: 'center',
  },
  garageAvatarText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  garageNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  garageName: { fontSize: 15, fontWeight: '800', color: '#0f172a', flexShrink: 1 },
  garageMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  garageMeta: { fontSize: 12.5, fontWeight: '700', color: '#475569', flexShrink: 1 },
  garageDot: { fontSize: 12, color: '#cbd5e1' },

  staffCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 14, padding: 12,
  },
  staffIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff7ed',
    borderWidth: 1, borderColor: '#ffedd5', alignItems: 'center', justifyContent: 'center',
  },
  staffName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  staffMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  staffMeta: { fontSize: 12.5, color: '#64748b', fontWeight: '600' },
  plate: {
    fontSize: 12, fontWeight: '800', color: '#334155',
    backgroundColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5,
  },
  assigningRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12,
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 12,
  },
  assigningText: { fontSize: 13, fontWeight: '600', color: '#64748b' },

  callBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ea580c', borderRadius: 14, height: 52, marginTop: 16,
    shadowColor: '#ea580c', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  callText: { fontSize: 15, fontWeight: '900', color: '#ffffff', letterSpacing: 0.3 },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  contactBtn: {
    flex: 1, alignItems: 'center', gap: 7, paddingVertical: 12, borderRadius: 16,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff',
  },
  contactIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  contactText: { fontSize: 12.5, fontWeight: '800', color: '#0f172a' },
  cancelLink: { alignItems: 'center', marginTop: 14 },
  cancelLinkText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  doneLink: { alignItems: 'center', marginTop: 14 },
  doneLinkText: { fontSize: 13, fontWeight: '700', color: '#64748b' },

  arrivedIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
  },
  doneBtn: {
    alignSelf: 'stretch', backgroundColor: '#0f172a', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 20,
  },
  doneText: { fontSize: 15, fontWeight: '900', color: '#ffffff', letterSpacing: 0.3 },
});
