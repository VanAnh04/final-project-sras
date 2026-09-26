import { useMemo, useState } from 'react';
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
import {
  ChevronLeft,
  Car,
  Bike,
  Fuel,
  Disc3,
  BatteryWarning,
  Wrench,
  AlertTriangle,
  MoreHorizontal,
  PhoneCall,
  ShieldCheck,
  Check,
  Camera,
  X,
  Siren,
} from 'lucide-react-native';

const CURRENT_STEP = 2;
const TOTAL_STEPS = 3;
const NOTE_MAX = 200;

type VehicleKey = 'CAR' | 'MOTORBIKE';
type IssueKey =
  | 'OUT_OF_FUEL'
  | 'FLAT_TIRE'
  | 'DEAD_BATTERY'
  | 'ENGINE_FAILURE'
  | 'ACCIDENT'
  | 'OTHER';

const VEHICLES: { key: VehicleKey; label: string; Icon: any }[] = [
  { key: 'MOTORBIKE', label: 'Xe máy', Icon: Bike },
  { key: 'CAR', label: 'Ô tô', Icon: Car },
];

type SavedVehicle = { id: string; type: VehicleKey; name: string; plate: string; color: string };

// Xe đã lưu trong hồ sơ người dùng — sẽ lấy từ API. Chưa có backend nên tạm rỗng.
const SAVED_VEHICLES: SavedVehicle[] = [];

const MAX_PHOTOS = 3;

const ISSUES: { key: IssueKey; label: string; Icon: any; danger?: boolean }[] = [
  { key: 'OUT_OF_FUEL', label: 'Hết xăng', Icon: Fuel },
  { key: 'FLAT_TIRE', label: 'Thủng lốp', Icon: Disc3 },
  { key: 'DEAD_BATTERY', label: 'Hết ắc-quy', Icon: BatteryWarning },
  { key: 'ENGINE_FAILURE', label: 'Chết máy', Icon: Wrench },
  { key: 'ACCIDENT', label: 'Tai nạn', Icon: AlertTriangle, danger: true },
  { key: 'OTHER', label: 'Sự cố khác', Icon: MoreHorizontal },
];

