# Kiến trúc hệ thống — SRAS (Smart Roadside Assistance System)

> Nền tảng cứu hộ xe: khách gặp sự cố gửi yêu cầu → hệ thống điều phối tới gara phù hợp nhất (hoặc gara khách
> chọn) → gara nhận đơn, phân công nhân viên → nhân viên di chuyển (có dẫn đường), chẩn đoán, báo giá, sửa tại chỗ
> hoặc kéo xe → thanh toán (tiền mặt / payOS) → đánh giá. Tài liệu này mô tả kiến trúc tổng thể. Tài liệu liên quan:
> CSDL [database.md](database.md) · API [api.md](api.md) · luật nghiệp vụ
> [business-rules.md](business-rules.md) · cài đặt [setup.md](setup.md) · tiến độ [progress.md](progress.md).

Cập nhật: 2026-11-13

---

## 1. Tổng quan

SRAS là một **monorepo** gồm ba ứng dụng độc lập chia sẻ chung một backend REST + WebSocket:

| Thành phần | Thư mục | Công nghệ | Người dùng |
|------------|---------|-----------|------------|
| **Backend API** | `backend/` | Java 17, Spring Boot 3.2.5, Maven | — |
| **Mobile app** | `mobile/sras/` | Expo SDK 58 / React Native 0.88 / React 19.3, expo-router, TypeScript | Khách hàng, Chủ gara, Nhân viên gara |
| **Web admin** | `web/admin/` | React 19, Vite 8, Tailwind 4, TypeScript | Quản trị viên |

Bốn vai trò (`UserRole`): `CUSTOMER`, `GARAGE_OWNER`, `GARAGE_STAFF`, `ADMIN`. Ba vai trò đầu dùng
app mobile; `ADMIN` dùng web admin.

```
                         ┌──────────────────────────┐
     Mobile (Expo)       │                          │      Web Admin (React/Vite)
  ┌──────────────────┐   │                          │   ┌──────────────────────┐
  │ Customer         │   │                          │   │ Dashboard, Analytics,│
  │ Garage Owner     │◄──┤   Backend Spring Boot    ├──►│ Garages, Finance,    │
  │ Garage Staff     │   │   REST /api/**           │   │ Complaints, Ratings… │
  └────────┬─────────┘   │   WebSocket /ws/**       │   └──────────────────────┘
           │             │   @Scheduled jobs        │
           │ WS /ws/chat │                          │
           └────────────►│                          │
                         └────────┬─────────────────┘
                                  │
        ┌─────────────────────────┼──────────────────────────────────┐
        │                         │                                  │
   PostgreSQL               Dịch vụ ngoài                       Push
   (Supabase)    Clerk · eSMS · Gmail SMTP · Goong Maps    Expo Push Service
   (cả file ảnh  payOS (kênh thu + kênh chi) · Gemini AI
    trong bytea)
```

---

## 2. Backend (`backend/`)

### 2.1 Stack

- **Spring Boot 3.2.5** (theo [pom.xml](../backend/pom.xml)), **Java 17**, Maven wrapper (`mvnw`).
- Spring Web (MVC), Spring Data JPA, Spring Security, Spring WebSocket, Spring Mail, Actuator, Validation.
- Spring OAuth2 Resource Server — verify session JWT của Clerk (RS256) qua JWKS.
- `jjwt` 0.12.6 — phát hành & xác thực JWT nội bộ của hệ thống.
- Apache POI — nhập / xuất Excel danh mục dịch vụ.
- PostgreSQL (runtime, qua Supabase), H2 (test), Lombok.

### 2.2 Phân tầng (package `com.sras.backend`)

