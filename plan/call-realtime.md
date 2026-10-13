# [TẠM] Kế hoạch: Gọi thoại real-time trong app (VoIP miễn phí)

> File theo dõi tạm thời — **xóa phần này khi chức năng đã hoàn thiện và test chạy đúng**. Khi đó chuyển Phần 0
> sang `docs/business-rules.md` và tick `docs/progress.md`.
> Quy ước: `- [ ]` chưa làm · `- [~]` đã code, **chờ test** · `- [x] (YYYY-MM-DD)` đã làm xong **và** test đạt.

Tạo: 2026-10-13 · Nhánh: `sprint-2/feature/call-realtime`. Tạo nhánh này từ `sprint-2/feature/notification`, vì
hạ tầng push còn nằm ở đó, chưa merge vào `develop`.

**Trạng thái 2026-10-13:**

- **Backend xong và đã test:** E2E 117/117 (chạy backend thật ở cổng riêng) + 12 unit test (`./mvnw test`).
- **Mobile đã code xong (`[~]`):** lint/tsc không thêm lỗi mới; máy trạng thái `callManager` qua 51/51 test bằng mock +
  đồng hồ giả; trang engine WebRTC qua 26/26 test trong Chrome headless với micro giả (hai trang nối nhau, có âm
  thanh hai chiều, mute/stop/lỗi micro đúng).
- **Còn lại, cần người dùng:** (1) ⛳ thử `/call-test` rồi thử cuộc gọi thật trên **iPhone + Android** (Phần 1 và Phần
  5); (2) ⛳ 4G ↔ Wi-Fi sau khi dựng TURN; (3) tick `docs/progress.md` và xóa file này.
- **Phần 4 (web admin) bỏ** theo yêu cầu của người dùng — call-realtime chỉ làm ở mobile + backend.

## Hướng dẫn cho agent thực thi (đọc trước khi code)

1. **Đọc trước, theo thứ tự:**
   - `CLAUDE.md` (gốc), `backend/CLAUDE.md`, `mobile/sras/CLAUDE.md`, `mobile/sras/AGENTS.md`.
   - `docs/architecture.md` §4, `docs/business-rules.md` §9.
   - Hai file mẫu: `backend/.../service/impl/ChatServiceImpl.java` và `mobile/sras/src/realtime/chatSocket.ts`.
2. **Làm theo đúng thứ tự Phần 1 → 7.** Sau mỗi bước có "Xong khi…", tự kiểm tra trước khi sang bước tiếp:
   - Backend: `cd backend && ./mvnw -q compile`.
   - Mobile: `cd mobile/sras && npx tsc --noEmit`.
3. **Cập nhật checklist** trong file này: đánh `[~]` khi code xong, `[x] (ngày)` khi test đạt. **Không** tự
   commit/push — người dùng tự commit.
4. **Điểm dừng ⛳** là những bước cần người dùng thử trên điện thoại thật. Tới đó thì dừng, báo cần thử gì, và chờ
   kết quả. Riêng Phần 1 (thử WebView) và Phần 2 (backend) không phụ thuộc nhau: trong lúc chờ kết quả Phần 1, cứ làm
   tiếp Phần 2.
5. **Quy ước bắt buộc:**
   - Message lỗi và chữ hiển thị trên UI viết **tiếng Việt**; tên biến/hàm viết tiếng Anh.
   - Backend: controller mỏng; không trả entity ra ngoài; JSON đẩy qua WebSocket **build bằng tay**.
   - Mobile: chỉ gọi API qua `src/api/*` (dùng `axiosClient`); style bằng `StyleSheet.create`; icon dùng
     `lucide-react-native`; ảnh hiển thị qua `resolveFileUrl`; không gọi `Dimensions.get()` ở cấp module.
   - Expo 57: **tra docs v57** (`https://docs.expo.dev/versions/v57.0.0/`) trước khi dùng `expo-audio` /
     `expo-keep-awake`. Tên hàm ghi trong file này chỉ để định hướng.
   - Refactor code chat thì **không được đổi hành vi** của chat.

## Bối cảnh

- `docs/progress.md` §6 còn mục `[ ] Gọi miễn phí (VoIP)`.
- Nút "Gọi miễn phí" ở `customer/rescue-tracking.tsx` hiện chỉ hiện Alert "sắp ra mắt". Các nút gọi khác đều dùng
  `tel:`, tức là tốn cước và lộ số điện thoại thật.
- Hạ tầng dùng lại:
  - WebSocket `/ws/chat`: xác thực bằng `?token`, `ChatWebSocketHandler.sendToUser/isOnline`.
  - Push Expo: `PushService.sendAfterCommit`.
  - Logic xác định người tham gia đơn: `roleOf` / `resolvePeer` trong `ChatServiceImpl`.

**Mục tiêu:** khách, chủ gara và nhân viên **gọi thoại** (không có video) miễn phí qua Internet ngay trong app,
nghe và nói 2 chiều theo thời gian thực.

**Ngoài phạm vi:**

- Video, gọi nhóm, ghi âm.
- Giao diện cuộc gọi của hệ điều hành (CallKit/ConnectionService).
- Nghe máy khi app đang ở nền hoặc đã tắt.

---

## Phần 0 — Quyết định & luật nghiệp vụ (đã chốt)

- **Công nghệ:** WebRTC chạy trong một **WebView ẩn**.
  - Chạy được ngay trên Expo Go (iPhone đang dùng để test) và Android.
  - Không cần build native, không cần tài khoản dịch vụ bên thứ 3.
  - Bản build phát hành (EAS) cũng chạy được.
- **Ai gọi được cho ai:** giống chat — khách ↔ chủ gara, khách ↔ nhân viên, chủ gara ↔ nhân viên.
  Vai STAFF, dù là người gọi hay người nhận, phải là **nhân viên được gán** cho đơn (`rescueRequest.staff`).
  **Không** lấy đại nhân viên đầu tiên của gara như chat đang làm.
- **Khi nào được gọi:** chỉ khi trạng thái đơn ∈ `ACCEPTED, ASSIGNED, EN_ROUTE, ARRIVED, DIAGNOSED,
REPAIRING_ONSITE, TOWING, COMPLETED, AWAITING_PAYMENT`. Nếu đơn đổi trạng thái giữa lúc đang gọi thì cuộc gọi vẫn
  tiếp tục, không bị cắt.
- **Máy bận:** mỗi người chỉ có tối đa 1 cuộc gọi `RINGING` hoặc `ONGOING`.
- **Thời gian chờ:**
  - Đổ chuông tối đa **45s**, quá thì thành `MISSED`.
  - Đang `ONGOING` mà một bên mất WebSocket quá **20s** thì server chuyển sang `FAILED`.
  - Phía client: đang kết nối quá 20s, hoặc rớt kết nối quá 10s, thì client tự kết thúc cuộc gọi.
- **Push** (không lưu vào bảng `notifications`, giống push tin nhắn chat):
  - `INCOMING_CALL`: chỉ gửi khi người nhận **không có** phiên WebSocket. Tự hết hạn sau 45s. Bấm vào thì mở màn
    đổ chuông.
  - `MISSED_CALL`: gửi cho người nhận khi cuộc gọi thành `MISSED` hoặc `CANCELLED`. Bấm vào thì mở `/chat` với
    người gọi.
- Nút "Gọi" (`tel:`) cũ **giữ nguyên**, đặt cạnh nút "Gọi miễn phí".

**Trạng thái `CallStatus`:**

| Trạng thái  | Khi nào                                | Câu hiện phía người gọi           | Câu hiện phía người nhận | Push nhỡ |
| ----------- | -------------------------------------- | --------------------------------- | ------------------------ | -------- |
| `RINGING`   | Vừa tạo cuộc gọi                       | "Đang gọi…"                       | "Cuộc gọi đến…"          | —        |
| `ONGOING`   | Người nhận đã nghe máy                 | "Đang kết nối…" → đồng hồ `mm:ss` | như bên trái             | —        |
| `ENDED`     | Một bên cúp máy khi đang nói           | "Cuộc gọi kết thúc · mm:ss"       | như bên trái             | —        |
| `REJECTED`  | Người nhận từ chối                     | "Người nhận đã từ chối"           | "Đã từ chối"             | Không    |
| `CANCELLED` | Người gọi cúp khi đang đổ chuông       | "Đã hủy cuộc gọi"                 | "Cuộc gọi nhỡ"           | Có       |
| `MISSED`    | Đổ chuông hết 45s không ai nghe        | "Không trả lời"                   | "Cuộc gọi nhỡ"           | Có       |
| `FAILED`    | Mất kết nối, hoặc server khởi động lại | "Mất kết nối"                     | "Mất kết nối"            | Không    |

## Kiến trúc

- **Báo hiệu (signaling):** client gửi lên server bằng **REST**; server đẩy xuống client qua **`/ws/chat`**.
  Handler vẫn bỏ qua mọi tin client gửi lên. Ngoại lệ duy nhất là gói heartbeat `PING`, cũng bị bỏ qua.
- **Âm thanh:** WebRTC P2P (codec Opus, có khử vang) chạy trong một WebView 1×1 ẩn.
  - Không gửi ICE candidate rời từng cái: chờ gom đủ (tối đa 2.5s) rồi gửi một lần cùng SDP. Nhờ vậy mỗi cuộc gọi
    chỉ cần đúng 2 lần `POST /signal`.
- **NAT:** STUN mặc định dùng của Google. TURN cấu hình qua biến môi trường; backend chỉ trả cấu hình này cho
  client đã đăng nhập.

```
Người gọi A                    Backend                               Người nhận B
POST /api/calls ─────────────► RINGING ──WS CALL_INCOMING───────────► màn đổ chuông
  (tiếng chờ)                    └─ B không có WS → push INCOMING_CALL (ttl 45s)
                               ◄──────────────────────── POST /{id}/accept
◄─ WS CALL_ACCEPTED ────────── ONGOING ──WS CALL_ACCEPTED───────────► (máy khác của B tắt chuông)
mount engine, tạo OFFER
POST /{id}/signal OFFER ─────► chuyển tiếp ──WS CALL_SIGNAL─────────► engine B tạo ANSWER
◄─ WS CALL_SIGNAL ANSWER ───── chuyển tiếp ◄── POST /{id}/signal ANSWER
◄════════════════ âm thanh P2P WebRTC (STUN/TURN) ═════════════════►
POST /{id}/end ──────────────► ENDED ──WS CALL_ENDED───────────────► đóng
```

