package com.sras.backend.service;

import com.sras.backend.dto.response.RescueOperationsMetricsResponse;

public interface AdminAnalyticsService {

    /**
     * Lấy các chỉ số phân tích vận hành và SLA cứu hộ (Trục 1).
     *
     * @param range khoảng thời gian (TODAY, 7_DAYS, 30_DAYS, THIS_MONTH, CUSTOM)
     * @param from  ngày bắt đầu (YYYY-MM-DD) khi range=CUSTOM
     * @param to    ngày kết thúc (YYYY-MM-DD) khi range=CUSTOM
     * @return các chỉ số tổng quan, SLA thời gian, phễu cứu hộ, lý do hủy và xu hướng theo ngày
     */
    RescueOperationsMetricsResponse getOperationsMetrics(String range, String from, String to);

    /**
     * Lấy các chỉ số phân tích tài chính, GMV và doanh thu hoa hồng sàn (Trục 2).
     *
     * @param range khoảng thời gian (TODAY, 7_DAYS, 30_DAYS, THIS_MONTH, CUSTOM)
     * @param from  ngày bắt đầu (YYYY-MM-DD) khi range=CUSTOM
     * @param to    ngày kết thúc (YYYY-MM-DD) khi range=CUSTOM
     * @return các chỉ số GMV, hoa hồng, cơ cấu phí, phương thức thanh toán và xu hướng doanh thu
     */
    com.sras.backend.dto.response.FinancialAnalyticsResponse getFinancialAnalytics(String range, String from, String to);

    /**
     * Lấy các chỉ số phân tích sự cố, phân loại xe và khung giờ cao điểm (Trục 3).
     *
     * @param range khoảng thời gian (TODAY, 7_DAYS, 30_DAYS, THIS_MONTH, CUSTOM)
     * @param from  ngày bắt đầu (YYYY-MM-DD) khi range=CUSTOM
     * @param to    ngày kết thúc (YYYY-MM-DD) khi range=CUSTOM
     * @return các chỉ số phân loại xe, top sự cố, phân bố 24 giờ và điểm nóng địa bàn
     */
    com.sras.backend.dto.response.IncidentAnalyticsResponse getIncidentAnalytics(String range, String from, String to);
}
