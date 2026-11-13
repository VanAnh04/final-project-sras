# Mobile rules — Expo / React Native

Áp dụng cho `mobile/sras/`. Rules chung ở [../../CLAUDE.md](../../CLAUDE.md).

- Stack: **Expo SDK 58**, React Native 0.88, React 19.3, **expo-router** 58 (file-based routing), TypeScript `strict`.
- ⚠️ Expo đổi API giữa các SDK — tra tài liệu đúng phiên bản `https://docs.expo.dev/versions/v58.0.0/` trước khi
  dùng API Expo. Expo Go trên iPhone chỉ chạy SDK mới nhất, nên nâng SDK bằng `npx expo install expo@^N` + `--fix`.
- Chạy: `npx expo start -c` · lint: `npm run lint`. `tsc` đang còn lỗi types RN 0.88 (xem
  [docs/progress.md §8](../../docs/progress.md)) — đừng thêm lỗi mới.

## Cấu trúc

```
src/app/              route (expo-router): auth/, customer/, garage-owner/, garage-staff/, chat.tsx (dùng chung)
src/api/              axiosClient + module theo domain (authApi, rescueApi, garageApi, chatApi, callApi, paymentApi,
                      garageWalletApi, staffWalletApi, withdrawalApi, ratingApi, complaintApi, aiApi, goongApi...)
src/components/       component dùng chung (IncomingRescueModal, AssignStaffModal, RatingModal, ComplaintModal,
                      ChatInbox, LocationPickerModal, NearbyGaragesMap, FloatingAiChatBubble, StaffLocationPusher,
                      PushNotificationManager...)
src/components/call/  CallOverlay (UI cuộc gọi, gắn ở _layout gốc), CallEngine (WebView ẩn chạy WebRTC)
src/components/withdraw/  UI rút tiền (nhập tiền, chọn ngân hàng, OTP, trạng thái lệnh)
src/contexts/         AuthContext, GarageOrdersContext (poll đơn gara), GarageSettingsContext
src/realtime/         chatSocket.ts (WebSocket /ws/chat), callManager.ts (state cuộc gọi), callEngineHtml.ts
src/navigation/       dẫn đường: useRouteTracker, useRescueNavigation, rescueTarget, navMapHtml, customerLocationShare
src/notifications/    push.ts (đăng ký Expo push token), route.ts (bấm thông báo → mở màn)
src/models/           kiểu dữ liệu mirror entity backend
src/utils/, src/config/, src/constants/, src/hooks/
```

- Mỗi vai trò là một nhóm route có `_layout.tsx` riêng với **tab bar tự vẽ**. Màn dùng chung nhiều vai trò (như
  `chat.tsx`) đặt ở **root `src/app/`**, không đặt trong nhóm tab của một vai trò.
- ⚠️ expo-router 58: **không dùng `href: null`** trên `Tabs.Screen` và **không bỏ sót khai báo** route — tab ẩn hoặc
  route chưa khai báo khi được mở sẽ bị `router.replace` về tab đầu ("bấm vào màn phụ thì về home"). Thêm màn phụ:
  khai báo `Tabs.Screen` bình thường; tab bar custom tự lọc theo `mainTabNames`.
- Custom `tabBar` của expo-router 58 không còn prop `navigation` để chuyển tab → dùng `emitter.emit(...)` +
  `navigateToTab(route.key)` như 3 `_layout.tsx` hiện có.
- Màn nằm trong Tabs **không tự unmount** khi rời đi. Màn chứa dữ liệu nhạy cảm hoặc luồng nhiều bước (rút tiền, tài
  khoản ngân hàng) chỉ dựng nội dung khi `useIsFocused()` để reset luồng và xóa dữ liệu khỏi bộ nhớ.

## Gọi API

- **Luôn** gọi backend qua `src/api/*Api.ts` dùng `axiosClient` (tự dò base URL, gắn JWT + header `X-Device-Id`,
  tự refresh khi 401/403). Không gọi `fetch`/`axios` trực tiếp trong màn hình.
- Ngoại lệ: API Goong gọi bằng `fetch` trong `goongApi.ts` (không đi qua axiosClient).
- URL file trả về từ backend là tương đối (`/uploads/...`) → hiển thị qua `resolveFileUrl(...)`.
- Kiểu response khớp `ApiResponse<T>` của backend (`{ success, message, data }`); hiển thị lỗi bằng
  `error.response?.data?.message` (tiếng Việt từ backend).
- Model đặt trong `src/models/`; đổi DTO backend → sửa model ở đây.
- **Tiền:** mọi gọi rút tiền / tài khoản nhận tiền đi qua `withdrawalApi.ts`. Điều kiện được rút lấy từ
  `GET /garages/me/wallet/withdraw/limits` (`blockedReason`), app **không tự suy luận**. Sau timeout / 5xx khi rút
  thì không cho gửi lại — chỉ cho mở Lịch sử để xem lệnh. Nút gửi tiền phải chặn bấm 2 lần.

## UI

- Style bằng `StyleSheet.create` (không dùng NativeWind/className). Icon dùng `lucide-react-native`.
- Text hiển thị bằng tiếng Việt, tiền định dạng VNĐ (`toLocaleString('vi-VN')` + `đ`).
- Kích thước màn hình: dùng hook `useWindowDimensions()` **trong component**, **không** gọi
  `Dimensions.get()` ở cấp module (Fast Refresh làm sai giá trị → layout co lại). Vài màn cũ còn vi phạm — đang
  ghi ở progress.
- Dữ liệu cần làm mới khi quay lại màn: `useFocusEffect`. Polling (`setInterval` / `setTimeout` nối tiếp) phải dọn
  trong cleanup và dừng khi app xuống nền.

## Bản đồ (Goong)

- Mọi bản đồ (chọn vị trí, gara gần, theo dõi đơn, dẫn đường) render bằng **goong-js trong WebView**
  (`react-native-webview`), không dùng Google Maps native, không dùng Leaflet.
- ⚠️ goong-js dùng tọa độ **`[lng, lat]`** (ngược backend `lat, lng`). goong-js 1.0.9 không có `setPadding`.
- WebView `source={{ html, baseUrl: 'https://cdn.jsdelivr.net/' }}` — thiếu `baseUrl` Android chặn CDN.
- Hàm setter `window.setXxx` định nghĩa ở `<script>` đầu tiên, lưu state và áp dụng khi `map.on('load')`
  để `injectJavaScript` từ RN không bị mất.
- Key: `EXPO_PUBLIC_GOONG_API_KEY` (routing/geocode) + `EXPO_PUBLIC_GOONG_MAPTILES_KEY` (render), đọc
  qua `src/config/goong.ts`.
- Vị trí khách đang chia sẻ chỉ hiện cho khách và nhân viên được gán — **không** hiện ở app chủ gara.

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
