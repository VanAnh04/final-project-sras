package com.sras.backend.service.impl;

import com.sras.backend.dto.response.RescueOperationsMetricsResponse;
import com.sras.backend.dto.response.RescueOperationsMetricsResponse.*;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.service.AdminAnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAnalyticsServiceImpl implements AdminAnalyticsService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final RescueRequestRepository rescueRequestRepository;

    @Override
    public RescueOperationsMetricsResponse getOperationsMetrics(String range, String from, String to) {
        OffsetDateTime[] dateRange = resolveDateRange(range, from, to);
        OffsetDateTime fromDateTime = dateRange[0];
        OffsetDateTime toDateTime = dateRange[1];

        // 1. Chỉ số tổng quan (Total, Completed, Active, Cancelled)
        long total = 0;
        long completed = 0;
        long active = 0;
        long cancelled = 0;

        List<Object[]> summaryList = rescueRequestRepository.getOperationsCountSummary(fromDateTime, toDateTime);
        if (summaryList != null && !summaryList.isEmpty() && summaryList.get(0) != null) {
            Object[] row = summaryList.get(0);
            total = parseLong(row[0]);
            completed = parseLong(row[1]);
            active = parseLong(row[2]);
            cancelled = parseLong(row[3]);
        }

        double successRate = total > 0 ? roundDouble((completed * 100.0) / total) : 0.0;
        double cancellationRate = total > 0 ? roundDouble((cancelled * 100.0) / total) : 0.0;

        // 2. Chỉ số SLA thời gian & khoảng cách
        double avgArrivalMinutes = 0.0;
        double avgHandlingMinutes = 0.0;
        double avgDispatchDistanceKm = 0.0;

        List<Object[]> slaList = rescueRequestRepository.getOperationsSlaAverages(fromDateTime, toDateTime);
        if (slaList != null && !slaList.isEmpty() && slaList.get(0) != null) {
            Object[] row = slaList.get(0);
            avgArrivalMinutes = roundDouble(parseDouble(row[0]));
            avgHandlingMinutes = roundDouble(parseDouble(row[1]));
            avgDispatchDistanceKm = roundDouble(parseDouble(row[2]));
        }

        // 3. Phễu chuyển đổi (Rescue Funnel)
        FunnelStage funnel = FunnelStage.builder()
                .created(total)
                .accepted(0)
                .enRoute(0)
                .arrived(0)
                .completed(completed)
                .build();

        List<Object[]> funnelList = rescueRequestRepository.getOperationsFunnel(fromDateTime, toDateTime);
        if (funnelList != null && !funnelList.isEmpty() && funnelList.get(0) != null) {
            Object[] row = funnelList.get(0);
            funnel = FunnelStage.builder()
                    .created(parseLong(row[0]))
                    .accepted(parseLong(row[1]))
                    .enRoute(parseLong(row[2]))
                    .arrived(parseLong(row[3]))
                    .completed(parseLong(row[4]))
                    .build();
        }

        // 4. Phân tích hủy cuốc (Bên hủy & Top lý do)
        long cancelledByCustomer = 0;
        long cancelledByGarage = 0;
        long cancelledBySystem = 0;

        List<Object[]> byRoleList = rescueRequestRepository.getCancellationByRole(fromDateTime, toDateTime);
        if (byRoleList != null) {
            for (Object[] r : byRoleList) {
                String role = String.valueOf(r[0]);
                long count = parseLong(r[1]);
                if ("CUSTOMER".equalsIgnoreCase(role)) {
                    cancelledByCustomer = count;
                } else if ("GARAGE".equalsIgnoreCase(role)) {
                    cancelledByGarage = count;
                } else if ("SYSTEM".equalsIgnoreCase(role)) {
                    cancelledBySystem = count;
                }
            }
        }

        List<CancelReasonStat> topReasons = new ArrayList<>();
        List<Object[]> reasonList = rescueRequestRepository.getTopCancellationReasons(fromDateTime, toDateTime);
        if (reasonList != null) {
            for (Object[] r : reasonList) {
                String reason = String.valueOf(r[0]);
                long count = parseLong(r[1]);
                double pct = cancelled > 0 ? roundDouble((count * 100.0) / cancelled) : 0.0;
                topReasons.add(CancelReasonStat.builder()
                        .reason(reason)
                        .count(count)
                        .percentage(pct)
                        .build());
            }
        }

        CancellationBreakdown cancellationBreakdown = CancellationBreakdown.builder()
                .byCustomer(cancelledByCustomer)
                .byGarage(cancelledByGarage)
                .bySystem(cancelledBySystem)
                .topReasons(topReasons)
                .build();

        // 5. Xu hướng theo ngày
        List<DailyOperationsTrend> dailyTrends = new ArrayList<>();
        List<Object[]> trendList = rescueRequestRepository.getDailyOperationsTrends(fromDateTime, toDateTime);
        if (trendList != null) {
            for (Object[] r : trendList) {
                dailyTrends.add(DailyOperationsTrend.builder()
                        .date(String.valueOf(r[0]))
                        .total(parseLong(r[1]))
                        .completed(parseLong(r[2]))
                        .cancelled(parseLong(r[3]))
                        .build());
            }
        }

        return RescueOperationsMetricsResponse.builder()
                .totalRequests(total)
                .completedRequests(completed)
                .activeRequests(active)
                .cancelledRequests(cancelled)
                .successRate(successRate)
                .cancellationRate(cancellationRate)
                .avgArrivalMinutes(avgArrivalMinutes)
                .avgHandlingMinutes(avgHandlingMinutes)
                .avgDispatchDistanceKm(avgDispatchDistanceKm)
                .funnel(funnel)
                .cancellationBreakdown(cancellationBreakdown)
                .dailyTrends(dailyTrends)
                .build();
    }

    @Override
    public com.sras.backend.dto.response.FinancialAnalyticsResponse getFinancialAnalytics(String range, String from, String to) {
        OffsetDateTime[] dateRange = resolveDateRange(range, from, to);
        OffsetDateTime fromDateTime = dateRange[0];
        OffsetDateTime toDateTime = dateRange[1];

        // 1. Chỉ số tổng quan (Total GMV, Commission, Completed count)
        long totalGmv = 0;
        long totalCommission = 0;
        long completedCount = 0;

        List<Object[]> summaryList = rescueRequestRepository.getFinancialSummary(fromDateTime, toDateTime);
        if (summaryList != null && !summaryList.isEmpty() && summaryList.get(0) != null) {
            Object[] row = summaryList.get(0);
            totalGmv = parseLong(row[0]);
            totalCommission = parseLong(row[1]);
            completedCount = parseLong(row[2]);
        }

        long garagePayout = Math.max(0, totalGmv - totalCommission);
        long avgOrderValue = completedCount > 0 ? (totalGmv / completedCount) : 0L;
        double effectiveCommissionRate = totalGmv > 0 ? roundDouble((totalCommission * 100.0) / totalGmv) : 0.0;

        // 2. Cơ cấu các loại phí (Fee Breakdown)
        long rescueFee = 0;
        long towingFee = 0;
        long serviceFee = 0;

        List<Object[]> feeList = rescueRequestRepository.getFinancialFeeBreakdown(fromDateTime, toDateTime);
        if (feeList != null && !feeList.isEmpty() && feeList.get(0) != null) {
            Object[] row = feeList.get(0);
            rescueFee = parseLong(row[0]);
            towingFee = parseLong(row[1]);
            serviceFee = parseLong(row[2]);
        }

        long totalFeeSum = rescueFee + towingFee + serviceFee;
        double rescueFeePct = totalFeeSum > 0 ? roundDouble((rescueFee * 100.0) / totalFeeSum) : 0.0;
        double towingFeePct = totalFeeSum > 0 ? roundDouble((towingFee * 100.0) / totalFeeSum) : 0.0;
        double serviceFeePct = totalFeeSum > 0 ? roundDouble((serviceFee * 100.0) / totalFeeSum) : 0.0;

        com.sras.backend.dto.response.FinancialAnalyticsResponse.FeeBreakdown feeBreakdown = 
                com.sras.backend.dto.response.FinancialAnalyticsResponse.FeeBreakdown.builder()
                        .rescueFee(rescueFee)
                        .towingFee(towingFee)
                        .serviceFee(serviceFee)
                        .rescueFeePct(rescueFeePct)
                        .towingFeePct(towingFeePct)
                        .serviceFeePct(serviceFeePct)
                        .build();

        // 3. Cơ cấu phương thức thanh toán
        long bankTransferAmount = 0;
        long bankTransferCount = 0;
        long cashAmount = 0;
        long cashCount = 0;

        List<Object[]> paymentList = rescueRequestRepository.getFinancialPaymentMethodBreakdown(fromDateTime, toDateTime);
        if (paymentList != null) {
            for (Object[] r : paymentList) {
                String method = String.valueOf(r[0]);
                long count = parseLong(r[1]);
                long amount = parseLong(r[2]);
                if ("BANK_TRANSFER".equalsIgnoreCase(method)) {
                    bankTransferCount = count;
                    bankTransferAmount = amount;
                } else {
                    cashCount = count;
                    cashAmount = amount;
                }
            }
        }

        long totalPaymentsCount = bankTransferCount + cashCount;
        double cashlessRate = totalPaymentsCount > 0 ? roundDouble((bankTransferCount * 100.0) / totalPaymentsCount) : 0.0;

        com.sras.backend.dto.response.FinancialAnalyticsResponse.PaymentMethodBreakdown paymentBreakdown = 
                com.sras.backend.dto.response.FinancialAnalyticsResponse.PaymentMethodBreakdown.builder()
                        .bankTransferAmount(bankTransferAmount)
                        .bankTransferCount(bankTransferCount)
                        .cashAmount(cashAmount)
                        .cashCount(cashCount)
                        .cashlessRate(cashlessRate)
                        .build();

        // 4. Xu hướng doanh thu theo ngày
        List<com.sras.backend.dto.response.FinancialAnalyticsResponse.DailyFinancialTrend> dailyTrends = new ArrayList<>();
        List<Object[]> trendList = rescueRequestRepository.getDailyFinancialTrends(fromDateTime, toDateTime);
        if (trendList != null) {
            for (Object[] r : trendList) {
                dailyTrends.add(com.sras.backend.dto.response.FinancialAnalyticsResponse.DailyFinancialTrend.builder()
                        .date(String.valueOf(r[0]))
                        .gmv(parseLong(r[1]))
                        .commission(parseLong(r[2]))
                        .orderCount(parseLong(r[3]))
                        .build());
            }
        }

        return com.sras.backend.dto.response.FinancialAnalyticsResponse.builder()
                .totalGmv(totalGmv)
                .totalCommission(totalCommission)
                .garagePayout(garagePayout)
                .avgOrderValue(avgOrderValue)
                .effectiveCommissionRate(effectiveCommissionRate)
                .completedOrderCount(completedCount)
                .feeBreakdown(feeBreakdown)
                .paymentBreakdown(paymentBreakdown)
                .dailyTrends(dailyTrends)
                .build();
    }

    @Override
    public com.sras.backend.dto.response.IncidentAnalyticsResponse getIncidentAnalytics(String range, String from, String to) {
        OffsetDateTime[] dateRange = resolveDateRange(range, from, to);
        OffsetDateTime fromDateTime = dateRange[0];
        OffsetDateTime toDateTime = dateRange[1];

        // 1. Phân loại theo loại phương tiện (Car vs Motorbike)
        long carCount = 0;
        long motorbikeCount = 0;
        List<Object[]> vList = rescueRequestRepository.getVehicleBreakdown(fromDateTime, toDateTime);
        if (vList != null) {
            for (Object[] r : vList) {
                String type = String.valueOf(r[0]);
                long count = parseLong(r[1]);
                if ("CAR".equalsIgnoreCase(type)) {
                    carCount = count;
                } else {
                    motorbikeCount = count;
                }
            }
        }
        long totalVehicles = carCount + motorbikeCount;
        double carPct = totalVehicles > 0 ? roundDouble((carCount * 100.0) / totalVehicles) : 0.0;
        double motorbikePct = totalVehicles > 0 ? roundDouble((motorbikeCount * 100.0) / totalVehicles) : 0.0;

        com.sras.backend.dto.response.IncidentAnalyticsResponse.VehicleBreakdown vehicleBreakdown =
                com.sras.backend.dto.response.IncidentAnalyticsResponse.VehicleBreakdown.builder()
                        .carCount(carCount)
                        .motorbikeCount(motorbikeCount)
                        .carPercentage(carPct)
                        .motorbikePercentage(motorbikePct)
                        .build();

        // 2. Phân loại hình thức xử lý (Onsite vs Tow)
        long onsiteCount = 0;
        long towCount = 0;
        List<Object[]> qList = rescueRequestRepository.getResolutionBreakdown(fromDateTime, toDateTime);
        if (qList != null) {
            for (Object[] r : qList) {
                String type = String.valueOf(r[0]);
                long count = parseLong(r[1]);
                if ("TOW".equalsIgnoreCase(type) || "TOWING".equalsIgnoreCase(type) || "TOW_TO_GARAGE".equalsIgnoreCase(type)) {
                    towCount += count;
                } else {
                    onsiteCount += count;
                }
            }
        }
        long totalResolutions = onsiteCount + towCount;
        double onsitePct = totalResolutions > 0 ? roundDouble((onsiteCount * 100.0) / totalResolutions) : 0.0;
        double towPct = totalResolutions > 0 ? roundDouble((towCount * 100.0) / totalResolutions) : 0.0;

        com.sras.backend.dto.response.IncidentAnalyticsResponse.ResolutionBreakdown resolutionBreakdown =
                com.sras.backend.dto.response.IncidentAnalyticsResponse.ResolutionBreakdown.builder()
                        .onsiteCount(onsiteCount)
                        .towCount(towCount)
                        .onsitePercentage(onsitePct)
                        .towPercentage(towPct)
                        .build();

        // 3. Phân bố 24 giờ & Giờ cao điểm
        long[] hourlyCounts = new long[24];
        List<Object[]> hList = rescueRequestRepository.getHourlyDistribution(fromDateTime, toDateTime);
        if (hList != null) {
            for (Object[] r : hList) {
                int hour = (int) parseLong(r[0]);
                long count = parseLong(r[1]);
                if (hour >= 0 && hour < 24) {
                    hourlyCounts[hour] = count;
                }
            }
        }

        List<com.sras.backend.dto.response.IncidentAnalyticsResponse.HourlyIncidentStat> hourlyDistribution = new ArrayList<>();
        int peakHour = 0;
        long maxCountInHour = 0;
        long nightIncidentCount = 0;
        long totalHourIncidents = 0;

        for (int h = 0; h < 24; h++) {
            long count = hourlyCounts[h];
            totalHourIncidents += count;
            if (count > maxCountInHour) {
                maxCountInHour = count;
                peakHour = h;
            }
            // Ca đêm: 22h -> 06h
            if (h >= 22 || h < 6) {
                nightIncidentCount += count;
            }

            hourlyDistribution.add(com.sras.backend.dto.response.IncidentAnalyticsResponse.HourlyIncidentStat.builder()
                    .hour(h)
                    .label(String.format("%02d:00", h))
                    .count(count)
                    .build());
        }

        String peakHourLabel = String.format("%02d:00 - %02d:00", peakHour, (peakHour + 1) % 24);
        double nightIncidentRate = totalHourIncidents > 0 ? roundDouble((nightIncidentCount * 100.0) / totalHourIncidents) : 0.0;

        // 4. Top loại sự cố
        List<com.sras.backend.dto.response.IncidentAnalyticsResponse.IssueTypeStat> topIssueTypes = new ArrayList<>();
        List<Object[]> issueList = rescueRequestRepository.getTopIssueTypes(fromDateTime, toDateTime);
        if (issueList != null) {
            for (Object[] r : issueList) {
                String code = String.valueOf(r[0]);
                long count = parseLong(r[1]);
                double pct = totalHourIncidents > 0 ? roundDouble((count * 100.0) / totalHourIncidents) : 0.0;
                topIssueTypes.add(com.sras.backend.dto.response.IncidentAnalyticsResponse.IssueTypeStat.builder()
                        .issueCode(code)
                        .issueName(translateIssueName(code))
                        .count(count)
                        .percentage(pct)
                        .build());
            }
        }

        // 5. Top điểm nóng địa bàn (Hotspots)
        List<com.sras.backend.dto.response.IncidentAnalyticsResponse.HotspotStat> topHotspots = new ArrayList<>();
        List<Object[]> spotList = rescueRequestRepository.getTopIncidentHotspots(fromDateTime, toDateTime);
        if (spotList != null) {
            for (Object[] r : spotList) {
                topHotspots.add(com.sras.backend.dto.response.IncidentAnalyticsResponse.HotspotStat.builder()
                        .address(String.valueOf(r[0]))
                        .count(parseLong(r[1]))
                        .build());
            }
        }

        return com.sras.backend.dto.response.IncidentAnalyticsResponse.builder()
                .totalIncidents(totalHourIncidents)
                .vehicleBreakdown(vehicleBreakdown)
                .resolutionBreakdown(resolutionBreakdown)
                .peakHourLabel(peakHourLabel)
                .peakHourCount(maxCountInHour)
                .nightIncidentRate(nightIncidentRate)
                .hourlyDistribution(hourlyDistribution)
                .topIssueTypes(topIssueTypes)
                .topHotspots(topHotspots)
                .build();
    }

    private String translateIssueName(String code) {
        if (code == null) return "Sự cố khác";
        return switch (code.toUpperCase().trim()) {
            case "FLAT_TIRE" -> "Thủng / Nổ lốp xe";
            case "DEAD_BATTERY" -> "Hết bình Ắc quy";
            case "OUT_OF_FUEL" -> "Hết nhiên liệu / Xăng";
            case "ENGINE_BREAKDOWN" -> "Hỏng động cơ / Chết máy";
            case "ACCIDENT" -> "Tai nạn / Va chạm giao thông";
            case "OVERHEAT" -> "Nóng máy / Rò rỉ nước làm mát";
            case "LOCKOUT" -> "Quên chìa khóa trong xe";
            case "BRAKE_ISSUE" -> "Hỏng phanh / Thắng xe";
            default -> "Sự cố khác (" + code + ")";
        };
    }

    private OffsetDateTime[] resolveDateRange(String range, String fromStr, String toStr) {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        OffsetDateTime fromDateTime;
        OffsetDateTime toDateTime = today.atTime(LocalTime.MAX).atZone(VIETNAM_ZONE).toOffsetDateTime();

        if ("CUSTOM".equalsIgnoreCase(range) && fromStr != null && toStr != null) {
            try {
                LocalDate f = LocalDate.parse(fromStr);
                LocalDate t = LocalDate.parse(toStr);
                fromDateTime = f.atStartOfDay(VIETNAM_ZONE).toOffsetDateTime();
                toDateTime = t.atTime(LocalTime.MAX).atZone(VIETNAM_ZONE).toOffsetDateTime();
                return new OffsetDateTime[]{fromDateTime, toDateTime};
            } catch (DateTimeParseException e) {
                log.warn("Invalid custom date format: from={}, to={}, fallback to 7_DAYS", fromStr, toStr);
            }
        }

        if ("TODAY".equalsIgnoreCase(range)) {
            fromDateTime = today.atStartOfDay(VIETNAM_ZONE).toOffsetDateTime();
        } else if ("30_DAYS".equalsIgnoreCase(range)) {
            fromDateTime = today.minusDays(29).atStartOfDay(VIETNAM_ZONE).toOffsetDateTime();
        } else if ("THIS_MONTH".equalsIgnoreCase(range)) {
            fromDateTime = today.withDayOfMonth(1).atStartOfDay(VIETNAM_ZONE).toOffsetDateTime();
        } else {
            // Mặc định: 7_DAYS
            fromDateTime = today.minusDays(6).atStartOfDay(VIETNAM_ZONE).toOffsetDateTime();
        }

        return new OffsetDateTime[]{fromDateTime, toDateTime};
    }

    private long parseLong(Object obj) {
        if (obj == null) return 0L;
        if (obj instanceof Number) return ((Number) obj).longValue();
        try {
            return Long.parseLong(obj.toString());
        } catch (Exception e) {
            return 0L;
        }
    }

    private double parseDouble(Object obj) {
        if (obj == null) return 0.0;
        if (obj instanceof Number) return ((Number) obj).doubleValue();
        try {
            return Double.parseDouble(obj.toString());
        } catch (Exception e) {
            return 0.0;
        }
    }

    private double roundDouble(double val) {
        return Math.round(val * 10.0) / 10.0;
    }
}
