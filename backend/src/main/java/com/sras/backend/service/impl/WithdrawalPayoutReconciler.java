package com.sras.backend.service.impl;

import com.sras.backend.service.WithdrawalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Job đối soát lệnh rút AUTO còn dở dang (cổng payOS không có webhook payout nên phải tra cứu định kỳ):
 * PAYOUT_SENDING kẹt do server sập, PAYOUT_PROCESSING chờ ngân hàng, PAYOUT_UNCERTAIN sau timeout.
 * Lỗi của một lệnh không được làm dừng cả lượt quét.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WithdrawalPayoutReconciler {

    private final WithdrawalService withdrawalService;

    @Scheduled(fixedDelayString = "${app.payout.reconcile-interval-ms:5000}",
            initialDelayString = "${app.payout.reconcile-initial-delay-ms:15000}")
    public void sweep() {
        for (Long id : withdrawalService.findIdsToReconcile()) {
            try {
                withdrawalService.reconcile(id);
            } catch (Exception e) {
                log.error("Đối soát lệnh rút id={} lỗi: {}", id, e.getMessage(), e);
            }
        }
    }
}
