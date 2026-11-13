# Luật nghiệp vụ — SRAS

> Các luật nghiệp vụ **đang được code thực thi** (chủ yếu trong `backend/.../service/impl/`:
> `RescueRequestServiceImpl`, `DispatchScoringServiceImpl`, `RescuePricingConfigServiceImpl`, `PayOSServiceImpl`,
> `WithdrawalServiceImpl`, `ComplaintServiceImpl`). Đổi luật trong code → cập nhật file này. Endpoint tương ứng:
> [api.md](api.md).
> Luật đã chốt nhưng code chưa theo kịp được gắn nhãn **(chưa code)**. Chỗ code đang làm sai luật gắn ⚠️ (mã
> `DFIDxxx` là lỗi đã ghi trong [progress.md §8](progress.md)).

Cập nhật: 2026-11-13

---

## 1. Vai trò & quyền trên một đơn

| Vai trò | Được làm gì với đơn cứu hộ |
|---------|-----------------------------|
| **Khách** (`CUSTOMER`) | Tạo đơn (khẩn cấp hoặc chọn đích danh gara), nộp cọc, xem đơn của mình, hủy (trước khi nhân viên tới nơi), chia sẻ vị trí, duyệt / từ chối báo giá, chọn trả tiền mặt, thanh toán payOS, đánh giá, khiếu nại, giải trình khi bị báo bom đơn |
| **Chủ gara** (`GARAGE_OWNER`) | Nhận/từ chối lời mời, gán nhân viên + xe, theo dõi, báo bom đơn; được làm mọi việc của nhân viên trên đơn của gara mình; quản lý ví, rút tiền |
| **Nhân viên** (`GARAGE_STAFF`) | Đơn được gán cho mình: chuyển trạng thái, đẩy vị trí, báo giá, bổ sung hạng mục, xác nhận thu tiền mặt, báo bom đơn |
| **Admin** (`ADMIN`) | Duyệt gara + đặt hoa hồng, cấu hình giá cứu hộ & trọng số điều phối, xử lý khiếu nại / duyệt bồi hoàn, xử lý lệnh rút bị cắm cờ, xem thống kê, gửi cảnh báo cho gara (không thao tác trực tiếp trên đơn) |

**Luật đã chốt:**

- "Phía gara" (`assertGarageSideAccess`) = chủ gara của đơn **hoặc** nhân viên được gán vào đơn.
- Xem đơn (`assertCanView`) = khách của đơn, chủ gara của đơn, nhân viên của đơn.
- Chủ gara **không** xem vị trí khách đang chia sẻ (chỉ khách và nhân viên được gán thấy — `toResponseFor`).
- Phân vai trên app: **chủ gara chỉ nhận đơn + gán người/xe**; Xuất phát / Đã đến / Báo giá / Hoàn thành do
  **nhân viên** bấm trên app nhân viên.

**Code hiện tại lệch luật:**

- ⚠️ DFID001: `assertGarageSideAccess` cho qua **mọi** nhân viên có hồ sơ `garage_staff`, kể cả nhân viên gara khác.
- ⚠️ DFID002: `assertGarageSideAccess` cho qua **khách của đơn** → khách gọi được `/status`, `/location`, `/quote`,
  `/add-item`, `/confirm-cash`.
- ⚠️ DFID003: `assertCanView` cho cả chủ gara **từng có lời mời** dù đơn đã thuộc gara khác.
- ⚠️ DFID004: `/status` với trạng thái đích trùng trạng thái hiện tại trả về đơn **trước khi** kiểm quyền.

## 2. Điều phối gara (dispatch)

Khách tạo đơn (`POST /api/rescue-requests`) → đơn ở `SEARCHING`. Nếu đơn đang **chờ nộp cọc** (§11.4) thì
dừng ở đây, chỉ điều phối sau khi cọc `PAID`. Có hai chế độ:

### 2.1 Khách chọn đích danh gara (`garageId` trong body)

App: `rescue-garage-select` / `garage-detail`, lấy danh sách từ `GET /api/garages/nearby` (gara online trong bán kính
mặc định 20 km đường chim bay, km hiển thị = chim bay × 1.3, xếp theo điểm điều phối giảm dần).

1. Gara phải `APPROVED`, đang online, `capability` khớp loại xe, **ví tín dụng ≥ 500.000đ** — sai thì tạo đơn lỗi 400.
2. Tạo đúng **1** lời mời (`rank = 1`), km = đường bộ Goong (§4.2), `expiresAt = now + 90s`.
3. Gara bật `auto_accept` → nhận luôn (vẫn kiểm nhân viên + xe rảnh, thiếu thì tạo đơn lỗi 400); ngược lại `PENDING_GARAGE`.
4. Gara **từ chối** hoặc **quá 90s** → đơn `DECLINED` (không mời gara khác), báo khách chọn gara khác hoặc gửi
   cứu hộ khẩn cấp; cọc (nếu có) được bảo lưu (§11.4).

### 2.2 Cứu hộ khẩn cấp — điều phối tuần tự, mỗi lần mời đúng 1 gara

1. Lọc gara đủ điều kiện:
   - `status = APPROVED`, `is_online = true`, chưa xóa, có tọa độ;
   - `capability` khớp loại xe (`MOTORBIKE` / `CAR` / `BOTH`);
   - **ví tín dụng ≥ 500.000đ** (`MIN_CREDIT_BALANCE_TO_RECEIVE_ORDERS`);
   - có **≥ 1 nhân viên** đang hoạt động và rảnh (`FREE`), **≥ 1 xe cứu hộ rảnh** phù hợp loại xe;
   - **chưa từng được mời** cho đơn này;
   - nằm trong bán kính hiện tại (đường chim bay).