```
config/      SecurityConfig, WebSocketConfig, WebMvcConfig, DatabaseConstraintFixer,
             PayoutProperties, ActionOtpProperties, GeminiApiKeyProvider
security/    JwtService, JwtAuthenticationFilter, ClerkTokenVerifier, ClientIp
controller/  27 REST controller — lớp vào, trả ApiResponse<T>
service/     Giao diện nghiệp vụ + service/impl/ triển khai
             service/payout/  PayoutGateway (PayOSPayoutGateway | MockPayoutGateway), chữ ký payOS
             service/push/    PushService, ExpoPushClient
repository/  33 Spring Data JPA repository
entity/      36 entity (36 bảng) + BaseEntity / AppendOnlyEntity + entity/enums/ (35 enum, lưu VARCHAR)
dto/         dto/request (input + Bean Validation) · dto/response (output)
websocket/   ChatWebSocketHandler, UserWebSocketHandler, AuthHandshakeInterceptor, WsJson
exception/   GlobalExceptionHandler + các exception nghiệp vụ
resources/   application.yml, banks.json (BIN VietQR), knowledge/vehicle_fault_knowledge.json (kho kiến thức AI)
```

Luồng request điển hình: `Controller → Service (interface) → ServiceImpl → Repository → DB`,
map entity ↔ DTO, mọi phản hồi bọc trong `ApiResponse<T>` (`{ success, message, data }`).
`GlobalExceptionHandler` chuẩn hóa lỗi (400/401/404/...) về cùng khuôn `ApiResponse`.

### 2.3 Nhóm controller chính

| Base path | Vai trò | Chức năng |
|-----------|---------|-----------|
| `/api/auth` | công khai | Đăng ký/đăng nhập, refresh token, OTP, quên mật khẩu, Clerk (mobile), Google (web admin) |
| `/api/users`, `/api/customer-vehicles`, `/api/device-tokens` | người dùng | Quản lý người dùng, xe của khách, thiết bị nhận push |
| `/api/rescue-requests` | khách/gara/nhân viên | Vòng đời đơn: điều phối, cọc, báo giá, thanh toán, bom đơn, chia sẻ vị trí, chat |
| `/api/garages`, `/api/garages/me` | công khai/gara | Gara gần, hồ sơ công khai, đăng ký, vận hành, nhân viên, xe cứu hộ |
| `/api/garages/me/wallet`, `/bank-account`, `/api/banks` | chủ gara | Ví tín dụng / tiền mặt, nạp payOS, tài khoản nhận tiền, rút tiền + OTP |
| `/api/payments/payos` | khách / payOS | Link thanh toán đơn, link cọc, tra trạng thái, webhook |
| `/api/services`, `/api/service-categories` | công khai/admin | Danh mục & dịch vụ, nhập/xuất Excel |
| `/api/ratings`, `/api/complaints` | người dùng/admin | Đánh giá, khiếu nại, duyệt bồi hoàn bom đơn |
| `/api/ai` | công khai | Chẩn đoán sự cố, chat trợ lý, cảnh báo đường, chuyển giọng nói (Gemini) |
| `/api/notifications` | người dùng | Thông báo trong app |
| `/api/calls` | khách/gara/nhân viên | Gọi thoại trong app: báo hiệu WebRTC, vòng đời cuộc gọi, cấu hình STUN/TURN |
| `/api/upload`, `/uploads/**` | công khai | Upload & phục vụ file |
| `/api/admin/**` | `ADMIN` | Gara, kỹ thuật viên, giá cứu hộ, trọng số điều phối, thống kê 4 trụ cột + AI, lệnh rút, tài chính |

### 2.4 Tác vụ nền (`@Scheduled`)

| Job | Chu kỳ | Việc |
|-----|--------|------|
| `RescueRequestServiceImpl.processExpiredDispatchOffers` | 5s | Lời mời gara quá 90s → `TIMEOUT`, mời gara kế tiếp / đơn chọn gara → `DECLINED` |
| `CallSweeper` | `CALL_SWEEP_INTERVAL_MS` (5s) | Cuộc gọi đổ chuông quá hạn → `MISSED`, mất kết nối → `FAILED` |
| `WithdrawalPayoutReconciler` | `PAYOUT_RECONCILE_INTERVAL_MS` (5s) | Đối soát lệnh rút đang chạy với cổng chi, cắm cờ lệnh treo |

### 2.5 Cấu hình & biến môi trường

