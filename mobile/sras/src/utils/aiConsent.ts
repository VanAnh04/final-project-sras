import * as SecureStore from 'expo-secure-store';

const AI_DATA_CONSENT_KEY = 'SRAS_AI_DATA_CONSENT';

/**
 * Kiểm tra xem người dùng đã đồng thuận chia sẻ dữ liệu với AI (Google Gemini) chưa.
 * Trả về true nếu đã đồng ý, false nếu chưa hoặc đã từ chối.
 */
export async function getAiConsentStatus(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(AI_DATA_CONSENT_KEY);
    return val === 'true';
  } catch (e) {
    console.warn('[aiConsent] Không đọc được trạng thái consent:', e);
    return false;
  }
}

/**
 * Lưu trạng thái đồng thuận chia sẻ dữ liệu với AI.
 */
export async function setAiConsentStatus(agreed: boolean): Promise<void> {
  try {
    if (agreed) {
      await SecureStore.setItemAsync(AI_DATA_CONSENT_KEY, 'true');
    } else {
      await SecureStore.setItemAsync(AI_DATA_CONSENT_KEY, 'false');
    }
  } catch (e) {
    console.warn('[aiConsent] Không lưu được trạng thái consent:', e);
  }
}

/**
 * Xóa trạng thái đồng thuận (dùng khi đăng xuất hoặc người dùng muốn reset).
 */
export async function resetAiConsentStatus(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AI_DATA_CONSENT_KEY);
  } catch (e) {
    console.warn('[aiConsent] Không xóa được trạng thái consent:', e);
  }
}