2. Chấm điểm từng gara theo tổng có trọng số (WSM), thang 100. Km tính bằng đường bộ Goong cho **từng** ứng viên:

   | Thành phần | Công thức | Trọng số mặc định |
   |------------|-----------|-------------------|
   | Cự ly `S_dist` | `max(0, 100 × (1 − km / 50))` — mỗi km trừ 2 điểm | 40 |
   | Tải việc `S_workload` | `max(0, 100 − số_đơn_hôm_nay × penalty_per_order)` (penalty mặc định 10) | 30 |
   | Đánh giá `S_rating` | `sao_TB / 5 × 100`; gara chưa có đánh giá dùng sao TB toàn hệ thống (không có thì 4.5) | 20 |
   | Phản hồi `S_response` | tỉ lệ nhận lời mời 30 ngày × 100 (chưa có lời mời nào = 100) | 10 |

   - Admin sửa trọng số ở `PUT /api/admin/dispatch-config`; **4 trọng số phải cộng đúng 100**.
   - Chọn gara điểm cao nhất. Hòa (lệch < 0.01): ưu tiên gara có đánh giá thật → nhiều đánh giá hơn → gần hơn.
3. Bán kính bắt đầu **15 km**, không có gara thì nới **+10 km** mỗi bậc, tối đa **50 km**.
4. Tạo `DispatchOffer` (`SENT`): `rank`, `distanceKm` (đường bộ), `etaMinutes = max(5, round(km × 3))`,
   `quotedFee` (phí ① — §4.2), `dispatchScore`, `expiresAt = now + 90s`.
5. Gara bật `auto_accept` → chốt ngay `ACCEPTED`; ngược lại `PENDING_GARAGE`. Không còn gara nào trong 50 km →
   `NO_GARAGE_FOUND` (cọc được bảo lưu).

### 2.3 Hết hạn lời mời, nhận, từ chối

- **Job quét** `processExpiredDispatchOffers` chạy mỗi **5s** (và kiểm thêm khi gọi `GET /{id}`): lời mời `SENT`
  quá `expiresAt` → `TIMEOUT`; đơn khẩn cấp mời gara kế tiếp, đơn chọn đích danh → `DECLINED`.
- **Gara nhận** (`/accept`): đơn `PENDING_GARAGE`, lời mời của gara `SENT` và chưa quá hạn, ví tín dụng ≥ 500.000đ,
  có nhân viên + xe rảnh phù hợp. Khi chốt: gán gara, `rescueFee = quotedFee`, `totalAmount = rescueFee`,
  `commissionRate = % gara / 100`, các lời mời khác `SENT → SKIPPED`. `@Version` trên `rescue_requests` chặn hai gara
  nhận cùng lúc.
- **Gara từ chối** (`/decline`): lời mời → `REJECTED`; đơn khẩn cấp mời gara kế tiếp (nới bán kính nếu cần), hết gara
  → `NO_GARAGE_FOUND`.
  - ⚠️ DFID006: không kiểm lời mời còn `SENT` — gara đã từ chối bấm từ chối lần nữa làm hệ thống mời thêm một gara
    nữa trong khi gara trước vẫn giữ lời mời.

## 3. Vòng đời đơn (state machine)

```
SEARCHING ──► PENDING_GARAGE ──► ACCEPTED ──► ASSIGNED ──► EN_ROUTE ──► ARRIVED
    │              │ (khách chọn gara: từ chối / hết 90s)                │
    │              ├──► DECLINED                                         ├──► DIAGNOSED (báo giá)
    └──────────────┴──► NO_GARAGE_FOUND                                  ├──► REPAIRING_ONSITE
                                                                         └──► COMPLETED
DIAGNOSED ──(khách duyệt, sửa tại chỗ)──► REPAIRING_ONSITE ──► COMPLETED   (hoặc ──► TOW_TO_GARAGE)
DIAGNOSED ──(khách duyệt, kéo về gara)──► TOWING ──► TOW_TO_GARAGE ──► COMPLETED
DIAGNOSED ──(khách từ chối báo giá)─────► AWAITING_PAYMENT
COMPLETED | AWAITING_PAYMENT | … ──(confirm-cash | payOS | pay mock)──► PAID ──► RATED (chưa có luồng)

Hủy:     DRAFT | SEARCHING | PENDING_GARAGE | ACCEPTED | ASSIGNED | EN_ROUTE ──(khách hủy)──► CANCELLED
Bom đơn: EN_ROUTE | ARRIVED ──(gara/nhân viên báo khách bom)──► CANCELLED   (§11)
```

| Chuyển | Ai | Endpoint |
|--------|----|----------|
| `ACCEPTED → ASSIGNED` | Chủ gara | `/assign-staff` (nhân viên đang hoạt động + rảnh, xe rảnh; cả hai → `BUSY`) |
| `ASSIGNED → EN_ROUTE` (cả `ACCEPTED → EN_ROUTE`) | Phía gara | `/status` (ghi `enRouteAt`) |
| `EN_ROUTE → ARRIVED` | Phía gara | `/status` (ghi `arrivedAt`) |
| `ARRIVED → DIAGNOSED` | Phía gara | `/quote` (gửi báo giá) hoặc `/status` |
| `ARRIVED → COMPLETED` | Phía gara | `/status` |
| `DIAGNOSED → REPAIRING_ONSITE` / `TOWING` | **Khách** duyệt báo giá | `/accept-quote` (đích tùy `quoteType`) |
| `DIAGNOSED → AWAITING_PAYMENT` | **Khách** từ chối báo giá | `/decline-quote` |
| `ARRIVED/DIAGNOSED → REPAIRING_ONSITE/TOW_TO_GARAGE` | Người xem được đơn (khách duyệt) | `/status` |
| `DIAGNOSED → TOWING/TOW_TO_GARAGE/COMPLETED`, `TOWING → TOW_TO_GARAGE/COMPLETED`, `REPAIRING_ONSITE → TOW_TO_GARAGE/COMPLETED`, `TOW_TO_GARAGE → COMPLETED` | Phía gara | `/status` |
| `* → PAID` | Phía gara (tiền mặt) / payOS / khách (mock) | `/confirm-cash`, webhook payOS, `/pay` |
| `… → CANCELLED` | Khách / phía gara (bom đơn) | `/cancel`, `/report-bom` |

