## rules

Luôn Luôn Sử dụng tiếng Việt để trả lời

---

## Tổng quan dự án

**SRAS — Smart Roadside Assistance System**: nền tảng cứu hộ xe. Khách gửi yêu cầu (khẩn cấp hoặc chọn đích
danh gara) → hệ thống chấm điểm & điều phối gara → gara nhận đơn, gán nhân viên + xe → nhân viên di chuyển
(dẫn đường), chẩn đoán, báo giá, sửa/kéo xe → thanh toán (tiền mặt / payOS) → đánh giá. Kèm ví gara + rút tiền
thật qua payOS, chống bom đơn (cọc 50.000đ), trợ lý AI (Gemini), chat + gọi thoại trong app.

Monorepo gồm 3 phần dùng chung 1 backend:

| Thư mục        | Công nghệ                                                    | Người dùng                 | Rules riêng                                    |
| -------------- | ------------------------------------------------------------ | -------------------------- | ---------------------------------------------- |
| `backend/`     | Java 17, Spring Boot **3.2.5**, Maven, PostgreSQL (Supabase) | —                          | [backend/CLAUDE.md](backend/CLAUDE.md)         |
| `mobile/sras/` | Expo SDK **58**, React Native 0.88, expo-router, TypeScript  | Khách, chủ gara, nhân viên | [mobile/sras/CLAUDE.md](mobile/sras/CLAUDE.md) |
| `web/admin/`   | React 19, Vite 8, Tailwind 4, TypeScript                     | Admin                      | [web/admin/CLAUDE.md](web/admin/CLAUDE.md)     |

Vai trò (`UserRole`): `CUSTOMER`, `GARAGE_OWNER`, `GARAGE_STAFF` (mobile) · `ADMIN` (web admin).

## Tài liệu dự án

Đọc tài liệu liên quan **trước khi** sửa code ở phần đó:

- [docs/architecture.md](docs/architecture.md) — kiến trúc tổng thể, bảo mật, realtime, vòng đời đơn
- [docs/database.md](docs/database.md) / [docs/database.dbml](docs/database.dbml) — lược đồ CSDL, quy ước bảng, enum
- [docs/api.md](docs/api.md) — danh sách REST endpoint + WebSocket, quyền truy cập
- [docs/business-rules.md](docs/business-rules.md) — luật nghiệp vụ: điều phối, trạng thái, giá, báo giá, thanh toán
- [docs/setup.md](docs/setup.md) — cài đặt & chạy dự án, biến môi trường
- [docs/progress.md](docs/progress.md) — theo dõi tiến độ dự án

## Lệnh thường dùng

```bash
# Backend (cổng 8080)
cd backend && ./mvnw spring-boot:run        # Windows: run.bat (ép UTF-8 cho console)
cd backend && ./mvnw test                   # test chạy trên H2

# Mobile
cd mobile/sras && npx expo start -c         # -c BẮT BUỘC sau khi sửa .env
cd mobile/sras && npm run lint

# Web admin (cổng 5173)
cd web/admin && npm run dev
cd web/admin && npm run build && npm run lint
```

## Rules chung

### Ngôn ngữ & giao tiếp

- Trả lời, comment giải thích nghiệp vụ, thông báo lỗi hiển thị cho người dùng (`message` trong
  `ApiResponse`, text UI) đều bằng **tiếng Việt**. Tên biến/hàm/class bằng tiếng Anh.

### Bảo mật & bí mật

- **Không bao giờ commit `.env`** (đã ignore). Thêm biến mới → cập nhật `.env.example` tương ứng +
  [docs/setup.md](docs/setup.md).
- **Không đặt secret thật làm giá trị mặc định** trong `application.yml` (`${VAR:default}`) hay trong
  code. Biến `EXPO_PUBLIC_*` / `VITE_*` được bundle vào client → chỉ để key public. (Hiện còn vi phạm:
  `GOONG_API_KEY` — xem [docs/progress.md](docs/progress.md) §1.)
- Endpoint mới phải xác định rõ quyền: công khai thì thêm vào `PUBLIC_ENDPOINTS` trong `SecurityConfig`
  một cách có chủ đích; khu admin dùng `@PreAuthorize("hasRole('ADMIN')")`.
- Code đụng tới **tiền thật** (thanh toán payOS, ví, rút tiền) đọc kỹ
  [docs/business-rules.md §6–§7](docs/business-rules.md) và rules tiền trong
  [backend/CLAUDE.md](backend/CLAUDE.md) trước khi sửa.

### Đồng bộ giữa các phần

- Đổi entity/DTO/enum ở backend → cập nhật kiểu tương ứng ở `mobile/sras/src/models/` và
  `web/admin/src/models/` (2 bộ model đang mirror entity backend).
- Đổi endpoint → cập nhật [docs/api.md](docs/api.md). Đổi bảng/cột → cập nhật
  [docs/database.md](docs/database.md). Đổi luật nghiệp vụ → cập nhật
  [docs/business-rules.md](docs/business-rules.md).

### Git

- Nhánh: `main` (ổn định) ← `develop` (tích hợp) ← `sprint-<n>/feature/<ten-tinh-nang>` (kebab-case),
  ví dụ `sprint-1/feature/chat-realtime`. Sửa lỗi: `sprint-<n>/fix/<ten-loi>`.
- Commit message dạng Conventional Commits: `feat(mobile): ...`, `fix(backend): ...`,
  `docs: ...`, `chore: ...` — scope là `backend` | `mobile` | `web` | `docs`.
- Không commit `target/`, `node_modules/`, `.expo/`, file log, file upload thử nghiệm.
- Không được tự commit/push.
- Bạn sẽ commit/push bằng terminal.

## Theo dõi tiến độ

- Sau khi hoàn thành một tính năng/hạng mục, **cập nhật [docs/progress.md](docs/progress.md)**:
  đổi `- [ ]` thành `- [x]` và ghi ngày hoàn thành dạng `(YYYY-MM-DD)` ngay bên cạnh,
  ví dụ: `- [x] Màn đánh giá sau thanh toán (2026-10-15)`.
- Hạng mục mới phát sinh thì thêm `- [ ] ...` vào đúng nhóm; cập nhật dòng "Cập nhật lần cuối".
