# Theo dõi tiến độ dự án — SRAS

> Quy ước: `- [x] Hạng mục (YYYY-MM-DD)` = đã hoàn thành, ngày trong ngoặc là ngày hoàn thành
> (lấy theo ngày commit/merge vào nhánh). `- [ ] Hạng mục` = chưa làm / đang làm.
> Khi hoàn thành một hạng mục: đổi `[ ]` → `[x]` và thêm `(ngày hoàn thành)` ngay bên cạnh.

Cập nhật lần cuối: 2026-11-13

---

## 0. Khởi tạo dự án

- [x] Khởi tạo monorepo `backend/`, `mobile/`, `web/` (2026-09-13)
- [x] Thiết kế entity/model ban đầu + trường giấy tờ gara (2026-09-13)
- [x] Tài liệu kiến trúc `docs/architecture.md` + lược đồ CSDL `docs/database.dbml` (2026-10-12)
- [x] File theo dõi tiến độ `docs/progress.md` (2026-10-12)
- [x] Tài liệu `docs/database.md`, `docs/api.md`, `docs/business-rules.md`, `docs/setup.md` (2026-10-12)
- [x] README gốc + viết lại README backend / mobile / web admin (2026-10-12)
- [x] Rules cho AI: `CLAUDE.md` gốc + `backend/`, `mobile/sras/`, `web/admin/` (2026-10-12)
- [x] Khôi phục `CLAUDE.md` + `docs/*.md` bị xóa ở merge `ab57f30` và cập nhật theo code hiện tại (2026-11-13)
- [ ] Cập nhật `docs/database.dbml` theo các bảng/cột mới (`action_otps`, `dispatch_configs`, `system_wallets`, cột cọc / bom đơn / chia sẻ vị trí…)

## 1. Xác thực & tài khoản

- [x] Đăng ký / đăng nhập bằng mật khẩu, JWT access + refresh token (2026-09-14)
- [x] Gửi OTP qua email (Gmail SMTP) (2026-09-16)
- [x] Đăng nhập Google cho khách hàng qua Clerk (token-exchange) (2026-09-18)
- [x] Hoàn tất SĐT + OTP cho tài khoản Google mới (`google-phone`) (2026-09-18)
- [x] Quên mật khẩu / đặt lại mật khẩu (2026-09-15)
- [x] Sửa phiên đăng nhập, tự refresh token trên mobile (2026-09-20)
- [x] Sửa lỗi xác minh OTP (2026-09-30)
- [x] Hồ sơ người dùng, sửa hồ sơ, đổi mật khẩu (2026-09-18)
- [x] Bỏ secret thật khỏi giá trị mặc định trong `application.yml` (Clerk secret key, eSMS key) (2026-10-15)
- [x] `/api/auth/update-profile` bắt đăng nhập, chỉ sửa hồ sơ của chính mình; đổi SĐT/email ghi `contact_changed_at` → khóa OTP tiền + rút tiền 24h (2026-11-03)
- [x] Gỡ đăng nhập Facebook, mở rộng nút Google trên web và mobile (2026-11-04)
- [ ] ⚠️ **Sửa `POST /api/auth/google/check`** (web admin): đang phát JWT cho bất kỳ email nào client gửi, không kiểm ID token Google → ai biết email admin là vào được quyền `ADMIN`. Sửa: gửi ID token từ Google Identity Services, backend verify chữ ký + `aud = GOOGLE_CLIENT_ID` rồi mới lấy email
- [ ] Rotate Clerk secret key + eSMS key đã từng bị lộ trong lịch sử git
- [ ] Bỏ Goong API key thật đang làm default (`application.yml` `GOONG_API_KEY` + `GoongRoutingServiceImpl`) và rotate
- [ ] Chặn quyền `/api/users/**` và `POST/PUT/DELETE` `/api/services/**` (gồm `/import`), `/api/service-categories/**` (đang công khai, chỉ admin được gọi)
- [ ] Chặn quyền `/api/ratings/admin/**` (đang cho mọi người đã đăng nhập xem / xóa đánh giá)
- [ ] Bắt đăng nhập cho `/api/ai/**` (đang công khai, ai cũng tiêu quota Gemini)

