# SRAS — Smart Roadside Assistance System

Nền tảng **cứu hộ xe**: khách gặp sự cố gửi yêu cầu → hệ thống điều phối tới gara gần nhất → gara nhận
đơn, phân công nhân viên + xe cứu hộ → nhân viên di chuyển (khách theo dõi realtime), chẩn đoán, báo
giá, sửa tại chỗ hoặc kéo xe → thanh toán → đánh giá.

## Thành phần

| Thư mục | Mô tả | Công nghệ |
|---------|-------|-----------|
| [backend/](backend/) | REST API + WebSocket | Java 17, Spring Boot 3.2.5, PostgreSQL (Supabase) |
| [mobile/sras/](mobile/sras/) | App cho khách hàng, chủ gara, nhân viên gara | Expo 57, React Native, TypeScript |
| [web/admin/](web/admin/) | Trang quản trị cho admin | React 19, Vite, Tailwind CSS 4 |
| [docs/](docs/) | Tài liệu kiến trúc, CSDL, API, nghiệp vụ, tiến độ | Markdown, DBML |

```
Mobile (Khách / Chủ gara / Nhân viên) ──┐                 ┌── Web admin (Admin)
                                        ▼                 ▼
                         Backend Spring Boot  (REST /api/**, WS /ws/**)
                                        │
          PostgreSQL (Supabase) · Clerk · eSMS · Gmail SMTP · Goong Maps
```

## Bắt đầu nhanh

```bash
# 1. Backend — cần backend/.env (copy từ .env.example)
cd backend && ./mvnw spring-boot:run            # http://localhost:8080/api/ping

# 2. Mobile — cần mobile/sras/.env
cd mobile/sras && npm install && npx expo start -c

# 3. Web admin — cần web/admin/.env
cd web/admin && npm install && npm run dev      # http://localhost:5173
```

Hướng dẫn chi tiết (biến môi trường, chạy trên điện thoại thật, xử lý lỗi thường gặp):
**[docs/setup.md](docs/setup.md)**.

## Tài liệu

| Tài liệu | Nội dung |
|----------|----------|
| [docs/architecture.md](docs/architecture.md) | Kiến trúc tổng thể, bảo mật, realtime, vòng đời đơn |
| [docs/database.md](docs/database.md) · [database.dbml](docs/database.dbml) | Lược đồ CSDL & quy ước |
| [docs/api.md](docs/api.md) | Danh sách REST endpoint & WebSocket |
| [docs/business-rules.md](docs/business-rules.md) | Luật nghiệp vụ: điều phối, trạng thái, giá, thanh toán |
| [docs/setup.md](docs/setup.md) | Cài đặt & chạy dự án |
| [docs/progress.md](docs/progress.md) | Theo dõi tiến độ |

## Quy trình làm việc

- Nhánh: `main` ← `develop` ← `sprint-<n>/feature/<ten-tinh-nang>`.
- Commit theo Conventional Commits: `feat(mobile): ...`, `fix(backend): ...`, `docs: ...`.
- Quy ước code từng phần: [CLAUDE.md](CLAUDE.md), [backend/CLAUDE.md](backend/CLAUDE.md),
  [mobile/sras/CLAUDE.md](mobile/sras/CLAUDE.md), [web/admin/CLAUDE.md](web/admin/CLAUDE.md).
- Hoàn thành hạng mục → đánh dấu `[x] (YYYY-MM-DD)` trong [docs/progress.md](docs/progress.md).