- Mọi chuyển trạng thái ghi một dòng `rescue_status_history` (from, to, actor, actorType, note). Thao tác không đổi
  trạng thái (nộp cọc, khách chọn tiền mặt) cũng ghi một dòng `from = to` kèm ghi chú.
- Chuyển sang `TOWING` / `TOW_TO_GARAGE` / `REPAIRING_ONSITE` / `COMPLETED` qua `/status` khi báo giá còn `PENDING`
  → tự duyệt mọi dòng `PENDING` (`quote_status = APPROVED`).
- Khi `COMPLETED` hoặc `PAID`: nhân viên và xe cứu hộ trả về `FREE`.
- Khách **không** tự hủy được từ `ARRIVED` trở đi ("Kỹ thuật viên đã có mặt tại hiện trường…"). Hủy thì nhân viên +
  xe về `FREE`, lời mời `SENT → SKIPPED`, xử lý cọc và bồi hoàn xăng theo §11.
- Đẩy vị trí xe (`/location`) khi đơn ở `ASSIGNED`, `EN_ROUTE`, `ARRIVED`, `DIAGNOSED`, `REPAIRING_ONSITE`, `TOWING`,
  `TOW_TO_GARAGE`. Khách chia sẻ vị trí (`/customer-location`) chỉ khi `ASSIGNED` / `EN_ROUTE`; qua giai đoạn đó
  thì vị trí khách bị xóa. Khách đi xa điểm hẹn > 100 m (GPS sai số ≤ 50 m) thì điểm hẹn (`meet_lat/lng`) đổi theo.
- `DRAFT` không có luồng tạo; `RATED` không có luồng chuyển tới (gửi đánh giá **không** đổi trạng thái đơn).
- ⚠️ `/quote` không kiểm trạng thái hiện tại — gọi ở bất kỳ trạng thái nào đơn cũng về `DIAGNOSED`.
- ⚠️ DFID007: `/assign-staff` không kiểm xe cứu hộ có hợp loại xe của đơn.

## 4. Cơ cấu phí của một đơn

| Khoản | Tên | Ai quyết định giá | Cột trên `rescue_requests` |
|-------|-----|-------------------|-----------------------------|
| ① | **Phí di chuyển cứu hộ** (cước 3 bậc theo km đường bộ) | **Admin** | `rescue_fee` |
| ③ | **Phí sửa chữa** = Σ dòng dịch vụ/phụ tùng | Gara, trong khung giá admin (§5) | `service_fee` |
| ② | **Phí kéo xe về gara** | **Gara** (§4.3) | `towing_fee` |

### 4.1 Tổng tiền theo kết quả xử lý

| Kết quả | Tổng (`total_amount`) |
|---------|------------------------|
| Khách **từ chối** báo giá (`/decline-quote`) | **①** |
| Khách duyệt, sửa tại chỗ | **① + ③** |
| Khách duyệt đề xuất kéo xe về gara | **① + ③ + ②** |

- ① **luôn thu** khi nhân viên đã đến nơi — tiền công đi cứu hộ.
- Hoa hồng: `commissionAmount = round(totalAmount × commissionRate)`, tính lại khi báo giá, bổ sung hạng mục và
  thanh toán.

### 4.2 Khoản ① — phí di chuyển (admin quyết định)

Cấu hình theo loại xe trong `rescue_pricing_config` (admin sửa tại `/api/admin/pricing-config`):

```
km      = quãng đường ĐƯỜNG BỘ Goong Direction (gara → điểm đón), vehicle = car | bike
          lỗi / timeout 3.5s / thiếu key  →  km = haversine × 1.30
đêm?    = giờ gửi đơn trong khung night_start → night_end (mặc định 22:00 → 06:00, hỗ trợ qua nửa đêm)
bậc 1   km ≤ base_km (2)              phí = cước_mở_cửa (base_fare_day | base_fare_night)
bậc 2   base_km < km ≤ km_tier2 (10)  phí = cước_mở_cửa + (km − base_km) × đơn_giá_bậc_2
bậc 3   km > km_tier2                 phí = cước_mở_cửa + (km_tier2 − base_km) × đơn_giá_bậc_2
                                                        + (km − km_tier2)      × đơn_giá_bậc_3
lễ      holiday_surge_enabled và pct > 0  →  phí × (1 + pct/100)
phí     = max(cước_mở_cửa, phí), làm tròn tới hàng nghìn VNĐ
```

- Haversine chỉ còn dùng để **lọc gara theo bán kính** khi điều phối; km tính điểm và tính phí là đường bộ.
- Chưa có cấu hình cho loại xe → dùng cấu hình dự phòng trong code (`buildFallback`): xe máy 30k/40k mở cửa,
  10k/13k bậc 2, 7k/9k bậc 3; ô tô 60k/80k, 20k/25k, 15k/18k (ngày/đêm).
- `free_km`, `fee_per_km_day/night`, `min_fee` là cột cũ — không còn vào công thức (hai cột sau chỉ làm giá trị dự
  phòng khi thiếu cột bậc mới).
- Phí chốt vào lời mời (`quotedFee`) lúc mời và sang đơn (`rescueFee`) lúc gara nhận.
- **Phía gara không được sửa ①.** ⚠️ `/quote` vẫn cho ghi đè `rescueFee` / `inspectionFee` (chưa sửa).

### 4.3 Khoản ② — phí kéo xe về gara (gara quyết định)

- Hiện tại: nhân viên gửi báo giá loại **kéo xe** (`quoteType = "TOW"` hoặc `isTowing = true`) kèm `towingFee` và
  `towingReason`; khách duyệt thì đơn sang `TOWING`.
- **(chưa code)** Mỗi gara tự cấu hình giá kéo xe theo loại xe: phí mở cửa + đơn giá/km; `② = phí_mở_cửa +
  km(điểm sự cố → gara) × đơn_giá`, làm tròn hàng nghìn; tính sẵn vào lời mời (`quoted_towing_fee`, hiện luôn 0)
  để khách biết trước; nhân viên không tự gõ số tiền kéo xe.

