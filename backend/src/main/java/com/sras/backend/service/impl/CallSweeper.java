package com.sras.backend.service.impl;

import com.sras.backend.entity.enums.CallStatus;
import com.sras.backend.repository.CallSessionRepository;
import com.sras.backend.service.CallService;
import com.sras.backend.websocket.ChatWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Dọn các cuộc gọi quá hạn. Chạy ngoài transaction: mỗi thay đổi trạng thái đi qua {@link CallService}
 * (có khóa dòng + transaction riêng), nên ở đây chỉ dùng id / projection, không chạm quan hệ LAZY.
 *
 * <p>Giả định backend chạy <b>một</b> instance — trạng thái online của WebSocket nằm trong RAM.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CallSweeper {

    private final CallService callService;
    private final CallSessionRepository callRepository;
    private final ChatWebSocketHandler chatWebSocketHandler;

    @Value("${app.call.ring-timeout-seconds:45}")
    private int ringTimeoutSeconds;

    @Value("${app.call.disconnect-grace-seconds:20}")
    private int disconnectGraceSeconds;

    /** Cuộc gọi ONGOING → thời điểm đầu tiên quét thấy có ít nhất một bên mất WebSocket. */
    private final Map<Long, Instant> offlineSince = new ConcurrentHashMap<>();

    /** Server vừa khởi động: cuộc gọi còn sót từ lần chạy trước không thể tiếp tục → FAILED. */
    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        try {
            callService.failAllActiveOnStartup();
        } catch (Exception e) {
            // Không để lỗi dọn dẹp làm hỏng việc khởi động server.
            log.warn("Đóng cuộc gọi còn sót lúc khởi động lỗi: {}", e.getMessage());
        }
    }

    @Scheduled(fixedDelayString = "${app.call.sweep-interval-ms:5000}")
    public void sweep() {
        try {
            // 1) Đổ chuông quá hạn mà không ai nghe → MISSED.
            OffsetDateTime ringDeadline = OffsetDateTime.now().minusSeconds(ringTimeoutSeconds);
            callRepository.findIdsByStatusAndCreatedAtBefore(CallStatus.RINGING, ringDeadline)
                    .forEach(callService::expireRinging);

            // 2) Đang nói mà một bên mất WebSocket quá hạn → FAILED.
            Set<Long> seen = new HashSet<>();
            for (CallSessionRepository.CallParticipantsRef ref : callRepository.findRefsByStatus(CallStatus.ONGOING)) {
                Long callId = ref.getId();
                seen.add(callId);
                boolean bothOnline = chatWebSocketHandler.isOnline(ref.getCallerId())
                        && chatWebSocketHandler.isOnline(ref.getCalleeId());
                if (bothOnline) {
                    offlineSince.remove(callId);
                    continue;
                }
                Instant since = offlineSince.computeIfAbsent(callId, k -> Instant.now());
                if (since.plusSeconds(disconnectGraceSeconds).isBefore(Instant.now())) {
                    callService.failOngoing(callId);
                    offlineSince.remove(callId);
                }
            }
            // Quên các cuộc gọi đã kết thúc để map không phình ra.
            offlineSince.keySet().retainAll(seen);
        } catch (Exception e) {
            log.warn("Quét cuộc gọi lỗi: {}", e.getMessage());
        }
    }
}