export default function RescueDescribeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();

  const [vehicle, setVehicle] = useState<VehicleKey | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [issue, setIssue] = useState<IssueKey | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const savedList = vehicle ? SAVED_VEHICLES.filter((v) => v.type === vehicle) : [];
  const selectedVehicle = savedList.find((v) => v.id === vehicleId) ?? null;

  // Nhận diện xe: chọn xe đã lưu, HOẶC đính kèm ít nhất 1 ảnh.
  const identified = selectedVehicle !== null || photos.length > 0;
  const canContinue = vehicle !== null && issue !== null && identified;
  const isAccident = issue === 'ACCIDENT';
  const progress = (CURRENT_STEP / TOTAL_STEPS) * 100;

  const pickVehicleType = (key: VehicleKey) => {
    setVehicle(key);
    setVehicleId(null); // đổi loại xe thì bỏ chọn xe cũ
  };

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

  const removePhoto = (uri: string) => setPhotos((p) => p.filter((x) => x !== uri));

  const summary = useMemo(() => {
    if (!canContinue) return 'Chọn xe/ảnh và tình trạng để gửi yêu cầu';
    const i = ISSUES.find((x) => x.key === issue)?.label;
    const vLabel = selectedVehicle
      ? selectedVehicle.name
      : `${VEHICLES.find((x) => x.key === vehicle)?.label} · ${photos.length} ảnh`;
    return `${vLabel} · ${i}`;
  }, [canContinue, selectedVehicle, vehicle, photos.length, issue]);

  const submit = async () => {
    const lat = params.lat ? parseFloat(params.lat) : NaN;
    const lng = params.lng ? parseFloat(params.lng) : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      Alert.alert('Thiếu vị trí', 'Không xác định được toạ độ. Vui lòng quay lại chọn vị trí.');
      return;
    }
    try {
      setSending(true);

      // Upload ảnh lấy URL thật (bỏ qua ảnh lỗi thay vì chặn cả yêu cầu).
      const urls: string[] = [];
      for (const uri of photos) {
        try {
          urls.push(await rescueApi.uploadPhoto(uri));
        } catch {
          // ảnh lỗi -> bỏ qua
        }
      }

      const issueLabel = ISSUES.find((x) => x.key === issue)?.label ?? '';
      const symptom = note.trim() ? `${issueLabel} - ${note.trim()}` : issueLabel;

      const res = await rescueApi.create({
        vehicleType: vehicle!,
        symptom,
        pickupLat: lat,
        pickupLng: lng,
        photoUrls: urls,
      });

      router.replace({
        pathname: '/customer/rescue-tracking',
        params: { id: String(res.id) },
      } as any);
    } catch (e: any) {
      Alert.alert(
        'Không gửi được yêu cầu',
        e?.response?.data?.message || e?.message || 'Vui lòng thử lại.'
      );
    } finally {
      setSending(false);
    }
  };

  const onSend = () => {
    if (!canContinue || sending) return;
    Alert.alert(
      'Gửi yêu cầu cứu hộ?',
      'Hệ thống sẽ tìm gara gần nhất và điều tới vị trí của bạn.',
      [
        { text: 'Kiểm tra lại', style: 'cancel' },
        { text: 'Gửi ngay', style: 'default', onPress: submit },
      ]
    );
  };

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
          <Text style={styles.headerTitle}>Mô tả sự cố</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Step + progress */}
        <View style={styles.stepBlock}>
          <View style={styles.stepRow}>
            <Text style={styles.stepLabel}>
              BƯỚC {String(CURRENT_STEP).padStart(2, '0')} / {String(TOTAL_STEPS).padStart(2, '0')}
            </Text>
            <Text style={styles.stepName}>Mô tả sự cố</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1 — Phương tiện */}
          <Text style={styles.qTitle}>Bạn đang dùng phương tiện gì?</Text>
          <Text style={styles.qSub}>Giúp đội cứu hộ mang đúng thiết bị.</Text>

          <View style={styles.vehicleRow}>
            {VEHICLES.map(({ key, label, Icon }) => {
              const active = vehicle === key;
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.85}
                  onPress={() => pickVehicleType(key)}
                  style={[styles.vehicleCard, active && styles.vehicleCardActive]}
                >
                  <View style={[styles.vehicleIcon, active && styles.vehicleIconActive]}>
                    <Icon size={24} color={active ? '#ffffff' : '#ea580c'} strokeWidth={2.2} />
                  </View>
                  <Text style={[styles.vehicleLabel, active && styles.vehicleLabelActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sau khi chọn loại xe: xe đã lưu (nếu có) + ảnh xe */}
          {vehicle && (
            <View style={styles.savedBlock}>
              {savedList.length > 0 && (
                <>
                  <Text style={styles.savedTitle}>Chọn xe của bạn</Text>
                  {savedList.map((v) => {
                    const active = vehicleId === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        activeOpacity={0.85}
                        onPress={() => setVehicleId(v.id)}
                        style={[styles.savedItem, active && styles.savedItemActive]}
                      >
                        <View style={[styles.plateTag, active && styles.plateTagActive]}>
                          <Text style={[styles.plateText, active && styles.plateTextActive]}>
                            {v.plate}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.savedName}>{v.name}</Text>
                          <Text style={styles.savedColor}>{v.color}</Text>
                        </View>
                        <View style={[styles.radio, active && styles.radioActive]}>
                          {active && <Check size={13} color="#ffffff" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {/* Ảnh xe — giúp gara nhận diện, nhất là khi chưa lưu xe */}
              <View style={styles.photoHeader}>
                <Text style={styles.savedTitle}>Ảnh xe của bạn</Text>
                {!selectedVehicle && <Text style={styles.required}>Bắt buộc</Text>}
              </View>
              <Text style={styles.photoSub}>
                Chụp hoặc chọn ảnh để đội cứu hộ nhận diện đúng xe của bạn.
              </Text>

              <View style={styles.photoRow}>
                {photos.map((uri) => (
                  <View key={uri} style={styles.thumbWrap}>
                    <Image source={{ uri }} style={styles.thumb} />
                    <TouchableOpacity
                      style={styles.thumbRemove}
                      onPress={() => removePhoto(uri)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <X size={12} color="#ffffff" strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <TouchableOpacity style={styles.addPhoto} onPress={addPhoto} activeOpacity={0.8}>
                    <Camera size={22} color="#ea580c" strokeWidth={2.2} />
                    <Text style={styles.addPhotoText}>Thêm ảnh</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* 2 — Tình trạng */}
          <Text style={[styles.qTitle, { marginTop: 26 }]}>Xe của bạn gặp vấn đề gì?</Text>
          <Text style={styles.qSub}>Chọn tình trạng gần đúng nhất.</Text>

          <View style={styles.chipGrid}>
            {ISSUES.map(({ key, label, Icon, danger }) => {
              const active = issue === key;
              const activeStyle = danger ? styles.chipActiveDanger : styles.chipActive;
              const activeText = danger ? styles.chipTextActiveDanger : styles.chipTextActive;
              const iconColor = active ? (danger ? '#dc2626' : '#ea580c') : '#64748b';
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.85}
                  onPress={() => setIssue(key)}
                  style={[styles.chip, active && activeStyle]}
                >
                  <Icon size={18} color={iconColor} strokeWidth={2.3} />
                  <Text style={[styles.chipText, active && activeText]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cảnh báo tai nạn — trạng thái ngữ nghĩa, không phải trang trí */}
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

          {/* 3 — Ghi chú */}
          <View style={styles.noteHeader}>
            <Text style={[styles.qTitle, { marginTop: 26 }]}>Mô tả thêm</Text>
            <Text style={styles.optional}>Không bắt buộc</Text>
          </View>

          <View style={styles.noteBox}>
            <TextInput
              placeholder="Ví dụ: xe tắt máy giữa đường, không đề được, đang ở gần cây xăng..."
              placeholderTextColor="#94a3b8"
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

          <View style={styles.trustRow}>
            <ShieldCheck size={14} color="#059669" strokeWidth={2.4} />
            <Text style={styles.trustText}>Thông tin chỉ dùng để điều phối cứu hộ.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom action */}
      <View style={styles.bottomCard}>
        <Text style={[styles.summary, canContinue && styles.summaryReady]} numberOfLines={1}>
          {summary}
        </Text>
        <TouchableOpacity
          style={[styles.continueBtn, (!canContinue || sending) && styles.continueBtnDisabled]}
          onPress={onSend}
          activeOpacity={canContinue && !sending ? 0.9 : 1}
          disabled={!canContinue || sending}
        >
          {sending ? (
            <ActivityIndicator color="#94a3b8" />
          ) : (
            <Siren size={20} color={canContinue ? '#ffffff' : '#94a3b8'} strokeWidth={2.4} />
          )}
          <Text style={[styles.continueText, (!canContinue || sending) && styles.continueTextDisabled]}>
            {sending ? 'Đang gửi...' : 'Gửi yêu cầu cứu hộ'}
          </Text>
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
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#ea580c' },

  stepBlock: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepLabel: { fontSize: 13, fontWeight: '900', color: '#ea580c', letterSpacing: 0.4 },
  stepName: { fontSize: 12.5, fontWeight: '700', color: '#334155' },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#f1f5f9',
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: '#ea580c' },

  body: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  qTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', letterSpacing: 0.2 },
  qSub: { fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 18 },

  /* Vehicle */
  vehicleRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  vehicleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  vehicleCardActive: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  vehicleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconActive: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  vehicleLabel: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  vehicleLabelActive: { color: '#c2410c' },

  /* Saved vehicles */
  savedBlock: { marginTop: 18 },
  savedTitle: { fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 10 },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  savedItemActive: { borderColor: '#ea580c', backgroundColor: '#fff7ed' },
  plateTag: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  plateTagActive: { backgroundColor: '#ffedd5' },
  plateText: { fontSize: 12.5, fontWeight: '900', color: '#334155', letterSpacing: 0.3 },
  plateTextActive: { color: '#c2410c' },
  savedName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  savedColor: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: '#ea580c', backgroundColor: '#ea580c' },
  /* Photos */
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  required: { fontSize: 11, fontWeight: '800', color: '#ea580c', letterSpacing: 0.3 },
  photoSub: { fontSize: 12.5, color: '#64748b', marginTop: 4, marginBottom: 12, lineHeight: 18 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumbWrap: { width: 92, height: 92 },
  thumb: { width: 92, height: 92, borderRadius: 14, backgroundColor: '#f1f5f9' },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  addPhoto: {
    width: 92,
    height: 92,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: { fontSize: 12, fontWeight: '800', color: '#ea580c' },

  /* Issue chips */
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: '47%',
  },
  chipActive: { borderColor: '#ea580c', backgroundColor: '#fff7ed' },
  chipActiveDanger: { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
  chipText: { fontSize: 14, fontWeight: '700', color: '#334155' },
  chipTextActive: { color: '#c2410c', fontWeight: '800' },
  chipTextActiveDanger: { color: '#b91c1c', fontWeight: '800' },

  /* Accident banner */
  accidentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  accidentIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accidentText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#991b1b', lineHeight: 18 },

  /* Note */
  noteHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  optional: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 2 },
  noteBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    marginTop: 12,
  },
  noteInput: { fontSize: 14, color: '#0f172a', minHeight: 84, lineHeight: 20 },
  noteCount: { alignSelf: 'flex-end', fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 },
  trustText: { fontSize: 12, fontWeight: '600', color: '#64748b' },

  /* Bottom */
  bottomCard: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 26,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 10,
  },
  summary: { fontSize: 12.5, color: '#94a3b8', fontWeight: '600', marginBottom: 10 },
  summaryReady: { color: '#334155' },
  continueBtn: {
    flexDirection: 'row',
    gap: 9,
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  continueBtnDisabled: {
    backgroundColor: '#e2e8f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueText: { fontSize: 15, fontWeight: '900', color: '#ffffff', letterSpacing: 0.3 },
  continueTextDisabled: { color: '#94a3b8' },
});
