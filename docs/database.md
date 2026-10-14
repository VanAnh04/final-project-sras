# Cơ sở dữ liệu — SRAS

> Tài liệu mô tả schema **thực tế đang chạy** (sinh từ các JPA entity trong
> `backend/src/main/java/com/sras/backend/entity/`). Sơ đồ ERD trực quan (bản thiết kế) nằm ở
> [database.dbml](database.dbml); kiến trúc tổng thể ở [architecture.md](architecture.md).

Cập nhật: 2026-10-13 · DBMS: **PostgreSQL** (Supabase) · ORM: Spring Data JPA / Hibernate

---

## 1. Tổng quan & quy ước

- **33 bảng**, sinh tự động bởi Hibernate với `spring.jpa.hibernate.ddl-auto=update`
  (xem [application.yml](../backend/src/main/resources/application.yml)). Không dùng Flyway/Liquibase.
  Môi trường chạy `JPA_DDL_AUTO=validate` (production) phải tạo bảng mới bằng tay trước khi deploy — ví dụ
  [`backend/scripts/create-call-sessions.sql`](../backend/scripts/create-call-sessions.sql).
  > ⚠️ Vì `ddl-auto=update`: thêm cột **NOT NULL** mới vào bảng **đã có dữ liệu** sẽ KHÔNG được tạo
  > cột → mọi truy vấn bảng đó lỗi 500. Khi thêm cột NOT NULL dùng `columnDefinition` có `default`
  > (như `users.is_phone_verified`, `garages.auto_accept`) hoặc migrate tay.
- **Khóa chính**: `id bigserial` (`GenerationType.IDENTITY`).
- **Tiền**: `BIGINT`, đơn vị **VNĐ**. **Thời điểm**: `timestamptz` (`OffsetDateTime`).
  **Tọa độ**: `float8` (`Double`). **Số thập phân**: `numeric(p,s)` (`BigDecimal`).
