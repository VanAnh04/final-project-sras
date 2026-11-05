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
    private List<InsightItem> bottlenecks;      // Điểm nghẽn cần chú ý
    private List<AiActionRecommendation> recommendations; // Danh sách đề xuất hành động

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

