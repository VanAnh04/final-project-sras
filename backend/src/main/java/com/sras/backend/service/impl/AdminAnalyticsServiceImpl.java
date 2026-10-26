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
