import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Truck,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  Navigation,
  Wrench,
  AlertCircle,
  History,
  RefreshCw,
  Banknote,
  Calendar,
} from 'lucide-react-native';
import axiosClient from '../../api/axiosClient';
import { useFocusEffect, useRouter } from 'expo-router';

// ─── Types ──────────────────────────────────────────────────────────────────

interface HistoryItem {
  id: number;
  code: string;
  status: string;
  symptom: string;
  pickupAddress: string;
  totalAmount: number | null;
  rescueFee: number | null;
  completedAt: string | null;
  createdAt: string;
  paymentMethod: string | null;
  customer: { id: number; name: string; phone: string } | null;
  vehicleType: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `${timeStr} Hôm nay`;
  if (diffDays === 1) return `${timeStr} Hôm qua`;
  return `${timeStr} ${d.toLocaleDateString('vi-VN')}`;
}

function formatMoney(amount: number | null | undefined): string {
  if (!amount) return '—';
  return amount.toLocaleString('vi-VN') + 'đ';
}

function vehicleTypeLabel(vt: string | null): string {
  switch (vt) {
    case 'MOTORCYCLE': return 'Xe máy';
    case 'CAR': return 'Ô tô';
    case 'TRUCK': return 'Xe tải';
    default: return vt ?? '—';
  }
}

function getActivePaymentLabel(task: any): string {
  if (!task) return '—';
  const isPaid = task.status === 'PAID' || task.status === 'RATED';
  if (isPaid) {
    return task.paymentMethod === 'CASH' || task.cashConfirmedByCustomer ? 'Tiền mặt' : 'Chuyển khoản';
  }
  if (task.cashConfirmedByCustomer) {
    return 'Tiền mặt';
  }
  return 'Chưa chọn';
}

