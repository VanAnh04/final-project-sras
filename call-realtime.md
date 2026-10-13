# [TẠM] Kế hoạch: Thông báo luồng cứu hộ + Push notification (Expo)

> File theo dõi tạm thời — **xóa sau khi mọi chức năng hoàn thiện và test chạy đúng**.
> Khi đó chuyển danh mục thông báo (Phần 0) sang `docs/business-rules.md` và tick `docs/progress.md`.
> Quy ước: `- [ ]` chưa làm · `- [~]` đã code, **chờ test** · `- [x] (YYYY-MM-DD)` đã làm xong **và** test đạt.

Tạo: 2026-10-12 · Nhánh: `sprint-2/feature/call-realtime`

**Trạng thái 2026-10-13:** đã code xong Phần 1–3, E2E backend đạt 83/83. Đã sửa sau review: socket chat đóng khi
app xuống nền (D1), B1 bỏ "90 giây", B7 ghi tên người bấm, log Expo che token.
Còn: (1) Firebase cho Android (mục **Phần 3 — Bạn làm**); (2) test trên máy thật: bấm push mở đúng màn, chat ở
nền, logout (mục **Kiểm tra**); (3) Phần 4 — tài liệu, rồi xóa file này.

**Điều chỉnh so với kế hoạch ban đầu:**
- B2 (tự động nhận) dùng type `ORDER_ACCEPTED` thay vì `NEW_ORDER`, để app phân biệt được lời mời
  chưa nhận (mở tab đơn hàng) với đơn đã nhận (mở chi tiết đơn).
- A7 (hoàn thành) luôn mở `/customer/rescue-tracking?id`. Màn này đã có nút thanh toán, còn
  `/customer/payment` cần tham số `amount` mà push không mang theo.

## Bối cảnh

- Thông báo trong app (`notifications` + `/api/notifications`) đã có từ 2026-09-18, nhưng
  `RescueRequestServiceImpl` **chưa phát thông báo nào**. Hiện chỉ có thông báo khi duyệt gara, thêm nhân viên
  và khi admin cảnh cáo user.
- Chưa có push: `DeviceToken` mới có entity (chưa có repository/endpoint), `sentViaFcm` luôn `false`,
  mobile chưa cài `expo-notifications`. App ở nền thì không ai biết đơn đã đổi trạng thái.

**Mục tiêu:** (1) phát thông báo ở mọi mốc của luồng cứu hộ; (2) gửi push qua **Expo Push Service** khi app ở nền,
bấm vào push mở đúng màn.
**Ngoài phạm vi:** màn danh sách thông báo, badge chuông, admin gửi thông báo.

---

## Phần 0 — Danh mục thông báo

Quy ước:
- Mỗi dòng sinh **1 bản ghi `notifications`** + **1 push** tới mọi thiết bị đang đăng nhập của người nhận.
- `{code}` là mã đơn, `{total}` là `totalAmount` định dạng VNĐ.
- Thông báo đơn cứu hộ có `refType = "RESCUE_REQUEST"`, `refId = id đơn`.
- **Không** gửi cho chính người thực hiện hành động.
- Push chỉ gửi **sau khi giao dịch commit thành công**; rollback thì không gửi.

### A. Khách hàng (CUSTOMER) nhận

