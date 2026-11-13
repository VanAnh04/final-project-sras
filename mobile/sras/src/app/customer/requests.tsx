import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  Radio,
  Clock,
  MapPin,
  Wrench,
  Car,
  Phone,
  ChevronRight,
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  Truck,
  Star,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto, RescueStatus } from '../../api/rescueApi';
import { complaintApi, ComplaintDto } from '../../api/complaintApi';
import { resolveRescueFee, formatVnd } from '../../utils/rescueFee';
import RatingModal from '../../components/RatingModal';
import ComplaintModal from '../../components/ComplaintModal';
import ComplaintTrackingModal from '../../components/ComplaintTrackingModal';

const ONGOING_STATUSES: RescueStatus[] = [
  'SEARCHING',
  'PENDING_GARAGE',
  'ACCEPTED',
  'ASSIGNED',
  'EN_ROUTE',
  'ARRIVED',
  'DIAGNOSED',
  'REPAIRING_ONSITE',
  'TOWING',
  'AWAITING_PAYMENT',
];

const COMPLETED_STATUSES: RescueStatus[] = [
  'PAID',
  'RATED',
  'COMPLETED',
];

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  SEARCHING: { label: 'Đang tìm gara', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  PENDING_GARAGE: { label: 'Chờ gara nhận', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  NO_GARAGE_FOUND: { label: 'Không tìm thấy gara', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  ACCEPTED: { label: 'Gara đã nhận', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  ASSIGNED: { label: 'Đã phân công', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  EN_ROUTE: { label: 'Thợ đang tới', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
  ARRIVED: { label: 'Thợ đã đến nơi', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
  DIAGNOSED: { label: 'Đã kiểm tra xe', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  REPAIRING_ONSITE: { label: 'Đang sửa chữa', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  TOWING: { label: 'Đang kéo xe', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  AWAITING_PAYMENT: { label: 'Chờ thanh toán', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  PAID: { label: 'Đã thanh toán', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  RATED: { label: 'Đã hoàn tất', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  COMPLETED: { label: 'Hoàn thành', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  CANCELLED: { label: 'Đã huỷ', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
  DECLINED: { label: 'Bị từ chối', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

const VEHICLE_LABEL: Record<string, string> = { CAR: 'Ô tô', MOTORBIKE: 'Xe máy' };

function formatDateTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}

export default function CustomerRequestsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; subTab?: string }>();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>(
    params.tab === 'HISTORY' ? 'HISTORY' : 'ACTIVE'
  );
  const [historySubTab, setHistorySubTab] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>(
    params.subTab === 'COMPLETED' ? 'COMPLETED' : params.subTab === 'CANCELLED' ? 'CANCELLED' : 'ALL'
  );

  useEffect(() => {
    if (params.tab === 'HISTORY') {
      setActiveTab('HISTORY');
    } else if (params.tab === 'ACTIVE') {
      setActiveTab('ACTIVE');
    }
  }, [params.tab]);

  useEffect(() => {
    if (params.subTab === 'COMPLETED') {
      setHistorySubTab('COMPLETED');
    } else if (params.subTab === 'CANCELLED') {
      setHistorySubTab('CANCELLED');
    } else if (params.subTab === 'ALL') {
      setHistorySubTab('ALL');
    }
  }, [params.subTab]);
  const [requests, setRequests] = useState<RescueRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRatingReq, setSelectedRatingReq] = useState<RescueRequestDto | null>(null);
  const [selectedComplaintReq, setSelectedComplaintReq] = useState<RescueRequestDto | null>(null);
  const [complaintsMap, setComplaintsMap] = useState<Record<string | number, ComplaintDto>>({});
  const [selectedTrackingComplaint, setSelectedTrackingComplaint] = useState<ComplaintDto | null>(null);
  const [selectedTrackingReq, setSelectedTrackingReq] = useState<RescueRequestDto | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const [data, myComplaints] = await Promise.all([
        rescueApi.mine(),
        complaintApi.getMyComplaints().catch(() => []),
      ]);
      setRequests(data || []);
      if (Array.isArray(myComplaints)) {
        const map: Record<string | number, ComplaintDto> = {};
        myComplaints.forEach((c) => {
          if (c && c.requestId != null) {
            map[c.requestId] = c;
            map[Number(c.requestId)] = c;
            map[String(c.requestId)] = c;
          }
          if (c && c.requestCode && typeof c.requestCode === 'string' && c.requestCode.trim() !== '') {
            map[c.requestCode.trim()] = c;
          }
        });
        setComplaintsMap(map);
      } else {
        setComplaintsMap({});
      }
    } catch (err: any) {
      console.error('Failed to fetch user rescue requests:', err);
      setError(err?.message || 'Không thể tải dữ liệu cứu hộ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const activeList = requests.filter((r) => ONGOING_STATUSES.includes(r.status));
  const historyList = requests.filter((r) => !ONGOING_STATUSES.includes(r.status));
  const completedHistoryList = historyList.filter((r) => COMPLETED_STATUSES.includes(r.status));
  const cancelledHistoryList = historyList.filter((r) => !COMPLETED_STATUSES.includes(r.status));

  const filteredHistoryList =
    historySubTab === 'COMPLETED'
      ? completedHistoryList
      : historySubTab === 'CANCELLED'
      ? cancelledHistoryList
      : historyList;

  const displayList = activeTab === 'ACTIVE' ? activeList : filteredHistoryList;

  const handleOpenDetail = (req: RescueRequestDto) => {
    router.push({ pathname: '/customer/rescue-tracking', params: { id: String(req.id), from: '/customer/requests' } } as any);
  };

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
    }
  };

  const handleChat = (req: RescueRequestDto) => {
    const isStaff = !!req.staff;
    const peer = isStaff ? 'STAFF' : 'GARAGE';
    const peerName = isStaff
      ? req.staff?.name || 'Nhân viên cứu hộ'
      : req.garage?.name || 'Gara cứu hộ';
    const peerPhone = isStaff
      ? req.staff?.phone || req.garage?.phone || ''
      : req.garage?.phone || '';
    const peerRole = isStaff ? 'Nhân viên cứu hộ' : 'Gara cứu hộ';

    router.push({
      pathname: '/chat',
      params: {
        requestId: String(req.id),
        peer,
        peerName,
        peerPhone,
        peerRole,
      },
    } as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Lịch sử cứu hộ</Text>
            <Text style={styles.headerSubtitle}>Theo dõi & quản lý các yêu cầu cứu hộ của bạn</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabFilterContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('ACTIVE')}
          style={[
            styles.tabFilterButton,
            activeTab === 'ACTIVE' && styles.tabFilterButtonActive,
          ]}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabFilterText,
              activeTab === 'ACTIVE' && styles.tabFilterTextActive,
            ]}
          >
            Đang thực hiện ({activeList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('HISTORY')}
          style={[
            styles.tabFilterButton,
            activeTab === 'HISTORY' && styles.tabFilterButtonActive,
          ]}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabFilterText,
              activeTab === 'HISTORY' && styles.tabFilterTextActive,
            ]}
          >
            Lịch sử ({historyList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub-filter Chips for History */}
      {activeTab === 'HISTORY' && (
        <View style={styles.subFilterBar}>
          <TouchableOpacity
            style={[styles.subFilterChip, historySubTab === 'ALL' && styles.subFilterChipActive]}
            onPress={() => setHistorySubTab('ALL')}
            activeOpacity={0.7}
          >
            <Text style={[styles.subFilterChipText, historySubTab === 'ALL' && styles.subFilterChipTextActive]}>
              Tất cả ({historyList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subFilterChip, historySubTab === 'COMPLETED' && styles.subFilterChipActiveSuccess]}
            onPress={() => setHistorySubTab('COMPLETED')}
            activeOpacity={0.7}
          >
            <Text style={[styles.subFilterChipText, historySubTab === 'COMPLETED' && styles.subFilterChipTextActiveSuccess]}>
              Đã hoàn tất ({completedHistoryList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subFilterChip, historySubTab === 'CANCELLED' && styles.subFilterChipActiveDanger]}
            onPress={() => setHistorySubTab('CANCELLED')}
            activeOpacity={0.7}
          >
            <Text style={[styles.subFilterChipText, historySubTab === 'CANCELLED' && styles.subFilterChipTextActiveDanger]}>
              Đã huỷ ({cancelledHistoryList.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Request List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ea580c']} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text style={styles.loadingText}>Đang tải dữ liệu cứu hộ...</Text>
          </View>
        ) : error && requests.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: '#fef2f2' }]}>
              <AlertCircle size={36} color="#dc2626" />
            </View>
            <Text style={styles.emptyTitle}>Không thể tải dữ liệu</Text>
            <Text style={styles.emptySubtitle}>
              Đã có lỗi xảy ra hoặc kết nối mạng không ổn định. Vui lòng kiểm tra lại.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setLoading(true);
                fetchRequests();
              }}
              style={styles.newRequestBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.newRequestBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : displayList.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Radio size={36} color="#ea580c" />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'ACTIVE'
                ? 'Không có yêu cầu đang xử lý'
                : historySubTab === 'COMPLETED'
                ? 'Chưa có ca cứu hộ nào hoàn tất'
                : historySubTab === 'CANCELLED'
                ? 'Không có yêu cầu nào bị huỷ'
                : 'Chưa có lịch sử cứu hộ'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'ACTIVE'
                ? 'Khi bạn gửi tín hiệu cứu hộ khẩn cấp, tiến trình xử lý sẽ được cập nhật trực tiếp tại đây.'
                : 'Các ca cứu hộ đã hoàn thành hoặc đã huỷ của bạn sẽ được lưu trữ tại đây.'}
            </Text>
            {activeTab === 'ACTIVE' && (
              <TouchableOpacity
                onPress={() => router.push('/customer')}
                style={styles.newRequestBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.newRequestBtnText}>Tạo yêu cầu cứu hộ</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displayList.map((item) => {
            const statusConfig = STATUS_META[item.status] || {
              label: item.status,
              color: '#64748b',
              bg: '#f1f5f9',
              border: '#e2e8f0',
            };
            const isOngoing = ONGOING_STATUSES.includes(item.status);
            const fee = resolveRescueFee(item);
            const phoneToCall = item.staff?.phone || item.garage?.phone;

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.requestCard}
                activeOpacity={0.9}
                onPress={() => handleOpenDetail(item)}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.requestCode}>{item.code || `#SRAS-${item.id}`}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: statusConfig.bg,
                          borderColor: statusConfig.border,
                        },
                      ]}
                    >
                      <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                        {statusConfig.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.requestTime}>{formatDateTime(item.createdAt)}</Text>
                </View>

                {/* Service & Vehicle info */}
                <View style={styles.serviceRow}>
                  <View style={styles.serviceIconWrap}>
                    <Wrench size={18} color="#ea580c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceName} numberOfLines={2}>
                      {item.symptom || 'Cứu hộ khẩn cấp'}
                    </Text>
                    <Text style={styles.vehicleInfo}>
                      Phương tiện: <Text style={{ fontWeight: '700', color: '#1e293b' }}>{VEHICLE_LABEL[item.vehicleType] || item.vehicleType || 'Phương tiện'}</Text>
                    </Text>
                  </View>
                </View>

                {/* Location */}
                <View style={styles.infoRow}>
                  <MapPin size={16} color="#64748b" style={{ marginTop: 2 }} />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {item.pickupAddress || item.locationNote || 'Vị trí hiện tại của khách hàng'}
                  </Text>
                </View>

                {/* Garage & Staff info */}
                {(item.garage || item.staff) && (
                  <View style={styles.garageBox}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.garageName} numberOfLines={1}>
                        {item.garage?.name || 'Gara cứu hộ'}
                      </Text>
                      {item.staff?.name ? (
                        <Text style={styles.staffName} numberOfLines={1}>
                          Thợ phụ trách: <Text style={{ fontWeight: '600', color: '#334155' }}>{item.staff.name}</Text>
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.contactActions}>
                      {/* Chat Button */}
                      <TouchableOpacity
                        style={styles.chatBtn}
                        onPress={() => handleChat(item)}
                        activeOpacity={0.8}
                      >
                        <MessageSquare size={14} color="#ea580c" />
                        <Text style={styles.chatBtnText}>Nhắn tin</Text>
                      </TouchableOpacity>

                      {/* Call Button */}
                      {phoneToCall && isOngoing && (
                        <TouchableOpacity
                          style={styles.callStaffBtn}
                          onPress={() => handleCall(phoneToCall)}
                          activeOpacity={0.8}
                        >
                          <Phone size={14} color="#ffffff" />
                          <Text style={styles.callStaffBtnText}>Gọi</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* Card Action Buttons for completed / history requests */}
                {!isOngoing && (
                  <View style={styles.cardActionsRow}>
                    {/* Kiểm tra đã đánh giá từ bảng rating (item.rated) */}
                    {item.rated ? (
                      <View style={styles.ratedBadge}>
                        <Star size={13} color="#16a34a" fill="#16a34a" />
                        <Text style={styles.ratedBadgeText}>Đã đánh giá</Text>
                      </View>
                    ) : (
                      (item.status === 'COMPLETED' || item.status === 'PAID') && (
                        <TouchableOpacity
                          style={styles.ratingActionBtn}
                          onPress={() => setSelectedRatingReq(item)}
                          activeOpacity={0.85}
                        >
                          <Star size={14} color="#b45309" fill="#f59e0b" />
                          <Text style={styles.ratingActionBtnText}>Đánh giá dịch vụ</Text>
                        </TouchableOpacity>
                      )
                    )}

                    {(() => {
                      const itemComplaint =
                        (item.id != null ? (complaintsMap[item.id] || complaintsMap[String(item.id)]) : undefined) ||
                        (item.code ? complaintsMap[item.code] : undefined);

                      if (itemComplaint) {
                        return (
                          <TouchableOpacity
                            style={[
                              styles.complaintActionBtn,
                              styles.complaintTrackingBtn,
                              itemComplaint.status === 'RESOLVED' && styles.complaintResolvedBtn,
                              itemComplaint.status === 'REJECTED' && styles.complaintRejectedBtn,
                            ]}
                            onPress={() => {
                              setSelectedTrackingComplaint(itemComplaint);
                              setSelectedTrackingReq(item);
                            }}
                            activeOpacity={0.85}
                          >
                            <Clock
                              size={13}
                              color={
                                itemComplaint.status === 'RESOLVED'
                                  ? '#16a34a'
                                  : itemComplaint.status === 'REJECTED'
                                  ? '#64748b'
                                  : '#d97706'
                              }
                            />
                            <Text
                              style={[
                                styles.complaintActionBtnText,
                                {
                                  color:
                                    itemComplaint.status === 'RESOLVED'
                                      ? '#16a34a'
                                      : itemComplaint.status === 'REJECTED'
                                      ? '#64748b'
                                      : '#d97706',
                                },
                              ]}
                            >
                              Theo dõi khiếu nại
                            </Text>
                          </TouchableOpacity>
                        );
                      }

                      if (item.status === 'CANCELLED') {
                        return null;
                      }

                      return (
                        <TouchableOpacity
                          style={styles.complaintActionBtn}
                          onPress={() => setSelectedComplaintReq(item)}
                          activeOpacity={0.85}
                        >
                          <AlertTriangle size={13} color="#dc2626" />
                          <Text style={styles.complaintActionBtnText}>Khiếu nại</Text>
                        </TouchableOpacity>
                      );
                    })()}
                  </View>
                )}

                {/* Card Footer */}
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.priceLabel}>Tổng chi phí:</Text>
                    <Text style={styles.priceValue}>
                      {fee > 0 ? formatVnd(fee) : 'Đang tính toán'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.detailBtn}
                    onPress={() => handleOpenDetail(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.detailBtnText}>
                      {isOngoing ? 'Xem tiến độ cứu hộ' : 'Chi tiết đơn'}
                    </Text>
                    <ChevronRight size={16} color="#ea580c" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Rating Modal */}
      {selectedRatingReq && (
        <RatingModal
          visible={!!selectedRatingReq}
          requestId={selectedRatingReq.id}
          requestCode={selectedRatingReq.code}
          garageName={selectedRatingReq.garage?.name}
          staffName={selectedRatingReq.staff?.name}
          onClose={() => setSelectedRatingReq(null)}
          onSuccess={() => {
            fetchRequests();
          }}
        />
      )}

      {/* Complaint Modal */}
      {selectedComplaintReq && (
        <ComplaintModal
          visible={!!selectedComplaintReq}
          requestId={selectedComplaintReq.id}
          requestCode={selectedComplaintReq.code}
          targetType="GARAGE"
          targetName={selectedComplaintReq.garage?.name}
          onClose={() => setSelectedComplaintReq(null)}
          onSuccess={() => {
            setSelectedComplaintReq(null);
            fetchRequests();
          }}
        />
      )}

      {/* Complaint Tracking Modal */}
      {selectedTrackingComplaint && (
        <ComplaintTrackingModal
          visible={!!selectedTrackingComplaint}
          complaint={selectedTrackingComplaint}
          requestCode={selectedTrackingReq?.code}
          garageName={selectedTrackingReq?.garage?.name}
          onClose={() => {
            setSelectedTrackingComplaint(null);
            setSelectedTrackingReq(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  tabFilterContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  tabFilterButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  tabFilterButtonActive: {
    backgroundColor: '#ea580c',
  },
  tabFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabFilterTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  subFilterBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  subFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subFilterChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  subFilterChipActiveSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  subFilterChipActiveDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#dc2626',
  },
  subFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  subFilterChipTextActive: {
    color: '#ea580c',
    fontWeight: '700',
  },
  subFilterChipTextActiveSuccess: {
    color: '#059669',
    fontWeight: '700',
  },
  subFilterChipTextActiveDanger: {
    color: '#dc2626',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  newRequestBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  newRequestBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  requestCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  requestTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 4,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  serviceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },
  garageBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  garageName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  staffName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  chatBtnText: {
    color: '#ea580c',
    fontSize: 11,
    fontWeight: '700',
  },
  callStaffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  callStaffBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ea580c',
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  ratingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  ratingActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
  },
  ratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratedBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#15803d',
  },
  complaintActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  complaintActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  complaintTrackingBtn: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  complaintResolvedBtn: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  complaintRejectedBtn: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
});