## 5. Báo giá sửa chữa — khoản ③ (nhân viên)

`POST /{id}/quote` — phía gara gửi `repairItems[{id?, name, price, quantity}]`, `photoUrls[]` (ảnh chẩn đoán,
`PhotoType.STAFF_DIAGNOSIS`), `quoteType` (`ONSITE` | `TOW`), `towingFee?`, `towingReason?`. Mỗi dòng lưu vào
`rescue_request_items` (`phase = ONSITE`, `status = PENDING`), `amount = đơn_giá × quantity`, `quantity` ≥ 1.
Đơn → `DIAGNOSED`, `quote_status = PENDING`.

**Giá từng dòng:**

- **Dịch vụ trong danh mục** (có `id`): đơn giá phải lấy từ bảng giá của gara (`garage_service_prices.price`, nằm
  trong khung `[min_price, max_price]`), dịch vụ gara chưa bật thì không được báo giá. **(chưa code — hiện lấy
  `price` client gửi)**
- **Ngoài danh mục** (không có `id`): nhân viên nhập tên + đơn giá > 0; app khách gắn nhãn "ngoài bảng giá".
  **(chưa code)**
- Giá ghi dạng **bản chụp** (`unit_price_snapshot`, `name_snapshot`).

**Khách phản hồi** (màn `rescue-quote`):

- `/accept-quote`: duyệt **cả gói** — mọi dòng `APPROVED`, `quote_status = APPROVED`, đơn sang `TOWING` (nếu
  `quoteType = TOW`) hoặc `REPAIRING_ONSITE`.
- `/decline-quote`: `serviceFee = 0`, `towingFee = 0`, tổng = ①, mọi dòng `REJECTED`, đơn sang `AWAITING_PAYMENT`
  chờ thanh toán; báo chủ gara + nhân viên.
- ⚠️ DFID005: hai endpoint trên **không kiểm trạng thái đơn** — gọi trên đơn `AWAITING_PAYMENT` / `PAID` sẽ mở lại đơn.
- **(chưa code)** Duyệt **từng dòng**; gửi lại báo giá chỉ khi đơn còn `DIAGNOSED`.
- ⚠️ Gửi lại báo giá **xóa cứng** các dòng cũ (`deleteAll`) — trái quy ước soft delete.

**Bổ sung hạng mục phát sinh** (`POST /{id}/add-item` — `serviceId?, name, price, quantity, note?`): phía gara thêm
một dòng **đã duyệt sẵn** (`APPROVED`, không cần khách bấm duyệt), `phase = AT_GARAGE` nếu đơn đang
`TOW_TO_GARAGE`, ngược lại `ONSITE`; cộng thẳng vào `service_fee` và tổng tiền, gửi thông báo cho khách.

## 6. Thanh toán

| Cách | Ai thao tác | Endpoint | Ghi chú |
|------|-------------|----------|---------|
| **Tiền mặt** | Khách bấm "trả tiền mặt" **rồi** nhân viên / chủ gara bấm "đã thu" | `/select-cash` → `/confirm-cash` | `/select-cash` đặt `paymentMethod = CASH`, `cash_confirmed_by_customer = true`; thiếu bước này thì `/confirm-cash` bị từ chối |
| **payOS (QR chuyển khoản)** | Khách | `POST /api/payments/payos/create-link?requestId=` → webhook / `GET /api/payments/payos/status/{orderCode}` | Webhook kiểm chữ ký **và** hỏi lại payOS; đặt `paymentMethod = BANK_TRANSFER` |
| **Mock** | Khách | `/pay` | Chỉ chạy khi `PAYMENT_MOCK_TRANSFER_ENABLED=true` (prod phải `false`); **không ghi sổ cái** ⇒ tiền không rút được |

- Mọi cách: đơn → `PAID`, ghi `completedAt` nếu chưa có, trả nhân viên + xe về `FREE`, giải ngân cọc 50.000đ cho gara
  (§11.4), tính lại hoa hồng, chia tiền vào ví (§7.2).
- Bị từ chối nếu đơn `CANCELLED`, `DECLINED` hoặc đã `PAID`, hoặc sai phương thức.
- payOS idempotent theo `provider_order_code`; giao dịch `PENDING` khác của cùng đơn bị hủy khi một giao dịch thành công.
- ⚠️ Chưa kiểm đơn đã hoàn thành — về lý thuyết có thể thanh toán khi đơn còn đang cứu hộ.

## 7. Ví, hoa hồng, rút tiền

### 7.1 Các ví

| Ví | Lưu ở | Nạp / cộng | Trừ | Dùng để |
|----|-------|------------|-----|---------|
| **Tín dụng** gara (`CREDIT`, ký quỹ) | `garages.credit_balance` | Nạp payOS (`/garages/me/wallet/topup`), chuyển từ ví tiền mặt (`/transfer-to-credit`, ≥ 10.000đ, không OTP) | Hoa hồng mỗi đơn | Phải **≥ 500.000đ** mới được mời / nhận đơn; âm ⇒ chặn rút tiền |
| **Tiền mặt** gara (`CASH`) | sổ cái `wallet_transactions` (đệm ở `garages.cash_balance`) | Tiền khách trả qua payOS, cọc 50.000đ, bồi hoàn xăng | Rút tiền, cấn trừ nợ hoa hồng, chuyển sang tín dụng | **Rút về ngân hàng** |
| Nhân viên (`EMPLOYEE`) | `garage_staff.wallet_balance` | Nạp payOS (`/garages/staff/me/wallet/topup`, ≥ 10.000đ) | — | — |
| Hệ thống (`SYSTEM`) | `system_wallets` | Hoa hồng, cọc tạm giữ | Bồi hoàn xăng, giải ngân cọc | Ví tổng của sàn |
| Cọc bảo lưu của khách | `users.deposit_balance` | Cọc của đơn bị hủy trước khi gara nhận | Tự trừ vào đơn tiếp theo | §11.4 |

