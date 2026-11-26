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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCheck,
  Truck,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CreditCard,
  Building2,
  Briefcase,
  MapPin,
  ChevronRight,
  Banknote,
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

function getStaffNotificationVisuals(notif: NotificationDto) {
  const type = String(notif.type || '').toUpperCase();
  const refType = String(notif.refType || '').toUpperCase();
  const title = (notif.title || '').toLowerCase();
  const body = (notif.body || '').toLowerCase();

  // Khách phản hồi báo giá
  if (type === 'QUOTE_RESPONDED' || title.includes('báo giá')) {
    if (title.includes('từ chối') || body.includes('từ chối') || body.includes('không đồng ý')) {
      return {
        icon: <AlertTriangle size={20} color="#d97706" strokeWidth={2.4} />,
        bg: '#fffbeb',
        border: '#fde68a',
        badgeColor: '#b45309',
        badgeBg: '#fef3c7',
        badgeLabel: 'Khách từ chối',
      };
    }
    return {
      icon: <CheckCircle2 size={20} color="#16a34a" strokeWidth={2.4} />,
      bg: '#f0fdf4',
      border: '#bbf7d0',
      badgeColor: '#15803d',
      badgeBg: '#dcfce7',
      badgeLabel: 'Khách duyệt',
    };
  }

  // Đơn cứu hộ bị hủy
  if (type === 'ORDER_CANCELLED' || title.includes('hủy đơn') || title.includes('bị hủy')) {
    return {
      icon: <XCircle size={20} color="#ef4444" strokeWidth={2.4} />,
      bg: '#fef2f2',
      border: '#fecaca',
      badgeColor: '#b91c1c',
      badgeBg: '#fee2e2',
      badgeLabel: 'Đã hủy',
    };
  }

  // Xác nhận thu tiền mặt từ chủ gara
  if (
    refType === 'CASH_SETTLEMENT' ||
    title.includes('thu tiền mặt') ||
    (title.includes('thu tiền') && body.includes('tiền mặt'))
  ) {
    return {
      icon: <Banknote size={20} color="#16a34a" strokeWidth={2.4} />,
      bg: '#f0fdf4',
      border: '#bbf7d0',
      badgeColor: '#15803d',
      badgeBg: '#dcfce7',
      badgeLabel: 'Thu tiền',
    };
  }

  // Thanh toán hoàn tất
  if (type === 'PAYMENT_RECEIVED' || type === 'PAYMENT_SUCCESS' || title.includes('thanh toán')) {
    return {
      icon: <CreditCard size={20} color="#16a34a" strokeWidth={2.4} />,
      bg: '#f0fdf4',
      border: '#bbf7d0',
      badgeColor: '#15803d',
      badgeBg: '#dcfce7',
      badgeLabel: 'Thanh toán',
    };
  }

  // Khách cập nhật vị trí
  if (type === 'CUSTOMER_SHARING_LOCATION' || title.includes('vị trí')) {
    return {
      icon: <MapPin size={20} color="#2563eb" strokeWidth={2.4} />,
      bg: '#eff6ff',
      border: '#bfdbfe',
      badgeColor: '#1d4ed8',
      badgeBg: '#dbeafe',
      badgeLabel: 'Vị trí',
    };
  }

  // Ca cứu hộ mới được giao
  if (type === 'TASK_ASSIGNED' || type === 'STAFF_ASSIGNED' || type === 'NEW_ORDER' || refType === 'RESCUE_REQUEST') {
    return {
      icon: <Wrench size={20} color="#ea580c" strokeWidth={2.4} />,
      bg: '#fff7ed',
      border: '#fed7aa',
      badgeColor: '#c2410c',
      badgeBg: '#ffedd5',
      badgeLabel: 'Cứu hộ',
    };
  }

  // Gara / Nhân sự / Thôi việc
  if (type === 'STAFF_INVITATION' || refType === 'GARAGE_STAFF' || title.includes('thôi việc') || title.includes('gara')) {
    return {
      icon: <Building2 size={20} color="#ea580c" strokeWidth={2.4} />,
      bg: '#fff7ed',
      border: '#fed7aa',
      badgeColor: '#c2410c',
      badgeBg: '#ffedd5',
      badgeLabel: 'Gara',
    };
  }

  return {
    icon: <Bell size={20} color="#64748b" strokeWidth={2.4} />,
    bg: '#f8fafc',
    border: '#e2e8f0',
    badgeColor: '#64748b',
    badgeBg: '#f1f5f9',
    badgeLabel: 'Hệ thống',
  };
}