function paymentLabel(pm: string | null): string {
  switch (pm) {
    case 'CASH': return 'Tiền mặt';
    case 'BANK_TRANSFER': return 'Chuyển khoản';
    default: return pm ?? '—';
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GarageStaffTasksScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  // Active task (từ API /staff/active)
  const [activeTask, setActiveTask] = useState<any>(null);
  const [activeLoading, setActiveLoading] = useState(false);

  // History (từ API /staff/history)
  const [historyTasks, setHistoryTasks] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch active ──
  const fetchActive = useCallback(async () => {
    setActiveLoading(true);
    try {
      // axiosClient interceptor returns response.data (ApiResponse body)
      // So result = { success: true, message: '...', data: RescueRequestResponse | null }
      const apiRes: any = await axiosClient.get('/rescue-requests/staff/active');
      setActiveTask(apiRes?.data ?? null);
    } catch (e: any) {
      console.warn('[tasks] fetchActive error:', e?.response?.data ?? e?.message ?? e);
      setActiveTask(null);
    } finally {
      setActiveLoading(false);
    }
  }, []);

  // ── Fetch history ──
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const apiRes: any = await axiosClient.get('/rescue-requests/staff/history');
      const list = Array.isArray(apiRes?.data) ? apiRes.data : [];
      setHistoryTasks(list);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message ?? e?.message ?? 'Lỗi kết nối';
      console.error('[tasks] fetchHistory error:', status, msg);
      setHistoryError(`Không thể tải lịch sử. Vui lòng thử lại.`);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // ── Load khi tab được focus ──
  useFocusEffect(
    useCallback(() => {
      fetchActive();
      fetchHistory();
    }, [fetchActive, fetchHistory])
  );

  // ── Pull-to-refresh ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchActive(), fetchHistory()]);
    setRefreshing(false);
  }, [fetchActive, fetchHistory]);

  // ── Actions ──
  const handleCallCustomer = () => {
    const phone = activeTask?.customer?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {});
    }
  };

  const handleOpenMap = () => {
    router.replace('/garage-staff/home');
  };

  const handleArrived = async () => {
    Alert.alert('Xác nhận tới nơi', 'Bạn đã có mặt tại hiện trường?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đã tới nơi',
        onPress: async () => {
          try {
            await axiosClient.post(`/rescue-requests/${activeTask.id}/status`, { status: 'ARRIVED' });
            await fetchActive();
            Alert.alert('Cập nhật', 'Đã xác nhận bạn tới hiện trường.');
          } catch (e: any) {
            Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể cập nhật trạng thái.');
          }
        },
      },
    ]);
  };

  const activeStatusLabel = () => {
    switch (activeTask?.status) {
      case 'ASSIGNED': return 'Đã được giao';
      case 'EN_ROUTE': return 'Đang di chuyển';
      case 'ARRIVED': return 'Đã tới nơi';
      case 'DIAGNOSED': return 'Đã kiểm tra';
      case 'REPAIRING_ONSITE': return 'Đang sửa chữa';
      case 'TOWING': return 'Đang kéo xe';
      case 'AWAITING_PAYMENT': return 'Chờ thanh toán';
      case 'COMPLETED': return 'Chờ thanh toán';
      case 'PAID': return 'Đã thanh toán';
      case 'RATED': return 'Hoàn thành';
      default: return activeTask?.status ?? '';
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nhiệm vụ Cứu hộ</Text>
        <Text style={styles.headerSub}>Theo dõi và xử lý các ca cứu hộ được giao</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ACTIVE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ACTIVE')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'ACTIVE' && styles.tabBtnTextActive]}>
            Đang thực hiện{activeTask ? ' (1)' : ' (0)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'HISTORY' && styles.tabBtnActive]}
          onPress={() => setActiveTab('HISTORY')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'HISTORY' && styles.tabBtnTextActive]}>
            Lịch sử ({historyTasks.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
      >
        {/* ── ACTIVE TAB ── */}
        {activeTab === 'ACTIVE' && (
          <>
            {activeLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#ea580c" size="large" />
                <Text style={styles.loadingText}>Đang tải nhiệm vụ…</Text>
              </View>
            ) : activeTask ? (
              <TouchableOpacity
                style={styles.activeTaskCard}
                activeOpacity={0.9}
                onPress={() => router.push({
                  pathname: '/garage-staff/order-detail',
                  params: { id: String(activeTask.id) },
                })}
              >
                {/* Task Header */}
                <View style={styles.taskCardHeader}>
                  <View style={styles.codeBadge}>
                    <Truck size={14} color="#ea580c" />
                    <Text style={styles.codeBadgeText}>{activeTask.code}</Text>
                  </View>
                  <View style={styles.statusLiveBadge}>
                    <View style={styles.pulsingDot} />
                    <Text style={styles.statusLiveText}>{activeStatusLabel()}</Text>
                  </View>
                </View>

                {/* Customer Info */}
                <View style={styles.customerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{activeTask.customer?.name ?? '—'}</Text>
                    <Text style={styles.vehicleInfo}>
                      {vehicleTypeLabel(activeTask.vehicleType)}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.phoneCallBtn} onPress={handleCallCustomer}>
                    <Phone size={16} color="#ffffff" />
                    <Text style={styles.phoneCallText}>Gọi</Text>
                  </TouchableOpacity>
                </View>

                {/* Address */}
                <View style={styles.addressBox}>
                  <MapPin size={16} color="#ea580c" style={{ marginTop: 2 }} />
                  <Text style={styles.addressText}>{activeTask.pickupAddress}</Text>
                </View>

                {/* Symptom */}
                {activeTask.symptom ? (
                  <View style={styles.symptomBox}>
                    <Text style={styles.symptomLabel}>Mô tả sự cố của khách:</Text>
                    <Text style={styles.symptomText}>{activeTask.symptom}</Text>
                  </View>
                ) : null}

                {/* Fee info */}
                {activeTask.totalAmount ? (
                  <View style={styles.feeRow}>
                    <Banknote size={14} color="#16a34a" />
                    <Text style={styles.feeText}>
                      Phí cứu hộ: <Text style={styles.feeAmount}>{formatMoney(activeTask.totalAmount)}</Text>
                    </Text>
                    <Text style={styles.feePayment}>{getActivePaymentLabel(activeTask)}</Text>
                  </View>
                ) : null}

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.actionNavBtn}
                    onPress={() => router.push({
                      pathname: '/garage-staff/order-detail',
                      params: { id: String(activeTask.id) },
                    })}
                    activeOpacity={0.85}
                  >
                    <Navigation size={18} color="#ffffff" />
                    <Text style={styles.actionNavText}>Chi tiết</Text>
                  </TouchableOpacity>

                  {(activeTask.status === 'ASSIGNED' || activeTask.status === 'EN_ROUTE') && (
                    <TouchableOpacity style={styles.actionArriveBtn} onPress={handleArrived} activeOpacity={0.85}>
                      <CheckCircle2 size={18} color="#ffffff" />
                      <Text style={styles.actionArriveText}>Đã tới nơi</Text>
                    </TouchableOpacity>
                  )}

                  {activeTask.status === 'ARRIVED' && (
                    <TouchableOpacity
                      style={styles.actionQuoteBtn}
                      onPress={() => router.push({
                        pathname: '/garage-staff/create-quote',
                        params: { requestId: String(activeTask.id) },
                      })}
                      activeOpacity={0.85}
                    >
                      <Wrench size={18} color="#ffffff" />
                      <Text style={styles.actionQuoteText}>Lập báo giá</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyCard}>
                <CheckCircle2 size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>Không có ca cứu hộ nào</Text>
                <Text style={styles.emptySub}>
                  Bạn đang trong trạng thái sẵn sàng. Khi có khách hàng cần cứu hộ, chuông thông báo sẽ reo.
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'HISTORY' && (
          <>
            {historyLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#ea580c" size="large" />
                <Text style={styles.loadingText}>Đang tải lịch sử…</Text>
              </View>
            ) : historyError ? (
              <View style={styles.errorCard}>
                <AlertCircle size={36} color="#ef4444" />
                <Text style={styles.errorText}>{historyError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchHistory}>
                  <RefreshCw size={14} color="#ffffff" />
                  <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : historyTasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <History size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>Chưa có lịch sử</Text>
                <Text style={styles.emptySub}>
                  Các ca cứu hộ đã hoàn thành và thanh toán sẽ hiển thị tại đây.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {historyTasks.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyCard}
                    onPress={() => router.push({
                      pathname: '/garage-staff/order-detail',
                      params: { id: String(item.id) },
                    })}
                    activeOpacity={0.88}
                  >
                    <View style={styles.historyTopRow}>
                      <Text style={styles.historyCode}>{item.code}</Text>
                      <Text style={styles.historyFee}>
                        {item.totalAmount ? `+${formatMoney(item.totalAmount)}` : '—'}
                      </Text>
                    </View>

                    <Text style={styles.historyCustomer}>
                      {item.customer?.name ?? '—'} • {vehicleTypeLabel(item.vehicleType)}
                    </Text>

                    {item.symptom ? (
                      <Text style={styles.historySymptom} numberOfLines={2}>
                        {item.symptom}
                      </Text>
                    ) : null}

                    <Text style={styles.historyAddress} numberOfLines={1}>
                      📍 {item.pickupAddress ?? '—'}
                    </Text>

                    <View style={styles.historyBottomRow}>
                      <View style={styles.completedBadge}>
                        <CheckCircle2 size={12} color="#16a34a" />
                        <Text style={styles.completedText}>
                          {item.status === 'PAID' ? 'Đã thanh toán' : 'Hoàn thành'}
                        </Text>
                      </View>
                      <View style={styles.historyTimeRow}>
                        <Calendar size={11} color="#94a3b8" />
                        <Text style={styles.historyTime}>{formatDateTime(item.completedAt ?? item.createdAt)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  tabBtnActive: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#ea580c',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  // ── Loading / Error ──
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '600',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  // ── Active task card ──
  activeTaskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#fed7aa',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  statusLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  statusLiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  phoneCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  phoneCallText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  addressBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
    lineHeight: 18,
  },
  symptomBox: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  symptomLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
    marginBottom: 2,
  },
  symptomText: {
    fontSize: 12.5,
    color: '#7c2d12',
    lineHeight: 18,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  feeText: {
    flex: 1,
    fontSize: 12,
    color: '#15803d',
    fontWeight: '600',
  },
  feeAmount: {
    fontWeight: '900',
    color: '#15803d',
  },
  feePayment: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionNavBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionNavText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  actionArriveBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionArriveText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  actionQuoteBtn: {
    flex: 1,
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionQuoteText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  // ── History card ──
  historyCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 6,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCode: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  historyFee: {
    fontSize: 14,
    fontWeight: '900',
    color: '#16a34a',
  },
  historyCustomer: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  historySymptom: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
  },
  historyAddress: {
    fontSize: 12,
    color: '#64748b',
  },
  historyBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  historyTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
});
