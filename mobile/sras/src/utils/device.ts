import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'sras_persistent_device_id';
let cachedDeviceId: string | null = null;

/**
 * Lấy mã định danh cố định duy nhất của thiết bị máy (Hardware / Persistent Device ID).
 * Dù đổi mạng Wi-Fi, đổi mạng 4G/5G, khởi động lại máy hay đổi tài khoản, máy đó vẫn mang duy nhất mã này.
 */
export async function getPersistentDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        let storedId = window.localStorage.getItem(DEVICE_ID_KEY);
        if (!storedId) {
          storedId = 'DEV-WEB-' + Crypto.randomUUID().slice(0, 18).toUpperCase();
          window.localStorage.setItem(DEVICE_ID_KEY, storedId);
        }
        cachedDeviceId = storedId;
        return storedId;
      }
    } else {
      let storedId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (!storedId) {
        const prefix = Platform.OS === 'ios' ? 'DEV-IOS-' : 'DEV-AND-';
        storedId = prefix + Crypto.randomUUID().slice(0, 18).toUpperCase();
        await SecureStore.setItemAsync(DEVICE_ID_KEY, storedId);
      }
      cachedDeviceId = storedId;
      return storedId;
    }
  } catch (err) {
    console.warn('Could not read/write device ID to secure store:', err);
  }

  const fallback = 'DEV-' + Crypto.randomUUID().slice(0, 18).toUpperCase();
  cachedDeviceId = fallback;
  return fallback;
}