## 2. Khách hàng (mobile)

- [x] Quản lý xe của khách (`/api/customer-vehicles`, chọn xe khi tạo đơn) (2026-09-30)
- [x] Chọn vị trí sự cố bằng bản đồ Goong + autocomplete + reverse geocode (2026-09-23)
- [x] Nút định vị GPS "vị trí hiện tại" ở màn chọn vị trí (2026-10-11)
- [x] Tạo yêu cầu cứu hộ 3 bước (vị trí → mô tả + ảnh → theo dõi) (2026-09-23)
- [x] Theo dõi realtime vị trí xe cứu hộ + lộ trình Goong Directions + ETA (2026-09-23)
- [x] Redesign màn tracking (bottom sheet, stepper, chia sẻ) + hủy đơn thật (2026-09-26)
- [x] Tab Hoạt động: đơn đang diễn ra & lịch sử (2026-09-23)
- [x] Duyệt báo giá từ nhân viên (`rescue-quote`) (2026-10-11)
- [x] Thanh toán chuyển khoản (mock) qua `POST /{id}/pay` (2026-09-30)
- [x] Đăng ký làm đối tác gara + chọn vị trí gara trên bản đồ (2026-09-18)
- [x] Chọn dịch vụ + chọn đích danh gara (`rescue-garage-select`, `GET /api/garages/nearby`) (2026-10-13)
- [x] Màn đánh giá sau thanh toán (`RatingModal`) + gửi khiếu nại (`ComplaintModal`) (2026-10-13)
- [x] Thanh toán payOS (QR) + màn `payment` (2026-10-14)
- [x] Từ chối báo giá → chỉ trả phí di chuyển; chọn trả tiền mặt (`/select-cash`) (2026-10-14)
- [x] Trợ lý AI: chẩn đoán sự cố + chat (`ai-chat`, nút AI nổi), cảnh báo đoạn đường, nhập bằng giọng nói (2026-10-24)
- [x] Màn chi tiết gara (hồ sơ, đánh giá, dịch vụ) giúp khách chọn gara (2026-11-05)
- [x] Chia sẻ vị trí khách trong lúc nhân viên tới + theo dõi mượt (camera `watch`) (2026-11-08)
- [x] Kiểm cọc chống bom đơn theo tài khoản + mã thiết bị, nộp cọc 50.000đ qua payOS, giải trình khi bị báo bom (2026-11-10)
- [ ] Chia sẻ vị trí: thử trên máy thật; app xuống nền thì đang ngừng gửi

## 3. Chủ gara (mobile)

- [x] Đăng ký gara lần đầu + admin duyệt hồ sơ (2026-09-18)
- [x] Quản lý nhân viên gara (tạo tài khoản nhân viên) (2026-09-22)
- [x] Cấu hình dịch vụ & bảng giá, hồ sơ gara (2026-09-26)
- [x] Popup nhận cuốc kiểu Grab + gán nhân viên & xe cứu hộ (2026-09-26)
- [x] Quản lý xe cứu hộ (thêm/xóa, ảnh xe) (2026-09-30)
- [x] Màn đơn hàng: chờ nhận / đang xử lý / lịch sử, từ chối đơn (2026-09-30)
- [x] Chi tiết đơn read-only (bản đồ, stepper, gọi khách/nhân viên) (2026-09-27)
- [x] Dashboard gara dùng số liệu thật (nhân viên, đơn, doanh thu) (2026-09-27)
- [x] Gom polling đơn gara vào GarageOrdersContext, chỉ poll khi cần (2026-10-13)
- [x] Gỡ GarageLocationPusher — hết ghi đè vị trí nhân viên (2026-10-13)
- [x] Ví gara nối API: ví tín dụng / tiền mặt, nạp payOS, chuyển tiền mặt → tín dụng, lịch sử giao dịch (2026-10-15)
- [x] Rút tiền về ngân hàng: tài khoản nhận tiền + OTP SMS, rút tự động qua payOS kênh chi, lịch sử lệnh rút (backend 2026-10-28, app 2026-10-29)
- [x] Màn đánh giá của gara (`reviews`) (2026-11-05)
- [x] Báo khách bom đơn (chờ ≥ 10 phút tại hiện trường) (2026-11-06)
- [x] Dashboard hiện cảnh báo hệ thống từ admin + hướng dẫn khắc phục (`GarageSystemAlertsModal`) (2026-11-11)
- [ ] Rút tiền: thử trên máy thật; payOS kênh chi thật đang 403 do chưa whitelist IP (lệnh `RUT2` kẹt `PAYOUT_UNCERTAIN`, 2026-11-03)
- [ ] `transfer-to-credit` chưa idempotent phía server (mobile mới chặn bấm 2 lần)

