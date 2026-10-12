import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Search, Crosshair, MapPin, X, Check } from 'lucide-react-native';
import * as Location from 'expo-location';
import { GOONG_MAPTILES_KEY } from '../config/goong';
import { goongApi, GoongPrediction } from '../api/goongApi';

export interface PickedLocation {
  lat: number;
  lng: number;
  address: string;
}

interface Props {
  visible: boolean;
  title?: string;
  /** Vị trí khởi tạo (nếu đã chọn trước đó). Mặc định TP.HCM. */
  initial?: { lat: number; lng: number } | null;
  onClose: () => void;
  onConfirm: (loc: PickedLocation) => void;
}

const DEFAULT = { lat: 10.776, lng: 106.7009 };

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
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <script>
    function rnlog(m){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify({type:'log',message:String(m)})); } }
    window.onerror = function(m){ rnlog('js-error: ' + m); };
    if (typeof goongjs === 'undefined') {
      rnlog('goong-js CDN chưa tải được.');
    } else {
      goongjs.accessToken = '${GOONG_MAPTILES_KEY}';
      var map = new goongjs.Map({
        container: 'map',
        style: 'https://tiles.goong.io/assets/goong_map_web.json',
        center: [${lng}, ${lat}],
        zoom: 16,
      });
      window.__map = map;
      window.__mapLoaded = false;
      map.on('error', function(e){ rnlog('map lỗi: ' + (e && e.error ? e.error.message : '?')); });
      function send(){
        var c = map.getCenter();
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ lat: c.lat, lng: c.lng }));
      }
      map.on('moveend', send);
      map.on('load', function(){
        window.__mapLoaded = true;
        send();
        setTimeout(function(){ map.resize(); }, 300);
        if (window.__pendingRecenter) {
          map.flyTo({ center: [window.__pendingRecenter.lng, window.__pendingRecenter.lat], zoom: 17 });
          window.__pendingRecenter = null;
        }
      });
      window.recenter = function(la, ln){
        if (window.__mapLoaded) {
          map.flyTo({ center: [ln, la], zoom: 17 });
        } else {
          window.__pendingRecenter = { lat: la, lng: ln };
        }
      };
    }
  </script>