Mọi biến động ghi một dòng `wallet_transactions` (chỉ ghi thêm). **Số dư rút được = tổng sổ cái `CASH`**, không
tính từ đơn `PAID`.

### 7.2 Hoa hồng

- Admin đặt `commissionRate` (%) cho gara khi duyệt hồ sơ (`PUT /api/admin/garages/{id}/review`). Khi gara nhận
  đơn: `commissionRate` của đơn = % gara / 100 (vd. 15 → 0.150). Thiếu thì mặc định 15%.
- **Tiền mặt** (`/confirm-cash`): khách trả thẳng cho gara; hệ thống trừ `round(tổng × rate)` vào **ví tín dụng**
  (`CASH_COLLECT_DEDUCT`) và cộng vào ví hệ thống (`ORDER_SPLIT_SYSTEM`).
- **payOS**: **toàn bộ** tiền khách trả cộng vào **ví tiền mặt** (`ORDER_SPLIT_GARAGE`); hoa hồng — tính trên tổng
  gồm cả 50.000đ cọc — trừ vào **ví tín dụng** (`COMMISSION_DEBIT`).
- Ví tín dụng âm mà ví tiền mặt còn tiền → **tự cấn trừ** từ ví tiền mặt (`ADJUSTMENT`, `ref_type = AUTO_OFFSET`),
  ví tiền mặt không bao giờ âm.
- **(chưa code)** Khấu trừ thuế (`tax_rate`, `tax_amount`).

### 7.3 Tài khoản nhận tiền của gara

- Khai báo / đổi: `POST /garages/me/bank-account/otp` (gửi OTP SMS) → `PUT /garages/me/bank-account` kèm `otpCode`.
- `bankCode` = BIN VietQR 6 số (danh sách `GET /api/banks`), số tài khoản 6–19 chữ số, tên chủ tài khoản in hoa không dấu.
- **Đổi** STK (không tính lần khai đầu) ⇒ khóa rút **24h** (`bank_withdraw_locked_until`).

### 7.4 Rút tiền — tự động qua kênh chi payOS, không cần admin duyệt

Luồng app: `GET /withdraw/limits` (server trả hạn mức + `blockedReason`) → `POST /withdraw/otp {amount}` → `POST
/withdraw {amount, otpCode}`. Điều kiện kiểm theo thứ tự (cùng helper cho cả `limits` lẫn lúc rút):

1. Công tắc `PAYOUT_ENABLED` bật; người gọi là chủ gara đang `ACTIVE`; gara `APPROVED`, chưa xóa.
2. Đã khai báo đủ tài khoản nhận tiền; không trong 24h khóa sau khi đổi STK.
3. Không trong 24h sau khi đổi **SĐT / email** hồ sơ (`users.contact_changed_at`) — chặn cả cấp OTP.
4. `amount` ≥ 10.000đ, ≤ 20.000.000đ/lệnh; ≤ 5 lệnh/ngày; ≤ 50.000.000đ/ngày (giờ VN, không tính lệnh `FAILED` /
   `REJECTED`); toàn hệ thống ≤ 200.000.000đ/ngày.
5. `amount` ≤ số dư sổ cái `CASH`; ví tín dụng **không âm**.
6. Tài khoản chi của sàn đủ tiền (thiếu thì từ chối luôn, không giữ tiền của gara).

**OTP thao tác** (`action_otps`): chỉ qua **SMS**, SĐT phải đã xác minh; hạn 5′, sai tối đa 5 lần, cách nhau 60s,
tối đa 5 lần gửi/giờ; mã gắn với nội dung thao tác (STK + số tiền) — đổi nội dung thì mã cũ mất hiệu lực; mỗi mã dùng 1 lần.

**Thực hiện** (tiền thật, không đảo lệnh được):

- TX-1: khóa dòng gara → kiểm lại toàn bộ → tiêu OTP → tạo lệnh `PAYOUT_SENDING` + ghi `WITHDRAWAL_HOLD` trừ ví
  tiền mặt. Gọi cổng **ngoài** transaction. TX-2: chốt kết quả.
- Kết quả: `TRANSFERRED` · `FAILED` (hoàn `WITHDRAWAL_REFUND`) · kết quả mơ hồ (timeout / 5xx / sai chữ ký) →
  `PAYOUT_UNCERTAIN` — **không bao giờ tự hoàn**; chỉ hoàn khi cổng (response có chữ ký) xác nhận thất bại.
- Job `WithdrawalPayoutReconciler` đối soát mỗi 5s. Lệnh `PAYOUT_SENDING` > 60s, `PAYOUT_UNCERTAIN` > 10′ hoặc
  chưa chốt > 30′ → cắm cờ `needs_manual_review`.
- Admin (`/api/admin/withdrawals`): xem, `sync` (đối soát ngay), `resolve` lệnh bị cắm cờ — `FAILED` để hoàn tiền,
  `TRANSFERRED` (đánh dấu đã chuyển tay) **bắt buộc kèm ảnh biên lai**, hoặc chỉ xác nhận đã kiểm tra.
- Quỹ chi < 5.000.000đ → thông báo admin `PAYOUT_FUND_LOW`.
- `PAYOUT_PROVIDER=MOCK` (dev): STK đuôi `000` ⇒ thất bại, đuôi `999` ⇒ giả timeout, còn lại chốt sau 3s.
- Kênh chi payOS dùng **bộ key riêng** và yêu cầu **whitelist IP** máy chạy backend (sai IP ⇒ 403 ⇒ lệnh kẹt
  `PAYOUT_UNCERTAIN`, admin phải `resolve FAILED` để hoàn).

## 8. Tài khoản & xác thực

- Đăng ký bằng SĐT/email + mật khẩu, xác minh **OTP** (SMS eSMS hoặc email). Mật khẩu băm BCrypt.
- Khách (mobile) đăng nhập **Google qua Clerk**: backend verify session token với Clerk rồi phát JWT nội bộ; user mới
  phải bổ sung **SĐT + OTP** (vé đăng ký tạm 15′). Đăng nhập Facebook đã gỡ (2026-11-04).
