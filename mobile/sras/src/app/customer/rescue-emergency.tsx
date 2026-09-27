import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  Animated,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import {
  ChevronLeft,
  Search,
  Crosshair,
  MapPin,
  X,
  Check,
  Clock,
  AlertTriangle,
  WifiOff,
  RefreshCw,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { GOONG_MAPTILES_KEY } from '../../config/goong';
import { goongApi, GoongPrediction } from '../../api/goongApi';
import { rescueApi } from '../../api/rescueApi';

// Design tokens — 1 accent thương hiệu (cam-đỏ), nền trung tính ấm, amber = cảnh báo.
const BRAND = '#ea580c';
const INK = '#1c1917';
const SUB = '#78716c';
const LINE = '#e7e5e4';
const CARD = '#ffffff';
const AMBER_BG = '#fef3c7';
const AMBER_INK = '#b45309';

const CURRENT_STEP = 1;
const TOTAL_STEPS = 3;
const FAR_THRESHOLD_M = 200; // cảnh báo khi ghim lệch GPS thực quá mức này

// Vị trí map mặc định (TP.HCM) — chỉ dùng để khởi tạo, sẽ recenter về GPS thật.
const DEFAULT = { lat: 10.776, lng: 106.7009 };

type RecentLoc = { address: string; lat: number; lng: number };

// Khoảng cách Haversine (mét) giữa 2 điểm.
function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Bản đồ goong-js trong WebView. Gửi 'drag' khi bắt đầu kéo, toạ độ khi dừng (moveend).
// Lưu ý: goong-js nhận [lng, lat].
function buildMapHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #e5e7eb; }
    .goongmaps-ctrl-bottom-left, .goongmaps-ctrl-bottom-right { font-size: 9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <script>
    function post(o){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); } }
    window.onerror = function(m){ post({ type:'log', message:'js-error: '+m }); };
    if (typeof goongjs === 'undefined') {
      post({ type:'maperror', message:'goong-js CDN chưa tải được.' });
    } else {
      goongjs.accessToken = '${GOONG_MAPTILES_KEY}';
      var map = new goongjs.Map({
        container: 'map',
        style: 'https://tiles.goong.io/assets/goong_map_web.json',
        center: [${DEFAULT.lng}, ${DEFAULT.lat}],
        zoom: 16,
      });
      window.__map = map;
      map.on('error', function(e){ post({ type:'maperror', message: (e && e.error ? e.error.message : 'unknown') }); });
      map.on('movestart', function(){ post({ type:'drag' }); });
      function sendIdle(){ var c = map.getCenter(); post({ type:'idle', lat:c.lat, lng:c.lng }); }
      map.on('moveend', sendIdle);
      map.on('load', function(){ sendIdle(); setTimeout(function(){ map.resize(); }, 300); });
      window.addEventListener('resize', function(){ map.resize(); });
      window.recenter = function(la, ln){ map.flyTo({ center:[ln, la], zoom:17 }); };
    }
  </script>
