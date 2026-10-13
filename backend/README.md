# SRAS Backend

REST API + WebSocket cho hệ thống SRAS, xây dựng bằng **Java 17 + Spring Boot 3.2.5** (Maven).

## Công nghệ

- Spring Web (MVC), Spring Data JPA, Spring WebSocket, Spring Mail, Actuator
- Spring Security + JWT (jjwt 0.12.6) — xác thực stateless (access 15′ + refresh 7 ngày)
- Spring OAuth2 Resource Server — verify token Clerk (đăng nhập Google cho khách)
- PostgreSQL trên Supabase (runtime), H2 (test)
- Bean Validation, Lombok
- Tích hợp: Clerk, eSMS.vn (SMS/OTP), Gmail SMTP (email/OTP)

## Yêu cầu

- JDK 17+ (không cần cài Maven — dùng `mvnw` kèm sẵn)
- Một database PostgreSQL (khuyến nghị Supabase Session pooler; xem `.env.example`)

## Cấu hình

Copy `.env.example` → `.env` (cùng thư mục `backend/`, đã git-ignore) rồi điền giá trị. Spring đọc
file này qua `spring.config.import` trong [application.yml](src/main/resources/application.yml);
ở production dùng biến môi trường của hệ điều hành.

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | `localhost:5432/sras`, `postgres` | Kết nối PostgreSQL |
| `DB_POOL_MAX` / `DB_POOL_MIN` | `15` / `3` | HikariCP pool |
| `JPA_DDL_AUTO` | `update` | Hibernate tự tạo/cập nhật bảng (prod nên `validate`) |
| `JPA_SHOW_SQL` | `false` | In SQL ra log |
| `JWT_SECRET` | khóa dev | Khóa ký JWT, base64 ≥ 32 byte — **bắt buộc đổi ở prod** |
| `JWT_EXPIRATION_MS` | `900000` (15′) | Hạn access token |
| `JWT_REFRESH_EXPIRATION_MS` | `604800000` (7 ngày) | Hạn refresh token |
| `JWT_REGISTRATION_TICKET_MS` | `900000` (15′) | Vé đăng ký tạm (luồng Google/Clerk) |
| `CLERK_SECRET_KEY` / `CLERK_ISSUER` / `CLERK_JWKS_URI` | — | Clerk (đăng nhập Google) |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USERNAME` / `MAIL_PASSWORD` | Gmail SMTP | Gửi email OTP |
| `ESMS_API_KEY` / `ESMS_SECRET_KEY` / `ESMS_BRANDNAME` / `ESMS_SANDBOX` | — | Gửi SMS OTP qua eSMS.vn |
| `SERVER_PORT` | `8080` | Cổng chạy |
| `LOG_LEVEL` | `INFO` | Log level của `com.sras.backend` |

Hướng dẫn đầy đủ: [../docs/setup.md](../docs/setup.md).

> ⚠️ `ddl-auto=update` không thêm được cột **NOT NULL** vào bảng đã có dữ liệu → mọi query bảng đó lỗi
> 500. Cột mới phải nullable hoặc có default (xem [../docs/database.md](../docs/database.md)).

## Chạy

```powershell
# Chạy dev
./mvnw spring-boot:run
# Windows: run.bat — giống trên nhưng ép UTF-8 cho console (log tiếng Việt không lỗi font)

# Chạy với profile local (copy application-local.yml.example → application-local.yml)
./mvnw spring-boot:run -D spring-boot.run.profiles=local

# Chạy test (dùng H2, không cần PostgreSQL)
./mvnw test

# Đóng gói jar
./mvnw clean package
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

Dữ liệu mẫu: [scripts/seed-test-vehicles.sql](scripts/seed-test-vehicles.sql).

## Kiểm tra nhanh

- `GET /api/ping` — endpoint công khai, trả về trạng thái service
- `GET /actuator/health` — health check

## Cấu trúc package (`com.sras.backend`)

```
config/       SecurityConfig, WebSocketConfig, WebMvcConfig, DatabaseConstraintFixer
security/     JwtService, JwtAuthenticationFilter, ClerkTokenVerifier
controller/   REST controllers — trả ApiResponse<T> { success, message, data }
service/      interface nghiệp vụ + service/impl/ triển khai
repository/   Spring Data JPA repositories
entity/       JPA entities (BaseEntity / AppendOnlyEntity) + entity/enums/
dto/          dto/request (input + validation) · dto/response (output)
websocket/    ChatWebSocketHandler (/ws/chat: chat + sự kiện cuộc gọi), UserWebSocketHandler (/ws/users), AuthHandshakeInterceptor, WsJson
exception/    GlobalExceptionHandler + BadRequest/Unauthorized/ResourceNotFound...
```

## Tài liệu

- API: [../docs/api.md](../docs/api.md)
- CSDL: [../docs/database.md](../docs/database.md)
- Luật nghiệp vụ: [../docs/business-rules.md](../docs/business-rules.md)
- Quy ước code: [CLAUDE.md](CLAUDE.md)
