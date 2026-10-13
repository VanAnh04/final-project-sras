import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  AppState,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { useRouter, useFocusEffect } from "expo-router";
import axiosClient from "../../api/axiosClient";
import { garageApi } from "../../api/garageApi";
import { GOONG_MAPTILES_KEY } from "../../config/goong";
import {
  Power,
  Check,
  Navigation,
  RefreshCw,
  Wrench,
  FileText,
  Users,
  Wallet,
  MoreHorizontal,
  UserRound,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  CheckCircle2,
} from "lucide-react-native";

const DEFAULT = { lat: 16.0678, lng: 108.2208 }; // Đà Nẵng
const DASHBOARD_POLL_MS = 8000;

const formatVnd = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const avatarUri = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "NV")}&background=ea580c&color=ffffff&bold=true&length=1&size=96`;

// Map Goong: marker vị trí gara (xanh dương) + marker nhân viên online (xanh lá).
// Setter khai báo trước khi tải goong-js để inject từ RN không bị mất.
function buildHomeMapHtml(lat: number, lng: number) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet" />
  <style>html, body, #map { height: 100%; margin: 0; padding: 0; background: #e5e7eb; }
  .goongmaps-ctrl-bottom-left, .goongmaps-ctrl-bottom-right { display:none; }</style>
</head>
<body>
  <div id="map"></div>
  <script>
    var __s = { me: null, staff: [], ready: false, sm: [] };
    function rnlog(m){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify({type:'log',message:String(m)})); } }
    window.onerror = function(m){ rnlog('js-error: ' + m); };
    window.setMe = function(la, ln){ __s.me = [ln, la]; window.__apply && window.__apply(); };
    window.setStaff = function(j){ try { __s.staff = JSON.parse(j); } catch(e){ __s.staff = []; } window.__apply && window.__apply(); };
    window.recenter = function(la, ln){ if(window.__map) window.__map.flyTo({ center:[ln, la], zoom:15, duration:600 }); };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <script>
    if (typeof goongjs === 'undefined') { rnlog('goong-js CDN chưa tải được.'); }
    else {
      goongjs.accessToken = '${GOONG_MAPTILES_KEY}';
      var map = new goongjs.Map({ container:'map', style:'https://tiles.goong.io/assets/goong_map_web.json', center:[${lng}, ${lat}], zoom:14 });
      window.__map = map;
      map.on('error', function(e){ rnlog('map lỗi: ' + (e && e.error ? e.error.message : '?')); });
      var meM = null;
      window.__apply = function(){ if(!__s.ready) return;
        if(__s.me){ if(!meM){ meM = new goongjs.Marker({ color:'#2563eb' }).setLngLat(__s.me).addTo(map); } else { meM.setLngLat(__s.me); } }
        __s.sm.forEach(function(m){ m.remove(); }); __s.sm = [];
        __s.staff.forEach(function(p){ if(p && p.lng != null && p.lat != null){ __s.sm.push(new goongjs.Marker({ color:'#16a34a' }).setLngLat([p.lng, p.lat]).addTo(map)); } });
      };
      map.on('load', function(){ __s.ready = true; window.__apply(); setTimeout(function(){ map.resize(); }, 300); });
      window.addEventListener('resize', function(){ map.resize(); });
    }
  </script>
</body>
</html>`;
}