Cấu hình trong [application.yml](../backend/src/main/resources/application.yml); các biến đọc từ
`backend/.env` (dev, nạp qua `spring.config.import`) hoặc OS env (prod). Danh sách đầy đủ ở
[setup.md §1](setup.md). Nhóm chính: DB (Supabase pooler), JWT, Clerk, Mail, eSMS, push Expo, gọi thoại
(STUN/TURN), payOS kênh thu, payOS kênh chi + hạn mức rút, OTP thao tác, Goong, Gemini.

> ⚠️ Với `ddl-auto=update`, thêm cột **NOT NULL** mới vào bảng **đã có dữ liệu** sẽ không được
> tạo → mọi query bảng đó lỗi 500. Thêm cột nullable hoặc có `columnDefinition` kèm `default`.

Chạy: `./mvnw spring-boot:run` (Windows: `run.bat`) · test (H2): `./mvnw test` · đóng gói: `./mvnw clean package`.

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

### 3.2 Đăng nhập Google

- **Mobile (khách) — qua Clerk:** app đăng nhập Google bằng `@clerk/expo` + `@react-native-google-signin` → lấy
  **session token** Clerk. Backend `ClerkTokenVerifier` verify token (RS256) với JWKS → dùng `CLERK_SECRET_KEY` gọi
  Clerk Backend API lấy email đã xác thực → **phát JWT nội bộ** (token-exchange). User mới nhận "vé đăng ký tạm"
  để hoàn tất SĐT + OTP.
- **Web admin — Google Identity Services:** trình duyệt lấy thông tin Google (`useGoogleAuth`) rồi gửi email lên
  `POST /api/auth/google/check`; email đã có tài khoản thì nhận JWT + cookie refresh.
  > ⚠️ Backend **không** kiểm ID token Google ở endpoint này — chỉ tin email client gửi. Phải sửa trước khi deploy
  > (xem [progress.md §1](progress.md)).

### 3.3 OTP & SMS/Email

- Đăng ký / quên mật khẩu: OTP trong `otp_codes`, gửi SMS qua **eSMS.vn** (`ESmsServiceImpl`, `@Primary`;
  `MockSmsServiceImpl` cho dev) hoặc email qua **Gmail SMTP** (`EmailServiceImpl`).
- Thao tác tiền (đổi tài khoản nhận tiền, rút tiền): OTP **SMS** riêng trong `action_otps` — mã băm HMAC
  (`ACTION_OTP_SECRET`), gắn với nội dung thao tác, dùng một lần ([business-rules §7.4](business-rules.md)).
- Mật khẩu băm BCrypt.

### 3.4 Tiền thật

- **Kênh thu payOS** (khách thanh toán, nộp cọc, gara / nhân viên nạp ví): webhook công khai, kiểm chữ ký bằng
  `PAYOS_CHECKSUM_KEY` **và** hỏi lại payOS trước khi ghi nhận; idempotent theo `provider_order_code`.
- **Kênh chi payOS** (gara rút tiền): key riêng, `PayoutGateway` (`PAYOS` | `MOCK`), kiểm chữ ký response; khóa
  dòng gara (`@Lock FOR UPDATE`) khi tạo lệnh; kết quả mơ hồ không bao giờ tự hoàn tiền.
- Sổ cái `wallet_transactions` chỉ ghi thêm và là nguồn sự thật cho số dư rút được.

---

## 4. Realtime (WebSocket) & push

Đăng ký trong `WebSocketConfig` (`@EnableWebSocket`, WebSocket thuần — không STOMP):

- **`/ws/chat`** — chat 1-1 theo đơn giữa khách / chủ gara / nhân viên. `AuthHandshakeInterceptor`
  xác thực token ở handshake (`?token=`) và gắn `userId` vào session. `ChatWebSocketHandler` gom
  session theo `userId` (hỗ trợ nhiều thiết bị) và **chỉ đẩy** tin — client **gửi/lưu tin qua REST**
  (`POST /api/rescue-requests/{id}/messages`), handler bỏ qua tin đến. Lịch sử & danh bạ qua
  `GET .../conversations`, `.../chat-contacts`, `.../{id}/messages`.