## Hợp đồng dữ liệu (backend và mobile phải khớp đúng từng tên trường)

**REST `/api/calls`** — bắt buộc đăng nhập. Body/response bọc trong `ApiResponse` (`{ success, message, data }`).

| Method | Path                     | Body                                                 | `data` trả về                      |
| ------ | ------------------------ | ---------------------------------------------------- | ---------------------------------- |
| POST   | `/api/calls`             | `{ "rescueRequestId": 123, "peer": "STAFF" }`        | `CallResponse` (có `calleeOnline`) |
| POST   | `/api/calls/{id}/accept` | —                                                    | `CallResponse`                     |
| POST   | `/api/calls/{id}/reject` | —                                                    | `CallResponse`                     |
| POST   | `/api/calls/{id}/end`    | `{ "failed": false }` (có thể bỏ trống)              | `CallResponse`                     |
| POST   | `/api/calls/{id}/signal` | `{ "type": "OFFER" \| "ANSWER", "sdp": "v=0\r\n…" }` | `null`                             |
| GET    | `/api/calls/active`      | —                                                    | `CallResponse` hoặc `null`         |
| GET    | `/api/calls/{id}`        | —                                                    | `CallResponse`                     |
| GET    | `/api/calls/ice-servers` | —                                                    | `IceServerResponse[]`              |

```json
// CallResponse
{ "id": 55, "rescueRequestId": 123, "rescueCode": "SR…", "status": "RINGING",
  "callerId": 40, "callerRole": "CUSTOMER", "callerName": "…", "callerAvatarUrl": null,
  "calleeId": 41, "calleeRole": "STAFF", "calleeName": "…", "calleeAvatarUrl": "/uploads/…",
  "createdAt": "…", "answeredAt": null, "endedAt": null, "durationSec": null, "calleeOnline": true }
// IceServerResponse[] — đúng cấu trúc RTCIceServer; trường null phải bỏ đi trước khi đưa cho RTCPeerConnection
[ { "urls": ["stun:stun.l.google.com:19302"] },
  { "urls": ["turn:turn.x.vn:3478?transport=udp", "turns:turn.x.vn:443?transport=tcp"],
    "username": "1760400000:40", "credential": "base64…" } ]
```

**Message lỗi** (giữ đúng câu chữ):

| Mã  | Message                                                           | Khi nào                                      |
| --- | ----------------------------------------------------------------- | -------------------------------------------- |
| 404 | "Không tìm thấy yêu cầu cứu hộ"                                   | Đơn không tồn tại                            |
| 404 | "Không tìm thấy cuộc gọi"                                         | Cuộc gọi không tồn tại                       |
| 401 | "Bạn không thuộc đơn cứu hộ này"                                  | Người gọi không thuộc đơn (giống chat)       |
| 401 | "Bạn không thuộc cuộc gọi này"                                    | Người thao tác không phải 2 bên của cuộc gọi |
| 400 | "Chỉ gọi được khi đơn đang được xử lý"                            | Trạng thái đơn không cho gọi                 |
| 400 | "Chỉ nhân viên được gán cho đơn mới gọi được"                     | Người gọi là STAFF nhưng không được gán      |
| 400 | "Đơn chưa được gán nhân viên" / "Đơn chưa được gara nào nhận"     | Không xác định được người nhận               |
| 400 | "Không thể tự gọi cho chính mình"                                 | Gọi cho chính mình                           |
| 400 | "Bạn đang có một cuộc gọi khác"                                   | Người gọi đang bận                           |
| 400 | "Người nhận đang bận, vui lòng gọi lại sau"                       | Người nhận đang bận                          |
| 400 | "Chỉ người nhận mới trả lời hoặc từ chối được"                    | Người gọi bấm accept/reject                  |
| 400 | "Cuộc gọi đã được trả lời hoặc đã kết thúc"                       | accept/reject khi không còn `RINGING`        |
| 400 | "Cuộc gọi không còn diễn ra"                                      | `signal` khi không còn `ONGOING`             |
| 400 | "Chỉ người gọi được gửi OFFER" / "Chỉ người nhận được gửi ANSWER" | Gửi sai loại tín hiệu                        |

**Sự kiện WebSocket** (server → client, trên `/ws/chat`):

```json
{"event":"CALL_INCOMING","call":{ …CallResponse… }}             // → mọi máy của người nhận
{"event":"CALL_ACCEPTED","callId":55}                           // → CẢ 2 bên (mọi máy)
{"event":"CALL_SIGNAL","callId":55,"type":"OFFER","sdp":"…"}     // → bên còn lại
{"event":"CALL_ENDED","callId":55,"status":"ENDED","durationSec":83}  // → cả 2 bên
```

Client → server chỉ có heartbeat `{"event":"PING"}`, gửi mỗi 25s; server bỏ qua.

**`data` của push:**

| Type            | Các trường                                                                         | Tiêu đề        | Nội dung                                               | ttl       |
| --------------- | ---------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------ | --------- |
| `INCOMING_CALL` | `{ type, callId, rescueRequestId, peer: <role người gọi>, peerName, peerAvatar? }` | "Cuộc gọi đến" | "{tên} đang gọi cho bạn (đơn {code}). Bấm để trả lời." | 45        |
| `MISSED_CALL`   | `{ type, rescueRequestId, peer, peerName, peerPhone?, peerAvatar? }`               | "Cuộc gọi nhỡ" | "{tên} đã gọi cho bạn (đơn {code})."                   | không đặt |

**Giao thức engine** (React Native ↔ WebView):

- RN → engine: gọi `window.__callEngine.handle(cmd)` qua `injectJavaScript`. Các lệnh:
  - `{ cmd: 'start', role: 'caller' | 'callee', iceServers }`
  - `{ cmd: 'remoteOffer', sdp }`
  - `{ cmd: 'remoteAnswer', sdp }`
  - `{ cmd: 'mute', muted }`
  - `{ cmd: 'stop' }`
- Engine → RN: `window.ReactNativeWebView.postMessage(JSON)`. Các sự kiện:
  - `{ evt: 'loaded' }`: trang đã chạy xong script, sẵn sàng nhận lệnh `start`.
  - `{ evt: 'ready' }`: đã lấy được micro và tạo xong `RTCPeerConnection`, sẵn sàng nhận `remoteOffer`.
  - `{ evt: 'offer' | 'answer', sdp }`
  - `{ evt: 'state', state }`: giá trị `connectionState`.
  - `{ evt: 'ice', state }`: giá trị `iceConnectionState`, dùng dự phòng cho iOS cũ.
  - `{ evt: 'error', code: 'MIC_DENIED' | 'MIC_ERROR' | 'NO_WEBRTC' | 'ENGINE', message }`
- Quy đổi trạng thái kết nối:
  - `connected` hoặc `completed` → đã kết nối.
  - `disconnected` → đang rớt, có thể tự nối lại.
  - `failed` → hỏng hẳn.

---

## Phần 1 — Kiểm chứng WebView trên máy thật ⛳ (làm đầu tiên, KHÔNG commit)

- [~] Tạo route tạm `mobile/sras/src/app/call-test.tsx`. Trong đó là một WebView có đúng các prop như
      `CallEngine` ở Phần 3, chạy trang loopback:
  - `getUserMedia({ audio: true })`.
  - Tạo `pc1` và `pc2`, trao đổi offer/answer/candidate ngay trong trang.
  - Phát track của `pc2` bằng `<audio autoplay playsinline>`, tức là nghe lại giọng của chính mình.
  - In trạng thái lên màn hình.
- [ ] ⛳ Nhờ người dùng chạy `npx expo start -c`, mở `/call-test` trên **iPhone (Expo Go)** và **Android (Expo Go)**.
      Điều kiện đạt (cả 2 máy):
  - Hệ điều hành hỏi quyền micro **một lần**, cấp xong không hỏi lại.
  - Trạng thái lên `connected`.
  - Nghe được giọng mình phát ra loa.
- [ ] Đạt → xóa `call-test.tsx`. Không đạt trên iOS → **dừng**, báo người dùng để chuyển sang phương án native
      (`react-native-webrtc` + dev build). Phần 2 (backend) và `callManager` vẫn dùng được, chỉ thay engine.

## Phần 2 — Backend (`backend/src/main/java/com/sras/backend`)

### 2.1 Tách code dùng chung ra khỏi chat (chat giữ nguyên hành vi)

- [x] (2026-10-13) Tạo `service/impl/RescueParticipants.java` (`@Component`, `@RequiredArgsConstructor`, dùng
      `GarageStaffRepository`):
  - Hằng `public static final String CUSTOMER = "CUSTOMER", GARAGE = "GARAGE", STAFF = "STAFF"`.
  - `roleOf(RescueRequest, User)`, `resolvePeer(RescueRequest, String)`, `normalizeRole(String)`: **chép y nguyên**
    từ `ChatServiceImpl`.
  - Thêm `isAssignedStaff(RescueRequest, User)`: kiểm `req.getStaff() != null && req.getStaff().getUser().id == user.id`.
  - Thêm `resolveAssignedPeer(RescueRequest, String)`: giống `resolvePeer`, nhưng STAFF bắt buộc
    `req.getStaff() != null`; nếu không thì ném `BadRequestException("Đơn chưa được gán nhân viên")`.
- [x] (2026-10-13) `ChatServiceImpl`: bỏ các hàm private trên và hằng `ROLE_*`, gọi sang `RescueParticipants`.
- [x] (2026-10-13) Tạo `websocket/WsJson.java`: `final class`, có `static String str(String)` (chuyển nguyên hàm `jsonStr` của
      `ChatServiceImpl`, trả `"null"` khi null) và `static String num(Number)`. `ChatServiceImpl.toJson` dùng `WsJson.str`.
