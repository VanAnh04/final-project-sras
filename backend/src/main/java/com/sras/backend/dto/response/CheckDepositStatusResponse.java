package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Trạng thái yêu cầu đặt cọc chống boom đơn của khách hàng / thiết bị máy.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckDepositStatusResponse {

    /** Có bắt buộc nộp tiền cọc trước khi tìm Gara hay không. */
    private Boolean depositRequired;

    /** Số tiền cọc quy định (50.000đ). */
    private Long depositAmount;

    /** Số đơn boom đã bị báo cáo và Ban quản trị (Admin) đã duyệt. */
    private Long approvedBomCount;

    /** Số đơn cọc đã hoàn thành thành công trong tiến trình gỡ cọc (cần đủ 2 đơn: Lần 3 & Lần 4). */
    private Long completedDepositCount;

    /** Mục tiêu số đơn cọc cần hoàn thành để gỡ cọc (mặc định 2). */
    private Integer targetCompletedCount;

    /** Số dư tiền cọc bảo lưu trong tài khoản của khách (do huỷ đơn trước khi Gara nhận). */
    private Long customerDepositBalance;

    /** Thông điệp giải thích thân thiện cho khách hàng. */
    private String message;
}

