# Kiến trúc hệ thống — SRAS (Smart Roadside Assistance System)

> Nền tảng cứu hộ xe: khách gặp sự cố gửi yêu cầu → hệ thống điều phối tới gara gần nhất →
> gara nhận đơn, phân công nhân viên → nhân viên di chuyển, chẩn đoán, báo giá, sửa tại chỗ
> hoặc kéo xe → thanh toán → đánh giá. Tài liệu này mô tả kiến trúc tổng thể. Tài liệu liên quan:
> CSDL [database.md](database.md) · API [api.md](api.md) · luật nghiệp vụ
> [business-rules.md](business-rules.md) · cài đặt [setup.md](setup.md) · tiến độ [progress.md](progress.md).

Cập nhật: 2026-10-12

---

## 1. Tổng quan

SRAS là một **monorepo** gồm ba ứng dụng độc lập chia sẻ chung một backend REST + WebSocket:

| Thành phần | Thư mục | Công nghệ | Người dùng |
|------------|---------|-----------|------------|
| **Backend API** | `backend/` | Java 17, Spring Boot 3.2.5, Maven | — |
| **Mobile app** | `mobile/sras/` | Expo 57 / React Native 0.86, expo-router, TypeScript | Khách hàng, Chủ gara, Nhân viên gara |
| **Web admin** | `web/admin/` | React 19, Vite 8, Tailwind 4, TypeScript | Quản trị viên |

Bốn vai trò (`UserRole`): `CUSTOMER`, `GARAGE_OWNER`, `GARAGE_STAFF`, `ADMIN`. Ba vai trò đầu dùng
app mobile; `ADMIN` dùng web admin.

```
                         ┌──────────────────────────┐
     Mobile (Expo)       │                          │      Web Admin (React/Vite)
  ┌──────────────────┐   │                          │   ┌──────────────────────┐
  │ Customer         │   │                          │   │ Dashboard, Users,    │
  │ Garage Owner     │◄──┤   Backend Spring Boot    ├──►│ Garages, Services,   │
  │ Garage Staff     │   │   REST /api/**           │   │ Technicians, Settings│
  └────────┬─────────┘   │   WebSocket /ws/**       │   └──────────────────────┘
           │             │                          │
           │ WS /ws/chat │                          │
           └────────────►│                          │
                         └────────┬─────────────────┘
                                  │
             ┌────────────────────┼─────────────────────────────┐
             │                    │                             │
        PostgreSQL           Dịch vụ ngoài                  Lưu trữ file
        (Supabase)      Clerk · eSMS · Gmail SMTP        uploads/ (local, /uploads/**)
                        Goong Maps · payOS (mock)
```

---

## 2. Backend (`backend/`)

### 2.1 Stack

- **Spring Boot 3.2.5** (theo [pom.xml](../backend/pom.xml)), **Java 17**, Maven wrapper (`mvnw`).
  > Ghi chú: `backend/README.md` ghi "Spring Boot 4.1.1" nhưng phiên bản build thực tế trong
  > `pom.xml` là 3.2.5 — bám theo `pom.xml`.
- Spring Web (MVC), Spring Data JPA, Spring Security, Spring WebSocket, Spring Mail, Actuator.
- Spring OAuth2 Resource Server — verify session JWT của Clerk (RS256) qua JWKS.
- `jjwt` 0.12.6 — phát hành & xác thực JWT nội bộ của hệ thống.
- PostgreSQL (runtime, qua Supabase), H2 (test), Lombok, Bean Validation.

### 2.2 Phân tầng (package `com.sras.backend`)

```
config/      SecurityConfig, WebSocketConfig, WebMvcConfig, DatabaseConstraintFixer
security/    JwtService, JwtAuthenticationFilter, ClerkTokenVerifier
controller/  REST controllers (~17) — lớp vào, trả ApiResponse<T>
service/     Giao diện nghiệp vụ + service/impl/ triển khai
repository/  Spring Data JPA repositories (~26)
entity/      JPA entities (~38) + entity/enums/ (~40 enum lưu dạng VARCHAR)
dto/         dto/request (input + Bean Validation) · dto/response (output)
websocket/   ChatWebSocketHandler, UserWebSocketHandler, AuthHandshakeInterceptor
exception/   GlobalExceptionHandler + các exception nghiệp vụ
```

Luồng request điển hình: `Controller → Service (interface) → ServiceImpl → Repository → DB`,
map entity ↔ DTO, mọi phản hồi bọc trong `ApiResponse<T>` (`{ success, message, data }`).
`GlobalExceptionHandler` chuẩn hóa lỗi (400/401/404/...) về cùng khuôn `ApiResponse`.