- **Enum** lưu dạng **VARCHAR** (`@Enumerated(EnumType.STRING)`) — cấm native enum của PostgreSQL;
  giá trị hợp lệ liệt kê ở [§4](#4-enum). Xem [enums/](../backend/src/main/java/com/sras/backend/entity/enums/).
- **Hai lớp cột chung** (mapped superclass):

| Lớp cơ sở | Cột chung | Áp dụng cho |
|-----------|-----------|-------------|
| [`BaseEntity`](../backend/src/main/java/com/sras/backend/entity/BaseEntity.java) | `id`, `created_at`, `updated_at`, `is_deleted` (soft delete) | bảng nghiệp vụ tiêu chuẩn |
| [`AppendOnlyEntity`](../backend/src/main/java/com/sras/backend/entity/AppendOnlyEntity.java) | `id`, `created_at` | bảng **chỉ ghi thêm**: `rescue_status_history`, `location_tracks`, `wallet_transactions`, `audit_logs`, `ai_messages`, `chat_messages` |

- Thời gian do Hibernate quản lý (`@CreationTimestamp` / `@UpdateTimestamp`).
- **Soft delete**: bảng nghiệp vụ không xóa cứng, đặt `is_deleted = true`.
- **Khóa lạc quan** (`@Version version bigint`): `garages`, `rescue_requests` — chống hai gara
  cùng nhận một đơn.

Các bảng con dưới đây **không liệt kê lại** cột chung của lớp cơ sở.

---

## 2. Bản đồ nhóm bảng (9 nhóm, 33 bảng)

| # | Nhóm | Bảng |
|---|------|------|
| 1 | Định danh | `users`, `refresh_tokens`, `device_tokens`, `otp_codes` |
| 2 | Khách hàng | `customer_vehicles` |
| 3 | Gara | `garages`, `garage_documents`, `garage_staff`, `rescue_vehicles` |
| 4 | Danh mục & giá | `service_categories`, `services`, `garage_service_prices`, `rescue_pricing_config` |
| 5 | Đơn cứu hộ | `rescue_requests`, `rescue_request_photos`, `rescue_status_history`, `dispatch_offers`, `rescue_request_items` |
| 6 | Bản đồ | `location_tracks`, `route_snapshots` |
| 7 | Sửa chữa tại xưởng | `repair_tickets` |
| 8 | Tiền | `wallet_transactions`, `withdrawal_requests`, `payments` |
| 9 | Khác | `ratings`, `complaints`, `ai_conversations`, `ai_messages`, `notifications`, `audit_logs`, `chat_messages`, `call_sessions`, `stored_files` |

---

## 3. Chi tiết bảng

### Nhóm 1 — Định danh

#### `users` — mọi người dùng, phân biệt bằng `role`
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| phone | varchar(15), NN | Định danh đăng nhập. **UNIQUE** `uq_users_phone` |
| password_hash | varchar(72), NN | BCrypt |
| full_name | varchar(100), NN | |
| email | varchar(150) | OTP/khôi phục mật khẩu, thông báo |
| avatar_url | text | |
| role | varchar(20), NN | `UserRole` |
| status | varchar(20), NN = ACTIVE | `UserStatus` |
| debt_amount | bigint, NN = 0 | Công nợ VNĐ; > 0 ⇒ chặn đặt đơn |
| is_blocked_by_debt | boolean, NN = false | |
| is_phone_verified | boolean, NN = false | Xác minh SĐT qua OTP |
| last_login_at | timestamptz | |

#### `refresh_tokens` — refresh token xoay vòng (ADR-06)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| user_id | FK → users, NN | **CASCADE** khi xóa user |
| token_hash | varchar(64), NN | SHA-256, idx `idx_refresh_tokens_hash` |
| expires_at | timestamptz, NN | |
| revoked_at | timestamptz | |
| replaced_by_id | FK → refresh_tokens | Token thay thế khi xoay vòng |
| user_agent | varchar(255) | |

#### `device_tokens` — thiết bị nhận FCM
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| user_id | FK → users, NN | **CASCADE** khi xóa user |
| fcm_token | varchar(255), NN, UNIQUE | |
| platform | varchar(10), NN | `DevicePlatform` (ANDROID · IOS) |
| last_used_at | timestamptz, NN | |

#### `otp_codes` — mã OTP đăng ký / quên mật khẩu *(có trong code, không có trong DBML)*
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| phone | varchar(15), NN | idx `idx_otp_codes_phone` |
| code | varchar(6), NN | |
| expires_at | timestamptz, NN | |
| used | boolean, NN = false | |
| wrong_attempts | integer, NN = 0 | Chống dò |
| locked_until | timestamptz | Khóa tạm khi sai nhiều |

### Nhóm 2 — Khách hàng

#### `customer_vehicles` — "garage cá nhân", khách tự khai
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| customer_id | FK → users, NN | role CUSTOMER |
| vehicle_type | varchar(10), NN | `VehicleType` (CAR · MOTORBIKE) |
| brand | varchar(50), NN | |
| model | varchar(50) | |
| license_plate | varchar(15) | |
| color | varchar(30) | |
| year | smallint | |
| photo_url | varchar(500) | |
| is_default | boolean, NN = false | Xe mặc định khi tạo đơn |

### Nhóm 3 — Gara

#### `garages` — hồ sơ gara + **hai ví** (ADR-18)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| owner_user_id | FK → users, NN, UNIQUE | 1–1, role GARAGE_OWNER |
| name | varchar(150), NN | |
| phone | varchar(15), NN | Hotline |
| address | varchar(255), NN | |
| lat / lng | float8, NN | idx `idx_garages_lat_lng` |
| capability | varchar(10), NN | `Capability` (CAR · MOTORBIKE · BOTH) |
| status | varchar(20), NN = PENDING | `GarageStatus` |
| rejection_reason | varchar(500) | |
| commission_rate | numeric(4,2) = 15.0 | % hoa hồng của gara |
| is_online | boolean, NN = false | Chủ gara bật tay |
| auto_accept | boolean, NN = false | Tự nhận đơn |
| credit_balance | bigint, NN = 0 | **Ví tín dụng** — nạp vào, không rút |
| cash_balance | bigint, NN = 0 | **Ví tiền mặt** — thu nhập đơn chuyển khoản, rút được |
| bank_code / bank_account_number / bank_name / bank_account_holder | varchar | Thông tin rút tiền (VietQR) |
| avg_rating | numeric(2,1), NN = 0 | |
| rating_count | integer, NN = 0 | |
| cancel_rate | numeric(4,3), NN = 0 | Tỉ lệ hủy sau khi nhận |
| total_orders | integer, NN = 0 | |
| approved_at | timestamptz | |
| version | bigint, NN = 0 | `@Version` khóa lạc quan |

Chỉ mục tổ hợp: `idx_garages_status_online_capability (status, is_online, capability)`.

#### `garage_documents` — giấy tờ hồ sơ đăng ký
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| garage_id | FK → garages, NN | |
| doc_type | varchar(30), NN | `GarageDocType` |
| file_url | text, NN | |
| note | varchar(255) | Ghi chú admin khi duyệt |

#### `garage_staff` — nhân viên gara
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| garage_id | FK → garages, NN | |
| user_id | FK → users, NN | role GARAGE_STAFF. UNIQUE `(garage_id, user_id)` |
| staff_code | varchar(20) | |
| status | varchar(10), NN = FREE | `WorkStatus` (FREE · BUSY), hệ thống tự đặt |
| is_active | boolean, NN = true | |

#### `rescue_vehicles` — xe cứu hộ của gara
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| garage_id | FK → garages, NN | |
| license_plate | varchar(15), NN | |
| vehicle_kind | varchar(20), NN | `RescueVehicleKind` (TOW_TRUCK · MOTORBIKE · VAN) |
| capability | varchar(10), NN | `Capability` |
| registration_url | varchar(500) | |
| image_url | varchar(500) | |
| status | varchar(10), NN = FREE | `WorkStatus` |
| is_active | boolean, NN = true | |

### Nhóm 4 — Danh mục & giá

#### `service_categories` — nhóm dịch vụ (admin định nghĩa)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| name | varchar(100), NN | |
| code | varchar(50), NN, UNIQUE | UPPER_SNAKE_CASE |
| vehicle_type | varchar(10), NN | `Capability` |
| display_order | smallint, NN = 0 | |
| is_active | boolean, NN = true | |

#### `services` — dịch vụ chuẩn + khung giá
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| category_id | FK → service_categories, NN | |
| name | varchar(150), NN | |
| code | varchar(50), NN, UNIQUE | |
| fee_type | varchar(20), NN | `FeeType` (RESCUE_FEE ① · TOWING_FEE ② · SERVICE_FEE ③) |
| min_price / max_price | bigint, NN | Khung giá min–max admin đặt |
| unit | varchar(20) | `ServiceUnit` (LAN · KM) |
| is_active | boolean, NN = true | |

#### `garage_service_prices` — giá khoản ③ riêng của gara
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| garage_id | FK → garages, NN | UNIQUE `(garage_id, service_id)` |
| service_id | FK → services, NN | |
| price | bigint, NN | Phải nằm trong [min_price, max_price] |
| is_active | boolean, NN = false | |
| distance_tiers_json | text | Bậc giá theo km (JSON) |
| night_surge_enabled / night_surge_percent | boolean / integer | Phụ phí ban đêm |
| holiday_surge_enabled / holiday_surge_percent | boolean / integer | Phụ phí dịp lễ |

#### `rescue_pricing_config` — cấu hình tính cước di chuyển ① (admin, toàn hệ thống)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| vehicle_type | varchar(10), NN, UNIQUE | `VehicleType` |
| fee_per_km_day / fee_per_km_night | bigint, NN | Cước/km ngày / đêm |
| min_fee | bigint, NN = 0 | Cước sàn |
| free_km | bigint, NN = 0 | Km miễn phí đầu |
| night_start_hour/minute, night_end_hour/minute | smallint, NN | Khung giờ đêm (mặc định 22:00–06:00) |
| holiday_surge_enabled | boolean, NN = false | |
| holiday_surcharge_pct | smallint, NN = 0 | |
| display_note | varchar(255) | |
| updated_by_user_id | bigint | |

### Nhóm 5 — Đơn cứu hộ

#### `rescue_requests` — **bảng trung tâm của hệ thống** (state machine: [architecture.md §6](architecture.md))
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| code | varchar(20), NN, UNIQUE | VD `RQ20260805-0042` |
| customer_id | FK → users, NN | |
| customer_vehicle_id | FK → customer_vehicles | Null nếu khách chỉ chụp ảnh |
| vehicle_type | varchar(10), NN | `VehicleType` — lọc gara |
| symptom | varchar(1000), NN | Mô tả sự cố |
| issue_type | varchar(30) | Phân loại sự cố |
| contact_phone | varchar(20) | SĐT liên hệ tại hiện trường |
| ai_conversation_id | FK → ai_conversations | Hội thoại AI đính kèm |
| pickup_lat / pickup_lng | float8, NN | Vị trí đón |
| pickup_address | varchar(255) | Reverse-geocode Goong |
| location_note | varchar(255) | VD "hầm B2 tòa X" |
| payment_method | varchar(20), NN | `RequestPaymentMethod` (CASH · BANK_TRANSFER) |
| status | varchar(25), NN = DRAFT | `RescueStatus` (17 giá trị) |
| garage_id | FK → garages | Điền khi ACCEPTED |
| staff_id | FK → garage_staff | Điền khi ASSIGNED |
| rescue_vehicle_id | FK → rescue_vehicles | Điền khi ASSIGNED |
| search_radius_km | smallint, NN = 15 | Mở rộng còn 30 (E-01) |
| is_radius_expanded | boolean, NN = false | Chỉ mở rộng một lần |
| dispatch_distance_km | numeric(6,2) | Bản chụp quãng đường Goong |
| rescue_fee | bigint | **Khoản ①** — chốt khi gara nhận |
| quoted_towing_fee / towing_fee | bigint | **Khoản ②** dự kiến / thực tế (kéo xe) |
| service_fee | bigint | **Khoản ③** = tổng dòng APPROVED phase=ONSITE |
| total_amount | bigint | ① + ② + ③ |
| commission_rate / commission_amount | numeric(4,3) / bigint | Hoa hồng (bản chụp) |
| tax_rate / tax_amount | numeric(4,3) / bigint | Thuế (bản chụp) |
| cancel_reason | varchar(500) | |
| cancelled_by | varchar(20) | `CancelledBy` (CUSTOMER · GARAGE · SYSTEM) |
| is_cancel_fee_charged | boolean, NN = false | Có thu ① khi hủy không |
| en_route_at, en_route_lat, en_route_lng | timestamptz / float8 | Mốc tính phí hủy + GPS bằng chứng |
| rescuer_lat, rescuer_lng, rescuer_location_at | float8 / timestamptz | Vị trí mới nhất của người cứu hộ |
| arrived_at, completed_at, paid_at | timestamptz | Các mốc thời gian |
| version | bigint, NN = 0 | `@Version` — chống hai gara cùng nhận |

Chỉ mục: `idx_rescue_requests_customer_created (customer_id, created_at DESC)`,
`idx_rescue_requests_garage_status (garage_id, status)`.

#### `rescue_request_photos` — ảnh đính kèm đơn
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| request_id | FK → rescue_requests, NN | |
| photo_url | varchar(500), NN | |
| photo_type | varchar(20), NN = CUSTOMER_ISSUE | `PhotoType` |
| uploaded_by | FK → users, NN | |

#### `rescue_status_history` — *(chỉ ghi thêm)* lịch sử chuyển trạng thái
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| request_id | FK → rescue_requests, NN | |
| from_status | varchar(25) | Null với dòng đầu |
| to_status | varchar(25), NN | `RescueStatus` |
| changed_by_user_id | FK → users | Null nếu do job hệ thống |
| actor_type | varchar(20), NN | `ActorType` |
| note | varchar(500) | |

#### `dispatch_offers` — lời mời gara (mỗi lời mời một dòng)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| request_id | FK → rescue_requests, NN | UNIQUE `(request_id, garage_id)` |
| garage_id | FK → garages, NN | |
| rank | smallint, NN | Thứ tự mời (gara khách chọn = 1) |
| distance_km | numeric(6,2), NN | Goong Distance Matrix |
| eta_minutes | smallint | |
| quoted_fee | bigint, NN | Bản chụp giá ① |
| quoted_towing_fee | bigint, NN = 0 | ② dự kiến |
| estimated_obligation | bigint, NN = 0 | Hoa hồng + thuế dự kiến (lọc ví) |
| status | varchar(15), NN = PENDING | `OfferStatus` |
| sent_at / expires_at / responded_at | timestamptz | `expires_at` = sent_at + 60s |
| reject_reason | varchar(255) | |

Chỉ mục quan trọng nhất (job quét mỗi 5s): `idx_dispatch_offers_expires_status (expires_at, status)`.

#### `rescue_request_items` — báo giá khoản ③ (khách duyệt từng dòng)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| request_id | FK → rescue_requests, NN | idx `(request_id, status)` |
| service_id | FK → services | Null = gara nhập tay |
| name_snapshot | varchar(150), NN | Bản chụp tên hạng mục |
| unit_price_snapshot | bigint, NN | Bản chụp đơn giá |
| quantity | smallint, NN = 1 | |
| amount | bigint, NN | = unit_price × quantity |
| phase | varchar(15), NN = ONSITE | `ItemPhase` (ONSITE → service_fee · AT_GARAGE → repair_tickets.total_amount) |
| status | varchar(15), NN = PENDING | `ItemStatus` (chỉ APPROVED mới cộng tiền) |
| created_by_user_id | FK → users, NN | Chủ/nhân viên gara lập |
| responded_at | timestamptz | Lúc khách duyệt/từ chối |

### Nhóm 6 — Bản đồ

#### `location_tracks` — *(chỉ ghi thêm)* vết GPS người cứu hộ
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| request_id | FK → rescue_requests, NN | idx `(request_id, recorded_at)` |
| staff_id | FK → garage_staff, NN | |
| lat / lng | float8, NN | Ghi khi dịch chuyển > 20 m |
| accuracy_m / speed_kmh | smallint | |
| recorded_at | timestamptz, NN | Thời điểm thiết bị ghi |

#### `route_snapshots` — lộ trình (1–1 với đơn)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| request_id | FK → rescue_requests, NN, UNIQUE | 1–1 |
| suggested_polyline / actual_polyline | text | Goong Directions / dồn từ location_tracks |
| static_map_url | varchar(500) | Goong Static Map |
| total_distance_km | numeric(6,2) | |
| duration_minutes | smallint | |

### Nhóm 7 — Sửa chữa tại xưởng

#### `repair_tickets` — phiếu sửa (1–1 với đơn được kéo về)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| code | varchar(20), NN, UNIQUE | VD `RT20260829-0087` |
| rescue_request_id | FK → rescue_requests, NN, UNIQUE | 1–1, tự sinh khi xe về xưởng |
| garage_id | FK → garages, NN | |
| customer_id | FK → users, NN | |
| status | varchar(20), NN = RECEIVED | `RepairTicketStatus` (7 giá trị) |
| received_at | timestamptz, NN | |
| done_at / delivered_at | timestamptz | |
| total_amount | bigint, NN = 0 | Tổng dòng APPROVED phase=AT_GARAGE (③, không hoa hồng) |

Chỉ mục: `idx_repair_tickets_garage_status (garage_id, status)`.

### Nhóm 8 — Tiền

#### `wallet_transactions` — *(chỉ ghi thêm)* sổ cái ví gara
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| garage_id | FK → garages, NN | idx `(garage_id, created_at DESC)` |
| wallet_type | varchar(10), NN | `WalletType` (CREDIT · CASH) |
| type | varchar(25), NN | `WalletTxnType` (8 giá trị) |
| amount | bigint, NN | Có dấu (+ cộng, − trừ) |
| balance_after | bigint, NN | Số dư của chính ví sau giao dịch |
| ref_type | varchar(20) | RESCUE_REQUEST · PAYMENT · WITHDRAWAL |
| ref_id | bigint | |
| description | varchar(255), NN | |
| created_by_user_id | FK → users | Null nếu do hệ thống |

Chỉ mục partial chống hoàn ví hai lần: `uq_wallet_txn_withdrawal_once (ref_id, type) WHERE ref_type = WITHDRAWAL`.

#### `withdrawal_requests` — lệnh rút tiền (chỉ từ ví tiền mặt)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| garage_id | FK → garages, NN | |
| amount | bigint, NN | ≥ 100.000, ≤ cash_balance |
| status | varchar(20), NN = PENDING | `WithdrawalStatus` (8 giá trị) |
| payout_mode | varchar(10), NN = MANUAL | `PayoutMode` (AUTO · MANUAL) |
| transfer_code | varchar(20), NN, UNIQUE | Nội dung CK dạng `RUT<id>` |
| bank_snapshot | varchar(255), NN | Bản chụp hiển thị |
| reviewed_by_user_id | FK → users | Admin xử lý |
| reviewed_at / reject_reason / transfer_proof_url | — | |
| idempotency_key | varchar(64), NN, UNIQUE | Hàng rào chống chi hai lần (INV-1) |
| payout_provider | varchar(20) | `PayoutProvider` (PAYOS · MOCK) |
| provider_payout_id | varchar(64), UNIQUE | Chống webhook gọi lặp |
| bank_bin_snapshot | varchar(10), NN | toBin VietQR gửi cổng |
| bank_account_number_snapshot | varchar(32), NN | toAccountNumber gửi cổng |
| payout_sent_at / payout_settled_at | timestamptz | |
| payout_attempt_count | smallint, NN = 0 | Số lần tra cứu trạng thái |
| payout_error_code / payout_error_message | varchar | Lỗi thô của cổng |
| provider_fee | bigint, NN = 0 | Phí chi hộ (nền tảng chịu) |
| needs_manual_review | boolean, NN = false | Cờ cho dashboard admin |

Chỉ mục: `uq_withdrawal_transfer_code`, `uq_withdrawal_idempotency_key`,
`uq_withdrawal_provider_payout_id`, `(status, created_at)`, `(garage_id, created_at DESC)`.

#### `payments` — chiều tiền vào qua payOS (đơn + nạp ví)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| payment_type | varchar(20), NN | `PaymentType` (RESCUE_ORDER · WALLET_TOPUP) |
| request_id | FK → rescue_requests | Với RESCUE_ORDER |
| garage_id | FK → garages | Với WALLET_TOPUP |
| paid_by_user_id | FK → users, NN | |
| amount | bigint, NN | |
| method | varchar(20), NN | `PaymentMethod` (CASH · PAYOS · MANUAL_TRANSFER) |
| status | varchar(15), NN = PENDING | `PaymentStatus` |
| provider_order_code | bigint, NN, UNIQUE | Hàng rào idempotent (orderCode payOS) |
| provider_txn_id | varchar(100), UNIQUE | paymentLinkId của cổng |
| provider_response_code | varchar(10) | |
| raw_callback | text | Payload webhook (cấm ghi log) |
| confirmed_by_user_id | FK → users | Admin xác nhận tay khi MANUAL_TRANSFER |
| paid_at | timestamptz | |

Chỉ mục: `uq_payments_provider_order_code`, `uq_payments_provider_txn`, `(status, created_at)`.

### Nhóm 9 — Khác

#### `ratings` — đánh giá hai chiều
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| request_id | FK → rescue_requests, NN | UNIQUE `(request_id, direction)` |
| direction | varchar(20), NN | `RatingDirection` |
| rater_user_id | FK → users, NN | |
| stars | smallint, NN | 1–5 |
| comment | varchar(1000) | |

#### `complaints` — khiếu nại
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| request_id | FK → rescue_requests | |
| created_by_user_id | FK → users, NN | |
| target_type | varchar(20), NN | `ComplaintTargetType` (GARAGE · CUSTOMER · PLATFORM) |
| content | varchar(2000), NN | |
| attachment_url | varchar(500) | |
| status | varchar(15), NN = OPEN | `ComplaintStatus` |
| resolution | varchar(2000) | Kết luận admin |
| handled_by_user_id | FK → users | |

#### `ai_conversations` — hội thoại trợ lý AI
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| customer_id | FK → users, NN | |
| vehicle_type | varchar(10) | `VehicleType` — ngữ cảnh prompt |
| title | varchar(150) | |
| issue_group | varchar(50) | Nhóm sự cố (thống kê) |
| converted_to_request | boolean, NN = false | |
| customer_last_read_at / staff_last_read_at | timestamptz | Mốc đã đọc |

#### `ai_messages` — *(chỉ ghi thêm)* tin nhắn hội thoại AI
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| conversation_id | FK → ai_conversations, NN | |
| role | varchar(10), NN | `AiRole` (USER · ASSISTANT · SYSTEM) |
| content | text, NN | |
| is_guardrail_blocked | boolean, NN = false | |
| blocked_topic | varchar(50) | |
| token_count | integer | Theo dõi quota |

#### `notifications` — thông báo trong app
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| user_id | FK → users, NN | idx `(user_id, is_read, created_at DESC)` |
| type | varchar(40), NN | `NotificationType` (14 giá trị) |
| title | varchar(150), NN | |
| body | varchar(500), NN | |
| ref_type | varchar(20) / ref_id bigint | Điều hướng trong app |
| is_read | boolean, NN = false | |
| sent_via_fcm | boolean, NN = false | |

#### `audit_logs` — *(chỉ ghi thêm)* nhật ký thao tác nhạy cảm
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| actor_user_id | FK → users | Null nếu hệ thống |
| action | varchar(50), NN | VD APPROVE_GARAGE, LOCK_USER |
| entity_type | varchar(30), NN | Tên bảng tác động |
| entity_id | bigint, NN | |
| before_value / after_value | text | JSON (cấm ghi mật khẩu/token/thẻ) |
| trace_id | varchar(36) | |
| ip_address | varchar(45) | |

#### `chat_messages` — *(chỉ ghi thêm; có trong code, không có trong DBML)* chat 1-1 theo đơn
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| rescue_request_id | FK → rescue_requests, NN | Chat gắn theo đơn cứu hộ |
| sender_id | FK → users, NN | Người gửi |
| recipient_id | FK → users, NN | Người nhận |
| content | text | Nội dung (null nếu chỉ gửi ảnh) |
| image_url | varchar(500) | |

> Gửi/lưu qua REST, đẩy realtime qua WebSocket `/ws/chat` — xem [architecture.md §4](architecture.md).

#### `call_sessions` — *(có trong code; bảng nghiệp vụ tiêu chuẩn)* nhật ký cuộc gọi thoại trong app
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| rescue_request_id | FK → rescue_requests, NN | Hai bên cùng tham gia đơn này; idx `(rescue_request_id)` |
| caller_id | FK → users, NN | Người gọi; idx `(caller_id, status)` |
| callee_id | FK → users, NN | Người nhận; idx `(callee_id, status)` |
| caller_role / callee_role | varchar(16), NN | Vai trong đơn: `CUSTOMER` · `GARAGE` · `STAFF` |
| status | varchar(16), NN | `CallStatus`; idx `(status)` |
| answered_at | timestamptz | Lúc người nhận nghe máy |
| ended_at | timestamptz | |
| duration_sec | integer | Giây nói chuyện (`answered_at → ended_at`); chỉ có khi cuộc gọi từng `ONGOING` |
| ended_by_id | FK → users | Người bấm kết thúc; null = hệ thống (hết giờ đổ chuông, mất kết nối, server khởi động lại) |

> Chỉ lưu nhật ký, **không** ghi âm, **không** lưu nội dung cuộc gọi. Báo hiệu qua REST `/api/calls` +
> WebSocket `/ws/chat` — xem [api.md §8](api.md), [business-rules.md §10](business-rules.md). Mỗi người chỉ có
> tối đa 1 cuộc gọi `RINGING`/`ONGOING` (kiểm ở service, không có ràng buộc DB).

#### `stored_files` — *(có trong code, không có trong DBML)* file nhị phân lưu trong DB
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| file_name | varchar(255), NN, UNIQUE | Tên sinh ra, dùng trong URL `/uploads/**` |
| original_name | varchar(255) | Tên gốc do người dùng tải lên |
| content_type | varchar(100), NN | MIME |
| file_size | bigint, NN | Byte |
| data | bytea, NN | **Nội dung file lưu thẳng trong PostgreSQL** |

---

## 4. Enum

Tất cả lưu VARCHAR qua `@Enumerated(EnumType.STRING)`
([enums/](../backend/src/main/java/com/sras/backend/entity/enums/)):

| Enum | Giá trị |
|------|---------|
| `UserRole` | CUSTOMER · GARAGE_OWNER · GARAGE_STAFF · ADMIN |
| `UserStatus` | ACTIVE · LOCKED |
| `DevicePlatform` | ANDROID · IOS |
| `VehicleType` | CAR · MOTORBIKE |
| `Capability` | CAR · MOTORBIKE · BOTH |
| `GarageStatus` | PENDING · APPROVED · REJECTED · SUSPENDED |
| `GarageDocType` | BUSINESS_LICENSE · OWNER_ID_CARD_FRONT · OWNER_ID_CARD_BACK · CRIMINAL_RECORD · GARAGE_PHOTO · VEHICLE_REGISTRATION |
| `WorkStatus` | FREE · BUSY |
| `RescueVehicleKind` | TOW_TRUCK · MOTORBIKE · VAN |
| `FeeType` | RESCUE_FEE · TOWING_FEE · SERVICE_FEE |
| `ServiceUnit` | LAN · KM |
| `RequestPaymentMethod` | CASH · BANK_TRANSFER |
| `RescueStatus` | DRAFT · SEARCHING · PENDING_GARAGE · NO_GARAGE_FOUND · ACCEPTED · ASSIGNED · EN_ROUTE · ARRIVED · DIAGNOSED · REPAIRING_ONSITE · TOWING · TOW_TO_GARAGE · DECLINED · COMPLETED · AWAITING_PAYMENT · PAID · RATED · CANCELLED |
| `OfferStatus` | PENDING · SENT · ACCEPTED · REJECTED · TIMEOUT · SKIPPED |
| `ItemPhase` | ONSITE · AT_GARAGE |
| `ItemStatus` | PENDING · APPROVED · REJECTED |
| `PhotoType` | CUSTOMER_ISSUE · STAFF_DIAGNOSIS · STAFF_COMPLETION |
| `ActorType` | CUSTOMER · GARAGE_OWNER · GARAGE_STAFF · ADMIN · SYSTEM |
| `CancelledBy` | CUSTOMER · GARAGE · SYSTEM |
| `RepairTicketStatus` | RECEIVED · INSPECTING · QUOTED · REPAIRING · QUOTE_REJECTED · DONE · DELIVERED |
| `WalletType` | CREDIT · CASH |
| `WalletTxnType` | TOPUP · COMMISSION_DEBIT · TAX_DEBIT · ORDER_CREDIT · WITHDRAWAL_HOLD · WITHDRAWAL_DONE · WITHDRAWAL_REFUND · ADJUSTMENT |
| `WithdrawalStatus` | PENDING · APPROVED · PAYOUT_SENDING · PAYOUT_PROCESSING · PAYOUT_UNCERTAIN · TRANSFERRED · REJECTED · FAILED |
| `PayoutMode` | AUTO · MANUAL |
| `PayoutProvider` | PAYOS · MOCK |
| `PaymentType` | RESCUE_ORDER · WALLET_TOPUP |
| `PaymentMethod` | CASH · PAYOS · MANUAL_TRANSFER |
| `PaymentStatus` | PENDING · SUCCESS · FAILED · CANCELLED |
| `RatingDirection` | CUSTOMER_TO_GARAGE · GARAGE_TO_CUSTOMER |
| `ComplaintTargetType` | GARAGE · CUSTOMER · PLATFORM |
| `ComplaintStatus` | OPEN · IN_REVIEW · RESOLVED · REJECTED |
| `AiRole` | USER · ASSISTANT · SYSTEM |
| `CallStatus` | RINGING · ONGOING · ENDED · MISSED · REJECTED · CANCELLED · FAILED |
| `NotificationType` | NEW_ORDER · ORDER_ACCEPTED · STAFF_EN_ROUTE · STAFF_ARRIVED · NEW_QUOTE · QUOTE_RESPONDED · REPAIR_DONE · WALLET_LOW · WITHDRAWAL_REVIEWED · WITHDRAWAL_TRANSFERRED · WITHDRAWAL_FAILED · PAYOUT_FUND_LOW · GARAGE_REVIEWED · SYSTEM_WARNING |

---

## 5. Khác biệt giữa schema thực tế (code) và bản thiết kế DBML

[database.dbml](database.dbml) là bản thiết kế (28–29 bảng). Schema do code sinh ra có **33 bảng**
và lệch một số điểm — khi hai nguồn mâu thuẫn, **code là nguồn đúng**:

- **Bảng có trong code, không có trong DBML**: `otp_codes`, `chat_messages`, `stored_files`.
  (`call_sessions` có ở cả hai.)
- **Cột thêm so với DBML**: `users.is_phone_verified`; `garages.commission_rate`,
  `garages.auto_accept`; `rescue_vehicles.image_url`; `garage_service_prices.distance_tiers_json`,
  `night_surge_*`, `holiday_surge_*`; `rescue_requests.issue_type`, `contact_phone`, `rescuer_lat`,
  `rescuer_lng`, `rescuer_location_at`; `ai_conversations.customer_last_read_at`, `staff_last_read_at`;
  `NotificationType.SYSTEM_WARNING`.
- **Kiểu khác**: `users.avatar_url`, `garage_documents.file_url` là `text` (DBML ghi varchar(500)).
- **Lưu trữ file**: DBML giả định URL Cloudinary; code lưu file nhị phân trong `stored_files.data`
  (bytea) và phục vụ qua `/uploads/**`.
- **Khóa ngoại / ON DELETE**: DBML mô tả ý đồ `ON DELETE RESTRICT` (CASCADE cho `refresh_tokens`,
  `device_tokens`). Code dùng `@ManyToOne` thuần + `ddl-auto=update` nên hành vi xóa thực tế phụ
  thuộc Hibernate; nghiệp vụ dựa vào **soft delete** (`is_deleted`) thay vì xóa cứng.
- Các bảng `garage_distance_prices`, `quotes`, `quote_items`, `contents` đã gỡ khỏi thiết kế và
  **không có** trong code.
