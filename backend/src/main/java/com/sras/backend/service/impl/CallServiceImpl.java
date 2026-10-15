package com.sras.backend.service.impl;

import com.sras.backend.dto.request.CallSignalRequest;
import com.sras.backend.dto.request.StartCallRequest;
import com.sras.backend.dto.response.CallResponse;
import com.sras.backend.dto.response.IceServerResponse;
import com.sras.backend.entity.CallSession;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.CallStatus;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.CallSessionRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.service.CallService;
import com.sras.backend.service.push.PushService;
import com.sras.backend.websocket.ChatWebSocketHandler;
import com.sras.backend.websocket.WsJson;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Gọi thoại: server chỉ quản lý vòng đời cuộc gọi và chuyển tiếp tín hiệu WebRTC; âm thanh đi P2P.
 *
 * <p>Quy ước quan trọng:
 * <ul>
 *   <li>Mọi payload WebSocket/push được dựng <b>trong transaction</b> (đọc được quan hệ LAZY) rồi mới
 *       gửi ở {@code afterCommit} — {@code open-in-view=false} nên ngoài transaction không đọc được tên/avatar.</li>
 *   <li>Sự kiện đổi trạng thái chỉ gửi sau commit: nếu {@code CALL_ACCEPTED} đến trước commit, người gọi có
 *       thể gửi OFFER khi DB vẫn còn RINGING và bị từ chối.</li>
 *   <li>Đổi trạng thái luôn khóa dòng ({@code findWithLockById}) để accept / end / sweeper không đua nhau.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CallServiceImpl implements CallService {

    /** Trạng thái đơn cho phép gọi: từ lúc gara nhận đơn tới lúc chờ thanh toán. */
    private static final Set<RescueStatus> CALLABLE = EnumSet.of(
            RescueStatus.ACCEPTED, RescueStatus.ASSIGNED, RescueStatus.EN_ROUTE, RescueStatus.ARRIVED,
            RescueStatus.DIAGNOSED, RescueStatus.REPAIRING_ONSITE, RescueStatus.TOWING,
            RescueStatus.COMPLETED, RescueStatus.AWAITING_PAYMENT, RescueStatus.PAID);

    /** Cuộc gọi đang chiếm máy của một người. */
    private static final Set<CallStatus> ACTIVE = EnumSet.of(CallStatus.RINGING, CallStatus.ONGOING);

    private final CallSessionRepository callRepository;
    private final RescueRequestRepository rescueRequestRepository;
    private final RescueParticipants participants;
    private final ChatWebSocketHandler chatWebSocketHandler;
    private final PushService pushService;

    @Value("${app.call.ring-timeout-seconds:45}")
    private int ringTimeoutSeconds;

    @Value("${app.call.stun-urls:}")
    private String stunUrls;

    @Value("${app.call.turn-urls:}")
    private String turnUrls;

    @Value("${app.call.turn-username:}")
    private String turnUsername;

    @Value("${app.call.turn-credential:}")
    private String turnCredential;

    @Value("${app.call.turn-secret:}")
    private String turnSecret;

    @Value("${app.call.turn-ttl-seconds:21600}")
    private long turnTtlSeconds;

    // ─────────────────────────── Vòng đời cuộc gọi ───────────────────────────

    @Override
    @Transactional
    public CallResponse start(User caller, StartCallRequest in) {
        RescueRequest request = rescueRequestRepository.findByIdAndIsDeletedFalse(in.getRescueRequestId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu cứu hộ"));

        String callerRole = participants.roleOf(request, caller);
        if (callerRole == null) {
            throw new UnauthorizedException("Bạn không thuộc đơn cứu hộ này");
        }
        if (RescueParticipants.STAFF.equals(callerRole) && !participants.isAssignedStaff(request, caller)) {
            throw new BadRequestException("Chỉ nhân viên được gán cho đơn mới gọi được");
        }
        if (!CALLABLE.contains(request.getStatus())) {
            throw new BadRequestException("Chỉ gọi được khi đơn đang được xử lý");
        }

        String calleeRole = participants.normalizeRole(in.getPeer());
        User callee = participants.resolveAssignedPeer(request, calleeRole);
        if (callee.getId().equals(caller.getId())) {
            throw new BadRequestException("Không thể tự gọi cho chính mình");
        }
        if (!callRepository.findActiveByUser(caller.getId(), ACTIVE).isEmpty()) {
            throw new BadRequestException("Bạn đang có một cuộc gọi khác");
        }
        if (!callRepository.findActiveByUser(callee.getId(), ACTIVE).isEmpty()) {
            throw new BadRequestException("Người nhận đang bận, vui lòng gọi lại sau");
        }

        CallSession call = new CallSession();
        call.setRescueRequest(request);
        call.setCaller(caller);
        call.setCallee(callee);
        call.setCallerRole(callerRole);
        call.setCalleeRole(calleeRole);
        call.setStatus(CallStatus.RINGING);
        call = callRepository.save(call);

        boolean calleeOnline = chatWebSocketHandler.isOnline(callee.getId());
        CallResponse res = toResponse(call, calleeOnline);

        String payload = "{\"event\":\"CALL_INCOMING\",\"call\":" + toJson(res) + "}";
        Long calleeId = callee.getId();
        afterCommit(() -> sendToUser(calleeId, payload));

        // Người nhận không mở app (không có kết nối WS) → đánh thức bằng push.
        if (!calleeOnline) pushIncoming(call);
        return res;
    }

    @Override
    @Transactional
    public CallResponse accept(User user, Long callId) {
        CallSession call = lockCall(callId);
        requireCallee(call, user);
        if (call.getStatus() != CallStatus.RINGING) {
            throw new BadRequestException("Cuộc gọi đã được trả lời hoặc đã kết thúc");
        }
        call.setStatus(CallStatus.ONGOING);
        call.setAnsweredAt(OffsetDateTime.now());

        // Cả hai bên (mọi máy): máy khác của người nhận biết để tắt chuông, người gọi biết để tạo OFFER.
        broadcast(call, "{\"event\":\"CALL_ACCEPTED\",\"callId\":" + call.getId() + "}");
        return toResponse(call, null);
    }

    @Override
    @Transactional
    public CallResponse reject(User user, Long callId) {
        CallSession call = lockCall(callId);
        requireCallee(call, user);
        if (call.getStatus() != CallStatus.RINGING) {
            throw new BadRequestException("Cuộc gọi đã được trả lời hoặc đã kết thúc");
        }
        finish(call, CallStatus.REJECTED, user);
        return toResponse(call, null);
    }

    @Override
    @Transactional
    public CallResponse end(User user, Long callId, boolean failed) {
        CallSession call = lockCall(callId);
        requireParticipant(call, user);

        switch (call.getStatus()) {
            case RINGING -> {
                if (call.getCaller().getId().equals(user.getId())) {
                    // Người gọi cúp khi chưa ai nghe → người nhận thấy cuộc gọi nhỡ.
                    finish(call, CallStatus.CANCELLED, user);
                    pushMissed(call);
                } else {
                    finish(call, CallStatus.REJECTED, user);
                }
            }
            case ONGOING -> finish(call, failed ? CallStatus.FAILED : CallStatus.ENDED, user);
            default -> {
                // Đã kết thúc từ trước (bên kia cúp trước, hết giờ...) → idempotent, không đổi gì.
            }
        }
        return toResponse(call, null);
    }

    @Override
    @Transactional(readOnly = true)
    public void signal(User user, Long callId, CallSignalRequest req) {
        CallSession call = callRepository.findById(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cuộc gọi"));
        requireParticipant(call, user);
        if (call.getStatus() != CallStatus.ONGOING) {
            throw new BadRequestException("Cuộc gọi không còn diễn ra");
        }

        boolean fromCaller = call.getCaller().getId().equals(user.getId());
        if ("OFFER".equals(req.getType()) && !fromCaller) {
            throw new BadRequestException("Chỉ người gọi được gửi OFFER");
        }
        if ("ANSWER".equals(req.getType()) && fromCaller) {
            throw new BadRequestException("Chỉ người nhận được gửi ANSWER");
        }

        Long otherId = fromCaller ? call.getCallee().getId() : call.getCaller().getId();
        // Gửi ngay, không chờ commit: transaction này không ghi gì.
        String payload = "{\"event\":\"CALL_SIGNAL\",\"callId\":" + call.getId()
                + ",\"type\":" + WsJson.str(req.getType())
                + ",\"sdp\":" + WsJson.str(req.getSdp()) + "}";
        chatWebSocketHandler.sendToUser(otherId, payload);
    }

    @Override
    @Transactional(readOnly = true)
    public CallResponse getActive(User user) {
        List<CallSession> active = callRepository.findActiveByUser(user.getId(), ACTIVE);
        return active.isEmpty() ? null : toResponse(active.get(0), null);
    }

    @Override
    @Transactional(readOnly = true)
    public CallResponse get(User user, Long callId) {
        CallSession call = callRepository.findById(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cuộc gọi"));
        requireParticipant(call, user);
        return toResponse(call, null);
    }

    @Override
    public List<IceServerResponse> iceServers(User user) {
        List<IceServerResponse> servers = new ArrayList<>();

        List<String> stun = splitCsv(stunUrls);
        if (!stun.isEmpty()) {
            servers.add(IceServerResponse.builder().urls(stun).build());
        }

        List<String> turn = splitCsv(turnUrls);
        if (!turn.isEmpty()) {
            IceServerResponse.IceServerResponseBuilder builder = IceServerResponse.builder().urls(turn);
            if (hasText(turnSecret)) {
                // coturn "use-auth-secret": username = <hạn dùng>:<userId>, credential = base64(HMAC-SHA1(secret, username)).
                long expiresAt = Instant.now().getEpochSecond() + turnTtlSeconds;
                String username = expiresAt + ":" + user.getId();
                builder.username(username).credential(hmacSha1Base64(turnSecret, username));
            } else {
                builder.username(hasText(turnUsername) ? turnUsername : null)
                        .credential(hasText(turnCredential) ? turnCredential : null);
            }
            servers.add(builder.build());
        }
        return servers;
    }

    // ─────────────────────────── Dành cho CallSweeper ───────────────────────────

    @Override
    @Transactional
    public void expireRinging(Long callId) {
        CallSession call = callRepository.findWithLockById(callId).orElse(null);
        if (call == null || call.getStatus() != CallStatus.RINGING) return;
        finish(call, CallStatus.MISSED, null);
        pushMissed(call);
    }

    @Override
    @Transactional
    public void failOngoing(Long callId) {
        CallSession call = callRepository.findWithLockById(callId).orElse(null);
        if (call == null || call.getStatus() != CallStatus.ONGOING) return;
        finish(call, CallStatus.FAILED, null);
    }

    @Override
    @Transactional
    public void failAllActiveOnStartup() {
        List<CallSession> stale = callRepository.findByStatusIn(ACTIVE);
        if (stale.isEmpty()) return;
        OffsetDateTime now = OffsetDateTime.now();
        for (CallSession call : stale) {
            call.setStatus(CallStatus.FAILED);
            call.setEndedAt(now);
        }
        log.info("Đã đóng {} cuộc gọi còn sót từ lần chạy trước (FAILED)", stale.size());
    }

    // ─────────────────────────── Helpers ───────────────────────────

    private CallSession lockCall(Long callId) {
        return callRepository.findWithLockById(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cuộc gọi"));
    }

    private void requireParticipant(CallSession call, User user) {
        boolean isCaller = call.getCaller().getId().equals(user.getId());
        boolean isCallee = call.getCallee().getId().equals(user.getId());
        if (!isCaller && !isCallee) {
            throw new UnauthorizedException("Bạn không thuộc cuộc gọi này");
        }
    }

    private void requireCallee(CallSession call, User user) {
        requireParticipant(call, user);
        if (!call.getCallee().getId().equals(user.getId())) {
            throw new BadRequestException("Chỉ người nhận mới trả lời hoặc từ chối được");
        }
    }

    /**
     * Đưa cuộc gọi sang trạng thái kết thúc: ghi thời điểm, người kết thúc (null = hệ thống), thời lượng
     * nếu đã từng nghe máy, rồi báo {@code CALL_ENDED} cho cả hai bên sau commit.
     */
    private void finish(CallSession call, CallStatus status, User endedBy) {
        OffsetDateTime now = OffsetDateTime.now();
        if (call.getAnsweredAt() != null) {
            call.setDurationSec((int) Math.max(0, Duration.between(call.getAnsweredAt(), now).getSeconds()));
        }
        call.setStatus(status);
        call.setEndedAt(now);
        call.setEndedBy(endedBy);

        broadcast(call, "{\"event\":\"CALL_ENDED\",\"callId\":" + call.getId()
                + ",\"status\":" + WsJson.str(status.name())
                + ",\"durationSec\":" + WsJson.num(call.getDurationSec()) + "}");
    }

    /** Gửi {@code payload} (đã dựng sẵn) cho cả hai bên của cuộc gọi, sau khi transaction commit. */
    private void broadcast(CallSession call, String payload) {
        Long callerId = call.getCaller().getId();
        Long calleeId = call.getCallee().getId();
        afterCommit(() -> {
            sendToUser(callerId, payload);
            sendToUser(calleeId, payload);
        });
    }

    private void sendToUser(Long userId, String payload) {
        try {
            chatWebSocketHandler.sendToUser(userId, payload);
        } catch (Exception e) {
            log.warn("Gửi sự kiện cuộc gọi tới user {} lỗi: {}", userId, e.getMessage());
        }
    }

    /** Chạy sau khi transaction hiện tại commit; không có transaction thì chạy ngay. */
    private void afterCommit(Runnable task) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }

    private void pushIncoming(CallSession call) {
        User caller = call.getCaller();
        String name = displayName(caller);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("type", "INCOMING_CALL");
        data.put("callId", call.getId());
        data.put("rescueRequestId", call.getRescueRequest().getId());
        data.put("peer", call.getCallerRole());
        data.put("peerName", name);
        if (caller.getAvatarUrl() != null) data.put("peerAvatar", caller.getAvatarUrl());

        pushService.sendAfterCommit(call.getCallee().getId(), null, "Cuộc gọi đến",
                name + " đang gọi cho bạn (đơn " + call.getRescueRequest().getCode() + "). Bấm để trả lời.",
                data, ringTimeoutSeconds);
    }

    private void pushMissed(CallSession call) {
        User caller = call.getCaller();
        String name = displayName(caller);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("type", "MISSED_CALL");
        data.put("rescueRequestId", call.getRescueRequest().getId());
        data.put("peer", call.getCallerRole());
        data.put("peerName", name);
        if (caller.getPhone() != null) data.put("peerPhone", caller.getPhone());
        if (caller.getAvatarUrl() != null) data.put("peerAvatar", caller.getAvatarUrl());

        pushService.sendAfterCommit(call.getCallee().getId(), null, "Cuộc gọi nhỡ",
                name + " đã gọi cho bạn (đơn " + call.getRescueRequest().getCode() + ").", data);
    }

    private static String displayName(User user) {
        String name = user.getFullName();
        return name != null && !name.isBlank() ? name : "Người dùng SRAS";
    }

    /**
     * @param calleeOnline chỉ có giá trị ở phản hồi lúc bắt đầu gọi; các nơi khác truyền null.
     */
    private CallResponse toResponse(CallSession call, Boolean calleeOnline) {
        User caller = call.getCaller();
        User callee = call.getCallee();
        return CallResponse.builder()
                .id(call.getId())
                .rescueRequestId(call.getRescueRequest().getId())
                .rescueCode(call.getRescueRequest().getCode())
                .status(call.getStatus().name())
                .callerId(caller.getId())
                .callerRole(call.getCallerRole())
                .callerName(caller.getFullName())
                .callerAvatarUrl(caller.getAvatarUrl())
                .calleeId(callee.getId())
                .calleeRole(call.getCalleeRole())
                .calleeName(callee.getFullName())
                .calleeAvatarUrl(callee.getAvatarUrl())
                .createdAt(call.getCreatedAt())
                .answeredAt(call.getAnsweredAt())
                .endedAt(call.getEndedAt())
                .durationSec(call.getDurationSec())
                .calleeOnline(calleeOnline)
                .build();
    }

    /** JSON thủ công (cùng cách với chat) để payload WebSocket không phụ thuộc cấu hình ObjectMapper. */
    private String toJson(CallResponse r) {
        StringBuilder sb = new StringBuilder("{");
        sb.append("\"id\":").append(WsJson.num(r.getId()));
        sb.append(",\"rescueRequestId\":").append(WsJson.num(r.getRescueRequestId()));
        sb.append(",\"rescueCode\":").append(WsJson.str(r.getRescueCode()));
        sb.append(",\"status\":").append(WsJson.str(r.getStatus()));
        sb.append(",\"callerId\":").append(WsJson.num(r.getCallerId()));
        sb.append(",\"callerRole\":").append(WsJson.str(r.getCallerRole()));
        sb.append(",\"callerName\":").append(WsJson.str(r.getCallerName()));
        sb.append(",\"callerAvatarUrl\":").append(WsJson.str(r.getCallerAvatarUrl()));
        sb.append(",\"calleeId\":").append(WsJson.num(r.getCalleeId()));
        sb.append(",\"calleeRole\":").append(WsJson.str(r.getCalleeRole()));
        sb.append(",\"calleeName\":").append(WsJson.str(r.getCalleeName()));
        sb.append(",\"calleeAvatarUrl\":").append(WsJson.str(r.getCalleeAvatarUrl()));
        sb.append(",\"createdAt\":").append(WsJson.str(isoOrNull(r.getCreatedAt())));
        sb.append(",\"answeredAt\":").append(WsJson.str(isoOrNull(r.getAnsweredAt())));
        sb.append(",\"endedAt\":").append(WsJson.str(isoOrNull(r.getEndedAt())));
        sb.append(",\"durationSec\":").append(WsJson.num(r.getDurationSec()));
        sb.append(",\"calleeOnline\":").append(WsJson.bool(r.getCalleeOnline()));
        sb.append("}");
        return sb.toString();
    }

    private static String isoOrNull(OffsetDateTime t) {
        return t != null ? t.toString() : null;
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    /** Tách chuỗi phân cách bằng dấu phẩy, bỏ khoảng trắng và phần tử rỗng. */
    private static List<String> splitCsv(String raw) {
        if (!hasText(raw)) return List.of();
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private static String hmacSha1Base64(String secret, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA1"));
            return Base64.getEncoder().encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Không tạo được credential TURN", e);
        }
    }
}