- **`/ws/users`** — `UserWebSocketHandler` **broadcast** (không xác thực) báo danh sách người dùng vừa
  thay đổi (khóa/mở tài khoản...) để web admin tải lại. Không phải kênh thông báo riêng từng người.
- **Push** — `NotificationService.createNotification` lưu bảng `notifications` rồi `PushService.sendAfterCommit`
  gửi qua **Expo Push Service** tới các token trong `device_tokens`. App đăng ký token ở `PushNotificationManager`,
  điều hướng khi bấm thông báo bằng `src/notifications/route.ts`.

### Gọi thoại (WebRTC)

Gọi thoại miễn phí giữa hai người cùng một đơn, dùng lại chính kênh `/ws/chat`:

```
Người gọi A                    Backend                               Người nhận B
POST /api/calls ─────────────► RINGING ──WS CALL_INCOMING───────────► màn đổ chuông
                                 └─ B không có WS → push INCOMING_CALL (ttl 45s)
                               ◄──────────────────────── POST /{id}/accept
◄─ WS CALL_ACCEPTED ────────── ONGOING ──WS CALL_ACCEPTED───────────► (máy khác của B tắt chuông)
engine tạo OFFER
POST /{id}/signal OFFER ─────► chuyển tiếp ──WS CALL_SIGNAL─────────► engine B tạo ANSWER
◄─ WS CALL_SIGNAL ANSWER ───── chuyển tiếp ◄── POST /{id}/signal ANSWER
◄════════════════ âm thanh P2P WebRTC (STUN/TURN) ═════════════════►
POST /{id}/end ──────────────► ENDED ──WS CALL_ENDED───────────────► đóng
```

- **Báo hiệu (signaling):** client → server bằng **REST**, server → client bằng **`/ws/chat`** (sự kiện `CALL_*`).
  Handler bỏ qua mọi tin client gửi lên (kể cả heartbeat `PING`).
  `CallServiceImpl` đổi trạng thái dưới khóa dòng (`PESSIMISTIC_WRITE`) và chỉ đẩy `CALL_ACCEPTED` / `CALL_ENDED`
  **sau khi commit**; payload dựng tay trong transaction (xem `WsJson`).
- **Âm thanh:** WebRTC P2P (Opus, DTLS-SRTP) chạy trong một **WebView ẩn** trên mobile — không cần build native.
  ICE candidate được gom trong engine rồi gửi cùng SDP nên mỗi cuộc gọi chỉ cần 2 lần `POST /signal`.
- **NAT:** STUN mặc định (Google + Cloudflare); TURN cấu hình bằng `CALL_TURN_*` (credential ngắn hạn HMAC-SHA1
  cho từng người dùng, `GET /api/calls/ice-servers`). Production **bắt buộc** có TURN (xem [setup.md](setup.md)).
- **Dọn dẹp:** `CallSweeper` (mỗi 5s) đổi cuộc gọi đổ chuông quá 45s sang `MISSED`, cuộc gọi đang nói mà một bên
  mất WebSocket quá 20s sang `FAILED`; lúc server khởi động đóng mọi cuộc gọi còn sót. Vì trạng thái online của
  WebSocket nằm trong RAM nên backend chỉ chạy **một** instance.
- **Push:** `INCOMING_CALL` (khi người nhận không có WS) và `MISSED_CALL` qua Expo Push — không lưu `notifications`.
- Luật nghiệp vụ & giới hạn: [business-rules.md §10](business-rules.md); endpoint: [api.md §9](api.md).

### Trạng thái đơn & vị trí — polling REST

