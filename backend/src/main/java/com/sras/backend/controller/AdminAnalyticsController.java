package com.sras.backend.controller;

import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.RescueOperationsMetricsResponse;
import com.sras.backend.service.AdminAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAnalyticsController {

    private final AdminAnalyticsService adminAnalyticsService;

    /**
     * TRỤC 1: Phân tích Vận hành, Điều phối & Chỉ số SLA Cứu hộ.
     *
     * @param range khoảng thời gian (TODAY, 7_DAYS, 30_DAYS, THIS_MONTH, CUSTOM)
     * @param from  ngày bắt đầu (khi range=CUSTOM)
     * @param to    ngày kết thúc (khi range=CUSTOM)
     * @return các chỉ số tỷ lệ thành công, thời gian tiếp cận trung bình, phễu cứu hộ và lý do hủy
     */
    @GetMapping("/operations")
    public ResponseEntity<ApiResponse<RescueOperationsMetricsResponse>> getOperationsMetrics(
            @RequestParam(defaultValue = "7_DAYS") String range,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        RescueOperationsMetricsResponse response = adminAnalyticsService.getOperationsMetrics(range, from, to);
        return ResponseEntity.ok(ApiResponse.success("Lấy số liệu phân tích vận hành & SLA thành công", response));
    }
}
