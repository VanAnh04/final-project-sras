# API — SRAS Backend

> Danh sách REST endpoint + WebSocket của backend (`backend/src/main/java/com/sras/backend/controller/`).
> Đổi/ thêm endpoint → cập nhật file này. Luật nghiệp vụ chi tiết: [business-rules.md](business-rules.md).

Cập nhật: 2026-11-13 · Base URL dev: `http://localhost:8080`

---

## 1. Quy ước chung

### Xác thực

- Header: `Authorization: Bearer <accessToken>` (JWT nội bộ, hạn 15′).
- Hết hạn → `POST /api/auth/refresh` lấy cặp token mới (refresh token hạn 7 ngày). Client mobile/web
  tự xử lý trong `axiosClient`.
- Endpoint **công khai** (`PUBLIC_ENDPOINTS` trong `SecurityConfig`): `/api/auth/**` (trừ `/api/auth/update-profile`),
  `/api/users/**`, `/api/services/**`, `/api/service-categories/**`, `/api/garages/nearby`,
  `/api/garages/*/profile`, `/api/garages/*/services`, `/api/ai/**`, `/api/payments/payos/webhook`, `/api/ping`,
  `/ws/**`, `/actuator/health|info`, `/uploads/**`, `/api/upload/**`. Mọi endpoint khác cần đăng nhập.
- Khu admin `/api/admin/**`: `@PreAuthorize("hasRole('ADMIN')")` (class-level). Một số endpoint admin nằm ngoài
  `/api/admin` — ghi rõ ở từng mục.

> ⚠️ **Lỗ hổng cần sửa** (chi tiết trong [progress.md §8](progress.md)):
> - `POST /api/auth/google/check` phát JWT cho **bất kỳ email nào** client gửi lên, không kiểm ID token Google →
>   chiếm được cả tài khoản `ADMIN`.
> - `/api/users/**` (quản lý người dùng, khóa tài khoản, audit log) và `POST/PUT/DELETE` của `/api/services/**`
>   (kể cả `/import`), `/api/service-categories/**` đang **công khai, không cần token**.
> - `/api/ratings/admin/**` không có `@PreAuthorize` — mọi người đã đăng nhập đều xem / xóa được đánh giá.
> - `/api/ai/**` công khai — tiêu quota Gemini không cần đăng nhập.
> - `POST /api/rescue-requests/{id}/confirm-deposit` đặt cọc `PAID` mà không kiểm tiền đã vào.

### Định dạng phản hồi

Mọi endpoint trả `ApiResponse<T>` (trừ file tải về ở §8 / §13):

```json
{ "success": true, "message": "Thông báo (tiếng Việt, có thể null)", "data": { } }
```

Lỗi (`GlobalExceptionHandler`): `success=false`, `message` mô tả lỗi, HTTP status tương ứng —
`400` (BadRequestException / validation), `401` (chưa đăng nhập / token hết hạn / `UnauthorizedException`),
`403` (sai quyền), `404` (ResourceNotFoundException).

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
| POST | `/login` | `phone \| email, password, rememberMe?` | Đăng nhập → `AuthResponse` (accessToken, refreshToken, user) |
| POST | `/refresh` | body `refreshToken` hoặc query `token` | Cấp lại token |
| POST | `/logout` | `refreshToken` | Thu hồi refresh token |
| POST | `/clerk/exchange` | `ClerkExchangeRequest` (session token Clerk) | Khách đăng nhập Google (mobile): đổi token Clerk → JWT nội bộ; user mới nhận `registrationToken` |
| POST | `/clerk/send-otp` | `ClerkSendOtpRequest` | Gửi OTP SĐT cho user Google mới |
| POST | `/clerk/register` | `ClerkRegisterRequest` | Hoàn tất đăng ký Google (SĐT + OTP) |
| POST | `/google/check` | `email, fullName?, avatarUrl?` | **Web admin** đăng nhập Google: email đã có tài khoản → JWT + cookie refresh. ⚠️ không kiểm token Google |
| POST | `/email/send-otp` · `/email/verify-otp` | email / OTP | Xác minh email |
| POST | `/forgot-password/send-otp` · `/verify-otp` · `/reset-password` | | Quên mật khẩu (3 bước) |
| POST | `/change-password` | `ChangePasswordRequest` | Đổi mật khẩu (cần token) |
| POST | `/update-profile` | `UpdateProfileRequest` | Sửa hồ sơ **của chính mình** (cần token). Đổi SĐT/email ⇒ khóa rút tiền 24h |
| GET | `/me` | — | Thông tin user hiện tại (cần token) |
| POST | `/sync-role` | — | Đồng bộ lại role trong token (vd. sau khi gara được duyệt) |

