# Backend rules — Spring Boot

Áp dụng cho mọi code trong `backend/`. Rules chung ở [../CLAUDE.md](../CLAUDE.md).

- Stack: **Java 17, Spring Boot 3.2.5** (theo `pom.xml`), Spring Data JPA, Spring Security (JWT
  stateless), Spring WebSocket (thuần, không STOMP), Lombok, Bean Validation.
- Package gốc: `com.sras.backend`. Chạy: `./mvnw spring-boot:run` · test: `./mvnw test` (H2).

## Phân tầng

```
controller/ → service/ (interface) → service/impl/ → repository/ → entity/
                 ↑ dto/request (input, @Valid)        dto/response (output)
```

- Controller **mỏng**: lấy `User` từ `Authentication`, gọi service, bọc kết quả
  `ResponseEntity<ApiResponse<T>>` bằng `ApiResponse.success(...)`. Không viết nghiệp vụ trong controller.
- Service: khai báo interface trong `service/`, triển khai ở `service/impl/XxxServiceImpl`.
  Method ghi dữ liệu đặt `@Transactional`. Kiểm tra quyền sở hữu (đơn thuộc khách/gara/nhân viên
  nào) nằm ở service.
- **Không trả entity ra ngoài** — luôn map sang DTO `dto/response/*Response`.
- Input dùng DTO `dto/request/*Request` + annotation validation, controller đánh `@Valid @RequestBody`.
  Tránh `Map<String, Object>` làm body cho endpoint mới.
- Lỗi nghiệp vụ: ném `BadRequestException` (400), `UnauthorizedException`, `ResourceNotFoundException`
  (404) với message **tiếng Việt** — `GlobalExceptionHandler` tự chuẩn hóa về `ApiResponse`.
  Không try/catch nuốt lỗi trong controller.

## Entity & CSDL

- Bảng nghiệp vụ kế thừa `BaseEntity` (`id`, `created_at`, `updated_at`, `is_deleted`). Bảng
  chỉ-ghi-thêm (lịch sử, log, vị trí, giao dịch ví, tin nhắn) kế thừa `AppendOnlyEntity`.
- **Soft delete**: xóa = `setIsDeleted(true)`; query lọc `...AndIsDeletedFalse`. Không hard delete
  bảng nghiệp vụ.
- Enum: `@Enumerated(EnumType.STRING)`, cột `VARCHAR`, đặt trong `entity/enums/`. Cấm native enum PG.
- Tiền: `Long` (BIGINT, VNĐ, không số lẻ). Thời điểm: `OffsetDateTime` (timestamptz). Tọa độ: `Double`.
- ⚠️ **`ddl-auto=update`**: thêm cột **NOT NULL** vào bảng đã có dữ liệu sẽ không tạo được cột → mọi
  query bảng đó lỗi 500. Cột mới phải **nullable**, hoặc có
  `columnDefinition = "boolean default false not null"` (tương tự), hoặc migrate tay trên Supabase.
- Đổi cấu trúc bảng đã tồn tại (đổi kiểu, bỏ NOT NULL, đổi tên cột) **không** được `update` xử lý →
  phải sửa tay trên DB. Ghi lại thay đổi vào [../docs/database.md](../docs/database.md).
- Thao tác đồng thời trên cùng đơn (gara nhận đơn...) dùng `@Version` (optimistic lock).
- Mọi chuyển trạng thái đơn cứu hộ phải ghi `rescue_status_history` (`recordHistory(...)`).
- Cột trạng thái phụ trên `rescue_requests` (`quote_status`, `deposit_status`, `gas_compensation_status`) đang là
  chuỗi tự do — dùng đúng giá trị đã liệt kê ở [../docs/database.md](../docs/database.md); trạng thái mới nên làm
  enum.
- Kiểm quyền trên đơn: `assertCanView` (xem), `assertGarageSideAccess` (phía gara), `assertOwnRequest` (khách).
  Hai hàm đầu đang rộng hơn luật (DFID001–003) — endpoint mới cần chặt thì tự kiểm thêm, đừng nới thêm.

## Bảo mật

- Endpoint mặc định **cần đăng nhập**. Chỉ thêm vào `PUBLIC_ENDPOINTS` (`SecurityConfig`) khi thật sự
  công khai. Khu admin: class-level `@PreAuthorize("hasRole('ADMIN')")`, path `/api/admin/**`.