## 4. Nhân viên gara (mobile)

- [x] Danh sách nhiệm vụ + cập nhật trạng thái (xuất phát / đã đến) (2026-09-27)
- [x] Lịch sử cứu hộ của nhân viên (2026-09-30)
- [x] Hồ sơ nhân viên, sửa hồ sơ, đổi mật khẩu (2026-10-06)
- [x] Tạo báo giá theo từng khoản (`create-quote`, `POST /{id}/quote`) (2026-10-11)
- [x] Tiến độ sửa chữa → hoàn thành (`repair-progress`) (2026-10-11)
- [x] Xác nhận thu tiền mặt (`POST /{id}/confirm-cash`) (2026-09-30)
- [x] Nhân viên tự đẩy GPS (`StaffLocationPusher`) (2026-10-11)
- [x] Báo giá đề xuất kéo xe về gara (`TOWING` → `TOW_TO_GARAGE`) + bổ sung hạng mục phát sinh (`/add-item`) (2026-10-14)
- [x] Ví nhân viên + nạp payOS (2026-10-14)
- [x] Dẫn đường kiểu Google Maps khi `EN_ROUTE` và `TOWING` (`src/navigation/`) (2026-11-08)
- [ ] Dẫn đường: banner hướng rẽ, giọng nói, chạy nền; thử trên máy thật
- [ ] `rescue-quote.tsx` có nhánh dự phòng đẩy thẳng đơn kéo xe sang `TOW_TO_GARAGE`, bỏ qua `TOWING` nên không có dẫn đường

## 5. Luồng cứu hộ (backend)