- **Xong khi:** compile được, và gửi/nhận chat chạy như cũ (E2E chat cũ vẫn đạt).

### 2.2 Dữ liệu

- [x] (2026-10-13) `entity/enums/CallStatus.java`: `RINGING, ONGOING, ENDED, MISSED, REJECTED, CANCELLED, FAILED`.
- [x] (2026-10-13) `entity/CallSession.java` — `@Entity @Table(name = "call_sessions", indexes = {...})`, kế thừa `BaseEntity`:
  ```java
  @ManyToOne(fetch = LAZY, optional = false) @JoinColumn(name = "rescue_request_id", nullable = false) RescueRequest rescueRequest;
  @ManyToOne(fetch = LAZY, optional = false) @JoinColumn(name = "caller_id", nullable = false) User caller;
  @ManyToOne(fetch = LAZY, optional = false) @JoinColumn(name = "callee_id", nullable = false) User callee;
  @Column(name = "caller_role", length = 16, nullable = false) String callerRole;   // CUSTOMER|GARAGE|STAFF
  @Column(name = "callee_role", length = 16, nullable = false) String calleeRole;
  @Enumerated(EnumType.STRING) @Column(name = "status", length = 16, nullable = false) CallStatus status = CallStatus.RINGING;
  @Column(name = "answered_at") OffsetDateTime answeredAt;
  @Column(name = "ended_at") OffsetDateTime endedAt;
  @Column(name = "duration_sec") Integer durationSec;
  @ManyToOne(fetch = LAZY) @JoinColumn(name = "ended_by_id") User endedBy;          // null = hệ thống
  ```

  - Index: `(status)`, `(caller_id, status)`, `(callee_id, status)`, `(rescue_request_id)`.
  - Đây là bảng mới nên `ddl-auto=update` tạo được cột NOT NULL.
- [x] (2026-10-13) `repository/CallSessionRepository.java`:

  ```java
  @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from CallSession c where c.id = :id")
  Optional<CallSession> findWithLockById(@Param("id") Long id);

  @Query("select c from CallSession c where c.status in :st and (c.caller.id = :uid or c.callee.id = :uid) order by c.createdAt desc")
  List<CallSession> findActiveByUser(@Param("uid") Long userId, @Param("st") Collection<CallStatus> st);

  @Query("select c.id from CallSession c where c.status = :st and c.createdAt < :before")
  List<Long> findIdsByStatusAndCreatedAtBefore(@Param("st") CallStatus st, @Param("before") OffsetDateTime before);

  // Projection — sweeper chạy NGOÀI transaction nên không được chạm vào quan hệ LAZY.
  interface CallParticipantsRef { Long getId(); Long getCallerId(); Long getCalleeId(); }
  @Query("select c.id as id, c.caller.id as callerId, c.callee.id as calleeId from CallSession c where c.status = :st")
  List<CallParticipantsRef> findRefsByStatus(@Param("st") CallStatus st);

  List<CallSession> findByStatusIn(Collection<CallStatus> statuses);
  ```

- [x] (2026-10-13) `backend/scripts/create-call-sessions.sql`: `CREATE TABLE IF NOT EXISTS call_sessions (...)` cộng các
      `CREATE INDEX IF NOT EXISTS`.
  - Kiểu cột phải khớp bảng do Hibernate tạo: `bigserial`, `timestamptz`, `varchar(16)`, `boolean`; FK tới
    `rescue_requests(id)` và `users(id)`.
  - Xem các cột của `BaseEntity` để chép đúng `created_at/updated_at/is_deleted`.

### 2.3 DTO

- [x] (2026-10-13) `dto/request/StartCallRequest` (`@Data`):
  - `@NotNull(message = "Thiếu mã đơn cứu hộ") Long rescueRequestId`
  - `@NotBlank(message = "Thiếu người nhận") String peer`
- [x] (2026-10-13) `dto/request/CallSignalRequest`:
  - `@NotBlank @Pattern(regexp = "OFFER|ANSWER", message = "Loại tín hiệu không hợp lệ") String type`
  - `@NotBlank(message = "Thiếu SDP") @Size(max = 16000, message = "SDP quá lớn") String sdp`
- [x] (2026-10-13) `dto/request/EndCallRequest`: `Boolean failed`.
- [x] (2026-10-13) `dto/response/CallResponse` (`@Data @Builder`): các trường đúng như phần Hợp đồng; `status` để kiểu `String`.
- [x] (2026-10-13) `dto/response/IceServerResponse` (`@Data @Builder`): `List<String> urls`, `String username`, `String credential`.

### 2.4 Nghiệp vụ — `service/CallService.java` + `service/impl/CallServiceImpl.java`

```java
public interface CallService {
    CallResponse start(User caller, StartCallRequest req);
    CallResponse accept(User user, Long callId);
    CallResponse reject(User user, Long callId);
    CallResponse end(User user, Long callId, boolean failed);
    void signal(User user, Long callId, CallSignalRequest req);
    CallResponse getActive(User user);          // null nếu không có
    CallResponse get(User user, Long callId);
    List<IceServerResponse> iceServers(User user);
    // Chỉ CallSweeper gọi:
    void expireRinging(Long callId);            // RINGING → MISSED
    void failOngoing(Long callId);              // ONGOING → FAILED
    void failAllActiveOnStartup();              // RINGING/ONGOING còn sót → FAILED
}
```

Dependencies: `CallSessionRepository`, `RescueRequestRepository`, `RescueParticipants`, `ChatWebSocketHandler`,
`PushService`, cùng các `@Value` của `app.call.*`.

- [x] (2026-10-13) Hằng số:
  - `CALLABLE = EnumSet.of(ACCEPTED, ASSIGNED, EN_ROUTE, ARRIVED, DIAGNOSED, REPAIRING_ONSITE, TOWING, COMPLETED, AWAITING_PAYMENT)`
  - `ACTIVE = EnumSet.of(RINGING, ONGOING)`
- [x] (2026-10-13) **`start`** (`@Transactional`), làm đúng thứ tự:
  ```java
  RescueRequest req = findByIdAndIsDeletedFalse → 404 "Không tìm thấy yêu cầu cứu hộ";
  String callerRole = participants.roleOf(req, caller);          // null → Unauthorized("Bạn không thuộc đơn cứu hộ này")
  if (STAFF.equals(callerRole) && !participants.isAssignedStaff(req, caller)) → BadRequest("Chỉ nhân viên được gán cho đơn mới gọi được");
  if (!CALLABLE.contains(req.getStatus())) → BadRequest("Chỉ gọi được khi đơn đang được xử lý");
  String calleeRole = participants.normalizeRole(in.getPeer());
  User callee = participants.resolveAssignedPeer(req, calleeRole);
  if (callee.getId().equals(caller.getId())) → BadRequest("Không thể tự gọi cho chính mình");
  if (!repo.findActiveByUser(caller.getId(), ACTIVE).isEmpty()) → BadRequest("Bạn đang có một cuộc gọi khác");
  if (!repo.findActiveByUser(callee.getId(), ACTIVE).isEmpty()) → BadRequest("Người nhận đang bận, vui lòng gọi lại sau");
  CallSession c = save(new RINGING …);
  boolean online = ws.isOnline(callee.getId());
  CallResponse res = toResponse(c, online);
  String payload = "{\"event\":\"CALL_INCOMING\",\"call\":" + toJson(res) + "}";   // BUILD TRONG TRANSACTION
  Long calleeId = callee.getId();
  afterCommit(() -> ws.sendToUser(calleeId, payload));
  if (!online) pushIncoming(c, req, caller, callerRole);    // PushService tự gửi sau commit
  return res;
  ```
- [x] (2026-10-13) **`accept`**:
  - Lấy cuộc gọi bằng `findWithLockById` (không có → 404 "Không tìm thấy cuộc gọi").
  - Người thao tác phải là người nhận, nếu không → "Chỉ người nhận mới trả lời hoặc từ chối được".
  - Phải đang `RINGING`, nếu không → "Cuộc gọi đã được trả lời hoặc đã kết thúc".
  - Đổi sang `ONGOING`, `answeredAt = now`. Sau commit gửi `CALL_ACCEPTED` cho **cả** người gọi và người nhận.
- [x] (2026-10-13) **`reject`**: cùng các bước kiểm tra như `accept`. Đổi sang `REJECTED`, `endedAt = now`, `endedBy = user`.
      Sau commit gửi `CALL_ENDED` cho 2 bên.
- [x] (2026-10-13) **`end`**: lấy bằng `findWithLockById`. Người thao tác phải là 1 trong 2 bên, nếu không → 401
      "Bạn không thuộc cuộc gọi này". Rẽ nhánh theo trạng thái hiện tại:
  - `RINGING` và người gọi cúp → `CANCELLED`, gửi `pushMissed`.
  - `RINGING` và người nhận cúp → `REJECTED`.
  - `ONGOING` → `failed ? FAILED : ENDED`, `durationSec = giây(answeredAt → now)`.
  - Trạng thái khác (đã kết thúc) → `return toResponse(c, null)`, không thay đổi gì (idempotent).

  Với 3 nhánh đầu: `endedAt = now`, `endedBy = user`, rồi sau commit gửi `CALL_ENDED`.

- [x] (2026-10-13) **`signal`** (`@Transactional(readOnly = true)`, không ghi DB):
  - Người thao tác phải là 1 trong 2 bên.
  - Phải đang `ONGOING`, nếu không → "Cuộc gọi không còn diễn ra".
  - `OFFER` chỉ từ người gọi, `ANSWER` chỉ từ người nhận; sai thì báo lỗi tương ứng.
  - Gửi **ngay** (không chờ commit) tới bên kia:
    `{"event":"CALL_SIGNAL","callId":…,"type":…,"sdp":…}`, dùng `WsJson.str(sdp)` để escape `\r\n`.