| # | Khi nào (hành động → trạng thái) | Nơi gọi | Type | Tiêu đề | Nội dung | Bấm vào mở |
|---|---|---|---|---|---|---|
| A1 | Gara bấm **Nhận đơn** / gara tự động nhận → `ACCEPTED` | `acceptOffer` | `ORDER_ACCEPTED` | Gara đã nhận yêu cầu | {garage} đã nhận yêu cầu cứu hộ {code} và đang sắp xếp nhân viên. | `/customer/rescue-tracking?id` |
| A2 | **Không tìm được gara** trong 50km → `NO_GARAGE_FOUND` (lúc tạo đơn hoặc gara cuối cùng từ chối) | `createRequest`, `garageDecline` | `NO_GARAGE_FOUND` *(mới)* | Chưa tìm được gara | Hiện không có gara phù hợp quanh vị trí của bạn cho yêu cầu {code}. Vui lòng thử lại sau. | `/customer/rescue-tracking?id` |
| A3 | Chủ gara **gán nhân viên + xe** → `ASSIGNED` | `assignStaff` | `STAFF_ASSIGNED` *(mới)* | Đã có nhân viên cứu hộ | {staff} · xe {biển số} sẽ hỗ trợ bạn cho đơn {code}. | `/customer/rescue-tracking?id` |
| A4 | Nhân viên trượt **Xuất phát** → `EN_ROUTE` | `advanceStatus` | `STAFF_EN_ROUTE` | Nhân viên đang trên đường tới | {staff} đã xuất phát. Mở ứng dụng để theo dõi vị trí xe cứu hộ. | `/customer/rescue-tracking?id` |
| A5 | Nhân viên trượt **Đã đến** → `ARRIVED` | `advanceStatus` | `STAFF_ARRIVED` | Nhân viên đã đến nơi | {staff} đã tới vị trí của bạn và bắt đầu kiểm tra xe. | `/customer/rescue-tracking?id` |
| A6 | Nhân viên **gửi báo giá** → `DIAGNOSED` (kể cả gửi lại) | `submitQuote` | `NEW_QUOTE` | Có báo giá sửa chữa | Tổng chi phí dự kiến {total} cho đơn {code}. Vui lòng xem và duyệt báo giá. | `/customer/rescue-quote?id` |
| A7 | Nhân viên bấm **Hoàn thành** → `COMPLETED` | `advanceStatus` | `REPAIR_DONE` | Đã hoàn thành cứu hộ | Đơn {code} đã hoàn thành, tổng {total}. + Tiền mặt: "Vui lòng thanh toán tiền mặt cho nhân viên." / Chuyển khoản: "Vui lòng thanh toán trong ứng dụng." | `/customer/rescue-tracking?id` (có nút thanh toán) |
| A8 | Nhân viên/chủ gara **xác nhận thu tiền mặt** → `PAID` | `confirmCashPaid` | `PAYMENT_RECEIVED` *(mới)* | Thanh toán thành công | Gara đã xác nhận nhận {total} tiền mặt cho đơn {code}. Cảm ơn bạn đã dùng SRAS! | `/customer/activity` |

- [~] A1 · [~] A2 · [~] A3 · [~] A4 · [~] A5 · [~] A6 · [~] A7 · [~] A8

### B. Chủ gara (GARAGE_OWNER) nhận

