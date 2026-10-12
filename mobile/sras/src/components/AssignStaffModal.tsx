import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  Check,
  X,
  Truck,
  Bike,
  Star,
  User as UserIcon,
  Navigation,
  Clock,
  Coins,
  Phone,
  MapPin,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Camera,
  Lock,
} from 'lucide-react-native';
import { resolveFileUrl } from '../api/axiosClient';
import { garageApi, GarageStaffDto, RescueVehicleDto } from '../api/garageApi';
import { RescueRequestDto } from '../api/rescueApi';
import { goongApi } from '../api/goongApi';
import { GOONG_MAPTILES_KEY } from '../config/goong';
import { resolveRescueFee } from '../utils/rescueFee';

const VEHICLE_LABEL: Record<string, string> = { CAR: 'Ô tô', MOTORBIKE: 'Xe máy' };
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Bản đồ đường đi gara → khách (goong-js). Setter khai báo trước khi tải goong-js
// để lệnh inject từ RN không bị mất.
function buildRouteMapHtml(lat: number, lng: number) {
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
    var __s = { pickup: null, origin: null, route: null, ready: false };
    window.setPickup = function(la, ln){ __s.pickup = [ln, la]; window.__apply && window.__apply(); };
    window.setOrigin = function(la, ln){ __s.origin = [ln, la]; window.__apply && window.__apply(); };
    window.setRoute = function(j){ try { __s.route = JSON.parse(j); } catch(e){} window.__apply && window.__apply(); };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <script>
    if (typeof goongjs !== 'undefined') {
      goongjs.accessToken = '${GOONG_MAPTILES_KEY}';
      var map = new goongjs.Map({ container:'map', style:'https://tiles.goong.io/assets/goong_map_web.json', center:[${lng}, ${lat}], zoom:13, interactive:false });
      var pm = null, om = null;
      function ensureRoute(){ if (map.getSource('route')) return;
        map.addSource('route', { type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates: [] } } });
        map.addLayer({ id:'route-line', type:'line', source:'route', layout:{ 'line-cap':'round','line-join':'round' }, paint:{ 'line-color':'#ea580c','line-width':5,'line-opacity':0.9 } });
      }
      function fit(){ var pts=[]; if(__s.route&&__s.route.length) pts=__s.route.slice(); if(__s.pickup) pts.push(__s.pickup); if(__s.origin) pts.push(__s.origin);
        if(pts.length===0) return; if(pts.length===1){ map.jumpTo({center:pts[0],zoom:14}); return; }
        var b=new goongjs.LngLatBounds(pts[0],pts[0]); for(var i=1;i<pts.length;i++) b.extend(pts[i]); map.fitBounds(b,{padding:44,maxZoom:15,duration:0}); }
      window.__apply = function(){ if(!__s.ready) return;
        if(__s.origin){ if(!om) om=new goongjs.Marker({color:'#2563eb'}).setLngLat(__s.origin).addTo(map); else om.setLngLat(__s.origin); }
        if(__s.pickup){ if(!pm) pm=new goongjs.Marker({color:'#ea580c'}).setLngLat(__s.pickup).addTo(map); else pm.setLngLat(__s.pickup); }
        if(__s.route){ ensureRoute(); map.getSource('route').setData({ type:'Feature', geometry:{ type:'LineString', coordinates: __s.route } }); }
        fit();
      };
      map.on('load', function(){ __s.ready = true; ensureRoute(); window.__apply(); setTimeout(function(){ map.resize(); fit(); }, 250); });
    }
  </script>
