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

## Bảo mật

- Endpoint mặc định **cần đăng nhập**. Chỉ thêm vào `PUBLIC_ENDPOINTS` (`SecurityConfig`) khi thật sự
  công khai. Khu admin: class-level `@PreAuthorize("hasRole('ADMIN')")`, path `/api/admin/**`.
- Không log token, mật khẩu, OTP. Mật khẩu băm BCrypt.
- Secret đọc từ `backend/.env` / biến môi trường; **không** để secret thật làm default trong
  `application.yml`.

## JSON / Jackson

- Payload WebSocket đang build JSON thủ công (xem `ChatServiceImpl`) — giữ nguyên cách đó khi mở
  rộng chat để tránh lệch cấu hình ObjectMapper.

## Sau khi sửa

- Chạy `./mvnw -q compile` (tối thiểu) trước khi báo xong; có test liên quan thì `./mvnw test`.
- Endpoint mới/đổi → cập nhật [../docs/api.md](../docs/api.md) và model TypeScript ở mobile/web nếu
  DTO thay đổi.