- **Web admin** đăng nhập Google bằng Google Identity Services ở trình duyệt rồi gửi email lên
  `POST /api/auth/google/check`; chỉ email đã có tài khoản mới đăng nhập được.
  - ⚠️ **Lỗ hổng nghiêm trọng:** backend tin email client gửi, **không kiểm ID token Google** → ai biết email của
    một tài khoản (kể cả `ADMIN`) đều lấy được JWT của tài khoản đó.
- Access token 15′, refresh token 7 ngày (lưu DB, thu hồi khi logout).
- `POST /api/auth/update-profile` bắt đăng nhập, chỉ sửa chính mình. Đổi SĐT/email ⇒ ghi `contact_changed_at` ⇒
  khóa OTP tiền + rút tiền 24h (§7.4).
- Muốn làm chủ gara: đăng ký gara (giấy tờ + vị trí thật trên bản đồ) → admin duyệt (`APPROVED`) →
  `POST /api/auth/sync-role` để token mang role mới.
- Chủ gara tạo tài khoản nhân viên (role `GARAGE_STAFF`); không truyền mật khẩu thì hệ thống sinh mật khẩu ngẫu nhiên
  8 ký tự, trả về **một lần** trong `tempPassword`.

## 9. Chat

- Chat **1-1 theo từng đơn**, giữa 3 cặp: khách ↔ chủ gara, khách ↔ nhân viên, chủ gara ↔ nhân viên.
- Chỉ người tham gia đơn được nhắn; người nhận suy ra từ `peer` (`CUSTOMER` → khách của đơn, `GARAGE` → chủ gara,
  `STAFF` → nhân viên được gán).
- Gửi/lưu qua REST, đẩy realtime qua `/ws/chat` (`{"event":"CHAT_MESSAGE","message":…}`) và push Expo
  (`data.type = CHAT_MESSAGE`). Tin có thể là chữ hoặc ảnh (`imageUrl`).

## 10. Gọi thoại trong ứng dụng

> Gọi thoại **miễn phí qua Internet** ngay trong app (chỉ thoại, không video). Khác nút "Gọi" (`tel:`) vốn tốn
> cước và lộ số điện thoại thật — nút `tel:` vẫn giữ nguyên, đặt cạnh nút "Gọi miễn phí". Endpoint:
> [api.md §9](api.md). Code: backend `CallServiceImpl` / `CallSweeper`; mobile `callManager` / `CallOverlay` /
> `CallEngine`. Web admin không có thay đổi.

### 10.1 Ai gọi được cho ai, khi nào

- Ba cặp, giống chat: khách ↔ chủ gara, khách ↔ nhân viên, chủ gara ↔ nhân viên. Người nhận suy ra từ `peer`
  (`CUSTOMER`/`GARAGE`/`STAFF`) như chat.
- **Vai nhân viên (dù là người gọi hay người nhận) phải là nhân viên được gán cho đơn** (`rescue_requests.staff`).
  Khác chat: chat chưa gán thì lấy nhân viên đầu tiên của gara, còn cuộc gọi thì không — phải tới đúng người đang
  xử lý đơn.
- Chỉ gọi được khi đơn ở `ACCEPTED`, `ASSIGNED`, `EN_ROUTE`, `ARRIVED`, `DIAGNOSED`, `REPAIRING_ONSITE`, `TOWING`,
  `COMPLETED`, `AWAITING_PAYMENT`, `PAID` (`CallServiceImpl.CALLABLE`). Đơn đổi trạng thái giữa lúc đang gọi thì
  cuộc gọi vẫn tiếp tục.
  - ⚠️ `TOW_TO_GARAGE` (đang kéo xe về gara) **không** có trong danh sách — đã thêm ngày 2026-10-14 nhưng mất sau
    các lần merge.
- **Máy bận:** mỗi người chỉ có tối đa 1 cuộc gọi `RINGING` hoặc `ONGOING` (người gọi gọi tiếp hoặc gọi cho
  người đang bận đều bị từ chối).

### 10.2 Trạng thái cuộc gọi (`CallStatus`) và câu hiển thị trên app

| Trạng thái | Khi nào | Phía người gọi | Phía người nhận | Push nhỡ |
|------------|---------|----------------|-----------------|----------|
| `RINGING` | Vừa tạo cuộc gọi | "Đang gọi…" | "Cuộc gọi đến…" | — |
| `ONGOING` | Người nhận đã nghe máy | "Đang kết nối…" → đồng hồ `mm:ss` | như bên trái | — |
| `ENDED` | Một bên cúp máy khi đang nói | "Cuộc gọi kết thúc · mm:ss" | như bên trái | — |
| `REJECTED` | Người nhận từ chối | "Người nhận đã từ chối" | "Đã từ chối" | Không |
| `CANCELLED` | Người gọi cúp khi đang đổ chuông | "Đã hủy cuộc gọi" | "Cuộc gọi nhỡ" | Có |
| `MISSED` | Đổ chuông hết giờ không ai nghe | "Không trả lời" | "Cuộc gọi nhỡ" | Có |
| `FAILED` | Mất kết nối, hoặc server khởi động lại | "Mất kết nối" | "Mất kết nối" | Không |

### 10.3 Thời gian chờ

| Tình huống | Quy tắc | Cấu hình |
|------------|---------|----------|
| Đổ chuông | Tối đa **45s** → `MISSED` | `CALL_RING_TIMEOUT_SECONDS` |
| Đang nói, một bên mất WebSocket | Quá **20s** → server chuyển `FAILED` | `CALL_DISCONNECT_GRACE_SECONDS` |
| Đang kết nối âm thanh (client) | Quá **20s** → client tự kết thúc (`failed=true`) | cố định trong app |
| Đang nói, rớt kết nối (client) | Quá **10s** không nối lại được → client tự kết thúc | cố định trong app |
| Server khởi động lại | Mọi cuộc gọi `RINGING`/`ONGOING` còn sót → `FAILED` | — |

`CallSweeper` quét mỗi `CALL_SWEEP_INTERVAL_MS` (5s) nên các mốc trên có thể chậm thêm tối đa một chu kỳ quét
(cộng độ trễ DB).