### 2.3 Nhóm controller chính

| Base path | Vai trò | Chức năng |
|-----------|---------|-----------|
| `/api/auth` | công khai | Đăng ký/đăng nhập, refresh token, OTP, quên mật khẩu, Clerk/Google |
| `/api/users`, `/api/customer-vehicles` | người dùng | Hồ sơ, xe của khách |
| `/api/rescue-requests` | khách/gara/nhân viên | Vòng đời đơn cứu hộ + báo giá + thanh toán + chat |
| `/api/garages`, `/api/garages/me` | gara | Đăng ký gara, hồ sơ, vận hành, nhân viên |
| `/api/services`, `/api/service-categories` | công khai/admin | Danh mục & dịch vụ |
| `/api/notifications` | người dùng | Thông báo trong app |
| `/api/upload`, `/uploads/**` | công khai | Upload & phục vụ file tĩnh |
| `/api/admin/garages`, `/api/admin/technicians`, `/api/admin/pricing-config` | `ADMIN` | Quản trị |

### 2.4 Cấu hình & biến môi trường

Cấu hình trong [application.yml](../backend/src/main/resources/application.yml); các biến đọc từ
`backend/.env` (dev) hoặc OS env (prod), đều có default cho dev:

- **DB**: `DB_URL` / `DB_USERNAME` / `DB_PASSWORD`; HikariCP pool (`DB_POOL_MAX=15`) tinh chỉnh cho
  Supabase pooler. `JPA_DDL_AUTO=update` (mặc định).
  > ⚠️ Với `ddl-auto=update`, thêm cột **NOT NULL** mới vào bảng **đã có dữ liệu** sẽ không được
  > tạo → mọi query bảng đó lỗi 500. Thêm cột nullable hoặc migrate thủ công.
- **JWT**: `JWT_SECRET` (base64), access `JWT_EXPIRATION_MS=900000` (15′), refresh
  `JWT_REFRESH_EXPIRATION_MS=604800000` (7 ngày), vé đăng ký tạm `JWT_REGISTRATION_TICKET_MS`.
- **Clerk**: `CLERK_ISSUER`, `CLERK_JWKS_URI`, `CLERK_SECRET_KEY`, `CLERK_API_BASE_URL`.
- **Mail**: Gmail SMTP (`MAIL_HOST/PORT/USERNAME/PASSWORD`).
- **eSMS.vn**: `ESMS_API_KEY/SECRET_KEY/BRANDNAME`, `ESMS_SANDBOX`.

Chạy: `./mvnw spring-boot:run` · test (H2): `./mvnw test` · đóng gói: `./mvnw clean package`.

---

## 3. Bảo mật & xác thực

### 3.1 JWT stateless nội bộ

`SecurityConfig` đặt `SessionCreationPolicy.STATELESS`, CSRF disabled, CORS mở (allowed-origin
patterns `*`, allow-credentials). `JwtAuthenticationFilter` chạy trước
`UsernamePasswordAuthenticationFilter`, đọc `Authorization: Bearer <token>`, xác thực bằng
`JwtService` và gắn `Authentication` vào context. Phân quyền endpoint qua danh sách
`PUBLIC_ENDPOINTS` + `@EnableMethodSecurity` (`@PreAuthorize("hasRole('ADMIN')")` cho khu admin).

Cặp **access token (15′) + refresh token (7 ngày)**; refresh token lưu DB (`refresh_tokens`,
CASCADE theo user). Client mobile tự refresh khi gặp 401/403 (xem [axiosClient.ts](../mobile/sras/src/api/axiosClient.ts)):
hàng đợi request lỗi, gọi `/api/auth/refresh`, phát lại — trừ các endpoint `/auth/*`.

### 3.2 Đăng nhập Google qua Clerk (khách hàng)

App mobile đăng nhập Google qua Clerk SDK → lấy **session token** của Clerk. Backend:
`ClerkTokenVerifier` verify token (RS256) với JWKS của Clerk → dùng `CLERK_SECRET_KEY` gọi Clerk
Backend API (`ClerkUserApiClient`) lấy email đã xác thực → **phát JWT nội bộ của riêng hệ thống**
(token-exchange). Nghĩa là Clerk chỉ dùng để xác thực danh tính Google; mọi API nghiệp vụ vẫn
dùng JWT nội bộ. Nếu là user mới, backend cấp "vé đăng ký tạm" để hoàn tất SĐT.

### 3.3 OTP & SMS/Email