## 3. Người dùng, xe của khách, thiết bị

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

| Method | Path | Body | Mô tả |
|--------|------|------|-------|
| GET | `/` | — | Xe của khách đang đăng nhập |
| POST | `/` | `vehicleType, brand, model?, licensePlate?, color?, year?, photoUrl?, isDefault?` | Thêm xe |
| PUT | `/{id}` | như trên | Sửa xe |
| DELETE | `/{id}` | — | Xóa xe |

### `/api/device-tokens` (cần token)

| Method | Path | Body / Params | Mô tả |
|--------|------|---------------|-------|
| POST | `/` | `token` (Expo push token), `platform` (`ANDROID`/`IOS`) | Đăng ký thiết bị nhận push |
| DELETE | `/?token=` | — | Hủy đăng ký (khi đăng xuất) |

## 4. Đơn cứu hộ — `/api/rescue-requests` (cần token)

### Khách hàng

| Method | Path | Body / Params | Mô tả |
|--------|------|---------------|-------|
| GET | `/deposit-status` | `deviceId?` | Có phải đặt cọc 50.000đ không, số đơn bom, số dư cọc bảo lưu (`CheckDepositStatusResponse`) |
| POST | `/` | `vehicleType, symptom, pickupLat, pickupLng, pickupAddress?, locationNote?, issueType?, contactPhone?, customerVehicleId?, photoUrls[]?, paymentMethod? (CASH mặc định \| BANK_TRANSFER), garageId? (chọn đích danh gara), deviceId?` | Tạo đơn + điều phối (đơn chờ cọc thì chưa điều phối). Header `X-Device-Id` thay cho `deviceId` |
| POST | `/{id}/confirm-deposit` | — | Đánh dấu đã nộp cọc → điều phối. ⚠️ không kiểm tiền thật; luồng thật dùng payOS (§7) |
| GET | `/mine` | — | Đơn của tôi |
| GET | `/{id}` | — | Chi tiết đơn (khách, gara, nhân viên của đơn) — mobile poll endpoint này; cũng chạy kiểm lời mời quá hạn |
| POST | `/{id}/cancel` | — | Hủy (từ `DRAFT` tới `EN_ROUTE`) |
| POST | `/{id}/customer-location` | `lat, lng, accuracy?` | Chia sẻ vị trí khách (chỉ `ASSIGNED` / `EN_ROUTE`) |
| DELETE | `/{id}/customer-location` | — | Tắt chia sẻ, xóa vị trí đã lưu |
| POST | `/{id}/accept-quote` | — | Duyệt báo giá → `REPAIRING_ONSITE` hoặc `TOWING` (nếu báo giá kéo xe) |
| POST | `/{id}/decline-quote` | — | Từ chối báo giá → `AWAITING_PAYMENT`, tổng = phí ① |
| POST | `/{id}/select-cash` | — | Chọn trả tiền mặt (bắt buộc trước `/confirm-cash` của nhân viên) |
| POST | `/{id}/pay` | — | Thanh toán chuyển khoản **mock** → `PAID` (tắt khi `PAYMENT_MOCK_TRANSFER_ENABLED=false`) |
| POST | `/{id}/counter-bom` | `explanation, attachmentUrl?` | Giải trình khi bị báo bom đơn |

