import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Bell,
  CheckCircle2,
  Search,
  Camera,
  Check,
  ChevronLeft,
  ImageIcon,
  Car,
  MapPin,
  Plus,
  Wrench,
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto } from '../../api/rescueApi';
import { garageApi } from '../../api/garageApi';
import { resolveFileUrl } from '../../api/axiosClient';
import { formatVnd } from '../../utils/rescueFee';

const BRAND_ORANGE = '#FF5500';
const GREEN = '#16a34a';
const INK = '#1e293b';
const SUB = '#64748b';
const LINE = '#e2e8f0';

interface ServiceItem {
  id: number;
  name: string;
  price: number;
  selected: boolean;
  code?: string;
}

export default function CreateQuoteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const requestId = params.id ? parseInt(params.id, 10) : NaN;

  const [job, setJob] = useState<RescueRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Ảnh minh chứng hiện trường
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pickerModalVisible, setPickerModalVisible] = useState(false);

  // Danh sách dịch vụ lấy từ Gara / Admin
  const [services, setServices] = useState<ServiceItem[]>([]);

  // 1. Tải thông tin đơn cứu hộ
  useEffect(() => {
    if (Number.isNaN(requestId)) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await rescueApi.getOne(requestId);
        if (alive) {
          setJob(res);
          if (res.photos && res.photos.length > 0) {
            setPhotoUri(resolveFileUrl(res.photos[0]) ?? null);
          }
        }
      } catch (e) {
        console.warn('Lỗi tải thông tin ca cứu hộ:', e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [requestId]);

  // 2. Tải danh sách dịch vụ do Gara Admin / Admin cấu hình
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingServices(true);
        // Thử lấy danh sách dịch vụ cấu hình riêng của Gara trước
        let rawList: any[] = [];
        try {
          rawList = await garageApi.listGarageServices();
        } catch {
          rawList = [];
        }

        // Nếu Gara chưa cấu hình riêng, lấy danh mục dịch vụ chuẩn của hệ thống
        if (!rawList || rawList.length === 0) {
          rawList = await garageApi.listServices();
        }

        if (alive) {
          if (rawList && rawList.length > 0) {
            const mapped: ServiceItem[] = rawList
              .filter((item: any) => item.isActive !== false)
              .map((item: any) => {
                const name = item.serviceName || item.name || 'Dịch vụ sửa chữa';
                const price = item.price || item.minPrice || item.maxPrice || 200000;
                return {
                  id: item.serviceId || item.id,
                  name,
                  price,
                  selected: false,
                  code: item.serviceCode || item.code,
                };
              });
            setServices(mapped);
          } else {
            // Fallback an toàn nếu chưa tạo dịch vụ nào
            setServices([
              { id: 1, name: 'Thay lốp dự phòng', price: 350000, selected: false },
              { id: 2, name: 'Kích bình ắc quy', price: 200000, selected: false },
              { id: 3, name: 'Giao xăng khẩn cấp', price: 150000, selected: false },
              { id: 4, name: 'Cứu hộ kéo xe', price: 800000, selected: false },
              { id: 5, name: 'Vá lốp lưu động', price: 120000, selected: false },
            ]);
          }
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách dịch vụ:', err);
        if (alive) {
          setServices([
            { id: 1, name: 'Thay lốp dự phòng', price: 350000, selected: false },
            { id: 2, name: 'Kích bình ắc quy', price: 200000, selected: false },
            { id: 3, name: 'Giao xăng khẩn cấp', price: 150000, selected: false },
            { id: 4, name: 'Cứu hộ kéo xe', price: 800000, selected: false },
          ]);
        }
      } finally {
        if (alive) setLoadingServices(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const toggleService = (id: number) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  // Chụp ảnh trực tiếp bằng Camera
  const handleTakePhoto = async () => {
    setPickerModalVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền máy ảnh', 'Vui lòng cấp quyền truy cập Camera để chụp ảnh minh chứng hiện trường.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      const uri = res.assets[0].uri;
      setPhotoUri(uri);
      uploadEvidencePhoto(uri);
    }
  };

  // Chọn ảnh từ Thư viện
  const handlePickFromLibrary = async () => {
    setPickerModalVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền thư viện', 'Vui lòng cấp quyền truy cập thư viện ảnh để chọn minh chứng.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      const uri = res.assets[0].uri;
      setPhotoUri(uri);
      uploadEvidencePhoto(uri);
    }
  };

  const uploadEvidencePhoto = async (uri: string) => {
    try {
      setUploadingPhoto(true);
      await rescueApi.uploadPhoto(uri);
    } catch (err) {
      console.warn('Lỗi tải ảnh lên server:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const selectedServices = services.filter((s) => s.selected);
  const totalRepairPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendQuote = async () => {
    if (!photoUri) {
      Alert.alert('Chưa có ảnh minh chứng', 'Vui lòng chụp ảnh minh chứng tình trạng xe trước khi gửi báo giá.');
      return;
    }

    if (selectedServices.length === 0) {
      Alert.alert('Chưa chọn dịch vụ', 'Vui lòng chọn ít nhất 1 hạng mục dịch vụ/sửa chữa để gửi báo giá cho khách.');
      return;
    }

    try {
      setSubmitting(true);
      let serverPhotoUrl = photoUri;
      if (photoUri && (photoUri.startsWith('file://') || photoUri.startsWith('ph://') || photoUri.startsWith('content://'))) {
        try {
          serverPhotoUrl = await rescueApi.uploadPhoto(photoUri);
        } catch (upErr) {
          console.warn('Lỗi upload ảnh minh chứng:', upErr);
        }
      }

      if (Number.isFinite(requestId)) {
        await rescueApi.submitQuote(requestId, {
          photoUrls: serverPhotoUrl ? [serverPhotoUrl] : [],
          repairFee: totalRepairPrice,
          inspectionFee: 100000,
          repairItems: selectedServices,
        });
      }

      Alert.alert(
        'Gửi báo giá thành công!',
        `Báo giá tổng cộng ${formatVnd(totalRepairPrice)} đã được gửi tới khách hàng. Đang chờ khách xác nhận.`,
        [
          {
            text: 'Theo dõi tiến trình',
            onPress: () => {
              router.push({
                pathname: '/garage-staff/repair-progress',
                params: {
                  id: String(requestId),
                  selectedServices: JSON.stringify(selectedServices),
                  photoUri: photoUri || '',
                },
              });
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể gửi báo giá lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>SR</Text>
          </View>
          <Text style={styles.headerTitle}>Thợ sửa chữa SRAS</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn}>
          <Bell size={20} color="#EA580C" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Mã yêu cầu & Badge Ưu tiên */}
        <View style={styles.requestCodeRow}>
          <View>
            <Text style={styles.requestCodeLabel}>MÃ YÊU CẦU</Text>
            <Text style={styles.requestCodeValue}>
              {job?.code ? `#${job.code}` : `#TK-${requestId || '88291'}`}
            </Text>
          </View>
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>ƯU TIÊN</Text>
          </View>
        </View>

        {/* Stepper trạng thái 3 bước */}
        <View style={styles.stepperContainer}>
          {/* Bước 1: Đang di chuyển */}
          <View style={styles.stepItem}>
            <View style={[styles.stepIconWrap, styles.stepIconDone]}>
              <Check size={14} color="#FFFFFF" strokeWidth={3} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.stepTitleDone}>Đang di chuyển</Text>
              <Text style={styles.stepSubDone}>Hoàn thành lúc 14:20</Text>
            </View>
          </View>
          <View style={styles.stepConnector} />

          {/* Bước 2: Đã đến hiện trường */}
          <View style={styles.stepItem}>
            <View style={[styles.stepIconWrap, styles.stepIconDone]}>
              <Check size={14} color="#FFFFFF" strokeWidth={3} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.stepTitleDone}>Đã đến hiện trường</Text>
              <Text style={styles.stepSubDone}>Hoàn thành lúc 14:45</Text>
            </View>
          </View>
          <View style={styles.stepConnector} />

          {/* Bước 3: Đang lập báo giá / Sửa chữa */}
          <View style={styles.stepItem}>
            <View style={[styles.stepIconWrap, styles.stepIconCurrent]}>
              <View style={styles.stepIconInner} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.stepTitleCurrent}>Đang lập báo giá / Sửa chữa</Text>
              <Text style={styles.stepSubCurrent}>Đã diễn ra 15 phút</Text>
            </View>
          </View>
        </View>

        {/* Minh chứng sửa chữa - Cho phép chụp / đổi ảnh */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Minh chứng sửa chữa</Text>
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={() => setPickerModalVisible(true)}
            activeOpacity={0.8}
          >
            <Camera size={15} color="#EA580C" style={{ marginRight: 4 }} />
            <Text style={styles.retakeText}>
              {photoUri ? 'CHỤP LẠI / ĐỔI ẢNH' : 'CHỤP ẢNH'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.evidenceImageWrap}
          onPress={() => setPickerModalVisible(true)}
          activeOpacity={0.9}
        >
          {uploadingPhoto ? (
            <View style={styles.photoLoading}>
              <ActivityIndicator color={BRAND_ORANGE} size="large" />
              <Text style={{ marginTop: 8, fontSize: 13, color: SUB }}>Đang tải ảnh lên...</Text>
            </View>
          ) : photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.evidenceImage} resizeMode="cover" />
          ) : (
            <View style={styles.emptyPhotoBox}>
              <Camera size={36} color="#94A3B8" />
              <Text style={styles.emptyPhotoText}>Chạm để chụp ảnh hiện trường thực tế</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Thanh tìm kiếm dịch vụ */}
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm dịch vụ..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Danh sách DỊCH VỤ ĐÃ TẠO BỞI GARA ADMIN */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>
            DỊCH VỤ GARA CUNG CẤP
          </Text>
          {loadingServices && <ActivityIndicator size="small" color={BRAND_ORANGE} />}
        </View>

        {filteredServices.length === 0 && !loadingServices ? (
          <View style={styles.emptyServiceBox}>
            <Text style={{ fontSize: 13, color: SUB, textAlign: 'center' }}>
              Không tìm thấy dịch vụ nào phù hợp.
            </Text>
          </View>
        ) : (
          filteredServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceItemCard, service.selected && styles.serviceItemCardSelected]}
              onPress={() => toggleService(service.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, service.selected && styles.checkboxSelected]}>
                {service.selected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.serviceName, service.selected && styles.serviceNameSelected]}>
                  {service.name}
                </Text>
                {service.code ? (
                  <Text style={{ fontSize: 11, color: SUB, marginTop: 1 }}>Mã: {service.code}</Text>
                ) : null}
              </View>
              <Text style={[styles.servicePrice, service.selected && styles.servicePriceSelected]}>
                {formatVnd(service.price)}
              </Text>
            </TouchableOpacity>
          ))
        )}

        {/* Thông tin xe & Vị trí */}
        <View style={styles.carInfoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Loại xe</Text>
            <Text style={styles.infoValue}>
              {job?.vehicleType === 'CAR' ? 'Toyota Camry 2023' : 'Xe máy'}
            </Text>
          </View>
          <View style={[styles.infoRow, { marginTop: 8 }]}>
            <Text style={styles.infoLabel}>Vị trí</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {job?.pickupAddress || 'Lê Văn Lương, Quận 7, TP. HCM'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Nút HOÀN THÀNH & GỬI YÊU CẦU */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSendQuote}
          disabled={submitting}
          activeOpacity={0.88}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <CheckCircle2 size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>
                HOÀN THÀNH & GỬI YÊU CẦU ({formatVnd(totalRepairPrice)})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal Lựa chọn Chụp ảnh Camera hoặc Chọn từ Thư viện */}
      <Modal visible={pickerModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalBox}>
            <Text style={styles.pickerModalTitle}>Chọn ảnh minh chứng hiện trường</Text>
            <Text style={styles.pickerModalDesc}>
              Chụp ảnh thực tế lốp xe, động cơ hoặc bộ phận gặp sự cố để gửi kèm báo giá cho khách.
            </Text>

            <TouchableOpacity style={styles.pickerOptionBtn} onPress={handleTakePhoto} activeOpacity={0.85}>
              <View style={[styles.pickerOptionIcon, { backgroundColor: '#FFF7ED' }]}>
                <Camera size={22} color={BRAND_ORANGE} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.pickerOptionTitle}>Chụp ảnh mới bằng Camera</Text>
                <Text style={styles.pickerOptionSub}>Mở máy ảnh chụp trực tiếp tại hiện trường</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerOptionBtn} onPress={handlePickFromLibrary} activeOpacity={0.85}>
              <View style={[styles.pickerOptionIcon, { backgroundColor: '#EFF6FF' }]}>
                <ImageIcon size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.pickerOptionTitle}>Chọn từ Thư viện ảnh</Text>
                <Text style={styles.pickerOptionSub}>Chọn ảnh đã chụp sẵn trong máy</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerCancelBtn}
              onPress={() => setPickerModalVisible(false)}
            >
              <Text style={styles.pickerCancelText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 8 },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: { color: '#F8FAFC', fontWeight: '700', fontSize: 13 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: BRAND_ORANGE },
  bellBtn: { padding: 4 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  requestCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  requestCodeLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', letterSpacing: 0.5 },
  requestCodeValue: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  priorityBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: { fontSize: 11, fontWeight: '800', color: BRAND_ORANGE },
  stepperContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#22C55E',
    marginLeft: 11,
    marginVertical: 2,
  },
  stepIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconDone: { backgroundColor: '#22C55E' },
  stepIconCurrent: {
    backgroundColor: '#FFEDD5',
    borderWidth: 2,
    borderColor: BRAND_ORANGE,
  },
  stepIconInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND_ORANGE,
  },
  stepTitleDone: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  stepSubDone: { fontSize: 12, color: '#64748B', marginTop: 1 },
  stepTitleCurrent: { fontSize: 14, fontWeight: '700', color: BRAND_ORANGE },
  stepSubCurrent: { fontSize: 12, color: '#9A3412', marginTop: 1 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  retakeBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  retakeText: { fontSize: 12, fontWeight: '700', color: BRAND_ORANGE },
  evidenceImageWrap: {
    position: 'relative',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  evidenceImage: { width: '100%', height: '100%' },
  photoLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyPhotoBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyPhotoText: { marginTop: 8, fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  emptyServiceBox: {
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  serviceItemCardSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFD8BE',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    backgroundColor: BRAND_ORANGE,
    borderColor: BRAND_ORANGE,
  },
  serviceName: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  serviceNameSelected: { color: '#0F172A', fontWeight: '700' },
  servicePrice: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  servicePriceSelected: { color: BRAND_ORANGE, fontWeight: '800' },
  carInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, color: '#64748B' },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  submitBtn: {
    backgroundColor: BRAND_ORANGE,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND_ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  pickerModalTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  pickerModalDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, marginBottom: 18, lineHeight: 18 },
  pickerOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOptionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  pickerOptionSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  pickerCancelBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerCancelText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
});
