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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { ChevronLeft, Search, Crosshair, MapPin, X } from 'lucide-react-native';
import * as Location from 'expo-location';
import { GOONG_MAPTILES_KEY } from '../../config/goong';
import { goongApi, GoongPrediction } from '../../api/goongApi';

const CURRENT_STEP = 1;
const TOTAL_STEPS = 3;

// Vị trí mặc định (TP.HCM). GPS thật sẽ nối bằng expo-location ở bước sau.
const DEFAULT = { lat: 10.748, lng: 106.628 };

// Bản đồ dựng bằng goong-js (fork Mapbox GL) trong WebView, dùng Maptiles key.
// Lưu ý: goong-js nhận toạ độ dạng [lng, lat] (ngược với Leaflet).
const MAP_HTML = `<!DOCTYPE html>
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
    function rnlog(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: String(msg) }));
      }
    }
    window.onerror = function (m) { rnlog('js-error: ' + m); };

    if (typeof goongjs === 'undefined') {
      rnlog('goong-js CDN chưa tải được (kiểm tra mạng / baseUrl).');
    } else {
      goongjs.accessToken = '${GOONG_MAPTILES_KEY}';
      var map = new goongjs.Map({
        container: 'map',
        style: 'https://tiles.goong.io/assets/goong_map_web.json',
        center: [${DEFAULT.lng}, ${DEFAULT.lat}],
        zoom: 16,
      });
      window.__map = map;

      map.on('error', function (e) { rnlog('map lỗi: ' + (e && e.error ? e.error.message : 'unknown')); });

      function send() {
        var c = map.getCenter();
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ lat: c.lat, lng: c.lng }));
        }
      }
      map.on('moveend', send);
      map.on('load', function () {
        send();
        setTimeout(function () { map.resize(); }, 300);
      });
      window.addEventListener('resize', function () { map.resize(); });

      window.recenter = function (lat, lng) { map.flyTo({ center: [lng, lat], zoom: 17 }); };
    }
  </script>
</body>
</html>`;