### Chủ gara

| Method | Path | Body | Mô tả |
|--------|------|------|-------|
| GET | `/garage/offers` | — | Lời mời đang chờ nhận (`PENDING_GARAGE`, chưa quá hạn) |
| GET | `/garage/active` | — | Đơn đang xử lý (gồm `AWAITING_PAYMENT`) |
| GET | `/garage/history` | — | Lịch sử (COMPLETED/PAID/RATED/CANCELLED/DECLINED) |
| POST | `/{id}/accept` | — | Nhận đơn → `ACCEPTED` |
| POST | `/{id}/decline` | — | Từ chối → mời gara kế tiếp (đơn chọn đích danh → `DECLINED`) |
| POST | `/{id}/assign-staff` | `staffId, rescueVehicleId` | Gán nhân viên + xe → `ASSIGNED` |

### Nhân viên gara (chủ gara của đơn cũng được gọi)

| Method | Path | Body | Mô tả |
|--------|------|------|-------|
| GET | `/staff/active` | — | Nhiệm vụ hiện tại của nhân viên (hoặc `null`) |
| GET | `/staff/history` | — | Lịch sử nhiệm vụ |
| POST | `/{id}/status` | `{ "status": "EN_ROUTE" }` | Chuyển trạng thái (xem [business-rules §3](business-rules.md)) |
| POST | `/{id}/location` | `lat, lng` | Đẩy vị trí xe cứu hộ (khi đơn đang cứu hộ) |
| POST | `/{id}/quote` | `repairItems[{id?, name, price, quantity}], quoteType? (ONSITE \| TOW), isTowing?, towingFee?, towingReason?, rescueFee?, inspectionFee?, photoUrls[]?` | Gửi báo giá → `DIAGNOSED` |
| POST | `/{id}/add-item` | `serviceId?, name, price, quantity?, note?` | Bổ sung hạng mục phát sinh (duyệt sẵn, cộng thẳng vào tổng) |
| POST | `/{id}/confirm-cash` | — | Xác nhận đã thu tiền mặt → `PAID` + trừ hoa hồng ví tín dụng |
| POST | `/{id}/report-bom` | `reason, photoUrl?, reporterLat?, reporterLng?` | Báo khách bom đơn → `CANCELLED` + khiếu nại chờ admin duyệt bồi hoàn |

### Chat theo đơn

| Method | Path | Body / Params | Mô tả |
|--------|------|---------------|-------|
| POST | `/{id}/messages` | `peer (CUSTOMER\|GARAGE\|STAFF), content?, imageUrl?` | Gửi tin (lưu DB + đẩy WS + push) |
| GET | `/{id}/messages` | query `peer` | Lịch sử hội thoại với `peer` trong đơn |
| GET | `/conversations` | — | Hộp thư: hội thoại gần nhất theo (đơn, đối phương) |
| GET | `/chat-contacts` | — | Gợi ý người có thể nhắn (kèm online/offline) |

## 5. Gara — `/api/garages`

### Công khai (khách chọn gara)

| Method | Path | Params | Mô tả |
|--------|------|--------|-------|
| GET | `/nearby` | `lat, lng, vehicleType?, radiusKm=20` | Gara online trong bán kính, xếp theo điểm điều phối (`NearbyGarageResponse[]`) |
| GET | `/{id}/profile` | `lat?, lng?, vehicleType?` | Hồ sơ công khai: thông tin, ảnh, đánh giá, dịch vụ, khoảng cách (`GaragePublicProfileResponse`) |
| GET | `/{id}/services` | — | Dịch vụ & giá của gara |

### Chủ gara

| Method | Path | Body | Mô tả |
|--------|------|------|-------|
| POST | `/register` | `name, phone, email, address, lat, lng, capability (BOTH mặc định), idCardFrontUrl, idCardBackUrl, businessLicenseUrl, facadePhotoUrl` | Đăng ký gara (chờ admin duyệt) |
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

### Nhân viên

