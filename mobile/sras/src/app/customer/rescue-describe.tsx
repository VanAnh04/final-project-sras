import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { rescueApi } from '../../api/rescueApi';
import { customerVehicleApi, CustomerVehicleDto } from '../../api/customerVehicleApi';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChevronLeft,
  ChevronRight,
  Car,
  Bike,
  Fuel,
  Disc3,
  BatteryWarning,
  Wrench,
  AlertTriangle,
  MoreHorizontal,
  PhoneCall,
  Phone,
  Check,
  Camera,
  X,
  Banknote,
  Landmark,
  Siren,
} from 'lucide-react-native';

// Design tokens — 1 accent thương hiệu (cam-đỏ), nền trung tính ấm, đỏ = nguy hiểm (ngữ nghĩa).
const BRAND = '#ea580c';
const INK = '#1c1917';
const SUB = '#78716c';
const LINE = '#e7e5e4';
const CARD = '#ffffff';
const BG = '#f7f7f5';
const FIELD = '#f7f7f5';
const DANGER = '#dc2626';
const DANGER_BG = '#fef2f2';
const DANGER_INK = '#991b1b';

const CURRENT_STEP = 2;
const TOTAL_STEPS = 3;
const NOTE_MAX = 200;
const MAX_PHOTOS = 3;

type VehicleKey = 'CAR' | 'MOTORBIKE';
type IssueKey = 'OUT_OF_FUEL' | 'FLAT_TIRE' | 'DEAD_BATTERY' | 'ENGINE_FAILURE' | 'ACCIDENT' | 'OTHER';
type PayKey = 'CASH' | 'BANK_TRANSFER';
type PhotoStatus = 'idle' | 'uploading' | 'done' | 'error';

const VEHICLES: { key: VehicleKey; label: string; Icon: any }[] = [
  { key: 'MOTORBIKE', label: 'Xe máy', Icon: Bike },
  { key: 'CAR', label: 'Ô tô', Icon: Car },
];

const ISSUES: { key: IssueKey; label: string; Icon: any; danger?: boolean }[] = [
  { key: 'OUT_OF_FUEL', label: 'Hết xăng', Icon: Fuel },
  { key: 'FLAT_TIRE', label: 'Thủng lốp', Icon: Disc3 },
  { key: 'DEAD_BATTERY', label: 'Hết ắc-quy', Icon: BatteryWarning },
  { key: 'ENGINE_FAILURE', label: 'Chết máy', Icon: Wrench },
  { key: 'ACCIDENT', label: 'Tai nạn', Icon: AlertTriangle, danger: true },
  { key: 'OTHER', label: 'Sự cố khác', Icon: MoreHorizontal },
];

const PAYMENTS: { key: PayKey; label: string; Icon: any }[] = [
  { key: 'CASH', label: 'Tiền mặt', Icon: Banknote },
  { key: 'BANK_TRANSFER', label: 'Chuyển khoản', Icon: Landmark },
];

