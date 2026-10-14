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
  Switch,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import {
  MapPin,
  AlertTriangle,
  Radio,
  LocateFixed,
} from 'lucide-react-native';
import { goongApi } from '../../api/goongApi';
import { GOONG_MAPTILES_KEY } from '../../config/goong';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../contexts/AuthContext';
import { resolveUserAvatar } from '../../utils/avatar';

const { width } = Dimensions.get('window');

const BRAND = '#ea580c';
const GREEN = '#16a34a';
const INK = '#0f172a';
const SUB = '#64748b';

// ── BẢN ĐỒ THẬT GOONG (HIỂN THỊ CHÍNH XÁC VỊ TRÍ GPS HIỆN TẠI) ──
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

  const idleWebRef = useRef<WebView>(null);
  const staffPosRef = useRef<{ lat: number; lng: number } | null>(null);

  // ── DASHBOARD / IDLE STATES ──
  const [isOnline, setIsOnline] = useState(true);
  const [refreshingDashboard, setRefreshingDashboard] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);

  // Vị trí GPS THẬT của thợ
  const [staffPos, setStaffPos] = useState<{ lat: number; lng: number } | null>(null);
  const [myCurrentAddress, setMyCurrentAddress] = useState<string>('Đang định vị vị trí hiện tại của bạn...');

  const [staffData, setStaffData] = useState<any>({
    fullName: user?.fullName || 'NGUYỄN VĂN BÌNH',
    garageName: 'Gara Cứu Hộ',
    todayCompletedJobs: 0,
    todayEarnings: 0,
    walletBalance: 0,
    isOnline: true,
  });

  // Tải dữ liệu thợ từ backend
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

  // ── LẤY VÀ THEO DÕI VỊ TRÍ GPS THỰC TẾ ──
  const initGpsLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsPermissionDenied(true);
        return;
      }
      setGpsPermissionDenied(false);

      // 1. Thử lấy vị trí cache đã biết gần nhất của OS
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

            idleWebRef.current?.injectJavaScript(`window.setMe && window.setMe(${latitude}, ${longitude}); true;`);

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

  // Bản đồ thật: CHỈ TẠO KHI ĐÃ CÓ TOẠ ĐỘ GPS THẬT CỦA THIẾT BỊ
  const idleMapHtml = useMemo(() => {
    if (!staffPos) return null;
    return buildIdleRealMapHtml(staffPos.lat, staffPos.lng);
  }, [staffPos?.lat, staffPos?.lng]);

  const onIdleMapLoadEnd = () => {
    if (staffPosRef.current) {
      const { lat, lng } = staffPosRef.current;
      let js = `window.setMe && window.setMe(${lat}, ${lng});`;
      js += `window.recenter && window.recenter(${lat}, ${lng});`;
      idleWebRef.current?.injectJavaScript(js + ' true;');
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // GIAO DIỆN CHÍNH NHÂN VIÊN: BẢN ĐỒ GOONG THẬT TRỰC TUYẾN TẠI VỊ TRÍ HIỆN TẠI
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

        {/* Cột 2: Trạng thái ca trực */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>TRẠNG THÁI CA TRỰC</Text>
          <Text style={[styles.statsValueRight, { color: isOnline ? '#16a34a' : '#64748b' }]}>
            {isOnline ? 'ĐANG SẴN SÀNG' : 'TẠM NGHỈ'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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

  /* Map Container */
  mapContainer: {
    flex: 1,
    minHeight: 260,
    backgroundColor: '#e2e8f0',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  idleMap: { flex: 1 },
  mapStatusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  mapStatusText: { fontSize: 11.5, fontWeight: '800', color: INK },
  locateBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  locationIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextWrap: { flex: 1 },
  locationLabel: { fontSize: 10.5, fontWeight: '700', color: SUB, textTransform: 'uppercase' },
  locationAddress: { fontSize: 12, fontWeight: '800', color: INK, marginTop: 1 },

  /* Map Loading / GPS Permission Warning */
  mapLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f1f5f9',
  },
  gpsWarningIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mapLoadingTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: INK,
    marginTop: 10,
    textAlign: 'center',
  },
  mapLoadingSub: {
    fontSize: 12,
    color: SUB,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryGpsBtn: {
    marginTop: 14,
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryGpsBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
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
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    fontSize: 14,
    fontWeight: '900',
  },
});