| Method | Path | Body | Mô tả |
|--------|------|------|-------|
| GET | `/staff/me` | — | Dashboard nhân viên |
| PUT | `/staff/me/status` | `{ "isOnline": true }` | Bật/tắt trực |
| POST | `/staff/leave` | — | Rời gara |
| GET | `/staff/me/wallet` | — | Ví nhân viên |
| POST | `/staff/me/wallet/topup` | `{ "amount": 50000 }` (≥ 10.000) | Tạo link payOS nạp ví nhân viên |
| GET | `/staff/me/wallet/topup/status/{orderCode}` | — | Tra trạng thái nạp |

## 6. Ví & rút tiền

### Ví gara — `/api/garages/me/...` (chủ gara)

| Method | Path | Body / Params | Mô tả |
|--------|------|---------------|-------|
| GET | `/wallet/overview` | — | Số dư ví tín dụng / tiền mặt, giao dịch, biểu đồ doanh thu |
| POST | `/wallet/topup` | `{ "amount": 500000 }` | Tạo link payOS nạp **ví tín dụng** |
| GET | `/wallet/topup/status/{orderCode}` | — | Tra trạng thái nạp |
| POST | `/wallet/transfer-to-credit` | `{ "amount": 100000 }` (≥ 10.000) | Chuyển ví tiền mặt → ví tín dụng (không OTP) |
| GET | `/bank-account` | — | Tài khoản nhận tiền hiện tại (`BankAccountResponse`) |
| POST | `/bank-account/otp` | `bankCode, bankAccountNumber, bankAccountHolder` | Gửi OTP SMS để đổi tài khoản nhận tiền |
| PUT | `/bank-account` | `bankCode, bankAccountNumber, bankAccountHolder, otpCode` | Lưu tài khoản nhận tiền (đổi ⇒ khóa rút 24h) |
| GET | `/wallet/withdraw/limits` | — | Hạn mức + `blockedReason` do server tính (`WithdrawalLimitsResponse`) |
| POST | `/wallet/withdraw/otp` | `{ "amount": 100000 }` | Kiểm điều kiện rút rồi gửi OTP SMS |
| POST | `/wallet/withdraw` | `amount, otpCode` | Tạo lệnh rút, gửi cổng chi ngay (`WithdrawalResponse`) |
| GET | `/wallet/withdrawals` | `page=0, size=10` | Lịch sử lệnh rút |
| GET | `/wallet/withdrawals/{id}` | — | Chi tiết lệnh rút |

### Khác

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/customer/me/wallet/overview` | Ví của khách (cọc bảo lưu, giao dịch) |
| GET | `/api/banks` | Danh sách ngân hàng (BIN VietQR) để chọn tài khoản nhận tiền — đọc từ `resources/banks.json` |

Luật rút tiền: [business-rules §7.4](business-rules.md).

## 7. Thanh toán payOS — `/api/payments/payos`

| Method | Path | Params | Mô tả |
|--------|------|--------|-------|
| POST | `/create-link` | `requestId` | Khách tạo link / QR thanh toán đơn (`CreatePayOSPaymentResponse`) |
| POST | `/create-deposit-link` | `requestId` | Khách tạo link nộp cọc 50.000đ |
| GET | `/status/{orderCode}` | — | Tra trạng thái thanh toán đơn (hỏi lại payOS, thành công thì chốt `PAID`) |
| GET | `/deposit-status/{orderCode}` | — | Tra trạng thái nộp cọc (thành công thì điều phối) |
| POST | `/webhook` | payload payOS | **Công khai.** Kiểm chữ ký bằng `PAYOS_CHECKSUM_KEY` + hỏi lại payOS rồi mới ghi nhận; xử lý đơn, cọc, nạp ví gara / nhân viên |

## 8. Dịch vụ — `/api/services`, `/api/service-categories`

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/service-categories` | Danh mục dịch vụ |
| POST / PUT / DELETE | `/api/service-categories[/{id}]` | Tạo / sửa / xóa danh mục (⚠️ đang công khai) |
| GET | `/api/services?categoryId=` | Danh sách dịch vụ |
| GET | `/api/services/{id}` | Chi tiết |
| POST / PUT / DELETE | `/api/services[/{id}]` | Tạo / sửa / xóa dịch vụ (⚠️ đang công khai) |
| GET | `/api/services/import-template` | Tải file Excel mẫu (trả **file .xlsx**, không bọc `ApiResponse`) |
| GET | `/api/services/export?categoryId=` | Xuất danh sách dịch vụ ra Excel (file) |
| POST | `/api/services/import` | `multipart/form-data` field `file` (.xlsx) → `ServiceImportResponse` (⚠️ công khai) |