- [x] Tạo đơn + điều phối gara gần nhất (haversine, bán kính 15km, `DispatchOffer`) (2026-09-26)
- [x] Gara nhận đơn (khóa lạc quan `@Version`) / từ chối đơn (2026-09-26)
- [x] Gán nhân viên + xe → `ASSIGNED` (2026-09-26)
- [x] Cập nhật trạng thái + vị trí realtime (`/status`, `/location`) (2026-09-26)
- [x] Hủy đơn bởi khách (`/cancel`) (2026-09-26)
- [x] Báo giá chi tiết (`rescue_request_items`) (2026-10-11)
- [x] Thanh toán tiền mặt / chuyển khoản (mock) → `PAID` (2026-09-30)
- [x] Cấu hình giá cứu hộ cho admin (`/api/admin/pricing-config`) (2026-10-11)
- [x] Tính hoa hồng (commission) theo % admin đặt cho gara (2026-09-26)
- [x] Khách chọn đích danh gara (`garageId`) — gara từ chối / quá 90s thì `DECLINED` (2026-10-13)
- [x] Endpoint đánh giá `POST /api/ratings` + khiếu nại `/api/complaints` (2026-10-13)
- [x] Tích hợp payOS kênh thu (link QR, webhook, nạp ví gara / nhân viên) (2026-10-14)
- [x] Khách duyệt / từ chối báo giá (`/accept-quote`, `/decline-quote`), luồng kéo xe `TOWING` / `TOW_TO_GARAGE`, `/add-item` (2026-10-14)
- [x] Job quét lời mời hết hạn 90s → mời gara kế tiếp (`processExpiredDispatchOffers`) (2026-10-15)
- [x] Phí ① tính theo km đường bộ Goong Direction (fallback haversine × 1.3) + cước 3 bậc (2026-10-25)
- [x] Điều phối chấm điểm đa tiêu chí (cự ly, tải việc, sao, tỉ lệ nhận) + admin cấu hình trọng số (`/api/admin/dispatch-config`) (2026-10-25)
- [x] Webhook payOS kiểm chữ ký + hỏi lại payOS; cờ `PAYMENT_MOCK_TRANSFER_ENABLED` cho `/pay` (2026-10-27)
- [x] Rút tiền gara: `withdrawal_requests`, OTP thao tác (`action_otps`), hạn mức, khóa 24h, job đối soát, admin xử lý lệnh treo (2026-10-28)
- [x] Xếp gara gần (`/api/garages/nearby`) theo điểm điều phối giảm dần (2026-11-04)
- [x] Gara phải có ví tín dụng ≥ 500.000đ mới được mời / nhận đơn (2026-11-06)
- [x] Báo bom đơn, admin duyệt bồi hoàn xăng; tự bồi hoàn khi khách hủy lúc `EN_ROUTE` ≥ 3 phút (tối đa 2 lượt/tháng) (2026-11-06)
- [x] Lưu IP rồi mã thiết bị của khách khi tạo đơn (hiện trên trang admin) (2026-11-08)
- [x] Chia sẻ vị trí khách + điểm hẹn `meet_lat/lng` (2026-11-08)
- [x] Cọc 50.000đ chống bom đơn theo tài khoản + thiết bị (bật sau 2 bom được duyệt, gỡ sau 2 đơn cọc thành công), bảo lưu / chuyển gara / sàn giữ (2026-11-10)
- [ ] ⚠️ `POST /{id}/confirm-deposit` đặt cọc `PAID` mà không kiểm tiền — xóa endpoint hoặc chỉ cho chạy khi payOS đã xác nhận
- [ ] Chuyển đơn sang `RATED` khi khách gửi đánh giá (hiện `RATED` không có luồng nào chuyển tới)
- [ ] Tính thuế khấu trừ trên đơn
- [ ] Chỉ cho thanh toán (`/pay`, `/confirm-cash`, payOS) khi đơn đã hoàn thành
- [ ] `/quote` kiểm trạng thái hiện tại (đang cho đẩy đơn ở bất kỳ trạng thái nào về `DIAGNOSED`)
- [ ] Báo giá lại dùng soft delete thay vì xóa cứng `rescue_request_items`
- [ ] Sửa tại xưởng (`RepairTicket`) khi kéo xe về gara (bảng có, chưa có luồng)
- [ ] Bỏ quyền ghi đè `rescueFee` / `inspectionFee` của gara trong `/quote`
- [ ] Gara cấu hình giá kéo xe ② (phí mở cửa + đơn giá/km) → tính `quoted_towing_fee`
- [ ] Báo giá ③: dịch vụ trong danh mục lấy giá từ `garage_service_prices`, dòng ngoài danh mục gắn nhãn
- [ ] Khách duyệt báo giá từng dòng (`APPROVED`/`REJECTED`) — hiện duyệt cả gói
- [ ] Gara khách chọn bật auto-accept nhưng thiếu nhân viên / xe rảnh → tạo đơn lỗi 400 (nên báo khách chọn gara khác)
- [ ] Sửa N+1 trong toResponse cho API danh sách + phân trang lịch sử

## 6. Chat & thông báo

