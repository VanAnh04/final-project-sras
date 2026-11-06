import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import {
  X,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Check,
  Timer,
  Navigation,
  Route as RouteIcon,
  Coins,
  Send,
  Star,
  Camera,
  Maximize2,
  User as UserIcon,
  Truck,
  Lock,
} from 'lucide-react-native';
import { resolveFileUrl } from '../api/axiosClient';
import { garageApi, GarageStaffDto, RescueVehicleDto } from '../api/garageApi';
import { RescueRequestDto } from '../api/rescueApi';
import { resolveRescueFee, formatVnd } from '../utils/rescueFee';
import { GOONG_MAPTILES_KEY } from '../config/goong';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const VEHICLE_LABEL: Record<string, string> = { CAR: 'Ô tô', MOTORBIKE: 'Xe máy' };
const KINDS: Record<string, string> = { TOW_TRUCK: 'Xe kéo', MOTORBIKE: 'Xe máy', VAN: 'Xe tải nhỏ' };
const isBusy = (s?: string) => s === 'BUSY';
const isStaffReady = (s?: GarageStaffDto | null): boolean =>
  Boolean(s && s.status === 'FREE' && s.isActive !== false);
const isVehicleReady = (v?: RescueVehicleDto | null): boolean =>
  Boolean(v && v.status === 'FREE' && v.isActive !== false);

const customerPhoto = (name?: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'KH')}&background=e2e8f0&color=475569&bold=true&length=1&size=128`;
const staffPhoto = (s: GarageStaffDto) =>
  s.avatarUrl && s.avatarUrl.trim()
    ? resolveFileUrl(s.avatarUrl)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fullName || s.name || 'NV')}&background=ea580c&color=ffffff&bold=true&length=1&size=96`;
const VEH_KEYWORDS: Record<string, string> = { TOW_TRUCK: 'tow,truck', MOTORBIKE: 'motorbike', VAN: 'van,vehicle' };
const vehiclePhoto = (v: RescueVehicleDto) =>
  v.imageUrl && v.imageUrl.trim()
    ? resolveFileUrl(v.imageUrl)
    : `https://loremflickr.com/160/160/${VEH_KEYWORDS[v.vehicleKind || ''] || 'truck'}?lock=${v.id}`;

const fmtDateTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}, ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// Bản đồ Goong (goong-js) — 1 marker cam tại vị trí khách cần cứu hộ.
function buildOfferMapHtml(lat: number, lng: number) {
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
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <script>
    function rnlog(m){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify({type:'log',message:String(m)})); } }
    window.onerror = function(m){ rnlog('js-error: ' + m); };
    if (typeof goongjs === 'undefined') { rnlog('goong-js CDN chưa tải được.'); }
    else {
      goongjs.accessToken = '${GOONG_MAPTILES_KEY}';
      var map = new goongjs.Map({ container:'map', style:'https://tiles.goong.io/assets/goong_map_web.json', center:[${lng}, ${lat}], zoom:15 });
      map.on('error', function(e){ rnlog('map lỗi: ' + (e && e.error ? e.error.message : '?')); });
      map.on('load', function(){
        new goongjs.Marker({ color:'#ea580c' }).setLngLat([${lng}, ${lat}]).addTo(map);
        setTimeout(function(){ map.resize(); }, 300);
      });
    }
  </script>