Trạng thái đơn cứu hộ **không đẩy qua WebSocket** — client **polling** REST: khách poll
`GET /api/rescue-requests/{id}` (~4s). Phía gara, `/garage/offers` + `/garage/active` được gọi định kỳ
(~5s) qua **một** `GarageOrdersContext` duy nhất (popup nhận cuốc và màn Đơn hàng dùng chung dữ liệu),
nối tiếp bằng `setTimeout` (không chồng request) và **dừng khi app xuống nền**. Lịch sử, nhân viên, xe
chỉ tải khi vào màn, khi kéo làm mới hoặc khi có đơn rời danh sách đang xử lý; dashboard gara (~8s)
chỉ gọi khi tab đang được xem.

Vị trí xe cứu hộ: app nhân viên đẩy GPS (`StaffLocationPusher`, `POST /{id}/location`); backend ghi đè thẳng
`rescue_requests.rescuer_lat/lng/location_at` (không ghi `location_tracks` — bảng này hiện không dùng). App chủ gara
không đẩy GPS. Khách có thể **chia sẻ vị trí** (`POST /{id}/customer-location`, chỉ khi `ASSIGNED`/`EN_ROUTE`);
backend tính điểm hẹn `meet_lat/lng` để khách và nhân viên cùng một điểm đến.

### Dẫn đường (mobile `src/navigation/`)

- Nhân viên ở `EN_ROUTE` và `TOWING` có màn dẫn đường kiểu Google Maps: `useRescueNavigation` (GPS + camera bám
  hướng đi) trên `useRouteTracker` (tuyến Goong Directions + bám tuyến). Đích do `useRescueTarget` chọn theo trạng
  thái (`TOWING` → gara, còn lại → điểm hẹn / điểm đón).
- Khách xem cùng tuyến ở `rescue-tracking.tsx` (camera `watch` giữ khung phần tuyến còn lại), vị trí xe lấy từ poll.
- Bản đồ dựng bằng goong-js trong WebView (`navMapHtml.ts`). Chưa có banner hướng rẽ, giọng nói, chạy nền.

---

## 5. Lưu trữ file

`FileUploadController` + `FileStorageServiceImpl` lưu **nội dung file thẳng vào PostgreSQL** (`stored_files.data`,
bytea) kèm metadata; phục vụ ở `/uploads/{fileName}` (`FileDisplayController`, công khai). Giới hạn 20MB/file.
Backend trả URL tương đối (`/uploads/..`); client ghép về tuyệt đối qua `resolveFileUrl` /
`API_ORIGIN` ([axiosClient.ts](../mobile/sras/src/api/axiosClient.ts)).

---

## 6. Vòng đời đơn cứu hộ (state machine)

`rescue_requests.status` có 18 trạng thái ([RescueStatus.java](../backend/src/main/java/com/sras/backend/entity/enums/RescueStatus.java)):

```
SEARCHING → PENDING_GARAGE → ACCEPTED → ASSIGNED → EN_ROUTE → ARRIVED → DIAGNOSED
          → REPAIRING_ONSITE ─────────────────────────────┐
          → TOWING → TOW_TO_GARAGE ───────────────────────┼─► COMPLETED → PAID
          → (khách từ chối báo giá) AWAITING_PAYMENT ─────┘            └─► (RATED: chưa có luồng)

Nhánh rẽ: NO_GARAGE_FOUND (không tìm được gara) · DECLINED (gara khách chọn từ chối / quá 90s) ·
          CANCELLED (khách hủy hoặc gara báo bom đơn) · DRAFT (không dùng)
```

Điểm điều khiển (endpoint `/api/rescue-requests`): `POST /` tạo đơn (khẩn cấp hoặc `garageId`) → (nộp cọc nếu bị
bắt) → điều phối chấm điểm → gara `POST /{id}/accept` | `/decline` → `POST /{id}/assign-staff` → nhân viên
`POST /{id}/status`, `/location` → `POST /{id}/quote` → khách `/accept-quote` | `/decline-quote` → (`/add-item`) →
thanh toán (`/select-cash` + `/confirm-cash` hoặc payOS) → đánh giá (`/api/ratings`). Lịch sử trạng thái ghi
`rescue_status_history`. Chi tiết luật: [business-rules.md](business-rules.md) §2–§6, §11.