- [x] Thông báo trong app (`/api/notifications`, đã đọc / đọc tất cả) (2026-09-18)
- [x] WebSocket sự kiện theo người dùng `/ws/users` (2026-09-18)
- [x] Chat realtime 1-1 theo đơn (khách ↔ chủ gara ↔ nhân viên) qua `/ws/chat` + REST (2026-09-30)
- [x] Hộp thư chat dùng chung cho các vai trò (2026-10-01)
- [ ] Read-receipt / đang gõ / badge tin chưa đọc
- [x] Backend gọi thoại trong app: báo hiệu REST `/api/calls` + sự kiện `CALL_*` qua `/ws/chat`, bảng `call_sessions`, `CallSweeper`, push cuộc gọi đến / nhỡ, cấp STUN/TURN — E2E 117/117 (2026-10-13)
- [ ] Gọi miễn phí (VoIP) trên mobile: đã code xong (callManager, màn đổ chuông, engine WebRTC trong WebView, nút "Gọi miễn phí" ở 4 màn), lint/tsc đạt; **đã gọi và nói chuyện được trên iPhone (2026-10-13)** (màn gọi dùng `Modal presentationStyle="overFullScreen"` để WebView ẩn không bị iOS coi là không hiển thị) — **còn chờ test trên Android thật** (checklist trong `plan/call-realtime.md`, Phần 1 và Phần 5; xong thì tick mục này và xóa file plan)
- [ ] Gọi 4G ↔ Wi-Fi: dựng TURN (coturn hoặc dịch vụ) — xem [setup.md §2.1](setup.md)
- [ ] Nhận cuộc gọi khi app ở nền / đã tắt (CallKit / ConnectionService, PushKit VoIP)
- [ ] Chuyển loa trong / loa ngoài khi đang gọi
- [ ] Hiện lịch sử cuộc gọi (nhỡ, thời lượng) trong khung chat
- [ ] ICE restart khi đổi mạng giữa cuộc gọi (Wi-Fi ↔ 4G)
- [ ] Scale nhiều instance backend cho gọi thoại / chat (Redis pub/sub, trạng thái online dùng chung)
- [x] Merge `develop` vào `call-realtime`: giữ UI xử lý đơn của nhân viên trong `garage-staff/home.tsx` (kèm nút gọi miễn phí), sửa lỗi biên dịch backend (`ChatServiceImpl`, `RescueRequestServiceImpl`), khử thông báo gửi trùng (nhận đơn / hoàn thành / báo giá), khôi phục thông báo "Khách đã duyệt báo giá" khi duyệt qua `acceptQuote`, cho gọi miễn phí ở trạng thái `TOW_TO_GARAGE`; thêm `RescueNotifierTest` (2026-10-14)
- [ ] Cho gọi lại ở `TOW_TO_GARAGE`: trạng thái này đã mất khỏi `CallServiceImpl.CALLABLE` sau các lần merge (hiện có `PAID` thay vào)
- [x] Thông báo cho chủ gara + nhân viên khi khách từ chối báo giá (`RescueNotifier.quoteDeclined`) (2026-10-15)
- [x] Push notification (Expo push) cho mọi thông báo lưu DB (`PushService.sendAfterCommit`) + điều hướng khi bấm (2026-10-15)
- [x] Thông báo realtime trên header web admin (2026-11-04)
- [ ] Thống nhất thông báo thanh toán PayOS (`PayOSServiceImpl` đang tự gửi loại `REPAIR_DONE`) về `PAYMENT_RECEIVED` qua `RescueNotifier`
- [ ] Đẩy sự kiện RESCUE_UPDATED qua WebSocket thay polling

## 7. Web admin

- [x] Đăng nhập admin (Google) + phân quyền `ADMIN` (2026-09-23)
- [x] Quản lý người dùng (khóa/mở, cảnh cáo, audit log) (2026-09-18)
- [x] Quản lý & duyệt gara (2026-09-18)
- [x] Danh mục & menu dịch vụ (2026-09-18)
- [x] Quản lý kỹ thuật viên (thống kê, khóa, điều chuyển) (2026-10-06)
- [x] Cài đặt hệ thống (cấu hình giá cứu hộ) (2026-10-11)
- [x] Sửa giao diện admin (2026-10-11)
- [x] Trang khiếu nại + trang đánh giá (2026-10-13)
- [x] Trang tài chính (tổng quan ví hệ thống, giao dịch) (2026-10-14)
- [x] Nhập / xuất danh mục dịch vụ bằng Excel (2026-10-14)
- [x] Cấu hình trọng số điều phối trong Cài đặt (2026-10-25)
- [x] Báo cáo thống kê 4 trụ cột: vận hành (SLA, hủy, phễu), tài chính (doanh thu, phương thức thanh toán), sự cố (loại, giờ cao điểm, bản đồ điểm nóng Goong), đối tác (xếp hạng gara / kỹ thuật viên) (2026-10-28)
- [x] Nhận định AI (Gemini) cho từng trụ cột (2026-11-04)
- [x] Redesign header + dashboard, số liệu hôm nay (2026-11-04)
- [x] Cấu hình dịch vụ của gara theo danh mục + quản lý đánh giá (2026-11-05)
- [x] Cảnh báo gara rủi ro / số dư thấp + gửi thông báo cho gara từ trang báo cáo (2026-11-06)
- [x] Hiện IP / mã thiết bị của khách trong chi tiết đơn (2026-11-07)
- [ ] Trang xử lý lệnh rút bị cắm cờ (`/api/admin/withdrawals`: xem, đối soát, `resolve`) — backend có, web chưa có UI
- [ ] `POST /api/admin/finance/sync-bank` đang trả kết quả cố định, chưa đối soát payOS thật
- [ ] Gom các call API trong trang vào `src/api/<domain>Api.ts` (nhiều trang vẫn gọi `axiosClient` trực tiếp)