- [x] (2026-10-13) **`getActive`**: lấy phần tử đầu của `findActiveByUser(user.id, ACTIVE)`, rồi `toResponse`; không có thì trả `null`.
- [x] (2026-10-13) **`get`**: kiểm tra người xem là 1 trong 2 bên, rồi `toResponse`.
- [x] (2026-10-13) **`iceServers`**:
  - Nếu `stun-urls` có giá trị → thêm 1 mục chỉ có `urls`.
  - Nếu `turn-urls` có giá trị:
    - Có `turn-secret` → sinh credential ngắn hạn:
      `exp = epochSeconds + ttl`, `username = exp + ":" + user.getId()`,
      `credential = Base64(HmacSHA1(secret, username))` (dùng `javax.crypto.Mac`).
    - Không có `turn-secret` → dùng `turn-username` / `turn-credential` cố định.
  - Mọi danh sách URL là chuỗi phân tách bằng dấu phẩy, nhớ `trim` từng phần tử.
- [x] (2026-10-13) **Các hàm cho sweeper:**
  - `expireRinging(id)`: khóa dòng; nếu không còn `RINGING` thì `return`. Đổi sang `MISSED`, `endedAt = now`;
    gửi `CALL_ENDED` cho 2 bên + `pushMissed`.
  - `failOngoing(id)`: khóa dòng; nếu không còn `ONGOING` thì `return`. Đổi sang `FAILED`, tính `durationSec`;
    gửi `CALL_ENDED` cho 2 bên.
  - `failAllActiveOnStartup()`: lấy `findByStatusIn(ACTIVE)` → `FAILED` + `endedAt`. Không gửi WS và push.
- [x] (2026-10-13) **Helper:**
  ```java
  private void afterCommit(Runnable task) {
      if (TransactionSynchronizationManager.isSynchronizationActive()) {
          TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
              @Override public void afterCommit() { task.run(); }
          });
      } else task.run();
  }
  ```

  - `sendEnded(c)`: build payload `CALL_ENDED` **trong transaction**, lấy sẵn 2 id, rồi
    `afterCommit(() -> { ws.sendToUser(callerId, p); ws.sendToUser(calleeId, p); })`.
  - `toJson(CallResponse)`: build tay bằng `WsJson` (theo mẫu `ChatServiceImpl.toJson`).
  - `pushIncoming(…)` / `pushMissed(…)`: tạo `LinkedHashMap` data theo bảng ở phần Hợp đồng, rồi gọi
    `pushService.sendAfterCommit(…)`. `INCOMING_CALL` truyền thêm `ttlSeconds = ringTimeout`.
- **Bẫy cần tránh:**
  - `open-in-view=false` và quan hệ là LAZY → không được đọc `getFullName()` / `getAvatarUrl()` bên trong
    `afterCommit` hay trong sweeper. Chỉ dùng chuỗi và id đã lấy sẵn trong transaction.
  - `CALL_ACCEPTED` bắt buộc gửi sau commit. Nếu gửi trước, người gọi có thể gửi OFFER trong khi DB vẫn còn `RINGING`.

### 2.5 Hẹn giờ & dọn dẹp — `service/impl/CallSweeper.java`

- [x] (2026-10-13) Thêm `@EnableScheduling` vào `config/AsyncConfig` và sửa lại Javadoc của class này.
- [x] (2026-10-13) Viết sweeper:

  ```java
  @EventListener(ApplicationReadyEvent.class) void onStartup() { callService.failAllActiveOnStartup(); }

  @Scheduled(fixedDelayString = "${app.call.sweep-interval-ms:5000}")
  void sweep() {
      try {
          repo.findIdsByStatusAndCreatedAtBefore(RINGING, now.minusSeconds(ringTimeout)).forEach(callService::expireRinging);
          Set<Long> seen = new HashSet<>();
          for (var r : repo.findRefsByStatus(ONGOING)) {
              seen.add(r.getId());
              boolean bothOnline = ws.isOnline(r.getCallerId()) && ws.isOnline(r.getCalleeId());
              if (bothOnline) { offlineSince.remove(r.getId()); continue; }
              Instant since = offlineSince.computeIfAbsent(r.getId(), k -> Instant.now());
              if (since.plusSeconds(disconnectGrace).isBefore(Instant.now())) { callService.failOngoing(r.getId()); offlineSince.remove(r.getId()); }
          }
          offlineSince.keySet().retainAll(seen);
      } catch (Exception e) { log.warn("Quét cuộc gọi lỗi: {}", e.getMessage()); }
  }
  ```

  `offlineSince` là một `ConcurrentHashMap<Long, Instant>`.

### 2.6 API — `controller/CallController.java`

- [x] (2026-10-13) `@RestController @RequestMapping("/api/calls")`. Lấy user hiện tại bằng `getCurrentUser(authentication)`,
      chép từ `RescueRequestController`. Mọi endpoint trả `ResponseEntity.ok(ApiResponse.success(...))`.
- [x] (2026-10-13) Path chi tiết dùng `"/{id:\\d+}"` để không đụng `/active` và `/ice-servers`.
- [x] (2026-10-13) `end` nhận `@RequestBody(required = false) EndCallRequest`;
      `failed = body != null && Boolean.TRUE.equals(body.getFailed())`.
- [x] (2026-10-13) **Không** thêm `/api/calls/**` vào `PUBLIC_ENDPOINTS`.

### 2.7 Push & cấu hình

- [x] (2026-10-13) Thêm `Integer ttlSeconds` vào push:
  - `PushRequestedEvent`: thêm thành phần cuối `Integer ttlSeconds`.
  - `PushService`: giữ hàm cũ (chuyển sang gọi hàm mới với `ttl = null`), thêm overload có `ttlSeconds`.
  - `PushEventListener`: truyền `ttlSeconds` xuống.
  - `ExpoPushClient`: overload `send(tokens, title, body, data, ttl)`; chỉ `m.put("ttl", ttl)` khi khác null.
  - Các lời gọi cũ giữ nguyên.
- [x] (2026-10-13) `application.yml` thêm nhóm `app.call` (không đặt secret làm giá trị mặc định):
  ```yaml
  call:
    ring-timeout-seconds: ${CALL_RING_TIMEOUT_SECONDS:45}
    disconnect-grace-seconds: ${CALL_DISCONNECT_GRACE_SECONDS:20}
    sweep-interval-ms: ${CALL_SWEEP_INTERVAL_MS:5000}
    stun-urls: ${CALL_STUN_URLS:stun:stun.l.google.com:19302}
    turn-urls: ${CALL_TURN_URLS:}
    turn-username: ${CALL_TURN_USERNAME:}
    turn-credential: ${CALL_TURN_CREDENTIAL:}
    turn-secret: ${CALL_TURN_SECRET:}
    turn-ttl-seconds: ${CALL_TURN_TTL_SECONDS:21600}
  ```
- [x] (2026-10-13) `backend/.env.example`: thêm các biến `CALL_*`, mỗi biến kèm một dòng chú thích tiếng Việt.
- **Xong khi:** `./mvnw -q compile && ./mvnw test` đạt, rồi E2E ở Phần 5 đạt.

## Phần 3 — Mobile (`mobile/sras`)

### 3.1 Phụ thuộc, quyền, âm thanh

- [~] `npx expo install expo-audio expo-keep-awake`. Cả hai có trong Expo Go.
- [~] `app.json`:
  - Thêm plugin `["expo-audio", { "microphonePermission": "Ứng dụng cần micro để bạn gọi thoại miễn phí với gara và nhân viên cứu hộ." }]`.
  - Ghi đúng câu đó vào `microphonePermission` của plugin `expo-image-picker`, để 2 plugin không đè chữ tiếng Anh
    lên nhau.
  - Thêm `"android": { "permissions": ["RECORD_AUDIO", "MODIFY_AUDIO_SETTINGS"] }`.
- [~] Sinh `assets/sounds/ringback.wav` (425 Hz, kêu 1s nghỉ 4s) và `ringtone.wav` (2 tiếng bíp 784/659 Hz, lặp mỗi
      2.4s, có fade 10ms để không bị lụp bụp).
  - Định dạng PCM 16-bit mono 16 kHz.
  - Dùng script Node đặt trong thư mục scratchpad; chỉ commit file `.wav`.

### 3.2 API, model, tiện ích

- [~] `src/api/callApi.ts`, theo mẫu `chatApi.ts` (`const res: any = await axiosClient.post(...); return res.data;`):
  - `CallDto`, `IceServerDto`, `SignalType`.
  - `callApi.start(rescueRequestId, peer)`, `accept(id)`, `reject(id)`, `end(id, failed = false)`,
    `signal(id, type, sdp)`, `getActive()`, `get(id)`, `getIceServers()`.
- [~] Model:
  - `src/models/enums.ts`: thêm `export type CallStatus = 'RINGING' | 'ONGOING' | 'ENDED' | 'MISSED' | 'REJECTED' | 'CANCELLED' | 'FAILED';`.
  - `src/models/call-session.ts`: `interface CallSession extends BaseEntity` gồm `rescueRequestId`, `callerId`,
    `calleeId`, `callerRole`, `calleeRole`, `status`, `answeredAt`, `endedAt`, `durationSec`, `endedById`.
  - Export trong `models/index.ts` (nhóm "9. Misc").
- [~] `src/utils/call.ts`:
  - `CALLABLE_STATUSES`: bản sao `CALLABLE` của backend.
  - `canFreeCall(status?)`.
  - `PEER_LABEL = { CUSTOMER: 'Khách hàng', GARAGE: 'Chủ gara', STAFF: 'Nhân viên cứu hộ' }`.
  - `formatDuration(sec)` → `mm:ss`.

### 3.3 WebSocket — `src/realtime/chatSocket.ts`

- [~] Thêm kiểu `CallSocketEvent` (union của 4 sự kiện `CALL_*`) và `onCallEvent(handler): () => void`.
      Dùng `import type` từ `callApi` để tránh import vòng.
