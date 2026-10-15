import axiosClient from './axiosClient';
import type { NotificationType } from '../models';

/** Một thông báo trong app (khớp NotificationResponse ở backend). */
export interface NotificationDto {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  refType?: string | null;
  refId?: number | null;
  isRead: boolean;
  createdAt: string;
}

export type DevicePlatform = 'ANDROID' | 'IOS';

export const notificationApi = {
  // axiosClient interceptor trả về body (ApiResponse), nên res.data là payload bên trong.

  /** 20 thông báo gần nhất của người dùng hiện tại. */
  getRecent: async (): Promise<NotificationDto[]> => {
    const res: any = await axiosClient.get('/notifications/recent');
    return res?.data ?? [];
  },

  markRead: async (id: number): Promise<void> => {
    await axiosClient.put(`/notifications/${id}/read`);
  },

  /** Đăng ký Expo push token của máy này cho tài khoản đang đăng nhập. */
  registerDevice: async (token: string, platform: DevicePlatform): Promise<void> => {
    await axiosClient.post('/device-tokens', { token, platform });
  },

  /** Hủy nhận push trên máy này (gọi khi đăng xuất, lúc access token còn hiệu lực). */
  unregisterDevice: async (token: string): Promise<void> => {
    await axiosClient.delete('/device-tokens', { params: { token } });
  },
};