| # | Khi nào | Nơi gọi | Type | Tiêu đề | Nội dung | Bấm vào mở |
|---|---|---|---|---|---|---|
| B1 | Hệ thống **gửi lời mời đơn** cho gara (không auto-accept), gồm cả mời lại khi gara trước từ chối | `offerNearestGarage` | `NEW_ORDER` | Có yêu cầu cứu hộ mới | {Ô tô/Xe máy} cách gara {x} km — {địa chỉ}. Mở ứng dụng để xem và nhận đơn. *(bỏ "90 giây" vì backend chưa có job hết hạn lời mời)* | `/garage-owner/orders` |
| B2 | Hệ thống **tự động nhận** đơn (gara bật auto-accept) | `offerNearestGarage` → `acceptOffer` | `ORDER_ACCEPTED` | Đã tự động nhận đơn | Đơn {code} đã được tự động nhận. Hãy gán nhân viên và xe cứu hộ. | `/garage-owner/order-detail?id` |
| B3 | Khách **hủy đơn** khi gara đang có lời mời (`PENDING_GARAGE`) hoặc đã nhận (`ACCEPTED`) → `CANCELLED` | `cancelByCustomer` | `ORDER_CANCELLED` *(mới)* | Khách đã hủy yêu cầu | Yêu cầu {code} đã bị khách hủy. | `/garage-owner/orders` |
| B4 | Khách **duyệt báo giá** → `REPAIRING_ONSITE` | `advanceStatus` (actor là khách) | `QUOTE_RESPONDED` | Khách đã duyệt báo giá | Khách đồng ý báo giá {total} cho đơn {code}. | `/garage-owner/order-detail?id` |
| B5 | Nhân viên **hoàn thành** → `COMPLETED` | `advanceStatus` | `REPAIR_DONE` | Đơn đã hoàn thành | {staff} đã hoàn thành đơn {code}, chờ khách thanh toán {total}. | `/garage-owner/order-detail?id` |
| B6 | Khách **thanh toán chuyển khoản** → `PAID` | `payByTransfer` | `PAYMENT_RECEIVED` | Khách đã thanh toán | Đơn {code} đã được thanh toán chuyển khoản {total}. | `/garage-owner/order-detail?id` |
| B7 | **Nhân viên** xác nhận thu tiền mặt → `PAID` (bỏ qua nếu chính chủ gara bấm) | `confirmCashPaid` | `PAYMENT_RECEIVED` | Nhân viên đã thu tiền mặt | {người bấm} đã thu {total} tiền mặt cho đơn {code}. | `/garage-owner/order-detail?id` |

- [~] B1 · [~] B2 · [~] B3 · [~] B4 · [~] B5 · [~] B6 · [~] B7

### C. Nhân viên gara (GARAGE_STAFF) nhận

| # | Khi nào | Nơi gọi | Type | Tiêu đề | Nội dung | Bấm vào mở |
|---|---|---|---|---|---|---|
| C1 | Chủ gara **gán đơn** → `ASSIGNED` | `assignStaff` | `TASK_ASSIGNED` *(mới)* | Bạn có nhiệm vụ cứu hộ mới | {Ô tô/Xe máy} tại {địa chỉ}. Khách {tên} · {SĐT}. Bấm để xem và xuất phát. | `/garage-staff/home` |
| C2 | Khách **duyệt báo giá** → `REPAIRING_ONSITE` | `advanceStatus` (actor là khách) | `QUOTE_RESPONDED` | Khách đã duyệt báo giá | Khách đồng ý báo giá {total} cho đơn {code}. Bắt đầu sửa chữa. | `/garage-staff/repair-progress?id` |
| C3 | Khách **thanh toán chuyển khoản** → `PAID` | `payByTransfer` | `PAYMENT_RECEIVED` | Khách đã thanh toán | Đơn {code} đã thanh toán chuyển khoản {total}. Bạn có thể nhận đơn mới. | `/garage-staff/home` |
| C4 | **Chủ gara** xác nhận thu tiền mặt (bỏ qua nếu chính nhân viên bấm) | `confirmCashPaid` | `PAYMENT_RECEIVED` | Đơn đã thanh toán | Gara đã xác nhận thu {total} tiền mặt cho đơn {code}. | `/garage-staff/home` |

- [~] C1 · [~] C2 · [~] C3 · [~] C4

### D. Tin nhắn chat (mọi vai trò)

| # | Khi nào | Người nhận | Lưu bản ghi? | Tiêu đề / Nội dung | Bấm vào mở |
|---|---|---|---|---|---|
| D1 | Tin nhắn mới trong chat đơn (`ChatServiceImpl`), **chỉ khi người nhận không có kết nối `/ws/chat` đang mở** | Người nhận tin | **Không** (chỉ push) | {tên người gửi} / nội dung (cắt 100 ký tự), ảnh → "[Hình ảnh]" | `/chat` (params như `chat.tsx`) |

> Mobile đóng `/ws/chat` khi app xuống nền (`AuthContext`, AppState `background`) và nối lại khi `active`
> → "online" = app đang ở foreground. Màn chat nạp bù tin nhắn khi socket nối lại. (2026-10-13)

