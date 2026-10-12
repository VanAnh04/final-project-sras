# Cài đặt & chạy dự án — SRAS

> Hướng dẫn cho người mới clone repo. Mỗi phần chạy độc lập; mobile và web cần backend chạy trước.

Cập nhật: 2026-10-12

---

## 1. Yêu cầu

| Công cụ | Phiên bản | Dùng cho |
|---------|-----------|----------|
| JDK | 17+ | Backend (Maven wrapper `mvnw` có sẵn, không cần cài Maven) |
| Node.js | 20 LTS trở lên + npm | Mobile, web admin |
| Git | — | — |
| Expo Go / Android Studio emulator | Expo SDK 57 | Chạy app mobile |
| Tài khoản dịch vụ | Supabase, Clerk, Goong, eSMS, Gmail (App Password) | Xin key từ trưởng nhóm |

## 2. Backend (`backend/`)

```bash
cd backend
cp .env.example .env        # điền giá trị (xem bảng dưới)
./mvnw spring-boot:run      # Windows có thể chạy run.bat (ép UTF-8 cho log tiếng Việt)
```

Kiểm tra: mở `http://localhost:8080/api/ping` → `success: true`.

| Biến (`backend/.env`) | Bắt buộc | Lấy ở đâu / ý nghĩa |
|-----------------------|----------|---------------------|
| `DB_URL` | ✅ | Supabase → Project Settings → Database → Connection string, dùng **Session pooler**. Dạng `jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require` |
| `DB_USERNAME` | ✅ | `postgres.<project-ref>` |
| `DB_PASSWORD` | ✅ | Mật khẩu database Supabase |
| `JPA_DDL_AUTO` | | `update` (dev, tự tạo bảng) · `validate` (prod) |
| `JPA_SHOW_SQL` | | `true` để in SQL |
| `JWT_SECRET` | prod ✅ | Base64 ≥ 32 byte: `openssl rand -base64 48`. Dev có giá trị mặc định |
| `CLERK_SECRET_KEY` | ✅ (login Google) | Clerk Dashboard → API Keys (`sk_test_...`) — **chỉ để ở backend** |
| `CLERK_ISSUER`, `CLERK_JWKS_URI` | ✅ (login Google) | `https://<instance>.clerk.accounts.dev` và `.../.well-known/jwks.json` |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | ✅ (OTP email) | Gmail + **App Password** (không phải mật khẩu Gmail) |
| `ESMS_API_KEY`, `ESMS_SECRET_KEY`, `ESMS_BRANDNAME` | (OTP SMS) | Tài khoản eSMS.vn; `ESMS_SANDBOX=1` để không gửi SMS thật |
| `SERVER_PORT`, `LOG_LEVEL` | | Mặc định `8080`, `INFO` |

Lần chạy đầu Hibernate tự tạo bảng (`ddl-auto=update`). Dữ liệu mẫu xe: chạy
`backend/scripts/seed-test-vehicles.sql` trên Supabase SQL Editor.

Test: `./mvnw test` (dùng H2 in-memory, không cần Supabase).

## 3. Mobile (`mobile/sras/`)

```bash
cd mobile/sras
npm install
cp .env.example .env
npx expo start -c           # quét QR bằng Expo Go, hoặc nhấn a để mở Android emulator
```

| Biến (`mobile/sras/.env`) | Bắt buộc | Ý nghĩa |
|---------------------------|----------|---------|
| `EXPO_PUBLIC_API_URL` | | URL backend, vd. `http://192.168.1.24:8080/api`. Bỏ trống → tự dò IP máy chạy Metro |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk Dashboard → API Keys (`pk_test_...`) |
| `EXPO_PUBLIC_GOONG_API_KEY` | ✅ | account.goong.io → Keys (API key: geocode, autocomplete, directions) |
| `EXPO_PUBLIC_GOONG_MAPTILES_KEY` | ✅ | account.goong.io → Keys (Maptiles key: render bản đồ) |
| `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` | | Luồng Google native cũ — không cần |

**Kết nối tới backend:**

- **Điện thoại thật**: điện thoại và máy tính **cùng mạng Wi-Fi**; app tự lấy IP máy chạy Metro, gọi
  `http://<ip>:8080/api`. Nếu không vào được: mở cổng 8080 trên Windows Firewall, hoặc đặt
  `EXPO_PUBLIC_API_URL` thủ công.
- **Android emulator**: tự dùng `http://10.0.2.2:8080/api`.
- Mạng chặn kết nối LAN: dùng tunnel (ngrok...) rồi đặt `EXPO_PUBLIC_API_URL=https://<tunnel>/api`.
- `npm run proxy` chạy `mobile-proxy.js` (cổng 8088 → 8080, thêm CORS) khi chạy bản web của Expo.

## 4. Web admin (`web/admin/`)

```bash
cd web/admin
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

| Biến (`web/admin/.env`) | Ý nghĩa |
|-------------------------|---------|
| `VITE_API_BASE_URL` | URL backend, mặc định `http://localhost:8080/api` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID cho đăng nhập admin |

Tài khoản admin: user có `role = ADMIN` trong bảng `users` (đặt trực tiếp trên DB).

## 5. Lỗi thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|------------|---------------------------|
| Biến `.env` mobile ra `undefined` | Chưa chạy lại `npx expo start -c` sau khi sửa `.env` |
| Bản đồ xám / trắng | Thiếu hoặc sai `EXPO_PUBLIC_GOONG_MAPTILES_KEY`; WebView thiếu `baseUrl` |
| API lỗi 500 `null value in column ...` | Cột NOT NULL mới thêm vào bảng đã có dữ liệu (`ddl-auto=update` không tạo được) — sửa cột trên Supabase, xem [database.md](database.md) |
| Kết nối DB timeout | Dùng Session pooler (IPv4) thay vì Direct connection; kiểm tra `?sslmode=require` |
| Tạo đơn luôn `NO_GARAGE_FOUND` | Không có gara `APPROVED` + online + có nhân viên & xe rảnh trong 50 km (xem [business-rules.md §2](business-rules.md)) |
| Log tiếng Việt lỗi font trên Windows | Chạy backend bằng `run.bat` |
| 401 liên tục | Access token hết hạn và refresh lỗi → đăng nhập lại; kiểm tra `JWT_SECRET` không đổi giữa các lần chạy |
