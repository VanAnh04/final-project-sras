import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
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
  Plus,
  X,
  Truck,
  Star,
  User as UserIcon,
  Navigation,
  Clock,
  Coins,
  UserPlus,
  Phone,
  MapPin,
  AlertTriangle,
} from 'lucide-react-native';
import { garageApi, GarageStaffDto, RescueVehicleDto } from '../api/garageApi';
import { RescueRequestDto } from '../api/rescueApi';
import { goongApi } from '../api/goongApi';
import { GOONG_MAPTILES_KEY } from '../config/goong';
import { resolveRescueFee } from '../utils/rescueFee';

const VEHICLE_LABEL: Record<string, string> = { CAR: 'Ô tô', MOTORBIKE: 'Xe máy' };

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

// Số tiền VND với dấu chấm ngăn cách (Hermes không luôn hỗ trợ toLocaleString grouping).
const formatVnd = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;

// Ảnh nhân viên: dùng avatarUrl thật, thiếu thì tự sinh avatar theo tên (ảnh PNG, không phải icon).
const staffPhoto = (s: GarageStaffDto) =>
  s.avatarUrl && s.avatarUrl.trim()
    ? s.avatarUrl
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || 'NV')}&background=ea580c&color=ffffff&bold=true&length=1&size=128`;

// Ảnh xe: chưa có ảnh riêng từng xe → dùng ảnh thật theo loại xe, khoá theo id cho ổn định.
const VEH_KEYWORDS: Record<string, string> = {
  TOW_TRUCK: 'tow,truck',
  MOTORBIKE: 'motorbike',
  VAN: 'van,vehicle',
};
const vehiclePhoto = (v: RescueVehicleDto) =>
  `https://loremflickr.com/160/160/${VEH_KEYWORDS[v.vehicleKind || ''] || 'truck'}?lock=${v.id}`;

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

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newKind, setNewKind] = useState('TOW_TRUCK');

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
    setShowAddStaff(false);
    setShowAddVehicle(false);
    setNewStaffName('');
    setNewStaffPhone('');
    setNewPlate('');
    setNewKind('TOW_TRUCK');
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

  const toggleAddStaff = () => {
    anim();
    setShowAddStaff((p) => !p);
  };
  const toggleAddVehicle = () => {
    anim();
    setShowAddVehicle((p) => !p);
  };

  const addStaff = async () => {
    if (!newStaffName.trim() || !newStaffPhone.trim()) {
      Alert.alert('Thiếu thông tin', 'Nhập tên và số điện thoại nhân viên.');
      return;
    }
    try {
      setBusy(true);
      const s = await garageApi.createStaff(newStaffName.trim(), newStaffPhone.trim());
      anim();
      setStaff((prev) => [...prev, s]);
      setSelStaff(s.id);
      setNewStaffName('');
      setNewStaffPhone('');
      setShowAddStaff(false);
    } catch (e: any) {
      Alert.alert('Không thêm được nhân viên', e?.response?.data?.message || 'Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const addVehicle = async () => {
    if (!newPlate.trim()) {
      Alert.alert('Thiếu biển số', 'Nhập biển số xe cứu hộ.');
      return;
    }
    try {
      setBusy(true);
      const v = await garageApi.createVehicle(newPlate.trim(), newKind);
      anim();
      setVehicles((prev) => [...prev, v]);
      setSelVehicle(v.id);
      setNewPlate('');
      setShowAddVehicle(false);
    } catch (e: any) {
      Alert.alert('Không thêm được xe', e?.response?.data?.message || 'Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!request || selStaff == null || selVehicle == null) {
      Alert.alert('Chưa đủ thông tin', 'Chọn 1 nhân viên và 1 xe cứu hộ.');
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

  const ready = selStaff != null && selVehicle != null && !busy;

  const chosenStaff = useMemo(() => staff.find((s) => s.id === selStaff), [staff, selStaff]);
  const chosenVehicle = useMemo(() => vehicles.find((v) => v.id === selVehicle), [vehicles, selVehicle]);

  // Số liệu THẬT cho thẻ đường đi. Ưu tiên lộ trình Goong, fallback về quãng đường điều phối.
  const distanceKm = route?.distanceKm ?? request?.dispatchDistanceKm ?? null;
  const durationMin = route?.durationMin ?? null;
  const feeText = request ? formatVnd(resolveRescueFee(request)) : null;

  const callCustomer = () => request?.customer?.phone && Linking.openURL(`tel:${request.customer.phone}`);

  return (
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

              {feeText && (
                <View style={styles.feeRow}>
                  <Coins size={14} color="#c2410c" strokeWidth={2.4} />
                  <Text style={styles.feeLabel}>Phí dự kiến</Text>
                  <Text style={styles.feeValue}>{feeText}</Text>
                </View>
              )}
            </View>
          )}

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* NHÂN VIÊN */}
            <View style={styles.sectionHead}>
              <UserIcon size={16} color="#0f172a" strokeWidth={2.4} />
              <Text style={styles.sectionTitle}>Nhân viên cứu hộ</Text>
              {!loading && <Text style={styles.sectionCount}>{staff.length}</Text>}
            </View>

            {loading ? (
              <Skeletons />
            ) : staff.length === 0 ? (
              <EmptyState text="Chưa có nhân viên. Thêm nhân viên đầu tiên để điều phối." />
            ) : (
              staff.map((s) => {
                const on = selStaff === s.id;
                const b = isBusy(s.status);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.card, on && styles.cardOn]}
                    onPress={() => setSelStaff(s.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.avatarWrap}>
                      <Image source={{ uri: staffPhoto(s) }} style={[styles.avatarImg, on && styles.thumbOn, b && styles.thumbBusy]} />
                      <View style={[styles.statusDot, b ? styles.statusDotBusy : styles.statusDotFree]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName} numberOfLines={1}>{s.name}</Text>
                      <Text style={styles.cardSub} numberOfLines={1}>Kỹ thuật viên · {s.phone}</Text>
                      <View style={styles.metaRow}>
                        <AvailPill busy={b} />
                        {s.rating != null && (s.ratingCount ?? 0) > 0 ? (
                          <View style={styles.ratingRow}>
                            <Star size={12.5} color="#f59e0b" fill="#f59e0b" strokeWidth={0} />
                            <Text style={styles.ratingText}>{s.rating.toFixed(1)}</Text>
                            <Text style={styles.ratingCount}>({s.ratingCount})</Text>
                          </View>
                        ) : (
                          <Text style={styles.noRating}>Chưa có đánh giá</Text>
                        )}
                      </View>
                    </View>
                    <View style={[styles.radio, on && styles.radioOn]}>{on && <Check size={13} color="#fff" strokeWidth={3.2} />}</View>
                  </TouchableOpacity>
                );
              })
            )}

            {showAddStaff ? (
              <View style={styles.addBox}>
                <TextInput style={styles.input} placeholder="Tên nhân viên" placeholderTextColor="#94a3b8" value={newStaffName} onChangeText={setNewStaffName} />
                <TextInput style={styles.input} placeholder="Số điện thoại" placeholderTextColor="#94a3b8" keyboardType="phone-pad" value={newStaffPhone} onChangeText={setNewStaffPhone} />
                <View style={styles.addActions}>
                  <TouchableOpacity style={styles.addCancel} onPress={toggleAddStaff} activeOpacity={0.8}>
                    <Text style={styles.addCancelText}>Huỷ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addConfirm} onPress={addStaff} disabled={busy} activeOpacity={0.9}>
                    {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addConfirmText}>Lưu nhân viên</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.ghostBtn} onPress={toggleAddStaff} activeOpacity={0.8}>
                <UserPlus size={16} color="#ea580c" strokeWidth={2.4} />
                <Text style={styles.ghostText}>Thêm nhân viên mới</Text>
              </TouchableOpacity>
            )}

            {/* XE CỨU HỘ */}
            <View style={[styles.sectionHead, { marginTop: 22 }]}>
              <Truck size={16} color="#0f172a" strokeWidth={2.4} />
              <Text style={styles.sectionTitle}>Xe cứu hộ</Text>
              {!loading && <Text style={styles.sectionCount}>{vehicles.length}</Text>}
            </View>

            {loading ? (
              <Skeletons />
            ) : vehicles.length === 0 ? (
              <EmptyState text="Chưa có xe cứu hộ. Thêm xe để sẵn sàng điều phối." />
            ) : (
              vehicles.map((v) => {
                const on = selVehicle === v.id;
                const b = isBusy(v.status);
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.card, on && styles.cardOn]}
                    onPress={() => setSelVehicle(v.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.avatarWrap}>
                      <Image source={{ uri: vehiclePhoto(v) }} style={[styles.vehImg, on && styles.thumbOn, b && styles.thumbBusy]} />
                      <View style={[styles.statusDot, b ? styles.statusDotBusy : styles.statusDotFree]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName} numberOfLines={1}>{v.licensePlate}</Text>
                      <Text style={styles.cardSub} numberOfLines={1}>{kindLabel(v.vehicleKind)}</Text>
                      <View style={styles.metaRow}>
                        <AvailPill busy={b} />
                      </View>
                    </View>
                    <View style={[styles.radio, on && styles.radioOn]}>{on && <Check size={13} color="#fff" strokeWidth={3.2} />}</View>
                  </TouchableOpacity>
                );
              })
            )}

            {showAddVehicle ? (
              <View style={styles.addBox}>
                <TextInput style={styles.input} placeholder="Biển số xe" placeholderTextColor="#94a3b8" autoCapitalize="characters" value={newPlate} onChangeText={setNewPlate} />
                <View style={styles.kindRow}>
                  {KINDS.map((k) => (
                    <TouchableOpacity key={k.key} style={[styles.kindChip, newKind === k.key && styles.kindChipOn]} onPress={() => setNewKind(k.key)} activeOpacity={0.8}>
                      <Text style={[styles.kindText, newKind === k.key && styles.kindTextOn]}>{k.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.addActions}>
                  <TouchableOpacity style={styles.addCancel} onPress={toggleAddVehicle} activeOpacity={0.8}>
                    <Text style={styles.addCancelText}>Huỷ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addConfirm} onPress={addVehicle} disabled={busy} activeOpacity={0.9}>
                    {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addConfirmText}>Lưu xe</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.ghostBtn} onPress={toggleAddVehicle} activeOpacity={0.8}>
                <Plus size={16} color="#ea580c" strokeWidth={2.6} />
                <Text style={styles.ghostText}>Thêm xe cứu hộ mới</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerSummary} numberOfLines={1}>
              {chosenStaff || chosenVehicle ? (
                <>
                  <Text style={styles.footerLabel}>Đã chọn: </Text>
                  {chosenStaff?.name || '—'}
                  {chosenVehicle ? ` · ${chosenVehicle.licensePlate}` : ''}
                </>
              ) : (
                'Chọn 1 nhân viên và 1 xe để điều phối'
              )}
            </Text>
            <TouchableOpacity
              style={[styles.submitBtn, !ready && styles.submitBtnOff]}
              onPress={submit}
              disabled={!ready}
              activeOpacity={0.9}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Xác nhận điều phối</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AvailPill({ busy }: { busy: boolean }) {
  return (
    <View style={[styles.pill, busy ? styles.pillBusy : styles.pillFree]}>
      <View style={[styles.pillDot, busy ? styles.pillDotBusy : styles.pillDotFree]} />
      <Text style={[styles.pillText, busy ? styles.pillTextBusy : styles.pillTextFree]}>{busy ? 'Đang bận' : 'Sẵn sàng'}</Text>
    </View>
  );
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

  scroll: { flexGrow: 0 },
  scrollBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a', flex: 1 },
  sectionCount: {
    fontSize: 11.5, fontWeight: '800', color: '#64748b',
    backgroundColor: '#f1f5f9', minWidth: 22, textAlign: 'center', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, overflow: 'hidden',
  },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 16, padding: 12, marginBottom: 9, backgroundColor: '#ffffff',
  },
  cardOn: { borderColor: '#ea580c', backgroundColor: '#fff7ed' },

  avatarWrap: { width: 52, height: 52 },
  avatarImg: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#e9eef4' },
  vehImg: { width: 52, height: 52, borderRadius: 15, backgroundColor: '#e9eef4' },
  thumbOn: { borderWidth: 2, borderColor: '#ea580c' },
  thumbBusy: { opacity: 0.55 },
  statusDot: {
    position: 'absolute', right: -1, bottom: -1, width: 15, height: 15, borderRadius: 8,
    borderWidth: 2.5, borderColor: '#ffffff',
  },
  statusDotFree: { backgroundColor: '#10b981' },
  statusDotBusy: { backgroundColor: '#f59e0b' },

  cardName: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  cardSub: { fontSize: 12.5, color: '#64748b', fontWeight: '600', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  metaText: { fontSize: 12, color: '#94a3b8', fontWeight: '600', flexShrink: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12.5, fontWeight: '800', color: '#b45309' },
  ratingCount: { fontSize: 11.5, fontWeight: '600', color: '#94a3b8' },
  noRating: { fontSize: 11.5, fontWeight: '600', color: '#cbd5e1' },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 8 },
  pillFree: { backgroundColor: '#ecfdf5' },
  pillBusy: { backgroundColor: '#fff7ed' },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillDotFree: { backgroundColor: '#10b981' },
  pillDotBusy: { backgroundColor: '#f59e0b' },
  pillText: { fontSize: 11, fontWeight: '800' },
  pillTextFree: { color: '#059669' },
  pillTextBusy: { color: '#d97706' },

  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: '#ea580c', backgroundColor: '#ea580c' },

  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#fed7aa', backgroundColor: '#fffbf5', borderRadius: 14, paddingVertical: 13, marginTop: 2,
  },
  ghostText: { fontSize: 13.5, fontWeight: '800', color: '#ea580c' },

  addBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 12, marginTop: 2, gap: 10 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 11, paddingHorizontal: 13, height: 46, fontSize: 13.5, color: '#0f172a', fontWeight: '600' },
  kindRow: { flexDirection: 'row', gap: 8 },
  kindChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 11, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  kindChipOn: { backgroundColor: '#fff7ed', borderColor: '#ea580c' },
  kindText: { fontSize: 12.5, fontWeight: '700', color: '#475569' },
  kindTextOn: { color: '#c2410c', fontWeight: '800' },
  addActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  addCancel: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9' },
  addCancelText: { fontSize: 13.5, fontWeight: '800', color: '#64748b' },
  addConfirm: { flex: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#ea580c' },
  addConfirmText: { fontSize: 13.5, fontWeight: '900', color: '#ffffff' },

  empty: { paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 14, marginBottom: 4 },
  emptyText: { fontSize: 12.5, color: '#94a3b8', fontWeight: '600', textAlign: 'center', lineHeight: 18 },

  skeleton: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 9, borderRadius: 16, backgroundColor: '#f8fafc' },
  skAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#e9eef4' },
  skLine: { height: 11, borderRadius: 6, backgroundColor: '#e9eef4' },

  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22,
    borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#ffffff',
    borderBottomLeftRadius: 26, borderBottomRightRadius: 26,
  },
  footerSummary: { fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 10, textAlign: 'center' },
  footerLabel: { color: '#94a3b8', fontWeight: '600' },
  submitBtn: { backgroundColor: '#ea580c', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  submitBtnOff: { backgroundColor: '#e2e8f0' },
  submitText: { fontSize: 15.5, fontWeight: '900', color: '#ffffff', letterSpacing: 0.3 },
});