- [~] D1

### E. Thông báo đã có sẵn, nay tự có thêm push

- [~] Admin duyệt/từ chối hồ sơ gara (`GarageServiceImpl`) → `GARAGE_REVIEWED` → mở `/customer`
- [~] Chủ gara tạo tài khoản / thay đổi nhân viên (`GarageStaffServiceImpl`)
- [~] Admin cảnh cáo (`SYSTEM_WARNING`): sửa `UserServiceImpl` gọi `notificationService.createNotification`
      thay vì tự `new Notification`

### F. Cố ý KHÔNG gửi

- Cập nhật GPS (`/location`) — quá dày.
- Một gara từ chối nhưng hệ thống chuyển được sang gara kế tiếp (gara kế tiếp nhận B1).
- Gara từ chối lời mời — không báo lại cho chính gara.
- **Khách từ chối báo giá** — backend chưa có sự kiện (app đi thẳng `/customer/payment?rejectQuote=1`),
  nhân viên chỉ biết qua C3/C4. Cần endpoint từ chối báo giá trước → để sau.

**Enum `NotificationType` thêm 5 giá trị:** `NO_GARAGE_FOUND`, `STAFF_ASSIGNED`, `TASK_ASSIGNED`,
`ORDER_CANCELLED`, `PAYMENT_RECEIVED`. `CHAT_MESSAGE` chỉ là `data.type` trong push, không vào enum.

---

## Phần 1 — Backend: hạ tầng push

Không đổi schema: dùng lại cột `device_tokens.fcm_token` để lưu Expo push token (`ExponentPushToken[...]`).

- [~] `DeviceTokenRepository` (`findByFcmToken`, `findByUserIdAndIsDeletedFalse`)
- [~] `RegisterDeviceTokenRequest` (`token`, `platform`)
- [~] `DeviceTokenService` + impl: `register` (upsert, chuyển chủ nếu máy đổi tài khoản), `unregister`, `deactivate`
- [~] `DeviceTokenController` `/api/device-tokens`: `POST /`, `DELETE /?token=`
- [~] `ExpoPushClient` (`RestClient` → `https://exp.host/--/api/v2/push/send`, ≤100 message/lần,
      `DeviceNotRegistered` → `deactivate`, không log token)
- [~] Cấu hình `app.push.enabled` (`PUSH_ENABLED`), `app.push.expo-access-token` (`EXPO_ACCESS_TOKEN`) +
      `.env.example`; test H2 tắt push
- [~] `PushService.sendAfterCommit` → `PushRequestedEvent` → `PushEventListener` (`@Async` + `@TransactionalEventListener(AFTER_COMMIT)`)
      → gửi push → `sentViaFcm = true`; bật `@EnableAsync`
- [~] Chat (D1): `ChatWebSocketHandler.isOnline(userId)` + `PushService.sendAfterCommit(...)` (không lưu `notifications`)

## Phần 2 — Backend: gắn thông báo vào luồng cứu hộ

- [~] Thêm 5 giá trị enum vào `NotificationType`
- [~] `RescueNotifier` (`@Component`) — mỗi dòng A–C là 1 method, gom câu chữ tiếng Việt
- [~] Gọi notifier sau `recordHistory(...)` ở các method trong `RescueRequestServiceImpl`
      (`advanceStatus` rẽ nhánh theo trạng thái đích; B4/C2 chỉ khi actor là khách)

## Phần 3 — Mobile (`mobile/sras`)

⚠️ Expo Go Android không nhận remote push → cần development build.

- [~] `npx expo install expo-notifications`; `app.json`: plugin `expo-notifications` (color, defaultChannel)
- [x] EAS project `@vovanson/customer` → `owner` + `extra.eas.projectId` trong `app.json` (2026-10-13)
      — đủ cho **iOS + Expo Go**
