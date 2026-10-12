# Luật nghiệp vụ — SRAS

> Các luật nghiệp vụ **đang được code thực thi** (chủ yếu trong
> `backend/.../service/impl/RescueRequestServiceImpl.java` và `RescuePricingConfigServiceImpl.java`).
> Đổi luật trong code → cập nhật file này. Endpoint tương ứng: [api.md](api.md).
> Luật đã chốt nhưng code chưa theo kịp được gắn nhãn **(chưa code)**.

Cập nhật: 2026-10-12

---

## 1. Vai trò & quyền trên một đơn

| Vai trò | Được làm gì với đơn cứu hộ |
|---------|-----------------------------|
| **Khách** (`CUSTOMER`) | Tạo đơn, xem đơn của mình, hủy (giai đoạn đầu), duyệt báo giá, thanh toán chuyển khoản |
| **Chủ gara** (`GARAGE_OWNER`) | Nhận/từ chối lời mời, gán nhân viên + xe, theo dõi; cũng được làm mọi việc của nhân viên trên đơn của gara mình |
| **Nhân viên** (`GARAGE_STAFF`) | Chỉ đơn được gán cho mình: chuyển trạng thái, đẩy vị trí, báo giá, xác nhận thu tiền mặt |
| **Admin** (`ADMIN`) | Duyệt gara, đặt tỉ lệ hoa hồng, cấu hình giá cứu hộ (không thao tác trực tiếp trên đơn) |

- "Phía gara" (`assertGarageSideAccess`) = chủ gara của đơn **hoặc** nhân viên được gán vào đơn.
- Xem đơn (`assertCanView`) = khách của đơn, chủ gara của đơn, nhân viên của đơn.
- Phân vai trên app: **chủ gara chỉ nhận đơn + gán người/xe**; việc bấm Xuất phát / Đã đến / Báo giá /
  Hoàn thành do **nhân viên** thực hiện trên app nhân viên.

## 2. Điều phối gara (dispatch)

Khi khách tạo đơn (`POST /api/rescue-requests`), đơn ở `SEARCHING` rồi hệ thống điều phối **tuần tự —
mỗi lần mời đúng 1 gara**:

1. Lấy các gara đủ điều kiện:
   - `status = APPROVED`, `is_online = true`, chưa bị xóa, có tọa độ;
   - `capability` khớp loại xe của khách (`MOTORBIKE` / `CAR` / `BOTH`);
   - có **≥ 1 nhân viên** đang hoạt động và **rảnh** (`WorkStatus.FREE`);
   - có **≥ 1 xe cứu hộ rảnh** phù hợp loại xe;
   - **chưa từng được mời** cho đơn này (gara đã từ chối không bị mời lại).
2. Tính khoảng cách đường chim bay (haversine) từ điểm đón; chọn gara **gần nhất** trong bán kính hiện tại.
3. Bán kính bắt đầu **15 km**; không có gara thì nới thêm **10 km** mỗi bậc, tối đa **50 km**.
4. Tạo `DispatchOffer` (`SENT`) với: `rank` (gara thứ mấy được mời), `distanceKm`,
   `etaMinutes = max(5, round(km × 3))`, `quotedFee` (phí di chuyển ① — §4.2), `expiresAt = now + 90s`.
5. Kết quả:
   - Gara bật **tự động nhận** (`auto_accept`) → chốt ngay, đơn sang `ACCEPTED`.
   - Ngược lại → đơn sang `PENDING_GARAGE`, chờ gara phản hồi.
   - Không còn gara nào trong 50 km → `NO_GARAGE_FOUND`.

**Gara nhận** (`/accept`): đơn phải `PENDING_GARAGE`, lời mời của gara phải `SENT`; kiểm tra lại có nhân
viên + xe rảnh phù hợp. Khi chốt: gán gara, chốt `rescueFee = quotedFee`, `totalAmount = rescueFee`,
`commissionRate` lấy từ gara, các lời mời khác `SENT → SKIPPED`. Cột `@Version` trên `rescue_requests`
chặn 2 gara nhận cùng lúc.

**Gara từ chối** (`/decline`): lời mời → `REJECTED`, hệ thống mời **gara gần nhất kế tiếp** (nới bán
kính nếu cần); hết gara → `NO_GARAGE_FOUND`.

> ⚠️ Chưa có job quét hết hạn: `expiresAt` (90s) được lưu nhưng **không** tự chuyển lời mời quá hạn
> sang gara kế tiếp.

