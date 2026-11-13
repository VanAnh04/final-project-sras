import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
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
  const { user, isAuthenticated, isLoading } = useAuth();
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

      const target = routeForNotification(role, data);
      if (target) router.push(target);
    };

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      void open(response);
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
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, isAuthenticated, role, router]);

  return null;
}
