# Theo dõi tiến độ dự án — SRAS

> Quy ước: `- [x] Hạng mục (YYYY-MM-DD)` = đã hoàn thành, ngày trong ngoặc là ngày hoàn thành
> (lấy theo ngày commit/merge vào nhánh). `- [ ] Hạng mục` = chưa làm / đang làm.
> Khi hoàn thành một hạng mục: đổi `[ ]` → `[x]` và thêm `(ngày hoàn thành)` ngay bên cạnh.

Cập nhật lần cuối: 2026-10-12

---

## 0. Khởi tạo dự án

- [x] Khởi tạo monorepo `backend/`, `mobile/`, `web/` (2026-09-13)
- [x] Thiết kế entity/model ban đầu + trường giấy tờ gara (2026-09-13)
- [x] Tài liệu kiến trúc `docs/architecture.md` + lược đồ CSDL `docs/database.dbml` (2026-10-12)
- [x] File theo dõi tiến độ `docs/progress.md` (2026-10-12)
- [x] Tài liệu `docs/database.md`, `docs/api.md`, `docs/business-rules.md`, `docs/setup.md` (2026-10-12)
- [x] README gốc + viết lại README backend / mobile / web admin (2026-10-12)
- [x] Rules cho AI: `CLAUDE.md` gốc + `backend/`, `mobile/sras/`, `web/admin/` (2026-10-12)

## 1. Xác thực & tài khoản

- [x] Đăng ký / đăng nhập bằng mật khẩu, JWT access + refresh token (2026-09-14)
- [x] Gửi OTP qua email (Gmail SMTP) (2026-09-16)
- [x] Đăng nhập Google cho khách hàng qua Clerk (token-exchange) (2026-09-18)
- [x] Hoàn tất SĐT + OTP cho tài khoản Google mới (`google-phone`) (2026-09-18)
- [x] Quên mật khẩu / đặt lại mật khẩu (2026-09-15)
- [x] Sửa phiên đăng nhập, tự refresh token trên mobile (2026-09-20)
- [x] Sửa lỗi xác minh OTP (2026-09-30)
- [x] Hồ sơ người dùng, sửa hồ sơ, đổi mật khẩu (2026-09-18)
- [ ] Dọn endpoint cũ `/api/auth/google/*` (không còn dùng)
- [ ] Rotate Clerk secret key đã từng bị lộ
- [ ] Bỏ secret thật khỏi giá trị mặc định trong `application.yml` (Clerk secret key, eSMS key) + rotate
- [ ] Chặn quyền `/api/users/**` và `POST/PUT/DELETE` `/api/services/**`, `/api/service-categories/**` (đang công khai, chỉ admin được gọi)

## 2. Khách hàng (mobile)

- [x] Quản lý xe của khách (`/api/customer-vehicles`, chọn xe khi tạo đơn) (2026-09-30)
- [x] Chọn vị trí sự cố bằng bản đồ Goong + autocomplete + reverse geocode (2026-09-23)
- [x] Tạo yêu cầu cứu hộ 3 bước (vị trí → mô tả + ảnh → theo dõi) (2026-09-23)
- [x] Theo dõi realtime vị trí xe cứu hộ + lộ trình Goong Directions + ETA (2026-09-23)
- [x] Redesign màn tracking (bottom sheet, stepper, chia sẻ) + hủy đơn thật (2026-09-26)
- [x] Tab Hoạt động: đơn đang diễn ra & lịch sử (2026-09-23)
- [x] Duyệt báo giá từ nhân viên (`rescue-quote`) (2026-10-11)
- [x] Thanh toán chuyển khoản (mock) qua `POST /{id}/pay` (2026-09-30)
- [x] Đăng ký làm đối tác gara + chọn vị trí gara trên bản đồ (2026-09-18)
- [ ] Nút "Sử dụng vị trí hiện tại" nối GPS thật ở màn chọn vị trí
- [ ] Màn đánh giá sau thanh toán (`RATED`)

## 3. Chủ gara (mobile)

- [x] Đăng ký gara lần đầu + admin duyệt hồ sơ (2026-09-18)
- [x] Quản lý nhân viên gara (tạo tài khoản nhân viên) (2026-09-22)
- [x] Cấu hình dịch vụ & bảng giá, hồ sơ gara (2026-09-26)
- [x] Popup nhận cuốc kiểu Grab + gán nhân viên & xe cứu hộ (2026-09-26)
- [x] Quản lý xe cứu hộ (thêm/xóa, ảnh xe) (2026-09-30)
- [x] Màn đơn hàng: chờ nhận / đang xử lý / lịch sử, từ chối đơn (2026-09-30)
- [x] Chi tiết đơn read-only (bản đồ, stepper, gọi khách/nhân viên) (2026-09-27)
- [x] Dashboard gara dùng số liệu thật (nhân viên, đơn, doanh thu) (2026-09-27)
- [ ] Ví gara (`wallet.tsx` đang là giao diện tĩnh, chưa nối API)
- [ ] Rút tiền (`withdrawal_requests`) + lịch sử giao dịch ví (`wallet_transactions`)