## 3. Vòng đời đơn (state machine)

```
SEARCHING ──► PENDING_GARAGE ──► ACCEPTED ──► ASSIGNED ──► EN_ROUTE ──► ARRIVED
    │               │  (decline → mời gara kế)                             │
    └──► NO_GARAGE_FOUND                                                   ├──► COMPLETED
                                                                           └──► DIAGNOSED (báo giá)
                                                                                  ├──► REPAIRING_ONSITE ──► COMPLETED
                                                                                  └──► COMPLETED
COMPLETED / bất kỳ trạng thái chưa kết thúc ──(pay | confirm-cash)──► PAID ──► RATED (chưa làm)

Hủy: SEARCHING | PENDING_GARAGE | ACCEPTED ──(khách hủy)──► CANCELLED
```

| Chuyển | Ai | Endpoint |
|--------|----|----------|
| `ACCEPTED → ASSIGNED` | Chủ gara | `/assign-staff` (nhân viên + xe phải rảnh, nhân viên đang hoạt động; cả hai → `BUSY`) |
| `ASSIGNED → EN_ROUTE` | Phía gara | `/status` (ghi `enRouteAt`) |
| `EN_ROUTE → ARRIVED` | Phía gara | `/status` (ghi `arrivedAt`) |
| `ARRIVED → DIAGNOSED` | Phía gara | `/quote` (gửi báo giá) hoặc `/status` |
| `ARRIVED → COMPLETED` | Phía gara | `/status` |
| `DIAGNOSED → REPAIRING_ONSITE` | **Khách** (duyệt báo giá) hoặc phía gara | `/status` |
| `DIAGNOSED → COMPLETED`, `REPAIRING_ONSITE → COMPLETED` | Phía gara | `/status` |
| `* → PAID` | Khách (chuyển khoản) / phía gara (tiền mặt) | `/pay`, `/confirm-cash` |
| `SEARCHING/PENDING_GARAGE/ACCEPTED → CANCELLED` | Khách | `/cancel` (lời mời `SENT → SKIPPED`) |

- Mọi chuyển trạng thái ghi một dòng `rescue_status_history` (from, to, actor, actorType, note).
- Khi `COMPLETED` hoặc `PAID`: nhân viên và xe cứu hộ trả về `FREE`.
- Đẩy vị trí xe (`/location`) chỉ khi đơn ở `ASSIGNED`, `EN_ROUTE`, `ARRIVED`, `DIAGNOSED`, `REPAIRING_ONSITE`.
- Các trạng thái `DRAFT`, `TOWING`, `AWAITING_PAYMENT`, `DECLINED`, `RATED` có trong enum nhưng **chưa có
  luồng nào chuyển tới**.

## 4. Cơ cấu phí của một đơn

> 🆕 Luật mới chốt 2026-10-12. Các dòng gắn **(chưa code)** là phần code hiện tại chưa làm đúng —
> làm xong thì bỏ nhãn.

Một đơn gồm tối đa 3 khoản (đánh số theo cột trong [database.md](database.md)):

| Khoản | Tên | Ai quyết định giá | Cột trên `rescue_requests` |
|-------|-----|-------------------|-----------------------------|
| ① | **Phí di chuyển cứu hộ** = km × đơn giá/km | **Admin** (chủ hệ thống) | `rescue_fee` |
| ③ | **Phí sửa chữa** = Σ dòng dịch vụ/phụ tùng khách đã duyệt | Gara, trong khung giá admin (§5) | `service_fee` |
| ② | **Phí kéo xe về gara** | **Gara** (§4.3) | `towing_fee` |

### 4.1 Tổng tiền theo kết quả xử lý

| Kết quả | Tổng (`total_amount`) |
|---------|------------------------|
| Khách **không chấp nhận sửa** (từ chối toàn bộ báo giá) | **①** |
| Khách chấp nhận sửa, **không** đưa xe về gara (sửa tại chỗ) | **① + ③** |
| Khách chấp nhận sửa **và** đưa xe về gara | **① + ③ + ②** |

- ① **luôn thu** khi nhân viên đã đến nơi (`ARRIVED`) — đây là tiền công đi cứu hộ, không phụ thuộc
  khách có sửa hay không.
- ② chỉ cộng khi xe thực sự được kéo về gara; ③ chỉ cộng các dòng khách đã duyệt (`APPROVED`).
- Hoa hồng: `commissionAmount = round(totalAmount × commissionRate)`, tính trên tổng cuối cùng.