Entity liên quan: `RescueRequest`, `DispatchOffer`, `DispatchConfig`, `RescueRequestItem` (báo giá),
`RescueRequestPhoto`, `RescueStatusHistory`, `Payment`, `Complaint`, `Rating`, `RepairTicket` (chưa dùng).

---

## 7. Thanh toán & ví

- **Thanh toán đơn:** tiền mặt (`/select-cash` → `/confirm-cash`), payOS QR (`/api/payments/payos/create-link` +
  webhook), hoặc mock `/pay` (chỉ dev, `PAYMENT_MOCK_TRANSFER_ENABLED`).
- **Ví:** gara có ví **tín dụng** (ký quỹ, ≥ 500.000đ mới nhận đơn, bị trừ hoa hồng) và ví **tiền mặt** (tiền khách
  trả qua payOS, rút được); nhân viên có ví riêng; sàn có `system_wallets`; khách có cọc bảo lưu.
- **Rút tiền:** tự động qua kênh chi payOS, OTP SMS, hạn mức, khóa 24h sau khi đổi STK / SĐT / email, job đối soát.
- Chi tiết: [business-rules.md §6–§7](business-rules.md).

---

## 8. Mobile app (`mobile/sras/`)

- **Expo SDK 58 / React Native 0.88 / React 19.3**, **expo-router** (file-based routing), TypeScript, style bằng
  `StyleSheet.create`, icon `lucide-react-native`.
- `src/app/` theo vai trò: `auth/`, `customer/`, `garage-owner/`, `garage-staff/`; màn dùng chung `chat.tsx` ở gốc.
  Mỗi vai trò có `_layout.tsx` với tab bar tự vẽ.
- `src/api/` — client Axios + module theo domain (`authApi`, `rescueApi`, `garageApi`, `chatApi`, `callApi`,
  `customerVehicleApi`, `notificationApi`, `paymentApi`, `garageWalletApi`, `staffWalletApi`, `withdrawalApi`,
  `ratingApi`, `complaintApi`, `aiApi`, `goongApi`). `axiosClient` tự dò base URL (IP máy chạy Metro, `10.0.2.2`
  cho Android emulator...) và tự refresh token.
- `src/realtime/` — `chatSocket.ts` (`/ws/chat`, heartbeat 25s), `callManager.ts` + `callEngineHtml.ts` (gọi thoại).
- `src/navigation/` — dẫn đường (§4). `src/notifications/` — đăng ký push + điều hướng khi bấm.
- `src/contexts/` — `AuthContext`, `GarageOrdersContext` (poll đơn gara), `GarageSettingsContext`.
- `src/components/` — modal dùng chung (nhận cuốc, gán nhân viên, đánh giá, khiếu nại, cảnh báo hệ thống), `call/`,
  `withdraw/` (UI rút tiền), `FloatingAiChatBubble`, `NearbyGaragesMap`, `LocationPickerModal`.
- **Bản đồ**: mọi màn (chọn vị trí, gara gần, theo dõi, dẫn đường) dùng **goong-js trong WebView** + Goong
  autocomplete / Directions; key trong `.env` (`EXPO_PUBLIC_GOONG_*`).
- **Gọi thoại:** `callManager` (singleton, đọc bằng `useCallState()`), `CallOverlay` (gắn một lần ở `_layout.tsx`
  gốc), `CallEngine` (WebView ẩn chạy WebRTC); chuông bằng `expo-audio`, giữ màn sáng bằng `expo-keep-awake`.

> Expo SDK 58 có breaking changes — tra tài liệu `https://docs.expo.dev/versions/v58.0.0/` trước khi dùng API Expo
> (quy ước chi tiết ở [mobile/sras/CLAUDE.md](../mobile/sras/CLAUDE.md)).

---

## 9. Web admin (`web/admin/`)

- **React 19 + Vite 8 + Tailwind 4**, `react-router-dom` 7, `recharts` (biểu đồ), Axios, `lucide-react`.
- `src/pages/admin/` — Dashboard, Garages, Technicians, Finance, Services, Reports (thống kê 4 trụ cột + nhận định
  AI), Complaints, Ratings, Users, System Settings (giá cứu hộ, trọng số điều phối); `Login.tsx` đăng nhập Google.
