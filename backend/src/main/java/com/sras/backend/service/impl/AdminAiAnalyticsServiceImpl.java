package com.sras.backend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sras.backend.dto.response.AiAnalyticsInsightResponse;
import com.sras.backend.dto.response.FinancialAnalyticsResponse;
import com.sras.backend.dto.response.RescueOperationsMetricsResponse;
import com.sras.backend.service.AdminAiAnalyticsService;
import com.sras.backend.service.AdminAnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.text.NumberFormat;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAiAnalyticsServiceImpl implements AdminAiAnalyticsService {

    private final AdminAnalyticsService adminAnalyticsService;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-3.5-flash-lite}")
    private String geminiModel;

    // In-memory cache với TTL 15 phút (900.000 ms)
    private static final long CACHE_TTL_MS = 15 * 60 * 1000L;
    private final Map<String, CacheItem> cache = new ConcurrentHashMap<>();

    private record CacheItem(AiAnalyticsInsightResponse data, long timestamp) {}

    @Override
    public AiAnalyticsInsightResponse getOperationsAiInsights(String range, String from, String to, boolean forceRefresh) {
        String cacheKey = "OPERATIONS:" + (range != null ? range : "7_DAYS") + ":" + (from != null ? from : "") + ":" + (to != null ? to : "");

        if (!forceRefresh) {
            CacheItem cached = cache.get(cacheKey);
            if (cached != null && (System.currentTimeMillis() - cached.timestamp()) < CACHE_TTL_MS) {
                log.info("Lấy AI insights Trục 1 từ Cache (key={})", cacheKey);
                AiAnalyticsInsightResponse res = cached.data();
                res.setFromCache(true);
                return res;
            }
        }

        // 1. Lấy dữ liệu phân tích vận hành thực tế
        RescueOperationsMetricsResponse opsData = adminAnalyticsService.getOperationsMetrics(range, from, to);

        // 2. Thử gọi Gemini AI phân tích
        AiAnalyticsInsightResponse response = null;
        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            try {
                response = callGeminiForOperationsInsights(opsData, range);
            } catch (Exception ex) {
                log.warn("Gọi Gemini AI phân tích Trục 1 thất bại (sẽ kích hoạt heuristic fallback): {}", ex.getMessage());
            }
        }

        // 3. Fallback Heuristic Rule-based nếu Gemini lỗi hoặc chưa có key
        if (response == null) {
            response = buildFallbackOperationsInsights(opsData, range);
        }

        response.setPillar("OPERATIONS");
        response.setTimeRange(range != null ? range : "7_DAYS");
        response.setGeneratedAt(OffsetDateTime.now().toString());
        response.setFromCache(false);

        // Lưu cache
        cache.put(cacheKey, new CacheItem(response, System.currentTimeMillis()));

        return response;
    }

    /**
     * Gửi dữ liệu số liệu sang Gemini Generative Language API với định dạng JSON schema yêu cầu.
     */
    private AiAnalyticsInsightResponse callGeminiForOperationsInsights(RescueOperationsMetricsResponse ops, String range) throws Exception {
        String dataJson = objectMapper.writeValueAsString(ops);

        String prompt = """
            Bạn là một Giám đốc Vận hành Cấp cao (Senior Operations Director) chuyên gia về mạng lưới Cứu hộ Giao thông Khẩn cấp (Roadside Assistance).
            Dưới đây là số liệu phân tích Trục 1: Vận hành, Điều phối & Chỉ số SLA Cứu hộ trong kỳ (%s):
            
            %s
            
            Hãy đóng vai trò chuyên gia, phân tích dữ liệu trên và đưa ra đánh giá cùng đề xuất hành động chiến lược thực tế.
            BẮT BUỘC TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON với cấu trúc sau:
            {
              "executiveSummary": "Đoạn văn ngắn gọn 2-3 câu tóm tắt cốt lõi tình trạng vận hành, hiệu suất điều phối và tỷ lệ hoàn thành.",
              "overallHealthStatus": "EXCELLENT" (nếu tỷ lệ >85%% và SLA nhanh) hoặc "STABLE" (70-85%%) hoặc "WARNING" (50-70%%) hoặc "CRITICAL" (<50%%),
              "healthScore": điểm số từ 0.0 đến 100.0,
              "highlights": [
                {
                  "title": "Tiêu đề điểm sáng",
                  "description": "Mô tả chi tiết điểm tích cực đã đạt được",
                  "metric": "Số liệu đo lường cụ thể (ví dụ: '72.5%%', '11 phút')"
                }
              ],
              "bottlenecks": [
                {
                  "title": "Tiêu đề điểm nghẽn",
                  "description": "Mô tả điểm nghẽn hoặc rủi ro phát hiện trong quy trình",
                  "metric": "Số liệu chứng minh (ví dụ: '27.5%% hủy', '4 ca hủy chờ lâu')"
                }
              ],
              "recommendations": [
                {
                  "id": "REC-OP-01",
                  "title": "Tiêu đề hành động ngắn gọn",
                  "priority": "URGENT" (🔴 khẩn cấp trong 24h) hoặc "OPTIMIZATION" (🟡 cải tiến quy trình) hoặc "STRATEGIC" (🟢 chiến lược dài hạn),
                  "category": "DISPATCH" hoặc "SLA_SPEED" hoặc "CANCELLATION" hoặc "COVERAGE",
                  "problemStatement": "Chỉ rõ vấn đề đang gặp từ số liệu",
                  "proposedAction": "Hành động thực thi cụ thể cần làm",
                  "expectedImpact": "Tác động định lượng kỳ vọng đạt được"
                }
              ]
            }
            Lưu ý:
            - Phân tích đúng dựa trên số liệu thực tế được cung cấp, không suy diễn ảo.
            - Các đề xuất phải sát thực tế nghiệp vụ cứu hộ xe máy, ô tô.
            - Trả về JSON thuần túy, không có markdown bọc ngoài hay chú thích thừa.
            """.formatted(range, dataJson);

        String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel + ":generateContent?key=" + geminiApiKey;

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                ),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "temperature", 0.3
                )
        );

        String requestJson = objectMapper.writeValueAsString(requestBody);

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(25))
                .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IllegalStateException("Gemini API returned HTTP " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode candidates = root.path("candidates");
        if (candidates.isEmpty()) {
            throw new IllegalStateException("Gemini returned empty candidates: " + response.body());
        }

        String aiText = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
        log.info("Gemini AI phân tích Trục 1 thành công (length={})", aiText.length());

        return objectMapper.readValue(aiText, AiAnalyticsInsightResponse.class);
    }

    /**
     * Fallback Heuristic Rule-based Engine khi mất mạng hoặc Gemini lỗi,
     * đảm bảo giao diện luôn có đề xuất chuyên nghiệp và chính xác 100%.
     */
    private AiAnalyticsInsightResponse buildFallbackOperationsInsights(RescueOperationsMetricsResponse ops, String range) {
        long total = ops.getTotalRequests();
        long completed = ops.getCompletedRequests();
        long cancelled = ops.getCancelledRequests();
        double successRate = ops.getSuccessRate();
        double arrivalMin = ops.getAvgArrivalMinutes();
        double handlingMin = ops.getAvgHandlingMinutes();

        double healthScore = Math.min(100.0, Math.max(0.0, (successRate * 0.7) + (arrivalMin > 0 && arrivalMin <= 20 ? 30.0 : 15.0)));
        String healthStatus = healthScore >= 80 ? "EXCELLENT" : healthScore >= 65 ? "STABLE" : healthScore >= 45 ? "WARNING" : "CRITICAL";

        String summary = String.format(
                "Trong kỳ phân tích (%s), hệ thống ghi nhận %d yêu cầu cứu hộ với tỷ lệ hoàn thành đạt %.1f%% (%d ca thành công, %d ca hủy). " +
                "Thời gian tiếp cận hiện trường trung bình đạt %.0f phút và thời gian xử lý sự cố là %.0f phút.",
                range, total, successRate, completed, cancelled, arrivalMin, handlingMin
        );

        List<AiAnalyticsInsightResponse.InsightItem> highlights = new ArrayList<>();
        highlights.add(AiAnalyticsInsightResponse.InsightItem.builder()
                .title("Hiệu suất xử lý đơn hoàn tất")
                .description("Hệ thống đã điều phối và cứu hộ thành công phần lớn các cuốc gọi khẩn cấp.")
                .metric(String.format("%.1f%% (%d ca)", successRate, completed))
                .build());

        if (arrivalMin > 0 && arrivalMin <= 20) {
            highlights.add(AiAnalyticsInsightResponse.InsightItem.builder()
                    .title("Tốc độ tiếp cận hiện trường nhanh")
                    .description("Thời gian thợ cứu hộ di chuyển đến nơi nằm trong chuẩn SLA an toàn (< 20 phút).")
                    .metric(String.format("%.0f phút", arrivalMin))
                    .build());
        }

        List<AiAnalyticsInsightResponse.InsightItem> bottlenecks = new ArrayList<>();
        if (ops.getCancellationRate() > 20.0) {
            bottlenecks.add(AiAnalyticsInsightResponse.InsightItem.builder()
                    .title("Tỷ lệ hủy cuốc còn ở mức đáng chú ý")
                    .description("Cần kiểm tra sâu các lý do hủy chính từ phía khách hàng và thợ phản hồi chậm.")
                    .metric(String.format("%.1f%% (%d ca)", ops.getCancellationRate(), cancelled))
                    .build());
        }

        if (ops.getFunnel() != null && ops.getFunnel().getAccepted() > ops.getFunnel().getArrived()) {
            long dropOnRoute = ops.getFunnel().getAccepted() - ops.getFunnel().getArrived();
            bottlenecks.add(AiAnalyticsInsightResponse.InsightItem.builder()
                    .title("Hao hụt trong quá trình thợ di chuyển")
                    .description("Có phát sinh trường hợp hủy cuốc sau khi gara đã chấp nhận điều phối.")
                    .metric(dropOnRoute + " ca thất thoát")
                    .build());
        }

        List<AiAnalyticsInsightResponse.AiActionRecommendation> recs = new ArrayList<>();
        recs.add(AiAnalyticsInsightResponse.AiActionRecommendation.builder()
                .id("REC-OP-01")
                .title("Tối ưu hóa bán kính quét điều phối tự động")
                .priority(arrivalMin > 25 ? "URGENT" : "OPTIMIZATION")
                .category("DISPATCH")
                .problemStatement("Khoảng cách tiếp cận trung bình ảnh hưởng trực tiếp đến thời gian chờ của khách và tỷ lệ hủy đơn.")
                .proposedAction("Điều chỉnh thuật toán ưu tiên các gara trong bán kính 3-5km tại các quận nội thành vào giờ cao điểm.")
                .expectedImpact("Rút ngắn 3-5 phút thời gian di chuyển và giảm 12% tỷ lệ khách hủy do chờ lâu.")
                .build());

        recs.add(AiAnalyticsInsightResponse.AiActionRecommendation.builder()
                .id("REC-OP-02")
                .title("Tăng cường cảnh báo thợ xuất phát trễ")
                .priority("OPTIMIZATION")
                .category("SLA_SPEED")
                .problemStatement("Một số thợ nhận đơn nhưng chậm cập nhật trạng thái 'Đang di chuyển' (en_route).")
                .proposedAction("Kích hoạt push notification nhắc nhở tự động sau 3 phút nếu thợ chưa bấm xuất phát.")
                .expectedImpact("Nâng cao tính kỷ luật của đội ngũ và khách hàng an tâm theo dõi GPS trực tiếp.")
                .build());

        recs.add(AiAnalyticsInsightResponse.AiActionRecommendation.builder()
                .id("REC-OP-03")
                .title("Thiết lập cơ chế thưởng nóng cho đơn hoàn thành nhanh")
                .priority("STRATEGIC")
                .category("COVERAGE")
                .problemStatement("Cần động lực khuyến khích các thợ cứu hộ nhận đơn vào buổi tối và thời tiết xấu.")
                .proposedAction("Ban hành chính sách cộng thêm điểm uy tín hoặc thưởng 10.000đ/ca cho cuốc tiếp cận dưới 12 phút.")
                .expectedImpact("Tăng 20% tỷ lệ nhận đơn tức thì trong các khung giờ khó.")
                .build());

        return AiAnalyticsInsightResponse.builder()
                .executiveSummary(summary)
                .overallHealthStatus(healthStatus)
                .healthScore(Math.round(healthScore * 10.0) / 10.0)
                .highlights(highlights)
                .bottlenecks(bottlenecks)
                .recommendations(recs)
                .build();
    }

    @Override
    public AiAnalyticsInsightResponse getFinancialAiInsights(String range, String from, String to, boolean forceRefresh) {
        String cacheKey = "FINANCE:" + (range != null ? range : "7_DAYS") + ":" + (from != null ? from : "") + ":" + (to != null ? to : "");

        if (!forceRefresh) {
            CacheItem cached = cache.get(cacheKey);
            if (cached != null && (System.currentTimeMillis() - cached.timestamp()) < CACHE_TTL_MS) {
                log.info("Lấy AI insights Trục 2 từ Cache (key={})", cacheKey);
                AiAnalyticsInsightResponse res = cached.data();
                res.setFromCache(true);
                return res;
            }
        }

        // 1. Lấy dữ liệu phân tích tài chính & doanh thu thực tế
        FinancialAnalyticsResponse finData = adminAnalyticsService.getFinancialAnalytics(range, from, to);

        // 2. Thử gọi Gemini AI phân tích
        AiAnalyticsInsightResponse response = null;
        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            try {
                response = callGeminiForFinancialInsights(finData, range);
            } catch (Exception ex) {
                log.warn("Gọi Gemini AI phân tích Trục 2 thất bại (sẽ kích hoạt heuristic fallback): {}", ex.getMessage());
            }
        }

        // 3. Fallback Heuristic Rule-based nếu Gemini lỗi hoặc chưa có key
        if (response == null) {
            response = buildFallbackFinancialInsights(finData, range);
        }

        response.setPillar("FINANCE");
        response.setTimeRange(range != null ? range : "7_DAYS");
        response.setGeneratedAt(OffsetDateTime.now().toString());
        response.setFromCache(false);

        // Lưu cache
        cache.put(cacheKey, new CacheItem(response, System.currentTimeMillis()));

        return response;
    }

    /**
     * Gửi dữ liệu tài chính sang Gemini Generative Language API với định dạng JSON schema yêu cầu.
     */
    private AiAnalyticsInsightResponse callGeminiForFinancialInsights(FinancialAnalyticsResponse fin, String range) throws Exception {
        String dataJson = objectMapper.writeValueAsString(fin);

        String prompt = """
            Bạn là một Giám đốc Tài chính Cấp cao (CFO / Financial Analytics Director) chuyên gia về tài chính nền tảng kinh tế chia sẻ (Platform/Marketplace Economy) và dịch vụ cứu hộ giao thông.
            Dưới đây là số liệu phân tích Trục 2: Tài chính, Dòng tiền & Doanh thu Sàn trong kỳ (%s):
            
            %s
            
            Hãy đóng vai trò chuyên gia CFO, phân tích chuyên sâu dữ liệu trên và đưa ra đánh giá cùng đề xuất hành động tối ưu dòng tiền và tăng trưởng doanh thu.
            BẮT BUỘC TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON với cấu trúc sau:
            {
              "executiveSummary": "Đoạn văn ngắn gọn 2-3 câu tóm tắt cốt lõi tình hình GMV, doanh thu hoa hồng sàn SRAS, giá trị đơn trung bình (AOV) và tỷ trọng thanh toán không tiền mặt.",
              "overallHealthStatus": "EXCELLENT" (nếu doanh thu cao, hoa hồng ổn định và tỷ lệ không tiền mặt >60%%) hoặc "STABLE" hoặc "WARNING" hoặc "CRITICAL",
              "healthScore": điểm số từ 0.0 đến 100.0,
              "highlights": [
                {
                  "title": "Tiêu đề điểm sáng tài chính",
                  "description": "Mô tả chi tiết điểm tích cực về doanh thu/dòng tiền",
                  "metric": "Số liệu đo lường cụ thể (ví dụ: '21.130.335 đ GMV', '15.0%% hoa hồng', '68.5%% chuyển khoản')"
                }
              ],
              "bottlenecks": [
                {
                  "title": "Tiêu đề rủi ro/điểm nghẽn tài chính",
                  "description": "Mô tả rủi ro dòng tiền, nguy cơ nợ đọng hoa hồng hoặc phí phát sinh chưa tối ưu",
                  "metric": "Số liệu chứng minh (ví dụ: '31.5%% tiền mặt', 'phí phụ tùng chiếm dưới 5%%')"
                }
              ],
              "recommendations": [
                {
                  "id": "REC-FIN-01",
                  "title": "Tiêu đề hành động tài chính ngắn gọn",
                  "priority": "URGENT" (🔴 khẩn cấp trong 24h) hoặc "OPTIMIZATION" (🟡 tối ưu chính sách/chiết khấu) hoặc "STRATEGIC" (🟢 chiến lược tăng trưởng GMV),
                  "category": "CASH_FLOW" hoặc "PRICING" hoặc "COMMISSION" hoặc "PAYMENT_GATEWAY",
                  "problemStatement": "Chỉ rõ rủi ro/cơ hội tài chính phát hiện từ số liệu",
                  "proposedAction": "Hành động thực thi cụ thể cần làm",
                  "expectedImpact": "Tác động định lượng kỳ vọng đạt được"
                }
              ]
            }
            Lưu ý:
            - Phân tích sát đúng số liệu thực tế được cung cấp, đơn vị tiền tệ VNĐ.
            - Các đề xuất phải thực tế với mô hình sàn thu hoa hồng (hoa hồng tính trên phí cứu hộ và phí kéo xe).
            - Trả về JSON thuần túy, không có markdown bọc ngoài hay chú thích thừa.
            """.formatted(range, dataJson);

        String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel + ":generateContent?key=" + geminiApiKey;

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                ),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "temperature", 0.3
                )
        );

        String requestJson = objectMapper.writeValueAsString(requestBody);

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(25))
                .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IllegalStateException("Gemini API returned HTTP " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode candidates = root.path("candidates");
        if (candidates.isEmpty()) {
            throw new IllegalStateException("Gemini returned empty candidates: " + response.body());
        }

        String aiText = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
        log.info("Gemini AI phân tích Trục 2 (Tài chính) thành công (length={})", aiText.length());

        return objectMapper.readValue(aiText, AiAnalyticsInsightResponse.class);
    }

    /**
     * Fallback Heuristic Rule-based Engine cho Trục Tài chính khi Gemini ngoại tuyến hoặc rate-limit.
     */
    private AiAnalyticsInsightResponse buildFallbackFinancialInsights(FinancialAnalyticsResponse fin, String range) {
        NumberFormat fmt = NumberFormat.getInstance(new Locale("vi", "VN"));
        long gmv = fin.getTotalGmv();
        long commission = fin.getTotalCommission();
        long aov = fin.getAvgOrderValue();
        double commRate = fin.getEffectiveCommissionRate();
        double cashlessRate = fin.getPaymentBreakdown() != null ? fin.getPaymentBreakdown().getCashlessRate() : 0.0;

        double healthScore = Math.min(100.0, Math.max(0.0, (cashlessRate * 0.4) + (commRate >= 10.0 ? 40.0 : 20.0) + (gmv > 0 ? 20.0 : 0.0)));
        String healthStatus = healthScore >= 80 ? "EXCELLENT" : healthScore >= 65 ? "STABLE" : healthScore >= 45 ? "WARNING" : "CRITICAL";

        String summary = String.format(
                "Trong kỳ (%s), tổng doanh số giao dịch (GMV) đạt %s đ từ %d đơn cứu hộ hoàn thành (AOV đạt %s đ/đơn). " +
                "Doanh thu hoa hồng sàn SRAS thực thu đạt %s đ (tỷ lệ hoa hồng trung bình %.1f%%) và tỷ lệ thanh toán không tiền mặt đạt %.1f%%.",
                range, fmt.format(gmv), fin.getCompletedOrderCount(), fmt.format(aov), fmt.format(commission), commRate, cashlessRate
        );

        List<AiAnalyticsInsightResponse.InsightItem> highlights = new ArrayList<>();
        highlights.add(AiAnalyticsInsightResponse.InsightItem.builder()
                .title("Doanh thu hoa hồng sàn thực thu ổn định")
                .description("Dòng tiền hoa hồng sàn được ghi nhận đầy đủ từ các ca cứu hộ hoàn tất.")
                .metric(fmt.format(commission) + " đ (" + String.format("%.1f%%", commRate) + ")")
                .build());

        if (cashlessRate >= 50.0) {
            highlights.add(AiAnalyticsInsightResponse.InsightItem.builder()
                    .title("Tỷ trọng thanh toán số hóa chiếm ưu thế")
                    .description("Khách hàng chủ động chuyển khoản VietQR/PayOS giúp giảm thiểu công nợ tiền mặt.")
                    .metric(String.format("%.1f%%", cashlessRate))
                    .build());
        }

        List<AiAnalyticsInsightResponse.InsightItem> bottlenecks = new ArrayList<>();
        if (cashlessRate < 50.0 && fin.getPaymentBreakdown() != null && fin.getPaymentBreakdown().getCashAmount() > 0) {
            bottlenecks.add(AiAnalyticsInsightResponse.InsightItem.builder()
                    .title("Rủi ro truy thu hoa hồng từ tiền mặt")
                    .description("Khách trả tiền mặt trực tiếp cho thợ, sàn phải trừ dần vào ví tín dụng Gara.")
                    .metric(fmt.format(fin.getPaymentBreakdown().getCashAmount()) + " đ tiền mặt")
                    .build());
        }

        if (fin.getFeeBreakdown() != null && fin.getFeeBreakdown().getTowingFee() == 0 && gmv > 0) {
            bottlenecks.add(AiAnalyticsInsightResponse.InsightItem.builder()
                    .title("Dịch vụ kéo xe chưa đóng góp doanh thu")
                    .description("Các ca cứu hộ chủ yếu xử lý tại chỗ, chưa khai thác được nguồn thu từ kéo xe chuyên dụng.")
                    .metric("0 đ kéo xe")
                    .build());
        }

        List<AiAnalyticsInsightResponse.AiActionRecommendation> recs = new ArrayList<>();
        recs.add(AiAnalyticsInsightResponse.AiActionRecommendation.builder()
                .id("REC-FIN-01")
                .title("Bắt buộc duy trì số dư tối thiểu trong Ví Tín Dụng")
                .priority(cashlessRate < 50.0 ? "URGENT" : "OPTIMIZATION")
                .category("CASH_FLOW")
                .problemStatement("Khi khách trả tiền mặt, hệ thống tự động trừ hoa hồng từ Ví Tín Dụng của Gara; nếu ví âm, rủi ro nợ xấu tăng.")
                .proposedAction("Cảnh báo push tự động khi Ví Tín Dụng còn dưới 200.000đ và tạm ngưng gán đơn mới khi ví về 0đ.")
                .expectedImpact("Triệt tiêu 100% rủi ro nợ đọng hoa hồng và thúc đẩy Gara chủ động nạp tiền trước.")
                .build());

        recs.add(AiAnalyticsInsightResponse.AiActionRecommendation.builder()
                .id("REC-FIN-02")
                .title("Thúc đẩy khách hàng thanh toán VietQR / PayOS")
                .priority("OPTIMIZATION")
                .category("PAYMENT_GATEWAY")
                .problemStatement("Thanh toán tiền mặt làm tăng thời gian đối soát và thợ phải giữ tiền mặt lưu động.")
                .proposedAction("Khuyến khích tài xế quét mã QR thanh toán PayOS trực tiếp trên app thợ kèm voucher giảm 10k cho lần sau.")
                .expectedImpact("Tăng tỷ lệ thanh toán không tiền mặt lên > 75%, tiền hoa hồng về tài khoản sàn tức thì.")
                .build());

        recs.add(AiAnalyticsInsightResponse.AiActionRecommendation.builder()
                .id("REC-FIN-03")
                .title("Đẩy mạnh gói cứu hộ kết hợp kéo xe và thay thế phụ tùng")
                .priority("STRATEGIC")
                .category("PRICING")
                .problemStatement("Doanh thu hiện tại chủ yếu phụ thuộc vào phí cứu hộ cơ bản, giá trị trung bình đơn (AOV) còn dư địa nâng cao.")
                .proposedAction("Chuẩn hóa bảng giá phụ tùng thay thế nhanh (bình ắc quy, săm lốp) có niêm yết rõ ràng để khách an tâm mua sắm.")
                .expectedImpact("Tăng 25% giá trị đơn hàng trung bình (AOV) và bổ sung nguồn thu hoa hồng từ dịch vụ sửa chữa.")
                .build());

        return AiAnalyticsInsightResponse.builder()
                .executiveSummary(summary)
                .overallHealthStatus(healthStatus)
                .healthScore(Math.round(healthScore * 10.0) / 10.0)
                .highlights(highlights)
                .bottlenecks(bottlenecks)
                .recommendations(recs)
                .build();
    }
}

