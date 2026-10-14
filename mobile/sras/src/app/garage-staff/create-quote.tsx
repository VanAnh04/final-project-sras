import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
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
  ChevronDown,
  ChevronUp,
  Wrench,
  Zap,
  Disc,
  Truck,
  Layers,
  Edit3,
  Plus,
  Sparkles,
  Info,
  AlertCircle,
  X,
  ShieldCheck,
  FileText,
  RotateCcw,
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto } from '../../api/rescueApi';
import { garageApi } from '../../api/garageApi';
import { resolveFileUrl } from '../../api/axiosClient';
import { formatVnd } from '../../utils/rescueFee';

const BRAND_ORANGE = '#FF5500';
const GREEN = '#16a34a';
const INK = '#0f172a';
const SUB = '#64748b';
const LINE = '#e2e8f0';

export interface ServiceItem {
  id: number;
  name: string;
  price: number;
  minPrice?: number;
  maxPrice?: number;
  selected: boolean;
  code?: string;
  categoryId?: number;
  categoryName?: string;
  unit?: string;
}

export interface CategoryGroup {
  id: number;
  name: string;
  code?: string;
  services: ServiceItem[];
  selectedCount: number;
}

// Gợi ý giá nhanh cho mục sửa chữa đơn giản tại chỗ
const QUICK_PRICES = [30000, 50000, 100000, 150000, 200000];

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

  // Thời gian thực cho stepper
  const [now, setNow] = useState<number>(Date.now());
  const [mountedAt] = useState<number>(() => Date.now());

  // Danh sách danh mục & dịch vụ
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  // Lưu trạng thái đóng/mở từng danh mục (mặc định mở tất cả hoặc danh mục đầu)
  const [expandedCats, setExpandedCats] = useState<Record<number, boolean>>({});

  // ── PHẦN SỬA CHỮA ĐƠN GIẢN / NGOÀI DANH MỤC ──
  const [hasCustomRepair, setHasCustomRepair] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customNote, setCustomNote] = useState('');

  // ── ĐỀ XUẤT KÉO XE VỀ GARAGE ──
  const [isTowing, setIsTowing] = useState(false);
  const [towingFeeInput, setTowingFeeInput] = useState('');
  const [towingReason, setTowingReason] = useState('');

  // Gợi ý phí kéo xe nhanh
  const QUICK_TOWING_PRICES = [200000, 300000, 400000, 500000];

  // ── MODAL POPUP XÁC NHẬN / THÔNG BÁO THẨM MỸ CAO ──
  const [confirmQuoteModalVisible, setConfirmQuoteModalVisible] = useState(false);
  const [successQuoteModalVisible, setSuccessQuoteModalVisible] = useState(false);
  const [warnModal, setWarnModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'warn' | 'error';
  }>({ visible: false, title: '', message: '' });
  const [preparedItems, setPreparedItems] = useState<any[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimeSmart = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const curr = new Date();
      const isSameDay =
        d.getDate() === curr.getDate() &&
        d.getMonth() === curr.getMonth() &&
        d.getFullYear() === curr.getFullYear();
      if (isSameDay) {
        return `${hours}:${minutes}`;
      }
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${hours}:${minutes} (${day}/${month})`;
    } catch {
      return '';
    }
  };

  // Bước 1: Thời gian di chuyển thực tế
  const getMoveStepSub = () => {
    if (job?.enRouteAt && job?.arrivedAt) {
      const start = new Date(job.enRouteAt).getTime();
      const end = new Date(job.arrivedAt).getTime();
      const diffMin = Math.max(1, Math.round((end - start) / 60000));
      return `Hoàn thành lúc ${formatTimeSmart(job.arrivedAt)} (di chuyển ${diffMin} phút)`;
    }
    if (job?.arrivedAt) {
      return `Hoàn thành lúc ${formatTimeSmart(job.arrivedAt)}`;
    }
    if (job?.enRouteAt) {
      return `Khởi hành lúc ${formatTimeSmart(job.enRouteAt)}`;
    }
    if (job?.createdAt) {
      return `Khởi hành lúc ${formatTimeSmart(job.createdAt)}`;
    }
    return 'Đã hoàn thành di chuyển';
  };

  // Bước 2: Thời gian đã đến hiện trường thực tế
  const getArrivedStepSub = () => {
    if (job?.arrivedAt) {
      return `Hoàn thành lúc ${formatTimeSmart(job.arrivedAt)}`;
    }
    return 'Đã có mặt tại hiện trường';
  };

  // Bước 3: Đồng hồ thời gian thực từ lúc đến hiện trường đến lúc lập báo giá
  const getDiagnosingTimeText = () => {
    const startMs = job?.arrivedAt ? new Date(job.arrivedAt).getTime() : mountedAt;
    const diffSec = Math.max(0, Math.floor((now - startMs) / 1000));
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;

    if (h > 0) {
      return `Đang diễn ra ${h} giờ ${m} phút ${s < 10 ? '0' : ''}${s}s`;
    }
    if (m > 0) {
      return `Đang diễn ra ${m} phút ${s < 10 ? '0' : ''}${s}s`;
    }
    return `Đang diễn ra ${s}s`;
  };

  // Ref lưu ID đơn trước đó để phát hiện khi chuyển đơn mới
  const lastLoadedRequestIdRef = useRef<number | null>(null);

  // Hàm làm mới toàn bộ bảng biểu báo giá sạch sẽ
  const resetQuoteForm = useCallback(() => {
    // 1. Reset mảng dịch vụ: bỏ chọn tất cả và khôi phục giá mặc định
    setServices((prev) =>
      prev.map((s) => ({
        ...s,
        selected: false,
        price: s.minPrice || s.price,
      }))
    );
    // 2. Reset phần sửa chữa ngoài danh mục
    setHasCustomRepair(false);
    setCustomName('');
    setCustomPrice('');
    setCustomNote('');
    // 3. Reset đề xuất kéo xe về garage
    setIsTowing(false);
    setTowingFeeInput('');
    setTowingReason('');
    // 4. Reset ảnh minh chứng hiện trường
    setPhotoUri(null);
    // 5. Reset tìm kiếm & các mục chuẩn bị
    setSearchQuery('');
    setPreparedItems([]);
    // 6. Reset các modal
    setConfirmQuoteModalVisible(false);
    setSuccessQuoteModalVisible(false);
    setWarnModal({ visible: false, title: '', message: '' });
  }, []);

  // Xác nhận làm mới bằng Alert
  const handleConfirmResetForm = () => {
    Alert.alert(
      'Làm mới biểu mẫu',
      'Bạn có chắc chắn muốn xóa trắng toàn bộ lựa chọn và thông tin báo giá hiện tại để nhập lại từ đầu không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa trắng', style: 'destructive', onPress: resetQuoteForm },
      ]
    );
  };

  // 1. Tải thông tin đơn cứu hộ & TỰ ĐỘNG RESET BẢNG BIỂU KHI VÀO ĐƠN MỚI
  useEffect(() => {
    if (Number.isNaN(requestId)) {
      setLoading(false);
      return;
    }

    // Nếu ID đơn khác ID đơn trước đó (chuyển đơn mới trong cùng phiên đăng nhập) -> Xóa trắng form ngay
    if (lastLoadedRequestIdRef.current !== requestId) {
      resetQuoteForm();
      lastLoadedRequestIdRef.current = requestId;
    }

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await rescueApi.getOne(requestId);
        if (alive) {
          setJob(res);
          if (res?.photos && res.photos.length > 0) {
            setPhotoUri(resolveFileUrl(res.photos[0]) ?? null);
          } else {
            setPhotoUri(null);
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
      // Dọn dẹp reset form khi rời khỏi màn hình
      resetQuoteForm();
    };
  }, [requestId, resetQuoteForm]);

  // 2. Tải Danh mục và Dịch vụ từ hệ thống
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingServices(true);

        // Tải danh mục và dịch vụ song song
        const [catsRes, srvRes, garageSrvRes] = await Promise.all([
          garageApi.listCategories().catch(() => []),
          garageApi.listServices().catch(() => []),
          garageApi.listGarageServices().catch(() => []),
        ]);

        if (!alive) return;

        const rawCategories: any[] = Array.isArray(catsRes) ? catsRes : [];
        const rawServices: any[] = (Array.isArray(garageSrvRes) && garageSrvRes.length > 0)
          ? garageSrvRes
          : (Array.isArray(srvRes) ? srvRes : []);

        setCategories(rawCategories);

        if (rawServices.length > 0) {
          const mapped: ServiceItem[] = rawServices
            .filter((item: any) => item.isActive !== false)
            .map((item: any) => {
              const name = item.serviceName || item.name || 'Dịch vụ sửa chữa';
              const price = item.price || item.minPrice || item.maxPrice || 200000;
              return {
                id: item.serviceId || item.id,
                name,
                price,
                minPrice: item.minPrice,
                maxPrice: item.maxPrice,
                selected: false,
                code: item.serviceCode || item.code,
                categoryId: item.categoryId || (item.category ? item.category.id : undefined),
                categoryName: item.categoryName || (item.category ? item.category.name : undefined),
                unit: item.unit,
              };
            });
          setServices(mapped);
        } else {
          // Fallback mặc định phong phú theo danh mục nếu chưa tạo dữ liệu
          setServices([
            { id: 1, name: 'Vá lốp lưu động (không ruột)', price: 120000, selected: false, categoryId: 1, categoryName: 'Cứu hộ lốp & Bánh xe' },
            { id: 2, name: 'Thay lốp xe dự phòng', price: 250000, selected: false, categoryId: 1, categoryName: 'Cứu hộ lốp & Bánh xe' },
            { id: 3, name: 'Kích bình ắc quy 12V', price: 180000, selected: false, categoryId: 2, categoryName: 'Điện & Ắc quy' },
            { id: 4, name: 'Thay bình ắc quy mới', price: 850000, selected: false, categoryId: 2, categoryName: 'Điện & Ắc quy' },
            { id: 5, name: 'Giao xăng khẩn cấp (2 lít)', price: 150000, selected: false, categoryId: 3, categoryName: 'Động cơ & Nhiên liệu' },
            { id: 6, name: 'Cứu hộ kéo xe về xưởng', price: 700000, selected: false, categoryId: 4, categoryName: 'Cứu hộ kéo xe' },
          ]);
        }
      } catch (err) {
        console.warn('Lỗi tải danh mục/dịch vụ:', err);
      } finally {
        if (alive) setLoadingServices(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Toggle chọn dịch vụ
  const toggleService = (id: number) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  // Toggle mở/thu gọn danh mục
  const toggleCategory = (catId: number) => {
    setExpandedCats((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Mở/thu gọn tất cả
  const toggleAllCategories = (open: boolean) => {
    const next: Record<number, boolean> = {};
    categoryGroups.forEach((g) => {
      next[g.id] = open;
    });
    setExpandedCats(next);
  };

  // Gom nhóm danh sách dịch vụ theo Category
  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    const groupsMap = new Map<number, CategoryGroup>();

    // 1. Khởi tạo nhóm từ categories có sẵn
    if (categories.length > 0) {
      categories.forEach((c: any) => {
        groupsMap.set(c.id, {
          id: c.id,
          name: c.name || 'Danh mục',
          code: c.code,
          services: [],
          selectedCount: 0,
        });
      });
    }

    // 2. Gom dịch vụ vào các nhóm
    const uncatServices: ServiceItem[] = [];
    services.forEach((s) => {
      if (s.categoryId && groupsMap.has(s.categoryId)) {
        const group = groupsMap.get(s.categoryId)!;
        group.services.push(s);
        if (s.selected) group.selectedCount += 1;
      } else if (s.categoryName) {
        // Nhóm theo tên nếu chưa có ID
        const syntheticId = Math.abs(s.categoryName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
        if (!groupsMap.has(syntheticId)) {
          groupsMap.set(syntheticId, {
            id: syntheticId,
            name: s.categoryName,
            services: [],
            selectedCount: 0,
          });
        }
        const g = groupsMap.get(syntheticId)!;
        g.services.push(s);
        if (s.selected) g.selectedCount += 1;
      } else {
        uncatServices.push(s);
      }
    });

    // 3. Nếu có dịch vụ không thuộc danh mục nào, thêm nhóm "Dịch vụ phổ biến"
    if (uncatServices.length > 0) {
      groupsMap.set(9999, {
        id: 9999,
        name: 'Dịch vụ phổ thông & Khác',
        services: uncatServices,
        selectedCount: uncatServices.filter((s) => s.selected).length,
      });
    }

    // Chỉ giữ các nhóm có ít nhất 1 dịch vụ
    return Array.from(groupsMap.values()).filter((g) => g.services.length > 0);
  }, [categories, services]);

  // Tự động mở danh mục đầu tiên khi tải xong
  useEffect(() => {
    if (categoryGroups.length > 0 && Object.keys(expandedCats).length === 0) {
      const initial: Record<number, boolean> = {};
      // Mở danh mục đầu tiên và các danh mục có dịch vụ đang được chọn
      categoryGroups.forEach((g, idx) => {
        initial[g.id] = idx === 0 || g.selectedCount > 0;
      });
      setExpandedCats(initial);
    }
  }, [categoryGroups]);

  // Lọc theo tìm kiếm
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categoryGroups;

    return categoryGroups
      .map((group) => {
        const matchServices = group.services.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.code && s.code.toLowerCase().includes(q))
        );
        return {
          ...group,
          services: matchServices,
        };
      })
      .filter((g) => g.services.length > 0);
  }, [categoryGroups, searchQuery]);

  // Chụp ảnh trực tiếp bằng Camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Cần quyền máy ảnh',
          'Vui lòng cấp quyền truy cập Camera để chụp ảnh minh chứng hiện trường trực tiếp.'
        );
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
    } catch (err) {
      console.warn('Lỗi khi mở camera:', err);
      Alert.alert('Lỗi máy ảnh', 'Không thể khởi động camera. Vui lòng thử lại.');
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

  // Icon theo tên danh mục
  const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('lốp') || n.includes('bánh') || n.includes('ruột')) {
      return <Disc size={18} color="#EA580C" />;
    }
    if (n.includes('điện') || n.includes('ắc quy') || n.includes('bình')) {
      return <Zap size={18} color="#EAB308" />;
    }
    if (n.includes('kéo') || n.includes('chở')) {
      return <Truck size={18} color="#2563EB" />;
    }
    if (n.includes('máy') || n.includes('động cơ') || n.includes('xăng')) {
      return <Wrench size={18} color="#16A34A" />;
    }
    return <Layers size={18} color="#64748B" />;
  };

  // Tính tổng chi phí
  const selectedServices = services.filter((s) => s.selected);
  const totalCatalogPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);

  // Phí sửa chữa đơn giản ngoài danh mục
  const customPriceNum = hasCustomRepair && customPrice.trim()
    ? parseInt(customPrice.replace(/\D/g, ''), 10) || 0
    : 0;

  const totalRepairPrice = totalCatalogPrice + customPriceNum;

  // Phí kéo xe về garage (nếu nhân viên đề xuất kéo về garage)
  const towingFeeNum = isTowing
    ? (parseInt(towingFeeInput.replace(/\D/g, ''), 10) || 0)
    : (job?.towingFee ?? 0);

  // Phí kiểm tra / cứu hộ ban đầu và tổng chi phí dự kiến
  const baseRescueFee = job?.rescueFee ?? (job?.vehicleType === 'CAR' ? 50000 : 30000);
  const grandTotal = baseRescueFee + towingFeeNum + totalRepairPrice;

  // Gửi báo giá tới khách hàng
  const handleSendQuote = async () => {
    if (!photoUri) {
      setWarnModal({
        visible: true,
        title: 'Chưa có ảnh minh chứng',
        message: 'Vui lòng chụp ảnh hiện trường phương tiện trước khi gửi báo giá cho khách.',
        type: 'warn',
      });
      return;
    }

    // Kiểm tra tính hợp lệ khi đề xuất kéo xe về garage
    if (isTowing) {
      if (!towingReason.trim()) {
        setWarnModal({
          visible: true,
          title: 'Thiếu lý do kéo xe về garage',
          message: 'Khi chọn "Đề xuất kéo về garage", bạn bắt buộc phải nhập lý do cụ thể vào ô ghi chú để giải thích rõ cho khách hàng.',
          type: 'warn',
        });
        return;
      }
      if (towingFeeNum <= 0) {
        setWarnModal({
          visible: true,
          title: 'Thiếu phí kéo xe về garage',
          message: 'Vui lòng nhập chi phí kéo xe về garage hợp lệ.',
          type: 'warn',
        });
        return;
      }
    }

    // Chuẩn bị danh sách dịch vụ
    const finalItems: any[] = [...selectedServices];
    if (hasCustomRepair && (customName.trim() || customPriceNum > 0)) {
      finalItems.push({
        id: 0,
        name: customName.trim() || 'Sửa chữa / Xử lý tại chỗ',
        price: customPriceNum,
        quantity: 1,
        amount: customPriceNum,
        note: customNote.trim() || undefined,
      });
    }
    setPreparedItems(finalItems);
    setConfirmQuoteModalVisible(true);
  };

  const executeSendQuote = async () => {
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

      const finalItems = preparedItems.length > 0 ? preparedItems : [...selectedServices];

      if (Number.isFinite(requestId)) {
        await rescueApi.submitQuote(requestId, {
          photoUrls: serverPhotoUrl ? [serverPhotoUrl] : [],
          repairFee: totalRepairPrice,
          inspectionFee: baseRescueFee,
          rescueFee: baseRescueFee,
          towingFee: towingFeeNum,
          quoteType: isTowing ? 'TOW' : 'ONSITE',
          isTowing: isTowing,
          towingReason: isTowing ? towingReason.trim() : undefined,
          repairItems: finalItems,
        });
      }

      setConfirmQuoteModalVisible(false);
      setSuccessQuoteModalVisible(true);
    } catch (e: any) {
      setConfirmQuoteModalVisible(false);
      setWarnModal({
        visible: true,
        title: 'Lỗi gửi báo giá',
        message: e?.message || 'Không thể gửi báo giá lúc này. Vui lòng kiểm tra lại kết nối mạng.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            resetQuoteForm();
            router.back();
          }}
          style={{ padding: 6 }}
        >
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>SR</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Lập Phiếu Báo Giá</Text>
            <Text style={styles.headerSubtitle}>
              {job?.code ? `Đơn #${job.code}` : `Mã: #${requestId || 'Cứu hộ'}`}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.resetHeaderBtn}
          onPress={handleConfirmResetForm}
          activeOpacity={0.7}
        >
          <RotateCcw size={16} color="#EA580C" />
          <Text style={styles.resetHeaderText}>Làm mới</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Stepper trạng thái 3 bước theo thời gian thực */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepItem}>
            <View style={[styles.stepIconWrap, styles.stepIconDone]}>
              <Check size={14} color="#FFFFFF" strokeWidth={3} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.stepTitleDone}>Đang di chuyển</Text>
              <Text style={styles.stepSubDone}>{getMoveStepSub()}</Text>
            </View>
          </View>
          <View style={styles.stepConnector} />

          <View style={styles.stepItem}>
            <View style={[styles.stepIconWrap, styles.stepIconDone]}>
              <Check size={14} color="#FFFFFF" strokeWidth={3} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.stepTitleDone}>Đã đến hiện trường</Text>
              <Text style={styles.stepSubDone}>{getArrivedStepSub()}</Text>
            </View>
          </View>
          <View style={styles.stepConnector} />

          <View style={styles.stepItem}>
            <View style={[styles.stepIconWrap, styles.stepIconCurrent]}>
              <View style={styles.stepIconInner} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.stepTitleCurrent}>Đang lập báo giá / Sửa chữa</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.stepSubCurrent}>{getDiagnosingTimeText()}</Text>
            </View>
          </View>
        </View>

        {/* 1. MINH CHỨNG HIỆN TRƯỜNG */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>1. Minh chứng hiện trường</Text>
            <View style={styles.cameraDirectTag}>
              <Text style={styles.cameraDirectTagText}>Bắt buộc</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.retakeBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
            <Camera size={15} color="#EA580C" style={{ marginRight: 4 }} />
            <Text style={styles.retakeText}>
              {photoUri ? 'CHỤP LẠI' : 'CHỤP ẢNH'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.evidenceImageWrap}
          onPress={handleTakePhoto}
          activeOpacity={0.9}
        >
          {uploadingPhoto ? (
            <View style={styles.photoLoading}>
              <ActivityIndicator color={BRAND_ORANGE} size="large" />
              <Text style={{ marginTop: 8, fontSize: 13, color: SUB }}>Đang nạp ảnh lên máy chủ...</Text>
            </View>
          ) : photoUri ? (
            <View style={{ width: '100%', height: '100%', position: 'relative' }}>
              <Image source={{ uri: photoUri }} style={styles.evidenceImage} resizeMode="cover" />
              <View style={styles.liveCameraBadge}>
                <Camera size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.liveCameraBadgeText}>Ảnh chụp thực tế tại chỗ</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyPhotoBox}>
              <View style={styles.cameraIconCircle}>
                <Camera size={28} color={BRAND_ORANGE} />
              </View>
              <Text style={styles.emptyPhotoText}>Chạm để mở camera chụp hiện trường xe khách</Text>
              <Text style={styles.emptyPhotoSubText}>
                Ảnh chụp trực tiếp từ máy ảnh • Giúp khách an tâm duyệt giá
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 2. DANH MỤC DỊCH VỤ SỬA CHỮA */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>2. Danh mục dịch vụ cứu hộ</Text>
            <Text style={styles.sectionSub}>Bấm vào danh mục để mở danh sách dịch vụ và giá</Text>
          </View>
        </View>

        {/* Thanh tìm kiếm */}
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên dịch vụ hoặc mã..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ fontSize: 12, color: SUB, fontWeight: '700' }}>Xóa</Text>
            </TouchableOpacity>
          )}
        </View>

        {loadingServices ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={BRAND_ORANGE} />
            <Text style={{ fontSize: 13, color: SUB, marginTop: 8 }}>Đang tải danh mục & bảng giá...</Text>
          </View>
        ) : filteredGroups.length === 0 ? (
          <View style={styles.emptyServiceBox}>
            <Text style={{ fontSize: 13, color: SUB, textAlign: 'center' }}>
              Không tìm thấy dịch vụ nào phù hợp với từ khóa "{searchQuery}".
            </Text>
          </View>
        ) : (
          filteredGroups.map((group) => {
            const isExpanded = !!expandedCats[group.id] || searchQuery.length > 0;
            return (
              <View key={group.id} style={styles.categoryCard}>
                {/* Header Danh mục (Click để mở/đóng) */}
                <TouchableOpacity
                  style={[styles.categoryHeader, isExpanded && styles.categoryHeaderActive]}
                  onPress={() => toggleCategory(group.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.categoryHeaderLeft}>
                    <View style={styles.catIconWrap}>
                      {getCategoryIcon(group.name)}
                    </View>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.categoryTitle}>{group.name}</Text>
                      <Text style={styles.categoryCount}>
                        {group.services.length} hạng mục
                        {group.selectedCount > 0 ? ` · Đã chọn ${group.selectedCount}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {group.selectedCount > 0 && (
                      <View style={styles.selectedCountBadge}>
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                        <Text style={styles.selectedCountText}>{group.selectedCount}</Text>
                      </View>
                    )}
                    {isExpanded ? (
                      <ChevronUp size={20} color="#64748B" />
                    ) : (
                      <ChevronDown size={20} color="#64748B" />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Danh sách Dịch vụ bên trong danh mục */}
                {isExpanded && (
                  <View style={styles.categoryBody}>
                    {group.services.map((service) => (
                      <TouchableOpacity
                        key={service.id}
                        style={[
                          styles.serviceItemCard,
                          service.selected && styles.serviceItemCardSelected,
                        ]}
                        onPress={() => toggleService(service.id)}
                        activeOpacity={0.85}
                      >
                        <View style={[styles.checkbox, service.selected && styles.checkboxSelected]}>
                          {service.selected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={[styles.serviceName, service.selected && styles.serviceNameSelected]}>
                            {service.name}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            {service.code ? (
                              <Text style={styles.serviceCode}>Mã: {service.code}</Text>
                            ) : null}
                            {service.unit ? (
                              <Text style={styles.serviceUnit}>ĐVT: {service.unit}</Text>
                            ) : null}
                          </View>
                        </View>
                        <Text style={[styles.servicePrice, service.selected && styles.servicePriceSelected]}>
                          {formatVnd(service.price)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* 3. PHẦN SỬA CHỮA ĐƠN GIẢN / NGOÀI DANH MỤC (TỰ GHI GIÁ & NOTE) */}
        <View style={styles.customSectionCard}>
          <TouchableOpacity
            style={styles.customSectionHeader}
            onPress={() => setHasCustomRepair(!hasCustomRepair)}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.customIconWrap, hasCustomRepair && { backgroundColor: '#FFEDD5' }]}>
                <Edit3 size={18} color={BRAND_ORANGE} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.customSectionTitle}>Sửa chữa đơn giản / Tự ghi giá</Text>
                <Text style={styles.customSectionSub}>
                  Cho lỗi nhẹ tại chỗ hoặc hạng mục không có trong bảng giá
                </Text>
              </View>
            </View>

            <View style={[styles.customToggleCircle, hasCustomRepair && styles.customToggleCircleActive]}>
              {hasCustomRepair ? (
                <Check size={14} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <Plus size={16} color="#64748B" />
              )}
            </View>
          </TouchableOpacity>

          {hasCustomRepair && (
            <View style={styles.customInputBody}>
              <View style={styles.infoTipBox}>
                <Info size={15} color="#2563EB" style={{ marginTop: 2 }} />
                <Text style={styles.infoTipText}>
                  Nếu chỉ xử lý đơn giản tại chỗ (siết ốc, chỉnh phanh, nối dây...) bạn không cần chọn dịch vụ trong danh mục mà có thể nhập trực tiếp ở đây.
                </Text>
              </View>

              {/* Tên công việc */}
              <Text style={styles.inputLabel}>NỘI DUNG SỬA CHỮA / KHẮC PHỤC</Text>
              <TextInput
                style={styles.textInput}
                placeholder="VD: Siết ốc cổ phốt & tăng dây ga, xử lý đứt dây..."
                placeholderTextColor="#94A3B8"
                value={customName}
                onChangeText={setCustomName}
              />

              {/* Giá tiền */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>CHI PHÍ SỬA CHỮA (VNĐ)</Text>
              <TextInput
                style={[styles.textInput, { fontSize: 16, fontWeight: '700', color: BRAND_ORANGE }]}
                placeholder="Nhập số tiền (VD: 50000)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={customPrice}
                onChangeText={(val) => {
                  const cleaned = val.replace(/\D/g, '');
                  setCustomPrice(cleaned);
                }}
              />

              {/* Gợi ý mức giá nhanh */}
              <View style={styles.quickPriceRow}>
                {QUICK_PRICES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.quickPriceBtn,
                      customPrice === String(p) && styles.quickPriceBtnActive,
                    ]}
                    onPress={() => setCustomPrice(String(p))}
                  >
                    <Text
                      style={[
                        styles.quickPriceText,
                        customPrice === String(p) && styles.quickPriceTextActive,
                      ]}
                    >
                      {p >= 1000 ? `${p / 1000}k` : p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Ghi chú dặn dò khách */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>GHI CHÚ / DẶN DÒ CHO KHÁCH (TÙY CHỌN)</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                placeholder="VD: Đã xử lý tạm thời tại hiện trường. Khách nên đến gara để kiểm tra kỹ hơn..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={customNote}
                onChangeText={setCustomNote}
              />
            </View>
          )}
        </View>

        {/* 4. ĐỀ XUẤT KÉO XE VỀ GARAGE */}
        <View style={[styles.customSectionCard, isTowing && { borderColor: '#93C5FD' }]}>
          <TouchableOpacity
            style={[
              styles.customSectionHeader,
              isTowing && { backgroundColor: '#EFF6FF' },
            ]}
            onPress={() => setIsTowing(!isTowing)}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View
                style={[
                  styles.customIconWrap,
                  isTowing && { backgroundColor: '#DBEAFE' },
                ]}
              >
                <Truck size={20} color={isTowing ? '#2563EB' : BRAND_ORANGE} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.customSectionTitle, isTowing && { color: '#1E40AF' }]}>
                    Đề xuất kéo về garage
                  </Text>
                  <View style={[styles.customTag, isTowing && { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                    <Text style={[styles.customTagText, isTowing && { color: '#2563EB' }]}>
                      {isTowing ? 'ĐÃ CHỌN' : 'TÙY CHỌN'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.customSectionSub}>
                  Tích chọn ô này nếu xe không thể sửa tại chỗ, cần đưa về xưởng
                </Text>
              </View>
            </View>

            <View style={[styles.customToggleCircle, isTowing && { backgroundColor: '#2563EB' }]}>
              {isTowing ? (
                <Check size={16} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <Plus size={16} color="#64748B" strokeWidth={2.5} />
              )}
            </View>
          </TouchableOpacity>

          {isTowing && (
            <View style={[styles.customInputBody, { borderTopColor: '#BFDBFE', backgroundColor: '#F8FAFC' }]}>
              {/* Phí kéo xe */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <Text style={[styles.inputLabel, { color: '#1E40AF', marginBottom: 0 }]}>
                  PHÍ KÉO XE VỀ GARAGE (VNĐ) <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '700' }}>BẮT BUỘC</Text>
              </View>
              <TextInput
                style={[styles.textInput, { fontSize: 16, fontWeight: '700', color: '#2563EB', borderColor: '#93C5FD', marginTop: 6 }]}
                placeholder="Nhập chi phí kéo xe (VD: 300000)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={towingFeeInput}
                onChangeText={(val) => {
                  const cleaned = val.replace(/\D/g, '');
                  setTowingFeeInput(cleaned);
                }}
              />

              {/* Gợi ý mức giá kéo xe nhanh */}
              <View style={styles.quickPriceRow}>
                {QUICK_TOWING_PRICES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.quickPriceBtn,
                      towingFeeInput === String(p) && { backgroundColor: '#2563EB', borderColor: '#2563EB' },
                    ]}
                    onPress={() => setTowingFeeInput(String(p))}
                  >
                    <Text
                      style={[
                        styles.quickPriceText,
                        towingFeeInput === String(p) && { color: '#FFFFFF', fontWeight: '800' },
                      ]}
                    >
                      {p >= 1000 ? `${p / 1000}k` : p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Lý do kéo về garage (BẮT BUỘC) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                <Text style={[styles.inputLabel, { color: '#1E40AF', marginBottom: 0 }]}>
                  LÝ DO CỤ THỂ KÉO VỀ GARAGE <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, color: '#DC2626', fontWeight: '800' }}>BẮT BUỘC NHẬP</Text>
                </View>
              </View>
              <TextInput
                style={[styles.textInput, styles.textAreaInput, { borderColor: '#93C5FD', marginTop: 6 }]}
                placeholder="Nhập lý do cụ thể vì sao xe không thể sửa tại chỗ (VD: Xe bị gãy càng A, hỏng lốc máy nặng không thể khắc phục tại hiện trường...)"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={towingReason}
                onChangeText={setTowingReason}
              />
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4, fontStyle: 'italic' }}>
                💡 Lý do này là bắt buộc và sẽ gửi trực tiếp đến khách hàng để khách hiểu rõ và bấm xác nhận kéo xe.
              </Text>
            </View>
          )}
        </View>

        {/* 5. THÔNG TIN XE & VỊ TRÍ */}
        <View style={styles.carInfoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Loại phương tiện</Text>
            <Text style={styles.infoValue}>
              {job?.vehicleType === 'CAR' ? '🚗 Ô tô' : '🏍️ Xe máy'}
            </Text>
          </View>
          <View style={[styles.infoRow, { marginTop: 8 }]}>
            <Text style={styles.infoLabel}>Hiện trường</Text>
            <Text style={[styles.infoValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]} numberOfLines={1}>
              {job?.pickupAddress || 'Vị trí khách yêu cầu'}
            </Text>
          </View>
        </View>

        {/* 6. BẢNG TÍNH CHI PHÍ TỔNG THỂ */}
        <View style={styles.quoteSummaryCard}>
          <Text style={styles.quoteSummaryTitle}>BẢNG TÍNH CHI PHÍ DỰ KIẾN</Text>

          <View style={styles.quoteSummaryRow}>
            <Text style={styles.quoteSummaryLabel}>1. Phí di chuyển đến (Cố định):</Text>
            <Text style={styles.quoteSummaryVal}>{formatVnd(baseRescueFee)}</Text>
          </View>

          {towingFeeNum > 0 && (
            <View style={styles.quoteSummaryRow}>
              <Text style={[styles.quoteSummaryLabel, { color: '#2563EB', fontWeight: '700' }]}>
                2. Phí kéo xe về garage:
              </Text>
              <Text style={[styles.quoteSummaryVal, { color: '#2563EB', fontWeight: '800' }]}>
                {formatVnd(towingFeeNum)}
              </Text>
            </View>
          )}

          {totalCatalogPrice > 0 && (
            <View style={styles.quoteSummaryRow}>
              <Text style={styles.quoteSummaryLabel}>
                {towingFeeNum > 0 ? '3.' : '2.'} Dịch vụ sửa chữa (Dự kiến):
              </Text>
              <Text style={styles.quoteSummaryVal}>{formatVnd(totalCatalogPrice)}</Text>
            </View>
          )}

          {customPriceNum > 0 && (
            <View style={styles.quoteSummaryRow}>
              <Text style={[styles.quoteSummaryLabel, { color: '#EA580C', fontWeight: '600' }]}>
                {totalCatalogPrice > 0 ? (towingFeeNum > 0 ? '4.' : '3.') : (towingFeeNum > 0 ? '3.' : '2.')} {customName.trim() || 'Xử lý tại chỗ (Dự kiến)'}:
              </Text>
              <Text style={[styles.quoteSummaryVal, { color: '#EA580C' }]}>
                {formatVnd(customPriceNum)}
              </Text>
            </View>
          )}

          {totalRepairPrice > 0 && (
            <View style={{ backgroundColor: '#FFF7ED', padding: 8, borderRadius: 8, marginTop: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 11, color: '#C2410C', fontStyle: 'italic', lineHeight: 16 }}>
                ⚠️ Lưu ý: Phí sửa xe mang tính chất DỰ KIẾN vì khi về garage kiểm tra chi tiết có thể phát hiện thêm hư hỏng để thông báo bổ sung cho khách.
              </Text>
            </View>
          )}

          <View style={styles.quoteSummaryDivider} />

          <View style={styles.quoteSummaryTotalRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.quoteSummaryTotalLabel}>TỔNG DỰ KIẾN KHÁCH TRẢ</Text>
              <Text style={styles.quoteSummaryTotalSub}>
                (Phí di chuyển + {towingFeeNum > 0 ? 'Kéo xe + ' : ''}Sửa chữa dự kiến)
              </Text>
            </View>
            <Text style={styles.quoteSummaryTotalVal}>{formatVnd(grandTotal)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Thanh nút gửi báo giá dính dưới màn hình */}
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
                GỬI BÁO GIÁ CHO KHÁCH ({formatVnd(grandTotal)})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── MODAL 1: XÁC NHẬN GỬI BÁO GIÁ CHO KHÁCH (THẨM MỸ CAO) ── */}
      <Modal visible={confirmQuoteModalVisible} transparent animationType="fade">
        <View style={styles.quoteModalOverlay}>
          <View style={styles.quoteModalBox}>
            <View style={styles.quoteModalHeaderRow}>
              <View style={[styles.quoteModalIconWrap, { backgroundColor: '#FFF7ED' }]}>
                <FileText size={24} color={BRAND_ORANGE} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.quoteModalTitle}>
                  {isTowing ? 'Báo giá kéo xe về garage' : 'Xác nhận gửi báo giá'}
                </Text>
                <Text style={styles.quoteModalSubtitle}>
                  {isTowing
                    ? 'Đề xuất kéo xe về garage và chi phí sửa chữa dự kiến sẽ gửi cho khách'
                    : 'Phiếu đề xuất chi phí sẽ gửi trực tiếp đến ứng dụng của khách hàng'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setConfirmQuoteModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Chi tiết tóm tắt */}
            <View style={styles.quoteModalSummaryBox}>
              <View style={styles.quoteModalSummaryRow}>
                <Text style={styles.quoteModalLabel}>Phí di chuyển đến:</Text>
                <Text style={styles.quoteModalVal}>{formatVnd(baseRescueFee)}</Text>
              </View>
              {towingFeeNum > 0 && (
                <View style={styles.quoteModalSummaryRow}>
                  <Text style={[styles.quoteModalLabel, { color: '#2563EB', fontWeight: '700' }]}>Phí kéo xe về garage:</Text>
                  <Text style={[styles.quoteModalVal, { color: '#2563EB', fontWeight: '800' }]}>{formatVnd(towingFeeNum)}</Text>
                </View>
              )}
              {isTowing && towingReason.trim() ? (
                <View style={{ backgroundColor: '#EFF6FF', padding: 8, borderRadius: 8, marginVertical: 4 }}>
                  <Text style={{ fontSize: 11, color: '#1E40AF', fontWeight: '700' }}>Lý do kéo xe:</Text>
                  <Text style={{ fontSize: 12, color: '#1E3A8A', marginTop: 2 }}>{towingReason.trim()}</Text>
                </View>
              ) : null}
              <View style={styles.quoteModalSummaryRow}>
                <Text style={styles.quoteModalLabel}>
                  Phí sửa chữa & phụ tùng (Dự kiến):
                </Text>
                <Text style={[styles.quoteModalVal, { color: preparedItems.length === 0 ? '#64748B' : '#0F172A' }]}>
                  {formatVnd(totalRepairPrice)}
                </Text>
              </View>

              <View style={styles.quoteModalDivider} />

              <View style={styles.quoteModalSummaryRow}>
                <Text style={styles.quoteModalGrandLabel}>TỔNG DỰ KIẾN:</Text>
                <Text style={styles.quoteModalGrandVal}>{formatVnd(grandTotal)}</Text>
              </View>
            </View>

            <View style={{ backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10, marginVertical: 6 }}>
              <Text style={{ fontSize: 11, color: '#B45309', lineHeight: 16 }}>
                💡 Chi phí sửa chữa là <Text style={{ fontWeight: '800' }}>dự kiến</Text>. Khi đưa xe về garage kiểm tra chi tiết, nếu có phát sinh thêm hư hỏng, nhân viên có thể bổ sung và thông báo cho khách hàng.
              </Text>
            </View>

            {preparedItems.length === 0 && (
              <View style={styles.quoteModalNotice}>
                <Text style={styles.quoteModalNoticeText}>
                  💡 Phiếu báo giá hiện tại chỉ tính Phí kiểm tra xe ban đầu (không sửa chữa thêm).
                </Text>
              </View>
            )}

            {/* Nút hành động */}
            <View style={styles.quoteModalActionRow}>
              <TouchableOpacity
                style={styles.quoteModalBackBtn}
                onPress={() => setConfirmQuoteModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.quoteModalBackText}>Kiểm tra lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quoteModalSendBtn, submitting && { opacity: 0.6 }]}
                onPress={executeSendQuote}
                disabled={submitting}
                activeOpacity={0.88}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.quoteModalSendText}>Gửi cho khách ngay</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: THÔNG BÁO GỬI THÀNH CÔNG (THẨM MỸ CAO) ── */}
      <Modal visible={successQuoteModalVisible} transparent animationType="fade">
        <View style={styles.quoteModalOverlay}>
          <View style={styles.quoteModalBox}>
            <View style={[styles.quoteModalIconCircle, { backgroundColor: '#FFF7ED', borderWidth: 1.5, borderColor: '#FED7AA' }]}>
              <CheckCircle2 size={44} color={BRAND_ORANGE} />
            </View>
            <Text style={styles.quoteSuccessTitle}>Gửi báo giá thành công!</Text>
            <Text style={styles.quoteSuccessDesc}>
              Bảng báo giá tổng chi phí{' '}
              <Text style={{ fontWeight: '800', color: BRAND_ORANGE }}>
                {formatVnd(grandTotal)}
              </Text>{' '}
              đã được gửi đến khách hàng.{'\n\n'}
              Hệ thống sẽ cập nhật trạng thái ngay khi khách hàng bấm ĐỒNG Ý hoặc TỪ CHỐI sửa chữa. Đồng hồ sửa chữa chỉ bắt đầu đếm khi khách hàng duyệt báo giá.
            </Text>

            <TouchableOpacity
              style={styles.quoteSuccessBtn}
              onPress={() => {
                setSuccessQuoteModalVisible(false);
                resetQuoteForm();
                router.replace('/garage-staff/home');
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.quoteSuccessBtnText}>🏠 Về Màn Hình Chính Chờ Khách Duyệt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 3: CẢNH BÁO / LỖI ── */}
      <Modal visible={warnModal.visible} transparent animationType="fade">
        <View style={styles.quoteModalOverlay}>
          <View style={styles.quoteModalBox}>
            <View
              style={[
                styles.quoteModalIconCircle,
                { backgroundColor: warnModal.type === 'error' ? '#FEF2F2' : '#FFF7ED' },
              ]}
            >
              <AlertCircle
                size={40}
                color={warnModal.type === 'error' ? '#DC2626' : BRAND_ORANGE}
              />
            </View>
            <Text style={styles.quoteSuccessTitle}>{warnModal.title}</Text>
            <Text style={styles.quoteSuccessDesc}>{warnModal.message}</Text>

            <TouchableOpacity
              style={[
                styles.quoteSuccessBtn,
                { backgroundColor: warnModal.type === 'error' ? '#DC2626' : BRAND_ORANGE },
              ]}
              onPress={() => setWarnModal(prev => ({ ...prev, visible: false }))}
              activeOpacity={0.88}
            >
              <Text style={styles.quoteSuccessBtnText}>Đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: { color: '#F8FAFC', fontWeight: '800', fontSize: 13 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 12, color: BRAND_ORANGE, fontWeight: '700', marginTop: 1 },
  bellBtn: { padding: 4 },
  resetHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  resetHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  stepperContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepConnector: {
    width: 2,
    height: 18,
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
  stepTitleDone: { fontSize: 13.5, fontWeight: '700', color: '#0F172A' },
  stepSubDone: { fontSize: 11.5, color: '#64748B', marginTop: 1 },
  stepTitleCurrent: { fontSize: 13.5, fontWeight: '700', color: BRAND_ORANGE },
  stepSubCurrent: { fontSize: 11.5, color: '#9A3412', marginTop: 1, fontWeight: '600' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 4,
  },
  liveBadgeText: { fontSize: 9.5, fontWeight: '800', color: '#EF4444' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: { fontSize: 14.5, fontWeight: '800', color: '#0F172A' },
  sectionSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  retakeBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  retakeText: { fontSize: 12, fontWeight: '700', color: BRAND_ORANGE },
  cameraDirectTag: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  cameraDirectTagText: { fontSize: 11, fontWeight: '700', color: BRAND_ORANGE },
  evidenceImageWrap: {
    height: 170,
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
  emptyPhotoText: { marginTop: 8, fontSize: 13, color: '#64748B', fontWeight: '600' },
  emptyPhotoSubText: { marginTop: 4, fontSize: 11.5, color: '#94A3B8', textAlign: 'center' },
  cameraIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveCameraBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveCameraBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  expandMiniBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expandMiniBtnText: { fontSize: 11.5, color: '#475569', fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: '#0F172A' },
  loadingBox: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  emptyServiceBox: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  // Thẻ Category
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  categoryHeaderActive: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  categoryCount: { fontSize: 11.5, color: '#64748B', marginTop: 1 },
  selectedCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_ORANGE,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  selectedCountText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  categoryBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  // Thẻ Service item
  serviceItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
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
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    backgroundColor: BRAND_ORANGE,
    borderColor: BRAND_ORANGE,
  },
  serviceName: { fontSize: 13.5, fontWeight: '700', color: '#1E293B' },
  serviceNameSelected: { color: '#0F172A', fontWeight: '800' },
  serviceCode: { fontSize: 11, color: '#64748B' },
  serviceUnit: { fontSize: 11, color: '#64748B' },
  servicePrice: { fontSize: 13.5, fontWeight: '700', color: '#475569' },
  servicePriceSelected: { color: BRAND_ORANGE, fontWeight: '800' },
  // Thẻ Sửa chữa đơn giản
  customSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    marginTop: 6,
    marginBottom: 14,
    overflow: 'hidden',
  },
  customSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  customIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customSectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  customSectionSub: { fontSize: 11.5, color: '#64748B', marginTop: 1 },
  customTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginLeft: 6,
  },
  customTagText: { fontSize: 10, fontWeight: '800', color: '#EA580C' },
  customToggleCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customToggleCircleActive: {
    backgroundColor: BRAND_ORANGE,
  },
  customInputBody: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#FFEDD5',
    backgroundColor: '#FFFDF9',
  },
  infoTipBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  infoTipText: { fontSize: 12, color: '#1E40AF', flex: 1, lineHeight: 17 },
  inputLabel: { fontSize: 11.5, fontWeight: '800', color: '#475569', letterSpacing: 0.3, marginBottom: 6 },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13.5,
    color: '#0F172A',
  },
  textAreaInput: {
    height: 72,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  quickPriceRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickPriceBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  quickPriceBtnActive: {
    backgroundColor: '#FFEDD5',
    borderColor: BRAND_ORANGE,
  },
  quickPriceText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  quickPriceTextActive: { color: BRAND_ORANGE, fontWeight: '800' },
  carInfoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, color: '#64748B' },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  quoteSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  quoteSummaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  quoteSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quoteSummaryLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
    paddingRight: 8,
  },
  quoteSummaryVal: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  quoteSummaryDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
  quoteSummaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  quoteSummaryTotalLabel: { fontSize: 13.5, fontWeight: '800', color: '#0F172A' },
  quoteSummaryTotalSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  quoteSummaryTotalVal: { fontSize: 18, fontWeight: '900', color: BRAND_ORANGE },
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
  submitBtnText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '800', letterSpacing: 0.3 },

  // ── MODAL STYLES CAO CẤP ──
  quoteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  quoteModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  quoteModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quoteModalIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  quoteModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  quoteModalSummaryBox: {
    backgroundColor: '#FFFDF8',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 14,
  },
  quoteModalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  quoteModalLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
    paddingRight: 8,
  },
  quoteModalVal: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  quoteModalDivider: {
    height: 1,
    backgroundColor: '#FED7AA',
    marginVertical: 8,
  },
  quoteModalGrandLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  quoteModalGrandVal: {
    fontSize: 18,
    fontWeight: '900',
    color: BRAND_ORANGE,
  },
  quoteModalNotice: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  quoteModalNoticeText: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 17,
    fontWeight: '600',
  },
  quoteModalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  quoteModalBackBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteModalBackText: {
    fontSize: 14,
    fontWeight: '800',
    color: BRAND_ORANGE,
  },
  quoteModalSendBtn: {
    flex: 1.6,
    height: 48,
    borderRadius: 14,
    backgroundColor: BRAND_ORANGE,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND_ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  quoteModalSendText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quoteModalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  quoteSuccessTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  quoteSuccessDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 22,
  },
  quoteSuccessBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: BRAND_ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND_ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  quoteSuccessBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