</body>
</html>`;
}

export default function LocationPickerModal({ visible, title, initial, onClose, onConfirm }: Props) {
  const webRef = useRef<WebView>(null);
  const start = initial ?? DEFAULT;
  const [coord, setCoord] = useState({ lat: start.lat, lng: start.lng });
  const [address, setAddress] = useState('');
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<GoongPrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  const acTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rvTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAc = useRef(false);
  const skipNextReverse = useRef(false);

  const locateCurrent = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền vị trí', 'Vui lòng cấp quyền truy cập vị trí để ứng dụng định vị vị trí hiện tại của bạn.');
        return;
      }

      // 1. Lấy vị trí đã biết gần nhất tức thì (0ms)
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        const la = last.coords.latitude;
        const ln = last.coords.longitude;
        setCoord({ lat: la, lng: ln });
        skipNextReverse.current = false;
        reverseFor(la, ln);
        webRef.current?.injectJavaScript(`window.recenter && window.recenter(${la}, ${ln}); true;`);
      }

      // 2. Lấy vị trí GPS tươi chính xác
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (pos) {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoord({ lat, lng });
        skipNextReverse.current = false;
        reverseFor(lat, lng);
        webRef.current?.injectJavaScript(`window.recenter && window.recenter(${lat}, ${lng}); true;`);
      }
    } catch (e) {
      console.log('Lỗi định vị GPS:', e);
    } finally {
      setLocating(false);
    }
  };

  // Reset khi mở lại modal. Nếu chưa có vị trí trước đó → lấy GPS thật của thiết bị.
  useEffect(() => {
    if (!visible) return;
    const s = initial ?? DEFAULT;
    setCoord({ lat: s.lat, lng: s.lng });
    setAddress('');
    setQuery('');
    setPredictions([]);
    if (initial) {
      reverseFor(initial.lat, initial.lng);
      webRef.current?.injectJavaScript(`window.recenter && window.recenter(${initial.lat}, ${initial.lng}); true;`);
      return;
    }
    // Mặc định luôn định vị GPS hiện tại ngay khi mở modal
    locateCurrent();
  }, [visible]);

  // Autocomplete (debounce 350ms).
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
      } catch {}
    }, 600);
  };

  const onMessage = (e: any) => {
    try {
      const d = JSON.parse(e.nativeEvent.data);
      if (d.type === 'log') {
        console.log('[picker-map]', d.message);
        return;
      }
      if (typeof d.lat === 'number' && typeof d.lng === 'number') {
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
        skipNextReverse.current = true;
        setCoord({ lat: place.lat, lng: place.lng });
        setAddress(place.address || p.description);
        webRef.current?.injectJavaScript(`window.recenter(${place.lat}, ${place.lng}); true;`);
      }
    } catch {}
  };

  const confirm = () => {
    onConfirm({ lat: coord.lat, lng: coord.lng, address });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color="#0f172a" strokeWidth={2.4} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title ?? 'Chọn vị trí gara'}</Text>
            <View style={styles.iconBtn} />
          </View>
        </SafeAreaView>

        <View style={styles.mapRegion}>
          <WebView
            ref={webRef}
            originWhitelist={['*']}
            source={{ html: buildMapHtml(start.lat, start.lng), baseUrl: 'https://cdn.jsdelivr.net/' }}
            style={styles.map}
            javaScriptEnabled
            domStorageEnabled
            onMessage={onMessage}
            startInLoadingState
            mixedContentMode="always"
            setSupportMultipleWindows={false}
            androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
          />

          <View style={styles.topCard}>
            <View style={styles.searchBar}>
              <Search size={18} color="#94a3b8" strokeWidth={2.2} />
              <TextInput
                placeholder="Tìm địa chỉ gara..."
                placeholderTextColor="#94a3b8"
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
                returnKeyType="search"
              />
              {searching ? (
                <ActivityIndicator size="small" color="#ea580c" />
              ) : query.length > 0 ? (
                <TouchableOpacity onPress={() => { setQuery(''); setPredictions([]); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={16} color="#94a3b8" strokeWidth={2.4} />
                </TouchableOpacity>
              ) : null}
            </View>

            {predictions.length > 0 && (
              <ScrollView style={styles.suggestBox} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {predictions.map((p) => (
                  <TouchableOpacity key={p.placeId} style={styles.suggestRow} onPress={() => onSelectPrediction(p)} activeOpacity={0.7}>
                    <MapPin size={15} color="#ea580c" strokeWidth={2.2} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestMain} numberOfLines={1}>{p.mainText}</Text>
                      {!!p.secondaryText && <Text style={styles.suggestSub} numberOfLines={1}>{p.secondaryText}</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.pinOverlay} pointerEvents="none">
            <View style={styles.pinHead}>
              <MapPin size={20} color="#ffffff" strokeWidth={2.6} />
            </View>
            <View style={styles.pinStem} />
          </View>

          {/* Nút định vị GPS vị trí hiện tại */}
          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={locateCurrent}
            activeOpacity={0.8}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#ea580c" />
            ) : (
              <Crosshair size={22} color="#ea580c" strokeWidth={2.4} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomCard}>
          <Text style={styles.addrText} numberOfLines={2}>
            {address || 'Kéo bản đồ để đặt ghim đúng vị trí gara của bạn.'}
          </Text>
          <Text style={styles.coordText}>Toạ độ: {coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}</Text>
          <TouchableOpacity style={styles.confirmBtn} onPress={confirm} activeOpacity={0.9}>
            <Check size={18} color="#ffffff" strokeWidth={2.6} />
            <Text style={styles.confirmBtnText}>Xác nhận vị trí này</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  headerSafe: { backgroundColor: '#ffffff', zIndex: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },

  mapRegion: { flex: 1, position: 'relative' },
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#e5e7eb' },

  topCard: {
    position: 'absolute', top: 12, left: 16, right: 16, backgroundColor: '#ffffff', borderRadius: 16, padding: 12,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 12, elevation: 6,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  suggestBox: { maxHeight: 210, marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#ffffff' },
  suggestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  suggestMain: { fontSize: 13.5, fontWeight: '700', color: '#0f172a' },
  suggestSub: { fontSize: 11.5, color: '#94a3b8', marginTop: 1 },

  pinOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', marginBottom: 34 },
  pinHead: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  pinStem: { width: 3, height: 14, backgroundColor: '#ea580c' },

  bottomCard: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 26,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  addrText: { fontSize: 13.5, fontWeight: '700', color: '#0f172a', lineHeight: 19 },
  coordText: { fontSize: 11.5, color: '#94a3b8', marginTop: 6, fontWeight: '600' },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ea580c', borderRadius: 14, paddingVertical: 15, marginTop: 14,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '900', color: '#ffffff', letterSpacing: 0.3 },
  gpsBtn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
});
