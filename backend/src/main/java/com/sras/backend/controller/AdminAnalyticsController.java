package com.sras.backend.controller;

import com.sras.backend.dto.response.AiAnalyticsInsightResponse;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.FinancialAnalyticsResponse;
import com.sras.backend.dto.response.IncidentAnalyticsResponse;
import com.sras.backend.dto.response.RescueOperationsMetricsResponse;
import com.sras.backend.service.AdminAiAnalyticsService;
import com.sras.backend.service.AdminAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAnalyticsController {

    private final AdminAnalyticsService adminAnalyticsService;
    private final AdminAiAnalyticsService adminAiAnalyticsService;

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

    /**
     * TRỤC 1: Đề xuất & Nhận định AI cho Vận hành & SLA (Gemini AI).
     */
    @GetMapping("/operations/ai-insights")
    public ResponseEntity<ApiResponse<AiAnalyticsInsightResponse>> getOperationsAiInsights(
            @RequestParam(defaultValue = "7_DAYS") String range,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "false") boolean forceRefresh) {
        AiAnalyticsInsightResponse response = adminAiAnalyticsService.getOperationsAiInsights(range, from, to, forceRefresh);
        return ResponseEntity.ok(ApiResponse.success("Lấy đề xuất phân tích AI vận hành thành công", response));
    }

    /**
     * TRỤC 2: Phân tích Tài chính, Dòng tiền & Doanh thu Sàn.
     *
     * @param range khoảng thời gian (TODAY, 7_DAYS, 30_DAYS, THIS_MONTH, CUSTOM)
     * @param from  ngày bắt đầu (khi range=CUSTOM)
     * @param to    ngày kết thúc (khi range=CUSTOM)
     * @return các chỉ số GMV, doanh thu hoa hồng, cơ cấu phí và phương thức thanh toán
     */
    @GetMapping("/finance")
    public ResponseEntity<ApiResponse<FinancialAnalyticsResponse>> getFinancialAnalytics(
            @RequestParam(defaultValue = "7_DAYS") String range,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        FinancialAnalyticsResponse response = adminAnalyticsService.getFinancialAnalytics(range, from, to);
        return ResponseEntity.ok(ApiResponse.success("Lấy số liệu phân tích tài chính & doanh thu sàn thành công", response));
    }

    /**
     * TRỤC 2: Đề xuất & Nhận định AI cho Tài chính & Doanh thu Sàn (Gemini AI).
     */
    @GetMapping("/finance/ai-insights")
    public ResponseEntity<ApiResponse<AiAnalyticsInsightResponse>> getFinancialAiInsights(
            @RequestParam(defaultValue = "7_DAYS") String range,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "false") boolean forceRefresh) {
        AiAnalyticsInsightResponse response = adminAiAnalyticsService.getFinancialAiInsights(range, from, to, forceRefresh);
        return ResponseEntity.ok(ApiResponse.success("Lấy đề xuất phân tích AI tài chính & doanh thu thành công", response));
    }

    /**
     * TRỤC 3: Bản đồ Sự cố, Phân loại Hỏng hóc & Khung giờ vàng.
     *
     * @param range khoảng thời gian (TODAY, 7_DAYS, 30_DAYS, THIS_MONTH, CUSTOM)
     * @param from  ngày bắt đầu (khi range=CUSTOM)
     * @param to    ngày kết thúc (khi range=CUSTOM)
     * @return các chỉ số phân loại xe, top sự cố, phân bố 24 giờ và điểm nóng địa bàn
     */
    @GetMapping("/incidents")
    public ResponseEntity<ApiResponse<IncidentAnalyticsResponse>> getIncidentAnalytics(
            @RequestParam(defaultValue = "7_DAYS") String range,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        IncidentAnalyticsResponse response = adminAnalyticsService.getIncidentAnalytics(range, from, to);
        return ResponseEntity.ok(ApiResponse.success("Lấy số liệu phân tích sự cố & khung giờ thành công", response));
    }

    /**
     * TRỤC 3: Đề xuất & Nhận định AI cho Bản đồ Sự cố & Điểm nóng (Gemini AI).
     */
    @GetMapping("/incidents/ai-insights")
    public ResponseEntity<ApiResponse<AiAnalyticsInsightResponse>> getIncidentAiInsights(
            @RequestParam(defaultValue = "7_DAYS") String range,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "false") boolean forceRefresh) {
        AiAnalyticsInsightResponse response = adminAiAnalyticsService.getIncidentAiInsights(range, from, to, forceRefresh);
        return ResponseEntity.ok(ApiResponse.success("Lấy đề xuất phân tích AI sự cố & điểm nóng thành công", response));
    }

    /**
     * TRỤC 4: Hiệu suất Đối tác Gara & Đội ngũ Kỹ thuật viên.
     *
     * @param range khoảng thời gian (TODAY, 7_DAYS, 30_DAYS, THIS_MONTH, CUSTOM)
     * @param from  ngày bắt đầu (khi range=CUSTOM)
     * @param to    ngày kết thúc (khi range=CUSTOM)
     * @return bảng xếp hạng gara, top kỹ thuật viên, cơ cấu năng lực và cảnh báo rủi ro
     */
    @GetMapping("/partners")
    public ResponseEntity<ApiResponse<com.sras.backend.dto.response.PartnerAnalyticsResponse>> getPartnerAnalytics(
            @RequestParam(defaultValue = "7_DAYS") String range,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        com.sras.backend.dto.response.PartnerAnalyticsResponse response = adminAnalyticsService.getPartnerAnalytics(range, from, to);
        return ResponseEntity.ok(ApiResponse.success("Lấy số liệu phân tích hiệu suất đối tác & kỹ thuật viên thành công", response));
    }
}