- [ ] **(Bạn làm, chỉ khi cần Android)** tạo Firebase project → `google-services.json` +
      `android.googleServicesFile`; upload FCM v1 credentials lên EAS; rồi build dev (`npx expo run:android`
      hoặc `eas build --profile development`)
- [~] `src/api/notificationApi.ts` (`registerDevice`, `unregisterDevice`, `getRecent`, `markRead`) + chuyển các call
      trực tiếp trong `customer/index.tsx` sang module này
- [~] `src/notifications/push.ts` (handler foreground, channel `default`, `registerForPushAsync`)
- [~] `src/notifications/route.ts` (`routeForNotification(role, data)` theo cột "Bấm vào mở")
- [~] `src/components/PushNotificationManager.tsx` mount trong `src/app/_layout.tsx` (đăng ký token + điều hướng khi bấm, cả cold start)
- [~] `AuthContext` logout: gọi `unregisterDevice` trước khi xóa token
- [~] Model: thêm 5 enum mới (+ `SYSTEM_WARNING` đang thiếu) ở `mobile/sras/src/models/enums.ts` và
      `web/admin/src/models/enums.ts`

## Phần 4 — Tài liệu (làm khi đã test xong, rồi xóa file này)

- [ ] `docs/business-rules.md`: mục "Thông báo" = danh mục Phần 0
- [ ] `docs/api.md`: `/api/device-tokens` + `data` của push
- [ ] `docs/database.md`: enum mới, `fcm_token` lưu Expo token
- [ ] `docs/architecture.md`: luồng push (AFTER_COMMIT → @Async → Expo)
- [ ] `docs/setup.md`: `PUSH_ENABLED`, `EXPO_ACCESS_TOKEN`, dev build, `google-services.json`, EAS projectId
- [ ] `docs/progress.md`: tick "Push notification (Expo push)", thêm/tick "Thông báo cho các mốc luồng cứu hộ",
      thêm `[ ]` "Thông báo khi khách từ chối báo giá"
- [ ] Xóa `call-realtime.md`

## Kiểm tra

- [x] `cd backend && ./mvnw -q compile && ./mvnw test` (2026-10-12)
- [x] E2E REST trọn luồng (tạo → mời → nhận → gán → EN_ROUTE → ARRIVED → báo giá → duyệt → COMPLETED → thanh toán
      TM + CK), thêm ca hủy đơn và ca không có gara; đối chiếu A1–C4 trong bảng `notifications`
      (đúng người nhận/type/refId, không có bản ghi cho người thực hiện) (2026-10-13)
      — 83/83 đạt: A1–A8, B1–B7, C1–C4, D1 (offline có push / đang mở WS thì không), push qua Expo bằng token giả
      (`DeviceNotRegistered` → token bị vô hiệu, chạy trên thread `task-N` sau commit), đổi chủ token, hủy token.
      Tự dọn dữ liệu sau test.
- [x] iPhone thật (Expo Go) đăng ký token và nhận được push từ luồng cứu hộ (2026-10-13)
- [ ] iOS: bấm push mở đúng màn (app ở nền + app tắt hẳn); chat ở nền nhận D1, đang mở chat thì không;
      logout → không còn nhận push
- [ ] Dev build Android thật: đăng nhập → có `device_tokens`; app ở nền nhận push, bấm mở đúng màn;
      app tắt hẳn bấm push vẫn đúng màn; `sent_via_fcm = true`; chat ở nền nhận D1, đang mở chat thì không;
      logout → không còn nhận push
- [ ] `cd mobile/sras && npm run lint`; `cd web/admin && npm run build && npm run lint`
      (2026-10-13: file mới của luồng thông báo sạch lint + tsc; còn lỗi cũ ở `IncomingRescueModal` (Animated ref),
      `garage-owner/index.tsx`, `garage-profile.tsx`. Web admin `node_modules` cài thiếu (`lucide-react`,
      `react-router-dom`…) → chạy `npm ci` rồi build lại; thay đổi web chỉ là thêm giá trị union `NotificationType`)
