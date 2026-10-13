@AGENTS.md

# Mobile rules — Expo / React Native

Áp dụng cho `mobile/sras/`. Rules chung ở [../../CLAUDE.md](../../CLAUDE.md).

- Stack: **Expo 57**, React Native 0.86, **expo-router** (file-based routing), TypeScript `strict`.
- ⚠️ Expo 57 có breaking changes — tra tài liệu đúng phiên bản
  `https://docs.expo.dev/versions/v57.0.0/` trước khi dùng API Expo (xem `AGENTS.md`).
- Chạy: `npx expo start -c` · lint: `npm run lint`.

## Cấu trúc

```
src/app/            route (expo-router): auth/, customer/, garage-owner/, garage-staff/, chat.tsx
src/api/            axiosClient + module theo domain (authApi, rescueApi, garageApi, chatApi, goongApi...)
src/components/     component dùng chung (modal, ChatInbox, LocationPickerModal, *LocationPusher...)
src/components/call/ CallOverlay (UI cuộc gọi, gắn ở _layout gốc), CallEngine (WebView ẩn chạy WebRTC)
src/contexts/       AuthContext, GarageSettingsContext
src/realtime/       chatSocket.ts (WebSocket /ws/chat), callManager.ts (state cuộc gọi), callEngineHtml.ts
src/models/         kiểu dữ liệu mirror entity backend
src/utils/, src/config/, src/constants/
```

- Mỗi vai trò là một nhóm route có `_layout.tsx` riêng. Màn dùng chung nhiều vai trò (như `chat.tsx`)
  đặt ở **root `src/app/`**, không đặt trong nhóm tab của một vai trò (tránh bị kéo sang layout khác).
- Route ẩn khỏi tab bar: `href: null` trong `_layout.tsx`.

## Gọi API

- **Luôn** gọi backend qua `src/api/*Api.ts` dùng `axiosClient` (tự dò base URL, gắn JWT, tự refresh
  khi 401/403). Không gọi `fetch`/`axios` trực tiếp trong màn hình.
- Ngoại lệ: API Goong gọi bằng `fetch` trong `goongApi.ts` (không đi qua axiosClient).
- URL file trả về từ backend là tương đối (`/uploads/...`) → hiển thị qua `resolveFileUrl(...)`.
- Kiểu response khớp `ApiResponse<T>` của backend (`{ success, message, data }`); hiển thị lỗi bằng
  `error.response?.data?.message` (tiếng Việt từ backend).
- Model đặt trong `src/models/`; đổi DTO backend → sửa model ở đây.

## UI

- Style bằng `StyleSheet.create` (không dùng NativeWind/className). Icon dùng `lucide-react-native`.
- Text hiển thị bằng tiếng Việt, tiền định dạng VNĐ (`toLocaleString('vi-VN')` + `đ`).
- Kích thước màn hình: dùng hook `useWindowDimensions()` **trong component**, **không** gọi
  `Dimensions.get()` ở cấp module (Fast Refresh làm sai giá trị → layout co lại).
- Dữ liệu cần làm mới khi quay lại màn: `useFocusEffect`. Polling (`setInterval`) phải `clearInterval`
  trong cleanup.

## Bản đồ (Goong)

- Bản đồ render bằng **goong-js trong WebView** (`react-native-webview`), không dùng Google Maps native.
- ⚠️ goong-js dùng tọa độ **`[lng, lat]`** (ngược Leaflet/backend `lat, lng`).
- WebView `source={{ html, baseUrl: 'https://cdn.jsdelivr.net/' }}` — thiếu `baseUrl` Android chặn CDN.
- Hàm setter `window.setXxx` định nghĩa ở `<script>` đầu tiên, lưu state và áp dụng khi `map.on('load')`
  để `injectJavaScript` từ RN không bị mất.
- Key: `EXPO_PUBLIC_GOONG_API_KEY` (routing/geocode) + `EXPO_PUBLIC_GOONG_MAPTILES_KEY` (render), đọc
  qua `src/config/goong.ts`.

## Gọi thoại (WebRTC)

- Mọi thao tác cuộc gọi đi qua `callManager` (singleton; UI đọc bằng `useCallState()`, **không** tự giữ state
  cuộc gọi trong màn hình). Muốn gọi: `callManager.startCall({ rescueRequestId, peer, peerName })`.
- Âm thanh chạy trong WebView ẩn (`CallEngine` + `callEngineHtml.ts`). Toàn bộ trang HTML nằm trong một
  template string → JS bên trong **không được dùng `${...}` hay dấu backtick**.
- Đổi state phải tạo object mới (`useSyncExternalStore` so sánh tham chiếu). Chuông / tiếng chờ phải dừng và
  giải phóng player **trước khi** mount engine (tránh giành audio session với WebView).
- Đang đổ chuông / đang gọi thì `AuthContext` giữ `/ws/chat` mở khi app xuống nền (`callManager.hasActiveCall()`).

## Môi trường

- Biến `.env` phải có tiền tố `EXPO_PUBLIC_` và là **public** (bị bundle vào app) — không đặt secret.
- Sửa `.env` xong phải chạy lại `npx expo start -c`, nếu không biến sẽ `undefined`.
- Máy thật: điện thoại và máy chạy backend cùng mạng LAN; Android emulator dùng `10.0.2.2:8080`.