## 9. Cuộc gọi thoại — `/api/calls` (cần token)

Gọi thoại miễn phí qua Internet giữa hai người cùng một đơn (khách ↔ chủ gara, khách ↔ nhân viên, chủ gara ↔
nhân viên). REST dùng để **báo hiệu** (signaling); server đẩy sự kiện xuống qua `/ws/chat` (xem §16). Âm thanh đi
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

## 10. Đánh giá & khiếu nại

### `/api/ratings` (cần token)

| Method | Path | Body / Params | Mô tả |
|--------|------|---------------|-------|
| POST | `/` | `requestId, stars, comment?, staffStars?, staffComment?` | Khách đánh giá đơn (gửi lại = ghi đè) |
| GET | `/garage/{garageId}` | `page=0, size=10` | Đánh giá của gara (phân trang) |
| GET | `/garage/{garageId}/all` | — | Toàn bộ đánh giá của gara |
| GET | `/garage/{garageId}/staff-ratings` | — | Đánh giá nhân viên của gara |
| GET | `/staff/{staffId}` | — | Đánh giá của một nhân viên |
| GET | `/request/{requestId}` | `direction=CUSTOMER_TO_GARAGE` | Đánh giá của một đơn |
| GET | `/admin` | `garageId?, staffId?, stars?, keyword?, page, size` | Admin xem đánh giá (⚠️ chưa chặn role) |
| GET | `/admin/stats` | — | Thống kê đánh giá (⚠️ chưa chặn role) |
| DELETE | `/admin/{id}` | — | Admin xóa đánh giá (⚠️ chưa chặn role) |

### `/api/complaints` (cần token)

| Method | Path | Body / Params | Mô tả |
|--------|------|---------------|-------|
| POST | `/` | `requestId, targetType (GARAGE\|CUSTOMER\|PLATFORM), content, attachmentUrl?` | Tạo khiếu nại |
| GET | `/my` | — | Khiếu nại của tôi |
| GET | `/garage/{garageId}` | — | Khiếu nại liên quan gara |
| GET | `/request/{requestId}` | — | Khiếu nại của một đơn |
| GET | `/admin` | `status?, targetType?, page, size` | **ADMIN** — danh sách |
| GET | `/admin/{id}` | — | **ADMIN** — chi tiết |
| PUT | `/admin/{id}/resolve` | `status, resolution?, approvedCompensationAmount?` | **ADMIN** — xử lý; báo bom đơn `RESOLVED` thì chi bồi hoàn xăng cho gara |

## 11. Trợ lý AI — `/api/ai` (⚠️ công khai)

| Method | Path | Body / Params | Mô tả |
|--------|------|---------------|-------|
| POST | `/diagnose` | `vehicleType, vehicleModel?, customerVehicleId?, lat?, lng?, address?, symptomDescription, photoUrls[]?` | Chẩn đoán sự cố (`AiDiagnosisResponse`) |
| POST | `/chat` | `messages[{role, content, imageUrl?}], userLocation?, lat?, lng?, vehicleType?, photoUrls[]?` | Trò chuyện với trợ lý (`AiChatResponse`) |
| GET | `/road-hazard-warning` | `lat?, lng?, address?` | Cảnh báo đoạn đường hay xảy ra sự cố (`RoadHazardWarningResponse`) |
| POST | `/transcribe-voice` | `multipart/form-data` field `file` (audio) | Giọng nói → văn bản (`{ text }`) |

