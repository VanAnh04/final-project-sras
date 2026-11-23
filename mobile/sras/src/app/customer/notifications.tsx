import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCheck,
  Truck,
  Wrench,
  FileText,
  CreditCard,
  Building2,
  Briefcase,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { notificationApi, NotificationDto } from '../../api/notificationApi';
import { rescueApi } from '../../api/rescueApi';

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0 || diffMs < 60000) return 'Vừa xong';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return dateStr;
  }
}

function getNotificationVisuals(notif: NotificationDto) {
  const type = String(notif.type || '').toUpperCase();
  const refType = String(notif.refType || '').toUpperCase();
  const title = (notif.title || '').toLowerCase();

  if (type === 'NEW_QUOTE' || title.includes('báo giá')) {
    return {
      icon: <FileText size={20} color="#d97706" strokeWidth={2.3} />,
      bg: '#fffbeb',
      border: '#fde68a',
    };
  }

  if (type === 'PAYMENT_RECEIVED' || refType === 'WALLET' || title.includes('thanh toán') || title.includes('nạp tiền')) {
    return {
      icon: <CreditCard size={20} color="#16a34a" strokeWidth={2.3} />,
      bg: '#f0fdf4',
      border: '#bbf7d0',
    };
  }

  if (refType === 'GARAGE' || title.includes('hồ sơ gara')) {
    return {
      icon: <Building2 size={20} color="#ea580c" strokeWidth={2.3} />,
      bg: '#fff7ed',
      border: '#fed7aa',
    };
  }

  if (type === 'STAFF_INVITATION' || refType === 'STAFF_INVITATION' || refType === 'GARAGE_STAFF' || title.includes('thôi việc')) {
    return {
      icon: <Briefcase size={20} color="#ea580c" strokeWidth={2.3} />,
      bg: '#fff7ed',
      border: '#fed7aa',
    };
  }

  if (refType === 'ROAD_HAZARD' || title.includes('đoạn đường rủi ro') || title.includes('cung đường rủi ro')) {
    return {
      icon: <AlertTriangle size={20} color="#ea580c" strokeWidth={2.4} />,
      bg: '#fff7ed',
      border: '#fed7aa',
    };
  }

  if (title.includes('hủy') || title.includes('cảnh báo') || title.includes('từ chối')) {
    return {
      icon: <AlertTriangle size={20} color="#ea580c" strokeWidth={2.3} />,
      bg: '#fff7ed',
      border: '#fed7aa',
    };
  }

  if (refType === 'RESCUE_REQUEST' || title.includes('cứu hộ') || title.includes('thợ')) {
    return {
      icon: <Truck size={20} color="#ea580c" strokeWidth={2.3} />,
      bg: '#fff7ed',
      border: '#fed7aa',
    };
  }

  return {
    icon: <Bell size={20} color="#64748b" strokeWidth={2.3} />,
    bg: '#f8fafc',
    border: '#e2e8f0',
  };
}

