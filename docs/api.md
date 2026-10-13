# API — SRAS Backend

> Danh sách REST endpoint + WebSocket của backend (`backend/src/main/java/com/sras/backend/controller/`).
> Đổi/ thêm endpoint → cập nhật file này. Luật nghiệp vụ chi tiết: [business-rules.md](business-rules.md).

Cập nhật: 2026-10-13 · Base URL dev: `http://localhost:8080`

---

## 1. Quy ước chung

### Xác thực

- Header: `Authorization: Bearer <accessToken>` (JWT nội bộ, hạn 15′).
- Hết hạn → `POST /api/auth/refresh` lấy cặp token mới (refresh token hạn 7 ngày). Client mobile/web
  tự xử lý trong `axiosClient`.
- Endpoint **công khai** (`PUBLIC_ENDPOINTS` trong `SecurityConfig`): `/api/auth/**`, `/api/users/**`,
  `/api/services/**`, `/api/service-categories/**`, `/api/ping`, `/ws/**`, `/actuator/health|info`,
  `/uploads/**`, `/api/upload/**`. Mọi endpoint khác cần đăng nhập.
- Khu admin `/api/admin/**`: `@PreAuthorize("hasRole('ADMIN')")`.

> ⚠️ **Lỗ hổng cần sửa:** `/api/users/**` (quản lý người dùng, khóa tài khoản, audit log) và các
> `POST/PUT/DELETE` của `/api/services/**`, `/api/service-categories/**` đang **công khai, không cần
> token**. Nên chuyển sang `/api/admin/**` hoặc thêm `@PreAuthorize("hasRole('ADMIN')")`.

### Định dạng phản hồi

Mọi endpoint trả `ApiResponse<T>`:

```json
{ "success": true, "message": "Thông báo (tiếng Việt, có thể null)", "data": { } }
```

Lỗi (`GlobalExceptionHandler`): `success=false`, `message` mô tả lỗi, HTTP status tương ứng —
`400` (BadRequestException / validation), `401` (chưa đăng nhập / token hết hạn), `403` (sai quyền),
`404` (ResourceNotFoundException).

Danh sách phân trang trả `Page<T>` của Spring: `content`, `totalElements`, `totalPages`, `number`, `size`.
Tham số chung: `page` (từ 0), `size`.

### Kiểu dữ liệu

Tiền: số nguyên VNĐ · Thời điểm: ISO-8601 có offset · Tọa độ: `lat`, `lng` (số thực) ·
Enum: chuỗi in hoa (xem [database.md §4](database.md)).

---

## 2. Xác thực — `/api/auth` (công khai)

| Method | Path | Body / Params | Mô tả |
|--------|------|---------------|-------|
| POST | `/register` | `fullName, phone, email, password, role, vehicleBrand?, vehicleModel?` | Đăng ký, gửi OTP |
| POST | `/verify-otp` | `VerifyOtpRequest` | Xác minh OTP đăng ký → trả token |
| POST | `/resend-otp` | `ResendOtpRequest` | Gửi lại OTP |
| POST | `/login` | `phone | email, password, rememberMe?` | Đăng nhập → `AuthResponse` (accessToken, refreshToken, user) |
| POST | `/refresh` | body `refreshToken` hoặc query `token` | Cấp lại token |
| POST | `/logout` | `refreshToken` | Thu hồi refresh token |
| POST | `/clerk/exchange` | `ClerkExchangeRequest` (session token Clerk) | Đăng nhập Google: đổi token Clerk → JWT nội bộ; user mới nhận `registrationToken` |
| POST | `/clerk/send-otp` | `ClerkSendOtpRequest` | Gửi OTP SĐT cho user Google mới |
| POST | `/clerk/register` | `ClerkRegisterRequest` | Hoàn tất đăng ký Google (SĐT + OTP) |
| POST | `/google/check` | `GoogleCheckRequest` | Luồng Google cũ — **không còn dùng** |
| POST | `/email/send-otp` · `/email/verify-otp` | email / OTP | Xác minh email |
| POST | `/forgot-password/send-otp` · `/verify-otp` · `/reset-password` | | Quên mật khẩu (3 bước) |
| POST | `/change-password` | `ChangePasswordRequest` | Đổi mật khẩu (cần token) |
| POST | `/update-profile` | `UpdateProfileRequest` | Cập nhật hồ sơ (cần token) |
| GET | `/me` | — | Thông tin user hiện tại (cần token) |
| POST | `/sync-role` | — | Đồng bộ lại role trong token (vd. sau khi gara được duyệt) |

