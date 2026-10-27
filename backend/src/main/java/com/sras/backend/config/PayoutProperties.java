package com.sras.backend.config;

import com.sras.backend.entity.enums.PayoutProvider;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Cấu hình rút tiền gara về ngân hàng ({@code app.payout.*}). Tiền thật: mọi hạn mức đều chặn ở backend,
 * client không tự quyết được.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.payout")
public class PayoutProperties {

    /** Công tắc tắt khẩn cấp: false ⇒ mọi lệnh rút mới bị từ chối (lệnh đang chạy vẫn được đối soát). */
    private boolean enabled = true;

    /** PAYOS = chi tiền thật qua kênh chi payOS; MOCK = giả lập cho dev/test. */
    private PayoutProvider provider = PayoutProvider.MOCK;

    private long minAmount = 10_000L;
    private long maxAmountPerRequest = 20_000_000L;
    private long maxAmountPerDay = 50_000_000L;
    private int maxRequestsPerDay = 5;

    /** Trần chi của TOÀN hệ thống trong một ngày (giờ VN) — chặn thiệt hại khi có bug hay bị tấn công hàng loạt. */
    private long systemMaxAmountPerDay = 200_000_000L;

    /** Đổi tài khoản nhận tiền (không phải lần khai báo đầu) ⇒ khoá rút bấy nhiêu giờ. */
    private int bankChangeLockHours = 24;

    /** Số dư tài khoản chi payOS dưới ngưỡng này ⇒ cảnh báo admin PAYOUT_FUND_LOW. */
    private long fundLowThreshold = 5_000_000L;

    /** Lệnh còn PAYOUT_SENDING quá bấy nhiêu giây ⇒ coi như server sập giữa chừng, job đối soát xử lý. */
    private int sendingStaleSeconds = 60;

    /** Lệnh PAYOUT_UNCERTAIN mà cổng vẫn không thấy sau bấy nhiêu phút ⇒ cắm cờ cho admin. */
    private int uncertainReviewAfterMinutes = 10;

    /** Lệnh chưa chốt sau bấy nhiêu phút (bất kể trạng thái) ⇒ cắm cờ cho admin. */
    private int manualReviewAfterMinutes = 30;

    /** MOCK: lệnh chốt kết quả sau bấy nhiêu giây. */
    private int mockSettleSeconds = 3;

    private PayOS payos = new PayOS();

    @Getter
    @Setter
    public static class PayOS {
        /** Key RIÊNG của kênh chi — khác bộ key kênh thu ({@code app.payos.*}). */
        private String clientId;
        private String apiKey;
        private String checksumKey;

        /** Kiểm chữ ký {@code x-signature} trên response của cổng. Sai chữ ký ⇒ coi như chưa rõ kết quả. */
        private boolean verifyResponseSignature = true;

        private int connectTimeoutMs = 5_000;
        private int readTimeoutMs = 20_000;
    }
}
