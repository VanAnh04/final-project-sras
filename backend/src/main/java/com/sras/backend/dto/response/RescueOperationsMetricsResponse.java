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
public class RescueOperationsMetricsResponse {

    // 1. Chỉ số tổng quan
    private long totalRequests;
    private long completedRequests;
    private long activeRequests;
    private long cancelledRequests;
    private double successRate;        // %
    private double cancellationRate;   // %

    // 2. Chỉ số SLA thời gian & khoảng cách
    private double avgArrivalMinutes;       // Thời gian thợ di chuyển tới hiện trường (phút)
    private double avgHandlingMinutes;      // Thời gian xử lý cứu hộ tại chỗ/kéo xe (phút)
    private double avgDispatchDistanceKm;   // Khoảng cách điều phối trung bình (km)

    // 3. Phễu chuyển đổi (Rescue Funnel)
    private FunnelStage funnel;

    // 4. Phân tích hủy cuốc
    private CancellationBreakdown cancellationBreakdown;

    // 5. Xu hướng theo ngày
    private List<DailyOperationsTrend> dailyTrends;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FunnelStage {
        private long created;
        private long accepted;
        private long enRoute;
        private long arrived;
        private long completed;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CancellationBreakdown {
        private long byCustomer;
        private long byGarage;
        private long bySystem;
        private List<CancelReasonStat> topReasons;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CancelReasonStat {
        private String reason;
        private long count;
        private double percentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyOperationsTrend {
        private String date;        // YYYY-MM-DD
        private long total;
        private long completed;
        private long cancelled;
    }
}