## 4. Nhân viên gara (mobile)

- [x] Danh sách nhiệm vụ + cập nhật trạng thái (xuất phát / đã đến) (2026-09-27)
- [x] Lịch sử cứu hộ của nhân viên (2026-09-30)
- [x] Hồ sơ nhân viên, sửa hồ sơ, đổi mật khẩu (2026-10-06)
- [x] Tạo báo giá theo từng khoản (`create-quote`, `POST /{id}/quote`) (2026-10-11)
- [x] Tiến độ sửa chữa → hoàn thành (`repair-progress`) (2026-10-11)
- [x] Xác nhận thu tiền mặt (`POST /{id}/confirm-cash`) (2026-09-30)
- [x] Nhân viên tự đẩy GPS (`StaffLocationPusher`) (2026-10-11)

## 5. Luồng cứu hộ (backend)

- [x] Tạo đơn + điều phối gara gần nhất (haversine, bán kính 15km, `DispatchOffer`) (2026-09-26)
- [x] Gara nhận đơn (khóa lạc quan `@Version`) / từ chối đơn (2026-09-26)
- [x] Gán nhân viên + xe → `ASSIGNED` (2026-09-26)
- [x] Cập nhật trạng thái + vị trí realtime (`/status`, `/location`) (2026-09-26)
- [x] Hủy đơn bởi khách (`/cancel`) (2026-09-26)
- [x] Báo giá chi tiết (`rescue_request_items`) (2026-10-11)
- [x] Thanh toán tiền mặt / chuyển khoản (mock) → `PAID` (2026-09-30)
- [x] Cấu hình giá cứu hộ cho admin (`/api/admin/pricing-config`) (2026-10-11)
- [ ] Endpoint gửi đánh giá (`Rating`) → `RATED`
- [ ] Job quét offer hết hạn (offer `SENT` hiện không tự hết hạn)
- [x] Tính hoa hồng (commission) theo % admin đặt cho gara (2026-09-26)
- [ ] Tính thuế khấu trừ trên đơn
- [ ] Chỉ cho thanh toán (`/pay`, `/confirm-cash`) khi đơn đã hoàn thành
- [ ] Báo giá lại dùng soft delete thay vì xóa cứng `rescue_request_items`
- [ ] Tích hợp cổng thanh toán thật (payOS/VNPay…) thay mock
- [ ] Sửa tại xưởng (`RepairTicket`) khi kéo xe về gara
- [ ] Phí di chuyển ① tính theo km đường đi trên bản đồ (Goong Direction), fallback haversine
- [ ] Bỏ quyền ghi đè `rescueFee` / `inspectionFee` của gara trong `/quote`
- [ ] Gara cấu hình giá kéo xe ② (phí mở cửa + đơn giá/km) → tính `quoted_towing_fee`
- [ ] Báo giá ③: dịch vụ trong danh mục lấy giá từ `garage_service_prices`, dòng ngoài danh mục gắn nhãn
- [ ] Khách duyệt báo giá từng dòng (`APPROVED`/`REJECTED`); từ chối toàn bộ → tổng = ①

## 6. Chat & thông báo

- [x] Thông báo trong app (`/api/notifications`, đã đọc / đọc tất cả) (2026-09-18)
- [x] WebSocket sự kiện theo người dùng `/ws/users` (2026-09-18)
- [x] Chat realtime 1-1 theo đơn (khách ↔ chủ gara ↔ nhân viên) qua `/ws/chat` + REST (2026-09-30)
- [x] Hộp thư chat dùng chung cho các vai trò (2026-10-01)
- [ ] Read-receipt / đang gõ / badge tin chưa đọc
- [ ] Gọi miễn phí (VoIP)
- [ ] Push notification (Expo push) khi app ở nền

## 7. Web admin

- [x] Đăng nhập admin (Google) + phân quyền `ADMIN` (2026-09-23)
- [x] Quản lý người dùng (khóa/mở, cảnh cáo, audit log) (2026-09-18)
- [x] Quản lý & duyệt gara (2026-09-18)
- [x] Danh mục & menu dịch vụ (2026-09-18)
- [x] Quản lý kỹ thuật viên (thống kê, khóa, điều chuyển) (2026-10-06)
- [x] Cài đặt hệ thống (cấu hình giá cứu hộ) (2026-10-11)
- [x] Sửa giao diện admin (2026-10-11)
- [ ] Dashboard thống kê doanh thu / đơn cứu hộ toàn hệ thống
- [ ] Quản lý đơn cứu hộ & xử lý khiếu nại
- [ ] Duyệt yêu cầu rút tiền của gara

## 8. Hạ tầng & chất lượng

- [x] Upload & phục vụ file tĩnh `/uploads/**` (2026-09-18)
- [x] Sửa lỗi upload / hiển thị file (2026-10-06)
- [ ] Unit test / integration test cho luồng cứu hộ
- [ ] Chuyển `ddl-auto=update` sang migration (Flyway/Liquibase)
- [ ] Trợ lý AI chẩn đoán sự cố (`ai_messages`)
- [ ] Triển khai (deploy) backend + build app phát hành