export default function CustomerNotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const [selectedHazardNotif, setSelectedHazardNotif] = useState<NotificationDto | null>(null);
  const [showHazardModal, setShowHazardModal] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationApi.getRecent();
      setNotifications(data || []);
    } catch (e: any) {
      console.log('Error loading notifications:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Lắng nghe push thời gian thực để làm mới danh sách
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      fetchNotifications();
    });
    return () => {
      sub.remove();
    };
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    if (markingAll) return;
    try {
      setMarkingAll(true);
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e: any) {
      console.log('Error mark all read:', e.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemPress = async (item: NotificationDto) => {
    if (!item.isRead) {
      // Cập nhật optimistic
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      notificationApi.markRead(item.id).catch(() => {});
    }

    const type = String(item.type || '').toUpperCase();
    const refType = String(item.refType || '').toUpperCase();
    const refId = item.refId;
    const title = (item.title || '').toLowerCase();
    const body = (item.body || '').toLowerCase();

    const isQuoteNotif =
      type === 'NEW_QUOTE' ||
      type === 'QUOTE_RESPONDED' ||
      title.includes('báo giá') ||
      body.includes('báo giá');

    if (isQuoteNotif && refId) {
      try {
        const checkJob = await rescueApi.getOne(Number(refId));
        if (checkJob) {
          // 1. Nếu đơn đã xong và thanh toán hoàn tất (PAID / RATED)
          // -> Chuyển sang màn hình hành trình & biên nhận cuốc cứu hộ
          if (checkJob.status === 'PAID' || checkJob.status === 'RATED') {
            router.push({
              pathname: '/customer/rescue-tracking',
              params: { id: String(refId), from: '/customer/notifications' },
            } as any);
            return;
          }

          // 2. Nếu đơn đã sửa xong đang chờ thanh toán (COMPLETED / AWAITING_PAYMENT)
          // -> Nếu khách đã chọn tiền mặt thì mở rescue-tracking, ngược lại mở màn thanh toán
          if (checkJob.status === 'AWAITING_PAYMENT' || checkJob.status === 'COMPLETED') {
            if (checkJob.cashConfirmedByCustomer || checkJob.paymentMethod === 'CASH') {
              router.push({
                pathname: '/customer/rescue-tracking',
                params: { id: String(refId), from: '/customer/notifications' },
              } as any);
            } else {
              router.push({
                pathname: '/customer/payment',
                params: { id: String(refId), from: '/customer/notifications' },
              } as any);
            }
            return;
          }

          // 3. Nếu đơn đã được duyệt và đang thực hiện sửa chữa / kéo xe (REPAIRING_ONSITE, TOW_TO_GARAGE, TOWING)
          // -> Khách đã đồng ý báo giá rồi, thợ đang làm -> mở ngay rescue-tracking để theo dõi tiến độ
          if (
            checkJob.status === 'REPAIRING_ONSITE' ||
            checkJob.status === 'TOW_TO_GARAGE' ||
            checkJob.status === 'TOWING'
          ) {
            router.push({
              pathname: '/customer/rescue-tracking',
              params: { id: String(refId), from: '/customer/notifications' },
            } as any);
            return;
          }

          // 4. Nếu đơn đã bị huỷ hoặc từ chối
          if (checkJob.status === 'CANCELLED' || checkJob.status === 'DECLINED') {
            router.push({
              pathname: '/customer/rescue-tracking',
              params: { id: String(refId), from: '/customer/notifications' },
            } as any);
            return;
          }
        }
      } catch (err) {
        console.warn('Lỗi kiểm tra trạng thái đơn khi bấm thông báo báo giá:', err);
      }

      // Đơn đang thực sự chờ duyệt báo giá (DIAGNOSED / PENDING) -> mở chi tiết báo giá để duyệt
      router.push({
        pathname: '/customer/rescue-quote',
        params: { id: String(refId), from: '/customer/notifications' },
      } as any);
      return;
    }

    if (refType === 'RESCUE_REQUEST' && refId) {
      router.push({
        pathname: '/customer/rescue-tracking',
        params: { id: String(refId), from: '/customer/notifications' },
      } as any);
      return;
    }

    if (refType === 'GARAGE') {
      router.push('/customer/register-partner' as any);
      return;
    }

    if (type === 'STAFF_INVITATION' || refType === 'STAFF_INVITATION' || refType === 'GARAGE_STAFF') {
      router.replace('/customer' as any);
      return;
    }

    if (refType === 'ROAD_HAZARD' || title.includes('đoạn đường rủi ro') || title.includes('cung đường rủi ro')) {
      setSelectedHazardNotif(item);
      setShowHazardModal(true);
      return;
    }

    if (refType === 'WALLET') {
      router.push('/customer/wallet' as any);
      return;
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const displayedList = useMemo(() => {
    if (filterTab === 'UNREAD') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filterTab]);

  const renderItem = ({ item }: { item: NotificationDto }) => {
    const visual = getNotificationVisuals(item);
    return (
      <TouchableOpacity
        style={[styles.itemCard, !item.isRead && styles.itemCardUnread]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.itemIconWrap, { backgroundColor: visual.bg, borderColor: visual.border }]}>
          {visual.icon}
        </View>

        <View style={styles.itemContent}>
          <View style={styles.itemHeaderRow}>
            <Text
              style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.itemBody} numberOfLines={2}>
            {item.body}
          </Text>

          <View style={styles.itemFooterRow}>
            <Text style={styles.itemTime}>{formatRelativeTime(item.createdAt)}</Text>
            {!item.isRead && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>Mới</Text>
              </View>
            )}
          </View>
        </View>

        <ChevronRight size={16} color="#cbd5e1" style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#0f172a" strokeWidth={2.4} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Thông báo</Text>

        <TouchableOpacity
          style={styles.markAllBtn}
          onPress={handleMarkAllRead}
          disabled={unreadCount === 0 || markingAll}
          activeOpacity={0.7}
        >
          {markingAll ? (
            <ActivityIndicator size="small" color="#ea580c" />
          ) : (
            <>
              <CheckCheck
                size={18}
                color={unreadCount > 0 ? '#ea580c' : '#94a3b8'}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.markAllText,
                  unreadCount === 0 && { color: '#94a3b8' },
                ]}
              >
                Đọc tất cả
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* FILTER TABS */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filterTab === 'ALL' && styles.filterTabActive]}
          onPress={() => setFilterTab('ALL')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterTabText,
              filterTab === 'ALL' && styles.filterTabTextActive,
            ]}
          >
            Tất cả ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filterTab === 'UNREAD' && styles.filterTabActive]}
          onPress={() => setFilterTab('UNREAD')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterTabText,
              filterTab === 'UNREAD' && styles.filterTabTextActive,
            ]}
          >
            Chưa đọc ({unreadCount})
          </Text>
          {unreadCount > 0 && <View style={styles.tabBadgeDot} />}
        </TouchableOpacity>
      </View>

      {/* LIST OR EMPTY */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Đang tải thông báo...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedList}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={
            displayedList.length === 0
              ? styles.emptyListContainer
              : styles.listContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#ea580c']}
              tintColor="#ea580c"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <BellOff size={36} color="#94a3b8" strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyTitle}>
                {filterTab === 'UNREAD'
                  ? 'Không có thông báo chưa đọc'
                  : 'Chưa có thông báo nào'}
              </Text>
              <Text style={styles.emptySub}>
                {filterTab === 'UNREAD'
                  ? 'Bạn đã đọc toàn bộ thông báo gần đây.'
                  : 'Bạn sẽ nhận được thông báo khi có diễn biến cuốc cứu hộ, báo giá mới hoặc cập nhật tài khoản tại đây.'}
              </Text>
            </View>
          }
        />
      )}

      {/* MODAL CẢNH BÁO ĐOẠN ĐƯỜNG RỦI RO */}
      <Modal
        visible={showHazardModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHazardModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.hazardModalHeader}>
              <View style={styles.hazardModalIconWrap}>
                <AlertTriangle size={24} color="#ea580c" strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hazardModalTitle}>CẢNH BÁO ĐOẠN ĐƯỜNG RỦI RO</Text>
                <Text style={styles.hazardModalSub} numberOfLines={1}>
                  {selectedHazardNotif?.title.replace(/^⚠️\s*Cảnh báo đoạn đường rủi ro:\s*/i, '') || 'Khu vực cảnh báo'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowHazardModal(false)}
                style={styles.modalCloseIconBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.hazardModalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.hazardMessageWrap}>
                <Text style={styles.hazardMessageText}>{selectedHazardNotif?.body}</Text>
              </View>

              <View style={styles.hazardTipsWrap}>
                <Text style={styles.hazardTipsHeader}>Khuyến cáo lái xe an toàn từ SRAS:</Text>
                <View style={styles.hazardTipItem}>
                  <ShieldCheck size={16} color="#ea580c" strokeWidth={2.2} style={{ marginTop: 2 }} />
                  <Text style={styles.hazardTipText}>
                    Giảm tốc độ và quan sát kỹ mặt đường để tránh đinh nhọn, nắp cống hoặc ổ gà.
                  </Text>
                </View>
                <View style={styles.hazardTipItem}>
                  <ShieldCheck size={16} color="#ea580c" strokeWidth={2.2} style={{ marginTop: 2 }} />
                  <Text style={styles.hazardTipText}>
                    Hệ thống cứu hộ SRAS đã định vị sẵn các trạm/gara cứu hộ đối tác gần nhất để sẵn sàng ứng cứu nếu có sự cố.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.hazardModalButton}
              onPress={() => setShowHazardModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.hazardModalButtonText}>Đã hiểu, tôi sẽ chú ý</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterTabActive: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  filterTabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#c2410c',
    fontWeight: '800',
  },
  tabBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ea580c',
  },
  listContainer: {
    padding: 14,
    paddingBottom: 28,
    gap: 10,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  itemCardUnread: {
    backgroundColor: '#fffbf7',
    borderColor: '#fed7aa',
    borderLeftWidth: 3.5,
    borderLeftColor: '#ea580c',
  },
  itemIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  itemTitleUnread: {
    fontWeight: '800',
    color: '#0f172a',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea580c',
    marginLeft: 6,
  },
  itemBody: {
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 6,
  },
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  newBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c2410c',
  },
  chevron: {
    marginLeft: 8,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  hazardModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  hazardModalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  hazardModalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#9a3412',
    letterSpacing: 0.3,
  },
  hazardModalSub: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  modalCloseIconBtn: {
    padding: 4,
  },
  hazardModalScroll: {
    marginBottom: 16,
  },
  hazardMessageWrap: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ffedd5',
    marginBottom: 16,
  },
  hazardMessageText: {
    fontSize: 13.5,
    color: '#7c2d12',
    lineHeight: 21,
    fontWeight: '500',
  },
  hazardTipsWrap: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  hazardTipsHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  hazardTipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  hazardTipText: {
    flex: 1,
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  hazardModalButton: {
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hazardModalButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
