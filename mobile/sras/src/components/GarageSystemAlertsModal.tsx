import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  ShieldAlert,
  Star,
  Users,
  Wallet,
  Wrench,
  X,
  CheckCheck,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { NotificationDto } from '../api/notificationApi';

interface Props {
  visible: boolean;
  onClose: () => void;
  notifications: NotificationDto[];
  loading?: boolean;
  onMarkRead: (id: number) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onRefresh?: () => Promise<void>;
  initialSelected?: NotificationDto | null;
}

export function isGarageWarningNotification(n: NotificationDto): boolean {
  if (!n) return false;
  if (n.type === 'SYSTEM_WARNING') return true;
  if (n.refType === 'GARAGE') return true;
  const titleLower = (n.title || '').toLowerCase();
  const bodyLower = (n.body || '').toLowerCase();
  return (
    titleLower.includes('cảnh báo') ||
    titleLower.includes('nhắc nhở') ||
    titleLower.includes('khắc phục') ||
    titleLower.includes('chấn chỉnh') ||
    titleLower.includes('đề xuất') ||
    bodyLower.includes('đề xuất khắc phục')
  );
}

export function formatRelativeTime(iso?: string): string {
  if (!iso) return 'Vừa xong';
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return 'Gần đây';
  const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function getWarningCategoryInfo(n: NotificationDto) {
  const text = `${n.title || ''} ${n.body || ''}`.toLowerCase();
  if (
    text.includes('tài chính') ||
    text.includes('ví') ||
    text.includes('số dư') ||
    text.includes('nợ') ||
    text.includes('hoa hồng')
  ) {
    return {
      category: 'FINANCE',
      badgeLabel: 'Cảnh báo Tài chính & Ví',
      badgeBg: '#fef2f2',
      badgeColor: '#dc2626',
      actionLabel: 'Kiểm tra & Nạp Ví Tín Dụng',
      actionRoute: '/garage-owner/wallet',
      ActionIcon: Wallet,
      steps: [
        'Kiểm tra số dư Ví Tín Dụng hiện tại và thanh toán các khoản công nợ hoa hồng (nếu có).',
        'Đảm bảo duy trì số dư Ví Tín Dụng tối thiểu theo quy định để không bị gián đoạn nhận lệnh điều phối.',
        'Có thể chuyển số dư từ Ví Tiền Mặt sang Ví Tín Dụng hoặc nạp trực tiếp qua mã QR.',
      ],
    };
  }

  if (
    text.includes('đánh giá') ||
    text.includes('sao') ||
    text.includes('khiếu nại') ||
    text.includes('chất lượng')
  ) {
    return {
      category: 'QUALITY',
      badgeLabel: 'Chất lượng & Đánh giá',
      badgeBg: '#fffbeb',
      badgeColor: '#d97706',
      actionLabel: 'Xem Đánh giá & Phản hồi khách',
      actionRoute: '/garage-owner/reviews',
      ActionIcon: Star,
      steps: [
        'Xem lại các đánh giá sao thấp và nhận xét từ khách hàng trong mục Quản lý Đánh giá.',
        'Rà soát thái độ phục vụ và quy trình báo giá minh bạch của kỹ thuật viên tại hiện trường.',
        'Phản hồi cầu thị các nhận xét của khách hàng và phối hợp xử lý dứt điểm các khiếu nại tồn đọng.',
      ],
    };
  }

  if (text.includes('tiếp cận') || text.includes('đến trễ') || text.includes('thời gian')) {
    return {
      category: 'ARRIVAL_SPEED',
      badgeLabel: 'Tốc độ Tiếp cận Hiện trường',
      badgeBg: '#fff7ed',
      badgeColor: '#ea580c',
      actionLabel: 'Quản lý Đội ngũ Kỹ thuật viên',
      actionRoute: '/garage-owner/staff',
      ActionIcon: Users,
      steps: [
        'Phân công kỹ thuật viên đang ở vị trí gần khách hàng nhất ngay khi nhận đơn cứu hộ.',
        'Nhắc nhở nhân viên bấm bắt đầu di chuyển và xuất phát ngay sau khi được gán lệnh.',
        'Kiểm tra số lượng nhân viên trực ca để tránh nhận vượt quá năng lực phục vụ cùng lúc.',
      ],
    };
  }

  return {
    category: 'OPERATIONS',
    badgeLabel: 'Cảnh báo Vận hành & Đơn hàng',
    badgeBg: '#fff7ed',
    badgeColor: '#ea580c',
    actionLabel: 'Kiểm tra Quản lý Đơn cứu hộ',
    actionRoute: '/garage-owner/orders',
    ActionIcon: FileText,
    steps: [
      'Hạn chế tối đa việc từ chối hoặc hủy đơn sau khi đã tiếp nhận yêu cầu cứu hộ của khách.',
      'Nếu gara đang bận hoặc thiếu thợ, hãy chủ động tắt kết nối tạm thời để tránh phát sinh đơn hủy.',
      'Rà soát quy trình điều phối nhân viên và phương tiện cứu hộ trong các khung giờ cao điểm.',
    ],
  };
}

export default function GarageSystemAlertsModal({
  visible,
  onClose,
  notifications,
  loading = false,
  onMarkRead,
  onMarkAllRead,
  initialSelected = null,
}: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'WARNINGS' | 'SYSTEM'>('ALL');
  const [selectedNotif, setSelectedNotif] = useState<NotificationDto | null>(initialSelected);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  React.useEffect(() => {
    if (visible) {
      setSelectedNotif(initialSelected || null);
    }
  }, [visible, initialSelected]);

  const warningList = useMemo(
    () => notifications.filter((n) => isGarageWarningNotification(n)),
    [notifications]
  );

  const systemList = useMemo(
    () => notifications.filter((n) => !isGarageWarningNotification(n)),
    [notifications]
  );

  const filteredList = useMemo(() => {
    if (filter === 'WARNINGS') return warningList;
    if (filter === 'SYSTEM') return systemList;
    return notifications;
  }, [notifications, warningList, systemList, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const handleSelectNotification = async (item: NotificationDto) => {
    setSelectedNotif(item);
    if (!item.isRead) {
      try {
        setSubmittingId(item.id);
        await onMarkRead(item.id);
      } finally {
        setSubmittingId(null);
      }
    }
  };

  const handleActionNavigate = async (item: NotificationDto, route: string) => {
    if (!item.isRead) {
      try {
        await onMarkRead(item.id);
      } catch {}
    }
    setSelectedNotif(null);
    onClose();
    router.push(route as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (selectedNotif) {
          setSelectedNotif(null);
        } else {
          onClose();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                {selectedNotif ? (
                  <ShieldAlert size={20} color="#ea580c" strokeWidth={2.4} />
                ) : (
                  <Bell size={20} color="#ea580c" strokeWidth={2.4} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {selectedNotif
                    ? isGarageWarningNotification(selectedNotif)
                      ? 'Chi tiết Đề xuất & Khắc phục'
                      : 'Chi tiết Thông báo Hệ thống'
                    : 'Thông báo & Đề xuất Hệ thống'}
                </Text>
                <Text style={styles.headerSub}>
                  {selectedNotif
                    ? isGarageWarningNotification(selectedNotif)
                      ? 'Phân tích vận hành và hướng dẫn khắc phục cho Gara'
                      : 'Nội dung thông báo cập nhật từ Quản trị viên hệ thống'
                    : `${warningList.length} đề xuất • ${systemList.length} thông báo hệ thống`}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                if (selectedNotif) {
                  setSelectedNotif(null);
                } else {
                  onClose();
                }
              }}
            >
              <X size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Body: Chi tiết 1 đề xuất/cảnh báo */}
          {selectedNotif ? (
            <ScrollView
              contentContainerStyle={styles.detailContent}
              showsVerticalScrollIndicator={false}
            >
              {(() => {
                const isSelectedWarning = isGarageWarningNotification(selectedNotif);
                const info = getWarningCategoryInfo(selectedNotif);
                const ActionIcon = info.ActionIcon;
                return (
                  <>
                    <View style={styles.detailMetaRow}>
                      <View
                        style={[
                          styles.categoryBadge,
                          { backgroundColor: isSelectedWarning ? info.badgeBg : '#f1f5f9' },
                        ]}
                      >
                        {isSelectedWarning ? (
                          <AlertTriangle size={13} color={info.badgeColor} />
                        ) : (
                          <Bell size={13} color="#475569" />
                        )}
                        <Text
                          style={[
                            styles.categoryBadgeText,
                            { color: isSelectedWarning ? info.badgeColor : '#475569' },
                          ]}
                        >
                          {isSelectedWarning ? info.badgeLabel : 'Thông báo hệ thống'}
                        </Text>
                      </View>
                      <View style={styles.timeRow}>
                        <Clock size={12} color="#94a3b8" />
                        <Text style={styles.timeText}>
                          {formatRelativeTime(selectedNotif.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.detailTitle}>{selectedNotif.title}</Text>

                    <View style={styles.analysisBox}>
                      <Text style={styles.analysisLabel}>
                        {isSelectedWarning
                          ? 'NỘI DUNG PHÂN TÍCH & NHẮC NHỞ TỪ QUẢN TRỊ VIÊN:'
                          : 'NỘI DUNG THÔNG BÁO TỪ HỆ THỐNG:'}
                      </Text>
                      <Text style={styles.analysisBody}>{selectedNotif.body}</Text>
                    </View>

                    {isSelectedWarning && (
                      <View style={styles.stepsCard}>
                        <View style={styles.stepsHeader}>
                          <Wrench size={16} color="#ea580c" strokeWidth={2.4} />
                          <Text style={styles.stepsTitle}>
                            Hướng dẫn khắc phục đề xuất cho Gara
                          </Text>
                        </View>
                        {info.steps.map((step, index) => (
                          <View key={index} style={styles.stepRow}>
                            <View style={styles.stepIndex}>
                              <Text style={styles.stepIndexText}>{index + 1}</Text>
                            </View>
                            <Text style={styles.stepText}>{step}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.detailActions}>
                      {isSelectedWarning && (
                        <TouchableOpacity
                          style={styles.primaryActionBtn}
                          activeOpacity={0.88}
                          onPress={() =>
                            handleActionNavigate(selectedNotif, info.actionRoute)
                          }
                        >
                          <ActionIcon size={17} color="#ffffff" strokeWidth={2.3} />
                          <Text style={styles.primaryActionText}>
                            {info.actionLabel}
                          </Text>
                          <ChevronRight size={17} color="#ffffff" />
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.secondaryActionBtn}
                        activeOpacity={0.8}
                        onPress={() => setSelectedNotif(null)}
                      >
                        <CheckCircle2 size={16} color="#16a34a" />
                        <Text style={styles.secondaryActionText}>
                          Đã hiểu & Quay lại danh sách
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })()}
            </ScrollView>
          ) : (
            <>
              {/* Filter Bar */}
              <View style={styles.filterBar}>
                <View style={styles.filterTabs}>
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      filter === 'ALL' && styles.filterTabActive,
                    ]}
                    onPress={() => setFilter('ALL')}
                  >
                    <Text
                      style={[
                        styles.filterTabText,
                        filter === 'ALL' && styles.filterTabTextActive,
                      ]}
                    >
                      Tất cả ({notifications.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      filter === 'WARNINGS' && styles.filterTabActive,
                    ]}
                    onPress={() => setFilter('WARNINGS')}
                  >
                    <Text
                      style={[
                        styles.filterTabText,
                        filter === 'WARNINGS' && styles.filterTabTextActive,
                      ]}
                    >
                      Đề xuất ({warningList.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      filter === 'SYSTEM' && styles.filterTabActive,
                    ]}
                    onPress={() => setFilter('SYSTEM')}
                  >
                    <Text
                      style={[
                        styles.filterTabText,
                        filter === 'SYSTEM' && styles.filterTabTextActive,
                      ]}
                    >
                      Thông báo hệ thống ({systemList.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {unreadCount > 0 && (
                  <View style={styles.markAllRow}>
                    <Text style={styles.unreadCountText}>
                      {unreadCount} thông báo chưa đọc
                    </Text>
                    <TouchableOpacity
                      style={styles.markAllBtn}
                      onPress={onMarkAllRead}
                    >
                      <CheckCheck size={14} color="#ea580c" />
                      <Text style={styles.markAllText}>Đọc tất cả</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* List */}
              {loading ? (
                <View style={styles.emptyWrap}>
                  <ActivityIndicator size="large" color="#ea580c" />
                  <Text style={styles.emptyTitle}>Đang tải thông báo...</Text>
                </View>
              ) : filteredList.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIconCircle}>
                    <CheckCircle2 size={32} color="#16a34a" />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {filter === 'WARNINGS'
                      ? 'Không có đề xuất nào'
                      : filter === 'SYSTEM'
                      ? 'Không có thông báo hệ thống nào'
                      : 'Không có thông báo nào'}
                  </Text>
                  <Text style={styles.emptySub}>
                    {filter === 'WARNINGS'
                      ? 'Hiện chưa có đề xuất chấn chỉnh hay cảnh báo nào từ Quản trị viên hệ thống.'
                      : filter === 'SYSTEM'
                      ? 'Hiện tại chưa có thông báo chung nào từ hệ thống.'
                      : 'Tất cả thông báo của bạn đã được cập nhật.'}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredList.map((item) => {
                    const isWarning = isGarageWarningNotification(item);
                    const info = getWarningCategoryInfo(item);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.itemCard,
                          !item.isRead && styles.itemCardUnread,
                          isWarning && styles.itemCardWarning,
                        ]}
                        activeOpacity={0.85}
                        onPress={() => handleSelectNotification(item)}
                      >
                        <View style={styles.itemTopRow}>
                          <View
                            style={[
                              styles.categoryBadge,
                              {
                                backgroundColor: isWarning
                                  ? info.badgeBg
                                  : '#f1f5f9',
                              },
                            ]}
                          >
                            {isWarning ? (
                              <AlertTriangle size={12} color={info.badgeColor} />
                            ) : (
                              <Bell size={12} color="#475569" />
                            )}
                            <Text
                              style={[
                                styles.categoryBadgeText,
                                {
                                  color: isWarning ? info.badgeColor : '#475569',
                                },
                              ]}
                            >
                              {isWarning ? info.badgeLabel : 'Thông báo hệ thống'}
                            </Text>
                          </View>

                          <View style={styles.timeRow}>
                            {!item.isRead && <View style={styles.unreadDot} />}
                            <Text style={styles.timeText}>
                              {formatRelativeTime(item.createdAt)}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.itemTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={styles.itemBody} numberOfLines={3}>
                          {item.body}
                        </Text>

                        <View style={styles.itemFooter}>
                          <Text style={styles.viewDetailLink}>
                            {submittingId === item.id
                              ? 'Đang mở...'
                              : isWarning
                              ? 'Xem chi tiết & Hướng khắc phục'
                              : 'Xem chi tiết thông báo'}
                          </Text>
                          <ChevronRight size={15} color="#ea580c" />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '88%',
    minHeight: '55%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  filterTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  filterTabActive: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
  },
  filterTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  markAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  unreadCountText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  markAllText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ea580c',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  itemCardUnread: {
    backgroundColor: '#fffaf5',
    borderColor: '#fdba74',
  },
  itemCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#ea580c',
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea580c',
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 20,
  },
  itemBody: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  viewDetailLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  emptyWrap: {
    paddingVertical: 56,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  detailContent: {
    padding: 18,
    gap: 16,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 23,
  },
  analysisBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#fed7aa',
    gap: 6,
  },
  analysisLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9a3412',
    letterSpacing: 0.3,
  },
  analysisBody: {
    fontSize: 13.5,
    color: '#1e293b',
    lineHeight: 21,
    fontWeight: '500',
  },
  stepsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 11,
  },
  stepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  stepsTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepIndexText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
  },
  stepText: {
    flex: 1,
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 19,
    fontWeight: '500',
  },
  detailActions: {
    gap: 10,
    marginTop: 4,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  primaryActionText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    flex: 1,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#f0fdf4',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803d',
    textAlign: 'center',
  },
});