## 8. Hạ tầng & chất lượng

- [x] Upload & phục vụ file tĩnh `/uploads/**` (2026-09-18)
- [x] Sửa lỗi upload / hiển thị file (2026-10-06)
- [x] Bảng test case `unit_test.xlsx` cho `createRequest` (10 ca), `cancelByCustomer` (8 ca), `updateRescuerLocation` (10 ca, 3 ca fail — DFID001, DFID002), `getRequest` xem hạng mục báo giá — sheet `view-item-quote` (8 ca, đều pass), `sendMessage` chat realtime theo đơn (đẩy WebSocket + push khi offline) — sheet `chat-realtime` (10 ca, đều pass), `getStaffActive` nhân viên xem đơn đang được gán — sheet `view-assign-rescue` (9 ca, đều pass), `getRequest` xem vị trí khách + vị trí xe cứu hộ — sheet `view-to-user-location` (10 ca, 1 ca fail — DFID003), `advanceStatus` nhân viên xuất phát / đã đến vị trí khách — sheet `navigate-to-user-location` (10 ca, 3 ca fail — DFID001, DFID002, DFID004), `acceptQuote` khách đồng ý đề xuất kéo xe về gara (→ `TOWING`) hoặc sửa tại chỗ — sheet `handle-tow-to-garage-flow` (9 ca, 2 ca fail — DFID005), `advanceStatus` cập nhật trạng thái đơn (chẩn đoán / sửa tại chỗ / hoàn thành) — sheet `update-rescue-status` (10 ca, 2 ca fail — DFID001, DFID002), `RescueNotifier.offerSent` chủ gara nhận thông báo yêu cầu cứu hộ mới (lưu + push) — sheet `receive-rescue-notification` (9 ca, đều pass), `getRequest` xem chi tiết đơn cứu hộ (quyền xem + thông tin khách/xe/gara/nhân viên/đánh giá/ảnh/phí) — sheet `view-rescue-order-details` (10 ca, đều pass), `garageAccept` / `garageDecline` chủ gara nhận / từ chối đơn — sheet `accept-reject-rescue-order` (10 ca, 1 ca fail — DFID006), `assignStaff` chủ gara gán nhân viên + xe cứu hộ — sheet `assign-rescue-to-employee` (10 ca, 1 ca fail — DFID007), `GarageStaffServiceImpl.getStaffList` chủ gara xem trạng thái nhân viên (rảnh/bận, đơn đang làm, đơn xong hôm nay, đánh giá) — sheet `view-employee-status` (8 ca, đều pass); đã chạy JUnit/Mockito để lấy kết quả rồi xóa file test (2026-10-15)
- [x] Rà soát lại `unit_test.xlsx` theo docs/business-rules.md: làm lại sheet `track-employee-location` (kỳ vọng theo luật "phía gara", thêm ca biên ASSIGNED/REPAIRING_ONSITE, ca khách của đơn), chỉnh precondition/ca biên của `create_rescue_request`, `cancel-rescue-request`, `view-item-quote`; chạy lại test thật (2026-10-15)
- [x] Bảng test case `unit_test.xlsx` cho `UserServiceImpl.getUserById` admin xem tài khoản người dùng — sheet `view-user-account` (9 ca, đều pass); thêm log `View user account ... success` / `... failed: user ... not found` vào hàm (2026-10-16)
- [x] Bảng test case `unit_test.xlsx` cho `UserServiceImpl.updateUserStatus` admin khóa / mở tài khoản người dùng (lưu trạng thái, ghi audit log `UPDATE_STATUS`, báo web admin qua `/ws/users`) — sheet `lock-user-account` (8 ca, đều pass) (2026-10-16)
- [x] Bảng test case `unit_test.xlsx` cho `GarageStaffServiceImpl.getStaffStatsForAdmin` admin xem dashboard hệ thống (đếm kỹ thuật viên TOTAL / ACTIVE / FREE / BUSY / INACTIVE, bỏ nhân viên đã xóa mềm) — sheet `view-system-dashboard` (7 ca, đều pass) (2026-10-16)
- [x] Bảng test case `unit_test.xlsx` cho `GarageServiceImpl.getGarages` admin xem danh sách gara đang hoạt động (lọc `status` = APPROVED, tìm theo tên/SĐT/địa chỉ, phân trang) — sheet `view-active-garage-list` (9 ca, 1 ca fail — DFID008) (2026-10-16)
- [x] Bảng test case `unit_test.xlsx` cho `RatingServiceImpl.getAdminRatings` admin xem đánh giá của khách (lọc gara / nhân viên / số sao / từ khóa, phân trang; lấy nhân viên của đơn khi đánh giá không gắn nhân viên) — sheet `view-user-review` (8 ca, đều pass) (2026-10-16)
- [x] Bảng test case `unit_test.xlsx` cho `RescueRequestServiceImpl.getRequest` khách / nhân viên xem trạng thái đơn cứu hộ qua từng giai đoạn (SEARCHING → ACCEPTED → EN_ROUTE → DIAGNOSED → COMPLETED, CANCELLED) — sheet `view-rescue-status` (10 ca, đều pass) (2026-10-16)
- [x] Chuẩn hóa nhóm Log message trong `unit_test.xlsx`: thay `No log message is written` / chuỗi log thô bằng câu mô tả hành vi bắt đầu bằng động từ (vd. `Return 404 when rescue request does not exist`) cho cả 16 sheet; skill `unit-test-excel` đã cập nhật quy tắc (2026-10-16)
- [x] Nâng mobile lên Expo SDK 58 / React Native 0.88 / React 19.3; sửa tab bar expo-router 58 (bỏ `href: null`) (2026-11-04)
- [ ] Sửa ~65 lỗi `tsc` của mobile do types RN 0.88 (StatusBar `backgroundColor`, ref TextInput/ScrollView, props WebView) — ghi nhận 2026-11-03, chưa kiểm lại
- [ ] Bỏ `Dimensions.get()` ở cấp module trong `customer/index.tsx`, `customer/garage-detail.tsx`, `customer/rescue-tracking.tsx`, `garage-owner/wallet.tsx`, `garage-staff/home.tsx` (đổi sang `useWindowDimensions()`)
- [ ] Sửa DFID001: `assertGarageSideAccess` cho mọi nhân viên không được gán vào đơn (cùng gara hoặc gara khác) đẩy vị trí và xuất phát (`advanceStatus`, sheet `navigate-to-user-location` UTCID08; sheet `update-rescue-status` UTCID06 — nhân viên gara khác bấm hoàn thành) — trái luật "phía gara = chủ gara của đơn hoặc nhân viên được gán"
- [ ] Sửa DFID002: `assertGarageSideAccess` cho khách của đơn đi qua → khách đẩy được vị trí xe cứu hộ và tự bấm "nhân viên xuất phát" (`advanceStatus`, sheet `navigate-to-user-location` UTCID07; sheet `update-rescue-status` UTCID08 — khách tự bấm hoàn thành đơn)
- [ ] Sửa DFID003: `assertCanView` cho chủ gara từng có lời mời nhưng đơn đã thuộc gara khác vẫn xem được báo giá/đơn, kể cả vị trí khách và vị trí xe cứu hộ (docs chỉ cho "chủ gara của đơn") — fail ở sheet `view-to-user-location` UTCID10
- [ ] Sửa DFID004: `advanceStatus` return sớm khi `from == target` trước khi kiểm tra quyền → người lạ đã đăng nhập gửi trạng thái trùng trạng thái hiện tại là nhận lại toàn bộ thông tin đơn (tên/SĐT khách, điểm đón) — fail ở sheet `navigate-to-user-location` UTCID10; sửa gọn: kiểm tra quyền trước khối `if (from == target)`
- [ ] Sửa DFID005: `acceptQuote` không kiểm tra trạng thái đơn → khách gọi được trên đơn `AWAITING_PAYMENT` (đã từ chối báo giá) hoặc `PAID` và đơn bị mở lại thành `TOWING`/`REPAIRING_ONSITE`, dòng báo giá `REJECTED` bị đổi thành `APPROVED`, ghi thêm lịch sử + báo gara — fail ở sheet `handle-tow-to-garage-flow` UTCID08, UTCID09; sửa gọn: chỉ cho duyệt khi đơn `DIAGNOSED`, ngược lại ném `BadRequestException("Không thể chuyển từ X sang Y")` như `advanceStatus`; `declineQuote` cũng chưa kiểm tra trạng thái, nên sửa cùng chỗ
- [ ] Sửa DFID006: `garageDecline` không kiểm tra lời mời của gara còn `SENT` → gara đã từ chối (lời mời `REJECTED`) bấm từ chối lần nữa thì hệ thống mời thêm gara kế tiếp trong khi gara trước vẫn đang giữ lời mời `SENT` → 2 gara cùng giữ lời mời, phá điều phối tuần tự — fail ở sheet `accept-reject-rescue-order` UTCID10; sửa gọn: thêm `if (offer.getStatus() != OfferStatus.SENT) throw new BadRequestException("Lời mời đã hết hiệu lực hoặc đã được xử lý")` như `garageAccept`
- [ ] Sửa DFID007: `assignStaff` không kiểm tra xe cứu hộ có phù hợp loại phương tiện của đơn → gán được xe chỉ chở xe máy (`capability = MOTORBIKE`) cho đơn ô tô, trong khi lúc mời/nhận đơn đều kiểm tra `capabilityMatches` — fail ở sheet `assign-rescue-to-employee` UTCID10; sửa gọn: thêm `if (!capabilityMatches(vehicle.getCapability(), req.getVehicleType())) throw new BadRequestException("Xe cứu hộ không phù hợp với loại phương tiện (Ô tô/Xe máy)")` sau kiểm tra xe bận
- [ ] Sửa DFID008: `getGarages` không lọc gara đã xóa mềm (`GarageServiceImpl.getGarages` dùng `findByStatus` / `findAll` / `searchGaragesWithKeyword` không có điều kiện `isDeleted = false`) → danh sách gara của admin vẫn hiện gara `is_deleted = true`, trái quy ước "query lọc ...AndIsDeletedFalse" — fail ở sheet `view-active-garage-list` UTCID08; sửa gọn: đổi sang `findByStatusAndIsDeletedFalse(status, pageable)` / `findByIsDeletedFalse(pageable)` và thêm `AND g.isDeleted = false` vào query `searchGaragesWithKeyword`
- [ ] Unit test / integration test cho các bước còn lại của luồng cứu hộ (báo giá, thanh toán, cọc, bom đơn, rút tiền)
- [ ] Khôi phục `backend/scripts/` (`create-call-sessions.sql`, `seed-test-vehicles.sql`) bị mất sau merge — xem [setup.md §2](setup.md)
- [ ] Chuyển `ddl-auto=update` sang migration (Flyway/Liquibase)
- [x] Trợ lý AI chẩn đoán sự cố (Gemini, nhiều key xoay vòng, kho kiến thức, luật dự phòng) (2026-10-24)
- [ ] Lưu hội thoại AI vào `ai_conversations` / `ai_messages` (bảng có, chưa ghi)
- [ ] Bảng `location_tracks` không còn được ghi (vị trí chỉ ghi đè trên `rescue_requests`) — quyết định giữ vết GPS hay bỏ bảng
- [ ] Triển khai (deploy) backend + build app phát hành