- [~] Trong `onmessage`: nếu `data.event` bắt đầu bằng `CALL_` → gửi cho các handler của `onCallEvent` rồi `return`.
      Luồng `CHAT_MESSAGE` giữ nguyên.
- [~] Heartbeat:
  - `onopen` → `setInterval` 25s gửi `'{"event":"PING"}'` (chỉ gửi khi `readyState === OPEN`).
  - `onclose` và `disconnect()` → `clearInterval`.

### 3.4 Engine — `src/realtime/callEngineHtml.ts` + `src/components/call/CallEngine.tsx`

- [~] `callEngineHtml.ts` export `CALL_ENGINE_HTML`. JS bên trong **không dùng `${}` hay backtick**, vì cả trang nằm
      trong template string. Khung code:
  ```js
  var pc = null,
    localStream = null;
  function post(m) {
    window.ReactNativeWebView.postMessage(JSON.stringify(m));
  }
  function waitIce(ms) {
    return new Promise(function (res) {
      if (pc.iceGatheringState === "complete") return res();
      var done = false;
      function fin() {
        if (!done) {
          done = true;
          pc.removeEventListener("icegatheringstatechange", on);
          res();
        }
      }
      function on() {
        if (pc.iceGatheringState === "complete") fin();
      }
      pc.addEventListener("icegatheringstatechange", on);
      setTimeout(fin, ms);
    });
  }
  async function start(c) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (e) {
      post({
        evt: "error",
        code: e && e.name === "NotAllowedError" ? "MIC_DENIED" : "MIC_ERROR",
        message: String((e && e.message) || e),
      });
      return;
    }
    pc = new RTCPeerConnection({ iceServers: c.iceServers || [] });
    localStream.getTracks().forEach(function (t) {
      pc.addTrack(t, localStream);
    });
    pc.ontrack = function (ev) {
      var a = document.getElementById("remote");
      a.srcObject = ev.streams[0];
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
    };
    pc.onconnectionstatechange = function () {
      post({ evt: "state", state: pc.connectionState });
    };
    pc.oniceconnectionstatechange = function () {
      post({ evt: "ice", state: pc.iceConnectionState });
    };
    post({ evt: "ready" });
    if (c.role === "caller") {
      await pc.setLocalDescription(await pc.createOffer());
      await waitIce(2500);
      post({ evt: "offer", sdp: pc.localDescription.sdp });
    }
  }
  async function remoteOffer(sdp) {
    await pc.setRemoteDescription({ type: "offer", sdp: sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await waitIce(2500);
    post({ evt: "answer", sdp: pc.localDescription.sdp });
  }
  async function remoteAnswer(sdp) {
    await pc.setRemoteDescription({ type: "answer", sdp: sdp });
  }
  function stop() {
    try {
      pc && pc.close();
    } catch (e) {}
    pc = null;
    if (localStream)
      localStream.getTracks().forEach(function (t) {
        t.stop();
      });
    localStream = null;
  }
  window.__callEngine = {
    handle: function (c) {
      var p;
      if (c.cmd === "start") p = start(c);
      else if (c.cmd === "remoteOffer") p = remoteOffer(c.sdp);
      else if (c.cmd === "remoteAnswer") p = remoteAnswer(c.sdp);
      else if (c.cmd === "mute") {
        if (localStream)
          localStream.getAudioTracks().forEach(function (t) {
            t.enabled = !c.muted;
          });
      } else if (c.cmd === "stop") stop();
      if (p && p.catch)
        p.catch(function (e) {
          post({
            evt: "error",
            code: "ENGINE",
            message: String((e && e.message) || e),
          });
        });
    },
  };
  if (!window.RTCPeerConnection || !navigator.mediaDevices)
    post({
      evt: "error",
      code: "NO_WEBRTC",
      message: "Thiết bị không hỗ trợ gọi thoại",
    });
  else post({ evt: "loaded" });
  ```
  Phần body của HTML chỉ có `<audio id="remote" autoplay playsinline></audio>`.
- [~] `CallEngine.tsx`:
  - Bọc ngoài một `View` style `{ position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0 }`,
    `pointerEvents="none"`. Bên trong là `WebView` với:
    `source={{ html: CALL_ENGINE_HTML, baseUrl: 'https://localhost/' }}` (https → secure context, điều kiện bắt buộc
    của getUserMedia), `originWhitelist={['*']}`, `javaScriptEnabled`, `allowsInlineMediaPlayback`,
    `mediaPlaybackRequiresUserAction={false}`, `mediaCapturePermissionGrantType="grant"`,
    `onMessage={(e) => callManager.onEngineMessage(e.nativeEvent.data)}`.
  - `useEffect` gắn engine; cleanup gọi `callManager.detachEngine()`:
    ```tsx
    callManager.attachEngine((cmd) =>
      ref.current?.injectJavaScript(
        `window.__callEngine&&window.__callEngine.handle(${JSON.stringify(cmd)});true;`,
      ),
    );
    ```

### 3.5 Bộ điều khiển — `src/realtime/callManager.ts`

- [~] Singleton theo kiểu `chatSocket`: state ở cấp module, `subscribe(listener)`, `getState()`.
  - **Bất biến:** mỗi lần đổi state phải tạo object mới, vì `useSyncExternalStore` so sánh tham chiếu.
  - Export `useCallState()` dùng `useSyncExternalStore(callManager.subscribe, callManager.getState)`.
- [~] State cho UI:
  ```ts
  type CallPhase =
    | "idle"
    | "outgoing"
    | "incoming"
    | "connecting"
    | "active"
    | "ended";
  interface CallUiState {
    phase: CallPhase;
    callId: number | null;
    direction: "out" | "in" | null;
    rescueRequestId: number | null;
    rescueCode: string | null;
    peerRole: ChatPeer | null;
    peerName: string;
    peerAvatarUrl: string | null;
    muted: boolean;
    minimized: boolean;
    reconnecting: boolean;
    connectedAt: number | null; // Date.now() lúc kết nối — UI tự tính đồng hồ
    endText: string | null; // câu ở pha ended (bảng Phần 0)
    engineMounted: boolean;
  }
  ```

  - Biến nội bộ (không đưa ra UI): `myUserId`, `inject`, `engineLoaded`, `engineReady`, `pendingRemote`
    (`{type, sdp}` đến trước khi engine sẵn sàng), `acceptedHere`, `iceServersCache`, các timer
    (connecting / reconnect / ended), các player âm thanh.
- [~] API công khai:
  - `init(userId) → hủy`: đăng ký `chatSocket.onCallEvent` và `chatSocket.onStatus` (khi socket mở thì gọi
    `syncActive()`).
  - `startCall({ rescueRequestId, peer, peerName, peerAvatarUrl? })`, `accept()`, `reject()`, `hangup()`,
    `toggleMute()`, `setMinimized(v)`.
  - `openFromPush(callId) → Promise<boolean>`, `hasActiveCall()`, `reset()`.
  - `attachEngine` / `detachEngine` / `onEngineMessage`: chỉ `CallEngine` dùng.
- [~] Bảng chuyển trạng thái (phải làm đủ):

  | Pha        | Sự kiện                                                                                   | Hành động                                                                                                                                                                  | Pha mới                        |
  | ---------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
  | idle       | `startCall()`                                                                             | Xem chú thích ①                                                                                                                                                            | outgoing                       |
  | idle       | WS `CALL_INCOMING`, hoặc `syncActive`/`openFromPush` thấy `RINGING` mà mình là người nhận | Phát ringtone (lặp) + `Vibration.vibrate([0, 800, 1200], true)`; bật keep-awake                                                                                            | incoming                       |
  | ≠ idle     | `CALL_INCOMING` của cuộc khác                                                             | Bỏ qua                                                                                                                                                                     | —                              |
  | outgoing   | WS `CALL_ACCEPTED` (đúng `callId`)                                                        | Tắt ringback; `engineMounted = true`. Engine `loaded` → `start {role: 'caller', iceServers}`. Engine `offer` → `callApi.signal(id, 'OFFER', sdp)`. Bắt đầu đếm 20s kết nối | connecting                     |
  | incoming   | `accept()`                                                                                | Xem chú thích ②                                                                                                                                                            | connecting                     |
  | incoming   | `reject()`                                                                                | Tắt chuông/rung; `callApi.reject`                                                                                                                                          | idle                           |
  | incoming   | `CALL_ACCEPTED` mà `!acceptedHere`                                                        | Tắt chuông/rung (máy khác đã nghe)                                                                                                                                         | idle                           |
  | connecting | `CALL_SIGNAL OFFER` (mình là người nhận)                                                  | Engine ready → `remoteOffer`; chưa ready → lưu `pendingRemote`, đẩy vào khi có `ready`                                                                                     | —                              |
  | connecting | Engine `answer`                                                                           | `callApi.signal(id, 'ANSWER', sdp)`                                                                                                                                        | —                              |
  | connecting | `CALL_SIGNAL ANSWER` (mình là người gọi)                                                  | `remoteAnswer`                                                                                                                                                             | —                              |
  | connecting | Engine báo đã kết nối                                                                     | `connectedAt = Date.now()`; hủy timer                                                                                                                                      | active                         |
  | connecting | Hết 20s                                                                                   | `callApi.end(id, true)`                                                                                                                                                    | ended "Mất kết nối"            |
  | active     | Engine `disconnected`                                                                     | `reconnecting = true`; hẹn 10s                                                                                                                                             | —                              |
  | active     | Engine kết nối lại                                                                        | `reconnecting = false`; hủy hẹn                                                                                                                                            | —                              |
  | active     | Engine `failed`, hoặc hết 10s                                                             | `callApi.end(id, true)`                                                                                                                                                    | ended "Mất kết nối"            |
  | ≠ idle     | `hangup()`                                                                                | `callApi.end(id)` (người nhận đang đổ chuông thì dùng `reject`)                                                                                                            | ended (câu theo status trả về) |
  | ≠ idle     | WS `CALL_ENDED` (đúng `callId`)                                                           | Dọn dẹp                                                                                                                                                                    | ended (câu theo bảng Phần 0)   |
  | ≠ idle     | Engine `error` `MIC_DENIED` / `MIC_ERROR` / `NO_WEBRTC`                                   | `callApi.end(id, true)`; Alert hướng dẫn                                                                                                                                   | ended                          |
  | ended      | Sau 1.5s                                                                                  | Dọn sạch                                                                                                                                                                   | idle                           |

  ① `startCall()`: nếu đang khác `idle` → Alert "Bạn đang trong một cuộc gọi". Nếu không:
  - Xin quyền micro (bị từ chối → Alert "Cần quyền micro để gọi. Vào Cài đặt để cấp quyền.").
  - `ensureSocket(3000)`: chờ socket mở; quá hạn → Alert "Mất kết nối máy chủ, vui lòng thử lại".
  - `callApi.start` (lỗi → Alert `e.response?.data?.message`).
  - Phát ringback (lặp); bật keep-awake.

  ② `accept()`: tắt chuông/rung → xin quyền micro (bị từ chối → `reject` + Alert) → `ensureSocket(3000)` →
  `callApi.accept` (lỗi → Alert message, về `idle`) → `acceptedHere = true`, `engineMounted = true`. Engine `loaded`
  → `start {role: 'callee', iceServers}`. Bắt đầu đếm 20s kết nối.