### 10.4 Thông báo đẩy (push) — không lưu vào bảng `notifications`

- `INCOMING_CALL` ("Cuộc gọi đến"): chỉ gửi khi người nhận **không có** phiên WebSocket (tức app không mở
  ở foreground — app xuống nền thì đóng socket). Tự hết hạn sau 45s. Bấm vào mở màn đổ chuông nếu cuộc gọi còn
  đổ chuông, ngược lại báo "Cuộc gọi đã kết thúc" rồi mở chat với người gọi.
- `MISSED_CALL` ("Cuộc gọi nhỡ"): gửi cho người nhận khi cuộc gọi thành `MISSED` hoặc `CANCELLED`. Bấm vào mở
  `/chat` với người gọi.

### 10.5 Kỹ thuật tóm tắt

- **Báo hiệu:** client → server bằng REST `/api/calls`; server → client bằng `/ws/chat` (sự kiện `CALL_*`).
  Handler WebSocket bỏ qua mọi tin client gửi lên (kể cả heartbeat `PING`).
- **Âm thanh:** WebRTC P2P (Opus, DTLS-SRTP, có khử vang) chạy trong một **WebView 1×1 ẩn** — chạy được trên
  Expo Go lẫn bản build. ICE candidate không gửi rời từng cái: engine gom đủ (tối đa 2.5s) rồi gửi một lần cùng
  SDP, nên mỗi cuộc gọi chỉ cần đúng 2 lần `POST /signal`.
- **NAT:** STUN mặc định của Google + Cloudflare; TURN cấu hình bằng `CALL_TURN_*` (credential ngắn hạn sinh theo
  HMAC-SHA1, backend chỉ trả cho người đã đăng nhập). Không có TURN thì gọi được khi hai máy cùng mạng, còn 4G ↔
  Wi-Fi sau CGNAT thường **không** nối được — xem [setup.md](setup.md).
- **Không** ghi âm, **không** lưu nội dung cuộc gọi; chỉ lưu nhật ký ở `call_sessions`.

### 10.6 Giới hạn đã chấp nhận

- Chỉ nghe/nói được **khi app đang mở**: bấm nút nguồn / khóa máy / app xuống nền là rớt cuộc gọi (iOS tạm
  dừng WebView; Android 9+ chặn micro ở nền). Bên kia thấy "Đang kết nối lại…" rồi cuộc gọi tự kết thúc sau
  khoảng 10s. Màn hình được giữ sáng suốt cuộc gọi.
- App đã tắt hoặc ở nền chỉ nhận được **push**, không có giao diện gọi của hệ điều hành (CallKit /
  ConnectionService). Android trên Expo Go không nhận remote push — chỉ thử được khi đã có development build +
  Firebase.
- Âm thanh ra loa ngoài hoặc tai nghe theo mặc định của hệ điều hành; chưa có nút chuyển sang loa trong.
- Đổi mạng giữa cuộc gọi (Wi-Fi ↔ 4G) làm rớt cuộc gọi vì chưa làm ICE restart.
- **Backend chỉ chạy 1 instance:** phiên WebSocket và trạng thái online nằm trong RAM. Chạy nhiều instance thì
  sự kiện không tới được người dùng đang nối vào instance khác và sweeper của mỗi instance sẽ kết thúc nhầm cuộc
  gọi; sticky session không giải quyết được — muốn scale phải dùng Redis pub/sub + trạng thái online dùng chung.

## 11. Hủy đơn, bom đơn, đặt cọc, bồi hoàn xăng

Mức bồi hoàn xăng dùng chung cho §11.1 và §11.2:
`max(min_cancel_compensation, round(① × cancel_compensation_rate))` — mặc định `max(20.000đ, 30% × ①)`, cấu hình
theo loại xe trong `rescue_pricing_config` (① = `rescue_fee`, thiếu thì `total_amount`, thiếu nữa thì 50.000đ).

### 11.1 Khách hủy khi nhân viên đang trên đường (`EN_ROUTE`) — đơn không có cọc

| Thời gian từ lúc xuất phát (`en_route_at`) | Kết quả | `gas_compensation_status` |
|---------------------------------------------|---------|---------------------------|
| < 3 phút | Không bồi hoàn, không tính hạn mức | `UNDER_TIME_LIMIT` |
| ≥ 3 phút, gara chưa dùng hết **2 lượt/tháng** | Hệ thống tự cộng tiền bồi hoàn vào ví tiền mặt gara (trích ví hệ thống), báo gara + admin | `AUTO_CREDITED` |
| ≥ 3 phút, đã hết 2 lượt | Không tự bồi hoàn; gara có thể gửi khiếu nại | `QUOTA_EXCEEDED` |

### 11.2 Gara / nhân viên báo khách bom đơn (`POST /{id}/report-bom`)

- Ai: nhân viên được gán, chủ gara của đơn (hoặc admin). Khi đơn `EN_ROUTE` hoặc `ARRIVED`; ở `ARRIVED` phải chờ
  **≥ 10 phút** kể từ `arrived_at`.
- Body: `reason`, `photoUrl?`, `reporterLat?`, `reporterLng?`.
- Kết quả: đơn `CANCELLED` (`cancelled_by = GARAGE`, `cancel_reason = "Khách bom đơn: …"`), ghi `bom_*`, nhân viên +
  xe về `FREE`, `gas_compensation_status = PENDING_APPROVAL` với mức đề xuất ở trên, tạo **khiếu nại**
  `target_type = CUSTOMER` (`OPEN`), báo khách + chủ gara + admin.
- Khách giải trình: `POST /{id}/counter-bom` (`explanation`, `attachmentUrl?`) — lưu vào đơn và khiếu nại mới nhất,
  báo chủ gara.