## 3. Người dùng

### `/api/users` (⚠️ đang công khai — dùng cho web admin)

| Method | Path | Params | Mô tả |
|--------|------|--------|-------|
| GET | `/` | `status?, role?, search?, page, size, sortBy=createdAt, sortDir=DESC` | Danh sách người dùng (phân trang) |
| GET | `/all` | — | Danh sách rút gọn |
| GET | `/{id}` | — | Chi tiết |
| PATCH | `/{id}/status` | query `status` (`UserStatus`) | Khóa / mở tài khoản |
| POST | `/warn` | `UserWarningRequest` | Gửi cảnh cáo |
| GET | `/{id}/audit-logs` | — | Nhật ký thao tác |

### `/api/customer-vehicles` (khách)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/` | Danh sách xe của khách đang đăng nhập |

## 4. Đơn cứu hộ — `/api/rescue-requests` (cần token)

### Khách hàng

| Method | Path | Body | Mô tả |
|--------|------|------|-------|
| POST | `/` | `vehicleType, symptom, pickupLat, pickupLng, pickupAddress?, locationNote?, issueType?, contactPhone?, customerVehicleId?, photoUrls[]?, paymentMethod? (CASH mặc định | BANK_TRANSFER)` | Tạo đơn + điều phối gara |
| GET | `/mine` | — | Đơn của tôi |
| GET | `/{id}` | — | Chi tiết đơn (khách, gara, nhân viên của đơn đều xem được) — mobile poll endpoint này |
| POST | `/{id}/cancel` | — | Hủy (chỉ khi `SEARCHING`/`PENDING_GARAGE`/`ACCEPTED`) |
| POST | `/{id}/status` | `{ "status": "REPAIRING_ONSITE" }` | Khách duyệt báo giá (`DIAGNOSED → REPAIRING_ONSITE`) |
| POST | `/{id}/pay` | — | Thanh toán chuyển khoản (mock) → `PAID` |

### Chủ gara

| Method | Path | Body | Mô tả |
|--------|------|------|-------|
| GET | `/garage/offers` | — | Lời mời đang chờ nhận (`PENDING_GARAGE`) |
| GET | `/garage/active` | — | Đơn đang xử lý |
| GET | `/garage/history` | — | Lịch sử (COMPLETED/PAID/RATED/CANCELLED/DECLINED) |
| POST | `/{id}/accept` | — | Nhận đơn → `ACCEPTED` |
| POST | `/{id}/decline` | — | Từ chối → hệ thống mời gara kế tiếp |
| POST | `/{id}/assign-staff` | `staffId, rescueVehicleId` | Gán nhân viên + xe → `ASSIGNED` |

### Nhân viên gara (chủ gara của đơn cũng được gọi)

| Method | Path | Body | Mô tả |
|--------|------|------|-------|
| GET | `/staff/active` | — | Nhiệm vụ hiện tại của nhân viên |
| GET | `/staff/history` | — | Lịch sử nhiệm vụ |
| POST | `/{id}/status` | `{ "status": "EN_ROUTE" }` | Chuyển trạng thái (xem [business-rules §3](business-rules.md)) |
| POST | `/{id}/location` | `lat, lng` | Đẩy vị trí xe cứu hộ (khi đơn đang cứu hộ) |
| POST | `/{id}/quote` | `repairItems[{id?, name, price, quantity}], rescueFee?, inspectionFee?, towingFee?, photoUrls[]?` | Gửi báo giá → `DIAGNOSED` |
| POST | `/{id}/confirm-cash` | — | Xác nhận đã thu tiền mặt → `PAID` |

### Chat theo đơn

| Method | Path | Body / Params | Mô tả |
|--------|------|---------------|-------|
| POST | `/{id}/messages` | `peer (CUSTOMER|GARAGE|STAFF), content?, imageUrl?` | Gửi tin (lưu DB + đẩy WS) |
| GET | `/{id}/messages` | query `peer` | Lịch sử hội thoại với `peer` trong đơn |
| GET | `/conversations` | — | Hộp thư: hội thoại gần nhất theo (đơn, đối phương) |
| GET | `/chat-contacts` | — | Gợi ý người có thể nhắn |

