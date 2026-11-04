package com.sras.backend.service.payout;

import com.sras.backend.config.PayoutProperties;
import com.sras.backend.entity.enums.PayoutProvider;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cổng chi giả lập cho dev / test — KHÔNG chuyển tiền thật. Lệnh chốt sau {@code app.payout.mock-settle-seconds}.
 * <ul>
 *   <li>STK kết thúc {@code 000} ⇒ ngân hàng từ chối (FAILED) — test nhánh hoàn ví.</li>
 *   <li>STK kết thúc {@code 999} ⇒ lần gửi đầu "timeout" nhưng cổng vẫn nhận lệnh — test nhánh PAYOUT_UNCERTAIN.</li>
 * </ul>
 * Trạng thái chỉ nằm trong bộ nhớ: khởi động lại thì mất (lệnh treo sẽ được cắm cờ cho admin).
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.payout.provider", havingValue = "MOCK", matchIfMissing = true)
public class MockPayoutGateway implements PayoutGateway {

    private final PayoutProperties props;

    private record MockPayout(String id, String referenceId, String toAccountNumber, Instant createdAt) {}

    private final Map<String, MockPayout> byReference = new ConcurrentHashMap<>();
    private final Map<String, MockPayout> byId = new ConcurrentHashMap<>();

    @PostConstruct
    void warn() {
        log.warn("Rút tiền đang chạy cổng MOCK — KHÔNG có tiền thật nào được chuyển (app.payout.provider=MOCK)");
    }

    @Override
    public PayoutProvider provider() {
        return PayoutProvider.MOCK;
    }

    @Override
    public PayoutResult create(PayoutCommand cmd) {
        // Cùng referenceId ⇒ trả lại đúng lệnh cũ, như idempotency key của cổng thật.
        MockPayout existing = byReference.get(cmd.referenceId());
        if (existing != null) return toResult(existing);

        MockPayout p = new MockPayout("mock_" + UUID.randomUUID(), cmd.referenceId(), cmd.toAccountNumber(), Instant.now());
        byReference.put(p.referenceId(), p);
        byId.put(p.id(), p);
        if (cmd.toAccountNumber().endsWith("999")) {
            return PayoutResult.unknown("NETWORK", "Mock timeout");
        }
        return toResult(p);
    }

    @Override
    public PayoutResult get(String providerPayoutId) {
        MockPayout p = byId.get(providerPayoutId);
        return p != null ? toResult(p) : PayoutResult.unknown("LOOKUP_FAILED", "Mock không còn lệnh này");
    }

    @Override
    public PayoutResult findByReference(String referenceId) {
        MockPayout p = byReference.get(referenceId);
        return p != null ? toResult(p) : PayoutResult.notFound();
    }

    @Override
    public Long balance() {
        return 1_000_000_000L;
    }

    private PayoutResult toResult(MockPayout p) {
        boolean settled = Instant.now().isAfter(p.createdAt().plusSeconds(props.getMockSettleSeconds()));
        if (!settled) {
            return new PayoutResult(PayoutResult.Outcome.PROCESSING, p.id(), "PROCESSING/PROCESSING", null, null, null);
        }
        if (p.toAccountNumber().endsWith("000")) {
            return new PayoutResult(PayoutResult.Outcome.FAILED, p.id(), "FAILED/FAILED",
                    "MOCK_INVALID_ACCOUNT", "Tài khoản nhận không hợp lệ (mock)", null);
        }
        return new PayoutResult(PayoutResult.Outcome.SUCCEEDED, p.id(), "COMPLETED/SUCCEEDED", null, null, null);
    }
}
