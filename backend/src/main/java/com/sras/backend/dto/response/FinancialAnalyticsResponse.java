package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialAnalyticsResponse {

    // 1. Chỉ số tài chính tổng quan
    private long totalGmv;                  // Tổng giá trị giao dịch cứu hộ (Gross Merchandise Value)
    private long totalCommission;           // Doanh thu hoa hồng sàn SRAS thực thu
    private long garagePayout;              // Doanh thu chia sẻ về các Gara đối tác
    private long avgOrderValue;             // Giá trị trung bình mỗi ca cứu hộ (AOV)
    private double effectiveCommissionRate; // Tỷ lệ hoa hồng thực tế trung bình (%)
    private long completedOrderCount;       // Số đơn hoàn thành có doanh thu

    // 2. Cơ cấu các loại phí trong ca cứu hộ
    private FeeBreakdown feeBreakdown;

    // 3. Cơ cấu phương thức thanh toán
    private PaymentMethodBreakdown paymentBreakdown;

    // 4. Xu hướng doanh thu theo ngày
    private List<DailyFinancialTrend> dailyTrends;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeeBreakdown {
        private long rescueFee;     // Phí tiếp cận / cứu hộ cơ bản
        private long towingFee;     // Phí cẩu kéo xe về gara
        private long serviceFee;    // Phí sửa chữa / thay thế phụ tùng tại chỗ
        private double rescueFeePct;
        private double towingFeePct;
        private double serviceFeePct;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentMethodBreakdown {
        private long bankTransferAmount;
        private long bankTransferCount;
        private long cashAmount;
        private long cashCount;
        private double cashlessRate; // Tỷ lệ không dùng tiền mặt (%)
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyFinancialTrend {
        private String date;        // YYYY-MM-DD
        private long gmv;           // Tổng giá trị giao dịch trong ngày
        private long commission;    // Hoa hồng sàn trong ngày
        private long orderCount;    // Số lượng đơn thành công
    }
}
