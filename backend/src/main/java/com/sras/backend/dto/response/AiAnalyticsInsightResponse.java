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
public class AiAnalyticsInsightResponse {

    private String pillar;                 // "OPERATIONS", "FINANCE", "INCIDENTS", "PARTNERS"
    private String timeRange;              // "7_DAYS", "TODAY", etc.
    private String generatedAt;            // ISO String
    private String executiveSummary;       // Tóm tắt điều hành ngắn gọn của AI
    private String overallHealthStatus;    // "EXCELLENT", "STABLE", "WARNING", "CRITICAL"
    private double healthScore;            // Thang điểm 0 - 100
    private boolean fromCache;             // true nếu lấy từ bộ nhớ đệm

    private List<InsightItem> highlights;       // Điểm sáng vận hành
    private List<InsightItem> bottlenecks;      // Vấn đề cần chú ý
    private List<AiActionRecommendation> recommendations; // Danh sách đề xuất hành động
    private List<GarageActionAlert> garageActionAlerts;       // Danh sách Gara có vấn đề vận hành cần gửi cảnh báo
    private List<GarageFinancialAlert> garageFinancialAlerts; // Danh sách Gara có vấn đề tài chính/ví cần gửi cảnh báo

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GarageFinancialAlert {
        private Long garageId;
        private String garageName;
        private String phone;
        private String address;
        private Long creditBalance;          // Số dư ví tín dụng hiện tại
        private Long cashBalance;            // Số dư ví tiền mặt
        private Long debtAmount;              // Tiền nợ sàn nếu creditBalance < 0
        private String issueType;             // "DEBT", "ZERO_BALANCE", "LOW_BALANCE"
        private String issueSummary;          // "Đang nợ tiền sàn 150.000 đ"
        private String aiDraftNotificationTitle; // Tiêu đề soạn sẵn
        private String aiDraftNotificationBody;  // Nội dung soạn sẵn
        private boolean notificationSent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GarageActionAlert {
        private Long garageId;
        private String garageName;
        private String phone;
        private String address;
        private String issueType;             // "HIGH_CANCELLATION", "LATE_ARRIVAL", "BOTH"
        private String issueSummary;          // "Tỷ lệ hủy 60% (3/5 ca), thời gian đến 28 phút"
        private double cancelRate;            // %
        private long cancelledJobs;
        private long cancelledByGarage;       // Số ca do Gara tự huỷ hoặc từ chối
        private long cancelledByCustomer;     // Số ca do Khách huỷ
        private double garageCancelRate;      // % do Gara huỷ
        private double customerCancelRate;    // % do Khách huỷ
        private long avgArrivalMinutes;
        private String aiDraftNotificationTitle; // Tiêu đề AI soạn sẵn
        private String aiDraftNotificationBody;  // Nội dung AI soạn sẵn
        private boolean notificationSent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InsightItem {
        private String title;
        private String description;
        private String metric;                  // ví dụ: "72.5%", "11 phút", "3 ca"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiActionRecommendation {
        private String id;                     // REC-OP-01
        private String title;                  // Tiêu đề hành động
        private String priority;               // "URGENT", "OPTIMIZATION", "STRATEGIC"
        private String category;               // "DISPATCH", "SLA_SPEED", "CANCELLATION", "COVERAGE"
        private String problemStatement;       // Vấn đề phát hiện
        private String proposedAction;         // Hành động đề xuất chi tiết
        private String expectedImpact;         // Tác động kỳ vọng
    }
}

