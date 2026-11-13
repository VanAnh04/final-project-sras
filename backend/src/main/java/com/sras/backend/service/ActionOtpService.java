package com.sras.backend.service;

import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.ActionOtpPurpose;

/**
 * OTP SMS xác thực thao tác nhạy cảm. Mỗi mã gắn với một {@link ActionOtpPurpose} và một chuỗi {@code payload}
 * mô tả đúng nội dung thao tác (số tiền, STK…): đổi nội dung là mã mất hiệu lực.
 */
public interface ActionOtpService {

    enum OtpCheck { OK, INVALID, EXPIRED, TOO_MANY_ATTEMPTS, PAYLOAD_MISMATCH }

    /**
     * Gửi mã qua SMS (template brandname cố định, không ghi được nội dung) kèm push/in-app mô tả thao tác.
     *
     * @param summary câu mô tả thao tác cho push, ví dụ "RÚT 1.000.000đ về Vietcombank ****1234"
     */
    void send(User user, ActionOtpPurpose purpose, String payload, String summary);

    /**
     * Vừa đổi SĐT/email trong hồ sơ ⇒ tạm không cấp mã cho thao tác tiền, để người chiếm phiên đăng nhập không tự
     * đổi số nhận SMS rồi lấy mã. Trả câu báo lỗi, hoặc null nếu không bị khoá.
     */
    String contactLockReason(User user);

    /**
     * Kiểm và tiêu mã. PHẢI gọi bên trong transaction của chính thao tác. Không ném lỗi khi sai mã — trả kết quả
     * để transaction vẫn commit được số lần nhập sai.
     */
    OtpCheck verifyAndConsume(User user, ActionOtpPurpose purpose, String payload, String code);

    static String message(OtpCheck check) {
        return switch (check) {
            case OK -> "Mã OTP hợp lệ";
            case INVALID -> "Mã OTP không đúng";
            case EXPIRED -> "Mã OTP đã hết hạn hoặc không còn hiệu lực, vui lòng yêu cầu mã mới";
            case TOO_MANY_ATTEMPTS -> "Bạn đã nhập sai mã quá số lần cho phép, vui lòng yêu cầu mã mới";
            case PAYLOAD_MISMATCH -> "Thông tin giao dịch đã thay đổi so với lúc nhận mã, vui lòng yêu cầu mã mới";
        };
    }
}
