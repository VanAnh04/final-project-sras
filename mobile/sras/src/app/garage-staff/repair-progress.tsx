import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Platform,
  ActivityIndicator,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Pause,
  Play,
  Car,
  Check,
  Wrench,
  CheckCircle2,
  AlertOctagon,
  User,
  FileText,
  Phone,
  Plus,
  X,
  Search,
  Layers,
  FilePlus2,
  DollarSign,
  Truck,
  Sparkles,
  AlertCircle,
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto } from '../../api/rescueApi';
import { garageApi } from '../../api/garageApi';
import { resolveFileUrl } from '../../api/axiosClient';
import { formatVnd } from '../../utils/rescueFee';

const BRAND_ORANGE = '#ea580c';
const GREEN = '#16a34a';
const SUB = '#64748b';
const INK = '#0f172a';

interface ChecklistItem {
  id: number;
  title: string;
  sub: string;
  completed: boolean;
  note?: string;
  price?: number;
}

export default function RepairProgressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    selectedServices?: string;
    photoUri?: string;
  }>();
  const requestId = params.id ? parseInt(params.id, 10) : NaN;

  const [job, setJob] = useState<RescueRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);

  // Danh sách công việc cần làm
  const [tasks, setTasks] = useState<ChecklistItem[]>([]);

  // Modal thêm hạng mục phát sinh
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [addItemMode, setAddItemMode] = useState<'CUSTOM' | 'CATALOG'>('CATALOG');
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<any | null>(null);
  const [catalogNote, setCatalogNote] = useState('');
  const [submittingItem, setSubmittingItem] = useState(false);

  // Danh mục dịch vụ hệ thống & gara
  const [catalogServices, setCatalogServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchCatalogQuery, setSearchCatalogQuery] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const isTow =
    job?.quoteType === 'TOW' ||
    job?.status === 'TOW_TO_GARAGE' ||
    job?.isTowing === true ||
    (job?.towingFee != null && job.towingFee > 0);

  // Modal thông báo & xác nhận màu cam đồng bộ
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'confirm' | 'success' | 'warn' | 'error';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({ visible: false, title: '', message: '' });

  // 1. Nạp chi tiết đơn cứu hộ từ API & Polling liên tục kiểm tra phản hồi của khách
  useEffect(() => {
    if (Number.isNaN(requestId)) {
      setLoading(false);
      return;
    }
    let alive = true;
    let hasAlertedDecline = false;

    const checkJobStatus = async () => {
      try {
        const res = await rescueApi.getOne(requestId);
        if (!alive) return;
        setJob(res);

        // Trường hợp 1: Khách hàng TỪ CHỐI sửa chữa
        const isDeclined =
          res.quoteStatus === 'DECLINED' ||
          (res.status === 'AWAITING_PAYMENT' && res.quoteStatus !== 'ACCEPTED');

        if (isDeclined) {
          setTimerRunning(false);
          if (!hasAlertedDecline) {
            hasAlertedDecline = true;
            setConfirmModal({
              visible: true,
              title: 'Khách hàng đã từ chối sửa chữa',
              message: 'Khách hàng không đồng ý báo giá sửa chữa. Hệ thống chuyển về trang thu Phí kiểm tra xe cố định.',
              type: 'warn',
              confirmText: 'Đến trang thu phí',
              onConfirm: () => {
                setConfirmModal((prev) => ({ ...prev, visible: false }));
                router.replace('/garage-staff/home');
              },
            });
          }
          return;
        }

        // Trường hợp 2: Khách hàng ĐÃ ĐỒNG Ý sửa chữa (REPAIRING_ONSITE, TOW_TO_GARAGE hoặc quoteStatus === 'ACCEPTED' / 'APPROVED')
        const isAppr =
          res.status === 'REPAIRING_ONSITE' ||
          res.status === 'TOW_TO_GARAGE' ||
          res.quoteStatus === 'ACCEPTED' ||
          res.quoteStatus === 'APPROVED' ||
          res.status === 'TOWING';

        // Nếu là đơn kéo xe về garage (isTow): KHÔNG CHẠY TIMER
        const isTowOrder =
          res.quoteType === 'TOW' ||
          res.status === 'TOW_TO_GARAGE' ||
          res.isTowing === true ||
          (res.towingFee != null && res.towingFee > 0);

        if (isTowOrder) {
          setTimerRunning(false);
        } else if (isAppr) {
          setTimerRunning(isManuallyPaused ? false : true);
        } else {
          setTimerRunning(false);
        }

        // Tự động đồng bộ các hạng mục từ DB nếu danh sách hiện tại rỗng
        if (Array.isArray(res.repairItems) && res.repairItems.length > 0) {
          setTasks((prev) => {
            if (prev.length === 0) {
              return res.repairItems!.map((s: any, idx: number) => ({
                id: s.id || idx + 1,
                title: s.name,
                sub: `Đơn giá: ${formatVnd(s.price)} · ${s.status === 'APPROVED' ? 'Đã duyệt' : 'Dự kiến'}`,
                completed: false,
                note: '',
                price: s.price,
              }));
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('Lỗi nạp đơn trong tiến trình sửa chữa:', err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    checkJobStatus();
    const interval = setInterval(checkJobStatus, 3500);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [requestId, isManuallyPaused]);

  // 2. Nạp các hạng mục công việc ban đầu từ params
  useEffect(() => {
    if (params.selectedServices) {
      try {
        const parsed = JSON.parse(params.selectedServices);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped: ChecklistItem[] = parsed.map((s: any, idx: number) => ({
            id: s.id || idx + 1,
            title: s.name,
            sub: `Đơn giá: ${formatVnd(s.price)} · Hạng mục đã chọn`,
            completed: false,
            note: '',
            price: s.price,
          }));
          setTasks(mapped);
          return;
        }
      } catch (e) {
        console.warn('Lỗi parse selectedServices:', e);
      }
    }
  }, [params.selectedServices]);

  // Đếm giờ sửa chữa tại chỗ (chỉ chạy khi timerRunning === true)
  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  // Kiểm tra khách đã duyệt báo giá chưa
  const isApproved =
    job?.status === 'REPAIRING_ONSITE' ||
    job?.status === 'TOW_TO_GARAGE' ||
    job?.status === 'TOWING' ||
    job?.quoteStatus === 'ACCEPTED' ||
    job?.quoteStatus === 'APPROVED' ||
    isTow;

  // ── MỞ MODAL THÊM HẠNG MỤC PHÁT SINH ──
  const openAddItemModal = async () => {
    setAddItemModalVisible(true);
    setSelectedCatalogItem(null);
    setCatalogNote('');
    if (catalogServices.length === 0) {
      try {
        setLoadingCatalog(true);
        const [catsRes, srvRes, garageSrvRes] = await Promise.all([
          garageApi.listCategories().catch(() => []),
          garageApi.listServices().catch(() => []),
          garageApi.listGarageServices().catch(() => []),
        ]);

        const rawCategories: any[] = Array.isArray(catsRes) ? catsRes : [];
        const rawServices: any[] = (Array.isArray(garageSrvRes) && garageSrvRes.length > 0)
          ? garageSrvRes
          : (Array.isArray(srvRes) ? srvRes : []);

        setCategories(rawCategories);

        if (rawServices.length > 0) {
          const mapped = rawServices
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
                code: item.serviceCode || item.code,
                categoryId: item.categoryId || (item.category ? item.category.id : undefined),
                categoryName: item.categoryName || (item.category ? item.category.name : undefined),
                unit: item.unit,
              };
            });
          setCatalogServices(mapped);
        } else {
          // Fallback danh mục sửa chữa phong phú tại garage
          setCatalogServices([
            { id: 101, name: 'Vá lốp xe lưu động / tại xưởng', price: 120000, categoryId: 1, categoryName: 'Cứu hộ lốp & Bánh xe' },
            { id: 102, name: 'Thay lốp xe dự phòng', price: 250000, categoryId: 1, categoryName: 'Cứu hộ lốp & Bánh xe' },
            { id: 103, name: 'Kích bình ắc quy 12V', price: 180000, categoryId: 2, categoryName: 'Điện & Ắc quy' },
            { id: 104, name: 'Thay bình ắc quy mới', price: 850000, categoryId: 2, categoryName: 'Điện & Ắc quy' },
            { id: 105, name: 'Thay bugi đánh lửa xe', price: 150000, categoryId: 3, categoryName: 'Động cơ & Nhiên liệu' },
            { id: 106, name: 'Thay dầu nhớt động cơ & lọc nhớt', price: 280000, categoryId: 3, categoryName: 'Động cơ & Nhiên liệu' },
            { id: 107, name: 'Căn chỉnh & thay má phanh', price: 320000, categoryId: 4, categoryName: 'Hệ thống phanh' },
            { id: 108, name: 'Thay dây curoa / xích tải', price: 350000, categoryId: 3, categoryName: 'Động cơ & Nhiên liệu' },
            { id: 109, name: 'Cân chỉnh thước lái / giảm xóc', price: 400000, categoryId: 4, categoryName: 'Khung gầm & Giảm xóc' },
          ]);
        }
      } catch (e) {
        console.warn('Lỗi tải danh mục dịch vụ:', e);
      } finally {
        setLoadingCatalog(false);
      }
    }
  };

  // 1. Xác nhận thêm từ Menu Dịch vụ có sẵn (Tên & Giá lấy 100% từ data dịch vụ)
  const handleAddCatalogItem = async () => {
    Keyboard.dismiss();
    if (!selectedCatalogItem) {
      setConfirmModal({
        visible: true,
        title: 'Chưa chọn dịch vụ',
        message: 'Vui lòng nhấn chọn một dịch vụ từ danh mục dịch vụ bên dưới.',
        type: 'warn',
      });
      return;
    }
    const name = selectedCatalogItem.name;
    const price = selectedCatalogItem.price;

    try {
      setSubmittingItem(true);
      const updated = await rescueApi.addRepairItem(requestId, {
        name,
        price,
        quantity: 1,
        serviceId: selectedCatalogItem.id,
        note: catalogNote.trim() || undefined,
      });

      // Thêm ngay vào checklist trên màn hình
      const newItem: ChecklistItem = {
        id: Date.now(),
        title: name,
        sub: `Đơn giá: ${formatVnd(price)} · Menu dịch vụ có sẵn`,
        completed: false,
        note: catalogNote.trim(),
        price,
      };
      setTasks((prev) => [...prev, newItem]);

      if (updated) {
        setJob(updated);
      }

      setAddItemModalVisible(false);
      setSelectedCatalogItem(null);
      setCatalogNote('');

      setConfirmModal({
        visible: true,
        title: 'Đã thêm dịch vụ',
        message: `Đã bổ sung "${name}" (+${formatVnd(price)}) từ danh mục vào đơn sửa chữa.`,
        type: 'success',
      });
    } catch (e: any) {
      setConfirmModal({
        visible: true,
        title: 'Lỗi thêm dịch vụ',
        message: e?.response?.data?.message || e?.message || 'Không thể thêm dịch vụ lúc này.',
        type: 'error',
      });
    } finally {
      setSubmittingItem(false);
    }
  };

  // 2. Xác nhận thêm hạng mục tự ghi chú & tự gõ giá
  const handleConfirmCustomItem = async () => {
    Keyboard.dismiss();
    const name = customName.trim();
    const priceNum = parseInt(customPrice.replace(/\D/g, ''), 10) || 0;
    if (!name) {
      setConfirmModal({
        visible: true,
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập tên công việc hoặc linh kiện cần sửa chữa.',
        type: 'warn',
      });
      return;
    }
    if (priceNum <= 0) {
      setConfirmModal({
        visible: true,
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập chi phí sửa chữa / đơn giá hợp lệ.',
        type: 'warn',
      });
      return;
    }

    try {
      setSubmittingItem(true);
      const updated = await rescueApi.addRepairItem(requestId, {
        name,
        price: priceNum,
        quantity: 1,
        note: customNote.trim() || undefined,
      });

      // Thêm ngay vào checklist trên màn hình
      const newItem: ChecklistItem = {
        id: Date.now(),
        title: name,
        sub: `Đơn giá: ${formatVnd(priceNum)} · Tự ghi chú phát sinh`,
        completed: false,
        note: customNote.trim(),
        price: priceNum,
      };
      setTasks((prev) => [...prev, newItem]);

      if (updated) {
        setJob(updated);
      }

      setAddItemModalVisible(false);
      setCustomName('');
      setCustomPrice('');
      setCustomNote('');

      setConfirmModal({
        visible: true,
        title: 'Đã thêm hạng mục',
        message: `Đã bổ sung "${name}" (+${formatVnd(priceNum)}) vào đơn sửa chữa.`,
        type: 'success',
      });
    } catch (e: any) {
      setConfirmModal({
        visible: true,
        title: 'Lỗi thêm hạng mục',
        message: e?.response?.data?.message || e?.message || 'Không thể thêm hạng mục lúc này.',
        type: 'error',
      });
    } finally {
      setSubmittingItem(false);
    }
  };

  // ── HOÀN THÀNH SỬA CHỮA ──
  const handleFinishRepair = () => {
    if (!isApproved) {
      setConfirmModal({
        visible: true,
        title: 'Khách chưa duyệt báo giá',
        message: 'Khách hàng chưa đồng ý báo giá sửa xe. Bạn chưa thể hoàn tất sửa chữa khi khách chưa đồng ý.',
        type: 'warn',
        confirmText: 'Đã hiểu',
      });
      return;
    }

    const uncompleted = tasks.filter((t) => !t.completed);
    if (uncompleted.length > 0) {
      setConfirmModal({
        visible: true,
        title: 'Chưa tích hoàn tất',
        message: `Còn ${uncompleted.length} hạng mục chưa được đánh dấu hoàn thành. Bạn có chắc chắn muốn xác nhận xong toàn bộ để mời khách nhận xe?`,
        type: 'confirm',
        cancelText: 'Kiểm tra lại',
        confirmText: 'Vẫn hoàn thành',
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, visible: false }));
          submitCompletion();
        },
      });
      return;
    }

    setConfirmModal({
      visible: true,
      title: 'Xác nhận hoàn thành sửa chữa?',
      message: isTow
        ? 'Bạn có chắc chắn đã sửa chữa hoàn tất xe tại garage? Hệ thống sẽ cập nhật trạng thái đơn thành COMPLETED và thông báo mời khách hàng đến nhận xe và thanh toán.'
        : 'Bạn có chắc chắn đã hoàn thành sửa chữa phương tiện? Hệ thống sẽ gửi yêu cầu thanh toán đến khách hàng.',
      type: 'confirm',
      cancelText: 'Kiểm tra lại',
      confirmText: 'Xác nhận hoàn thành',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        submitCompletion();
      },
    });
  };

  const submitCompletion = async () => {
    try {
      if (Number.isFinite(requestId)) {
        await rescueApi.advance(requestId, 'COMPLETED');
      }
      router.replace('/garage-staff/home');
    } catch (e: any) {
      setConfirmModal({
        visible: true,
        title: 'Lỗi hoàn tất',
        message: e?.response?.data?.message || e?.message || 'Không thể cập nhật trạng thái lúc này.',
        type: 'error',
      });
    }
  };

  // Thông tin xe & khách hàng
  const customerName = job?.customer?.name || 'Khách hàng';
  const customerPhone = job?.customer?.phone || '';
  const vehicleName = job?.vehicleType === 'CAR' ? 'Ô tô' : 'Xe máy';
  const orderCode = job?.code ? `#${job.code}` : `#TK-${requestId || '88291'}`;

  const evidencePhoto =
    params.photoUri ||
    (job?.photos && job.photos.length > 0
      ? resolveFileUrl(job.photos[0])
      : null);

  // Bóc tách chi tiết từng loại chi phí minh bạch
  const inspectionFee = job?.inspectionFee ?? job?.rescueFee ?? 0;
  const towingFee = job?.towingFee ?? 0;
  const repairFee =
    job?.serviceFee ??
    job?.repairFee ??
    tasks.reduce((sum, t) => sum + (t.price || 0), 0);
  const hasPaidDeposit = Boolean(
    job?.depositRequired &&
      (job?.depositStatus === 'PAID' || job?.depositStatus === 'TRANSFERRED_TO_GARAGE')
  );
  const depositDeduction = hasPaidDeposit ? (job?.depositAmount || 50000) : 0;
  const grossGrandTotal = inspectionFee + (isTow ? towingFee : 0) + repairFee;
  const calculatedGrandTotal =
    job?.totalAmount ?? Math.max(0, grossGrandTotal - depositDeduction);
  const grandTotalFee = calculatedGrandTotal;

  // Lọc catalog theo category và từ khóa
  const filteredCatalog = catalogServices.filter((srv) => {
    const matchCat = !selectedCategoryId || srv.categoryId === selectedCategoryId;
    const matchQ = !searchCatalogQuery.trim() || srv.name?.toLowerCase().includes(searchCatalogQuery.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isTow ? 'Tiến Độ Sửa Chữa Tại Garage' : 'Thực Hiện Sửa Chữa Tại Chỗ'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* ── CARD TRẠNG THÁI: LOGIC KÉO VỀ GARA ĐÃ BỎ TIMER ── */}
        {isTow ? (
          <View style={styles.towWorkshopCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 20 }}>🚚</Text>
              <Text style={styles.towWorkshopTitle}>ĐANG SỬA CHỮA TẠI GARAGE</Text>
            </View>
            <Text style={styles.towWorkshopDesc}>
              Phương tiện đã được kéo về garage an toàn. Thợ đang tiến hành sửa chữa tại xưởng.
              {job?.towingReason ? `\nLý do kéo xe: ${job.towingReason}` : ''}
            </Text>
          </View>
        ) : null}

        {/* ── BẢNG KÊ CHI TIẾT TỪNG LOẠI TIỀN HIỆN TẠI (MINH BẠCH, RÕ RÀNG) ── */}
        <View style={styles.feeBreakdownCard}>
          <View style={styles.feeBreakdownHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <DollarSign size={18} color={BRAND_ORANGE} style={{ marginRight: 6 }} />
              <Text style={styles.feeBreakdownTitle}>BẢNG CHI PHÍ HIỆN TẠI</Text>
            </View>
            <View style={styles.feeBadgeLive}>
              <Text style={styles.feeBadgeLiveText}>Tạm tính</Text>
            </View>
          </View>

          {/* 1. Phí di chuyển đến / kiểm tra xe */}
          <View style={styles.feeDetailRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.feeDetailLabel}>📍 Phí di chuyển & kiểm tra</Text>
              <Text style={styles.feeDetailSub}>Cước thợ đến hiện trường & thẩm định ban đầu</Text>
            </View>
            <Text style={styles.feeDetailVal}>{formatVnd(inspectionFee)}</Text>
          </View>

          {/* 2. Cước kéo xe về garage (nếu có) */}
          {(isTow || towingFee > 0) && (
            <View style={styles.feeDetailRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.feeDetailLabel}>🚚 Cước kéo xe về garage</Text>
                <Text style={styles.feeDetailSub}>
                  {job?.towingReason ? `Lý do: ${job.towingReason}` : 'Cước xe kéo chuyên dụng về xưởng'}
                </Text>
              </View>
              <Text style={[styles.feeDetailVal, { color: '#c2410c' }]}>{formatVnd(towingFee)}</Text>
            </View>
          )}

          {/* 3. Phí sửa chữa & phụ tùng */}
          <View style={styles.feeDetailRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.feeDetailLabel}>🛠️ Phí sửa chữa & phụ tùng</Text>
              <Text style={styles.feeDetailSub}>
                Gồm {tasks.length} hạng mục ({tasks.filter((t) => t.completed).length}/{tasks.length} hoàn thành)
              </Text>
            </View>
            <Text style={styles.feeDetailVal}>{formatVnd(repairFee)}</Text>
          </View>

          {/* Vạch kẻ phân cách */}
          <View style={styles.feeDivider} />

          {hasPaidDeposit ? (
            <>
              <View style={[styles.feeDetailRow, { marginBottom: 6 }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.feeDetailLabel}>💰 Tổng giá trị dịch vụ (Gara nhận đủ)</Text>
                </View>
                <Text style={styles.feeDetailVal}>{formatVnd(grossGrandTotal)}</Text>
              </View>
              <View
                style={[
                  styles.feeDetailRow,
                  {
                    backgroundColor: '#f0fdf4',
                    padding: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#86efac',
                    marginBottom: 10,
                  },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.feeDetailLabel, { color: '#15803d' }]}>
                    ✓ Khách đã đặt cọc trước (Sàn giữ)
                  </Text>
                  <Text style={[styles.feeDetailSub, { color: '#166534' }]}>
                    Sàn sẽ tự động giải ngân trả đủ {formatVnd(depositDeduction)} về ví tiền mặt Gara khi hoàn tất
                  </Text>
                </View>
                <Text style={[styles.feeDetailVal, { color: '#15803d' }]}>
                  -{formatVnd(depositDeduction)}
                </Text>
              </View>
              <View style={styles.feeTotalRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.feeTotalLabel}>KHÁCH CẦN TRẢ THÊM</Text>
                  <Text style={styles.feeTotalSub}>
                    Đã trừ {formatVnd(depositDeduction)} tiền cọc của khách tại sàn
                  </Text>
                </View>
                <Text style={styles.feeTotalVal}>{formatVnd(calculatedGrandTotal)}</Text>
              </View>
            </>
          ) : (
            /* 4. Tổng tiền hiện tại */
            <View style={styles.feeTotalRow}>
              <View>
                <Text style={styles.feeTotalLabel}>TỔNG TIỀN HIỆN TẠI</Text>
                <Text style={styles.feeTotalSub}>Đã cộng dồn tất cả các khoản chi phí phát sinh</Text>
              </View>
              <Text style={styles.feeTotalVal}>{formatVnd(calculatedGrandTotal)}</Text>
            </View>
          )}
        </View>

        {!isTow && (
          /* CARD ĐỒNG HỒ ĐẾM GIỜ DÀNH RIÊNG CHO SỬA CHỮA TẠI CHỖ */
          <View style={styles.timerCard}>
            <Text style={styles.timerLabel}>THỜI GIAN THỰC HIỆN TẠI CHỖ</Text>
            <Text style={[styles.timerValue, !isApproved && { color: '#94A3B8' }]}>
              {formatTimer(seconds)}
            </Text>

            {isApproved ? (
              <View style={styles.timerBadgeApproved}>
                <CheckCircle2 size={13} color="#16A34A" />
                <Text style={styles.timerBadgeApprovedText}>
                  Khách đã duyệt báo giá · Đang tính thời gian thực hiện
                </Text>
              </View>
            ) : (
              <View style={styles.timerBadgeWaiting}>
                <Text style={styles.timerBadgeWaitingText}>
                  ⏳ Đang chờ khách đồng ý báo giá · Chưa tính thời gian
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.pauseBtn, !isApproved && { opacity: 0.5 }]}
              onPress={() => {
                if (!isApproved) {
                  Alert.alert(
                    'Chưa tính giờ',
                    'Đồng hồ chỉ bắt đầu đếm khi khách hàng xác nhận đồng ý báo giá trên ứng dụng.'
                  );
                  return;
                }
                const nextState = !timerRunning;
                setTimerRunning(nextState);
                setIsManuallyPaused(!nextState);
              }}
              activeOpacity={0.8}
            >
              {timerRunning ? (
                <>
                  <Pause size={14} color="#475569" style={{ marginRight: 4 }} />
                  <Text style={styles.pauseBtnText}>Tạm dừng</Text>
                </>
              ) : (
                <>
                  <Play size={14} color={BRAND_ORANGE} style={{ marginRight: 4 }} />
                  <Text style={[styles.pauseBtnText, { color: BRAND_ORANGE }]}>
                    {isApproved ? 'Tiếp tục' : 'Chờ khách duyệt'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Card Thông tin xe khách hàng */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Car size={18} color="#2563EB" />
            <Text style={[styles.cardTitle, { marginLeft: 6, marginBottom: 0 }]}>
              Thông tin xe & Khách hàng
            </Text>
          </View>

          {evidencePhoto ? (
            <Image
              source={{ uri: evidencePhoto }}
              style={styles.carImage}
              resizeMode="cover"
            />
          ) : null}

          <View style={styles.carDetailGrid}>
            <View style={styles.carDetailRow}>
              <Text style={styles.carDetailLabel}>Khách hàng</Text>
              <Text style={styles.carDetailVal}>{customerName}</Text>
            </View>
            {customerPhone ? (
              <View style={styles.carDetailRow}>
                <Text style={styles.carDetailLabel}>Số điện thoại</Text>
                <Text style={[styles.carDetailVal, { color: '#2563EB' }]}>{customerPhone}</Text>
              </View>
            ) : null}
            <View style={styles.carDetailRow}>
              <Text style={styles.carDetailLabel}>Loại phương tiện</Text>
              <Text style={styles.carDetailVal}>{vehicleName}</Text>
            </View>
            <View style={styles.carDetailRow}>
              <Text style={styles.carDetailLabel}>Mã đơn</Text>
              <Text style={styles.carDetailVal}>{orderCode}</Text>
            </View>
            {job?.symptom ? (
              <View style={styles.carDetailRow}>
                <Text style={styles.carDetailLabel}>Mô tả sự cố ban đầu</Text>
                <Text style={[styles.carDetailVal, { flex: 1, textAlign: 'right', marginLeft: 12 }]} numberOfLines={2}>
                  {job.symptom}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── CARD CÁC HẠNG MỤC CÔNG VIỆC & NÚT THÊM PHÁT SINH ── */}
        <View style={styles.card}>
          <View style={styles.taskHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Wrench size={18} color={BRAND_ORANGE} />
              <Text style={[styles.cardTitle, { marginLeft: 6, marginBottom: 0 }]}>
                Hạng mục sửa chữa ({tasks.length})
              </Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressText}>
                Đã xử lý {completedCount}/{tasks.length}
              </Text>
            </View>
          </View>

          {/* Nút THÊM HẠNG MỤC PHÁT SINH (Yêu cầu quan trọng của người dùng) */}
          <TouchableOpacity
            style={styles.addExtraBtn}
            onPress={openAddItemModal}
            activeOpacity={0.88}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={3} />
            <Text style={styles.addExtraBtnText}>+ Thêm hạng mục phát sinh tại garage</Text>
          </TouchableOpacity>

          {tasks.length === 0 ? (
            <Text style={{ fontSize: 13, color: SUB, paddingVertical: 12, textAlign: 'center' }}>
              Chưa có hạng mục sửa chữa nào. Nhấn nút bên trên để thêm hạng mục.
            </Text>
          ) : (
            tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[styles.taskItem, task.completed && styles.taskItemDone]}
                onPress={() => toggleTask(task.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.taskCheckbox, task.completed && styles.taskCheckboxDone]}>
                  {task.completed && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>
                    {task.title}
                  </Text>
                  <Text style={styles.taskSub}>{task.sub}</Text>
                  {!task.completed && (
                    <TextInput
                      style={styles.taskNoteInput}
                      placeholder="Ghi chú thêm tình trạng linh kiện..."
                      placeholderTextColor="#94A3B8"
                      value={task.note}
                      onChangeText={(val) => {
                        setTasks((prev) =>
                          prev.map((t) => (t.id === task.id ? { ...t, note: val } : t))
                        );
                      }}
                    />
                  )}
                </View>
                {task.completed && (
                  <View style={styles.checkDoneCircle}>
                    <Check size={12} color="#16A34A" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}

          {/* Tổng tiền dự tính hiển thị ngay dưới danh sách */}
          <View style={styles.totalBox}>
            <Text style={styles.totalBoxLabel}>Tổng chi phí ước tính:</Text>
            <Text style={styles.totalBoxVal}>{formatVnd(grandTotalFee)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar: Báo cáo vấn đề & Hoàn thành */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() =>
            Alert.alert(
              'Báo cáo sự cố',
              'Gửi cảnh báo phát sinh vấn đề kỹ thuật tới quản lý Gara hoặc bộ phận hỗ trợ.'
            )
          }
        >
          <Text style={styles.reportBtnText}>Báo cáo Vấn đề</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.finishBtn} onPress={handleFinishRepair}>
          <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.finishBtnText}>Hoàn thành sửa chữa</Text>
        </TouchableOpacity>
      </View>

      {/* ── MODAL: THÊM HẠNG MỤC PHÁT SINH TẠI GARAGE ── */}
      <Modal
        visible={addItemModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setAddItemModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.modalBackdropTap} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Sparkles size={20} color={BRAND_ORANGE} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Thêm Hạng Mục Phát Sinh</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setAddItemModalVisible(false);
                }}
                style={styles.closeBtn}
              >
                <X size={20} color={BRAND_ORANGE} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Khi xe về garage phát hiện hư hỏng thêm, bạn có thể chọn từ menu hoặc tự ghi chú hạng mục kèm đơn giá để cộng vào tổng tiền.
            </Text>

            {/* Tab Chọn: Menu Dịch Vụ Có Sẵn VS Tự Ghi Chú & Đơn Giá */}
            <View style={styles.tabToggleRow}>
              <TouchableOpacity
                style={[styles.tabToggleBtn, addItemMode === 'CATALOG' && styles.tabToggleBtnActive]}
                onPress={() => {
                  Keyboard.dismiss();
                  setAddItemMode('CATALOG');
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabToggleText,
                    addItemMode === 'CATALOG' && styles.tabToggleTextActive,
                  ]}
                >
                  📋 Menu Dịch Vụ Có Sẵn
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabToggleBtn, addItemMode === 'CUSTOM' && styles.tabToggleBtnActive]}
                onPress={() => {
                  Keyboard.dismiss();
                  setAddItemMode('CUSTOM');
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabToggleText,
                    addItemMode === 'CUSTOM' && styles.tabToggleTextActive,
                  ]}
                >
                  ✍️ Tự Ghi Chú & Đơn Giá
                </Text>
              </TouchableOpacity>
            </View>

            {addItemMode === 'CATALOG' ? (
              /* TAB 1: CHỌN TỪ MENU DỊCH VỤ CÓ SẴN (Lấy tên và giá từ data danh mục dịch vụ) */
              <View style={{ flexShrink: 1 }}>
                {/* Search box */}
                <View style={styles.searchBox}>
                  <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm tên dịch vụ, phụ tùng..."
                    placeholderTextColor="#94A3B8"
                    value={searchCatalogQuery}
                    onChangeText={setSearchCatalogQuery}
                  />
                  {searchCatalogQuery ? (
                    <TouchableOpacity onPress={() => setSearchCatalogQuery('')}>
                      <X size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Categories horizontal filter */}
                {categories.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10, flexGrow: 0 }}>
                    <TouchableOpacity
                      style={[
                        styles.catChip,
                        selectedCategoryId === null && styles.catChipActive,
                      ]}
                      onPress={() => setSelectedCategoryId(null)}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          selectedCategoryId === null && styles.catChipTextActive,
                        ]}
                      >
                        Tất cả
                      </Text>
                    </TouchableOpacity>
                    {categories.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.catChip,
                          selectedCategoryId === c.id && styles.catChipActive,
                        ]}
                        onPress={() => setSelectedCategoryId(c.id)}
                      >
                        <Text
                          style={[
                            styles.catChipText,
                            selectedCategoryId === c.id && styles.catChipTextActive,
                          ]}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {loadingCatalog ? (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <ActivityIndicator color={BRAND_ORANGE} />
                    <Text style={{ fontSize: 12, color: SUB, marginTop: 6 }}>Đang tải menu dịch vụ...</Text>
                  </View>
                ) : filteredCatalog.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: SUB, paddingVertical: 24, fontSize: 13 }}>
                    Không tìm thấy dịch vụ nào phù hợp.
                  </Text>
                ) : (
                  <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {filteredCatalog.map((srv) => {
                      const isSelected = selectedCatalogItem?.id === srv.id;
                      return (
                        <TouchableOpacity
                          key={srv.id}
                          style={[styles.catalogItem, isSelected && styles.catalogItemSelected]}
                          onPress={() => setSelectedCatalogItem(srv)}
                          activeOpacity={0.8}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.catalogItemName, isSelected && { color: BRAND_ORANGE }]}>
                              {srv.name}
                            </Text>
                            <Text style={styles.catalogItemPrice}>{formatVnd(srv.price || 0)}</Text>
                            {srv.categoryName && (
                              <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                                {srv.categoryName}
                              </Text>
                            )}
                          </View>
                          <View style={[styles.catalogSelectPill, isSelected && styles.catalogSelectPillActive]}>
                            {isSelected ? (
                              <Check size={14} color="#FFFFFF" strokeWidth={3} />
                            ) : (
                              <Text style={styles.catalogSelectText}>Chọn</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Khung xem trước dịch vụ đã chọn & nút Xác nhận thêm */}
                {selectedCatalogItem ? (
                  <View style={styles.selectedCatalogBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.selectedCatalogTitle} numberOfLines={1}>
                        ✓ {selectedCatalogItem.name}
                      </Text>
                      <Text style={styles.selectedCatalogPrice}>
                        {formatVnd(selectedCatalogItem.price || 0)}
                      </Text>
                    </View>
                    <TextInput
                      style={styles.catalogNoteInput}
                      placeholder="Ghi chú thêm lý do phát sinh (không bắt buộc)..."
                      placeholderTextColor="#94A3B8"
                      value={catalogNote}
                      onChangeText={setCatalogNote}
                    />
                    <TouchableOpacity
                      style={[styles.confirmAddBtn, submittingItem && { opacity: 0.7 }]}
                      onPress={handleAddCatalogItem}
                      disabled={submittingItem}
                      activeOpacity={0.88}
                    >
                      {submittingItem ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.confirmAddBtnText}>
                            Xác nhận thêm dịch vụ này (+{formatVnd(selectedCatalogItem.price || 0)})
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.catalogHintText}>
                    💡 Nhấn chọn một dịch vụ từ danh mục ở trên để thêm nhanh vào đơn.
                  </Text>
                )}
              </View>
            ) : (
              /* TAB 2: TỰ GHI CHÚ & TỰ GHI GIÁ TIỀN */
              <ScrollView
                style={{ maxHeight: 380 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Tên công việc / Linh kiện thay thế *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: Thay dây curoa, Căn chỉnh phanh, Thay bugi..."
                    placeholderTextColor="#94A3B8"
                    value={customName}
                    onChangeText={setCustomName}
                  />
                </View>

                <View style={styles.formGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={styles.formLabel}>Đơn giá (VND) *</Text>
                    <TouchableOpacity
                      onPress={() => Keyboard.dismiss()}
                      style={styles.dismissKeyBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dismissKeyText}>Ẩn bàn phím ✕</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: 150000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={() => Keyboard.dismiss()}
                    value={customPrice}
                    onChangeText={(val) => {
                      const num = val.replace(/\D/g, '');
                      setCustomPrice(num);
                    }}
                  />
                  {customPrice ? (
                    <Text style={styles.pricePreview}>
                      Số tiền: {formatVnd(parseInt(customPrice, 10) || 0)}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Ghi chú cụ thể lý do phát sinh</Text>
                  <TextInput
                    style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                    placeholder="VD: Linh kiện cũ bị mòn rỉ sét, phát hiện khi tháo máy..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={customNote}
                    onChangeText={setCustomNote}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.confirmAddBtn, submittingItem && { opacity: 0.7 }]}
                  onPress={handleConfirmCustomItem}
                  disabled={submittingItem}
                  activeOpacity={0.88}
                >
                  {submittingItem ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.confirmAddBtnText}>
                        Xác nhận thêm vào đơn (+{formatVnd(parseInt(customPrice, 10) || 0)})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL POPUP THÔNG BÁO & XÁC NHẬN CAM THẨM MỸ CAO ── */}
      <Modal visible={confirmModal.visible} transparent animationType="fade">
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalBox}>
            <View
              style={[
                styles.confirmModalIconCircle,
                {
                  backgroundColor:
                    confirmModal.type === 'error'
                      ? '#FEF2F2'
                      : confirmModal.type === 'warn'
                      ? '#FFFBEB'
                      : '#FFF7ED',
                  borderColor:
                    confirmModal.type === 'error'
                      ? '#FCA5A5'
                      : '#FED7AA',
                },
              ]}
            >
              {confirmModal.type === 'error' ? (
                <AlertOctagon size={36} color="#DC2626" />
              ) : confirmModal.type === 'warn' ? (
                <AlertCircle size={36} color="#D97706" />
              ) : confirmModal.type === 'confirm' ? (
                <Sparkles size={36} color={BRAND_ORANGE} />
              ) : (
                <CheckCircle2 size={36} color={BRAND_ORANGE} />
              )}
            </View>

            <Text style={styles.confirmModalTitle}>{confirmModal.title}</Text>
            <Text style={styles.confirmModalDesc}>{confirmModal.message}</Text>

            {confirmModal.type === 'confirm' ? (
              <View style={styles.confirmModalBtnRow}>
                <TouchableOpacity
                  style={styles.confirmModalCancelBtn}
                  onPress={() => {
                    if (confirmModal.onCancel) confirmModal.onCancel();
                    setConfirmModal((prev) => ({ ...prev, visible: false }));
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmModalCancelText}>
                    {confirmModal.cancelText || 'Kiểm tra lại'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmModalConfirmBtn}
                  onPress={() => {
                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={styles.confirmModalConfirmText}>
                    {confirmModal.confirmText || 'Xác nhận'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.confirmModalSingleBtn,
                  {
                    backgroundColor:
                      confirmModal.type === 'error' ? '#DC2626' : BRAND_ORANGE,
                  },
                ]}
                onPress={() => {
                  if (confirmModal.onConfirm) {
                    confirmModal.onConfirm();
                  } else {
                    setConfirmModal((prev) => ({ ...prev, visible: false }));
                  }
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.confirmModalConfirmText}>
                  {confirmModal.confirmText || 'Đã hiểu'}
                </Text>
              </TouchableOpacity>
            )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: BRAND_ORANGE },
  container: { flex: 1, padding: 16 },

  // ── CARD THÔNG BÁO CHO ĐƠN KÉO VỀ XƯỞNG (ĐÃ BỎ TIMER) ──
  towWorkshopCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  towWorkshopTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#C2410C',
    marginLeft: 6,
  },
  towWorkshopDesc: {
    fontSize: 13,
    color: '#9A3412',
    lineHeight: 19,
    marginTop: 4,
  },
  // ── BẢNG KÊ CHI TIẾT CHI PHÍ HIỆN TẠI ──
  feeBreakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    shadowColor: BRAND_ORANGE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  feeBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFEDD5',
  },
  feeBreakdownTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#9A3412',
    letterSpacing: 0.3,
  },
  feeBadgeLive: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  feeBadgeLiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND_ORANGE,
  },
  feeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  feeDetailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  feeDetailSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  feeDetailVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  feeDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  feeTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  feeTotalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  feeTotalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  feeTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: BRAND_ORANGE,
  },

  // ── CARD TIMER CHO SỬA CHỮA TẠI CHỖ ──
  timerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  timerLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  timerValue: { fontSize: 36, fontWeight: '900', color: BRAND_ORANGE, marginVertical: 8 },
  timerBadgeApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
  },
  timerBadgeApprovedText: { fontSize: 12, fontWeight: '700', color: '#166534' },
  timerBadgeWaiting: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  timerBadgeWaitingText: { fontSize: 12, fontWeight: '700', color: '#B45309' },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pauseBtnText: { fontSize: 12, fontWeight: '600', color: '#475569' },

  // ── CARDS CHUNG ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  carImage: { width: '100%', height: 140, borderRadius: 12, marginBottom: 12, backgroundColor: '#F1F5F9' },
  carDetailGrid: { gap: 8 },
  carDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  carDetailLabel: { fontSize: 13, color: '#64748B' },
  carDetailVal: { fontSize: 13, fontWeight: '700', color: '#0F172A' },

  taskHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressText: { fontSize: 11, fontWeight: '700', color: BRAND_ORANGE },

  // NÚT THÊM HẠNG MỤC PHÁT SINH
  addExtraBtn: {
    backgroundColor: BRAND_ORANGE,
    borderRadius: 10,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    gap: 6,
  },
  addExtraBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  taskItemDone: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: BRAND_ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  taskCheckboxDone: { backgroundColor: BRAND_ORANGE, borderColor: BRAND_ORANGE },
  taskTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#64748B' },
  taskSub: { fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 16 },
  taskNoteInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    marginTop: 8,
    color: '#0F172A',
  },
  checkDoneCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },

  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  totalBoxLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  totalBoxVal: {
    fontSize: 15,
    fontWeight: '900',
    color: BRAND_ORANGE,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  reportBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportBtnText: { fontSize: 13, fontWeight: '800', color: BRAND_ORANGE },
  finishBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 12,
    backgroundColor: BRAND_ORANGE,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  // ── MODAL STYLES ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    borderTopColor: '#FED7AA',
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  modalSub: {
    fontSize: 12,
    color: SUB,
    lineHeight: 17,
    marginBottom: 14,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  tabToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabToggleTextActive: {
    color: BRAND_ORANGE,
  },

  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  pricePreview: {
    fontSize: 12,
    color: BRAND_ORANGE,
    fontWeight: '700',
    marginTop: 4,
  },
  confirmAddBtn: {
    backgroundColor: BRAND_ORANGE,
    borderRadius: 12,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  confirmAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  catChipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  catChipTextActive: {
    color: BRAND_ORANGE,
    fontWeight: '800',
  },
  catalogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  catalogItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  catalogItemPrice: {
    fontSize: 12,
    color: BRAND_ORANGE,
    fontWeight: '800',
    marginTop: 2,
  },
  catalogSelectPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  catalogSelectText: {
    fontSize: 12,
    fontWeight: '800',
    color: BRAND_ORANGE,
  },
  modalBackdropTap: {
    flex: 1,
  },
  dismissKeyBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dismissKeyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  catalogItemSelected: {
    borderColor: BRAND_ORANGE,
    backgroundColor: '#FFF7ED',
  },
  catalogSelectPillActive: {
    backgroundColor: BRAND_ORANGE,
    borderColor: BRAND_ORANGE,
  },
  selectedCatalogBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  selectedCatalogTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C2410C',
    flex: 1,
    marginRight: 8,
  },
  selectedCatalogPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: BRAND_ORANGE,
  },
  catalogNoteInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: '#0F172A',
    marginTop: 8,
  },
  catalogHintText: {
    textAlign: 'center',
    fontSize: 12,
    color: SUB,
    marginTop: 10,
    fontStyle: 'italic',
  },

  // ── CONFIRM / NOTICE POPUP MODAL STYLES TONE CAM ĐẸP ──
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    shadowColor: '#EA580C',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 25,
    elevation: 10,
  },
  confirmModalIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  confirmModalDesc: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmModalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  confirmModalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalCancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: BRAND_ORANGE,
  },
  confirmModalConfirmBtn: {
    flex: 1.2,
    height: 46,
    borderRadius: 14,
    backgroundColor: BRAND_ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND_ORANGE,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  confirmModalConfirmText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  confirmModalSingleBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND_ORANGE,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
});