> ❓ Câu hỏi mở: khách **không sửa nhưng vẫn muốn kéo xe về gara** → đề xuất tổng = ① + ②.

### 4.2 Khoản ① — phí di chuyển (admin quyết định)

Cấu hình theo loại xe trong `rescue_pricing_configs` (admin sửa tại `/api/admin/pricing-config`):

```
km          = quãng đường đi THỰC TẾ trên bản đồ (gara → điểm đón)
km_tính_phí = max(0, km − free_km)
đơn_giá     = fee_per_km_night nếu giờ gửi đơn trong khung đêm, ngược lại fee_per_km_day
phí         = km_tính_phí × đơn_giá
nếu holiday_surge_enabled và holiday_surcharge_pct > 0:  phí = phí × (1 + pct/100)
phí         = max(min_fee, phí)
phí         = làm tròn tới hàng nghìn VNĐ
```

- **Km tính theo đường đi trên bản đồ**, không phải đường chim bay: gọi API chỉ đường **Goong
  Direction** (cùng nhà cung cấp bản đồ app đang dùng), lấy `distance` của tuyến đầu tiên. **(chưa
  code — hiện đang dùng haversine)**
- Gọi API lỗi/timeout → dùng tạm khoảng cách haversine để không chặn điều phối, ghi log cảnh báo.
- Haversine vẫn được dùng để **lọc & xếp hạng gara** khi điều phối (§2) cho nhanh; chỉ phí mới dùng km
  theo bản đồ.
- Khung đêm mặc định **22:00 → 06:00** (cấu hình được giờ + phút, hỗ trợ khung qua nửa đêm).
- Chưa có cấu hình cho loại xe → dùng cấu hình dự phòng trong code (`buildFallback`).
- Phí được chốt vào lời mời (`quotedFee`) lúc mời và sang đơn (`rescueFee`) lúc gara nhận.
- **Phía gara không được sửa ①** — giá do admin quyết định. Bỏ `rescueFee` / `inspectionFee` khỏi body
  báo giá. **(chưa code — `/quote` hiện vẫn cho ghi đè)**

### 4.3 Khoản ② — phí kéo xe về gara (gara quyết định)

- Mỗi gara tự cấu hình giá kéo xe theo loại xe: **phí mở cửa** + **đơn giá/km**. **(chưa code — chưa có
  cột cấu hình)**
- `km` = quãng đường trên bản đồ (Goong Direction) **từ điểm sự cố về gara**.
- `② = phí_mở_cửa + km × đơn_giá_kéo`, làm tròn tới hàng nghìn VNĐ.
- Giá dự kiến tính sẵn vào lời mời (`dispatch_offers.quoted_towing_fee` → `rescue_requests.quoted_towing_fee`)
  để khách biết trước; khi khách chọn kéo xe thì chốt sang `towing_fee`.
- Nhân viên không tự gõ số tiền kéo xe; chỉ đánh dấu "khách đồng ý kéo xe về gara".

## 5. Báo giá sửa chữa — khoản ③ (nhân viên)

`POST /{id}/quote` — phía gara gửi `repairItems[]` + `photoUrls[]` (ảnh chẩn đoán,
`PhotoType.STAFF_DIAGNOSIS`). Mỗi dòng lưu vào `rescue_request_items` (`phase = ONSITE`,
`status = PENDING`), `amount = đơn_giá × quantity`, `quantity` ≥ 1.

**Giá từng dòng:**

- **Dịch vụ có trong danh mục** (`id` dịch vụ): đơn giá **lấy từ bảng giá của gara**
  (`garage_service_prices.price`, đã bị ép nằm trong khung `[min_price, max_price]` admin đặt). Nhân
  viên **không tự gõ giá**; backend bỏ qua `price` client gửi lên. Dịch vụ gara chưa bật
  (`is_active = false`) → không được báo giá. **(chưa code — hiện lấy `price` client gửi)**
- **Phụ tùng / hạng mục ngoài danh mục** (không có `id`): nhân viên nhập tên + đơn giá > 0; app khách
  hiển thị nhãn **"ngoài bảng giá"** để khách cân nhắc. **(chưa code)**
- Giá ghi dạng **bản chụp** (`unit_price_snapshot`, `name_snapshot`) — gara đổi bảng giá sau đó không
  ảnh hưởng đơn cũ.