## 12. Thông báo — `/api/notifications` (cần token)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/?page=&size=20` | Thông báo của tôi (phân trang) |
| GET | `/recent` | Thông báo gần đây |
| GET | `/unread-count` | `{ unreadCount }` — số thông báo chưa đọc |
| PUT | `/{id}/read` | Đánh dấu đã đọc |
| PUT | `/read-all` | Đọc tất cả |

Mỗi thông báo lưu DB đồng thời được đẩy push Expo **sau khi transaction commit** (`PushService.sendAfterCommit`).

## 13. File

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/upload` | `multipart/form-data` field `file` (≤ 20MB) → `{ url: "/uploads/<file>" }` |
| GET | `/api/upload/{fileName}` · `/uploads/{fileName}` | Tải / hiển thị file (công khai) |
| DELETE | `/api/upload?url=` | Xóa file |

URL trả về là **tương đối** — client ghép với origin backend (`resolveFileUrl`).

## 14. Admin — role `ADMIN`

### `/api/admin/garages`

| Method | Path | Params / Body | Mô tả |
|--------|------|---------------|-------|
| GET | `/` | `status?, keyword?, page, size` | Danh sách gara |
| GET | `/{id}` | — | Chi tiết + giấy tờ |
| PUT | `/{id}/review` | `status (APPROVED\|REJECTED...), commissionRate?, rejectionReason?` | Duyệt / từ chối hồ sơ |
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
| PUT | `/{vehicleType}` | `RescuePricingConfigRequest` | Cập nhật cước 3 bậc ngày/đêm, khung giờ đêm, phụ phí lễ, mức bồi hoàn hủy |
| GET | `/preview/calculate` | `vehicleType, distanceKm, hour?` | Tính thử phí cứu hộ |

### `/api/admin/dispatch-config`

| Method | Path | Body | Mô tả |
|--------|------|------|-------|
| GET | `/` | — | Trọng số điều phối đang dùng (`DispatchConfigResponse`) |
| PUT | `/` | `weightDistance, weightWorkload, weightRating, weightResponseRate, penaltyPerOrder` | Cập nhật; 4 trọng số phải cộng đúng 100 |

### `/api/admin/analytics`

Tham số chung: `range` (mặc định `7_DAYS`) hoặc `from` / `to`. Các bản `…/ai-insights` thêm `forceRefresh=false`
(kết quả AI cache 15′).

| Method | Path | `data` |
|--------|------|--------|
| GET | `/operations` · `/operations/ai-insights` | Vận hành: số đơn, SLA, tỉ lệ hủy, phễu cứu hộ (`RescueOperationsMetricsResponse`) |
| GET | `/finance` · `/finance/ai-insights` | Doanh thu nền tảng, phương thức thanh toán, cảnh báo số dư gara (`FinancialAnalyticsResponse`) |
| GET | `/incidents` · `/incidents/ai-insights` | Loại sự cố, loại xe, giờ cao điểm, điểm nóng trên bản đồ (`IncidentAnalyticsResponse`) |
| GET | `/partners` · `/partners/ai-insights` | Xếp hạng gara, kỹ thuật viên, gara rủi ro (`PartnerAnalyticsResponse`) |
| POST | `/garages/{garageId}/send-warning` | Body `title, body` → gửi thông báo `SYSTEM_WARNING` cho chủ gara |

### Rút tiền — `/api/admin/...`

| Method | Path | Params / Body | Mô tả |
|--------|------|---------------|-------|
| GET | `/withdrawals` | `status?, needsReview?, page=0, size=20` | Danh sách lệnh rút (`AdminWithdrawalResponse`) |
| GET | `/withdrawals/{id}` | — | Chi tiết |
| POST | `/withdrawals/{id}/sync` | — | Đối soát ngay với cổng chi |
| POST | `/withdrawals/{id}/resolve` | `result (FAILED \| TRANSFERRED \| ACKNOWLEDGE), note?, proofUrl?` | Xử lý lệnh bị cắm cờ; `TRANSFERRED` (chuyển tay) bắt buộc `proofUrl` |
| GET | `/payout/balance` | — | Số dư tài khoản chi payOS |

### Tài chính — `FinanceController` (ADMIN theo từng method)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/admin/finance/overview` | Tổng quan tài chính hệ thống (`AdminFinanceOverviewResponse`) |
| POST | `/api/admin/finance/sync-bank` | Trả về kết quả cố định — **chưa** gọi payOS thật |

