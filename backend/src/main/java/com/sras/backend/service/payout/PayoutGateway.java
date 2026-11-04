package com.sras.backend.service.payout;

import com.sras.backend.entity.enums.PayoutProvider;

/**
 * Cổng chi hộ (payout). Mọi hàm KHÔNG ném lỗi mạng ra ngoài: lỗi được quy về {@link PayoutResult.Outcome#UNKNOWN}
 * để nơi gọi không bao giờ hiểu nhầm timeout là thất bại (timeout có thể là tiền đã đi — INV-3).
 */
public interface PayoutGateway {

    PayoutProvider provider();

    /**
     * Gửi lệnh chi. {@code command.referenceId()} đồng thời là idempotency key — gọi lại với cùng key thì cổng
     * không chi lần hai.
     */
    PayoutResult create(PayoutCommand command);

    /** Tra trạng thái theo id lệnh bên cổng. */
    PayoutResult get(String providerPayoutId);

    /** Tra theo referenceId của ta. Cổng không có lệnh nào ⇒ {@link PayoutResult.Outcome#NOT_FOUND}. */
    PayoutResult findByReference(String referenceId);

    /** Số dư tài khoản chi (VND); {@code null} nếu không lấy được. */
    Long balance();
}