</body>
</html>`;
}

const KINDS: { key: string; label: string }[] = [
  { key: 'TOW_TRUCK', label: 'Xe kéo' },
  { key: 'MOTORBIKE', label: 'Xe máy' },
  { key: 'VAN', label: 'Xe tải nhỏ' },
];

const kindLabel = (k?: string) => KINDS.find((x) => x.key === k)?.label || k || 'Xe cứu hộ';
const isBusy = (status?: string) => status === 'BUSY';
const isStaffReady = (s?: GarageStaffDto | null): boolean =>
  Boolean(s && s.status === 'FREE' && s.isActive !== false);
const isVehicleReady = (v?: RescueVehicleDto | null): boolean =>
  Boolean(v && v.status === 'FREE' && v.isActive !== false);

// Số tiền VND với dấu chấm ngăn cách (Hermes không luôn hỗ trợ toLocaleString grouping).
const formatVnd = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;

// Chữ cái đầu từ tên — không dùng ảnh sinh tự động (ui-avatars/loremflickr) nữa.
const initials = (name?: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface Props {
  visible: boolean;
  request: RescueRequestDto | null;
  onClose: () => void;
  /** Gọi khi gán thành công, trả về đơn đã cập nhật. */
  onAssigned: (updated: RescueRequestDto) => void;
}

export default function AssignStaffModal({ visible, request, onClose, onAssigned }: Props) {
  const [staff, setStaff] = useState<GarageStaffDto[]>([]);
  const [vehicles, setVehicles] = useState<RescueVehicleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selStaff, setSelStaff] = useState<number | null>(null);
  const [selVehicle, setSelVehicle] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  // Đường đi gara → khách.
  const webRef = useRef<WebView>(null);
  const routeCoordsRef = useRef<[number, number][] | null>(null);
  const [route, setRoute] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  const originLat = request?.garage?.lat;
  const originLng = request?.garage?.lng;
  const pickupLat = request?.pickupLat;
  const pickupLng = request?.pickupLng;

  const mapHtml = useMemo(() => {
    if (pickupLat == null || pickupLng == null) return null;
    return buildRouteMapHtml(pickupLat, pickupLng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id]);

  // Tải lộ trình thật khi mở modal.
  useEffect(() => {
    routeCoordsRef.current = null;
    setRoute(null);
    if (!visible || pickupLat == null || pickupLng == null || originLat == null || originLng == null) return;
    let alive = true;
    (async () => {
      const r = await goongApi.directions(
        { lat: originLat, lng: originLng },
        { lat: pickupLat, lng: pickupLng },
        request?.vehicleType === 'MOTORBIKE' ? 'bike' : 'car',
      );
      if (!alive || !r) return;
      routeCoordsRef.current = r.coordinates;
      setRoute({ distanceKm: r.distanceKm, durationMin: r.durationMin });
      webRef.current?.injectJavaScript(`window.setRoute && window.setRoute(${JSON.stringify(JSON.stringify(r.coordinates))}); true;`);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, request?.id]);

  const onMapLoadEnd = () => {
    let js = '';
    if (pickupLat != null) js += `window.setPickup && window.setPickup(${pickupLat}, ${pickupLng});`;
    if (originLat != null) js += `window.setOrigin && window.setOrigin(${originLat}, ${originLng});`;
    if (routeCoordsRef.current) js += `window.setRoute && window.setRoute(${JSON.stringify(JSON.stringify(routeCoordsRef.current))});`;
    if (js) webRef.current?.injectJavaScript(js + ' true;');
  };

  useEffect(() => {
    if (!visible) return;
    setSelStaff(null);
    setSelVehicle(null);
    setStep(1);
    setViewPhoto(null);
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
  const goStep = (s: 1 | 2) => {
    anim();
    setStep(s);
  };

  const chosenStaff = useMemo(() => staff.find((s) => s.id === selStaff), [staff, selStaff]);
  const chosenVehicle = useMemo(() => vehicles.find((v) => v.id === selVehicle), [vehicles, selVehicle]);

  const submit = async () => {
    if (!request || selStaff == null || selVehicle == null) {
      Alert.alert('Chưa đủ thông tin', 'Chọn 1 nhân viên và 1 xe cứu hộ.');
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
      const updated = await garageApi.assignStaff(request.id, selStaff, selVehicle);
      onAssigned(updated);
      onClose();
    } catch (e: any) {
      Alert.alert('Không gán được', e?.response?.data?.message || 'Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const ready =
    selStaff != null &&
    selVehicle != null &&
    !busy &&
    chosenStaff != null &&
    isStaffReady(chosenStaff) &&
    chosenVehicle != null &&
    isVehicleReady(chosenVehicle);

  // Số liệu THẬT cho thẻ đường đi. Ưu tiên lộ trình Goong, fallback về quãng đường điều phối.
  const distanceKm = route?.distanceKm ?? request?.dispatchDistanceKm ?? null;
  const durationMin = route?.durationMin ?? null;
  const feeText = request ? formatVnd(resolveRescueFee(request)) : null;

  const callCustomer = () => request?.customer?.phone && Linking.openURL(`tel:${request.customer.phone}`);

  return (
    <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Điều phối cứu hộ</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {request?.code ? `${request.code}` : 'Đơn cứu hộ'}
                {request?.customer?.name ? ` · ${request.customer.name}` : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={18} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* THẺ ĐƯỜNG ĐI: bản đồ gara → khách + khoảng cách/ETA + thông tin khách */}
          {request && (
            <View style={styles.tripCard}>
              <View style={styles.mapBox}>
                {mapHtml ? (
                  <WebView
                    ref={webRef}
                    originWhitelist={['*']}
                    source={{ html: mapHtml, baseUrl: 'https://cdn.jsdelivr.net/' }}
                    style={styles.map}
                    javaScriptEnabled
                    domStorageEnabled
                    scrollEnabled={false}
                    mixedContentMode="always"
                    setSupportMultipleWindows={false}
                    onLoadEnd={onMapLoadEnd}
                    androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
                  />
                ) : (
                  <View style={[styles.map, styles.mapPlaceholder]}>
                    <MapPin size={22} color="#cbd5e1" strokeWidth={2} />
                  </View>
                )}

                {/* Chip lộ trình thật, nổi trên bản đồ */}
                <View style={styles.tripChips} pointerEvents="none">
                  {distanceKm != null && (
                    <View style={styles.tripChip}>
                      <Navigation size={12.5} color="#ea580c" strokeWidth={2.6} />
                      <Text style={styles.tripChipText}>{distanceKm.toFixed(1)} km</Text>
                    </View>
                  )}
                  {durationMin != null ? (
                    <View style={styles.tripChip}>
                      <Clock size={12.5} color="#ea580c" strokeWidth={2.6} />
                      <Text style={styles.tripChipText}>~{durationMin} phút</Text>
                    </View>
                  ) : (originLat != null && (
                    <View style={styles.tripChip}>
                      <ActivityIndicator size="small" color="#ea580c" />
                      <Text style={styles.tripChipText}>Đang tính lộ trình</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Thông tin người đặt cứu hộ */}
              <View style={styles.customerRow}>
                <View style={styles.custAvatar}>
                  <UserIcon size={20} color="#ea580c" strokeWidth={2.3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.custName} numberOfLines={1}>{request.customer?.name || 'Khách hàng'}</Text>
                  <View style={styles.custMetaRow}>
                    <View style={styles.custTag}>
                      <Text style={styles.custTagText}>{VEHICLE_LABEL[request.vehicleType] || request.vehicleType}</Text>
                    </View>
                    {!!request.customer?.phone && (
                      <Text style={styles.custPhone} numberOfLines={1}>{request.customer.phone}</Text>
                    )}
                  </View>
                </View>
                {!!request.customer?.phone && (
                  <TouchableOpacity style={styles.callBtn} onPress={callCustomer} activeOpacity={0.8}>
                    <Phone size={17} color="#ffffff" strokeWidth={2.5} />
                  </TouchableOpacity>
                )}
              </View>

              {!!(request.pickupAddress || request.locationNote) && (
                <View style={styles.custLine}>
                  <MapPin size={13} color="#94a3b8" strokeWidth={2.3} />
                  <Text style={styles.custLineText} numberOfLines={2}>{request.pickupAddress || request.locationNote}</Text>
                </View>
              )}
              {!!request.symptom && (
                <View style={styles.custLine}>
                  <AlertTriangle size={13} color="#94a3b8" strokeWidth={2.3} />
                  <Text style={styles.custLineText} numberOfLines={2}>{request.symptom}</Text>
                </View>
              )}

              {/* Ảnh khách gửi kèm — để gara biết xe nào & đang bị gì */}
              {!!request.photos?.length && (
                <View style={styles.photoBlock}>
                  <View style={styles.photoHead}>
                    <Camera size={13} color="#94a3b8" strokeWidth={2.3} />
                    <Text style={styles.photoHeadText}>Ảnh khách gửi</Text>
                    <Text style={styles.photoCount}>{request.photos.length}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
                    {request.photos.map((uri, i) => (
                      <TouchableOpacity key={`${uri}-${i}`} activeOpacity={0.85} onPress={() => setViewPhoto(resolveFileUrl(uri) || null)}>
                        <Image source={{ uri: resolveFileUrl(uri) }} style={styles.photoThumb} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {feeText && (
                <View style={styles.feeRow}>
                  <Coins size={14} color="#c2410c" strokeWidth={2.4} />
                  <Text style={styles.feeLabel}>Phí dự kiến</Text>
                  <Text style={styles.feeValue}>{feeText}</Text>
                </View>
              )}
            </View>
          )}

          {/* 2 BƯỚC: Nhân viên → Xe */}
          <View style={styles.tabs}>
            {([
              { k: 1 as const, label: 'Nhân viên', n: staff.length, done: selStaff != null },
              { k: 2 as const, label: 'Xe cứu hộ', n: vehicles.length, done: selVehicle != null },
            ]).map((t) => {
              const on = step === t.k;
              const enabled = t.k === 1 || selStaff != null;
              return (
                <TouchableOpacity
                  key={t.k}
                  style={styles.tab}
                  disabled={!enabled}
                  onPress={() => enabled && goStep(t.k)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tabInner}>
                    {t.done ? (
                      <Check size={13} color="#ea580c" strokeWidth={3} />
                    ) : (
                      <Text style={[styles.tabIndex, on && styles.tabIndexOn, !enabled && styles.tabTextOff]}>{t.k}</Text>
                    )}
                    <Text style={[styles.tabText, on && styles.tabTextOn, !enabled && styles.tabTextOff]}>{t.label}</Text>
                    {!loading && <Text style={styles.tabCount}>{t.n}</Text>}
                  </View>
                  <View style={[styles.tabBar, on && styles.tabBarOn]} />
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {step === 1 ? (
              loading ? (
                <Skeletons />
              ) : staff.length === 0 ? (
                <EmptyState text="Gara chưa có nhân viên cứu hộ." />
              ) : (
                <>
                  {staff.map((s) => {
                    const on = selStaff === s.id;
                    const readyStaff = isStaffReady(s);
                    const b = !readyStaff;
                    const hasPhoto = !!(s.avatarUrl && s.avatarUrl.trim());
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.row, on && styles.rowOn, b && styles.rowDisabled]}
                        onPress={() => setSelStaff(s.id)}
                        disabled={b}
                        activeOpacity={0.7}
                      >
                        {hasPhoto ? (
                          <Image source={{ uri: resolveFileUrl(s.avatarUrl) }} style={[styles.markImg, b && styles.markBusy]} />
                        ) : (
                          <View style={[styles.mark, b && styles.markBusy]}>
                            <Text style={styles.markText}>{initials(s.fullName || s.name)}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.rowTitle, on && styles.rowTitleOn]} numberOfLines={1}>
                            {s.fullName || s.name || 'Kỹ thuật viên'}
                            {s.staffCode ? ` (${s.staffCode})` : ''}
                          </Text>
                          <Text style={styles.rowSub} numberOfLines={1}>
                            Kỹ thuật viên · <Text style={b ? styles.stBusy : styles.stFree}>{b ? (s.isActive === false ? 'ngưng HĐ' : 'đang bận') : 'sẵn sàng'}</Text>
                          </Text>
                        </View>
                        {s.rating != null && (s.ratingCount ?? 0) > 0 && (
                          <View style={styles.rating}>
                            <Star size={13} color="#f59e0b" fill="#f59e0b" strokeWidth={0} />
                            <Text style={styles.ratingText}>{s.rating.toFixed(1)}</Text>
                          </View>
                        )}
                        {b ? <Lock size={17} color="#cbd5e1" strokeWidth={2.4} /> : <Radio on={on} />}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )
            ) : loading ? (
              <Skeletons />
            ) : vehicles.length === 0 ? (
              <EmptyState text="Gara chưa có xe cứu hộ." />
            ) : (
              <>
                {vehicles.map((v) => {
                  const on = selVehicle === v.id;
                  const readyVeh = isVehicleReady(v);
                  const b = !readyVeh;
                  const KindIcon = v.vehicleKind === 'MOTORBIKE' ? Bike : Truck;
                  const vImg = v.imageUrl && v.imageUrl.trim() ? resolveFileUrl(v.imageUrl) : null;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.row, on && styles.rowOn, b && styles.rowDisabled]}
                      onPress={() => setSelVehicle(v.id)}
                      disabled={b}
                      activeOpacity={0.7}
                    >
                      {vImg ? (
                        <Image source={{ uri: vImg }} style={[styles.markSquare, b && styles.markBusy]} />
                      ) : (
                        <View style={[styles.markSquare, b && styles.markBusy]}>
                          <KindIcon size={22} color="#475569" strokeWidth={2} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.plate, on && styles.rowTitleOn]} numberOfLines={1}>{v.licensePlate}</Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {kindLabel(v.vehicleKind)} · <Text style={b ? styles.stBusy : styles.stFree}>{b ? (v.isActive === false ? 'ngưng HĐ' : 'đang bận') : 'sẵn sàng'}</Text>
                        </Text>
                      </View>
                      {b ? <Lock size={17} color="#cbd5e1" strokeWidth={2.4} /> : <Radio on={on} />}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </ScrollView>

          {/* FOOTER theo bước */}
          <View style={styles.footer}>
            {step === 1 ? (
              <TouchableOpacity
                style={[styles.primary, selStaff == null && styles.primaryOff]}
                onPress={() => goStep(2)}
                disabled={selStaff == null}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryText}>Tiếp: chọn xe</Text>
                <ChevronRight size={18} color="#ffffff" strokeWidth={2.6} />
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.crew}>
                  <Text style={styles.crewLabel}>Kíp điều phối</Text>
                  <Text style={styles.crewValue} numberOfLines={1}>
                    {chosenStaff?.name || '—'}
                    <Text style={styles.crewDot}>  ·  </Text>
                    <Text style={styles.crewPlate}>{chosenVehicle?.licensePlate || '—'}</Text>
                  </Text>
                </View>
                <View style={styles.footRow}>
                  <TouchableOpacity style={styles.backBtn} onPress={() => goStep(1)} activeOpacity={0.7}>
                    <ChevronLeft size={17} color="#64748b" strokeWidth={2.5} />
                    <Text style={styles.backText}>Nhân viên</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primary, styles.primaryFlex, !ready && styles.primaryOff]}
                    onPress={submit}
                    disabled={!ready}
                    activeOpacity={0.9}
                  >
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Xác nhận điều phối</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>

    {/* Xem ảnh phóng to */}
    <Modal visible={!!viewPhoto} transparent animationType="fade" onRequestClose={() => setViewPhoto(null)}>
      <TouchableOpacity style={styles.lightbox} activeOpacity={1} onPress={() => setViewPhoto(null)}>
        <TouchableOpacity style={styles.lightboxClose} onPress={() => setViewPhoto(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={22} color="#ffffff" strokeWidth={2.6} />
        </TouchableOpacity>
        {!!viewPhoto && <Image source={{ uri: viewPhoto }} style={styles.lightboxImg} resizeMode="contain" />}
      </TouchableOpacity>
    </Modal>
    </>
  );
}

function Radio({ on }: { on: boolean }) {
  return <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function Skeletons() {
  return (
    <View>
      {[0, 1].map((i) => (
        <View key={i} style={styles.skeleton}>
          <View style={styles.skAvatar} />
          <View style={{ flex: 1, gap: 7 }}>
            <View style={[styles.skLine, { width: '55%' }]} />
            <View style={[styles.skLine, { width: '35%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingTop: 8, maxHeight: '92%',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', marginBottom: 8 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a', letterSpacing: -0.2 },
  subtitle: { fontSize: 12.5, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },

  // Thẻ đường đi (bản đồ + khách)
  tripCard: {
    marginHorizontal: 20, marginBottom: 4, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#eef1f5', borderRadius: 18, overflow: 'hidden',
  },
  mapBox: { height: 150, backgroundColor: '#e5e7eb' },
  map: { flex: 1, backgroundColor: '#e5e7eb' },
  mapPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  tripChips: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 },
  tripChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.96)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2,
  },
  tripChipText: { fontSize: 12, fontWeight: '800', color: '#9a3412' },

  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 12 },
  custAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  custName: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  custMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  custTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7 },
  custTagText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  custPhone: { fontSize: 12.5, fontWeight: '700', color: '#64748b', flexShrink: 1 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', shadowColor: '#16a34a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
  custLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: 14, marginTop: 9 },
  custLineText: { flex: 1, fontSize: 12.5, color: '#64748b', fontWeight: '600', lineHeight: 18 },

  feeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12,
    paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#fff7ed', borderTopWidth: 1, borderTopColor: '#ffedd5',
  },
  feeLabel: { flex: 1, fontSize: 12.5, fontWeight: '700', color: '#c2410c' },
  feeValue: { fontSize: 15, fontWeight: '900', color: '#9a3412' },

  // Tabs 2 bước
  tabs: { flexDirection: 'row', marginTop: 14, marginHorizontal: 20 },
  tab: { flex: 1 },
  tabInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingBottom: 10 },
  tabIndex: {
    fontSize: 11, fontWeight: '900', color: '#94a3b8', textAlign: 'center',
    width: 18, height: 18, lineHeight: 17, borderRadius: 9, borderWidth: 1.5, borderColor: '#cbd5e1', overflow: 'hidden',
  },
  tabIndexOn: { color: '#ea580c', borderColor: '#ea580c' },
  tabText: { fontSize: 13.5, fontWeight: '800', color: '#94a3b8' },
  tabTextOn: { color: '#0f172a' },
  tabTextOff: { color: '#cbd5e1' },
  tabCount: { fontSize: 11.5, fontWeight: '800', color: '#94a3b8' },
  tabBar: { height: 2, backgroundColor: '#e2e8f0' },
  tabBarOn: { backgroundColor: '#ea580c', height: 2.5 },

  scroll: { flexGrow: 0 },
  scrollBody: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 },

  // Dòng chọn (list phẳng — phân tách bằng đường kẻ, không dùng card)
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingLeft: 9,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eef1f5',
    borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  rowOn: { borderLeftColor: '#ea580c' },
  rowDisabled: { opacity: 0.6 },

  mark: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  markSquare: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  markImg: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#e9eef4' },
  markText: { fontSize: 15.5, fontWeight: '900', color: '#334155', letterSpacing: 0.3 },
  markBusy: { opacity: 0.5 },

  rowTitle: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  rowTitleOn: { color: '#c2410c' },
  plate: { fontSize: 16, fontWeight: '700', color: '#0f172a', fontFamily: MONO, letterSpacing: 0.5 },
  rowSub: { fontSize: 12.5, color: '#64748b', fontWeight: '600', marginTop: 3 },
  stFree: { color: '#059669', fontWeight: '800' },
  stBusy: { color: '#d97706', fontWeight: '800' },

  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '800', color: '#b45309' },

  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: '#ea580c' },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#ea580c' },

  // Ảnh khách gửi
  photoBlock: { paddingHorizontal: 14, marginTop: 11 },
  photoHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  photoHeadText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  photoCount: {
    fontSize: 11, fontWeight: '800', color: '#64748b', backgroundColor: '#f1f5f9',
    minWidth: 20, textAlign: 'center', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 9, overflow: 'hidden',
  },
  photoStrip: { gap: 8, paddingRight: 4 },
  photoThumb: { width: 76, height: 76, borderRadius: 12, backgroundColor: '#e9eef4' },

  // Lightbox xem ảnh
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxImg: { width: '92%', height: '80%' },
  lightboxClose: { position: 'absolute', top: 46, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },

  empty: { paddingVertical: 26, paddingHorizontal: 16, alignItems: 'center' },
  emptyText: { fontSize: 12.5, color: '#94a3b8', fontWeight: '600', textAlign: 'center', lineHeight: 18 },

  skeleton: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingLeft: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eef1f5' },
  skAvatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#e9eef4' },
  skLine: { height: 11, borderRadius: 6, backgroundColor: '#e9eef4' },

  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22,
    borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#ffffff',
    borderBottomLeftRadius: 26, borderBottomRightRadius: 26,
  },
  crew: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  crewLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  crewValue: { flex: 1, fontSize: 13.5, fontWeight: '900', color: '#0f172a', textAlign: 'right' },
  crewDot: { color: '#cbd5e1', fontWeight: '700' },
  crewPlate: { fontFamily: MONO, fontWeight: '700', color: '#0f172a', letterSpacing: 0.5 },

  footRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 15, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#f1f5f9' },
  backText: { fontSize: 13.5, fontWeight: '800', color: '#64748b' },

  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#ea580c', borderRadius: 14, paddingVertical: 16 },
  primaryFlex: { flex: 1 },
  primaryOff: { backgroundColor: '#e2e8f0' },
  primaryText: { fontSize: 15, fontWeight: '900', color: '#ffffff', letterSpacing: 0.2 },
});