</body>
</html>`;
}

export default function RescueLocationScreen() {
  const router = useRouter();
  const webRef = useRef<WebView>(null);

  const [mapKey, setMapKey] = useState(0);
  const [mapError, setMapError] = useState(false);

  const [coord, setCoord] = useState(DEFAULT);
  const [address, setAddress] = useState('');
  const [reverseLoading, setReverseLoading] = useState(false);

  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<GoongPrediction[]>([]);
  const [searching, setSearching] = useState(false);

  const [locating, setLocating] = useState(false);
  const [permDenied, setPermDenied] = useState(false);

  // Vị trí đã từng đặt cứu hộ (từ lịch sử thật, không bịa).
  const [recent, setRecent] = useState<RecentLoc[]>([]);

  const acTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rvTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAc = useRef(false);
  const skipNextReverse = useRef(false);
  const gpsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Hiệu ứng "thả ghim": nhấc lên khi kéo, nảy nhẹ khi dừng.
  const pinLift = useRef(new Animated.Value(0)).current;
  const liftPin = () =>
    Animated.spring(pinLift, { toValue: -12, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
  const dropPin = () =>
    Animated.spring(pinLift, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 12 }).start();

  // Nạp lịch sử → gom vị trí đã đặt (dedup theo địa chỉ), lấy 3 mục gần nhất.
  useEffect(() => {
    (async () => {
      try {
        const list = await rescueApi.mine();
        const seen = new Set<string>();
        const locs: RecentLoc[] = [];
        for (const r of list) {
          const addr = (r.pickupAddress ?? '').trim();
          if (!addr) continue; // chỉ hiển thị mục có địa chỉ thật
          const key = addr.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          locs.push({ address: addr, lat: r.pickupLat, lng: r.pickupLng });
          if (locs.length >= 3) break;
        }
        setRecent(locs);
      } catch {
        /* không có lịch sử → ẩn khối này */
      }
    })();
  }, []);

  // Gõ search → Goong autocomplete (debounce 350ms).
  useEffect(() => {
    if (skipNextAc.current) {
      skipNextAc.current = false;
      return;
    }
    if (acTimer.current) clearTimeout(acTimer.current);
    const q = query.trim();
    if (q.length < 2) {
      setPredictions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    acTimer.current = setTimeout(async () => {
      try {
        setPredictions(await goongApi.autocomplete(q, coord));
      } catch {
        setPredictions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (acTimer.current) clearTimeout(acTimer.current);
    };
  }, [query]);

  // Ghim dừng → reverse geocode ra tên đường (skeleton trong lúc chờ).
  const reverseFor = (lat: number, lng: number) => {
    if (skipNextReverse.current) {
      skipNextReverse.current = false;
      return;
    }
    if (rvTimer.current) clearTimeout(rvTimer.current);
    setReverseLoading(true);
    rvTimer.current = setTimeout(async () => {
      try {
        const addr = await goongApi.reverseGeocode(lat, lng);
        if (addr) setAddress(addr);
      } catch {
        /* giữ địa chỉ cũ */
      } finally {
        setReverseLoading(false);
      }
    }, 600);
  };

  const onMessage = (e: any) => {
    try {
      const d = JSON.parse(e.nativeEvent.data);
      if (d.type === 'log') {
        console.log('[map]', d.message);
        return;
      }
      if (d.type === 'maperror') {
        console.log('[map] error', d.message);
        setMapError(true);
        return;
      }
      if (d.type === 'drag') {
        liftPin();
        return;
      }
      if (d.type === 'idle' && typeof d.lat === 'number' && typeof d.lng === 'number') {
        dropPin();
        setCoord({ lat: d.lat, lng: d.lng });
        reverseFor(d.lat, d.lng);
      }
    } catch {}
  };

  const onSelectPrediction = async (p: GoongPrediction) => {
    Keyboard.dismiss();
    setPredictions([]);
    skipNextAc.current = true;
    setQuery(p.mainText);
    try {
      const place = await goongApi.placeDetail(p.placeId);
      if (place) {
        skipNextReverse.current = true; // đã có địa chỉ đầy đủ
        setCoord({ lat: place.lat, lng: place.lng });
        setAddress(place.address || p.description);
        webRef.current?.injectJavaScript(`window.recenter(${place.lat}, ${place.lng}); true;`);
      }
    } catch {}
  };

  const onSelectRecent = (r: RecentLoc) => {
    skipNextReverse.current = true;
    setCoord({ lat: r.lat, lng: r.lng });
    setAddress(r.address);
    webRef.current?.injectJavaScript(`window.recenter && window.recenter(${r.lat}, ${r.lng}); true;`);
  };

  // Lấy GPS thật → recenter + set toạ độ.
  const locateMe = async () => {
    try {
      setLocating(true);
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermDenied(true);
        if (!canAskAgain) Linking.openSettings();
        return;
      }
      setPermDenied(false);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      gpsRef.current = { lat, lng };
      setCoord({ lat, lng });
      reverseFor(lat, lng);
      webRef.current?.injectJavaScript(`window.recenter && window.recenter(${lat}, ${lng}); true;`);
    } catch {
      /* im lặng — người dùng vẫn kéo map thủ công được */
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    locateMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadMap = () => {
    setMapError(false);
    setMapKey((k) => k + 1);
  };

  const onConfirm = () => {
    router.push({
      pathname: '/customer/rescue-describe',
      params: {
        lat: coord.lat.toFixed(6),
        lng: coord.lng.toFixed(6),
        address,
      },
    } as any);
  };

  const farFromGps = gpsRef.current ? distanceM(coord, gpsRef.current) > FAR_THRESHOLD_M : false;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f5" />

      {/* MAP */}
      <View style={styles.mapRegion}>
        {mapError ? (
          <View style={styles.mapFallback}>
            <View style={styles.fallbackIcon}>
              <WifiOff size={28} color={SUB} strokeWidth={2} />
            </View>
            <Text style={styles.fallbackTitle}>Không tải được bản đồ</Text>
            <Text style={styles.fallbackDesc}>Kiểm tra kết nối mạng rồi thử lại.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={reloadMap} activeOpacity={0.85}>
              <RefreshCw size={16} color="#ffffff" strokeWidth={2.4} />
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            key={mapKey}
            ref={webRef}
            originWhitelist={['*']}
            source={{ html: buildMapHtml(), baseUrl: 'https://cdn.jsdelivr.net/' }}
            style={styles.map}
            javaScriptEnabled
            domStorageEnabled
            onMessage={onMessage}
            startInLoadingState
            mixedContentMode="always"
            setSupportMultipleWindows={false}
            onError={() => setMapError(true)}
            onHttpError={(e) => {
              if (e.nativeEvent.statusCode >= 500) setMapError(true);
            }}
            onLoadEnd={() => {
              let js = 'setTimeout(function(){ if(window.__map){ window.__map.resize(); } }, 150);';
              const g = gpsRef.current;
              if (g) js += `window.recenter && window.recenter(${g.lat}, ${g.lng});`;
              webRef.current?.injectJavaScript(js + ' true;');
            }}
            androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
          />
        )}

        {/* Top overlay: back + step strip, rồi search (tách riêng) */}
        <SafeAreaView edges={['top']} style={styles.topSafe} pointerEvents="box-none">
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.roundBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.8}
            >
              <ChevronLeft size={22} color={INK} strokeWidth={2.4} />
            </TouchableOpacity>

            <View style={styles.stepStrip}>
              <Text style={styles.stepText}>
                Bước {CURRENT_STEP}/{TOTAL_STEPS}
              </Text>
              <View style={styles.segs}>
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <View key={i} style={[styles.seg, i < CURRENT_STEP && styles.segOn]} />
                ))}
              </View>
            </View>
          </View>

          {!mapError && (
            <View style={styles.searchWrap}>
              <View style={styles.searchBar}>
                <Search size={18} color={SUB} strokeWidth={2.2} />
                <TextInput
                  placeholder="Tìm địa chỉ cứu hộ..."
                  placeholderTextColor={SUB}
                  value={query}
                  onChangeText={setQuery}
                  style={styles.searchInput}
                  returnKeyType="search"
                />
                {searching ? (
                  <ActivityIndicator size="small" color={BRAND} />
                ) : query.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => {
                      setQuery('');
                      setPredictions([]);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={16} color={SUB} strokeWidth={2.4} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {predictions.length > 0 && (
                <ScrollView
                  style={styles.suggestBox}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {predictions.map((p) => (
                    <TouchableOpacity
                      key={p.placeId}
                      style={styles.suggestRow}
                      onPress={() => onSelectPrediction(p)}
                      activeOpacity={0.7}
                    >
                      <MapPin size={15} color={BRAND} strokeWidth={2.2} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestMain} numberOfLines={1}>
                          {p.mainText}
                        </Text>
                        {!!p.secondaryText && (
                          <Text style={styles.suggestSub} numberOfLines={1}>
                            {p.secondaryText}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </SafeAreaView>

        {/* Ghim cố định ở tâm (Grab-style), có hiệu ứng thả ghim */}
        {!mapError && (
          <View style={styles.pinOverlay} pointerEvents="none">
            <Animated.View style={{ transform: [{ translateY: pinLift }], alignItems: 'center' }}>
              <View style={styles.pinHead}>
                <MapPin size={18} color="#ffffff" strokeWidth={2.6} />
              </View>
              <View style={styles.pinStem} />
            </Animated.View>
            <View style={styles.pinShadow} />
          </View>
        )}

        {/* FAB vị trí hiện tại — nổi góc phải, trên sheet */}
        {!mapError && (
          <TouchableOpacity style={styles.fab} onPress={locateMe} activeOpacity={0.85} disabled={locating}>
            {locating ? (
              <ActivityIndicator size="small" color={BRAND} />
            ) : (
              <Crosshair size={22} color={BRAND} strokeWidth={2.4} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* BOTTOM SHEET */}
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.handle} />

        {permDenied && (
          <TouchableOpacity style={styles.permBanner} onPress={locateMe} activeOpacity={0.85}>
            <MapPin size={16} color={AMBER_INK} strokeWidth={2.4} />
            <Text style={styles.permText}>Bật quyền vị trí để định vị chính xác hơn</Text>
            <Text style={styles.permAction}>Cho phép</Text>
          </TouchableOpacity>
        )}

        {/* Tên đường (dòng chính) — skeleton khi đang reverse-geocode */}
        <View style={styles.addrRow}>
          <View style={styles.addrPin}>
            <MapPin size={18} color="#ffffff" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.addrLabel}>Điểm cứu hộ</Text>
            {reverseLoading && !address ? (
              <View style={styles.skeletonWrap}>
                <View style={[styles.skeleton, { width: '82%' }]} />
                <View style={[styles.skeleton, { width: '55%' }]} />
              </View>
            ) : (
              <Text style={styles.addrText} numberOfLines={2}>
                {address || 'Kéo bản đồ để đặt ghim đúng vị trí của bạn'}
              </Text>
            )}
          </View>
        </View>

        {farFromGps && (
          <View style={styles.warnRow}>
            <AlertTriangle size={15} color={AMBER_INK} strokeWidth={2.4} />
            <Text style={styles.warnText}>
              Vị trí bạn chọn khá xa chỗ bạn đang đứng — kiểm tra lại?
            </Text>
          </View>
        )}

        {/* Vị trí đã từng đặt cứu hộ (ẩn nếu chưa có lịch sử) */}
        {recent.length > 0 && (
          <View style={styles.recentBlock}>
            <Text style={styles.recentLabel}>Đã đặt gần đây</Text>
            {recent.map((r, i) => (
              <TouchableOpacity
                key={`${r.lat},${r.lng},${i}`}
                style={styles.recentRow}
                onPress={() => onSelectRecent(r)}
                activeOpacity={0.7}
              >
                <View style={styles.recentIcon}>
                  <Clock size={16} color={SUB} strokeWidth={2.2} />
                </View>
                <Text style={styles.recentText} numberOfLines={1}>
                  {r.address}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} activeOpacity={0.9}>
          <Check size={18} color="#ffffff" strokeWidth={2.6} />
          <Text style={styles.confirmText}>Xác nhận vị trí</Text>
        </TouchableOpacity>
      </SafeAreaView>
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
  root: { flex: 1, backgroundColor: '#f7f7f5' },

  mapRegion: { flex: 1, position: 'relative' },
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#e5e7eb' },

  /* Map fallback */
  mapFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, backgroundColor: '#f7f7f5' },
  fallbackIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: '#f5f5f4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  fallbackTitle: { fontSize: 16, fontWeight: '800', color: INK },
  fallbackDesc: { fontSize: 14, fontWeight: '600', color: SUB, marginTop: 4, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BRAND,
    borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20,
  },
  retryText: { fontSize: 14, fontWeight: '800', color: '#ffffff' },

  /* Top overlay */
  topSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  roundBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: CARD,
    alignItems: 'center', justifyContent: 'center', ...CARD_SHADOW,
  },
  stepStrip: {
    flex: 1, height: 44, borderRadius: 12, backgroundColor: CARD, ...CARD_SHADOW,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  stepText: { fontSize: 12, fontWeight: '800', color: INK },
  segs: { flexDirection: 'row', gap: 4 },
  seg: { width: 18, height: 4, borderRadius: 12, backgroundColor: '#e7e5e4' },
  segOn: { backgroundColor: BRAND },

  searchWrap: { paddingHorizontal: 16, marginTop: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: CARD,
    borderRadius: 12, paddingHorizontal: 12, height: 48, ...CARD_SHADOW,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600', color: INK, padding: 0 },
  suggestBox: {
    maxHeight: 240, marginTop: 8, borderRadius: 12, backgroundColor: CARD, ...CARD_SHADOW,
  },
  suggestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f4',
  },
  suggestMain: { fontSize: 14, fontWeight: '800', color: INK },
  suggestSub: { fontSize: 12, fontWeight: '600', color: SUB, marginTop: 1 },

  /* Center pin */
  pinOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  pinHead: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#ffffff',
    shadowColor: '#1c1917', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  pinStem: { width: 3, height: 14, backgroundColor: BRAND },
  pinShadow: { width: 12, height: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.18)', marginTop: 2 },

  /* FAB */
  fab: {
    position: 'absolute', right: 16, bottom: 16,
    width: 48, height: 48, borderRadius: 12, backgroundColor: CARD,
    alignItems: 'center', justifyContent: 'center', ...CARD_SHADOW,
  },

  /* Bottom sheet */
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 12, backgroundColor: '#e7e5e4', marginBottom: 16 },

  permBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: AMBER_BG,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  permText: { flex: 1, fontSize: 13, fontWeight: '600', color: AMBER_INK },
  permAction: { fontSize: 13, fontWeight: '800', color: AMBER_INK },

  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  addrPin: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
  },
  addrLabel: { fontSize: 11, fontWeight: '800', color: SUB, letterSpacing: 0.5, textTransform: 'uppercase' },
  addrText: { fontSize: 16, fontWeight: '800', color: INK, lineHeight: 22, marginTop: 3 },
  skeletonWrap: { marginTop: 6, gap: 7 },
  skeleton: { height: 12, borderRadius: 12, backgroundColor: '#ececeb' },

  warnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: AMBER_BG,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12,
  },
  warnText: { flex: 1, fontSize: 13, fontWeight: '600', color: AMBER_INK, lineHeight: 18 },

  /* Recent locations */
  recentBlock: { marginTop: 16 },
  recentLabel: { fontSize: 11, fontWeight: '800', color: SUB, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  recentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f4',
  },
  recentIcon: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#f5f5f4',
    alignItems: 'center', justifyContent: 'center',
  },
  recentText: { flex: 1, fontSize: 14, fontWeight: '600', color: INK },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BRAND, borderRadius: 12, height: 52, marginTop: 16, marginBottom: 4,
  },
  confirmText: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
});