Đăng ký/quên mật khẩu xác minh qua OTP (`otp_codes`). SMS gửi qua **eSMS.vn** (`ESmsServiceImpl`,
có `MockSmsServiceImpl` cho dev); email qua **Gmail SMTP** (`EmailServiceImpl`). Mật khẩu băm bằng
BCrypt.

---

## 4. Realtime (WebSocket)

Đăng ký trong `WebSocketConfig` (`@EnableWebSocket`, WebSocket thuần — không STOMP):

- **`/ws/chat`** — chat 1-1 theo đơn giữa khách / chủ gara / nhân viên. `AuthHandshakeInterceptor`
  xác thực token ở handshake (`?token=`) và gắn `userId` vào session. `ChatWebSocketHandler` gom
  session theo `userId` (hỗ trợ nhiều thiết bị) và **chỉ đẩy** tin — client **gửi/lưu tin qua REST**
  (`POST /api/rescue-requests/{id}/messages`), handler bỏ qua tin đến. Lịch sử & danh bạ qua
  `GET .../conversations`, `.../chat-contacts`, `.../{id}/messages`.
- **`/ws/users`** — `UserWebSocketHandler` **broadcast** (không xác thực) báo danh sách người dùng vừa
  thay đổi (khóa/mở tài khoản...) để web admin tải lại. Không phải kênh thông báo riêng từng người.

Trạng thái đơn cứu hộ **không đẩy qua WebSocket** — client **polling** REST: khách poll
`GET /api/rescue-requests/{id}` (~4s). Phía gara, `/garage/offers` + `/garage/active` được gọi định kỳ
(~5s) qua **một** `GarageOrdersContext` duy nhất (popup nhận cuốc và màn Đơn hàng dùng chung dữ liệu),
nối tiếp bằng `setTimeout` (không chồng request) và **dừng khi app xuống nền**. Lịch sử, nhân viên, xe
chỉ tải khi vào màn, khi kéo làm mới hoặc khi có đơn rời danh sách đang xử lý; dashboard gara (~8s)
chỉ gọi khi tab đang được xem.

Vị trí cứu hộ được gửi qua REST (`POST /api/rescue-requests/{id}/location`), lưu `location_tracks`
(bảng chỉ-ghi-thêm) để khách theo dõi realtime trên bản đồ. Vị trí xe cứu hộ **chỉ do nhân viên đẩy
lên** (`StaffLocationPusher` ở app nhân viên); app chủ gara không đẩy GPS.

---

## 5. Lưu trữ file

`FileUploadController` + `FileStorageServiceImpl` lưu file lên đĩa local, metadata trong
`stored_files`; phục vụ tĩnh ở `/uploads/**` (map bởi `WebMvcConfig`, công khai). Giới hạn 20MB/file.
Backend trả URL tương đối (`/uploads/..`); client ghép về tuyệt đối qua `resolveFileUrl` /
`API_ORIGIN` ([axiosClient.ts](../mobile/sras/src/api/axiosClient.ts)).

---

## 6. Vòng đời đơn cứu hộ (state machine)

`rescue_requests.status` có 17 trạng thái ([RescueStatus.java](../backend/src/main/java/com/sras/backend/entity/enums/RescueStatus.java)):

```
DRAFT → SEARCHING → PENDING_GARAGE → ACCEPTED → ASSIGNED → EN_ROUTE → ARRIVED
      → DIAGNOSED → (REPAIRING_ONSITE | TOWING) → COMPLETED → AWAITING_PAYMENT → PAID → RATED

Nhánh rẽ: NO_GARAGE_FOUND (không tìm được gara) · DECLINED (gara từ chối) · CANCELLED (hủy)
```

Điểm điều khiển (endpoint `/api/rescue-requests`): `POST /` tạo đơn → điều phối → gara
`POST /{id}/accept` | `/decline` → `POST /{id}/assign-staff` → nhân viên cập nhật
`POST /{id}/status`, `POST /{id}/location` → `POST /{id}/quote` báo giá (khách duyệt từng khoản
qua `rescue_request_items`) → thanh toán → đánh giá. Lịch sử trạng thái ghi `rescue_status_history`.

Entity liên quan: `RescueRequest`, `RescueRequestItem` (báo giá), `RescueRequestPhoto`,
`DispatchOffer` (chào đơn tới gara), `RepairTicket` (sửa tại xưởng), `Rating`.

---

## 7. Thanh toán

Hai luồng trong `RescueRequestController` → đưa đơn về `PAID`:

- `POST /{id}/confirm-cash` — tiền mặt, gara/nhân viên xác nhận đã thu.
- `POST /{id}/pay` — chuyển khoản (mock payOS).