## 5. Gara

### `/api/garages` — chủ gara

| Method | Path | Body | Mô tả |
|--------|------|------|-------|
| POST | `/register` | `name, phone, email, address, lat, lng, capability, idCardFrontUrl, idCardBackUrl, businessLicenseUrl, facadePhotoUrl` | Đăng ký gara (chờ admin duyệt) |
| GET | `/me` | — | Hồ sơ gara của tôi |
| PUT | `/me/status` | `{ "isOnline": true }` | Bật/tắt nhận đơn |
| PUT | `/me/auto-accept` | `{ "autoAccept": true }` | Bật/tắt tự động nhận đơn |
| GET | `/me/dashboard` | — | Số liệu tổng quan (nhân viên, đơn, doanh thu hôm nay) |
| GET | `/me/services` | — | Dịch vụ & giá của gara |
| PUT | `/me/services/{serviceId}/pricing` | `GarageServicePriceRequest` | Đặt giá dịch vụ |
| PUT | `/me/services/{serviceId}/toggle` | `{ "isActive": true }` | Bật/tắt dịch vụ |
| GET | `/me/staff` | — | Danh sách nhân viên |
| POST | `/me/staff` | `phone, fullName, staffCode?, email?, password?, avatarUrl?` | Tạo tài khoản nhân viên |
| PATCH | `/me/staff/{id}/toggle-active` | — | Khóa/mở nhân viên |
| DELETE | `/me/staff/{id}` | — | Xóa nhân viên (soft delete) |
| GET | `/me/rescue-vehicles` | — | Danh sách xe cứu hộ |
| POST | `/me/rescue-vehicles` | `licensePlate, vehicleKind, imageUrl?` | Thêm xe cứu hộ |
| DELETE | `/me/rescue-vehicles/{id}` | — | Xóa xe cứu hộ |

### `/api/garages/staff` — nhân viên

| Method | Path | Body | Mô tả |
|--------|------|------|-------|
| GET | `/staff/me` | — | Dashboard nhân viên |
| PUT | `/staff/me/status` | `{ "isOnline": true }` | Bật/tắt trực |
| POST | `/staff/leave` | — | Rời gara |

## 6. Dịch vụ — `/api/services`, `/api/service-categories`

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/service-categories` | Danh mục dịch vụ |
| POST / PUT / DELETE | `/api/service-categories[/{id}]` | Tạo / sửa / xóa danh mục (⚠️ đang công khai) |
| GET | `/api/services?categoryId=` | Danh sách dịch vụ |
| GET | `/api/services/{id}` | Chi tiết |
| POST / PUT / DELETE | `/api/services[/{id}]` | Tạo / sửa / xóa dịch vụ (⚠️ đang công khai) |

## 7. Thông báo — `/api/notifications` (cần token)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/?page=&size=20` | Thông báo của tôi (phân trang) |
| GET | `/recent` | Thông báo gần đây |
| GET | `/unread-count` | `{ unreadCount }` — số thông báo chưa đọc |
| PUT | `/{id}/read` | Đánh dấu đã đọc |
| PUT | `/read-all` | Đọc tất cả |

## 8. Cuộc gọi thoại — `/api/calls` (cần token)

Gọi thoại miễn phí qua Internet giữa hai người cùng một đơn (khách ↔ chủ gara, khách ↔ nhân viên, chủ gara ↔
nhân viên). REST dùng để **báo hiệu** (signaling); server đẩy sự kiện xuống qua `/ws/chat` (xem §12). Âm thanh đi
thẳng giữa hai máy (WebRTC), không qua backend. Luật nghiệp vụ: [business-rules §10](business-rules.md).