export default function GarageOwnerHomeScreen() {
  const router = useRouter();
  const webRef = useRef<WebView>(null);
  // Chiều cao map tính từ kích thước cửa sổ THẬT (tự cập nhật) — tránh đọc Dimensions sớm ở
  // cấp module khiến map bị co lại khi Fast Refresh / xoay màn.
  const { height: winH } = useWindowDimensions();
  const mapH = Math.round(winH * 0.42);
  const gpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const togglingRef = useRef(false);

  const [isOnline, setIsOnline] = useState(false);
  const [locating, setLocating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [coord, setCoord] = useState(DEFAULT);
  const [dashboardData, setDashboardData] = useState<any>({
    garageName: "",
    isOnline: false,
    todayRevenue: 0,
    revenueGrowthPercent: 0,
    availableStaffCount: 0,
    busyStaffCount: 0,
    activeOrderCount: 0,
    completedOrderCount: 0,
    onlineStaffLocations: [],
    pendingOrders: [],
    recentServices: [],
  });

  const mapHtml = useMemo(() => buildHomeMapHtml(DEFAULT.lat, DEFAULT.lng), []);

  const fetchDashboard = async () => {
    try {
      const res: any = await axiosClient.get("/garages/me/dashboard");
      if (res?.data) {
        setDashboardData(res.data);
        // Không ghi đè trạng thái khi người dùng vừa bấm bật/tắt (tránh nút "nhảy").
        if (!togglingRef.current) setIsOnline(Boolean(res.data.isOnline));
      }
    } catch (e: any) {
      console.warn(
        "Không tải được dashboard gara:",
        e?.response?.status || e?.status,
        e?.response?.data || e?.message
      );
    } finally {
      setRefreshing(false);
    }
  };

  const locateMe = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      gpsRef.current = c;
      setCoord(c);
      webRef.current?.injectJavaScript(
        `window.recenter && window.recenter(${c.lat}, ${c.lng}); true;`,
      );
    } catch {
      /* giữ vị trí mặc định */
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    // Vào trang chủ (sau đăng nhập) gara luôn bắt đầu CHƯA kết nối — phải tự bấm "Bật kết nối",
    // không tự bật sẵn theo trạng thái cũ. Ép offline trước rồi mới nạp dashboard.
    (async () => {
      try {
        await garageApi.setOnline(false);
      } catch {}
      setIsOnline(false);
      fetchDashboard();
    })();
    locateMe();
  }, []);
  // Làm mới dashboard định kỳ chỉ khi đang xem tab này và app ở foreground.
  // Gọi xong mới hẹn lần sau (không chồng request); lần mount đầu đã có fetch ở effect trên.
  const dashboardMountedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const clearTimer = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      };
      const schedule = () => {
        clearTimer();
        timer = setTimeout(async () => {
          await fetchDashboard();
          if (alive && AppState.currentState === "active") schedule();
        }, DASHBOARD_POLL_MS);
      };

      // Quay lại tab từ tab khác thì tải ngay để số liệu không cũ.
      if (dashboardMountedRef.current) fetchDashboard();
      dashboardMountedRef.current = true;
      schedule();

      // App xuống nền thì dừng hẳn; về foreground thì tải ngay rồi tiếp tục vòng gọi.
      const subscription = AppState.addEventListener("change", (state) => {
        clearTimer();
        if (state === "active") {
          fetchDashboard();
          schedule();
        }
      });

      return () => {
        alive = false;
        clearTimer();
        subscription.remove();
      };
    }, []),
  );

  const staff = dashboardData.onlineStaffLocations || [];
  const pending = dashboardData.pendingOrders || [];
  const recents = dashboardData.recentServices || [];
  const growth = Number(dashboardData.revenueGrowthPercent || 0);

  // Marker nhân viên chỉ hiện khi đang bật kết nối.
  const staffPts = useMemo(
    () =>
      isOnline
        ? staff
            .filter((s: any) => s.lat != null && s.lng != null)
            .map((s: any) => ({ lat: s.lat, lng: s.lng }))
        : [],
    [isOnline, staff],
  );

  useEffect(() => {
    webRef.current?.injectJavaScript(
      `window.setMe && window.setMe(${coord.lat}, ${coord.lng}); true;`,
    );
  }, [coord]);
  useEffect(() => {
    webRef.current?.injectJavaScript(
      `window.setStaff && window.setStaff(${JSON.stringify(JSON.stringify(staffPts))}); true;`,
    );
  }, [staffPts]);

  const onMapLoadEnd = () => {
    const c = gpsRef.current || coord;
    let js = `window.setMe && window.setMe(${c.lat}, ${c.lng});`;
    js += `window.setStaff && window.setStaff(${JSON.stringify(JSON.stringify(staffPts))});`;
    js += `window.recenter && window.recenter(${c.lat}, ${c.lng});`;
    js +=
      "setTimeout(function(){ if(window.__map){ window.__map.resize(); } }, 150);";
    webRef.current?.injectJavaScript(js + " true;");
  };

  // Bật/tắt kiểu optimistic: đổi ngay tức thì (không xoay chờ), đồng bộ ngầm.
  const handleToggleOnline = async () => {
    if (togglingRef.current) return;
    const val = !isOnline;
    setIsOnline(val);
    togglingRef.current = true;
    try {
      await axiosClient.put("/garages/me/status", { isOnline: val });
    } catch (e) {
      setIsOnline(!val); // đồng bộ thất bại → trả lại trạng thái cũ
      Alert.alert(
        "Không đổi được trạng thái",
        "Kiểm tra kết nối mạng rồi thử lại.",
      );
    } finally {
      togglingRef.current = false;
    }
  };

  const handleAcceptOrder = (orderId: number) => {
    Alert.alert(
      "Nhận đơn cứu hộ?",
      'Bạn sẽ nhận đơn này, sau đó gán nhân viên & xe ở tab "Đơn cứu hộ".',
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Nhận ngay",
          onPress: async () => {
            try {
              await axiosClient.post(`/rescue-requests/${orderId}/accept`);
              await fetchDashboard();
              Alert.alert(
                "Đã nhận đơn",
                'Vào tab "Đơn cứu hộ" để gán nhân viên & xe cứu hộ.',
              );
            } catch (e: any) {
              Alert.alert(
                "Không nhận được",
                e?.response?.data?.message ||
                  "Đơn có thể đã được gara khác nhận.",
              );
            }
          },
        },
      ],
    );
  };

  const quickActions = [
    {
      key: "orders",
      label: "Đơn cứu hộ",
      Icon: FileText,
      badge: pending.length,
      onPress: () => router.push("/garage-owner/orders"),
    },
    {
      key: "staff",
      label: "Nhân viên",
      Icon: Users,
      badge: 0,
      onPress: () => router.push("/garage-owner/staff"),
    },
    {
      key: "wallet",
      label: "Ví tiền",
      Icon: Wallet,
      badge: 0,
      onPress: () => router.push("/garage-owner/wallet"),
    },
    {
      key: "more",
      label: "Xem thêm",
      Icon: MoreHorizontal,
      badge: 0,
      onPress: () => router.push("/garage-owner/settings"),
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.brandAvatar}>
              <Wrench size={18} color="#ea580c" strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>Xin chào 👋</Text>
              <Text style={styles.garageName} numberOfLines={1}>
                {dashboardData.garageName || "Garage của bạn"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push("/garage-owner/settings")}
            activeOpacity={0.85}
          >
            <View style={styles.profileIcon}>
              <UserRound size={17} color="#ea580c" strokeWidth={2.4} />
            </View>
            <Text style={styles.profileText}>Hồ sơ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1 }}>
        {/* MAP */}
        <View style={[styles.mapWrap, { height: mapH }]}>
          <WebView
            ref={webRef}
            originWhitelist={["*"]}
            source={{ html: mapHtml, baseUrl: "https://cdn.jsdelivr.net/" }}
            style={styles.map}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            mixedContentMode="always"
            setSupportMultipleWindows={false}
            onMessage={(e) => {
              try {
                const d = JSON.parse(e.nativeEvent.data);
                if (d?.type === "log") console.log("[home-map]", d.message);
              } catch {}
            }}
            onLoadEnd={onMapLoadEnd}
            androidLayerType={
              Platform.OS === "android" ? "hardware" : undefined
            }
          />

          {/* Floating map controls */}
          <View style={styles.mapControls}>
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={locateMe}
              activeOpacity={0.85}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#ea580c" />
              ) : (
                <Navigation size={19} color="#334155" strokeWidth={2.3} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => {
                setRefreshing(true);
                fetchDashboard();
              }}
              activeOpacity={0.85}
            >
              <RefreshCw size={18} color="#334155" strokeWidth={2.3} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Nút Bật/Tắt kết nối nổi hẳn trên map (kiểu Grab) */}
        <View
          style={[styles.goWrap, { top: mapH - 80 }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={[styles.goBtn, isOnline && styles.goBtnOn]}
            onPress={handleToggleOnline}
            activeOpacity={0.9}
          >
            {isOnline ? (
              <Check size={19} color="#ffffff" strokeWidth={3} />
            ) : (
              <Power size={19} color="#ffffff" strokeWidth={2.7} />
            )}
            <Text style={styles.goBtnText}>
              {isOnline ? "Đã kết nối" : "Bật kết nối"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* PANEL */}
        <View style={styles.panel}>
          <ScrollView
            contentContainerStyle={styles.panelBody}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchDashboard();
                }}
                colors={["#ea580c"]}
                tintColor="#ea580c"
                progressViewOffset={40}
              />
            }
          >
            {/* Quick actions */}
            <View style={styles.quickCard}>
              {quickActions.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  style={styles.quickItem}
                  activeOpacity={0.8}
                  onPress={a.onPress}
                >
                  <View style={styles.quickIcon}>
                    <a.Icon size={22} color="#ea580c" strokeWidth={2.2} />
                    {a.badge > 0 && (
                      <View style={styles.quickBadge}>
                        <Text style={styles.quickBadgeText}>{a.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.quickLabel}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Revenue + stats */}
            <View style={styles.revenueCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.revenueLabel}>DOANH THU HÔM NAY</Text>
                <Text style={styles.revenueValue}>
                  {formatVnd(Number(dashboardData.todayRevenue || 0))}
                  <Text style={styles.revenueUnit}> đ</Text>
                </Text>
              </View>
              <View
                style={[
                  styles.growthChip,
                  growth >= 0 ? styles.growthUp : styles.growthDown,
                ]}
              >
                {growth >= 0 ? (
                  <TrendingUp size={13} color="#16a34a" strokeWidth={2.6} />
                ) : (
                  <TrendingDown size={13} color="#dc2626" strokeWidth={2.6} />
                )}
                <Text
                  style={[
                    styles.growthText,
                    { color: growth >= 0 ? "#16a34a" : "#dc2626" },
                  ]}
                >
                  {growth >= 0 ? "+" : ""}
                  {growth}%
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatTile
                Icon={ClipboardList}
                tint="#0284c7"
                bg="#f0f9ff"
                value={dashboardData.activeOrderCount || 0}
                label="Đang xử lý"
              />
              <StatTile
                Icon={CheckCircle2}
                tint="#16a34a"
                bg="#f0fdf4"
                value={dashboardData.completedOrderCount || 0}
                label="Đã hoàn thành"
              />
              <StatTile
                Icon={Users}
                tint="#ea580c"
                bg="#fff7ed"
                value={dashboardData.availableStaffCount || 0}
                label="NV sẵn sàng"
              />
            </View>

            {/* Đơn chờ */}
            <SectionHeader
              title="Đơn cứu hộ đang chờ"
              badge={
                pending.length > 0 ? `${pending.length} đơn mới` : undefined
              }
              badgeUrgent
            />
            {pending.length === 0 ? (
              <EmptyCard
                text={
                  isOnline
                    ? "Chưa có đơn nào đang chờ. Hệ thống đang tìm khách quanh bạn."
                    : "Bật kết nối để bắt đầu nhận yêu cầu cứu hộ."
                }
              />
            ) : (
              <View style={{ gap: 12 }}>
                {pending.map((order: any) => (
                  <View key={order.id} style={styles.orderCard}>
                    <View
                      style={[
                        styles.orderStripe,
                        {
                          backgroundColor: order.isUrgent
                            ? "#dc2626"
                            : "#0284c7",
                        },
                      ]}
                    />
                    <View style={{ flex: 1, gap: 8 }}>
                      <View style={styles.orderTop}>
                        <View
                          style={[
                            styles.orderTag,
                            {
                              backgroundColor: order.isUrgent
                                ? "#fee2e2"
                                : "#eff6ff",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.orderTagText,
                              { color: order.isUrgent ? "#dc2626" : "#2563eb" },
                            ]}
                          >
                            {order.isUrgent ? "🔴 " : ""}
                            {order.orderType}
                          </Text>
                        </View>
                        <Text style={styles.orderTime}>{order.timeAgo}</Text>
                      </View>
                      <Text style={styles.orderVehicle} numberOfLines={1}>
                        {order.customerVehicle}
                      </Text>
                      <Text style={styles.orderIssue} numberOfLines={2}>
                        {order.issueDescription}
                      </Text>
                      <View style={styles.orderActions}>
                        <TouchableOpacity
                          style={styles.detailBtn}
                          activeOpacity={0.8}
                          onPress={() =>
                            Alert.alert(
                              "Chi tiết đơn cứu hộ",
                              `${order.customerVehicle}\nSự cố: ${order.issueDescription}\nThời gian: ${order.timeAgo}`,
                            )
                          }
                        >
                          <Text style={styles.detailBtnText}>Xem chi tiết</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.acceptBtn}
                          activeOpacity={0.9}
                          onPress={() => handleAcceptOrder(order.id)}
                        >
                          <Text style={styles.acceptBtnText}>
                            Nhận đơn cứu hộ
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Đội trực ca */}
            <SectionHeader
              title="Đội cứu hộ trực ca"
              badge={`${staff.length} nhân viên`}
            />
            {staff.length === 0 ? (
              <EmptyCard text="Chưa có nhân viên nào. Thêm nhân viên khi gán đơn cứu hộ." />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.staffScroll}
              >
                {staff.map((s: any) => (
                  <View key={s.id} style={styles.staffCard}>
                    <View
                      style={[
                        styles.staffAvatarRing,
                        { borderColor: s.isAvailable ? "#4ade80" : "#fb923c" },
                      ]}
                    >
                      <Image
                        source={{ uri: avatarUri(s.name) }}
                        style={styles.staffAvatar}
                        contentFit="cover"
                        transition={200}
                      />
                    </View>
                    <Text style={styles.staffName} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <View
                      style={[
                        styles.staffStatus,
                        {
                          backgroundColor: s.isAvailable
                            ? "#f0fdf4"
                            : "#fff7ed",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.staffStatusText,
                          { color: s.isAvailable ? "#16a34a" : "#ea580c" },
                        ]}
                      >
                        {s.isAvailable ? "Sẵn sàng" : "Đang cứu hộ"}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Lịch sử gần đây */}
            <SectionHeader title="Lịch sử dịch vụ gần đây" />
            {recents.length === 0 ? (
              <EmptyCard text="Chưa có đơn cứu hộ hoàn thành nào." />
            ) : (
              <View style={styles.historyCard}>
                {recents.map((item: any, i: number) => (
                  <View
                    key={item.id}
                    style={[
                      styles.historyItem,
                      i < recents.length - 1 && styles.historyDivider,
                    ]}
                  >
                    <View style={styles.historyIcon}>
                      <Wrench size={17} color="#ea580c" strokeWidth={2.3} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyName} numberOfLines={1}>
                        {item.serviceName}
                      </Text>
                      <Text style={styles.historyMeta} numberOfLines={1}>
                        {item.licensePlate ? `${item.licensePlate} · ` : ""}KTV:{" "}
                        {item.technicianName || "—"}
                      </Text>
                    </View>
                    <Text style={styles.historyStatus}>{item.status}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

function StatTile({
  Icon,
  tint,
  bg,
  value,
  label,
}: {
  Icon: any;
  tint: string;
  bg: string;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Icon size={16} color={tint} strokeWidth={2.4} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function SectionHeader({
  title,
  badge,
  badgeUrgent,
}: {
  title: string;
  badge?: string;
  badgeUrgent?: boolean;
}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {badge ? (
        <View
          style={[
            styles.sectionBadge,
            badgeUrgent && styles.sectionBadgeUrgent,
          ]}
        >
          <Text
            style={[
              styles.sectionBadgeText,
              badgeUrgent && styles.sectionBadgeTextUrgent,
            ]}
          >
            {badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffffff" },

  headerSafe: { backgroundColor: "#ffffff", zIndex: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    flex: 1,
    marginRight: 10,
  },
  brandAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ffedd5",
  },
  hello: { fontSize: 11.5, color: "#94a3b8", fontWeight: "600" },
  garageName: {
    fontSize: 15.5,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.3,
    marginTop: 1,
  },
  profileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingLeft: 5,
    paddingRight: 12,
    paddingVertical: 5,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#eef1f5",
  },
  profileIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  profileText: { fontSize: 12.5, fontWeight: "800", color: "#334155" },

  // Map
  mapWrap: { backgroundColor: "#e5e7eb" },
  map: { flex: 1, backgroundColor: "#e5e7eb" },
  mapControls: { position: "absolute", right: 14, bottom: 46, gap: 10 },
  mapBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 5,
  },

  // Go online button
  goWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 30,
  },
  goBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 26,
    height: 52,
    borderRadius: 26,
    minWidth: 200,
    backgroundColor: "#ea580c",
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.36,
    shadowRadius: 12,
    elevation: 9,
  },
  goBtnOn: {
    // Đã kết nối: cùng màu cam #ea580c như lúc "Bật kết nối", chỉ khác viền + chữ/icon.
    backgroundColor: "#ea580c",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
  },
  goBtnText: {
    fontSize: 14.5,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.2,
  },

  // Panel
  panel: {
    flex: 1,
    backgroundColor: "#f6f7f9",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -22,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 12,
  },
  panelBody: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 15,
  },

  quickCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#eef1f5",
  },
  quickItem: { flex: 1, alignItems: "center", gap: 8 },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  quickBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  quickBadgeText: { fontSize: 10.5, fontWeight: "900", color: "#ffffff" },
  quickLabel: { fontSize: 11.5, fontWeight: "700", color: "#334155" },

  revenueCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#eef1f5",
  },
  revenueLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.6,
  },
  revenueValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.8,
    marginTop: 5,
  },
  revenueUnit: { fontSize: 15, fontWeight: "800", color: "#94a3b8" },
  growthChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  growthUp: { backgroundColor: "#f0fdf4" },
  growthDown: { backgroundColor: "#fef2f2" },
  growthText: { fontSize: 13, fontWeight: "900" },

  statsRow: { flexDirection: "row", gap: 12 },
  statTile: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#eef1f5",
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 21,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
  },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  sectionBadge: {
    backgroundColor: "#fff7ed",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sectionBadgeUrgent: { backgroundColor: "#fee2e2" },
  sectionBadgeText: { fontSize: 11, fontWeight: "800", color: "#ea580c" },
  sectionBadgeTextUrgent: { color: "#dc2626" },

  orderCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eef1f5",
  },
  orderStripe: { width: 4, borderRadius: 2, alignSelf: "stretch" },
  orderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderTag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  orderTagText: { fontSize: 11, fontWeight: "900" },
  orderTime: { fontSize: 11.5, color: "#94a3b8", fontWeight: "700" },
  orderVehicle: { fontSize: 15, fontWeight: "900", color: "#0f172a" },
  orderIssue: { fontSize: 12.5, color: "#475569", lineHeight: 18 },
  orderActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  detailBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  detailBtnText: { fontSize: 12.5, fontWeight: "800", color: "#475569" },
  acceptBtn: {
    flex: 1.5,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#ea580c",
    alignItems: "center",
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  acceptBtnText: { fontSize: 12.5, fontWeight: "900", color: "#ffffff" },

  staffScroll: { gap: 12, paddingRight: 4 },
  staffCard: {
    width: 108,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#eef1f5",
  },
  staffAvatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  staffAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e9eef4",
  },
  staffName: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  staffStatus: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  staffStatusText: { fontSize: 10.5, fontWeight: "800" },

  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#eef1f5",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },
  historyDivider: { borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  historyIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  historyName: { fontSize: 13.5, fontWeight: "800", color: "#0f172a" },
  historyMeta: {
    fontSize: 11.5,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  historyStatus: { fontSize: 11, color: "#16a34a", fontWeight: "800" },

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#eef1f5",
  },
  emptyText: {
    fontSize: 12.5,
    color: "#94a3b8",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
});
