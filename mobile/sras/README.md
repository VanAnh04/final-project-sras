# SRAS Mobile

App mobile của SRAS dành cho 3 vai trò: **khách hàng**, **chủ gara**, **nhân viên gara**.

## Công nghệ

Expo 57 · React Native 0.86 · expo-router (file-based routing) · TypeScript · axios ·
react-native-webview + goong-js (bản đồ) · expo-location · @clerk/expo (đăng nhập Google) ·
lucide-react-native

> ⚠️ Expo 57 có breaking changes — tra tài liệu đúng phiên bản
> https://docs.expo.dev/versions/v57.0.0/ trước khi viết code.

## Cài đặt & chạy

```bash
npm install
cp .env.example .env      # rồi điền key
npx expo start -c         # -c xóa cache — BẮT BUỘC sau mỗi lần sửa .env
```

| Biến | Ý nghĩa |
|------|---------|
| `EXPO_PUBLIC_API_URL` | (tuỳ chọn) URL backend, vd. `http://192.168.1.24:8080/api`. Bỏ trống → tự dò IP máy chạy Metro |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (đăng nhập Google cho khách) |
| `EXPO_PUBLIC_GOONG_API_KEY` | Goong: routing, geocode, autocomplete |
| `EXPO_PUBLIC_GOONG_MAPTILES_KEY` | Goong: render bản đồ |
| `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` | Luồng Google native cũ (không còn dùng) |

Mọi biến `EXPO_PUBLIC_*` bị bundle vào app → **không đặt secret**.

Khi chạy trên **điện thoại thật**: điện thoại và máy chạy backend phải cùng mạng Wi-Fi; Android emulator
truy cập backend qua `10.0.2.2:8080`. Chi tiết: [../../docs/setup.md](../../docs/setup.md).

## Scripts

| Lệnh | Tác dụng |
|------|----------|
| `npm start` | `expo start` |
| `npm run android` / `npm run ios` | Mở trên emulator/simulator |
| `npm run lint` | ESLint (`expo lint`) |
| `npm run proxy` | Chạy proxy CORS `mobile-proxy.js` (cổng 8088 → backend 8080) |

## Cấu trúc

```
src/app/
  auth/            đăng nhập, đăng ký, OTP, quên mật khẩu, Google + SĐT
  customer/        trang chủ, gửi cứu hộ (3 bước), theo dõi, báo giá, thanh toán, hoạt động, hồ sơ
  garage-owner/    tổng quan, đơn hàng, chi tiết đơn, nhân viên, xe cứu hộ, dịch vụ & giá, ví, cài đặt
  garage-staff/    nhiệm vụ, báo giá, tiến độ sửa chữa, lịch sử, hồ sơ
  chat.tsx         màn chat dùng chung mọi vai trò
src/api/           axiosClient (JWT + tự refresh) + API theo domain
src/components/    modal nhận cuốc, gán nhân viên, chọn vị trí, hộp thư chat, đẩy GPS...
src/realtime/      chatSocket (WebSocket /ws/chat)
src/contexts/      AuthContext, GarageSettingsContext
src/models/        kiểu dữ liệu khớp entity backend
```

Quy ước code: [CLAUDE.md](CLAUDE.md) · API backend: [../../docs/api.md](../../docs/api.md)