| Method | Path | Body | `data` trả về |
|--------|------|------|----------------|
| POST | `/` | `{ "rescueRequestId": 123, "peer": "STAFF" }` (`peer` = `CUSTOMER`/`GARAGE`/`STAFF`: vai của **người nhận**) | `CallResponse` (có `calleeOnline`) |
| POST | `/{id}/accept` | — | `CallResponse` — người nhận nghe máy |
| POST | `/{id}/reject` | — | `CallResponse` — người nhận từ chối |
| POST | `/{id}/end` | `{ "failed": false }` (có thể bỏ trống) | `CallResponse` — kết thúc / hủy (idempotent) |
| POST | `/{id}/signal` | `{ "type": "OFFER" \| "ANSWER", "sdp": "v=0..." }` (SDP ≤ 16000 ký tự) | `null` — chuyển tiếp cho bên còn lại |
| GET | `/active` | — | `CallResponse` đang `RINGING`/`ONGOING` của tôi, hoặc `null` |
| GET | `/{id}` | — | `CallResponse` |
| GET | `/ice-servers` | — | `IceServerResponse[]` — cấu hình STUN/TURN |

```json
// CallResponse
{ "id": 55, "rescueRequestId": 123, "rescueCode": "RQ...", "status": "RINGING",
  "callerId": 40, "callerRole": "CUSTOMER", "callerName": "...", "callerAvatarUrl": null,
  "calleeId": 41, "calleeRole": "STAFF", "calleeName": "...", "calleeAvatarUrl": "/uploads/...",
  "createdAt": "...", "answeredAt": null, "endedAt": null, "durationSec": null,
  "calleeOnline": true }   // calleeOnline chỉ có ở phản hồi POST / (và CALL_INCOMING), nơi khác là null

// IceServerResponse[] — đúng cấu trúc RTCIceServer; trường null được bỏ khỏi JSON
[ { "urls": ["stun:stun.l.google.com:19302"] },
  { "urls": ["turn:turn.x.vn:3478?transport=udp", "turns:turn.x.vn:443?transport=tcp"],
    "username": "1760400000:40", "credential": "base64..." } ]
```

`status`: `RINGING` · `ONGOING` · `ENDED` · `MISSED` · `REJECTED` · `CANCELLED` · `FAILED` (xem
[database.md §4](database.md)). Hai bên chỉ đẩy OFFER/ANSWER khi cuộc gọi đang `ONGOING`; `OFFER` chỉ do người
gọi gửi, `ANSWER` chỉ do người nhận gửi.

Lỗi thường gặp (`message` tiếng Việt):

| Mã | Message | Khi nào |
|----|---------|---------|
| 404 | Không tìm thấy yêu cầu cứu hộ / Không tìm thấy cuộc gọi | Đơn / cuộc gọi không tồn tại |
| 401 | Bạn không thuộc đơn cứu hộ này / Bạn không thuộc cuộc gọi này | Người thao tác không thuộc đơn / cuộc gọi |
| 400 | Chỉ gọi được khi đơn đang được xử lý | Trạng thái đơn không cho gọi |
| 400 | Chỉ nhân viên được gán cho đơn mới gọi được · Đơn chưa được gán nhân viên · Đơn chưa được gara nào nhận | Người gọi / người nhận không hợp lệ |
| 400 | Không thể tự gọi cho chính mình | Gọi cho chính mình |
| 400 | Bạn đang có một cuộc gọi khác · Người nhận đang bận, vui lòng gọi lại sau | Một trong hai bên đang có cuộc gọi |
| 400 | Chỉ người nhận mới trả lời hoặc từ chối được · Cuộc gọi đã được trả lời hoặc đã kết thúc | accept/reject sai người / sai trạng thái |
| 400 | Cuộc gọi không còn diễn ra · Chỉ người gọi được gửi OFFER · Chỉ người nhận được gửi ANSWER | `signal` sai trạng thái / sai chiều |