Mô hình dữ liệu dự kiến có ví gara hai số dư (credit/cash), khấu trừ thuế, luồng rút tiền
(`wallet_transactions`, `withdrawal_requests`, `payments`) — xem [database.dbml](database.dbml).

---

## 8. Mobile app (`mobile/sras/`)

- **Expo 57 / React Native 0.86**, **expo-router** (file-based routing), TypeScript, style bằng
  `StyleSheet.create`, icon `lucide-react-native`.
- Cấu trúc `src/app/` theo vai trò: `auth/`, `customer/`, `garage-owner/`, `garage-staff/`, `chat.tsx`.
- `src/api/` — client Axios + module theo domain (`authApi`, `rescueApi`, `garageApi`,
  `chatApi`, `customerVehicleApi`, `goongApi`). `axiosClient` tự dò base URL (IP máy chạy Metro,
  `10.0.2.2` cho Android emulator...) và tự refresh token.
- `src/realtime/chatSocket.ts` — kết nối `/ws/chat`.
- `src/contexts/` — `AuthContext`, `GarageSettingsContext`. `src/models/` — kiểu dữ liệu khớp entity backend.
- **Bản đồ**: màn chọn vị trí dùng **Goong** (goong-js + autocomplete, key trong `.env`) trong
  WebView; tracking realtime dùng Leaflet/Carto. Đăng nhập Google qua `@clerk/expo` +
  `@react-native-google-signin`.

> Xem [mobile/sras/AGENTS.md](../mobile/sras/AGENTS.md): Expo 57 có breaking changes — tra tài liệu
> versioned `https://docs.expo.dev/versions/v57.0.0/` trước khi viết code.

---

## 9. Web admin (`web/admin/`)

- **React 19 + Vite 8 + Tailwind 4**, `react-router-dom` 7, `recharts` (biểu đồ), Axios.
- `src/pages/admin/` — Dashboard, Users, Garages, Services, Technicians, System Settings;
  `Login.tsx` dùng Google (`useGoogleAuth`) + `AuthContext`.
- `src/components/layout/` — DashboardLayout, Sidebar, Header; `IncidentDrawer` xem chi tiết sự cố.
- `src/models/` — kiểu dữ liệu dùng chung với backend; `src/api/` — Axios client (cookie/JWT).
- Chỉ phục vụ vai trò `ADMIN` (backend chặn `/api/admin/**` bằng `hasRole('ADMIN')`).

---

## 10. Dữ liệu & tích hợp ngoài

- **PostgreSQL trên Supabase** — 28 bảng (lược đồ: [database.dbml](database.dbml), dán vào
  dbdiagram.io để xem). Quy ước: mọi bảng nghiệp vụ có `id/created_at/updated_at/is_deleted`
  (soft delete, cấm hard delete); bảng chỉ-ghi-thêm (`rescue_status_history`, `location_tracks`,
  `wallet_transactions`, `audit_logs`, `ai_messages`) không có `updated_at/is_deleted`. Enum lưu
  **VARCHAR** (cấm native enum). Tiền: `BIGINT` VNĐ; thời điểm: `TIMESTAMPTZ`.
- **Clerk** — xác thực Google (token-exchange, §3.2).
- **eSMS.vn** — gửi SMS/OTP. **Gmail SMTP** — email/OTP.
- **Goong Maps** — autocomplete & bản đồ (mobile).
- **payOS** — thanh toán/chi hộ (hiện mock).

---

## 11. Tổng kết luồng chính (end-to-end)

1. Khách đăng nhập (mật khẩu+OTP, hoặc Google qua Clerk) → nhận JWT nội bộ.
2. Khách chọn vị trí (Goong), mô tả sự cố, tạo đơn `POST /api/rescue-requests`.
3. Backend điều phối tuần tự, mời gara gần nhất đủ điều kiện (`DispatchOffer`, 15→50 km); gara nhận
   lời mời bằng polling (popup "cuốc cứu hộ mới"). Chi tiết: [business-rules.md §2](business-rules.md).
4. Gara `accept` → phân công nhân viên (`assign-staff`).
5. Nhân viên cập nhật trạng thái + vị trí; khách theo dõi realtime (`location_tracks`).
6. Nhân viên chẩn đoán, báo giá từng khoản (`quote` / `rescue_request_items`); khách duyệt.
7. Sửa tại chỗ hoặc kéo xe → `COMPLETED`.
8. Thanh toán (`confirm-cash` / `pay`) → `PAID` → đánh giá → `RATED`.
9. Suốt quá trình: chat 1-1 qua `/ws/chat` + REST; thông báo qua `/api/notifications`.
10. Admin giám sát & quản trị qua web admin (`/api/admin/**`).
