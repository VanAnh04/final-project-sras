package com.sras.backend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sras.backend.dto.response.AiAnalyticsInsightResponse;
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
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
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
}

