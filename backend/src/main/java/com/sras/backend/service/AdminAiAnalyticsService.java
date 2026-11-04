package com.sras.backend.service;

import com.sras.backend.dto.response.AiAnalyticsInsightResponse;

public interface AdminAiAnalyticsService {

    /**
     * Sinh đề xuất và phân tích AI cho Trục 1: Vận hành, Điều phối & SLA Cứu hộ.
     *
     * @param range khoảng thời gian
     * @param from ngày bắt đầu (nếu range=CUSTOM)
     * @param to ngày kết thúc (nếu range=CUSTOM)
     * @param forceRefresh bỏ qua cache nếu true
     * @return Báo cáo phân tích và đề xuất hành động từ Gemini AI
     */
    AiAnalyticsInsightResponse getOperationsAiInsights(String range, String from, String to, boolean forceRefresh);

    /**
     * Sinh đề xuất và phân tích AI cho Trục 2: Tài chính, Dòng tiền & Doanh thu Sàn.
     *
     * @param range khoảng thời gian
     * @param from ngày bắt đầu (nếu range=CUSTOM)
     * @param to ngày kết thúc (nếu range=CUSTOM)
     * @param forceRefresh bỏ qua cache nếu true
     * @return Báo cáo phân tích tài chính và chiến lược tối ưu dòng tiền từ Gemini AI
     */
    AiAnalyticsInsightResponse getFinancialAiInsights(String range, String from, String to, boolean forceRefresh);

    /**
     * Sinh đề xuất và phân tích AI cho Trục 3: Bản đồ Sự cố, Loại hỏng hóc & Mật độ Khu vực.
     *
     * @param range khoảng thời gian
     * @param from ngày bắt đầu (nếu range=CUSTOM)
     * @param to ngày kết thúc (nếu range=CUSTOM)
     * @param forceRefresh bỏ qua cache nếu true
     * @return Báo cáo phân tích điểm nóng sự cố và tối ưu bố trí đội cứu hộ từ Gemini AI
     */
    AiAnalyticsInsightResponse getIncidentAiInsights(String range, String from, String to, boolean forceRefresh);

    /**
     * Sinh đề xuất và phân tích AI cho Trục 4: Hiệu suất Đối tác Gara & Đội ngũ Kỹ thuật viên.
     *
     * @param range khoảng thời gian
     * @param from ngày bắt đầu (nếu range=CUSTOM)
     * @param to ngày kết thúc (nếu range=CUSTOM)
     * @param forceRefresh bỏ qua cache nếu true
     * @return Báo cáo đánh giá hiệu suất đối tác, xếp hạng thợ và cảnh báo rủi ro từ Gemini AI
     */
    AiAnalyticsInsightResponse getPartnerAiInsights(String range, String from, String to, boolean forceRefresh);
}

