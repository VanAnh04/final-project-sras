import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/** Khóa SecureStore giữ push token đã đăng ký — để hủy đúng token khi đăng xuất. */
const PUSH_TOKEN_KEY = 'expoPushToken';

/** Kênh Android mặc định — trùng `channelId: "default"` backend gửi kèm push. */
const ANDROID_CHANNEL_ID = 'default';

// App đang mở vẫn hiện banner (người dùng có thể đang ở màn khác với đơn được báo).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const getProjectId = (): string | undefined =>
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

/**
 * Xin quyền + lấy Expo push token. Trả về null khi: chạy trên máy ảo, người dùng từ chối quyền,
 * thiếu EAS projectId, hoặc đang chạy Expo Go trên Android (không hỗ trợ remote push từ SDK 53).
 */
export async function registerForPushAsync(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  if (Platform.OS === 'android') {
    // Android 13+ phải có kênh trước khi xin token.
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Thông báo cứu hộ',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return null;

  const projectId = getProjectId();
  if (!projectId) {
    console.warn('[push] Thiếu extra.eas.projectId trong app.json — chạy `eas init` để bật push.');
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, data).catch(() => {});
    return data;
  } catch (e: any) {
    // Thường do offline hoặc Expo Go Android — không chặn luồng đăng nhập.
    console.warn('[push] Không lấy được push token:', e?.message);
    return null;
  }
}

export const getStoredPushToken = (): Promise<string | null> =>
  SecureStore.getItemAsync(PUSH_TOKEN_KEY).catch(() => null);

export const clearStoredPushToken = (): Promise<void> =>
  SecureStore.deleteItemAsync(PUSH_TOKEN_KEY).catch(() => {});

export const devicePlatform = (): 'ANDROID' | 'IOS' => (Platform.OS === 'ios' ? 'IOS' : 'ANDROID');
