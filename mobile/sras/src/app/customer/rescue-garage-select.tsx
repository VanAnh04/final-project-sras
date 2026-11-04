import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  ChevronDown,
  MapPin,
  Star,
  Clock,
  Banknote,
  Phone,
  ShieldCheck,
  AlertCircle,
  Siren,
  Sparkles,
  Zap,
  CheckCircle2,
  SlidersHorizontal,
  X,
  Check,
  Radio,
} from 'lucide-react-native';
import { garageApi, NearbyGarageDto } from '../../api/garageApi';
import { rescueApi, VehicleType } from '../../api/rescueApi';

const BRAND = '#ea580c';
const BRAND_DEEP = '#c2410c';
const INK = '#1c1917';
const SUB = '#78716c';
const LINE = '#e7e5e4';
const CARD = '#ffffff';
const BG = '#f7f7f5';
const SUCCESS = '#16a34a';
const SUCCESS_BG = '#f0fdf4';
const WARNING = '#d97706';
const WARNING_BG = '#fffbeb';

const RADIUS_PRESETS = [
  { km: 5, label: '≤ 5 km', desc: 'Rất gần (trong khu vực lân cận)' },
  { km: 10, label: '≤ 10 km', desc: 'Gần (~15–20 phút di chuyển)' },
  { km: 15, label: '≤ 15 km', desc: 'Phổ biến cho cứu hộ đô thị' },
  { km: 20, label: '≤ 20 km', desc: 'Mặc định tiêu chuẩn hệ thống' },
  { km: 30, label: '≤ 30 km', desc: 'Mở rộng khu vực ngoại thành' },
  { km: 50, label: '≤ 50 km', desc: 'Bán kính tối đa được phép' },
];