## 15. Khác

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/ping` | Kiểm tra service sống |
| GET | `/actuator/health` · `/actuator/info` | Health check |

---

## 16. WebSocket & push

WebSocket thuần (không STOMP). RN không set được header cho WS → token truyền qua query.

| Endpoint | Xác thực | Hướng | Nội dung |
|----------|----------|-------|----------|
| `/ws/chat?token=<accessToken>` | `AuthHandshakeInterceptor` kiểm JWT ở handshake | Server → client | `{"event":"CONNECTED"}` khi nối; tin nhắn chat mới `{"event":"CHAT_MESSAGE","message":{…ChatMessageResponse}}`, đẩy tới người nhận + các thiết bị khác của người gửi; các sự kiện cuộc gọi `CALL_*` (bên dưới). **Client không gửi tin qua WS** — gửi bằng `POST /api/rescue-requests/{id}/messages`; báo hiệu cuộc gọi bằng `/api/calls`. Ngoại lệ duy nhất: heartbeat `{"event":"PING"}` (app gửi mỗi 25s để proxy/NAT không cắt kết nối nhàn rỗi) — server bỏ qua |
| `/ws/users` | Không | Server → client (broadcast) | `{"event":"USERS_UPDATED","timestamp":…}` khi danh sách người dùng thay đổi (khóa/mở...) để web admin tải lại |

Client mobile tự reconnect (backoff) và fallback polling khi socket chưa mở. Trạng thái đơn cứu hộ vẫn lấy bằng
**polling** `GET /api/rescue-requests/{id}` (chưa có sự kiện WS cho đơn).

### Sự kiện cuộc gọi trên `/ws/chat`

Server → client, JSON dựng tay. `CALL_ACCEPTED`/`CALL_ENDED` luôn được gửi **sau khi transaction commit**.

```json
{"event":"CALL_INCOMING","call":{ ...CallResponse... }}                 // → mọi máy của người nhận
{"event":"CALL_ACCEPTED","callId":55}                                    // → CẢ HAI bên (mọi máy)
{"event":"CALL_SIGNAL","callId":55,"type":"OFFER","sdp":"v=0\r\n..."}      // → bên còn lại
{"event":"CALL_ENDED","callId":55,"status":"ENDED","durationSec":83}    // → cả hai bên
```

### Push (Expo Push Service)

- Mọi thông báo lưu bảng `notifications` đều kèm push (`data` có `type`, `refType`, `refId`) — app mở đúng màn
  theo `src/notifications/route.ts`.
- Chat: `data.type = CHAT_MESSAGE`, kèm `rescueRequestId, peer, peerName` để mở thẳng `/chat`.
- Cuộc gọi — **không** lưu vào bảng `notifications`:

| `data.type` | Khi nào | `data` | Bấm vào |
|-------------|---------|--------|---------|
| `INCOMING_CALL` | Người nhận **không có** kết nối `/ws/chat`; tự hết hạn sau 45s (`ttl`) | `callId, rescueRequestId, peer, peerName, peerAvatar?` | Mở màn đổ chuông nếu còn đổ chuông |
| `MISSED_CALL` | Cuộc gọi thành `MISSED` hoặc `CANCELLED` | `rescueRequestId, peer, peerName, peerPhone?, peerAvatar?` | Mở `/chat` với người gọi |