- [~] Dọn dẹp — `cleanup()`:
  - Dừng và giải phóng các player; `Vibration.cancel()`.
  - Gửi `stop` cho engine, `engineMounted = false`.
  - Hủy mọi timer; reset `pendingRemote`, `acceptedHere`.
  - Tắt keep-awake (`deactivateKeepAwake('call')`).
  - Nếu `AppState.currentState === 'background'` → `chatSocket.disconnect()`.
- [~] `syncActive()` (gọi mỗi khi socket mở lại) — so state server (`callApi.getActive()`) với state máy:
  - Server có `RINGING`, mình là người nhận, máy đang `idle` → chuyển sang `incoming`.
  - Máy đang `outgoing` mà server đã `ONGOING` → xử lý như vừa nhận `CALL_ACCEPTED`.
  - Server có `ONGOING` nhưng máy không còn engine → `callApi.end(id, true)`.
  - Server không còn cuộc gọi (null) mà máy khác `idle` → cuộc gọi đã kết thúc → dọn dẹp, về `idle`.
- [~] `iceServers`: gọi `callApi.getIceServers()` (cache trong phiên làm việc) và **bỏ các trường null** trước khi
      gửi cho engine.
- [~] Âm thanh dùng `expo-audio` (tra docs v57):
  - Tạo player **khi cần** (lazy), bật `loop`.
  - **Dừng và giải phóng trước khi mount engine**, để không giành audio session với WebView.
- [~] Keep-awake: `activateKeepAwakeAsync('call')` khi vào `outgoing` / `incoming` / `connecting` / `active`.

### 3.6 Giao diện — `src/components/call/CallOverlay.tsx`

- [~] Gắn vào `src/app/_layout.tsx` **sau** `<Stack>` (vẫn bên trong `AuthProvider`), để nổi trên mọi màn.
      Bên trong có `useEffect`: khi đã có `user?.id` thì gọi `callManager.init(user.id)`.
- [~] Render `<CallEngine/>` khi `state.engineMounted`. Đặt **bên ngoài** Modal, để thu nhỏ không làm unmount engine.
- [~] `Modal` toàn màn (`visible = phase !== 'idle' && !minimized`, `animationType="fade"`, `statusBarTranslucent`):
  - Nền tối `expo-linear-gradient` từ `#0f172a` tới `#1e293b`. Dòng trên cùng: "Cuộc gọi thoại miễn phí · SRAS"
    - mã đơn.
  - Avatar tròn 112px: ảnh qua `resolveFileUrl`; không có thì hiện chữ cái đầu trên nền `#ea580c`.
    Dưới avatar: tên (26/800, màu trắng), `PEER_LABEL[peerRole]`.
  - Dòng trạng thái:
    - outgoing: "Đang gọi…"; incoming: "Cuộc gọi đến…"; connecting: "Đang kết nối…".
    - active: `reconnecting` ? "Đang kết nối lại…" : đồng hồ `formatDuration`, cập nhật mỗi 1s bằng `setInterval`
      trong component, nhớ dọn khi unmount.
    - ended: `endText`.
  - Nút (icon `lucide-react-native`):
    - incoming: 2 nút tròn 72px — đỏ `PhoneOff` "Từ chối", xanh `Phone` "Nghe".
    - outgoing / connecting / active: `Mic` ↔ `MicOff` "Tắt mic", `ChevronDown` "Thu nhỏ", đỏ `PhoneOff` "Kết thúc".
    - ended: không có nút.
  - `onRequestClose` (nút Back Android): đang incoming thì không làm gì; các pha khác thì thu nhỏ.
- [~] Thanh thu nhỏ (khi `minimized` và đang outgoing / connecting / active):
  - Một `View` tuyệt đối ở trên cùng, tính khoảng cách bằng `useSafeAreaInsets`.
  - Nội dung: chấm xanh + "{tên} · {mm:ss | Đang gọi…}". Chạm vào → `setMinimized(false)`.

### 3.7 Nối vào app có sẵn

- [~] `src/contexts/AuthContext.tsx`:
  - Khi AppState chuyển `background`: chỉ gọi `chatSocket.disconnect()` nếu `!callManager.hasActiveCall()`.
  - `logout`: gọi `await callManager.reset()` **trước** khi xóa token (để `POST end` còn token hợp lệ).
- [~] `src/components/PushNotificationManager.tsx`, trong hàm `open(...)`:
  - Nếu `data.type === 'INCOMING_CALL'` → `if (await callManager.openFromPush(Number(data.callId))) return;`
  - Còn lại (cuộc gọi đã kết thúc): Alert "Cuộc gọi đã kết thúc", rồi để `routeForNotification` mở chat.
- [~] `src/notifications/route.ts`: `INCOMING_CALL` và `MISSED_CALL` đi chung nhánh `CHAT_MESSAGE` → `/chat`.
      Params lấy từ `rescueRequestId`, `peer`, `peerName`, `peerPhone`, `peerAvatar`.
- [~] `src/notifications/push.ts`: trong `handleNotification`, không hiện banner `INCOMING_CALL` nếu
      `callManager.hasActiveCall()`.
- [~] Nút "Gọi miễn phí" (icon `PhoneCall` màu xanh `#16a34a`; chỉ hiện khi `canFreeCall(status)`; nút `tel:` cũ
      giữ nguyên):
  - [~] `customer/rescue-tracking.tsx`: xóa `onFreeCall` cũ (Alert). `ActionRow` của gara gọi
        `startCall({ rescueRequestId: requestId, peer: 'GARAGE', peerName: data.garage.name })`; của nhân viên
        dùng `peer: 'STAFF'`. Thêm prop `freeCallDisabled` (tái dùng style `actionDisabled`).
  - [~] `app/chat.tsx`: thêm nút `PhoneCall` ở header **trước** nút `tel:`, dùng style `freeCallButton` (như
        `callButton` nhưng màu xanh). Điều kiện hiện: `hasThread && canFreeCall(rescueReq?.status)`. Truyền
        `peer`, `peerName`, `params.peerAvatar`.
  - [~] `garage-staff/home.tsx`: thêm `circleBtn` `PhoneCall` cạnh nút `callCustomer` →
        `startCall({ rescueRequestId: job.id, peer: 'CUSTOMER', peerName: job.customer?.name ?? 'Khách hàng' })`.
  - [~] `garage-owner/order-detail.tsx`: thêm `actionIconBtn` `PhoneCall` ở dòng khách (`peer: 'CUSTOMER'`) và dòng
        nhân viên (`peer: 'STAFF'`).
- **Xong khi:** `npm run lint` và `npx tsc --noEmit` không có lỗi mới.

## Phần 4 — Web admin

> **Bỏ qua — người dùng quyết định 2026-10-13:** call-realtime chỉ cần ở mobile (+ backend), không thêm model / enum vào
> web admin. Đã hoàn tác phần web đã thêm; không chạy build / lint web cho tính năng này.

## Phần 5 — Kiểm tra

- [x] (2026-10-13) `cd backend && ./mvnw -q compile && ./mvnw test`
- [x] (2026-10-13) **E2E backend bằng Node script** (đặt trong scratchpad; cách làm theo memory `e2e-testing-backend`):
  - Tự ký JWT HS256 bằng `JWT_SECRET`; dùng thư viện `ws`.
  - Dữ liệu test: user 40 (khách), 39 (chủ gara 9), 41 (nhân viên `garage_staff` 7), xe 5. **Kiểm tra lại** dữ
    liệu này còn đúng trước khi chạy.
  - Chạy backend với `CALL_RING_TIMEOUT_SECONDS=8` và `CALL_DISCONNECT_GRACE_SECONDS=6`.
  - Tạo đơn → chủ gara nhận → gán nhân viên → `ASSIGNED`, rồi kiểm tra:
  - [x] (2026-10-13) **Luồng chuẩn:** khách gọi STAFF → nhân viên nhận `CALL_INCOMING` (`calleeOnline = true`) → `accept`, cả 2
        bên nhận `CALL_ACCEPTED` → khách gửi OFFER, nhân viên nhận `CALL_SIGNAL` → nhân viên gửi ANSWER, khách nhận
        → `end` → cả 2 nhận `CALL_ENDED` `ENDED`, DB có `duration_sec`.
  - [x] (2026-10-13) **Nhánh kết thúc:**
    - Từ chối → `REJECTED`.
    - Người gọi cúp khi đang đổ chuông → `CANCELLED` + push `MISSED_CALL` (đăng ký token giả; token bị vô hiệu tức
      là đã gửi).
    - Không nghe → khoảng 8–13s sau thành `MISSED` (đo được 12.5–13.7s: thêm tối đa 1 chu kỳ quét 5s + độ trễ DB).
  - [x] (2026-10-13) **Các ca bị chặn:**
    - Đang có cuộc gọi `RINGING` mà gọi tiếp → 400 "bận".
    - User ngoài đơn → 401.
    - Đơn `PAID` / `CANCELLED` → 400.
    - Người nhận gửi OFFER → 400.
    - `accept` 2 lần → lần 2 bị 400.
    - `end` 2 lần → lần 2 trả về trạng thái cũ.
  - [x] (2026-10-13) **Người nhận offline** (không mở WS) + token giả → có push `INCOMING_CALL`.
  - [x] (2026-10-13) **Mất kết nối:** đang `ONGOING` thì đóng WS của khách → khoảng 6–11s sau thành `FAILED`, nhân viên nhận
        `CALL_ENDED` (đo được 12.7–13.1s: grace 6s tính từ lần quét đầu thấy mất kết nối, cộng chu kỳ quét 5s).
  - [x] (2026-10-13) **Server khởi động lại** khi đang có cuộc gọi `RINGING` → sau khi khởi động, cuộc gọi đó là `FAILED`.
  - [x] (2026-10-13) **TURN HMAC:** có `CALL_TURN_SECRET` thì `ice-servers` trả `username` dạng `<số>:<userId>`; tự tính HMAC
        trong script và so khớp `credential`.
  - [x] (2026-10-13) Dọn dữ liệu test (theo FK), trả staff/xe về `FREE`.
