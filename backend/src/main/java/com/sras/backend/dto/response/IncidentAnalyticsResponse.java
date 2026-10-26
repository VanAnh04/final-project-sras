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
public class IncidentAnalyticsResponse {

    // 1. Tổng số sự cố ghi nhận
    private long totalIncidents;

    // 2. Phân loại theo loại phương tiện
    private VehicleBreakdown vehicleBreakdown;

    // 3. Phân loại hình thức xử lý (Sửa tại chỗ vs Kéo xe về xưởng)
    private ResolutionBreakdown resolutionBreakdown;

    // 4. Khung giờ cao điểm & Ca đêm
    private String peakHourLabel;           // Ví dụ: "17:00 - 18:00"
    private long peakHourCount;             // Số ca trong giờ cao điểm
    private double nightIncidentRate;       // Tỷ lệ ca đêm từ 22h - 6h sáng (%)

    // 5. Danh sách 24 giờ trong ngày
    private List<HourlyIncidentStat> hourlyDistribution;

    // 6. Top các loại sự cố thường gặp nhất
    private List<IssueTypeStat> topIssueTypes;

    // 7. Điểm nóng sự cố theo địa bàn / tuyến đường
    private List<HotspotStat> topHotspots;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VehicleBreakdown {
        private long carCount;
        private long motorbikeCount;
        private double carPercentage;
        private double motorbikePercentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResolutionBreakdown {
        private long onsiteCount;
        private long towCount;
        private double onsitePercentage;
        private double towPercentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HourlyIncidentStat {
        private int hour;           // 0..23
        private String label;       // "00:00", "01:00", ...
        private long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IssueTypeStat {
        private String issueCode;
        private String issueName;   // Tên tiếng Việt hiển thị
        private long count;
        private double percentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HotspotStat {
        private String address;
        private long count;
    }
}