export default function GarageStaffNotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD'>('ALL');

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationApi.getRecent();
      setNotifications(data || []);
    } catch (e: any) {
      console.log('Error loading staff notifications:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  // Lắng nghe push thời gian thực
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
      type === 'QUOTE_RESPONDED' ||
      type === 'NEW_QUOTE' ||
      title.includes('báo giá') ||
      body.includes('báo giá');

    if (isQuoteNotif && refId) {
      try {
        const checkJob = await rescueApi.getOne(Number(refId));
        // Nếu đơn đã xong hoặc đã thanh toán (COMPLETED / PAID / RATED / CANCELLED) -> chuyển sang xem chi tiết đơn hoàn thành
        if (
          checkJob &&
          (checkJob.status === 'COMPLETED' ||
            checkJob.status === 'PAID' ||
            checkJob.status === 'RATED' ||
            checkJob.status === 'CANCELLED')
        ) {
          router.push({
            pathname: '/garage-staff/order-detail',
            params: { id: String(refId), from: '/garage-staff/notifications' },
          } as any);
          return;
        }
      } catch {}

      router.push({
        pathname: '/garage-staff/repair-progress',
        params: { id: String(refId), from: '/garage-staff/notifications' },
      } as any);
      return;
    }

    if (type === 'ORDER_CANCELLED' || (refType === 'RESCUE_REQUEST' && refId)) {
      router.push({
        pathname: '/garage-staff/order-detail',
        params: { id: String(refId) },
      } as any);
      return;
    }

    if (type === 'STAFF_INVITATION' || refType === 'GARAGE_STAFF') {
      const title = (item.title || '').toLowerCase();
      if (title.includes('thôi việc')) {
        router.replace('/customer' as any);
        return;
      }
    }

    if (
      refType === 'CASH_SETTLEMENT' ||
      refType === 'WALLET' ||
      type === 'PAYMENT_SUCCESS' ||
      title.includes('thu tiền mặt') ||
      (title.includes('thu tiền') && body.includes('tiền mặt'))
    ) {
      router.push('/garage-staff/wallet' as any);
      return;
    }

    if (refType === 'WALLET') {
      router.push('/garage-staff/wallet' as any);
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
    const visual = getStaffNotificationVisuals(item);
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
            <View style={[styles.tagBadge, { backgroundColor: visual.badgeBg }]}>
              <Text style={[styles.tagBadgeText, { color: visual.badgeColor }]}>
                {visual.badgeLabel}
              </Text>
            </View>
            <Text style={styles.itemTime}>{formatRelativeTime(item.createdAt)}</Text>
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

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Thông báo công việc</Text>
          <Text style={styles.headerSubtitle}>Kỹ thuật viên cứu hộ</Text>
        </View>

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
                  : 'Chưa có thông báo công việc nào'}
              </Text>
              <Text style={styles.emptySub}>
                {filterTab === 'UNREAD'
                  ? 'Bạn đã đọc toàn bộ thông báo công việc gần đây.'
                  : 'Các thông báo phân công ca cứu hộ, khách duyệt báo giá hoặc giao dịch hoàn tất sẽ xuất hiện tại đây.'}
              </Text>
            </View>
          }
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
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
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
  tagBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  itemTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
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
});
