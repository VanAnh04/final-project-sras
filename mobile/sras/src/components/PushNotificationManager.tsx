import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import { notificationApi } from '../api/notificationApi';
import { devicePlatform, registerForPushAsync } from '../notifications/push';
import { routeForNotification } from '../notifications/route';
import { callManager } from '../realtime/callManager';

/**
 * Không render gì. Khi đã đăng nhập: đăng ký Expo push token với backend, và mở đúng màn khi người
 * dùng bấm vào push (cả lúc app đang chạy nền lẫn lúc mở app từ trạng thái tắt hẳn).
 */
export default function PushNotificationManager() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updateUser } = useAuth();
  const role = user?.role?.toUpperCase();
  // Chặn xử lý 2 lần cùng 1 push (listener + last response lúc khởi động).
  const handledIds = useRef(new Set<string>());

  // Đăng ký token mỗi lần đăng nhập / mở app (backend cập nhật lastUsedAt, chuyển chủ nếu đổi tài khoản).
  useEffect(() => {
    if (!isAuthenticated || user?.id == null) return;
    let alive = true;
    (async () => {
      const token = await registerForPushAsync();
      if (!alive || !token) return;
      try {
        await notificationApi.registerDevice(token, devicePlatform());
      } catch (e: any) {
        console.warn('[push] Đăng ký thiết bị thất bại:', e?.response?.data?.message || e?.message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !role) return;

    const open = async (response: Notifications.NotificationResponse) => {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const id = response.notification.request.identifier;
      if (handledIds.current.has(id)) return;
      handledIds.current.add(id);

      const data = response.notification.request.content.data ?? {};

      // Push "Cuộc gọi đến": còn đổ chuông thì hiện màn đổ chuông để nghe máy, không điều hướng.
      if (data.type === 'INCOMING_CALL') {
        if (await callManager.openFromPush(Number(data.callId))) return;
        // Đã có người nghe / người gọi đã cúp → báo rồi mở chat với người gọi như cuộc gọi nhỡ.
        Alert.alert('Cuộc gọi đã kết thúc');
      }

      // Nếu là thông báo liên quan đến thay đổi nhân sự / thôi việc: đồng bộ vai trò mới trước khi chuyển
      if (
        data.refType === 'GARAGE_STAFF' ||
        data.type === 'STAFF_INVITATION' ||
        data.refType === 'STAFF_INVITATION'
      ) {
        try {
          const syncRes: any = await axiosClient.post('/auth/sync-role');
          if (syncRes?.data?.user) {
            await updateUser(syncRes.data.user);
            if (syncRes.data.user.role === 'CUSTOMER') {
              router.replace('/customer' as any);
              return;
            }
          }
        } catch {}
      }

      // Xác nhận thu tiền mặt từ chủ gara: chuyển sang ví/thu tiền của thợ
      const notifTitle = (response.notification.request.content.title || '').toLowerCase();
      const notifBody = (response.notification.request.content.body || '').toLowerCase();
      if (
        data.refType === 'CASH_SETTLEMENT' ||
        notifTitle.includes('thu tiền mặt') ||
        (notifTitle.includes('thu tiền') && notifBody.includes('tiền mặt'))
      ) {
        if (role === 'GARAGE_STAFF') {
          router.push('/garage-staff/wallet' as any);
          return;
        }
      }

      // Thông báo xét duyệt hồ sơ đối tác Gara (Duyệt / Từ chối / Chờ duyệt)
      if (
        (data.refType === 'GARAGE' || data.type === 'GARAGE' || data.type === 'GARAGE_REVIEWED') &&
        data.refType !== 'RESCUE_REQUEST'
      ) {
        if (role === 'CUSTOMER' || !role) {
          router.push('/customer/register-partner' as any);
          return;
        }
      }

      const target = routeForNotification(role, data);
      if (target) {
        if (typeof target === 'string' && target === '/customer') {
          router.replace(target as any);
        } else {
          router.push(target);
        }
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      void open(response);
    });

    // Lắng nghe thông báo đẩy khi app đang ở foreground để đồng bộ vai trò ngay lập tức
    const foregroundSub = Notifications.addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data ?? {};
      const title = notification.request.content.title || '';
      const body = notification.request.content.body || '';

      if (
        data.refType === 'GARAGE_STAFF' ||
        data.type === 'STAFF_INVITATION' ||
        title.toLowerCase().includes('thôi việc') ||
        body.toLowerCase().includes('thôi việc')
      ) {
        try {
          const syncRes: any = await axiosClient.post('/auth/sync-role');
          if (syncRes?.data?.user) {
            await updateUser(syncRes.data.user);
            if (syncRes.data.user.role === 'CUSTOMER') {
              router.replace('/customer' as any);
            }
          }
        } catch {}
      }
    });

    // Mở app từ push khi app đã tắt: đợi màn chính theo vai trò (index → replace) dựng xong rồi mới push.
    let timer: ReturnType<typeof setTimeout> | undefined;
    Notifications.getLastNotificationResponseAsync()
      .then((last) => {
        if (!last) return;
        timer = setTimeout(() => {
          void open(last);
          Notifications.clearLastNotificationResponseAsync().catch(() => {});
        }, 800);
      })
      .catch(() => {});

    return () => {
      sub.remove();
      foregroundSub.remove();
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, isAuthenticated, role, router, updateUser]);

  return null;
}