export default function RescueGarageSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    address?: string;
    vehicleType?: string;
    symptom?: string;
    issueType?: string;
    contactPhone?: string;
    paymentMethod?: string;
    customerVehicleId?: string;
    photoUrls?: string;
  }>();

  const lat = params.lat ? parseFloat(params.lat) : NaN;
  const lng = params.lng ? parseFloat(params.lng) : NaN;
  const vehicleType = (params.vehicleType as VehicleType) || 'MOTORBIKE';

  const [garages, setGarages] = useState<NearbyGarageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Bán kính lọc
  const [selectedRadius, setSelectedRadius] = useState<number>(20);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [tempRadius, setTempRadius] = useState<number>(20);
  const [customRadiusInput, setCustomRadiusInput] = useState<string>('');

  const parsedPhotoUrls = useMemo<string[]>(() => {
    if (!params.photoUrls) return [];
    try {
      return JSON.parse(params.photoUrls);
    } catch {
      return [];
    }
  }, [params.photoUrls]);

  const loadGarages = async (radius = selectedRadius) => {
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await garageApi.listNearby(lat, lng, vehicleType, radius);
      const sorted = [...data].sort((a, b) => {
        const scoreA = a.score ?? 0;
        const scoreB = b.score ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
      });
      setGarages(sorted);
    } catch (e: any) {
      console.warn('[rescue-garage-select] fetch error', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGarages(selectedRadius);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRadius]);

  const openFilterModal = () => {
    setTempRadius(selectedRadius);
    const isPreset = RADIUS_PRESETS.some((p) => p.km === selectedRadius);
    setCustomRadiusInput(isPreset ? '' : String(selectedRadius));
    setFilterModalVisible(true);
  };

  const applyFilter = () => {
    let finalKm = tempRadius;
    if (customRadiusInput.trim()) {
      const parsed = parseInt(customRadiusInput.trim(), 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        finalKm = Math.min(50, Math.max(1, parsed));
      }
    }
    setSelectedRadius(finalKm);
    setFilterModalVisible(false);
  };

  const handleSelectGarage = (garage: NearbyGarageDto) => {
    if (submitting) return;

    const feeText = garage.estimatedRescueFee
      ? `${garage.estimatedRescueFee.toLocaleString('vi-VN')} đ`
      : 'Theo biểu phí chuẩn';

    if (!garage.available) {
      Alert.alert(
        `Gara đang bận phục vụ`,
        `${garage.name} hiện đang bận (tạm hết thợ hoặc xe cứu hộ rảnh lúc này).\n\nThời gian tiếp nhận có thể lâu hơn hoặc gara có thể từ chối ca này. Bạn vẫn muốn gửi yêu cầu tới gara?`,
        [
          { text: 'Chọn Gara khác', style: 'cancel' },
          {
            text: 'Vẫn gửi yêu cầu',
            onPress: () => confirmSubmit(garage.id),
          },
        ]
      );
      return;
    }

    Alert.alert(
      `Gửi yêu cầu tới Gara?`,
      `Bạn đang chọn ${garage.name}.\nGara đang có thợ và xe rảnh sẵn sàng, sẽ có 90 giây để phản hồi tiếp nhận.\n\nPhí cứu hộ dự kiến: ${feeText}`,
      [
        { text: 'Chọn lại', style: 'cancel' },
        {
          text: 'Xác nhận gửi',
          onPress: () => confirmSubmit(garage.id),
        },
      ]
    );
  };

  const confirmSubmit = async (garageId: number) => {
    try {
      setSubmitting(true);
      const res = await rescueApi.create({
        vehicleType,
        symptom: params.symptom || 'Cần cứu hộ khẩn cấp',
        pickupLat: lat,
        pickupLng: lng,
        pickupAddress: params.address || undefined,
        issueType: params.issueType || undefined,
        contactPhone: params.contactPhone || undefined,
        paymentMethod: (params.paymentMethod as any) || 'CASH',
        customerVehicleId: params.customerVehicleId ? parseInt(params.customerVehicleId, 10) : undefined,
        photoUrls: parsedPhotoUrls,
        garageId,
      });

      router.replace({
        pathname: '/customer/rescue-tracking',
        params: { id: String(res.id) },
      } as any);
    } catch (e: any) {
      Alert.alert(
        'Không thể gửi yêu cầu',
        e?.response?.data?.message || e?.message || 'Vui lòng thử lại sau.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const goEmergencyFallback = () => {
    Alert.alert(
      'Chuyển sang Cứu hộ khẩn cấp?',
      'Hệ thống sẽ tự động quét bán kính rộng hơn và điều gara gần nhất tiếp nhận ngay.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Gửi cứu hộ khẩn cấp',
          onPress: async () => {
            try {
              setSubmitting(true);
              const res = await rescueApi.create({
                vehicleType,
                symptom: params.symptom || 'Cần cứu hộ khẩn cấp',
                pickupLat: lat,
                pickupLng: lng,
                pickupAddress: params.address || undefined,
                issueType: params.issueType || undefined,
                contactPhone: params.contactPhone || undefined,
                paymentMethod: (params.paymentMethod as any) || 'CASH',
                customerVehicleId: params.customerVehicleId ? parseInt(params.customerVehicleId, 10) : undefined,
                photoUrls: parsedPhotoUrls,
              });
              router.replace({
                pathname: '/customer/rescue-tracking',
                params: { id: String(res.id) },
              } as any);
            } catch (err: any) {
              Alert.alert('Không thể gửi yêu cầu', err?.response?.data?.message || err?.message || 'Thử lại');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.roundBtn}
            onPress={() => router.back()}
            disabled={submitting}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color={INK} strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.stepStrip}>
            <Text style={styles.stepText}>Bước 3/3 · Chọn Gara</Text>
            <View style={styles.segs}>
              <View style={[styles.seg, styles.segOn]} />
              <View style={[styles.seg, styles.segOn]} />
              <View style={[styles.seg, styles.segOn]} />
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Vị trí cứu hộ compact */}
      <View style={styles.addressBar}>
        <View style={styles.addressPin}>
          <MapPin size={16} color={BRAND} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.addressLabel}>Vị trí cứu hộ của bạn</Text>
          <Text style={styles.addressText} numberOfLines={1}>
            {params.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
          </Text>
        </View>
      </View>

      {/* Thanh bộ lọc bán kính + Trạng thái trực tuyến */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterTrigger}
          onPress={openFilterModal}
          activeOpacity={0.8}
        >
          <View style={styles.filterTriggerLeft}>
            <SlidersHorizontal size={15} color={BRAND} strokeWidth={2.4} />
            <Text style={styles.filterTriggerText}>
              Bán kính: <Text style={styles.filterTriggerVal}>≤ {selectedRadius} km</Text>
            </Text>
          </View>
          <ChevronDown size={16} color={SUB} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineBadgeText}>Đang trực tuyến</Text>
        </View>
      </View>

      {/* Danh sách Gara */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadGarages(selectedRadius);
            }}
            tintColor={BRAND}
          />
        }
      >
        <View style={styles.promptHeader}>
          <Text style={styles.promptTitle}>Các Gara trực tuyến gần bạn</Text>
          <Text style={styles.promptSub}>
            Đang hiển thị các Gara đang mở cửa trong bán kính ≤ {selectedRadius} km ({garages.length} gara).
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={BRAND} />
            <Text style={styles.loadingText}>Đang quét danh sách gara trực tuyến...</Text>
          </View>
        ) : garages.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <AlertCircle size={32} color={SUB} strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>Chưa tìm thấy Gara trực tuyến</Text>
            <Text style={styles.emptyDesc}>
              Không có gara nào hỗ trợ {vehicleType === 'CAR' ? 'ô tô' : 'xe máy'} trong bán kính{' '}
              ≤ {selectedRadius} km đang mở cửa trực tuyến.
            </Text>

            <View style={styles.emptyBtnGroup}>
              <TouchableOpacity
                style={styles.expandRadiusBtn}
                onPress={openFilterModal}
                activeOpacity={0.85}
              >
                <SlidersHorizontal size={16} color={BRAND} strokeWidth={2.2} />
                <Text style={styles.expandRadiusText}>Mở rộng bán kính tìm kiếm</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fallbackEmergencyBtn}
                onPress={goEmergencyFallback}
                activeOpacity={0.9}
              >
                <Siren size={18} color="#ffffff" strokeWidth={2.4} />
                <Text style={styles.fallbackEmergencyText}>Chuyển sang Cứu hộ khẩn cấp</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          garages.map((item) => {
            const isAvail = item.available;
            return (
              <View key={item.id} style={styles.garageCard}>
                {/* Header card: Tên + Badge tình trạng */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.garageName}>{item.name}</Text>
                    <Text style={styles.garageAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                  {isAvail ? (
                    <View style={styles.availBadge}>
                      <Zap size={12} color={SUCCESS} strokeWidth={2.6} />
                      <Text style={styles.availText}>Sẵn sàng cứu hộ</Text>
                    </View>
                  ) : (
                    <View style={styles.busyBadge}>
                      <AlertCircle size={12} color={WARNING} strokeWidth={2.4} />
                      <Text style={styles.busyText}>Tạm bận (Hết thợ/xe rảnh)</Text>
                    </View>
                  )}
                </View>

                {/* Thông số: Sao, Khoảng cách, Thời gian tới */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Star size={15} color="#eab308" fill="#eab308" />
                    <Text style={styles.metaTextBold}>
                      {item.avgRating ? item.avgRating.toFixed(1) : 'Mới'}
                    </Text>
                    {item.ratingCount ? (
                      <Text style={styles.metaTextSub}>({item.ratingCount})</Text>
                    ) : null}
                  </View>

                  <View style={styles.metaDot} />

                  <View style={styles.metaItem}>
                    <MapPin size={14} color={SUB} />
                    <Text style={styles.metaTextBold}>{item.distanceKm} km</Text>
                  </View>

                  <View style={styles.metaDot} />

                  <View style={styles.metaItem}>
                    <Clock size={14} color={SUB} />
                    <Text style={styles.metaTextBold}>~{item.estimatedEtaMin} phút</Text>
                  </View>
                  {item.score != null ? (
                    <>
                      <View style={styles.metaDot} />
                      <View style={styles.metaItem}>
                        <Sparkles size={14} color={BRAND} />
                        <Text style={[styles.metaTextBold, { color: BRAND }]}>{item.score.toFixed(1)} đ</Text>
                      </View>
                    </>
                  ) : null}
                </View>

                {/* Ước tính phí cứu hộ */}
                <View style={styles.feeBanner}>
                  <View style={styles.feeLeft}>
                    <Banknote size={16} color={BRAND} strokeWidth={2.2} />
                    <Text style={styles.feeLabel}>Phí cứu hộ dự kiến:</Text>
                  </View>
                  <Text style={styles.feeValue}>
                    {item.estimatedRescueFee
                      ? `${item.estimatedRescueFee.toLocaleString('vi-VN')} đ`
                      : 'Chuẩn quy định'}
                  </Text>
                </View>

                {/* Hotline & Nút chọn */}
                <View style={styles.actionRow}>
                  {item.phone ? (
                    <View style={styles.phoneTag}>
                      <Phone size={13} color={SUB} />
                      <Text style={styles.phoneText}>{item.phone}</Text>
                    </View>
                  ) : <View />}

                  <TouchableOpacity
                    style={styles.selectBtn}
                    onPress={() => handleSelectGarage(item)}
                    activeOpacity={0.85}
                    disabled={submitting}
                  >
                    <CheckCircle2 size={16} color="#ffffff" strokeWidth={2.4} />
                    <Text style={styles.selectBtnText}>Chọn Gara này</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* POPUP MODAL LỌC BÁN KÍNH <= */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setFilterModalVisible(false)}
          />

          <View style={styles.modalSheet}>
            {/* Header Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <SlidersHorizontal size={18} color={BRAND} strokeWidth={2.4} />
                <Text style={styles.modalTitle}>Lọc theo bán kính (≤ km)</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setFilterModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={INK} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Chỉ hiển thị các Gara đang hoạt động trực tuyến nằm trong phạm vi bạn chọn.
            </Text>

            {/* Danh sách các mốc định sẵn */}
            <View style={styles.presetList}>
              {RADIUS_PRESETS.map((p) => {
                const active = tempRadius === p.km && !customRadiusInput;
                return (
                  <TouchableOpacity
                    key={p.km}
                    style={[styles.presetItem, active && styles.presetItemActive]}
                    onPress={() => {
                      setTempRadius(p.km);
                      setCustomRadiusInput('');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.presetLeft}>
                      <View style={[styles.presetRadio, active && styles.presetRadioActive]}>
                        {active && <View style={styles.presetRadioDot} />}
                      </View>
                      <View>
                        <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>
                          {p.label}
                        </Text>
                        <Text style={styles.presetDesc}>{p.desc}</Text>
                      </View>
                    </View>
                    {active && <Check size={18} color={BRAND} strokeWidth={2.6} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Nhập bán kính tùy chỉnh */}
            <View style={styles.customBox}>
              <Text style={styles.customLabel}>Hoặc nhập số km tùy chỉnh (tối đa 50 km):</Text>
              <View style={styles.customInputRow}>
                <Text style={styles.customPrefix}>≤</Text>
                <TextInput
                  style={styles.customInput}
                  keyboardType="numeric"
                  placeholder="Ví dụ: 12"
                  placeholderTextColor={SUB}
                  value={customRadiusInput}
                  onChangeText={(val) => {
                    setCustomRadiusInput(val);
                    const n = parseInt(val, 10);
                    if (!Number.isNaN(n) && n > 0) {
                      setTempRadius(Math.min(50, n));
                    }
                  }}
                  maxLength={2}
                />
                <Text style={styles.customSuffix}>km</Text>
              </View>
            </View>

            {/* Nút Áp dụng */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setFilterModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={applyFilter}
                activeOpacity={0.9}
              >
                <Text style={styles.modalApplyText}>
                  Áp dụng (≤ {customRadiusInput.trim() || tempRadius} km)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Loading overlay khi đang submit */}
      {submitting && (
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator size="large" color={BRAND} />
            <Text style={styles.overlayText}>Đang gửi yêu cầu tới Gara...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  headerSafe: { backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepStrip: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  stepText: { fontSize: 13, fontWeight: '800', color: INK },
  segs: { flexDirection: 'row', gap: 4 },
  seg: { width: 16, height: 4, borderRadius: 12, backgroundColor: LINE },
  segOn: { backgroundColor: BRAND },

  /* Address Bar */
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
  },
  addressPin: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fff4ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressLabel: { fontSize: 11, fontWeight: '600', color: SUB },
  addressText: { fontSize: 13, fontWeight: '800', color: INK, marginTop: 1 },

  /* Filter Bar */
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  filterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CARD,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterTriggerText: { fontSize: 13, fontWeight: '600', color: SUB },
  filterTriggerVal: { fontSize: 13, fontWeight: '800', color: BRAND_DEEP },

  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SUCCESS_BG,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: SUCCESS,
  },
  onlineBadgeText: { fontSize: 12, fontWeight: '700', color: SUCCESS },

  /* List */
  listContent: { paddingHorizontal: 16, paddingTop: 10 },
  promptHeader: { marginBottom: 14 },
  promptTitle: { fontSize: 18, fontWeight: '800', color: INK },
  promptSub: { fontSize: 13, fontWeight: '500', color: SUB, marginTop: 4, lineHeight: 18 },

  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '600', color: SUB },

  /* Garage Card */
  garageCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  garageName: { fontSize: 16, fontWeight: '800', color: INK },
  garageAddress: { fontSize: 12, fontWeight: '500', color: SUB, marginTop: 2 },
  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SUCCESS_BG,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  availText: { fontSize: 11, fontWeight: '700', color: SUCCESS },
  busyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: WARNING_BG,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  busyText: { fontSize: 11, fontWeight: '700', color: WARNING },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f4',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTextBold: { fontSize: 13, fontWeight: '800', color: INK },
  metaTextSub: { fontSize: 12, fontWeight: '500', color: SUB },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#d6d3d1' },

  feeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 12,
  },
  feeLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  feeLabel: { fontSize: 12, fontWeight: '700', color: BRAND_DEEP },
  feeValue: { fontSize: 14, fontWeight: '800', color: BRAND },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  phoneTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  phoneText: { fontSize: 12, fontWeight: '600', color: SUB },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  selectBtnText: { fontSize: 14, fontWeight: '800', color: '#ffffff' },

  /* Empty state */
  emptyCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: INK },
  emptyDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: SUB,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 20,
  },
  emptyBtnGroup: {
    width: '100%',
    gap: 10,
  },
  expandRadiusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingVertical: 12,
    borderRadius: 12,
  },
  expandRadiusText: { fontSize: 14, fontWeight: '700', color: BRAND },
  fallbackEmergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND,
    paddingVertical: 14,
    borderRadius: 14,
  },
  fallbackEmergencyText: { fontSize: 14, fontWeight: '800', color: '#ffffff' },

  /* Modal Popup Filter */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,25,23,0.55)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalHeaderTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: INK,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: SUB,
    lineHeight: 18,
    marginBottom: 16,
  },

  /* Preset list */
  presetList: {
    gap: 8,
    marginBottom: 16,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: BG,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  presetItemActive: {
    backgroundColor: '#fff7ed',
    borderColor: BRAND,
  },
  presetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  presetRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d6d3d1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetRadioActive: {
    borderColor: BRAND,
  },
  presetRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND,
  },
  presetLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: INK,
  },
  presetLabelActive: {
    color: BRAND_DEEP,
    fontWeight: '800',
  },
  presetDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: SUB,
    marginTop: 1,
  },

  /* Custom input */
  customBox: {
    backgroundColor: BG,
    padding: 12,
    borderRadius: 14,
    marginBottom: 20,
  },
  customLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SUB,
    marginBottom: 8,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: 12,
    height: 44,
    gap: 6,
  },
  customPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: BRAND,
  },
  customInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: INK,
    padding: 0,
  },
  customSuffix: {
    fontSize: 13,
    fontWeight: '700',
    color: SUB,
  },

  /* Modal Footer */
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: SUB,
  },
  modalApplyBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApplyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Overlay */
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28,25,23,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  overlayBox: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  overlayText: { fontSize: 14, fontWeight: '700', color: INK },
});
