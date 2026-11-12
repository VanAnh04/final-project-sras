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
    private final com.sras.backend.repository.GarageRepository garageRepository;
    private final com.sras.backend.repository.GarageStaffRepository garageStaffRepository;

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

        // 6. Tọa độ các điểm sự cố hiển thị bản đồ trực quan
        List<com.sras.backend.dto.response.IncidentAnalyticsResponse.IncidentMapPoint> mapPoints = new ArrayList<>();
        List<Object[]> pointList = rescueRequestRepository.getIncidentMapPoints(fromDateTime, toDateTime);
        if (pointList != null) {
            for (Object[] r : pointList) {
                Long id = parseLong(r[0]);
                String code = String.valueOf(r[1]);
                Double lat = parseDouble(r[2]);
                Double lng = parseDouble(r[3]);
                String address = String.valueOf(r[4]);
                String issueCode = String.valueOf(r[5]);
                String vType = String.valueOf(r[6]);
                String qType = String.valueOf(r[7]);
                String status = String.valueOf(r[8]);
                String createdAtText = String.valueOf(r[9]);

                String severity = "LOW";
                String severityLabel = "Mức độ Nhẹ";

                String upperIssue = issueCode != null ? issueCode.toUpperCase() : "";
                String upperQuote = qType != null ? qType.toUpperCase() : "";

                if (upperIssue.contains("ACCIDENT") || upperIssue.contains("ENGINE") || upperQuote.contains("TOW")) {
                    severity = "HIGH";
                    severityLabel = "Mức độ Cao (Nghiêm trọng)";
                } else if (upperIssue.contains("TIRE") || upperIssue.contains("BATTERY") || upperIssue.contains("OVERHEAT")) {
                    severity = "MEDIUM";
                    severityLabel = "Mức độ Trung bình";
                }

                mapPoints.add(com.sras.backend.dto.response.IncidentAnalyticsResponse.IncidentMapPoint.builder()
                        .id(id)
                        .code(code)
                        .lat(lat)
                        .lng(lng)
                        .address(address)
                        .issueCode(issueCode)
                        .issueName(translateIssueName(issueCode))
                        .vehicleType(vType)
                        .quoteType(qType)
                        .status(status)
                        .createdAtText(createdAtText)
                        .severity(severity)
                        .severityLabel(severityLabel)
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
                .mapPoints(mapPoints)
                .build();
    }

    @Override
    public com.sras.backend.dto.response.PartnerAnalyticsResponse getPartnerAnalytics(String range, String from, String to) {
        OffsetDateTime[] dateRange = resolveDateRange(range, from, to);
        OffsetDateTime fromDateTime = dateRange[0];
        OffsetDateTime toDateTime = dateRange[1];

        // 1. Số liệu tổng quan mạng lưới
        long totalGarages = garageRepository.count();
        long activeGarages = garageRepository.countByStatus(com.sras.backend.entity.enums.GarageStatus.APPROVED);
        long onlineGarages = garageRepository.findByStatusAndIsOnlineTrueAndIsDeletedFalse(com.sras.backend.entity.enums.GarageStatus.APPROVED).size();
        long totalTechnicians = garageStaffRepository.count();
        long activeTechnicians = garageStaffRepository.findStaffForAdmin(null, null, true, org.springframework.data.domain.Pageable.unpaged()).getTotalElements();

        // 2. Thống kê khiếu nại theo gara
        java.util.Map<Long, Integer> complaintMap = new java.util.HashMap<>();
        List<Object[]> complaintList = rescueRequestRepository.getGarageComplaintCounts(fromDateTime, toDateTime);
        if (complaintList != null) {
            for (Object[] r : complaintList) {
                Long gId = parseLong(r[0]);
                int cCount = (int) parseLong(r[1]);
                complaintMap.put(gId, cCount);
            }
        }

        // 3. Bảng xếp hạng Gara (Leaderboard)
        List<com.sras.backend.dto.response.PartnerAnalyticsResponse.GaragePerformanceStat> topGarages = new ArrayList<>();
        List<com.sras.backend.dto.response.PartnerAnalyticsResponse.GarageRiskAlert> riskWatchlist = new ArrayList<>();

        List<Object[]> garageRows = rescueRequestRepository.getGaragePerformanceLeaderboard(fromDateTime, toDateTime);
        long totalAssignedAll = 0;
        long totalCompletedAll = 0;
        double sumRating = 0.0;
        int ratingCountTotal = 0;

        if (garageRows != null) {
            int rank = 1;
            for (Object[] r : garageRows) {
                Long gId = parseLong(r[0]);
                String name = String.valueOf(r[1]);
                String phone = String.valueOf(r[2]);
                String addr = String.valueOf(r[3]);
                String cap = String.valueOf(r[4]);
                double avgRating = roundDouble(parseDouble(r[5]));
                int ratingCount = (int) parseLong(r[6]);
                boolean isOnline = Boolean.parseBoolean(String.valueOf(r[7]));
                long assigned = parseLong(r[8]);
                long completed = parseLong(r[9]);
                long cancelled = parseLong(r[10]);
                long gmv = parseLong(r[11]);
                long commission = parseLong(r[12]);
                double rawArrival = parseDouble(r[13]);
                long arrivalMin = rawArrival > 0 ? Math.max(1L, Math.round(rawArrival)) : 0L;
                long cancelledByGarage = r.length > 14 ? parseLong(r[14]) : 0L;
                long cancelledByCustomer = r.length > 15 ? parseLong(r[15]) : 0L;
                int complaintCount = complaintMap.getOrDefault(gId, 0);

                totalAssignedAll += assigned;
                totalCompletedAll += completed;
                if (ratingCount > 0) {
                    sumRating += (avgRating * ratingCount);
                    ratingCountTotal += ratingCount;
                }

                double completionRate = assigned > 0 ? roundDouble((completed * 100.0) / assigned) : 0.0;
                double cancelRate = assigned > 0 ? roundDouble((cancelled * 100.0) / assigned) : 0.0;
                double garageCancelRate = assigned > 0 ? roundDouble((cancelledByGarage * 100.0) / assigned) : 0.0;
                double customerCancelRate = assigned > 0 ? roundDouble((cancelledByCustomer * 100.0) / assigned) : 0.0;

                String healthBadge = "GOOD";
                String healthLabel = "Tốt";

                if (assigned == 0) {
                    healthBadge = "INACTIVE";
                    healthLabel = "Chưa có ca";
                } else if (rank <= 3 && completed >= 3 && avgRating >= 4.5 && completionRate >= 80.0) {
                    healthBadge = "EXCELLENT";
                    healthLabel = "🏆 Xuất sắc (Top " + rank + ")";
                } else if (complaintCount >= 2 || (assigned >= 3 && completionRate < 50.0) || (ratingCount >= 2 && avgRating < 3.5) || garageCancelRate >= 20.0) {
                    healthBadge = "WARNING";
                    healthLabel = "⚠️ Cần cải thiện";

                    String reason = "Hiệu suất SLA thấp";
                    if (garageCancelRate >= 20.0 && cancelledByGarage > 0) {
                        reason = "Gara tự hủy " + cancelledByGarage + " ca (" + garageCancelRate + "%)";
                    } else if (complaintCount >= 2) {
                        reason = complaintCount + " khiếu nại phát sinh";
                    } else if (avgRating < 3.5) {
                        reason = "Đánh giá thấp (" + avgRating + "⭐)";
                    } else if (cancelRate > 30.0) {
                        reason = "Tỷ lệ hủy cao (" + cancelRate + "%)";
                    }

                    riskWatchlist.add(com.sras.backend.dto.response.PartnerAnalyticsResponse.GarageRiskAlert.builder()
                            .garageId(gId)
                            .garageName(name)
                            .reason(reason)
                            .severity(complaintCount >= 2 || avgRating < 3.0 || garageCancelRate >= 30.0 ? "HIGH" : "MEDIUM")
                            .avgRating(avgRating)
                            .cancelRate(cancelRate)
                            .openComplaints(complaintCount)
                            .build());
                }

                topGarages.add(com.sras.backend.dto.response.PartnerAnalyticsResponse.GaragePerformanceStat.builder()
                        .garageId(gId)
                        .garageName(name)
                        .phone(phone)
                        .address(addr)
                        .capability(cap)
                        .totalAssigned(assigned)
                        .completedJobs(completed)
                        .cancelledJobs(cancelled)
                        .cancelledByGarage(cancelledByGarage)
                        .cancelledByCustomer(cancelledByCustomer)
                        .garageCancelRate(garageCancelRate)
                        .customerCancelRate(customerCancelRate)
                        .completionRate(completionRate)
                        .totalGmv(gmv)
                        .platformCommission(commission)
                        .avgArrivalTimeMinutes(arrivalMin)
                        .avgRating(avgRating)
                        .ratingCount(ratingCount)
                        .complaintCount(complaintCount)
                        .isOnline(isOnline)
                        .rank(rank++)
                        .healthBadge(healthBadge)
                        .healthBadgeLabel(healthLabel)
                        .build());
            }
        }

        // 4. Bảng xếp hạng Kỹ thuật viên
        List<com.sras.backend.dto.response.PartnerAnalyticsResponse.TechnicianPerformanceStat> topTechnicians = new ArrayList<>();
        List<Object[]> techRows = rescueRequestRepository.getTechnicianLeaderboard(fromDateTime, toDateTime);
        if (techRows != null) {
            int techRank = 1;
            for (Object[] r : techRows) {
                topTechnicians.add(com.sras.backend.dto.response.PartnerAnalyticsResponse.TechnicianPerformanceStat.builder()
                        .staffId(parseLong(r[0]))
                        .staffName(String.valueOf(r[1]))
                        .phone(String.valueOf(r[2]))
                        .garageName(String.valueOf(r[3]))
                        .completedJobs(parseLong(r[4]))
                        .avgRating(roundDouble(parseDouble(r[5])))
                        .ratingCount((int) parseLong(r[6]))
                        .rank(techRank++)
                        .build());
            }
        }

        // 5. Cơ cấu năng lực phục vụ
        List<com.sras.backend.dto.response.PartnerAnalyticsResponse.CapabilityDistribution> capabilityBreakdown = new ArrayList<>();
        List<Object[]> capRows = rescueRequestRepository.getGarageCapabilityBreakdown();
        java.util.Map<String, Long> capMap = new java.util.LinkedHashMap<>();
        capMap.put("BOTH", 0L);
        capMap.put("CAR", 0L);
        capMap.put("MOTORBIKE", 0L);

        long totalCapCount = 0;
        if (capRows != null) {
            for (Object[] r : capRows) {
                String capKey = String.valueOf(r[0]).toUpperCase();
                long count = parseLong(r[1]);
                capMap.put(capKey, count);
                totalCapCount += count;
            }
        }

        for (java.util.Map.Entry<String, Long> entry : capMap.entrySet()) {
            String cap = entry.getKey();
            long count = entry.getValue();
            double pct = totalCapCount > 0 ? roundDouble((count * 100.0) / totalCapCount) : 0.0;
            String capLabel = switch (cap) {
                case "CAR" -> "Chỉ Ô tô";
                case "MOTORBIKE" -> "Chỉ Xe máy";
                default -> "Cả Ô tô & Xe máy";
            };
            capabilityBreakdown.add(com.sras.backend.dto.response.PartnerAnalyticsResponse.CapabilityDistribution.builder()
                    .capability(cap)
                    .label(capLabel)
                    .count(count)
                    .percentage(pct)
                    .build());
        }

        double networkFulfillmentRate = totalAssignedAll > 0 ? roundDouble((totalCompletedAll * 100.0) / totalAssignedAll) : 100.0;
        double avgNetworkRating = ratingCountTotal > 0 ? roundDouble(sumRating / ratingCountTotal) : 4.8;

        return com.sras.backend.dto.response.PartnerAnalyticsResponse.builder()
                .totalGarages(totalGarages)
                .activeGarages(activeGarages)
                .onlineGarages(onlineGarages)
                .totalTechnicians(totalTechnicians)
                .activeTechnicians(activeTechnicians)
                .networkFulfillmentRate(networkFulfillmentRate)
                .avgNetworkRating(avgNetworkRating)
                .topGarages(topGarages)
                .topTechnicians(topTechnicians)
                .capabilityBreakdown(capabilityBreakdown)
                .riskWatchlist(riskWatchlist)
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
