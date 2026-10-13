# Cài đặt & chạy dự án — SRAS

> Hướng dẫn cho người mới clone repo. Mỗi phần chạy độc lập; mobile và web cần backend chạy trước.

Cập nhật: 2026-10-13

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
| `ESMS_API_KEY`, `ESMS_SECRET_KEY`, `ESMS_BRANDNAME` | ✅ (OTP SMS) | Tài khoản eSMS.vn — **không có default**, thiếu key thì gửi OTP SMS báo lỗi; `ESMS_SANDBOX=1` để không gửi SMS thật |
| `CALL_STUN_URLS` | | Gọi thoại: máy chủ STUN, phân tách bằng dấu phẩy. Mặc định `stun:stun.l.google.com:19302` |
| `CALL_TURN_URLS` | prod ✅ | Gọi thoại: máy chủ TURN (phân tách bằng dấu phẩy). Để trống = không dùng TURN — xem [§2.1](#21-gọi-thoại-trong-app-turn-và-cách-thử) |
| `CALL_TURN_SECRET` | | Secret dùng chung với coturn (`static-auth-secret`) → backend cấp credential ngắn hạn cho từng người dùng. **Không commit** |
| `CALL_TURN_USERNAME`, `CALL_TURN_CREDENTIAL` | | TURN dùng tài khoản cố định — chỉ áp dụng khi **không** đặt `CALL_TURN_SECRET` |
| `CALL_TURN_TTL_SECONDS` | | Hạn credential ngắn hạn, mặc định `21600` (6 giờ) |
| `CALL_RING_TIMEOUT_SECONDS`, `CALL_DISCONNECT_GRACE_SECONDS`, `CALL_SWEEP_INTERVAL_MS` | | Gọi thoại: đổ chuông tối đa (mặc định `45`), chờ khi một bên mất kết nối lúc đang nói (`20`), chu kỳ quét cuộc gọi quá hạn (`5000` ms) |
| `PUSH_ENABLED`, `EXPO_ACCESS_TOKEN` | | Push qua Expo (chat, cuộc gọi đến / nhỡ). `PUSH_ENABLED=false` để tắt gửi push thật khi dev |
| `SERVER_PORT`, `LOG_LEVEL` | | Mặc định `8080`, `INFO` |

Lần chạy đầu Hibernate tự tạo bảng (`ddl-auto=update`). Dữ liệu mẫu xe: chạy
`backend/scripts/seed-test-vehicles.sql` trên Supabase SQL Editor. Môi trường chạy `JPA_DDL_AUTO=validate`
(production) phải tạo bảng gọi thoại trước khi deploy: `backend/scripts/create-call-sessions.sql`.

Test: `./mvnw test` (dùng H2 in-memory, không cần Supabase).

### 2.1 Gọi thoại trong app: TURN và cách thử

Gọi thoại dùng WebRTC (âm thanh đi thẳng giữa hai máy). Backend chỉ làm báo hiệu và cấp cấu hình STUN/TURN
(`GET /api/calls/ice-servers`, chỉ cho người đã đăng nhập). Không cần cấu hình gì thêm để thử khi hai máy
**cùng Wi-Fi** — STUN mặc định là đủ.

**Khi nào bắt buộc có TURN:** người dùng 4G thường nằm sau CGNAT nên không nối P2P trực tiếp được. Gọi 4G ↔ Wi-Fi
hoặc 4G ↔ 4G mà không có TURN sẽ báo "Mất kết nối" sau ~20 giây. Có hai cách:

1. **Tự dựng coturn** trên VPS có IP công khai (`/etc/turnserver.conf`):

   ```ini
   use-auth-secret
   static-auth-secret=<giá trị CALL_TURN_SECRET>
   realm=turn.<tên-miền>
   listening-port=3478
   tls-listening-port=443
   cert=/etc/letsencrypt/live/turn.<tên-miền>/fullchain.pem   # Let's Encrypt
   pkey=/etc/letsencrypt/live/turn.<tên-miền>/privkey.pem
   min-port=49152
   max-port=65535
   external-ip=<IP công khai>          # chỉ cần nếu VPS nằm sau NAT
   no-cli
   # Chặn relay vào mạng nội bộ
   denied-peer-ip=10.0.0.0-10.255.255.255
   denied-peer-ip=172.16.0.0-172.31.255.255
   denied-peer-ip=192.168.0.0-192.168.255.255
   ```

   Mở firewall: UDP/TCP 3478, TCP 443, UDP 49152–65535. Rồi đặt trong `backend/.env`:

   ```properties
   CALL_TURN_URLS=turn:turn.<tên-miền>:3478?transport=udp,turn:turn.<tên-miền>:3478?transport=tcp,turns:turn.<tên-miền>:443?transport=tcp
   CALL_TURN_SECRET=<cùng giá trị với static-auth-secret>
   ```

2. **Dùng dịch vụ** (Cloudflare TURN — 1.000 GB/tháng miễn phí rồi $0.05/GB; Metered...). Các dịch vụ này có API
   sinh credential riêng → thay phần sinh HMAC trong `CallServiceImpl.iceServers()` bằng lời gọi API của nhà cung
   cấp; hoặc dùng tài khoản cố định qua `CALL_TURN_USERNAME` / `CALL_TURN_CREDENTIAL` khi thử.

**Triển khai thật** cần thêm: backend chạy **HTTPS/WSS** sau reverse proxy (bản iOS phát hành chặn `http://`;
nginx cho `/ws/` cần `proxy_http_version 1.1`, `Upgrade`/`Connection "upgrade"`, `proxy_read_timeout 3600s`, và
**không ghi query string vào access log** vì token nằm ở `?token=`); backend chỉ **một instance**
([business-rules.md §10.6](business-rules.md)); đặt `PUSH_ENABLED=true`.

**Thử trên 2 máy thật** (iPhone Expo Go + Android Expo Go, cùng một Wi-Fi với máy chạy backend):

1. Máy A đăng nhập tài khoản khách, máy B đăng nhập tài khoản nhân viên (hoặc chủ gara). Tạo đơn, gara nhận, gán
   nhân viên — đơn phải ở trạng thái cho phép gọi (từ `ACCEPTED` đến `AWAITING_PAYMENT`).
2. Máy A mở màn theo dõi đơn → bấm **Gọi miễn phí** tới nhân viên; máy B hiện màn đổ chuông → **Nghe**. Lần đầu
   mỗi máy sẽ hỏi quyền micro.
3. Thử: nghe/nói hai chiều, tắt/bật mic, thu nhỏ rồi chuyển màn khác (cuộc gọi vẫn giữ), cúp từ từng bên, từ chối,
   để đổ chuông 45s thành cuộc gọi nhỡ.
4. Push "Cuộc gọi đến" cần app ở nền: **iPhone** nhận được trong Expo Go; **Android** trong Expo Go không nhận remote
   push — chỉ thử được khi đã có development build + Firebase (xem [business-rules.md §10.6](business-rules.md)).

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
| Gọi miễn phí: nghe máy xong báo "Mất kết nối" sau ~20s | Hai máy khác mạng (4G ↔ Wi-Fi) mà backend chưa cấu hình TURN — xem [§2.1](#21-gọi-thoại-trong-app-turn-và-cách-thử) |
| Bấm "Gọi miễn phí" báo "Mất kết nối máy chủ" | WebSocket `/ws/chat` chưa mở: sai URL backend, tường lửa chặn cổng 8080, hoặc token hết hạn |
| Gọi miễn phí: không nói / không nghe được | Chưa cấp quyền micro (Cài đặt → ứng dụng); trên iOS cần nối tai nghe hoặc tăng âm lượng loa |
