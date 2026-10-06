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
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto } from '../../api/rescueApi';
import { resolveFileUrl } from '../../api/axiosClient';
import { formatVnd } from '../../utils/rescueFee';

const BRAND_ORANGE = '#FF5500';
const GREEN = '#16a34a';
const SUB = '#64748b';
const INK = '#0f172a';

interface ChecklistItem {
  id: number;
  title: string;
  sub: string;
  completed: boolean;
  note?: string;
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
  const [seconds, setSeconds] = useState(0); // Bắt đầu đếm từ 00:00:00 khi thợ bắt tay sửa
  const [timerRunning, setTimerRunning] = useState(true);

  // Danh sách công việc cần làm lấy từ dịch vụ thợ vừa chọn
  const [tasks, setTasks] = useState<ChecklistItem[]>([]);

  // 1. Nạp chi tiết đơn cứu hộ từ API
  useEffect(() => {
    if (Number.isNaN(requestId)) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await rescueApi.getOne(requestId);
        if (alive) setJob(res);
      } catch (err) {
        console.warn('Lỗi nạp đơn trong tiến trình sửa chữa:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [requestId]);

  // 2. Nạp các hạng mục công việc từ danh sách thợ vừa chọn
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
          }));
          setTasks(mapped);
          return;
        }
      } catch (e) {
        console.warn('Lỗi parse selectedServices:', e);
      }
    }

    // Fallback nếu vào trực tiếp từ route mà chưa có params
    setTasks([
      {
        id: 1,
        title: 'Kiểm tra & Xử lý sự cố tại chỗ',
        sub: 'Thực hiện khắc phục lỗi theo tình trạng xe khách.',
        completed: false,
      },
    ]);
  }, [params.selectedServices]);

  // Đếm giờ sửa chữa
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

  const handleFinishRepair = () => {
    const uncompleted = tasks.filter((t) => !t.completed);
    if (uncompleted.length > 0) {
      Alert.alert(
        'Chưa hoàn tất các hạng mục',
        `Còn ${uncompleted.length} hạng mục chưa được đánh dấu hoàn thành. Bạn có chắc chắn muốn kết thúc sửa chữa?`,
        [
          { text: 'Kiểm tra lại', style: 'cancel' },
          { text: 'Vẫn hoàn thành', style: 'destructive', onPress: submitCompletion },
        ]
      );
      return;
    }

    submitCompletion();
  };

  const submitCompletion = async () => {
    try {
      let updated: any = null;
      if (Number.isFinite(requestId)) {
        try {
          updated = await rescueApi.advance(requestId, 'COMPLETED');
        } catch {}
      }

      const totalFee = resolveRescueFee(updated || job);
      const isCash = (updated?.paymentMethod || job?.paymentMethod) === 'CASH';

      if (isCash) {
        Alert.alert(
          'Sửa chữa thành công!',
          `Khách hàng chọn thanh toán TIỀN MẶT (${formatVnd(totalFee)}). Bạn có muốn xác nhận đã thu đủ tiền mặt ngay bây giờ?`,
          [
            {
              text: 'Về màn hình chính',
              style: 'cancel',
              onPress: () => router.replace('/garage-staff/home'),
            },
            {
              text: 'Đã nhận đủ tiền mặt',
              style: 'default',
              onPress: async () => {
                try {
                  if (Number.isFinite(requestId)) {
                    await rescueApi.confirmCash(requestId);
                  }
                  Alert.alert('Hoàn tất!', 'Đã xác nhận thu tiền mặt và kết thúc ca cứu hộ.', [
                    { text: 'OK', onPress: () => router.replace('/garage-staff/home') },
                  ]);
                } catch (err: any) {
                  Alert.alert('Lỗi', err?.message || 'Chưa thể xác nhận thu tiền.');
                  router.replace('/garage-staff/home');
                }
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Sửa chữa thành công!',
          `Đã gửi yêu cầu thanh toán chuyển khoản (${formatVnd(totalFee)}) tới khách hàng.`,
          [
            {
              text: 'Về màn hình chính theo dõi',
              onPress: () => router.replace('/garage-staff/home'),
            },
          ]
        );
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể hoàn tất đơn lúc này.');
    }
  };

  // Thông tin xe & khách hàng thực tế
  const customerName = job?.customer?.name || 'Khách hàng';
  const customerPhone = job?.customer?.phone || '';
  const vehicleName =
    job?.vehicleType === 'CAR' ? 'Ô tô' : 'Xe máy';
  const licensePlate =
    job?.rescueVehicle?.licensePlate || '30F-123.45';
  const orderCode = job?.code ? `#${job.code}` : `#TK-${requestId || '88291'}`;

  const evidencePhoto =
    params.photoUri ||
    (job?.photos && job.photos.length > 0
      ? resolveFileUrl(job.photos[0])
      : 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=600&auto=format&fit=crop');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thực hiện Sửa chữa</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Card Đồng Hồ Đếm Giờ */}
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>THỜI GIAN THỰC HIỆN</Text>
          <Text style={styles.timerValue}>{formatTimer(seconds)}</Text>

          <TouchableOpacity
            style={styles.pauseBtn}
            onPress={() => setTimerRunning(!timerRunning)}
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
                <Text style={[styles.pauseBtnText, { color: BRAND_ORANGE }]}>Tiếp tục</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Card Thông tin xe khách hàng (Lấy từ đơn thực tế) */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Car size={18} color="#2563EB" />
            <Text style={[styles.cardTitle, { marginLeft: 6, marginBottom: 0 }]}>
              Thông tin xe & Khách hàng
            </Text>
          </View>

          <Image
            source={{ uri: evidencePhoto }}
            style={styles.carImage}
            resizeMode="cover"
          />

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
              <Text style={styles.carDetailLabel}>Dòng xe</Text>
              <Text style={styles.carDetailVal}>{vehicleName}</Text>
            </View>
            <View style={styles.carDetailRow}>
              <Text style={styles.carDetailLabel}>Mã phiếu</Text>
              <Text style={styles.carDetailVal}>{orderCode}</Text>
            </View>
            {job?.symptom ? (
              <View style={styles.carDetailRow}>
                <Text style={styles.carDetailLabel}>Mô tả sự cố</Text>
                <Text style={[styles.carDetailVal, { flex: 1, textAlign: 'right', marginLeft: 12 }]} numberOfLines={2}>
                  {job.symptom}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Card Hạng mục công việc (Lấy từ các mục đã chọn trong báo giá) */}
        <View style={styles.card}>
          <View style={styles.taskHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Wrench size={18} color={BRAND_ORANGE} />
              <Text style={[styles.cardTitle, { marginLeft: 6, marginBottom: 0 }]}>
                Hạng mục công việc đã duyệt
              </Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressText}>
                Đang xử lý ({completedCount}/{tasks.length})
              </Text>
            </View>
          </View>

          {tasks.length === 0 ? (
            <Text style={{ fontSize: 13, color: SUB, paddingVertical: 8 }}>
              Chưa có hạng mục sửa chữa nào.
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
                      placeholder="Ghi chú thêm (tùy chọn)..."
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
          <Text style={styles.finishBtnText}>Hoàn thành</Text>
        </TouchableOpacity>
      </View>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: BRAND_ORANGE },
  container: { flex: 1, padding: 16 },
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
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pauseBtnText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  carImage: { width: '100%', height: 150, borderRadius: 12, marginBottom: 12, backgroundColor: '#F1F5F9' },
  carDetailGrid: { gap: 8 },
  carDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  carDetailLabel: { fontSize: 13, color: '#64748B' },
  carDetailVal: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  taskHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressText: { fontSize: 11, fontWeight: '700', color: BRAND_ORANGE },
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
  taskItemDone: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
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
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportBtnText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  finishBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 12,
    backgroundColor: BRAND_ORANGE,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
