# plan-payout: Giao diện rút tiền ví tiền mặt (mobile, chủ gara)

> Kế hoạch để một phiên Claude Code mới thực thi từ đầu đến cuối. Mọi dữ kiện đã được kiểm trên code tại commit `52968d6` (nhánh `sprint-3/feature/garage-withdrawal`). Nếu code đã khác thì tin code. Mục 4 là kết quả rà soát logic & bảo mật. Mỗi phát hiện có mã `[Rx]`, và các bước sau ghi rõ mã nào đã được xử lý.

## 1. Bối cảnh

Backend đã có đủ luồng rút tiền thật qua payOS kênh chi:
- Đổi tài khoản nhận tiền phải có OTP SMS.
- Rút tiền phải có OTP SMS gắn với **đúng số tiền**.
- Đổi STK đã có thì khoá rút 24h.
- Đối soát trạng thái lệnh tự động.

Mobile vẫn là **modal giả** trong [wallet.tsx:864-969](mobile/sras/src/app/garage-owner/wallet.tsx#L864-L969):
- STK ghi cứng.
- Ngưỡng tối thiểu 50.000đ, backend là 10.000đ.
- Gọi `POST /wallet/withdraw` không có OTP, gặp lỗi vẫn báo "thành công".

**Luồng người dùng đã chốt:**
> Bấm "Rút tiền" → hiện số dư rút được + 2 lựa chọn **Chuyển tới tài khoản ngân hàng** / **Chuyển vào ví tín dụng** → chọn ngân hàng thì sang trang nhập số tiền → "Xác nhận" thì backend gửi OTP → nhập OTP đúng thì thực hiện payout → xem kết quả.

**Quyết định đã chốt:**
- Thiết kế theo **taste-skill** (cài từ GitHub).
- Thêm **API hạn mức** ở backend; mobile không ghi cứng hạn mức.
- Chuyển vào ví tín dụng dùng endpoint có sẵn, không OTP.

**Môi trường:** `backend/.env` đang là `PAYOUT_PROVIDER=MOCK`, không chuyển tiền thật. **Không** đổi sang `PAYOS` khi người dùng chưa yêu cầu.

## 2. Ràng buộc khi thực thi

- Chỉ sửa `mobile/sras` và các file backend nêu ở Bước 1. **Không** đụng `web/admin`.
- **Không cài thêm dependency.** Đã có: `lucide-react-native`, `react-native-reanimated`, `react-native-svg`, `expo-router`, `axios`.
- Viết giống code xung quanh: `StyleSheet.create`, comment tiếng Việt ngắn, gọi API qua object trong `src/api/*Api.ts`.
- Không commit/push khi người dùng chưa yêu cầu. Không đọc/in giá trị bí mật trong `backend/.env`.
- **Quy tắc dữ liệu nhạy cảm trên mobile `[R10]`:**
  - Không `console.log` body/response chứa STK hay OTP.
  - Không lưu STK đầy đủ hay OTP vào SecureStore/AsyncStorage.
  - Không đưa STK, OTP, tên chủ TK vào route params.
  - Xoá OTP khỏi state ngay sau khi gửi.

## 3. Hợp đồng API backend (đã kiểm)

Mọi response bọc `ApiResponse { success, message, data }`. `axiosClient` đã trả `response.data`, nên lấy dữ liệu bằng `res?.data?.data || res?.data || res` (giống [garageWalletApi.ts](mobile/sras/src/api/garageWalletApi.ts)).

- Lỗi nghiệp vụ là HTTP 400 với `message` tiếng Việt dành cho người dùng. Lỗi validation gộp các message bằng `, `.
- `/api/**` (trừ auth/webhook/upload) đều phải đăng nhập (`anyRequest().authenticated()`). `/api/banks` **không** public.
- `axiosClient` gặp 401/403 thì refresh token rồi gọi lại request. Việc này an toàn vì 401/403 xảy ra trước mọi tác dụng phụ (`assertOwnerActive` chạy đầu tiên).

| Method & path (prefix `/api`) | Body | `data` |
|---|---|---|
| `GET /banks` | – | `Bank[]` = `{ bin, code, shortName, name, transferSupported }` |
| `GET /garages/me/bank-account` | – | `BankAccount` = `{ bankCode (BIN), bankName, accountNumberMasked, bankAccountHolder, complete, withdrawLockedUntil: ISO\|null }` |
| `POST /garages/me/bank-account/otp` | `{ bankCode, bankAccountNumber, bankAccountHolder }` | `null` |
| `PUT /garages/me/bank-account` | cùng 3 field + `otpCode` | `BankAccount` |
| `POST /garages/me/wallet/withdraw/otp` | `{ amount }` | `null`. Chạy **toàn bộ** kiểm tra rút trước khi gửi SMS |
| `POST /garages/me/wallet/withdraw` | `{ amount, otpCode }` | `Withdrawal`. Gọi cổng chi **đồng bộ** |
| `GET /garages/me/wallet/withdrawals?page&size` | – | Spring `Page<Withdrawal>` (`content`, `last`, `number`) |
| `GET /garages/me/wallet/withdrawals/{id}` | – | `Withdrawal`. Lệnh của gara khác trả 404 |
| `POST /garages/me/wallet/transfer-to-credit` | `{ amount }` | `GarageWalletData`. Có sẵn `garageWalletApi.transferToCredit` |
| **MỚI** `GET /garages/me/wallet/withdraw/limits` | – | `WithdrawalLimits` (Bước 1) |

`Withdrawal` = `{ id, transferCode ("RUT"+id), amount, status, displayStatus: 'PROCESSING'|'SUCCESS'|'FAILED', bankSnapshot, createdAt, payoutSettledAt, failureMessage }`. `PAYOUT_UNCERTAIN` cũng hiển thị là `PROCESSING`.

**Quy tắc nghiệp vụ** (`WithdrawalServiceImpl.validateWithdrawal`, `normalizeBank`, `ActionOtpServiceImpl`):
- **Tài khoản ngân hàng:**
  - `bankCode` là **BIN 6 số** lấy từ `/banks`, không phải `code`.
  - STK: server bỏ khoảng trắng, `.` và `-`, còn lại phải khớp `^[0-9]{6,19}$`.
  - Tên chủ TK: server `normalizeName` (`đ`→`d`, bỏ dấu, viết hoa, gộp khoảng trắng), rồi phải khớp `^[A-Z][A-Z ]{1,99}$`.
  - STK **đầu tiên** không bị khoá. Đổi STK đã có thì khoá rút 24h (`PAYOUT_BANK_CHANGE_LOCK_HOURS`).
- **Thứ tự kiểm tra trong `validateWithdrawal`:**
  1. Bật/tắt
  2. Gara APPROVED
  3. Đủ STK
  4. Khoá 24h
  5. Tối thiểu (10.000đ)
  6. Tối đa/lệnh (20tr)
  7. Số lệnh/ngày (5)
  8. Tổng/ngày (50tr)
  9. Trần toàn hệ thống
  10. Số dư sổ cái CASH
  11. Ví tín dụng âm

  Lệnh FAILED/REJECTED không tính vào hạn mức.
- **Vị trí kiểm tra so với OTP:** quỹ chi không đủ và mọi lỗi validate xảy ra **trước** khi tiêu OTP, nên mã còn dùng lại được trong hạn.
- **OTP:**
  - 6 số, hạn 5 phút, sai tối đa 5 lần, gửi lại cách ≥ 60 giây, tối đa 5 lần/giờ.
  - Chỉ gửi cho chủ gara **đã xác minh SĐT**.
  - Mã gắn với payload: số tiền + STK hiện tại (rút), hoặc bộ 3 thông tin ngân hàng (đổi STK). Đổi payload là `PAYLOAD_MISMATCH` và mã bị đốt.
- **Message lỗi OTP:**
  - "Mã OTP không đúng"
  - "…hết hạn hoặc không còn hiệu lực…"
  - "…nhập sai mã quá số lần cho phép…"
  - "Thông tin giao dịch đã thay đổi…"

  Gặp 3 loại sau cùng thì phải xin mã mới.

**Overview ví** (`GET /garages/me/wallet/overview`), mảng `transactions` đã có các dòng rút:
- `txnType: 'WITHDRAWAL'`: `amount` âm, `status` = trạng thái lệnh.
- `txnType: 'WITHDRAWAL_REFUND'`: `amount` dương, `status: 'REFUNDED'`.
- Cả hai có `orderCode` = `#RUTxx`.
- `cashBalance` = sổ cái CASH, là số rút được. Tiền bị **giữ ngay** khi tạo lệnh rút.

**Thông báo đẩy:** `WITHDRAWAL_TRANSFERRED` / `WITHDRAWAL_FAILED` có `refType: 'WITHDRAWAL'`, `refId` = id lệnh. Khi gửi OTP còn có `SYSTEM_WARNING` với `refType: 'ACTION_OTP'`, loại này không điều hướng.

**Cổng MOCK** (`MockPayoutGateway`):
- STK đuôi thường: SUCCESS sau `mock-settle-seconds`.
- Đuôi `000`: FAILED, hoàn tiền.
- Đuôi `999`: lần gửi đầu giả timeout, lệnh vào UNCERTAIN, sau đó đối soát tự chốt.

**Timeout cổng thật** (`PayOSPayoutGateway`): connect 5s + read 20s **cho mỗi lời gọi**. `withdraw()` gọi `balance()` rồi `create()`, có thể thêm `findByReference()`, nên một request rút có thể mất **~75s**.

---

## 4. Rà soát logic & bảo mật

**Đã kiểm, không cần sửa:**
- Rút tiền kiểm lại toàn bộ điều kiện **dưới khoá dòng gara** (`findWithLockByOwner`).
- OTP băm HMAC, gắn payload, tiêu trong cùng transaction tạo lệnh. Gửi 2 lần cùng OTP tạo đúng 1 lệnh (có test `doubleSubmitWithSameOtpCreatesExactlyOneWithdrawal`).
- `transferCashToCredit` dùng **cùng khoá dòng gara**, nên không tranh chấp số dư với lệnh rút.
- `BankAccountResponse` chỉ trả STK đã che. `WithdrawalResponse` không lộ mã/thông điệp lỗi thô của cổng.
- `getWithdrawal(id)` trả 404 với lệnh của gara khác, nên `id` lấy từ push/deep link không lộ dữ liệu.
- Staff và người chưa đăng nhập bị chặn (`WithdrawalSecurityWebTest`).

**Phát hiện và cách xử lý trong kế hoạch:**

| Mã | Vấn đề | Xử lý |
|---|---|---|
| R1 | `transferCashToCredit` không kiểm vai trò/trạng thái: chủ gara bị khoá mà JWT còn hạn vẫn chuyển được. Endpoint không idempotent, bấm 2 lần là chuyển 2 lần. | Bước 1b: thêm kiểm tra GARAGE_OWNER + ACTIVE, kèm test. Mobile chặn gửi 2 lần bằng `isSubmittingRef`. Idempotency phía server ghi nhận là giới hạn, ngoài phạm vi. |
| R2 | Tiền đã vào ví tín dụng **không rút về ngân hàng được** (chỉ sổ CASH rút được). Người dùng có thể chuyển nhầm. | Bước xác nhận riêng có cảnh báo, dùng `SlideToConfirm`. |
| R3 | Request rút có thể ~75s, `axiosClient` timeout 30s. App báo lỗi trong khi lệnh vẫn đang chạy. | `withdraw` dùng `timeout: 90000` + luồng khôi phục (R4, R5). |
| R4 | Dò lệnh sau timeout bằng `createdAt` dễ sai do lệch đồng hồ máy/server. | Trước khi gửi, chụp `id` lệnh mới nhất. Sau timeout, lệnh có `id` lớn hơn và trùng `amount` chính là lệnh vừa gửi. |
| R5 | **Nguy cơ rút 2 lần thật:** sau timeout người dùng tưởng thất bại, xin OTP mới và gửi lại, tạo lệnh thứ 2. | Sau lỗi mạng/timeout thì **khoá** nút gửi và "Gửi lại mã", bắt buộc dò lệnh (R4). Không tìm thấy thì chỉ cho sang Lịch sử rút tiền, không cho thử lại tại chỗ. |
| R6 | OTP gắn số tiền / thông tin STK. Sửa sau khi xin mã thì mã bị đốt, mà xin lại bị cooldown 60s. | Ở bước OTP, số tiền / thông tin STK hiển thị **chỉ đọc**. "Đổi số tiền" / "Sửa thông tin" quay về bước trước và báo phải xin mã mới. PUT gửi **đúng object** đã dùng khi xin OTP. |
| R7 | Đổi STK đã có thì bị khoá 24h; nếu vẫn chuyển sang trang rút thì người dùng gặp lỗi ngay. | Sau khi lưu, nếu `withdrawLockedUntil != null` thì về ví kèm thông báo khoá, không sang trang rút. |
| R8 | Client tự suy luận "có rút được không" dễ lệch server. | Limits trả `blockedReason` do **server** tính từ chính các hàm kiểm tra (tách helper, giữ nguyên thứ tự và message). |
| R9 | `String.prototype.normalize` trên Hermes không chắc chắn; bỏ dấu sai thì client chặn nhầm tên hợp lệ. | Dùng bảng thay dấu tiếng Việt tường minh. Client chỉ chuẩn hoá để hiển thị, server chuẩn hoá lần cuối. |
| R10 | Dữ liệu nhạy cảm (STK, OTP) trên thiết bị. | Quy tắc ở mục 2. |
| R11 | Lỗi 5xx có thể mang message kỹ thuật. | `apiErrorMessage` chỉ dùng `message` server khi status 4xx, còn lại dùng câu chung. |
| R12 | Route params có thể bị deep link giả mạo. | `target` chỉ nhận `'bank'\|'credit'` (khác thì `router.replace` về ví). `next` chỉ nhận `'withdraw'`. `id` phải là số nguyên dương. Server vẫn là chốt chặn cuối. |
| R13 | 6 `TextInput` riêng làm autofill SMS / dán mã kém tin cậy. | 1 `TextInput` ẩn (`maxLength=6`, `number-pad`, `oneTimeCode`/`sms-otp`) + 6 ô chỉ để hiển thị. |
| R14 | Hermes hỗ trợ `Intl` / `toLocaleString` không đầy đủ. | Tiền dùng `formatVnd` có sẵn; ngày giờ format tay `dd/MM HH:mm`. |
| R15 | Số tiền quá dài vượt an toàn của `Number`. | Ô nhập giới hạn 11 chữ số, chỉ nhận số nguyên. |

---

## Bước 0: Cài taste-skill

1. `git clone https://github.com/Leonxlnx/taste-skill` vào **thư mục mới, rỗng** trong scratchpad. Coi là dữ liệu không tin cậy: không chạy script, không `npm install`.
2. Đọc **toàn bộ** các SKILL.md trong repo. Tóm tắt cho người dùng repo có những skill nào và định chép skill nào. **Chờ người dùng đồng ý** rồi mới chép vào `D:\final-project-sras\.claude\skills\<tên-skill>\`.
3. Skill viết cho web. Rút các nguyên tắc dùng được cho React Native thành checklist ngắn và áp dụng cho Bước 3-4. Nếu phiên chưa nhận skill qua lệnh `Skill` thì đọc SKILL.md trực tiếp.

Hướng thiết kế nền (chỉnh lại theo skill nếu skill nói khác):
- Giữ màu cam `#ea580c`, nền trắng, slate `#0f172a`/`#64748b`/`#94a3b8`.
- **Không emoji**, chỉ icon `lucide-react-native`.
- Số tiền dùng `fontVariant: ['tabular-nums']`. Phân cấp chữ rõ ràng.
- Lưới khoảng cách 4/8. Mỗi màn chỉ 1 nút chính.
- Lỗi hiện inline dưới ô nhập, không dùng `Alert.alert` cho lỗi nhập liệu.
- Chuyển cảnh tiết chế bằng `react-native-reanimated`.

## Bước 1: Backend

### 1a. API hạn mức `[R8]`
`GET /api/garages/me/wallet/withdraw/limits` trả về `WithdrawalLimitsResponse`:

| field | nguồn |
|---|---|
| `enabled` | `PayoutProperties.isEnabled()` |
| `blockedReason` | message của điều kiện chặn **đầu tiên** không phụ thuộc số tiền, hoặc `null` (xem dưới) |
| `minAmount`, `maxAmountPerRequest`, `maxAmountPerDay`, `maxRequestsPerDay` | `PayoutProperties` |
| `remainingAmountToday`, `remainingRequestsToday` | max(0, hạn mức − đã dùng hôm nay), dùng cùng helper với validate |
| `withdrawableBalance` | `ledgerCash(garageId)` |
| `creditBalance` | `financeService.getGarageWalletOverview(owner).getCreditBalance()` |
| `otpTtlMinutes`, `otpResendCooldownSeconds` | `ActionOtpProperties` |

Refactor trong [WithdrawalServiceImpl.java](backend/src/main/java/com/sras/backend/service/impl/WithdrawalServiceImpl.java). **Không đổi thứ tự hay câu chữ của bất kỳ kiểm tra nào:**
- `private String blockBeforeAmount(Garage g)`: tách nguyên văn 4 kiểm tra đầu (bật/tắt, APPROVED, đủ STK, khoá 24h), trả message hoặc `null`.
- `private record TodayUsage(long count, long sum)` + `private TodayUsage todayUsage(Long garageId)`: tách phần `dayStart` / `countByGarageSince` / `sumAmountByGarageSince`.
- `private String creditBlock(User owner)`: tách kiểm tra ví tín dụng âm.
- `validateWithdrawal` gọi lại các helper này **đúng vị trí cũ** và throw `BadRequestException` khi khác `null`.
- `getLimits(owner)`: `blockedReason` = `blockBeforeAmount` → nếu `null` và `remainingRequestsToday == 0` thì dùng câu giới hạn lệnh/ngày (cùng câu trong validate; tách thành helper tạo message nếu cần) → nếu vẫn `null` thì `creditBlock`.
- Constructor viết tay: thêm tham số `ActionOtpProperties`. Grep `new WithdrawalServiceImpl(` để chắc không có chỗ nào tự khởi tạo.

File:
- **Mới** `backend/src/main/java/com/sras/backend/dto/response/WithdrawalLimitsResponse.java` (`@Data @Builder @NoArgsConstructor @AllArgsConstructor`).
- [WithdrawalService.java](backend/src/main/java/com/sras/backend/service/WithdrawalService.java): thêm `WithdrawalLimitsResponse getLimits(User owner);`.
- [FinanceController.java](backend/src/main/java/com/sras/backend/controller/FinanceController.java): `@GetMapping("/garages/me/wallet/withdraw/limits")` đặt trên `requestWithdrawalOtp` (dòng ~137).

### 1b. Gia cố `transferCashToCredit` `[R1]`
Trong [FinanceServiceImpl.java:654](backend/src/main/java/com/sras/backend/service/impl/FinanceServiceImpl.java#L654), đầu hàm thêm kiểm tra giống `WithdrawalServiceImpl.assertOwnerActive`:
- `role != GARAGE_OWNER` → `AccessDeniedException("Chỉ chủ gara mới được thực hiện thao tác này")`.
- `status != ACTIVE` → `AccessDeniedException("Tài khoản của bạn đang bị khoá")`.

Không đổi phần còn lại.

### 1c. Test
- [WithdrawalFlowTest.java](backend/src/test/java/com/sras/backend/service/impl/WithdrawalFlowTest.java), viết theo mẫu `limitsAreEnforced`:
  - `limitsReflectTodaysUsage`: rút 1 lệnh thì `remainingRequestsToday` −1 và `remainingAmountToday` −amount; lệnh FAILED (STK đuôi `000` hoặc cách test hiện có tạo FAILED) được trả lại hạn mức.
  - `limitsExplainWhyWithdrawalIsBlocked`: lần lượt chưa có STK / đang khoá 24h / tắt `enabled` thì `blockedReason` khớp đúng message mà `requestWithdrawalOtp` ném ra.
- [WithdrawalSecurityWebTest.java](backend/src/test/java/com/sras/backend/controller/WithdrawalSecurityWebTest.java):
  - anonymous `GET .../withdraw/limits` → 401.
  - staff → 403.
  - owner → 200 và có `$.data.minAmount`.
  - staff `POST .../transfer-to-credit` → 403.
- Chạy lại **toàn bộ** test hiện có của 2 file. Mọi test cũ phải xanh, đây là bằng chứng refactor không đổi hành vi.

## Bước 2: Lớp API mobile

**Mới** `mobile/sras/src/api/withdrawalApi.ts`:
- Kiểu `Bank`, `BankAccount`, `BankAccountInput`, `WithdrawalLimits`, `Withdrawal`, `WithdrawalPage` theo mục 3.
- Object `withdrawalApi` gồm:
  - `getBanks()`: lọc `transferSupported`, cache trong biến module cho cả phiên.
  - `getBankAccount()`, `requestBankAccountOtp(input)`, `updateBankAccount(input, otpCode)`.
  - `getLimits()`, `requestWithdrawalOtp(amount)`.
  - `withdraw(amount, otpCode)`: truyền `{ timeout: 90000 }` `[R3]`.
  - `listWithdrawals(page, size)`, `getWithdrawal(id)`.
- `export function apiErrorMessage(e: any, fallback: string)` `[R11]`:
  - `e.response.status` trong 400-499 và có `message` → trả `message`.
  - Còn lại → trả `fallback`.
- `export const isNetworkError = (e: any) => !e?.response`, dùng cho timeout/mất mạng.

Sửa:
- [garageWalletApi.ts](mobile/sras/src/api/garageWalletApi.ts): **xoá** `withdraw` (không OTP, chỉ `wallet.tsx` dùng). Thêm `'WITHDRAWAL' | 'WITHDRAWAL_REFUND'` vào union `txnType`.
- Tiền tệ: dùng `formatVnd` ở [utils/rescueFee.ts:32](mobile/sras/src/utils/rescueFee.ts#L32).
- **Mới** `mobile/sras/src/utils/withdraw.ts`, gồm:
  - `normalizeHolderName(s)` `[R9]`: bảng thay dấu tường minh `/[àáạảãâầấậẩẫăằắặẳẵ]/g→a` …, `đ→d`, cả chữ hoa. Sau đó viết hoa, gộp khoảng trắng.
  - `formatDateTime(iso)` → `dd/MM HH:mm` `[R14]`.
  - `maskPhone(phone)` → `••• ••• 789`.

## Bước 3: Component dùng chung, `mobile/sras/src/components/withdraw/`

| Component | Yêu cầu |
|---|---|
| `OtpCodeInput.tsx` `[R13]` | 1 `TextInput` ẩn phủ lên 6 ô hiển thị: `maxLength={6}`, `keyboardType="number-pad"`, `textContentType="oneTimeCode"`, `autoComplete="sms-otp"`, lọc chỉ giữ chữ số. Đủ 6 số thì gọi `onComplete(code)`. Prop `error` (viền đỏ + rung ngang nhẹ), `disabled`. Ref có `reset()` và `focus()`. |
| `AmountField.tsx` `[R15]` | Ô nhập số tiền cỡ lớn, tự chèn dấu chấm, tối đa 11 chữ số, trả `number`. Chip nhanh: 100.000 · 500.000 · 1.000.000 · Tất cả (= min(số dư, max/lệnh, còn lại hôm nay)). Prop `hint`, `error`, `editable`. |
| `BankPickerModal.tsx` | Modal toàn màn, ô tìm kiếm (không phân biệt hoa thường, bỏ dấu bằng `normalizeHolderName`), FlatList. Mỗi dòng: avatar chữ viết tắt từ `shortName` (banks.json không có logo), `shortName` đậm, `name` nhạt. Trả `Bank` qua `onSelect`. |
| `WithdrawalStatusView.tsx` | Nhận `withdrawal`. PROCESSING: vòng chờ + "Đang chuyển tiền tới ngân hàng · Số tiền đã được tạm giữ từ ví". SUCCESS: dấu tích, số tiền, `transferCode`, `bankSnapshot`, `formatDateTime(payoutSettledAt)`. FAILED: `failureMessage`. Khi PROCESSING thì gọi `getWithdrawal(id)` mỗi 3 giây, tối đa 2 phút, dọn interval khi unmount. Hết thời gian thì báo "Bạn có thể rời màn này, SRAS sẽ thông báo khi có kết quả". Có callback `onSettled`. |
| `WithdrawDestinationSheet.tsx` | Bottom sheet chọn nơi nhận (4.1). |

## Bước 4: Màn hình

### 4.1 Ví tiền: [wallet.tsx](mobile/sras/src/app/garage-owner/wallet.tsx) (2466 dòng, chỉ sửa các chỗ sau)
- Nút "Rút tiền về Ngân hàng" (dòng ~473): đổi thành **"Rút tiền"**, bấm thì mở `WithdrawDestinationSheet`. Sheet gọi song song `getBankAccount()` + `getLimits()`. Lúc tải hiện skeleton; lỗi tải thì hiện thông báo + nút "Thử lại", **không** cho chọn.
- Nội dung sheet:
  - **Số dư rút được**: số lớn, lấy `withdrawableBalance`.
  - **Thẻ (1) "Chuyển tới tài khoản ngân hàng"**:
    - Dòng phụ: `bankName ••••1234 · HOLDER`, hoặc "Chưa liên kết tài khoản nhận tiền".
    - Thẻ **bị khoá** và hiện nguyên văn `blockedReason` khi `blockedReason != null` **và** `complete == true`.
    - Khi `!complete` thì thẻ vẫn bấm được, để sang màn khai báo.
  - **Thẻ (2) "Chuyển vào ví tín dụng"**: "Dùng để trừ hoa hồng · Không rút lại về ngân hàng được".
  - Link "Lịch sử rút tiền" dẫn tới `/garage-owner/withdrawals`.
- Chọn (1): `!complete` thì sang `/garage-owner/bank-account?next=withdraw`; ngược lại sang `/garage-owner/withdraw?target=bank`.
- Chọn (2): sang `/garage-owner/withdraw?target=credit`.
- **Xoá** modal rút tiền giả (dòng ~864-969) và `withdrawModalVisible`, `withdrawAmount`, `bankAccount`, `withdrawing`, `handleConfirmWithdraw`, `handleBackdropPressWithdraw`, cùng các style chỉ modal đó dùng. Không đụng modal nạp tiền / PayOS.
- Danh sách giao dịch (dòng ~761-857): thêm 2 nhánh **trước** nhánh `isDeduction`. Hiện hai loại này đang hiển thị sai thành "Trừ ví tín dụng / Chiết khấu hoa hồng".
  - `WITHDRAWAL`: icon `ArrowDownLeft`, badge "Rút về ngân hàng". Trạng thái: `TRANSFERRED` → "Đã chuyển", `FAILED`/`REJECTED` → "Thất bại", còn lại → "Đang xử lý".
  - `WITHDRAWAL_REFUND`: badge "Hoàn tiền".
  - Không dùng emoji.
- Thay `useEffect(() => fetchWalletOverview(), …)` bằng `useFocusEffect(useCallback(…))`, để quay về từ luồng rút là số dư tự cập nhật mà không gọi 2 lần lúc mở.

### 4.2 **Mới** `mobile/sras/src/app/garage-owner/withdraw.tsx`
- Tham số `target` `[R12]`: không phải `'bank'|'credit'` thì `router.replace('/garage-owner/wallet')`.
- State: `step: 'amount' | 'confirmCredit' | 'otp' | 'result'`.
- Khi mở: tải `getLimits()`, và thêm `getBankAccount()` nếu `bank`.
- `bank` mà `!complete` hoặc `blockedReason` → hiện lý do + nút quay lại, không cho nhập.

**amount**
- Header có nút quay lại. Thẻ "Tới": STK đã che, hoặc "Ví tín dụng · số dư hiện tại".
- `AmountField`, hint: `Tối thiểu X · Tối đa Y/lệnh · Hôm nay còn Z (N lệnh)`.
- Kiểm tra trên máy:
  - `bank`: ≥ min, ≤ max/lệnh, ≤ `remainingAmountToday`, ≤ `withdrawableBalance`.
  - `credit`: ≥ 10.000đ và ≤ số dư, như `handleTransferCashToCredit` cũ.
- Thẻ tóm tắt: số tiền, nơi nhận, "Thường về trong vài phút" (chỉ với bank).
- Nút **"Xác nhận"**:
  - `bank`: `requestWithdrawalOtp(amount)` → sang `otp`. Lỗi hiện inline, bao gồm cooldown "Vui lòng đợi N giây".
  - `credit`: sang `confirmCredit`.

**confirmCredit** `[R1][R2]`
- Tóm tắt số tiền.
- Cảnh báo nổi bật: "Tiền chuyển vào ví tín dụng chỉ dùng để trừ hoa hồng, **không rút lại về ngân hàng được**".
- `SlideToConfirm` ([components/SlideToConfirm.tsx](mobile/sras/src/components/SlideToConfirm.tsx)) → `transferToCredit(amount)`, có `isSubmittingRef` → sang `result` với 2 số dư mới.

**otp** (chỉ `bank`)
- Hiện **chỉ đọc** số tiền + STK đích `[R6]`. Link "Đổi số tiền" quay về `amount`, kèm câu "Mã hiện tại sẽ không dùng được, bạn cần nhận mã mới".
- "Nhập mã 6 số vừa gửi tới {maskPhone(user.phone)}" (`useAuth()`).
- Khi vào bước này: gọi `listWithdrawals(0, 1)` và lưu `latestIdBeforeSubmit` (không có thì `0`) `[R4]`.
- `OtpCodeInput` có `onComplete` → submit. Chặn gửi 2 lần bằng `isSubmittingRef`.
- Đếm ngược "Gửi lại mã sau Ns" theo `otpResendCooldownSeconds`. Hết giờ thì bấm được và gọi lại `requestWithdrawalOtp(amount)`.
- Dòng phụ: "Mã hết hạn sau {otpTtlMinutes} phút · Không cung cấp mã cho bất kỳ ai, kể cả nhân viên SRAS".
- Kết quả `withdraw(amount, code)` (xoá `code` khỏi state ngay sau khi gửi `[R10]`):
  - **Thành công** → sang `result`.
  - **400:**
    - "không đúng": rung, `reset()`, hiện message.
    - Hết hạn / quá số lần / thông tin thay đổi: hiện message, làm nổi "Gửi lại mã".
    - Lỗi khác (quỹ tạm gián đoạn, vượt hạn mức…): hiện message. Mã chưa bị tiêu, vẫn ở bước này.
  - **Timeout / mất mạng** (`isNetworkError`) `[R3][R4][R5]`:
    - **Khoá** ô OTP và nút "Gửi lại mã", hiện "Đang kiểm tra kết quả…".
    - Gọi `listWithdrawals(0, 5)`, thử lại tối đa 3 lần, mỗi lần cách 5 giây.
    - Tìm lệnh có `id > latestIdBeforeSubmit` và `amount` trùng. Có thì sang `result` với lệnh đó.
    - Không có thì hiện "Chưa xác định được kết quả. Vui lòng kiểm tra Lịch sử rút tiền trước khi thử lại", với nút **duy nhất** là "Mở Lịch sử rút tiền" (`router.replace`). **Không** cho thử lại tại chỗ.

**result**
- `WithdrawalStatusView` (bank) hoặc khối thành công (credit).
- Nút "Về ví" (`router.replace('/garage-owner/wallet')`) và "Xem lịch sử rút tiền".
- Back phần cứng/cử chỉ ở bước này (`BackHandler` trên Android) cũng về ví, không quay lại OTP.

### 4.3 **Mới** `mobile/sras/src/app/garage-owner/bank-account.tsx`
- Tham số `next` `[R12]`: chỉ nhận đúng `'withdraw'`, giá trị khác bỏ qua.
- Thẻ STK hiện tại (che). Nếu còn `withdrawLockedUntil` thì hiện banner vàng "Rút tiền tạm khoá đến {formatDateTime}".
- **Bước form:**
  - Ngân hàng: `BankPickerModal`, lưu `bin`.
  - Số tài khoản: `number-pad`, tự bỏ ký tự không phải số, `maxLength={19}`, kiểm tra 6-19.
  - Tên chủ TK: `normalizeHolderName` khi gõ, `maxLength={100}`, kiểm tra `^[A-Z][A-Z ]{1,99}$`.
  - Không điền sẵn STK cũ (server chỉ trả bản che).
  - Nếu `complete` đã true (đang đổi STK) thì hiện cảnh báo trước nút: "Đổi tài khoản sẽ tạm khoá rút tiền 24 giờ để bảo vệ bạn".
- "Tiếp tục": tạo `pendingInput` (object đã chuẩn hoá) → `requestBankAccountOtp(pendingInput)` → **bước OTP**.
- **Bước OTP** `[R6]`:
  - Tóm tắt **chỉ đọc** `pendingInput` (STK hiện đầy đủ để người dùng soát; đây là dữ liệu họ vừa nhập, chỉ nằm trong state).
  - "Sửa thông tin" quay về form và báo phải nhận mã mới.
  - `OtpCodeInput`, đếm ngược và xử lý lỗi giống 4.2.
  - `updateBankAccount(pendingInput, code)`: gửi **đúng object** đã dùng khi xin OTP.
- Thành công: xoá `pendingInput` và OTP khỏi state, rồi:
  - Response có `withdrawLockedUntil` → `router.replace('/garage-owner/wallet')` + thông báo "Đã lưu tài khoản. Rút tiền tạm khoá đến …" `[R7]`.
  - Không khoá và `next === 'withdraw'` → `router.replace('/garage-owner/withdraw?target=bank')`.
  - Còn lại → về màn trước kèm xác nhận ngắn.
- [settings.tsx](mobile/sras/src/app/garage-owner/settings.tsx): thêm mục "Tài khoản nhận tiền" (icon `Landmark`), đặt cạnh "Hồ sơ Gara" (dòng ~313), cùng style các mục hiện có.

### 4.4 **Mới** `mobile/sras/src/app/garage-owner/withdrawals.tsx`
- FlatList phân trang: `size=10`, kéo để làm mới, `onEndReached` thì tải tiếp khi `!last`, có cờ chống tải trùng trang.
- Mỗi dòng: số tiền, `transferCode`, `bankSnapshot`, `formatDateTime(createdAt)`, nhãn theo `displayStatus` (Đang xử lý / Thành công / Thất bại).
- Bấm dòng thì mở sheet có `WithdrawalStatusView`.
- Tham số `id` `[R12]`: phải là số nguyên dương, sai thì bỏ qua. Hợp lệ thì gọi `getWithdrawal(id)` rồi mở sheet; 404 thì báo "Không tìm thấy lệnh rút tiền".
- Trạng thái rỗng: "Chưa có lệnh rút tiền nào".

### 4.5 Route và điều hướng thông báo
- [garage-owner/_layout.tsx](mobile/sras/src/app/garage-owner/_layout.tsx): thêm `Tabs.Screen` cho `withdraw`, `bank-account`, `withdrawals` (`href: null`, `tabBarStyle: { display: 'none' }`, theo mẫu `order-detail`), và thêm cả 3 tên vào `hiddenTabBarRoutes`.
- [notifications/route.ts](mobile/sras/src/notifications/route.ts): trong `case 'GARAGE_OWNER'`, đặt **trước** `if (!id) return null`. Nếu `data.refType === 'WITHDRAWAL'` và có `refId` thì trả `{ pathname: '/garage-owner/withdrawals', params: { id: str(data.refId) } } as unknown as Href` (typed routes chưa sinh lại, giống các dòng hiện có).

---

## 5. Danh sách file

**Mới**
- Mobile:
  - `mobile/sras/src/api/withdrawalApi.ts`
  - `mobile/sras/src/utils/withdraw.ts`
  - `mobile/sras/src/components/withdraw/OtpCodeInput.tsx`, `AmountField.tsx`, `BankPickerModal.tsx`, `WithdrawalStatusView.tsx`, `WithdrawDestinationSheet.tsx`
  - `mobile/sras/src/app/garage-owner/withdraw.tsx`, `bank-account.tsx`, `withdrawals.tsx`
- Backend: `backend/.../dto/response/WithdrawalLimitsResponse.java`
- Skill: `.claude/skills/<taste-skill>/` (sau khi người dùng đồng ý)

**Sửa**
- Mobile:
  - `mobile/sras/src/app/garage-owner/wallet.tsx`, `_layout.tsx`, `settings.tsx`
  - `mobile/sras/src/api/garageWalletApi.ts`
  - `mobile/sras/src/notifications/route.ts`
- Backend:
  - `WithdrawalService.java`, `WithdrawalServiceImpl.java`, `FinanceServiceImpl.java`, `FinanceController.java`
  - Test: `WithdrawalFlowTest.java`, `WithdrawalSecurityWebTest.java`

## 6. Kiểm tra

**Tự động** (phải xanh hết trước khi báo xong; lỗi thì báo nguyên văn):
1. `cd backend && ./mvnw test -Dtest=WithdrawalFlowTest,WithdrawalSecurityWebTest,GarageWalletLedgerTest`
2. `cd mobile/sras && npx tsc --noEmit`
3. `cd mobile/sras && npm run lint`
4. `cd mobile/sras && npx expo export --platform android --output-dir <scratchpad>/expo-export` (Metro bundle thật; xuất ra scratchpad để không sinh `dist/` trong repo)
5. Grep tự soát `[R10]`: không có `console.log` nào trong `src/api/withdrawalApi.ts`, `src/components/withdraw/`, và 3 màn mới in ra `otp`, `code`, `bankAccountNumber`, `pendingInput`.

**Thủ công trên máy thật** (người dùng tự chạy; liệt kê lại bảng này khi bàn giao). Backend `PAYOUT_PROVIDER=MOCK`, chủ gara **đã xác minh SĐT**. SMS đi qua eSMS thật (`ESmsServiceImpl` là `@Primary`).

| Tình huống | Kỳ vọng |
|---|---|
| Chưa có STK, chọn "Chuyển tới tài khoản" | Sang màn khai báo; xong OTP thì về trang nhập tiền, không bị khoá |
| Đổi STK đã có | Về ví + báo khoá; thẻ ngân hàng hiện đúng câu `blockedReason` |
| Sửa form/số tiền sau khi đã nhận mã | Phải nhận mã mới; mã cũ không dùng được |
| Nhập < 10.000đ / > số dư / > 20tr | Lỗi inline, không gọi API |
| Sai OTP 5 lần | Báo hết lượt, nổi nút gửi lại; gửi lại trước 60s bị chặn |
| STK đuôi thường | PROCESSING → SUCCESS; số dư giảm ngay khi tạo lệnh; ví có dòng "Rút về ngân hàng" |
| STK đuôi `000` | FAILED + câu hoàn tiền; số dư trả lại; có dòng "Hoàn tiền" |
| STK đuôi `999` | Đứng ở PROCESSING; hết 2 phút hiện câu "SRAS sẽ thông báo" |
| Tắt Wi-Fi ngay sau khi nhập OTP | Không cho gửi lại; khi có mạng lại thì tìm thấy lệnh hoặc chỉ cho mở Lịch sử |
| Chuyển vào ví tín dụng | Có cảnh báo không rút lại được, trượt để xác nhận, 2 số dư cập nhật, không hỏi OTP |
| Bấm push "Rút tiền thành công" | Mở Lịch sử rút tiền, sheet đúng lệnh |

Chỉ chạy tiền thật (`PAYOUT_PROVIDER=PAYOS` + `ACTION_OTP_SECRET`, 1 lệnh 10.000đ) khi người dùng yêu cầu rõ ràng.

## 7. Sau khi xong
- Cập nhật memory `garage-withdrawal-payout.md`: mobile đã có UI rút tiền; có API `withdraw/limits` với `blockedReason`; `transferCashToCredit` đã kiểm vai trò/trạng thái; modal giả đã bỏ.
- Báo người dùng: file đã đổi, kết quả kiểm tra tự động, bảng test thủ công còn lại, và giới hạn còn tồn tại (`transfer-to-credit` chưa idempotent phía server).
