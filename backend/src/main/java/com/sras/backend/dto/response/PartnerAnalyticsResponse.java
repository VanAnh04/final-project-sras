package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * DTO phản hồi phân tích hiệu suất Đối tác Gara và Đội ngũ Kỹ thuật viên (Trục 4).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartnerAnalyticsResponse {

    // 1. Chỉ số tổng quan mạng lưới đối tác
    private long totalGarages;
    private long activeGarages;
    private long onlineGarages;
    private long totalTechnicians;
    private long activeTechnicians;
    private double networkFulfillmentRate; // % đơn hoàn thành / tổng đơn giao đối tác
    private double avgNetworkRating;       // Điểm đánh giá sao trung bình toàn mạng lưới

    // 2. Bảng xếp hạng Hiệu suất Đối tác Gara (Leaderboard)
    private List<GaragePerformanceStat> topGarages;

    // 3. Bảng xếp hạng Đội ngũ Kỹ thuật viên (Top Technicians)
    private List<TechnicianPerformanceStat> topTechnicians;

    // 4. Cơ cấu năng lực phục vụ đối tác (Ô tô, Xe máy, Cả hai)
    private List<CapabilityDistribution> capabilityBreakdown;

    // 5. Danh sách Đối tác cần lưu tâm / Cảnh báo rủi ro (Watchlist)
    private List<GarageRiskAlert> riskWatchlist;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GaragePerformanceStat {
        private Long garageId;
        private String garageName;
        private String phone;
        private String address;
        private String capability; // CAR, MOTORBIKE, BOTH
        private long totalAssigned;
        private long completedJobs;
        private long cancelledJobs;
        private double completionRate;
        private long totalGmv;
        private long platformCommission;
        private long avgArrivalTimeMinutes;
        private double avgRating;
        private int ratingCount;
        private int complaintCount;
        private boolean isOnline;
        private int rank;
        private String healthBadge; // EXCELLENT (Top), GOOD, WARNING
        private String healthBadgeLabel;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TechnicianPerformanceStat {
        private Long staffId;
        private String staffName;
        private String phone;
        private String garageName;
        private long completedJobs;
        private double avgRating;
        private int ratingCount;
        private int rank;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CapabilityDistribution {
        private String capability;
        private String label;
        private long count;
        private double percentage;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GarageRiskAlert {
        private Long garageId;
        private String garageName;
        private String reason; // "Tỷ lệ hủy cao (35%)", "Đánh giá thấp (2.8 sao)", "3 khiếu nại chưa xử lý"
        private String severity; // HIGH, MEDIUM
        private double avgRating;
        private double cancelRate;
        private int openComplaints;
    }
}