</body>
</html>`;
}

interface Props {
  visible: boolean;
  request: RescueRequestDto | null;
  onClose: () => void;
  /** Chủ gara từ chối cuốc. */
  onDecline: () => void;
  /** Đã gửi cứu hộ (nhận + gán nhân viên/xe) thành công. */
  onDispatched: (updated: RescueRequestDto) => void;
}

export default function RescueOfferDetailModal({ visible, request, onClose, onDecline, onDispatched }: Props) {
  const router = useRouter();
  const [staff, setStaff] = useState<GarageStaffDto[]>([]);
  const [vehicles, setVehicles] = useState<RescueVehicleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selStaff, setSelStaff] = useState<number | null>(null);
  const [selVehicle, setSelVehicle] = useState<number | null>(null);
  const [openStaff, setOpenStaff] = useState(false);
  const [openVehicle, setOpenVehicle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSelStaff(null);
    setSelVehicle(null);
    setOpenStaff(false);
    setOpenVehicle(false);
    setLoading(true);
    (async () => {
      try {
        const [s, v] = await Promise.all([garageApi.listStaff(), garageApi.listVehicles()]);
        setStaff(s);
        setVehicles(v);
      } catch {
        setStaff([]);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const anim = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  const chosenStaff = useMemo(() => staff.find((s) => s.id === selStaff) || null, [staff, selStaff]);
  const chosenVehicle = useMemo(() => vehicles.find((v) => v.id === selVehicle) || null, [vehicles, selVehicle]);
  const readyStaffCount = useMemo(() => staff.filter(isStaffReady).length, [staff]);
  const readyVehicleCount = useMemo(() => vehicles.filter(isVehicleReady).length, [vehicles]);

  const canSubmit =
    !busy &&
    request != null &&
    selStaff != null &&
    selVehicle != null &&
    chosenStaff != null &&
    isStaffReady(chosenStaff) &&
    chosenVehicle != null &&
    isVehicleReady(chosenVehicle);

  const dist = request?.dispatchDistanceKm ?? null;
  const etaMin = dist != null ? Math.max(5, Math.round(dist * 3)) : null;
  const fee = resolveRescueFee(request);

  const mapHtml = useMemo(
    () => (request?.pickupLat != null && request?.pickupLng != null
      ? buildOfferMapHtml(request.pickupLat, request.pickupLng)
      : null),
    [request?.pickupLat, request?.pickupLng]
  );

  const phone = request?.customer?.phone;
  const callCustomer = () => phone && Linking.openURL(`tel:${phone}`);
  const messageCustomer = () => phone && Linking.openURL(`sms:${phone}`);
  const openMaps = () => {
    if (request?.pickupLat != null && request?.pickupLng != null) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${request.pickupLat},${request.pickupLng}`);
    }
  };

  const decline = async () => {
    if (!request) return;
    try {
      setBusy(true);
      await garageApi.decline(request.id);
      onDecline();
    } catch (e: any) {
      Alert.alert('Không từ chối được', e?.response?.data?.message || 'Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!request || selStaff == null || selVehicle == null) {
      Alert.alert('Chưa đủ thông tin', 'Chọn 1 nhân viên và 1 xe cứu hộ trước khi gửi.');
      return;
    }
    if (!chosenStaff || !isStaffReady(chosenStaff)) {
      Alert.alert('Nhân viên không sẵn sàng', 'Chỉ được gán nhân viên đang ở trạng thái sẵn sàng.');
      return;
    }
    if (!chosenVehicle || !isVehicleReady(chosenVehicle)) {
      Alert.alert('Xe cứu hộ không sẵn sàng', 'Chỉ được gán xe cứu hộ đang ở trạng thái sẵn sàng.');
      return;
    }
    try {
      setBusy(true);
      await garageApi.accept(request.id);
      const updated = await garageApi.assignStaff(request.id, selStaff, selVehicle);
      onDispatched(updated);
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Đơn có thể đã được gara khác nhận.';
      if (msg.includes('500.000') || msg.toLowerCase().includes('ví tín dụng')) {
        Alert.alert('Số dư ví không đủ', msg, [
          { text: 'Đóng', style: 'cancel' },
          {
            text: 'Nạp tiền ngay',
            onPress: () => {
              onClose();
              router.push('/garage-owner/wallet' as any);
            },
          },
        ]);
      } else {
        Alert.alert('Không gửi được cứu hộ', msg);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!request) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Yêu cầu cứu hộ</Text>
            <Text style={styles.subhead}>
              {request.code}
              {request.createdAt ? `  ·  ${fmtDateTime(request.createdAt)}` : ''}
            </Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>Chờ xử lý</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={19} color="#64748b" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {/* Bản đồ vị trí khách cần cứu hộ */}
        {mapHtml && (
          <View style={styles.mapWrap}>
            <WebView
              originWhitelist={['*']}
              source={{ html: mapHtml, baseUrl: 'https://cdn.jsdelivr.net/' }}
              style={styles.map}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              mixedContentMode="always"
              setSupportMultipleWindows={false}
              onMessage={(e) => { try { const d = JSON.parse(e.nativeEvent.data); if (d?.type === 'log') console.log('[offer-map]', d.message); } catch {} }}
              androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
            />
            {dist != null && (
              <View style={styles.mapDistPill}>
                <RouteIcon size={13} color="#ea580c" strokeWidth={2.5} />
                <Text style={styles.mapDistText}>Cách gara {dist.toFixed(1)} km</Text>
              </View>
            )}
            {request.pickupLat != null && (
              <TouchableOpacity style={styles.mapDirBtn} onPress={openMaps} activeOpacity={0.85}>
                <Navigation size={17} color="#ea580c" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {/* Người đặt cứu hộ */}
          <View style={styles.customerCard}>
            <Image source={{ uri: customerPhoto(request.customer?.name) }} style={styles.custAvatar} contentFit="cover" transition={150} />
            <View style={{ flex: 1 }}>
              <Text style={styles.custName} numberOfLines={1}>{request.customer?.name || 'Khách hàng'}</Text>
              <Text style={styles.custSub} numberOfLines={1}>
                {VEHICLE_LABEL[request.vehicleType] || request.vehicleType}
                {phone ? `  ·  ${phone}` : ''}
              </Text>
            </View>
            {!!phone && (
              <View style={styles.custActions}>
                <TouchableOpacity style={styles.msgBtn} onPress={messageCustomer} activeOpacity={0.8}>
                  <MessageCircle size={19} color="#0f172a" strokeWidth={2.2} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.callBtn} onPress={callCustomer} activeOpacity={0.85}>
                  <Phone size={19} color="#ffffff" strokeWidth={2.3} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Thông tin sự cố */}
          <View style={styles.card}>
            <View style={styles.sectionRow}>
              <AlertTriangle size={16} color="#ea580c" strokeWidth={2.4} />
              <Text style={styles.sectionTitle}>Thông tin sự cố</Text>
            </View>
            <Text style={styles.symptom}>{request.symptom || 'Không có mô tả'}</Text>

            {/* Ảnh khách gửi — để gara biết xe gì / hư gì mà mang đúng thiết bị */}
            <View style={styles.photoBlock}>
              <View style={styles.photoHead}>
                <Camera size={14} color="#64748b" strokeWidth={2.3} />
                <Text style={styles.photoHeadText}>Ảnh hiện trường khách gửi</Text>
                {!!request.photos?.length && <Text style={styles.photoCount}>{request.photos.length}</Text>}
              </View>

              {request.photos && request.photos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                  {request.photos.map((uri, i) => (
                    <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => setViewer(uri)}>
                      <Image source={{ uri }} style={styles.photo} contentFit="cover" transition={180} />
                      <View style={styles.photoZoom}>
                        <Maximize2 size={13} color="#ffffff" strokeWidth={2.6} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noPhoto}>
                  <Camera size={18} color="#cbd5e1" strokeWidth={2} />
                  <Text style={styles.noPhotoText}>Khách chưa gửi ảnh hiện trường</Text>
                </View>
              )}
            </View>

            {!!(request.pickupAddress || request.locationNote) && (
              <TouchableOpacity
                style={styles.locationRow}
                onPress={openMaps}
                activeOpacity={request.pickupLat != null ? 0.7 : 1}
                disabled={request.pickupLat == null}
              >
                <View style={styles.locationIcon}>
                  <MapPin size={16} color="#ea580c" strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationLabel}>Vị trí khách hàng</Text>
                  <Text style={styles.locationValue} numberOfLines={2}>{request.pickupAddress || request.locationNote}</Text>
                </View>
                {request.pickupLat != null && <ChevronRight size={18} color="#cbd5e1" strokeWidth={2.4} />}
              </TouchableOpacity>
            )}

            <View style={styles.metaGrid}>
              {!!request.createdAt && (
                <View style={styles.metaMini}>
                  <Clock size={14} color="#94a3b8" strokeWidth={2.3} />
                  <Text style={styles.metaMiniText}>{fmtDateTime(request.createdAt)}</Text>
                </View>
              )}
              {dist != null && (
                <View style={styles.metaMini}>
                  <RouteIcon size={14} color="#94a3b8" strokeWidth={2.3} />
                  <Text style={styles.metaMiniText}>Cách gara {dist.toFixed(1)} km</Text>
                </View>
              )}
              <View style={styles.metaMini}>
                <Coins size={14} color="#ea580c" strokeWidth={2.3} />
                <Text style={[styles.metaMiniText, { color: '#ea580c', fontWeight: '700' }]}>
                  Phí di chuyển: {formatVnd(resolveRescueFee(request))}
                </Text>
              </View>
            </View>
          </View>

          {/* Gán nhân viên */}
          <View style={styles.assignHead}>
            <UserIcon size={16} color="#ea580c" strokeWidth={2.4} />
            <Text style={styles.assignLabel}>Gán nhân viên cứu hộ</Text>
            {staff.length > 0 && (
              <Text style={styles.assignCount}>({readyStaffCount}/{staff.length} sẵn sàng)</Text>
            )}
          </View>
          <Dropdown
            open={openStaff}
            onToggle={() => { anim(); setOpenStaff((p) => !p); setOpenVehicle(false); }}
            placeholder="Chọn nhân viên cứu hộ"
            loading={loading}
            empty={!loading && staff.length === 0}
            emptyText="Chưa có nhân viên. Thêm ở tab Nhân viên."
            selected={chosenStaff && (
              <View style={styles.selRow}>
                <View style={styles.avatarWrap}>
                  <Image source={{ uri: staffPhoto(chosenStaff) }} style={styles.selAvatar} contentFit="cover" transition={150} />
                  <View style={[styles.statusDot, isStaffReady(chosenStaff) ? styles.statusDotFree : styles.statusDotBusy]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selName} numberOfLines={1}>
                    {chosenStaff.fullName || chosenStaff.name || 'Kỹ thuật viên'}
                  </Text>
                  <View style={styles.selMeta}>
                    <StaffRating rating={chosenStaff.rating} count={chosenStaff.ratingCount} />
                    {chosenStaff.staffCode ? (
                      <>
                        <Text style={styles.metaDot}>·</Text>
                        <Text style={styles.selSub} numberOfLines={1}>Mã: {chosenStaff.staffCode}</Text>
                      </>
                    ) : null}
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.selSub} numberOfLines={1}>{chosenStaff.phone}</Text>
                  </View>
                </View>
                <AvailPill busy={!isStaffReady(chosenStaff)} inactive={chosenStaff.isActive === false} />
              </View>
            )}
          >
            {readyStaffCount === 0 && staff.length > 0 && (
              <View style={styles.warnBanner}>
                <AlertTriangle size={13} color="#b45309" strokeWidth={2.2} />
                <Text style={styles.warnText}>Hiện không có nhân viên nào sẵn sàng</Text>
              </View>
            )}
            {staff.map((s) => {
              const on = selStaff === s.id;
              const ready = isStaffReady(s);
              const staffDisplayName = s.fullName || s.name || 'Kỹ thuật viên';
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.optRow, on && styles.optRowOn, !ready && styles.optRowDisabled]}
                  activeOpacity={ready ? 0.8 : 1}
                  disabled={!ready}
                  onPress={() => {
                    if (!ready) return;
                    anim();
                    setSelStaff(s.id);
                    setOpenStaff(false);
                  }}
                >
                  <View style={styles.avatarWrap}>
                    <Image source={{ uri: staffPhoto(s) }} style={[styles.optAvatar, !ready && styles.avatarDisabled]} contentFit="cover" transition={150} />
                    <View style={[styles.statusDotSm, ready ? styles.statusDotFree : styles.statusDotBusy]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optName, !ready && styles.textDisabled]} numberOfLines={1}>
                      {staffDisplayName}
                      {s.staffCode ? ` (${s.staffCode})` : ''}
                    </Text>
                    <View style={styles.selMeta}>
                      <StaffRating rating={s.rating} count={s.ratingCount} />
                      <Text style={styles.metaDot}>·</Text>
                      <Text style={[styles.optSub, !ready && styles.textDisabled]} numberOfLines={1}>{s.phone}</Text>
                    </View>
                  </View>
                  {on ? (
                    <View style={styles.optCheck}><Check size={14} color="#ffffff" strokeWidth={3.2} /></View>
                  ) : !ready ? (
                    <View style={styles.pillLocked}>
                      <Lock size={12} color="#94a3b8" strokeWidth={2.4} />
                      <Text style={styles.pillLockedText}>
                        {s.isActive === false ? 'Ngưng HĐ' : 'Đang bận'}
                      </Text>
                    </View>
                  ) : (
                    <AvailPill busy={false} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Dropdown>

          {/* Gán xe */}
          <View style={styles.assignHead}>
            <Truck size={16} color="#ea580c" strokeWidth={2.4} />
            <Text style={styles.assignLabel}>Gán xe cứu hộ</Text>
            {vehicles.length > 0 && (
              <Text style={styles.assignCount}>({readyVehicleCount}/{vehicles.length} sẵn sàng)</Text>
            )}
          </View>
          <Dropdown
            open={openVehicle}
            onToggle={() => { anim(); setOpenVehicle((p) => !p); setOpenStaff(false); }}
            placeholder="Chọn xe cứu hộ"
            loading={loading}
            empty={!loading && vehicles.length === 0}
            emptyText="Chưa có xe cứu hộ. Thêm ở tab Nhân viên."
            selected={chosenVehicle && (
              <View style={styles.selRow}>
                <View style={styles.avatarWrap}>
                  <Image source={{ uri: vehiclePhoto(chosenVehicle) }} style={styles.selVeh} contentFit="cover" transition={150} />
                  <View style={[styles.statusDot, isVehicleReady(chosenVehicle) ? styles.statusDotFree : styles.statusDotBusy]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selName} numberOfLines={1}>{chosenVehicle.licensePlate}</Text>
                  <Text style={styles.selSub} numberOfLines={1}>{KINDS[chosenVehicle.vehicleKind || ''] || chosenVehicle.vehicleKind}</Text>
                </View>
                <AvailPill busy={!isVehicleReady(chosenVehicle)} inactive={chosenVehicle.isActive === false} />
              </View>
            )}
          >
            {readyVehicleCount === 0 && vehicles.length > 0 && (
              <View style={styles.warnBanner}>
                <AlertTriangle size={13} color="#b45309" strokeWidth={2.2} />
                <Text style={styles.warnText}>Hiện không có xe cứu hộ nào sẵn sàng</Text>
              </View>
            )}
            {vehicles.map((v) => {
              const on = selVehicle === v.id;
              const ready = isVehicleReady(v);
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.optRow, on && styles.optRowOn, !ready && styles.optRowDisabled]}
                  activeOpacity={ready ? 0.8 : 1}
                  disabled={!ready}
                  onPress={() => {
                    if (!ready) return;
                    anim();
                    setSelVehicle(v.id);
                    setOpenVehicle(false);
                  }}
                >
                  <View style={styles.avatarWrap}>
                    <Image source={{ uri: vehiclePhoto(v) }} style={[styles.optVeh, !ready && styles.avatarDisabled]} contentFit="cover" transition={150} />
                    <View style={[styles.statusDotSm, ready ? styles.statusDotFree : styles.statusDotBusy]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optName, !ready && styles.textDisabled]} numberOfLines={1}>{v.licensePlate}</Text>
                    <Text style={[styles.optSub, !ready && styles.textDisabled]} numberOfLines={1}>{KINDS[v.vehicleKind || ''] || v.vehicleKind}</Text>
                  </View>
                  {on ? (
                    <View style={styles.optCheck}><Check size={14} color="#ffffff" strokeWidth={3.2} /></View>
                  ) : !ready ? (
                    <View style={styles.pillLocked}>
                      <Lock size={12} color="#94a3b8" strokeWidth={2.4} />
                      <Text style={styles.pillLockedText}>
                        {v.isActive === false ? 'Ngưng HĐ' : 'Đang bận'}
                      </Text>
                    </View>
                  ) : (
                    <AvailPill busy={false} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Dropdown>

          {/* Tóm tắt */}
          <View style={styles.summaryCard}>
            {etaMin != null && (
              <View style={styles.summaryItem}>
                <Timer size={16} color="#ea580c" strokeWidth={2.3} />
                <Text style={styles.summaryValue}>~{etaMin} phút</Text>
                <Text style={styles.summaryLabel}>Đến nơi</Text>
              </View>
            )}
            {dist != null && (
              <View style={[styles.summaryItem, styles.summaryDivider]}>
                <RouteIcon size={16} color="#ea580c" strokeWidth={2.3} />
                <Text style={styles.summaryValue}>{dist.toFixed(1)} km</Text>
                <Text style={styles.summaryLabel}>Quãng đường</Text>
              </View>
            )}
            {fee > 0 && (
              <View style={[styles.summaryItem, styles.summaryDivider]}>
                <Coins size={16} color="#ea580c" strokeWidth={2.3} />
                <Text style={styles.summaryValue}>{formatVnd(fee)}</Text>
                <Text style={styles.summaryLabel}>Chi phí</Text>
              </View>
            )}
          </View>

          {/* Ghi chú */}
          {!!request.locationNote && (
            <View style={styles.card}>
              <Text style={styles.noteLabel}>Ghi chú của khách</Text>
              <Text style={styles.noteText}>{request.locationNote}</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom actions */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.declineBtn} onPress={decline} disabled={busy} activeOpacity={0.85}>
            <Text style={styles.declineText}>Từ chối</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendBtn, !canSubmit && styles.sendBtnOff]}
            onPress={submit}
            disabled={!canSubmit}
            activeOpacity={0.9}
          >
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <Send size={17} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.sendText}>Gửi cứu hộ</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Xem ảnh hiện trường full màn hình */}
        {viewer && (
          <View style={styles.viewer}>
            <TouchableOpacity style={styles.viewerBackdrop} activeOpacity={1} onPress={() => setViewer(null)} />
            <Image source={{ uri: viewer }} style={styles.viewerImg} contentFit="contain" transition={150} />
            <TouchableOpacity style={styles.viewerClose} onPress={() => setViewer(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color="#ffffff" strokeWidth={2.6} />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function AvailPill({ busy, inactive }: { busy?: boolean; inactive?: boolean }) {
  if (inactive) {
    return (
      <View style={[styles.pill, styles.pillInactive]}>
        <View style={[styles.pillDot, { backgroundColor: '#94a3b8' }]} />
        <Text style={[styles.pillText, { color: '#64748b' }]}>Ngưng HĐ</Text>
      </View>
    );
  }
  return (
    <View style={[styles.pill, busy ? styles.pillBusy : styles.pillFree]}>
      <View style={[styles.pillDot, { backgroundColor: busy ? '#f59e0b' : '#10b981' }]} />
      <Text style={[styles.pillText, { color: busy ? '#b45309' : '#047857' }]}>{busy ? 'Đang bận' : 'Sẵn sàng'}</Text>
    </View>
  );
}

// Rating THẬT: có lượt → sao + điểm; chưa có → "Chưa có đánh giá".
function StaffRating({ rating, count }: { rating?: number | null; count?: number | null }) {
  if (rating != null && (count ?? 0) > 0) {
    return (
      <View style={styles.ratingRow}>
        <Star size={12} color="#f59e0b" fill="#f59e0b" strokeWidth={0} />
        <Text style={styles.ratingVal}>{Number(rating).toFixed(1)}</Text>
        <Text style={styles.ratingCnt}>({count})</Text>
      </View>
    );
  }
  return <Text style={styles.noRating}>Chưa có đánh giá</Text>;
}

function Dropdown({ open, onToggle, placeholder, selected, loading, empty, emptyText, children }: {
  open: boolean;
  onToggle: () => void;
  placeholder: string;
  selected: React.ReactNode;
  loading: boolean;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.dropdown, open && styles.dropdownOpen]}>
      <TouchableOpacity style={styles.ddHead} onPress={onToggle} activeOpacity={0.8}>
        <View style={{ flex: 1 }}>
          {selected || <Text style={styles.ddPlaceholder}>{placeholder}</Text>}
        </View>
        <ChevronDown size={20} color="#94a3b8" strokeWidth={2.4} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </TouchableOpacity>
      {open && (
        <View style={styles.ddList}>
          {loading ? (
            <View style={styles.ddLoading}><ActivityIndicator color="#ea580c" /></View>
          ) : empty ? (
            <Text style={styles.ddEmpty}>{emptyText}</Text>
          ) : (
            children
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f2f3f5' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 14 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  subhead: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  statusPill: { backgroundColor: '#fff1e6', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20 },
  statusPillText: { fontSize: 11.5, fontWeight: '700', color: '#c2410c' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e7e9ee' },

  scroll: { flex: 1 },
  scrollBody: { paddingHorizontal: 18, paddingBottom: 22, gap: 12 },

  mapWrap: {
    height: 180, marginHorizontal: 18, marginBottom: 12, borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#e5e7eb', borderWidth: 1, borderColor: '#e7e9ee', position: 'relative',
  },
  map: { flex: 1, backgroundColor: '#e5e7eb' },
  mapDistPill: {
    position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ffffff', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 6, elevation: 4,
  },
  mapDistText: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  mapDirBtn: {
    position: 'absolute', right: 12, top: 12, width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 6, elevation: 5,
  },

  card: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#edeef2',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },

  // Khách hàng
  customerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#ffffff', borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: '#edeef2',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  custAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#e2e8f0' },
  custName: { fontSize: 16.5, fontWeight: '800', color: '#0f172a' },
  custSub: { fontSize: 12.5, color: '#64748b', fontWeight: '600', marginTop: 3 },
  custActions: { flexDirection: 'row', gap: 8 },
  msgBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  callBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 7, elevation: 4,
  },

  // Sự cố
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  sectionTitle: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  symptom: { fontSize: 14, color: '#334155', fontWeight: '500', lineHeight: 21 },

  photoBlock: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f3f6' },
  photoHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  photoHeadText: { fontSize: 12.5, fontWeight: '800', color: '#475569', flex: 1 },
  photoCount: {
    fontSize: 11, fontWeight: '800', color: '#c2410c', backgroundColor: '#fff1e6',
    minWidth: 20, textAlign: 'center', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, overflow: 'hidden',
  },
  photoRow: { gap: 10, paddingRight: 2 },
  photo: { width: 128, height: 100, borderRadius: 14, backgroundColor: '#e9eef4' },
  photoZoom: {
    position: 'absolute', right: 7, bottom: 7, width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  noPhoto: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  noPhotoText: { fontSize: 12.5, color: '#94a3b8', fontWeight: '600' },

  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: '#f1f3f6',
  },
  locationIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff1e6', alignItems: 'center', justifyContent: 'center' },
  locationLabel: { fontSize: 11.5, color: '#94a3b8', fontWeight: '600' },
  locationValue: { fontSize: 13.5, color: '#0f172a', fontWeight: '700', marginTop: 2, lineHeight: 19 },

  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 14 },
  metaMini: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaMiniText: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  // Gán
  assignHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2, paddingLeft: 2 },
  assignLabel: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  assignCount: { fontSize: 12, fontWeight: '700', color: '#ea580c', marginLeft: 'auto' },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  warnText: { fontSize: 12, fontWeight: '700', color: '#b45309', flex: 1 },
  dropdown: { backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#edeef2', overflow: 'hidden' },
  dropdownOpen: { borderColor: '#fed7aa' },
  ddHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13, minHeight: 66 },
  ddPlaceholder: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  ddList: { borderTopWidth: 1, borderTopColor: '#f1f3f6', paddingHorizontal: 8, paddingVertical: 6 },
  ddLoading: { paddingVertical: 18, alignItems: 'center' },
  ddEmpty: { fontSize: 13, color: '#94a3b8', fontWeight: '600', textAlign: 'center', paddingVertical: 18 },

  selRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e9eef4' },
  selVeh: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#e9eef4' },
  selName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  selSub: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 },

  optRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 13, marginVertical: 2 },
  optRowOn: { backgroundColor: '#fff7ed' },
  optRowDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.55,
  },
  avatarDisabled: {
    opacity: 0.6,
  },
  textDisabled: {
    color: '#94a3b8',
  },
  optAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e9eef4' },
  optVeh: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e9eef4' },
  optName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  optSub: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 1 },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9 },
  pillFree: { backgroundColor: '#e7f7ef' },
  pillBusy: { backgroundColor: '#fef3e2' },
  pillInactive: { backgroundColor: '#f1f5f9' },
  pillLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  pillLockedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '700' },

  // Avatar + chấm trạng thái
  avatarWrap: { position: 'relative' },
  statusDot: {
    position: 'absolute', right: -1, bottom: -1, width: 14, height: 14, borderRadius: 7,
    borderWidth: 2.5, borderColor: '#ffffff',
  },
  statusDotSm: {
    position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: '#ffffff',
  },
  statusDotFree: { backgroundColor: '#10b981' },
  statusDotBusy: { backgroundColor: '#f59e0b' },

  // Dòng meta (rating · phone)
  selMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  metaDot: { fontSize: 12, color: '#cbd5e1' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingVal: { fontSize: 12.5, fontWeight: '800', color: '#b45309' },
  ratingCnt: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  noRating: { fontSize: 11.5, fontWeight: '600', color: '#cbd5e1' },

  optCheck: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#ea580c',
    alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },

  // Xem ảnh full màn hình
  viewer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(2,6,23,0.94)', alignItems: 'center', justifyContent: 'center' },
  viewerBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  viewerImg: { width: '92%', height: '78%' },
  viewerClose: {
    position: 'absolute', top: 46, right: 20, width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center',
  },

  // Tóm tắt
  summaryCard: {
    flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#edeef2', paddingVertical: 16,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 6 },
  summaryDivider: { borderLeftWidth: 1, borderLeftColor: '#f1f3f6' },
  summaryValue: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  summaryLabel: { fontSize: 11.5, color: '#94a3b8', fontWeight: '600' },

  noteLabel: { fontSize: 12.5, fontWeight: '700', color: '#64748b', marginBottom: 6 },
  noteText: { fontSize: 14, color: '#334155', fontWeight: '500', lineHeight: 21 },

  // Footer
  footer: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#edeef2',
  },
  declineBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#e7e9ee', backgroundColor: '#ffffff',
  },
  declineText: { fontSize: 15, fontWeight: '800', color: '#64748b' },
  sendBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16, borderRadius: 16,
    backgroundColor: '#ea580c', shadowColor: '#ea580c', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 12, elevation: 5,
  },
  sendBtnOff: { backgroundColor: '#cbd5e1', shadowOpacity: 0 },
  sendText: { fontSize: 15.5, fontWeight: '800', color: '#ffffff', letterSpacing: 0.2 },
});