export default function RescueLocationScreen() {
  const router = useRouter();
  const webRef = useRef<WebView>(null);
  const [coord, setCoord] = useState(DEFAULT);
  const [query, setQuery] = useState('');
  const [address, setAddress] = useState('');

  // Autocomplete
  const [predictions, setPredictions] = useState<GoongPrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const acTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Sau khi chọn 1 gợi ý (hoặc set query bằng code) thì bỏ qua 1 lần autocomplete/reverse.
  const skipNextAc = useRef(false);
  const skipNextReverse = useRef(false);
  const rvTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // GPS thật gần nhất — dùng để recenter lại nếu map load sau khi lấy được vị trí.
  const gpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // Gõ search → gọi Goong autocomplete (debounce 350ms).
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
        const list = await goongApi.autocomplete(q, coord);
        setPredictions(list);
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

  // Ghim đổi vị trí → reverse geocode ra tên đường (debounce 600ms).
  const reverseFor = (lat: number, lng: number) => {
    if (skipNextReverse.current) {
      skipNextReverse.current = false;
      return;
    }
    if (rvTimer.current) clearTimeout(rvTimer.current);
    rvTimer.current = setTimeout(async () => {
      try {
        const addr = await goongApi.reverseGeocode(lat, lng);
        if (addr) setAddress(addr);
      } catch {
        /* giữ địa chỉ cũ nếu lỗi */
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
      if (typeof d.lat === 'number' && typeof d.lng === 'number') {
        setCoord({ lat: d.lat, lng: d.lng });
        reverseFor(d.lat, d.lng);
      }
    } catch (err) {}
  };

  const onSelectPrediction = async (p: GoongPrediction) => {
    Keyboard.dismiss();
    setPredictions([]);
    skipNextAc.current = true;
    setQuery(p.mainText);
    try {
      const place = await goongApi.placeDetail(p.placeId);
      if (place) {
        skipNextReverse.current = true; // đã có địa chỉ, khỏi reverse lại
        setCoord({ lat: place.lat, lng: place.lng });
        setAddress(place.address || p.description);
        webRef.current?.injectJavaScript(`window.recenter(${place.lat}, ${place.lng}); true;`);
      }
    } catch {
      /* bỏ qua lỗi lấy chi tiết */
    }
  };

  // Lấy GPS thật của thiết bị → recenter map + set toạ độ.
  const locateMe = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Chưa có quyền vị trí', 'Vui lòng bật quyền truy cập vị trí để lấy đúng chỗ bạn đang đứng.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      gpsRef.current = { lat, lng };
      setCoord({ lat, lng });
      skipNextReverse.current = false;
      reverseFor(lat, lng);
      webRef.current?.injectJavaScript(`window.recenter && window.recenter(${lat}, ${lng}); true;`);
    } catch {
      Alert.alert('Không lấy được vị trí', 'Kiểm tra GPS/định vị của thiết bị rồi thử lại.');
    } finally {
      setLocating(false);
    }
  };

  // Tự lấy vị trí hiện tại khi mở màn.
  useEffect(() => {
    locateMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const progress = (CURRENT_STEP / TOTAL_STEPS) * 100;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
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
          <Text style={styles.headerTitle}>Xác nhận vị trí</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      {/* Map region */}
      <View style={styles.mapRegion}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: MAP_HTML, baseUrl: 'https://cdn.jsdelivr.net/' }}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
          onMessage={onMessage}
          startInLoadingState
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          onError={(e) => console.log('[webview] error', e.nativeEvent)}
          onHttpError={(e) => console.log('[webview] http', e.nativeEvent.statusCode)}
          onLoadEnd={() => {
            let js = 'setTimeout(function(){ if(window.__map){ window.__map.resize(); } }, 150);';
            const g = gpsRef.current;
            if (g) js += `window.recenter && window.recenter(${g.lat}, ${g.lng});`;
            webRef.current?.injectJavaScript(js + ' true;');
          }}
          androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
        />

        {/* Top floating card: step + search */}
        <View style={styles.topCard}>
          <View style={styles.stepRow}>
            <Text style={styles.stepLabel}>
              BƯỚC {String(CURRENT_STEP).padStart(2, '0')} / {String(TOTAL_STEPS).padStart(2, '0')}
            </Text>
            <Text style={styles.stepName}>Xác nhận vị trí</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <View style={styles.searchBar}>
            <Search size={18} color="#94a3b8" strokeWidth={2.2} />
            <TextInput
              placeholder="Nhập địa chỉ cứu hộ..."
              placeholderTextColor="#94a3b8"
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {searching ? (
              <ActivityIndicator size="small" color="#ea580c" />
            ) : query.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setQuery('');
                  setPredictions([]);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color="#94a3b8" strokeWidth={2.4} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Dropdown gợi ý địa chỉ */}
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
                  <MapPin size={15} color="#ea580c" strokeWidth={2.2} />
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

          {predictions.length === 0 && (
            <TouchableOpacity style={styles.currentLocBtn} onPress={locateMe} activeOpacity={0.7} disabled={locating}>
              {locating ? (
                <ActivityIndicator size="small" color="#ea580c" />
              ) : (
                <Crosshair size={16} color="#ea580c" strokeWidth={2.4} />
              )}
              <Text style={styles.currentLocText}>{locating ? 'Đang lấy vị trí...' : 'Sử dụng vị trí hiện tại'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Fixed center pin (Grab-style) */}
        <View style={styles.pinOverlay} pointerEvents="none">
          <View style={styles.pinTooltip}>
            <Text style={styles.pinTooltipText}>Vị trí cứu hộ</Text>
          </View>
          <View style={styles.pinTooltipArrow} />
          <View style={styles.pinHead}>
            <MapPin size={20} color="#ffffff" strokeWidth={2.6} />
          </View>
          <View style={styles.pinStem} />
          <View style={styles.pinShadow} />
        </View>
      </View>

      {/* Bottom confirm card */}
      <View style={styles.bottomCard}>
        <View style={styles.bottomRow}>
          <View style={styles.bottomIcon}>
            <MapPin size={22} color="#ffffff" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bottomTitle}>Xác nhận vị trí</Text>
            {address ? (
              <Text style={styles.bottomDesc} numberOfLines={2}>
                {address}
              </Text>
            ) : (
              <Text style={styles.bottomDesc}>
                Vui lòng kiểm tra lại vị trí ghim trên bản đồ để đảm bảo đội cứu hộ đến chính xác.
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.coordText}>
          Toạ độ: {coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}
        </Text>

        <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} activeOpacity={0.9}>
          <Text style={styles.confirmBtnText}>Xác nhận vị trí</Text>
        </TouchableOpacity>
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

  mapRegion: { flex: 1, position: 'relative' },
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#e5e7eb' },

  /* Top card */
  topCard: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepLabel: { fontSize: 13, fontWeight: '900', color: '#ea580c', letterSpacing: 0.4 },
  stepName: { fontSize: 12.5, fontWeight: '700', color: '#334155' },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#f1f5f9',
    marginTop: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: '#ea580c' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },

  suggestBox: {
    maxHeight: 210,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestMain: { fontSize: 13.5, fontWeight: '700', color: '#0f172a' },
  suggestSub: { fontSize: 11.5, color: '#94a3b8', marginTop: 1 },

  currentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 12,
  },
  currentLocText: { fontSize: 13.5, fontWeight: '800', color: '#ea580c' },

  /* Center pin */
  pinOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  pinTooltip: {
    backgroundColor: '#ea580c',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pinTooltipText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  pinTooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ea580c',
    marginBottom: 4,
  },
  pinHead: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pinStem: { width: 3, height: 14, backgroundColor: '#ea580c' },
  pinShadow: {
    width: 12,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: 1,
  },

  /* Bottom card */
  bottomCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bottomIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  bottomDesc: { fontSize: 12.5, color: '#64748b', lineHeight: 18, marginTop: 3 },
  coordText: { fontSize: 11.5, color: '#94a3b8', marginTop: 12, fontWeight: '600' },
  confirmBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '900', color: '#ffffff', letterSpacing: 0.3 },
});
