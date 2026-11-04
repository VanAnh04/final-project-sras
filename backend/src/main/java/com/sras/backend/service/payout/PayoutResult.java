package com.sras.backend.service.payout;

/**
 * Kết quả đã chuẩn hoá từ cổng chi.
 *
 * @param providerState trạng thái thô của cổng (để log/đối soát)
 * @param errorCode     mã lỗi thô — KHÔNG trả thẳng cho gara
 * @param errorMessage  thông điệp thô — KHÔNG trả thẳng cho gara
 * @param toAccountName tên chủ TK do ngân hàng trả về (nếu có) — đối chiếu với tên gara khai báo
 */
public record PayoutResult(Outcome outcome, String providerPayoutId, String providerState,
                           String errorCode, String errorMessage, String toAccountName) {

    public enum Outcome {
        /** Tiền đã về tài khoản nhận. */
        SUCCEEDED,
        /** Chắc chắn KHÔNG chi (bị từ chối / huỷ / thất bại) — được hoàn ví. */
        FAILED,
        /** Cổng đã nhận lệnh, đang xử lý. */
        PROCESSING,
        /** Đã chi rồi bị đảo — chỉ cắm cờ cho admin, không tự xử lý tiền. */
        REVERSED,
        /** Cổng từ chối request (4xx nghiệp vụ). Phải tra lại theo referenceId trước khi kết luận chưa chi. */
        REQUEST_REJECTED,
        /** Cổng không có lệnh nào mang referenceId này. */
        NOT_FOUND,
        /** Không biết (timeout, lỗi mạng, 5xx, sai chữ ký response…). TUYỆT ĐỐI không coi là thất bại. */
        UNKNOWN
    }

    public static PayoutResult unknown(String errorCode, String errorMessage) {
        return new PayoutResult(Outcome.UNKNOWN, null, null, errorCode, errorMessage, null);
    }

    public static PayoutResult notFound() {
        return new PayoutResult(Outcome.NOT_FOUND, null, null, null, null, null);
    }
}