- Admin xử lý: `PUT /api/complaints/admin/{id}/resolve`:
  - `RESOLVED` → cộng `approvedCompensationAmount` (bỏ trống = mức đề xuất) vào ví tiền mặt gara, trừ ví hệ thống,
    `gas_compensation_status = APPROVED`; đơn có cọc `PAID` → cọc thuộc về sàn (`FORFEITED_TO_SYSTEM`).
  - `REJECTED` → `gas_compensation_status = REJECTED`.
  - Khiếu nại đã `RESOLVED` thì khóa, một đơn không được bồi hoàn hai lần.

### 11.3 Nhận diện khách: tài khoản **hoặc** thiết bị

Mỗi đơn lưu "mã thiết bị" vào `rescue_requests.customer_ip_address`, lấy theo thứ tự: `deviceId` trong body →
header `X-Device-Id` / `X-Client-Device-Id` → IP (`X-Forwarded-For`, `X-Real-IP`, địa chỉ kết nối). Lịch sử bom đơn
được tính gộp theo tài khoản **hoặc** mã thiết bị, nên đổi tài khoản trên cùng máy vẫn bị tính.

### 11.4 Đặt cọc 50.000đ chống bom đơn

- **Bật chế độ cọc** khi lịch sử (theo thời gian) có **2 đơn bom đã được admin duyệt** (`APPROVED`). Trong chế độ
  cọc, hoàn thành **2 đơn có cọc** (`COMPLETED`/`PAID`/`RATED`, cọc `PAID`/`TRANSFERRED_TO_GARAGE`) thì tắt — tức
  đơn thứ 3, 4 phải cọc, đơn thứ 5 được bỏ. Bom thêm khi đang chế độ cọc → đếm lại từ đầu.
- App kiểm trước bằng `GET /deposit-status?deviceId=`.
- Khi tạo đơn: thuộc diện cọc **hoặc** khách đang có `deposit_balance ≥ 50.000đ` → `deposit_required = true`.
  - Có số dư bảo lưu → tự trừ, cọc `PAID`, điều phối ngay.
  - Không có → cọc `PENDING`, đơn đứng ở `SEARCHING`, **chưa điều phối** tới khi nộp cọc: payOS
    `POST /api/payments/payos/create-deposit-link?requestId=` → webhook / `GET /payos/deposit-status/{orderCode}`.
  - ⚠️ `POST /{id}/confirm-deposit` đặt cọc `PAID` và cho điều phối **mà không kiểm tiền đã vào** — khách tự gọi là bỏ
    qua được cọc. App hiện không gọi endpoint này (chỉ khai báo trong `rescueApi.ts`).
- Cọc `PAID` do **ví hệ thống tạm giữ**. Số phận:

| Tình huống | `deposit_status` | Tiền đi đâu |
|------------|------------------|-------------|
| Đơn được thanh toán | `TRANSFERRED_TO_GARAGE` | +50.000đ ví tiền mặt gara |
| Hủy trước khi gara nhận, `NO_GARAGE_FOUND`, `DECLINED` | `REFUNDED_TO_WALLET` | +50.000đ `users.deposit_balance` (dùng cho đơn sau) |
| Khách hủy sau khi gara đã nhận / gán nhân viên | `COMPENSATED_TO_GARAGE` | +50.000đ ví tiền mặt gara (không tính vào 2 lượt bồi hoàn/tháng) |
| Bom đơn được admin duyệt | `FORFEITED_TO_SYSTEM` | Sàn giữ |

## 12. Trợ lý AI (Gemini)

- Endpoint `/api/ai/**`: chẩn đoán sự cố (`/diagnose`), trò chuyện (`/chat` — nút AI nổi + màn `ai-chat`), cảnh báo
  đoạn đường hay xảy ra sự cố (`/road-hazard-warning`), chuyển giọng nói thành chữ (`/transcribe-voice`).
- Nhiều key trong `GEMINI_API_KEY` (cách nhau bằng dấu phẩy) — gặp 429/503 thì xoay sang key kế; thử lần lượt nhiều
  model. Gemini lỗi hết → trả lời bằng luật dự phòng trong code.
- Chẩn đoán dùng kho kiến thức `backend/src/main/resources/knowledge/vehicle_fault_knowledge.json`; chat ghép dữ liệu
  thật từ DB (gara gần, đánh giá) để trả lời, không bịa số liệu.
- ⚠️ `/api/ai/**` nằm trong `PUBLIC_ENDPOINTS` — gọi được **không cần đăng nhập**, ai cũng tiêu quota Gemini được.
- Bảng `ai_conversations` / `ai_messages` chưa được ghi (hội thoại không lưu DB).

## 13. Thống kê admin & cảnh báo gara

- `GET /api/admin/analytics/{operations|finance|incidents|partners}` — 4 trụ cột, tham số `range` (mặc định
  `7_DAYS`) hoặc `from` / `to`. Mỗi trụ có bản `…/ai-insights` do Gemini viết nhận định, cache **15 phút**
  (`forceRefresh=true` để bỏ cache).
- Admin gửi cảnh báo cho một gara (`POST /api/admin/analytics/garages/{id}/send-warning`) → thông báo
  `SYSTEM_WARNING` cho chủ gara; app chủ gara hiện ở dashboard kèm hướng dẫn khắc phục.

## 14. Đánh giá & khiếu nại

- Chỉ **khách của đơn** đánh giá được, khi đơn `COMPLETED` / `AWAITING_PAYMENT` / `PAID` / `RATED`. Một đơn một đánh
  giá theo chiều `CUSTOMER_TO_GARAGE` (gửi lại thì ghi đè), kèm đánh giá riêng nhân viên (`staffStars`,
  `staffComment`). Gửi đánh giá **không** chuyển đơn sang `RATED`.
- Sao trung bình của gara dùng cho điểm điều phối (§2) và danh sách gara gần.
- Khiếu nại: người dùng tạo theo đơn (`POST /api/complaints`), admin lọc và xử lý ở `/api/complaints/admin/**`.
- ⚠️ `/api/ratings/admin`, `/admin/stats`, `DELETE /admin/{id}` **không** có `@PreAuthorize` — mọi người đã đăng
  nhập đều xem và xóa được đánh giá.
