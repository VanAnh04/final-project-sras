// Key Goong đọc từ .env (EXPO_PUBLIC_* được inline lúc bundle).
// - API Key: routing / geocoding / place autocomplete (dùng ở goongApi).
// - Maptiles Key: render bản đồ goong-js (dùng trong WebView HTML).
// Nhớ chạy `npx expo start -c` sau khi sửa .env, nếu không key sẽ undefined.
export const GOONG_API_KEY = process.env.EXPO_PUBLIC_GOONG_API_KEY ?? '';
export const GOONG_MAPTILES_KEY = process.env.EXPO_PUBLIC_GOONG_MAPTILES_KEY ?? '';