- [x] (2026-10-13) `cd mobile/sras && npm run lint && npx tsc --noEmit` — không có lỗi mới (tsc còn 3 lỗi cũ ở `garage-owner/garage-profile.tsx`; lint 97 lỗi / 157 cảnh báo cũ giữ nguyên). Phần web admin bỏ (Phần 4).
- [ ] ⛳ **Máy thật** (iPhone Expo Go + Android Expo Go, cùng một mạng Wi-Fi; người dùng thử):
  - Khách gọi nhân viên từ màn theo dõi đơn; nghe/nói được 2 chiều; tắt/bật mic.
  - Thu nhỏ rồi chuyển sang màn khác, cuộc gọi vẫn giữ.
  - Cúp máy từ từng bên; thử từ chối; để đổ chuông 45s → thành cuộc gọi nhỡ.
  - Chủ gara gọi nhân viên từ màn chat.
  - iPhone để app ở nền → nhận push "Cuộc gọi đến" → bấm vào → hiện màn đổ chuông → nghe được.
- [ ] ⛳ Gọi 4G ↔ Wi-Fi khi đã cấu hình TURN (xem Phần 7).

## Phần 6 — Tài liệu (làm khi đã test đạt, rồi xóa phần kế hoạch này)

- [x] (2026-10-13) `docs/api.md`:
  - Mục mới "Cuộc gọi — `/api/calls`": bảng endpoint + body.
  - §11 WebSocket: thêm 4 sự kiện `CALL_*` và gói heartbeat `PING`.
- [x] (2026-10-13) `docs/database.md` + `docs/database.dbml`: bảng `call_sessions` (nhóm 9), enum `CallStatus`, cập nhật số
      lượng bảng.
- [x] (2026-10-13) `docs/business-rules.md`: thêm §10 "Gọi thoại trong ứng dụng", gồm Phần 0 và các giới hạn bên dưới.
- [x] (2026-10-13) `docs/architecture.md`:
  - §4: signaling bằng REST + `/ws/chat`, WebRTC trong WebView, STUN/TURN, sweeper.
  - §8: `callManager`, `CallOverlay`, `CallEngine`.
- [x] (2026-10-13) `docs/setup.md`: các biến `CALL_*`, cách có TURN, cách test trên 2 máy thật.
- [~] `docs/progress.md`:
  - [x] (2026-10-13) Đã ghi "Backend gọi thoại" là xong (E2E 117/117) và tách mục mobile thành `[ ]` "chờ test máy thật".
  - [ ] Đánh dấu `[x] Gọi miễn phí (VoIP) trên mobile (ngày)` — **chỉ sau khi** Phần 1 và Phần 5 (máy thật) đạt.
  - [x] (2026-10-13) Đã thêm các mục `[ ]`: nhận cuộc gọi khi app ở nền/đã tắt (CallKit/ConnectionService); chuyển
    loa trong/loa ngoài; hiện lịch sử cuộc gọi trong khung chat; ICE restart khi đổi mạng; scale nhiều instance
    backend (Redis); dựng TURN.
  - [x] (2026-10-13) Cập nhật dòng "Cập nhật lần cuối".
- [ ] Sau khi máy thật đạt: xóa phần "Kế hoạch gọi thoại" trong file này (giữ phần kế hoạch thông báo bên dưới nếu
      chưa xong), xóa `mobile/sras/src/app/call-test.tsx`, và đổi tham chiếu `call-realtime.md` trong comment của
      `mobile/sras/src/notifications/route.ts` sang `docs/business-rules.md`.

## Phần 7 — Production (làm khi triển khai thật)

WebView + WebRTC không phụ thuộc Expo Go; bản build EAS chạy giống hệt. Riêng tính năng gọi cần thêm:

