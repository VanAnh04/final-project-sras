# SRAS Backend

REST API cho hệ thống SRAS, xây dựng bằng **Java 17 + Spring Boot 4.1.1** (Maven).

## Công nghệ

- Spring Web (MVC), Spring Data JPA
- PostgreSQL (runtime), H2 (test)
- Spring Security + JWT (jjwt) — xác thực stateless
- Bean Validation, Lombok, Spring Boot Actuator

## Yêu cầu

- JDK 17+ (không cần cài Maven — dùng `mvnw` kèm sẵn)
- PostgreSQL đang chạy (mặc định `localhost:5432`, database `sras`)

## Cấu hình

App đọc cấu hình từ biến môi trường (có giá trị mặc định cho dev) trong
[src/main/resources/application.yml](src/main/resources/application.yml):

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `DB_URL` | `jdbc:postgresql://localhost:5432/sras` | JDBC URL |
| `DB_USERNAME` | `postgres` | User DB |
| `DB_PASSWORD` | `postgres` | Mật khẩu DB |
| `JWT_SECRET` | (khóa dev, **phải đổi ở production**) | Khóa ký JWT, base64 |
| `JWT_EXPIRATION_MS` | `86400000` | Hạn access token (24h) |
| `SERVER_PORT` | `8080` | Cổng chạy |

Cho cấu hình máy cá nhân: copy `application-local.yml.example` → `application-local.yml`
(đã được git-ignore) rồi chạy với profile `local`.

## Chạy

```powershell
# Chạy dev
./mvnw spring-boot:run

# Chạy với profile local
./mvnw spring-boot:run -D spring-boot.run.profiles=local

# Chạy test (dùng H2, không cần PostgreSQL)
./mvnw test

# Đóng gói jar
./mvnw clean package
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

## Kiểm tra nhanh

- `GET /api/ping` — endpoint công khai, trả về trạng thái service
- `GET /actuator/health` — health check

## Cấu trúc package (`com.sras.backend`)

```
config/       # SecurityConfig (JWT, stateless)
security/     # JwtService, JwtAuthenticationFilter
controller/   # REST controllers (HealthController)
```

Các package `service/`, `repository/`, `entity/`, `dto/` thêm dần khi phát triển tính năng.