**Khách duyệt:**

- Khách xem ở màn `rescue-quote`, duyệt **từng dòng** (`APPROVED` / `REJECTED`) hoặc từ chối toàn bộ.
  **(chưa code — hiện duyệt cả gói, không đổi trạng thái dòng)**
- `serviceFee` = Σ `amount` các dòng `APPROVED`. Từ chối toàn bộ → `serviceFee = 0` → tổng = ① (§4.1),
  đơn sang `COMPLETED` chờ thanh toán.
- Có ≥ 1 dòng được duyệt → `REPAIRING_ONSITE`.
- Sau khi khách đã duyệt, gara **không được thêm/sửa dòng** nếu không gửi báo giá mới để khách duyệt lại.
- Gửi lại báo giá chỉ được khi đơn còn `DIAGNOSED`; dòng cũ đánh `is_deleted = true` (soft delete).

> ⚠️ Gửi lại báo giá đang **xóa cứng** các dòng cũ (`deleteAll`) — trái quy ước soft delete.

## 6. Thanh toán

Phương thức chọn khi tạo đơn (`RequestPaymentMethod`, mặc định `CASH`):

| Phương thức | Ai xác nhận | Endpoint | Ghi chú |
|-------------|-------------|----------|---------|
| `CASH` | **Nhân viên / chủ gara** bấm "đã thu tiền" | `/confirm-cash` | Không tự động |
| `BANK_TRANSFER` | **Khách** bấm thanh toán | `/pay` | **Mock** — coi như đã trừ tiền ngân hàng |

- Cả hai: đơn → `PAID`, ghi `completedAt` nếu chưa có, trả nhân viên + xe về `FREE`, tính lại
  `commissionAmount`.
- Bị từ chối nếu đơn `CANCELLED`, `DECLINED` hoặc đã `PAID`, hoặc sai phương thức.

> ⚠️ Chưa kiểm tra đơn đã hoàn thành — về lý thuyết có thể thanh toán khi đơn còn đang cứu hộ.
> Câu hỏi mở: "ngân hàng kết nối" là cổng thanh toán thật (payOS/VNPay) hay ví mô phỏng trong DB.

## 7. Hoa hồng, ví, thuế

- Admin đặt `commissionRate` (%) cho gara khi duyệt hồ sơ (`PUT /api/admin/garages/{id}/review`).
  Khi gara nhận đơn: `commissionRate` của đơn = % gara / 100 (vd. 15 → 0.150).
- `commissionAmount = round(totalAmount × commissionRate)`, tính lại khi báo giá và khi thanh toán.
- **Chưa làm:** ví gara (credit/cash), `wallet_transactions`, rút tiền (`withdrawal_requests`), khấu trừ
  thuế — mới có ở lược đồ CSDL.

## 8. Tài khoản & xác thực

- Đăng ký bằng SĐT/email + mật khẩu, xác minh **OTP** (SMS eSMS hoặc email). Mật khẩu băm BCrypt.
- Khách có thể đăng nhập **Google qua Clerk**: backend tự verify với Clerk rồi phát JWT nội bộ; user mới
  phải bổ sung **SĐT + OTP** (vé đăng ký tạm 15′).
- Access token 15′, refresh token 7 ngày (lưu DB, thu hồi khi logout).
- Người dùng muốn làm chủ gara: đăng ký gara (giấy tờ + vị trí trên bản đồ, bắt buộc tọa độ thật) →
  admin duyệt (`APPROVED`) → `POST /api/auth/sync-role` để token mang role mới.
- Chủ gara tạo tài khoản nhân viên (role `GARAGE_STAFF`); không truyền mật khẩu thì hệ thống sinh
  mật khẩu ngẫu nhiên 8 ký tự, trả về **một lần** trong `tempPassword` để chủ gara copy gửi nhân viên.

## 9. Chat

- Chat **1-1 theo từng đơn**, giữa 3 cặp: khách ↔ chủ gara, khách ↔ nhân viên, chủ gara ↔ nhân viên.
- Chỉ người tham gia đơn được nhắn; người nhận suy ra từ `peer` (`CUSTOMER` → khách của đơn,
  `GARAGE` → chủ gara, `STAFF` → nhân viên được gán).
- Gửi/lưu qua REST, đẩy realtime qua `/ws/chat`. Tin có thể là chữ hoặc ảnh (`imageUrl`).