export default function RescueDescribeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ lat?: string; lng?: string; address?: string; mode?: string }>();
  const isPickGarageMode = params.mode === 'PICK_GARAGE';

  const [vehicle, setVehicle] = useState<VehicleKey | null>(null);
  const [savedVehicles, setSavedVehicles] = useState<CustomerVehicleDto[]>([]);
  const [vehLoading, setVehLoading] = useState(true);
  const [vehError, setVehError] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [plate, setPlate] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoStatus, setPhotoStatus] = useState<Record<string, PhotoStatus>>({});
  const [issue, setIssue] = useState<IssueKey | null>(null);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [payment, setPayment] = useState<PayKey>('CASH');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  // Nạp xe đã lưu của khách (kèm ảnh thật). Chưa có → chỉ hiện ô nhập nhanh.
  const loadVehicles = async () => {
    try {
      setVehLoading(true);
      setVehError(false);
      const list = await customerVehicleApi.mine();
      console.log('[customer-vehicles] loaded', list.length, list);
      setSavedVehicles(list);
    } catch (e: any) {
      console.warn('[customer-vehicles] load failed', e?.response?.status, e?.message);
      setVehError(true);
    } finally {
      setVehLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savedList = vehicle ? savedVehicles.filter((v) => v.vehicleType === vehicle) : [];

  const pickVehicleType = (key: VehicleKey) => {
    setVehicle(key);
    setSelectedVehicleId(null); // đổi loại xe thì bỏ chọn xe đã lưu
  };

  const pickSavedVehicle = (id: number) => {
    setSelectedVehicleId((cur) => (cur === id ? null : id));
    setPlate(''); // chọn xe đã lưu thì bỏ biển số nhập tay
  };

  const isAccident = issue === 'ACCIDENT';
  const phoneOk = phone.trim().replace(/\D/g, '').length >= 9;
  const canSend = vehicle !== null && issue !== null && phoneOk;

  const summary = useMemo(() => {
    if (!vehicle || !issue) return 'Chọn loại xe và sự cố để gửi yêu cầu';
    const v = VEHICLES.find((x) => x.key === vehicle)?.label;
    const i = ISSUES.find((x) => x.key === issue)?.label;
    return `${v} · ${i}`;
  }, [vehicle, issue]);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Cần quyền camera', 'Hãy cấp quyền camera để chụp ảnh xe.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled) setPhotos((p) => [...p, res.assets[0].uri].slice(0, MAX_PHOTOS));
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (!res.canceled) {
      setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
    }
  };

  const addPhoto = () => {
    if (photos.length >= MAX_PHOTOS) return;
    Alert.alert('Thêm ảnh xe', 'Chọn nguồn ảnh', [
      { text: 'Chụp ảnh', onPress: takePhoto },
      { text: 'Chọn từ thư viện', onPress: pickPhoto },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  };

  const removePhoto = (uri: string) => {
    if (sending) return;
    setPhotos((p) => p.filter((x) => x !== uri));
  };

  const submit = async () => {
    const lat = params.lat ? parseFloat(params.lat) : NaN;
    const lng = params.lng ? parseFloat(params.lng) : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      Alert.alert('Thiếu vị trí', 'Chưa xác định được vị trí cứu hộ. Vui lòng quay lại bước chọn vị trí.', [
        { text: 'Quay lại', onPress: () => router.back() },
      ]);
      return;
    }
    const urls: string[] = [];
    try {
      setSending(true);

      // Upload từng ảnh, cập nhật trạng thái để hiện tiến trình trên từng ảnh.
      for (const uri of photos) {
        setPhotoStatus((s) => ({ ...s, [uri]: 'uploading' }));
        try {
          urls.push(await rescueApi.uploadPhoto(uri));
          setPhotoStatus((s) => ({ ...s, [uri]: 'done' }));
        } catch {
          setPhotoStatus((s) => ({ ...s, [uri]: 'error' }));
        }
      }

      const issueLabel = ISSUES.find((x) => x.key === issue)?.label ?? '';
      // Biển số nhập tay chỉ ghép vào symptom khi KHÔNG chọn xe đã lưu (tránh trùng).
      const platePart = !selectedVehicleId && plate.trim() ? ` · Biển số ${plate.trim()}` : '';
      const notePart = note.trim() ? ` - ${note.trim()}` : '';
      const symptom = `${issueLabel}${platePart}${notePart}`.trim();

      if (isPickGarageMode) {
        router.push({
          pathname: '/customer/rescue-garage-select',
          params: {
            lat: String(lat),
            lng: String(lng),
            address: params.address || '',
            vehicleType: vehicle!,
            symptom,
            issueType: issue!,
            contactPhone: phone.trim(),
            paymentMethod: payment,
            customerVehicleId: selectedVehicleId ? String(selectedVehicleId) : '',
            photoUrls: JSON.stringify(urls),
          },
        } as any);
        return;
      }

      const res = await rescueApi.create({
        vehicleType: vehicle!,
        symptom,
        pickupLat: lat,
        pickupLng: lng,
        pickupAddress: params.address || undefined,
        issueType: issue!,
        contactPhone: phone.trim(),
        paymentMethod: payment,
        customerVehicleId: selectedVehicleId ?? undefined,
        photoUrls: urls,
      });

      router.replace({ pathname: '/customer/rescue-tracking', params: { id: String(res.id) } } as any);
    } catch (e: any) {
      // Rollback: Xóa các file đã upload nếu lưu đơn thất bại để tránh ảnh mồ côi
      for (const u of urls) {
        rescueApi.deletePhoto(u).catch(() => {});
      }
      // Giữ nguyên nội dung đã nhập, cho thử lại.
      Alert.alert('Không gửi được yêu cầu', e?.response?.data?.message || e?.message || 'Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  const onSend = () => {
    if (!canSend || sending) return;
    if (isPickGarageMode) {
      submit();
      return;
    }
    Alert.alert('Gửi yêu cầu cứu hộ?', 'Hệ thống sẽ tìm gara gần nhất và điều tới vị trí của bạn.', [
      { text: 'Kiểm tra lại', style: 'cancel' },
      { text: 'Gửi ngay', onPress: submit },
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header + step strip */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.roundBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.8}
          >
            <ChevronLeft size={22} color={INK} strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mô tả sự cố</Text>
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
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1 — Loại phương tiện */}
          <Text style={styles.qTitle}>Loại phương tiện</Text>
          <View style={styles.vehicleRow}>
            {VEHICLES.map(({ key, label, Icon }) => {
              const active = vehicle === key;
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.85}
                  onPress={() => pickVehicleType(key)}
                  style={[styles.vehicleCard, active && styles.cardActive]}
                >
                  <View style={[styles.vehicleIcon, active && styles.vehicleIconActive]}>
                    <Icon size={24} color={active ? '#ffffff' : BRAND} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.vehicleLabel}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 2 — Nhận diện xe: chọn xe đã lưu (kèm ảnh) hoặc nhập nhanh biển số */}
          <View style={styles.sectionHead}>
            <Text style={styles.qTitle}>Nhận diện xe</Text>
            <Text style={styles.optional}>Không bắt buộc</Text>
          </View>

          {/* Trạng thái tải xe đã lưu (chỉ khi đã chọn loại xe) */}
          {vehicle && vehLoading && (
            <View style={styles.vehStateRow}>
              <ActivityIndicator size="small" color={BRAND} />
              <Text style={styles.vehStateText}>Đang tải xe đã lưu...</Text>
            </View>
          )}
          {vehicle && !vehLoading && vehError && (
            <TouchableOpacity style={styles.vehStateRow} onPress={loadVehicles} activeOpacity={0.8}>
              <Text style={styles.vehStateText}>Không tải được xe đã lưu.</Text>
              <Text style={styles.vehRetry}>Thử lại</Text>
            </TouchableOpacity>
          )}
          {vehicle && !vehLoading && !vehError && savedList.length === 0 && (
            <Text style={[styles.vehStateText, { marginTop: 12 }]}>
              Chưa có xe đã lưu loại này — nhập nhanh biển số bên dưới.
            </Text>
          )}

          {/* Xe đã lưu đúng loại đang chọn */}
          {vehicle &&
            savedList.map((v) => {
              const active = selectedVehicleId === v.id;
              const name = [v.brand, v.model].filter(Boolean).join(' ') || 'Xe của tôi';
              const VIcon = v.vehicleType === 'CAR' ? Car : Bike;
              return (
                <TouchableOpacity
                  key={v.id}
                  activeOpacity={0.85}
                  onPress={() => pickSavedVehicle(v.id)}
                  style={[styles.savedItem, active && styles.cardActive]}
                >
                  {v.photoUrl ? (
                    <Image source={{ uri: v.photoUrl }} style={styles.savedThumb} />
                  ) : (
                    <View style={styles.savedThumbFallback}>
                      <VIcon size={22} color={SUB} strokeWidth={2.2} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.savedName} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={styles.savedMeta} numberOfLines={1}>
                      {[v.licensePlate, v.color].filter(Boolean).join(' · ') || 'Chưa có biển số'}
                    </Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <Check size={13} color="#ffffff" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}

          {/* Nhập nhanh biển số (ẩn khi đã chọn 1 xe đã lưu) */}
          {selectedVehicleId === null && (
            <TextInput
              placeholder={savedList.length > 0 ? 'Hoặc nhập biển số xe khác' : 'Biển số xe (nếu có)'}
              placeholderTextColor={SUB}
              value={plate}
              onChangeText={setPlate}
              style={styles.input}
              autoCapitalize="characters"
            />
          )}

          <View style={styles.photoRow}>
            {photos.map((uri) => {
              const st = photoStatus[uri];
              return (
                <View key={uri} style={styles.thumbWrap}>
                  <Image source={{ uri }} style={styles.thumb} />
                  {st === 'uploading' && (
                    <View style={styles.thumbOverlay}>
                      <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                  )}
                  {st === 'done' && (
                    <View style={[styles.thumbBadge, { backgroundColor: '#16a34a' }]}>
                      <Check size={12} color="#ffffff" strokeWidth={3} />
                    </View>
                  )}
                  {st === 'error' && (
                    <View style={[styles.thumbBadge, { backgroundColor: DANGER }]}>
                      <X size={12} color="#ffffff" strokeWidth={3} />
                    </View>
                  )}
                  {!sending && (
                    <TouchableOpacity
                      style={styles.thumbRemove}
                      onPress={() => removePhoto(uri)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <X size={12} color="#ffffff" strokeWidth={3} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            {photos.length < MAX_PHOTOS && !sending && (
              <TouchableOpacity style={styles.addPhoto} onPress={addPhoto} activeOpacity={0.8}>
                <Camera size={22} color={BRAND} strokeWidth={2.2} />
                <Text style={styles.addPhotoText}>Thêm ảnh</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 3 — Sự cố (có cấu trúc) */}
          <Text style={[styles.qTitle, { marginTop: 24 }]}>Xe của bạn gặp vấn đề gì?</Text>
          <View style={styles.issueGrid}>
            {ISSUES.map(({ key, label, Icon, danger }) => {
              const active = issue === key;
              const activeStyle = danger ? styles.issueActiveDanger : styles.cardActive;
              const iconColor = active ? (danger ? DANGER : BRAND) : SUB;
              const textStyle = active ? (danger ? { color: DANGER_INK } : { color: BRAND }) : null;
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.85}
                  onPress={() => setIssue(key)}
                  style={[styles.issueChip, active && activeStyle]}
                >
                  <Icon size={18} color={iconColor} strokeWidth={2.2} />
                  <Text style={[styles.issueText, textStyle]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isAccident && (
            <View style={styles.accidentBanner}>
              <View style={styles.accidentIcon}>
                <PhoneCall size={16} color="#ffffff" strokeWidth={2.4} />
              </View>
              <Text style={styles.accidentText}>
                Nếu có người bị thương, hãy gọi cấp cứu 115 ngay trước khi chờ cứu hộ.
              </Text>
            </View>
          )}

          {/* 4 — Số điện thoại liên hệ */}
          <Text style={[styles.qTitle, { marginTop: 24 }]}>Số điện thoại liên hệ</Text>
          <View style={styles.phoneField}>
            <Phone size={18} color={SUB} strokeWidth={2.2} />
            <TextInput
              placeholder="Số điện thoại"
              placeholderTextColor={SUB}
              value={phone}
              onChangeText={setPhone}
              style={styles.phoneInput}
              keyboardType="phone-pad"
            />
          </View>

          {/* 5 — Thanh toán */}
          <Text style={[styles.qTitle, { marginTop: 24 }]}>Phương thức thanh toán</Text>
          <View style={styles.payRow}>
            {PAYMENTS.map(({ key, label, Icon }) => {
              const active = payment === key;
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.85}
                  onPress={() => setPayment(key)}
                  style={[styles.payCard, active && styles.cardActive]}
                >
                  <Icon size={20} color={active ? BRAND : SUB} strokeWidth={2.2} />
                  <Text style={[styles.payLabel, active && { color: BRAND }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 6 — Ghi chú thêm */}
          <View style={styles.sectionHead}>
            <Text style={[styles.qTitle, { marginTop: 24 }]}>Ghi chú thêm</Text>
            <Text style={[styles.optional, { marginTop: 24 }]}>Không bắt buộc</Text>
          </View>
          <View style={styles.noteBox}>
            <TextInput
              placeholder="Ví dụ: xe tắt máy giữa đường, đang ở gần cây xăng..."
              placeholderTextColor={SUB}
              value={note}
              onChangeText={(t) => t.length <= NOTE_MAX && setNote(t)}
              style={styles.noteInput}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.noteCount}>
              {note.length}/{NOTE_MAX}
            </Text>
          </View>

          {/*
            Ước tính chi phí: chỉ chốt sau khi gara nhận (rescueFee tính server-side).
            Trước bước đó chưa có cơ sở tính THẬT → ẩn, không bịa số.
          */}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky bottom */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Text style={[styles.summary, canSend && styles.summaryReady]} numberOfLines={1}>
          {summary}
        </Text>
        <TouchableOpacity
          style={[styles.sendBtn, (!canSend || sending) && styles.sendBtnDisabled]}
          onPress={onSend}
          activeOpacity={canSend && !sending ? 0.9 : 1}
          disabled={!canSend || sending}
        >
          {sending ? (
            <ActivityIndicator color="#ffffff" />
          ) : isPickGarageMode ? (
            <ChevronRight size={20} color={canSend ? '#ffffff' : SUB} strokeWidth={2.4} />
          ) : (
            <Siren size={20} color={canSend ? '#ffffff' : SUB} strokeWidth={2.4} />
          )}
          <Text style={[styles.sendText, !canSend && !sending && styles.sendTextDisabled]}>
            {sending
              ? isPickGarageMode
                ? 'Đang chuẩn bị...'
                : 'Đang gửi...'
              : isPickGarageMode
              ? 'Tiếp theo — Chọn gara'
              : 'Gửi yêu cầu cứu hộ'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  headerSafe: { backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  roundBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: LINE,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: INK },
  stepStrip: {
    flex: 1, height: 44, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: LINE,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14,
  },
  stepText: { fontSize: 12, fontWeight: '800', color: INK },
  segs: { flexDirection: 'row', gap: 4 },
  seg: { width: 16, height: 4, borderRadius: 12, backgroundColor: LINE },
  segOn: { backgroundColor: BRAND },

  body: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 },
  qTitle: { fontSize: 16, fontWeight: '800', color: INK },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 },
  optional: { fontSize: 12, fontWeight: '600', color: SUB },

  cardActive: { borderColor: BRAND, backgroundColor: '#fff4ed' },

  /* Vehicle */
  vehicleRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  vehicleCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderWidth: 1, borderColor: LINE, borderRadius: 12, padding: 14,
  },
  vehicleIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff4ed',
    alignItems: 'center', justifyContent: 'center',
  },
  vehicleIconActive: { backgroundColor: BRAND },
  vehicleLabel: { fontSize: 16, fontWeight: '800', color: INK },

  /* Saved vehicles */
  vehStateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  vehStateText: { fontSize: 12, fontWeight: '600', color: SUB },
  vehRetry: { fontSize: 12, fontWeight: '800', color: BRAND },
  savedItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderWidth: 1, borderColor: LINE, borderRadius: 12, padding: 10, marginTop: 12,
  },
  savedThumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#ececeb' },
  savedThumbFallback: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: FIELD,
    alignItems: 'center', justifyContent: 'center',
  },
  savedName: { fontSize: 14, fontWeight: '800', color: INK },
  savedMeta: { fontSize: 12, fontWeight: '600', color: SUB, marginTop: 2 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#d6d3d1',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: BRAND, backgroundColor: BRAND },

  /* Inputs */
  input: {
    backgroundColor: FIELD, borderWidth: 1, borderColor: LINE, borderRadius: 12,
    paddingHorizontal: 14, height: 48, fontSize: 14, fontWeight: '600', color: INK, marginTop: 12,
  },

  /* Photos */
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  thumbWrap: { width: 92, height: 92 },
  thumb: { width: 92, height: 92, borderRadius: 12, backgroundColor: '#ececeb' },
  thumbOverlay: {
    ...StyleSheet.absoluteFill, borderRadius: 12,
    backgroundColor: 'rgba(28,25,23,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  thumbBadge: {
    position: 'absolute', bottom: 6, left: 6, width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbRemove: {
    position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: INK, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: CARD,
  },
  addPhoto: {
    width: 92, height: 92, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#fdba74',
    backgroundColor: '#fff4ed', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addPhotoText: { fontSize: 12, fontWeight: '800', color: BRAND },

  /* Issues */
  issueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  issueChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48,
    backgroundColor: CARD, borderWidth: 1, borderColor: LINE, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, width: '47.5%', flexGrow: 1,
  },
  issueActiveDanger: { borderColor: DANGER, backgroundColor: DANGER_BG },
  issueText: { fontSize: 14, fontWeight: '600', color: INK },

  /* Accident */
  accidentBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: DANGER_BG,
    borderRadius: 12, padding: 14, marginTop: 12,
  },
  accidentIcon: {
    width: 32, height: 32, borderRadius: 12, backgroundColor: DANGER,
    alignItems: 'center', justifyContent: 'center',
  },
  accidentText: { flex: 1, fontSize: 13, fontWeight: '600', color: DANGER_INK, lineHeight: 18 },

  /* Phone */
  phoneField: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: FIELD,
    borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingHorizontal: 14, height: 48, marginTop: 12,
  },
  phoneInput: { flex: 1, fontSize: 14, fontWeight: '600', color: INK, padding: 0 },

  /* Payment */
  payRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  payCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: CARD, borderWidth: 1, borderColor: LINE, borderRadius: 12, height: 52,
  },
  payLabel: { fontSize: 14, fontWeight: '800', color: INK },

  /* Note */
  noteBox: {
    backgroundColor: FIELD, borderWidth: 1, borderColor: LINE, borderRadius: 12,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, marginTop: 12,
  },
  noteInput: { fontSize: 14, fontWeight: '600', color: INK, minHeight: 76, lineHeight: 20 },
  noteCount: { alignSelf: 'flex-end', fontSize: 11, fontWeight: '600', color: SUB },

  /* Bottom */
  bottomBar: {
    backgroundColor: CARD, borderTopWidth: 1, borderTopColor: LINE,
    paddingHorizontal: 16, paddingTop: 12,
    shadowColor: '#1c1917', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 12,
  },
  summary: { fontSize: 12, fontWeight: '600', color: SUB, marginBottom: 10 },
  summaryReady: { color: INK },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BRAND, borderRadius: 12, height: 52,
  },
  sendBtnDisabled: { backgroundColor: '#ececeb' },
  sendText: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  sendTextDisabled: { color: SUB },
});
