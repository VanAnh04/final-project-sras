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
}