## 9. File

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/upload` | `multipart/form-data` field `file` (≤ 20MB) → `{ url: "/uploads/<file>" }` |
| GET | `/api/upload/{fileName}` · `/uploads/{fileName}` | Tải / hiển thị file (công khai) |
| DELETE | `/api/upload?url=` | Xóa file |

URL trả về là **tương đối** — client ghép với origin backend (`resolveFileUrl`).

## 10. Admin — `/api/admin/**` (role `ADMIN`)

### `/api/admin/garages`

| Method | Path | Params / Body | Mô tả |
|--------|------|---------------|-------|
| GET | `/` | `status?, keyword?, page, size` | Danh sách gara |
| GET | `/{id}` | — | Chi tiết + giấy tờ |
| PUT | `/{id}/review` | `status (APPROVED|REJECTED...), commissionRate?, rejectionReason?` | Duyệt / từ chối hồ sơ |
| GET | `/{id}/services` | — | Dịch vụ & giá của gara |
| GET | `/stats` | — | Thống kê số gara theo trạng thái |

### `/api/admin/technicians`

| Method | Path | Params / Body | Mô tả |
|--------|------|---------------|-------|
| GET | `/` | `garageId?, status?, isActive?, keyword?, page, size` | Danh sách kỹ thuật viên |
| GET | `/stats` | — | Thống kê |
| GET | `/{id}` | — | Chi tiết |
| POST | `/?garageId=` | `AddGarageStaffRequest` | Thêm kỹ thuật viên cho gara |
| PATCH | `/{id}/toggle-active` | — | Khóa / mở |
| PATCH | `/{id}/reassign` | `{ "garageId": 1 }` | Chuyển sang gara khác |
| DELETE | `/{id}` | — | Xóa |

### `/api/admin/pricing-config`

| Method | Path | Params / Body | Mô tả |
|--------|------|---------------|-------|
| GET | `/` | — | Cấu hình giá theo loại xe |
| GET | `/{vehicleType}` | — | Cấu hình của một loại xe |
| PUT | `/{vehicleType}` | `RescuePricingConfigRequest` | Cập nhật giá/km ngày-đêm, phí tối thiểu, km miễn phí, khung giờ đêm, phụ phí lễ |
| GET | `/preview/calculate` | `vehicleType, distanceKm, hour?` | Tính thử phí cứu hộ |

## 11. Khác

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/ping` | Kiểm tra service sống |
| GET | `/actuator/health` · `/actuator/info` | Health check |

---

## 12. WebSocket

WebSocket thuần (không STOMP). RN không set được header cho WS → token truyền qua query.

| Endpoint | Xác thực | Hướng | Nội dung |
|----------|----------|-------|----------|
| `/ws/chat?token=<accessToken>` | `AuthHandshakeInterceptor` kiểm JWT ở handshake | Server → client | Tin nhắn chat mới (JSON của `ChatMessageResponse`), đẩy tới người nhận + các thiết bị khác của người gửi; và các sự kiện cuộc gọi `CALL_*` (bên dưới). **Client không gửi tin qua WS** — gửi bằng `POST /api/rescue-requests/{id}/messages`; báo hiệu cuộc gọi bằng `/api/calls`. Ngoại lệ duy nhất: gói heartbeat `{"event":"PING"}` (app gửi mỗi 25s để proxy/NAT không cắt kết nối nhàn rỗi) — server bỏ qua |
| `/ws/users` | Không | Server → client (broadcast) | Báo danh sách người dùng thay đổi (khóa/mở...) để web admin tải lại |

Client mobile tự reconnect (backoff) và fallback polling khi socket chưa mở.

### Sự kiện cuộc gọi trên `/ws/chat`

Server → client, JSON dựng tay. `CALL_ACCEPTED`/`CALL_ENDED` luôn được gửi **sau khi transaction commit**.

```json
{"event":"CALL_INCOMING","call":{ ...CallResponse... }}                 // → mọi máy của người nhận
{"event":"CALL_ACCEPTED","callId":55}                                    // → CẢ HAI bên (mọi máy)
{"event":"CALL_SIGNAL","callId":55,"type":"OFFER","sdp":"v=0\r\n..."}      // → bên còn lại
{"event":"CALL_ENDED","callId":55,"status":"ENDED","durationSec":83}    // → cả hai bên
```

**Push** (Expo) bổ sung cho cuộc gọi — không lưu vào bảng `notifications`:

| `data.type` | Khi nào | `data` | Bấm vào |
|-------------|---------|--------|---------|
| `INCOMING_CALL` | Người nhận **không có** kết nối `/ws/chat`; tự hết hạn sau 45s (`ttl`) | `callId, rescueRequestId, peer, peerName, peerAvatar?` | Mở màn đổ chuông nếu còn đổ chuông |
| `MISSED_CALL` | Cuộc gọi thành `MISSED` hoặc `CANCELLED` | `rescueRequestId, peer, peerName, peerPhone?, peerAvatar?` | Mở `/chat` với người gọi |