- Không log token, mật khẩu, OTP. Mật khẩu băm BCrypt.
- Secret đọc từ `backend/.env` / biến môi trường; **không** để secret thật làm default trong
  `application.yml`.

## Tiền, ví & rút tiền (tiền thật)

Luật đầy đủ: [../docs/business-rules.md §6–§7, §11](../docs/business-rules.md).

- Mọi biến động số dư (ví tín dụng / tiền mặt gara, ví nhân viên, ví hệ thống) phải ghi **một dòng
  `wallet_transactions`** (chỉ ghi thêm) cùng transaction với lúc đổi số dư. **Số dư rút được = tổng sổ cái `CASH`**,
  không tính lại từ đơn `PAID`; `garages.cash_balance` chỉ là bản đệm.
- Khóa dòng trước khi đổi số dư: query `@Lock(PESSIMISTIC_WRITE)` (vd. `findWithLockByOwner`) rồi mới đọc/ghi.
  `em.refresh(proxy, LOCK)` trên lazy proxy chưa nạp **không** khóa. Gọi method `@Transactional` trong cùng class
  không đi qua proxy → dùng `TransactionTemplate` (xem `WithdrawalServiceImpl`).
- Gọi cổng ngoài (payOS kênh chi) **ngoài** transaction; kết quả mơ hồ (timeout / 5xx / sai chữ ký) →
  `PAYOUT_UNCERTAIN`, **không bao giờ tự hoàn tiền**. Chỉ hoàn khi cổng (response có chữ ký) xác nhận thất bại.
- Điều kiện rút tiền nằm ở các helper của `validateWithdrawal` (`blockBeforeAmount`, `todayUsage`, `creditBlock`) và
  `GET /withdraw/limits` dùng lại chính các helper đó — sửa điều kiện thì sửa helper, không để client tự suy luận.
- Webhook payOS: kiểm chữ ký **và** hỏi lại payOS trước khi ghi nhận; idempotent theo `provider_order_code`.
- `POST /rescue-requests/{id}/pay` là **mock** (cờ `PAYMENT_MOCK_TRANSFER_ENABLED`, prod phải `false`) và không ghi
  sổ cái. Không thêm endpoint đánh dấu "đã trả tiền" mà không có cổng xác nhận.
- OTP cho thao tác tiền đi qua `ActionOtpService` (SMS, băm HMAC, gắn payload); đừng dùng lại `otp_codes` của
  đăng ký / quên mật khẩu.

## Tác vụ nền & dịch vụ ngoài

- Job `@Scheduled` hiện có: `processExpiredDispatchOffers` (5s), `CallSweeper`, `WithdrawalPayoutReconciler`. Job mới
  phải chịu được chạy lặp (idempotent) và **chỉ một instance** backend.
- Goong Direction (`RoutingService`) và Gemini đều có **fallback** khi lỗi/timeout (haversine × 1.3, luật dự phòng)
  — giữ nguyên nguyên tắc: dịch vụ ngoài lỗi không được chặn tạo đơn / điều phối.
- Key dịch vụ ngoài đọc từ biến môi trường, **không** để key thật làm default (`@Value("${x:...}")` hay
  `application.yml`).

## JSON / Jackson

- Payload WebSocket đang build JSON thủ công bằng `websocket/WsJson` (xem `ChatServiceImpl`,
  `CallServiceImpl`) — giữ nguyên cách đó khi mở rộng chat / cuộc gọi để tránh lệch cấu hình ObjectMapper.
- Sự kiện đổi trạng thái (vd. `CALL_ACCEPTED`, `CALL_ENDED`) phải dựng payload **trong** transaction và chỉ gửi
  **sau khi commit** (`TransactionSynchronization.afterCommit`); `open-in-view=false` nên ngoài transaction không
  đọc được quan hệ LAZY (tên, avatar...).
- Phiên WebSocket và trạng thái online nằm trong RAM → backend (chat, gọi thoại) chỉ chạy **một instance**.

## Sau khi sửa

- Chạy `./mvnw -q compile` (tối thiểu) trước khi báo xong; có test liên quan thì `./mvnw test`.
- Endpoint mới/đổi → cập nhật [../docs/api.md](../docs/api.md) và model TypeScript ở mobile/web nếu
  DTO thay đổi.