- [ ] **TURN là bắt buộc**, vì người dùng 4G sau CGNAT thường không nối P2P trực tiếp được. Chọn 1 trong 2 cách:
  - **Tự dựng coturn** trên VPS có IP public:
    - Cấu hình: `use-auth-secret`, `static-auth-secret=<CALL_TURN_SECRET>`, `realm`, chứng chỉ TLS (Let's Encrypt),
      `listening-port=3478`, `tls-listening-port=443`, `min-port=49152`, `max-port=65535`,
      `external-ip` (nếu VPS nằm sau NAT), `no-cli`.
    - Thêm `denied-peer-ip` cho các dải IP nội bộ, để chặn relay vào mạng nội bộ.
    - Mở firewall: UDP/TCP 3478, TCP 443, UDP 49152–65535.
    - Biến môi trường: `CALL_TURN_URLS=turn:turn.<domain>:3478?transport=udp,turn:turn.<domain>:3478?transport=tcp,turns:turn.<domain>:443?transport=tcp`
  - **Dùng dịch vụ:** Cloudflare TURN (1.000 GB/tháng miễn phí, sau đó $0.05/GB) hoặc Metered. Khi đó thay phần
    sinh HMAC trong `iceServers()` bằng API sinh credential của nhà cung cấp.
- [ ] **Backend chạy HTTPS/WSS sau reverse proxy.** Bản iOS phát hành chặn `http://`; `chatSocket` tự đổi sang
      `wss`. Ví dụ nginx cho `/ws/`:
  - `proxy_http_version 1.1`
  - `proxy_set_header Upgrade $http_upgrade`
  - `proxy_set_header Connection "upgrade"`
  - `proxy_read_timeout 3600s`

  **Không ghi query string vào access log**, vì token nằm ở `?token=`.

- [ ] **DB:** nếu production chạy `JPA_DDL_AUTO=validate` thì chạy `backend/scripts/create-call-sessions.sql` trước
      khi deploy.
- [ ] **Backend chỉ chạy 1 instance.** Phiên WS và trạng thái online nằm trong RAM. Nếu chạy nhiều instance: sự kiện
      không tới được user đang nối với instance khác, và sweeper sẽ kết thúc nhầm cuộc gọi. Sticky session **không**
      giải quyết được; muốn scale phải dùng Redis pub/sub + trạng thái online dùng chung.
- [ ] **Biến môi trường:** `PUSH_ENABLED=true`, các biến `CALL_*`, và `EXPO_ACCESS_TOKEN` nếu bật Enhanced Security
      trên Expo.
- [ ] **Build app:**
  - `eas build:configure` để tạo `eas.json`.
  - Build bản preview: Android ra APK; iOS đưa lên TestFlight (cần Apple Developer, $99/năm).
  - Credential push: APNs key (iOS), FCM v1 + `google-services.json` (Android), cấu hình qua `eas credentials`.
  - Kiểm tra lại câu xin quyền micro tiếng Việt trong bản build.
- [ ] **Hồ sơ trên store:**
  - App Store: phần App Privacy.
  - Google Play: phần Data safety, khai báo quyền micro (cuộc gọi không ghi âm, âm thanh mã hóa DTLS-SRTP).
  - Chính sách quyền riêng tư: nêu rõ có gọi thoại trong app.
- [ ] **Theo dõi:** chạy định kỳ
      `select status, count(*) from call_sessions where created_at > now() - interval '1 day' group by status`.
      Tỷ lệ `FAILED` cao thường là do TURN đang hỏng.
- [ ] (Nên có) Giới hạn số lần bắt đầu gọi, ví dụ tối đa 10 cuộc/phút mỗi user, để chống gọi spam.
- [ ] (Nếu cần, giai đoạn 2) Đổ chuông khi khóa máy / gọi tiếp ở nền / chuyển loa trong-ngoài:
  - Đổi engine sang `react-native-webrtc` + `react-native-callkeep`.
  - iOS: PushKit VoIP push (backend gửi thẳng APNs VoIP, Expo push không làm được việc này).
  - Android: ConnectionService + foreground service loại `microphone`.
  - Backend và `callManager` giữ nguyên.
- Các việc production chung của cả hệ thống đã có sẵn trong `docs/progress.md` (mục 1 và 8): rotate secret, chặn
  các endpoint đang công khai, chuyển sang Flyway, deploy.

## Giới hạn đã chấp nhận (ghi vào business-rules)

- Chỉ nghe/nói được khi app đang mở; bấm nút nguồn hoặc khóa máy là rớt cuộc gọi.
  - iOS: app xuống nền thì WebView bị tạm dừng.
  - Android 9 trở lên: app ở nền không dùng được micro.
  - Bên kia thấy "Đang kết nối lại…" rồi cuộc gọi tự kết thúc sau khoảng 10s.
  - Màn hình được giữ sáng trong suốt cuộc gọi.
- App đã tắt hoặc ở nền chỉ nhận được push, không có giao diện gọi của hệ điều hành. Riêng Android trên Expo Go
  không nhận push; ca này chỉ test được khi đã có dev build + Firebase.
- Âm thanh ra loa ngoài hoặc tai nghe theo mặc định của hệ điều hành; chưa có nút chuyển sang loa trong.
- Đổi mạng giữa cuộc gọi (Wi-Fi ↔ 4G) sẽ làm rớt cuộc gọi, vì chưa làm ICE restart.
- Không ghi âm, không lưu nội dung cuộc gọi; chỉ lưu nhật ký trong bảng `call_sessions`.

## Nguồn tham khảo

- Cấu hình WebView cho WebRTC (`mediaCapturePermissionGrantType`, `allowsInlineMediaPlayback`):
  https://docs.whereby.com/whereby-for-mobile-development/in-react-native/in-react-native
- TURN: https://metered.ca/tools/openrelay/ · https://www.cloudflare.com/products/turn-sfu/

---

> **Phần dưới đây:** kế hoạch thông báo + push (nhánh `sprint-2/feature/notification`). Phần này còn dở nên giữ
> nguyên để theo dõi tiếp; `src/notifications/route.ts` đang tham chiếu tới danh mục thông báo (Phần 0) của nó.

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

| #   | Khi nào (hành động → trạng thái)                                                                 | Nơi gọi                          | Type                       | Tiêu đề                       | Nội dung                                                                                                                                                | Bấm vào mở                                         |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------- | -------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| A1  | Gara bấm **Nhận đơn** / gara tự động nhận → `ACCEPTED`                                           | `acceptOffer`                    | `ORDER_ACCEPTED`           | Gara đã nhận yêu cầu          | {garage} đã nhận yêu cầu cứu hộ {code} và đang sắp xếp nhân viên.                                                                                       | `/customer/rescue-tracking?id`                     |
| A2  | **Không tìm được gara** trong 50km → `NO_GARAGE_FOUND` (lúc tạo đơn hoặc gara cuối cùng từ chối) | `createRequest`, `garageDecline` | `NO_GARAGE_FOUND` _(mới)_  | Chưa tìm được gara            | Hiện không có gara phù hợp quanh vị trí của bạn cho yêu cầu {code}. Vui lòng thử lại sau.                                                               | `/customer/rescue-tracking?id`                     |
| A3  | Chủ gara **gán nhân viên + xe** → `ASSIGNED`                                                     | `assignStaff`                    | `STAFF_ASSIGNED` _(mới)_   | Đã có nhân viên cứu hộ        | {staff} · xe {biển số} sẽ hỗ trợ bạn cho đơn {code}.                                                                                                    | `/customer/rescue-tracking?id`                     |
| A4  | Nhân viên trượt **Xuất phát** → `EN_ROUTE`                                                       | `advanceStatus`                  | `STAFF_EN_ROUTE`           | Nhân viên đang trên đường tới | {staff} đã xuất phát. Mở ứng dụng để theo dõi vị trí xe cứu hộ.                                                                                         | `/customer/rescue-tracking?id`                     |
| A5  | Nhân viên trượt **Đã đến** → `ARRIVED`                                                           | `advanceStatus`                  | `STAFF_ARRIVED`            | Nhân viên đã đến nơi          | {staff} đã tới vị trí của bạn và bắt đầu kiểm tra xe.                                                                                                   | `/customer/rescue-tracking?id`                     |
| A6  | Nhân viên **gửi báo giá** → `DIAGNOSED` (kể cả gửi lại)                                          | `submitQuote`                    | `NEW_QUOTE`                | Có báo giá sửa chữa           | Tổng chi phí dự kiến {total} cho đơn {code}. Vui lòng xem và duyệt báo giá.                                                                             | `/customer/rescue-quote?id`                        |
| A7  | Nhân viên bấm **Hoàn thành** → `COMPLETED`                                                       | `advanceStatus`                  | `REPAIR_DONE`              | Đã hoàn thành cứu hộ          | Đơn {code} đã hoàn thành, tổng {total}. + Tiền mặt: "Vui lòng thanh toán tiền mặt cho nhân viên." / Chuyển khoản: "Vui lòng thanh toán trong ứng dụng." | `/customer/rescue-tracking?id` (có nút thanh toán) |
| A8  | Nhân viên/chủ gara **xác nhận thu tiền mặt** → `PAID`                                            | `confirmCashPaid`                | `PAYMENT_RECEIVED` _(mới)_ | Thanh toán thành công         | Gara đã xác nhận nhận {total} tiền mặt cho đơn {code}. Cảm ơn bạn đã dùng SRAS!                                                                         | `/customer/activity`                               |

- [~] A1 · [~] A2 · [~] A3 · [~] A4 · [~] A5 · [~] A6 · [~] A7 · [~] A8

### B. Chủ gara (GARAGE_OWNER) nhận

| #   | Khi nào                                                                                               | Nơi gọi                              | Type                      | Tiêu đề                   | Nội dung                                                                                                                            | Bấm vào mở                      |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| B1  | Hệ thống **gửi lời mời đơn** cho gara (không auto-accept), gồm cả mời lại khi gara trước từ chối      | `offerNearestGarage`                 | `NEW_ORDER`               | Có yêu cầu cứu hộ mới     | {Ô tô/Xe máy} cách gara {x} km — {địa chỉ}. Mở ứng dụng để xem và nhận đơn. _(bỏ "90 giây" vì backend chưa có job hết hạn lời mời)_ | `/garage-owner/orders`          |
| B2  | Hệ thống **tự động nhận** đơn (gara bật auto-accept)                                                  | `offerNearestGarage` → `acceptOffer` | `ORDER_ACCEPTED`          | Đã tự động nhận đơn       | Đơn {code} đã được tự động nhận. Hãy gán nhân viên và xe cứu hộ.                                                                    | `/garage-owner/order-detail?id` |
| B3  | Khách **hủy đơn** khi gara đang có lời mời (`PENDING_GARAGE`) hoặc đã nhận (`ACCEPTED`) → `CANCELLED` | `cancelByCustomer`                   | `ORDER_CANCELLED` _(mới)_ | Khách đã hủy yêu cầu      | Yêu cầu {code} đã bị khách hủy.                                                                                                     | `/garage-owner/orders`          |
| B4  | Khách **duyệt báo giá** → `REPAIRING_ONSITE`                                                          | `advanceStatus` (actor là khách)     | `QUOTE_RESPONDED`         | Khách đã duyệt báo giá    | Khách đồng ý báo giá {total} cho đơn {code}.                                                                                        | `/garage-owner/order-detail?id` |
| B5  | Nhân viên **hoàn thành** → `COMPLETED`                                                                | `advanceStatus`                      | `REPAIR_DONE`             | Đơn đã hoàn thành         | {staff} đã hoàn thành đơn {code}, chờ khách thanh toán {total}.                                                                     | `/garage-owner/order-detail?id` |
| B6  | Khách **thanh toán chuyển khoản** → `PAID`                                                            | `payByTransfer`                      | `PAYMENT_RECEIVED`        | Khách đã thanh toán       | Đơn {code} đã được thanh toán chuyển khoản {total}.                                                                                 | `/garage-owner/order-detail?id` |
| B7  | **Nhân viên** xác nhận thu tiền mặt → `PAID` (bỏ qua nếu chính chủ gara bấm)                          | `confirmCashPaid`                    | `PAYMENT_RECEIVED`        | Nhân viên đã thu tiền mặt | {người bấm} đã thu {total} tiền mặt cho đơn {code}.                                                                                 | `/garage-owner/order-detail?id` |

- [~] B1 · [~] B2 · [~] B3 · [~] B4 · [~] B5 · [~] B6 · [~] B7

### C. Nhân viên gara (GARAGE_STAFF) nhận

| #   | Khi nào                                                             | Nơi gọi                          | Type                    | Tiêu đề                    | Nội dung                                                                   | Bấm vào mở                         |
| --- | ------------------------------------------------------------------- | -------------------------------- | ----------------------- | -------------------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| C1  | Chủ gara **gán đơn** → `ASSIGNED`                                   | `assignStaff`                    | `TASK_ASSIGNED` _(mới)_ | Bạn có nhiệm vụ cứu hộ mới | {Ô tô/Xe máy} tại {địa chỉ}. Khách {tên} · {SĐT}. Bấm để xem và xuất phát. | `/garage-staff/home`               |
| C2  | Khách **duyệt báo giá** → `REPAIRING_ONSITE`                        | `advanceStatus` (actor là khách) | `QUOTE_RESPONDED`       | Khách đã duyệt báo giá     | Khách đồng ý báo giá {total} cho đơn {code}. Bắt đầu sửa chữa.             | `/garage-staff/repair-progress?id` |
| C3  | Khách **thanh toán chuyển khoản** → `PAID`                          | `payByTransfer`                  | `PAYMENT_RECEIVED`      | Khách đã thanh toán        | Đơn {code} đã thanh toán chuyển khoản {total}. Bạn có thể nhận đơn mới.    | `/garage-staff/home`               |
| C4  | **Chủ gara** xác nhận thu tiền mặt (bỏ qua nếu chính nhân viên bấm) | `confirmCashPaid`                | `PAYMENT_RECEIVED`      | Đơn đã thanh toán          | Gara đã xác nhận thu {total} tiền mặt cho đơn {code}.                      | `/garage-staff/home`               |

- [~] C1 · [~] C2 · [~] C3 · [~] C4

### D. Tin nhắn chat (mọi vai trò)

| #   | Khi nào                                                                                                     | Người nhận     | Lưu bản ghi?         | Tiêu đề / Nội dung                                             | Bấm vào mở                      |
| --- | ----------------------------------------------------------------------------------------------------------- | -------------- | -------------------- | -------------------------------------------------------------- | ------------------------------- |
| D1  | Tin nhắn mới trong chat đơn (`ChatServiceImpl`), **chỉ khi người nhận không có kết nối `/ws/chat` đang mở** | Người nhận tin | **Không** (chỉ push) | {tên người gửi} / nội dung (cắt 100 ký tự), ảnh → "[Hình ảnh]" | `/chat` (params như `chat.tsx`) |

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

## Phần 4 — Tài liệu

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