- `src/components/analytics/` — thẻ KPI, biểu đồ, bản đồ điểm nóng sự cố (Goong); `components/dashboard/` — bản đồ
  gara đối tác, `IncidentDrawer`; `components/layout/` — DashboardLayout, Sidebar, Header (thông báo).
- `src/api/` — `axiosClient` + module `analyticsApi`, `complaintApi`, `dispatchConfigApi`, `pricingConfigApi`,
  `ratingApi`; `src/models/` — kiểu dữ liệu mirror entity backend.
- Chỉ phục vụ vai trò `ADMIN` (backend chặn `/api/admin/**` bằng `hasRole('ADMIN')`).

---

## 10. Dữ liệu & tích hợp ngoài

- **PostgreSQL trên Supabase** — 36 bảng thực tế ([database.md](database.md)); bản thiết kế 29 bảng ở
  [database.dbml](database.dbml), dán vào dbdiagram.io để xem. Quy ước: mọi bảng nghiệp vụ có
  `id/created_at/updated_at/is_deleted` (soft delete, cấm hard delete); bảng chỉ-ghi-thêm (`rescue_status_history`,
  `location_tracks`, `wallet_transactions`, `audit_logs`, `ai_messages`, `chat_messages`) không có
  `updated_at/is_deleted`. Enum lưu **VARCHAR** (cấm native enum). Tiền: `BIGINT` VNĐ; thời điểm: `TIMESTAMPTZ`.
- **Clerk** — xác thực Google cho khách (§3.2).
- **eSMS.vn** — SMS/OTP. **Gmail SMTP** — email/OTP.
- **Goong Maps** — bản đồ, autocomplete, reverse geocode (mobile + web admin); **Goong Direction** ở backend tính
  km đường bộ cho điều phối và phí ①.
- **payOS** — kênh thu (thanh toán đơn, cọc, nạp ví) và kênh chi (rút tiền gara).
- **Gemini** — chẩn đoán, chat trợ lý, nhận định thống kê admin (nhiều key, tự xoay khi hết quota).
- **Expo Push Service** — thông báo đẩy.

---

## 11. Tổng kết luồng chính (end-to-end)

1. Khách đăng nhập (mật khẩu + OTP, hoặc Google qua Clerk) → nhận JWT nội bộ.
2. Khách chọn vị trí (Goong), mô tả sự cố (có thể hỏi trợ lý AI), chọn gara đích danh hoặc gửi cứu hộ khẩn cấp
   `POST /api/rescue-requests`. Khách từng bom đơn phải nộp cọc 50.000đ trước.
3. Backend chấm điểm gara (cự ly đường bộ, tải việc, sao, tỉ lệ nhận) và mời lần lượt từng gara (15→50 km, 90s mỗi
   lời mời); gara nhận lời mời bằng polling (popup "cuốc cứu hộ mới"). Chi tiết: [business-rules.md §2](business-rules.md).
4. Gara `accept` → phân công nhân viên + xe (`assign-staff`).
5. Nhân viên xuất phát (dẫn đường), đẩy vị trí; khách theo dõi trên bản đồ, có thể chia sẻ vị trí của mình.
6. Nhân viên chẩn đoán, báo giá (sửa tại chỗ hoặc đề xuất kéo xe); khách duyệt hoặc từ chối.
7. Sửa tại chỗ / kéo xe về gara (bổ sung hạng mục nếu phát sinh) → `COMPLETED`.
8. Thanh toán (tiền mặt hoặc payOS) → `PAID`, tiền chia vào ví gara / ví hệ thống → khách đánh giá.
9. Suốt quá trình: chat + gọi thoại miễn phí qua `/ws/chat`; thông báo trong app + push.
10. Admin giám sát & quản trị qua web admin: duyệt gara, thống kê, khiếu nại / bồi hoàn, lệnh rút, cấu hình.
