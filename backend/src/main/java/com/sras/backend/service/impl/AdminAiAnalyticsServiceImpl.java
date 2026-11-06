package com.sras.backend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sras.backend.config.GeminiApiKeyProvider;
import com.sras.backend.dto.response.AiAnalyticsInsightResponse;
import com.sras.backend.dto.response.FinancialAnalyticsResponse;
import com.sras.backend.dto.response.IncidentAnalyticsResponse;
import com.sras.backend.dto.response.PartnerAnalyticsResponse;
import com.sras.backend.dto.response.RescueOperationsMetricsResponse;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.service.AdminAiAnalyticsService;
import com.sras.backend.service.AdminAnalyticsService;
import com.sras.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.text.NumberFormat;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAiAnalyticsServiceImpl implements AdminAiAnalyticsService {

    private final AdminAnalyticsService adminAnalyticsService;
    private final GarageRepository garageRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;
    private final GeminiApiKeyProvider geminiApiKeyProvider;

    @Value("${gemini.model:gemini-flash-lite-latest}")
    private String geminiModel;

    private static final List<String> CANDIDATE_MODELS = List.of(
            "gemini-flash-lite-latest",
            "gemini-3.1-flash-lite",
            "gemini-3-flash-preview",
            "gemini-3.1-flash-lite-preview",
            "gemini-2.5-flash-lite"
    );

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

        // 1. Lấy dữ liệu phân tích vận hành & đối tác thực tế
        RescueOperationsMetricsResponse opsData = adminAnalyticsService.getOperationsMetrics(range, from, to);
        PartnerAnalyticsResponse partnerData = adminAnalyticsService.getPartnerAnalytics(range, from, to);

        // 2. Thử gọi Gemini AI phân tích
        AiAnalyticsInsightResponse response = null;
        if (geminiApiKeyProvider.hasKeys()) {
            try {
                response = geminiApiKeyProvider.executeWithFailover(activeKey -> callGeminiForOperationsInsights(activeKey, opsData, range));
            } catch (Exception ex) {
                log.warn("Gọi Gemini AI phân tích Trục 1 thất bại (sẽ kích hoạt heuristic fallback): {}", ex.getMessage());
            }
        }

        // 3. Fallback Heuristic Rule-based nếu Gemini lỗi hoặc chưa có key
        if (response == null) {
            response = buildFallbackOperationsInsights(opsData, range);
        }

        // 4. Luôn tính toán danh sách cảnh báo gara có vấn đề vận hành (hủy đơn cao, tiếp cận trễ)
        List<AiAnalyticsInsightResponse.GarageActionAlert> garageAlerts = buildGarageActionAlerts(partnerData);
        response.setGarageActionAlerts(garageAlerts);

        response.setPillar("OPERATIONS");
        response.setTimeRange(range != null ? range : "7_DAYS");
        response.setGeneratedAt(OffsetDateTime.now().toString());
        response.setFromCache(false);

        // Lưu cache
        cache.put(cacheKey, new CacheItem(response, System.currentTimeMillis()));

        return response;
    }

    /**
     * Gửi prompt sang Gemini API với cơ chế failover theo candidate models.
     */
    private String callGeminiContent(String apiKey, String prompt) throws Exception {
        Set<String> modelsToTry = new LinkedHashSet<>();
        if (StringUtils.hasText(geminiModel)) {
            modelsToTry.add(geminiModel);
        }
        modelsToTry.addAll(CANDIDATE_MODELS);

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

        Exception lastEx = null;
        for (String model : modelsToTry) {
            String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(endpoint))
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(25))
                        .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                        .build();

                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200) {
                    JsonNode root = objectMapper.readTree(response.body());
                    JsonNode candidates = root.path("candidates");
                    if (candidates.isEmpty()) {
                        throw new IllegalStateException("Gemini returned empty candidates: " + response.body());
                    }
                    return candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                } else {
                    String errBody = response.body();
                    log.warn("[Gemini AI] Model {} với key {} trả về HTTP {}: {}. Đang thử model kế tiếp...",
                            model, GeminiApiKeyProvider.maskKey(apiKey), response.statusCode(), errBody);
                    lastEx = new IllegalStateException("Gemini API returned HTTP " + response.statusCode() + ": " + errBody);
                }
            } catch (Exception ex) {
                lastEx = ex;
                log.warn("[Gemini AI] Model {} với key {} gặp lỗi kết nối: {}", model, GeminiApiKeyProvider.maskKey(apiKey), ex.getMessage());
            }
        }
        throw lastEx != null ? lastEx : new IllegalStateException("Tất cả candidate models đều thất bại với key " + GeminiApiKeyProvider.maskKey(apiKey));
    }

    /**
     * Gửi dữ liệu số liệu sang Gemini Generative Language API với định dạng JSON schema yêu cầu.
     */
    private AiAnalyticsInsightResponse callGeminiForOperationsInsights(String activeKey, RescueOperationsMetricsResponse ops, String range) throws Exception {
        String dataJson = objectMapper.writeValueAsString(ops);

        String prompt = """
            Bạn là một Giám đốc Vận hành Cấp cao (Senior Operations Director) chuyên gia về mạng lưới Cứu hộ Giao thông Khẩn cấp (Roadside Assistance).
            Dưới đây là số liệu phân tích Trục 1: Vận hành, Điều phối & Tốc độ Phản ứng Cứu hộ trong kỳ (%s):
            
            %s
            
            Hãy đóng vai trò chuyên gia, phân tích dữ liệu trên và đưa ra đánh giá cùng đề xuất hành động chiến lược thực tế.
            BẮT BUỘC TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON với cấu trúc sau:
            {
              "executiveSummary": "Đoạn văn ngắn gọn 2-3 câu tóm tắt cốt lõi tình trạng vận hành, hiệu suất điều phối và tỷ lệ hoàn thành.",
              "overallHealthStatus": "EXCELLENT" (nếu tỷ lệ >85%% và tiếp cận nhanh) hoặc "STABLE" (70-85%%) hoặc "WARNING" (50-70%%) hoặc "CRITICAL" (<50%%),
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
                  "title": "Tiêu đề vấn đề tồn đọng",
                  "description": "Mô tả vấn đề hoặc rủi ro phát hiện trong quy trình",
                  "metric": "Số liệu chứng minh (ví dụ: '27.5%% hủy', '4 ca hủy chờ lâu')"
                }
              ],
              "recommendations": [
                {
                  "id": "REC-OP-01",
                  "title": "Tiêu đề hành động ngắn gọn",
                  "priority": "URGENT" (🔴 khẩn cấp trong 24h) hoặc "OPTIMIZATION" (🟡 cải tiến quy trình) hoặc "STRATEGIC" (🟢 chiến lược dài hạn),
                  "category": "DISPATCH" hoặc "RESPONSE_SPEED" hoặc "CANCELLATION" hoặc "COVERAGE",
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

        String aiText = callGeminiContent(activeKey, prompt);
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
                    .description("Thời gian thợ cứu hộ di chuyển đến nơi nằm trong chuẩn an toàn (< 20 phút).")
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
                .category("RESPONSE_SPEED")
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
        if (geminiApiKeyProvider.hasKeys()) {
            try {
                response = geminiApiKeyProvider.executeWithFailover(activeKey -> callGeminiForFinancialInsights(activeKey, finData, range));
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
    private AiAnalyticsInsightResponse callGeminiForFinancialInsights(String activeKey, FinancialAnalyticsResponse fin, String range) throws Exception {
        String dataJson = objectMapper.writeValueAsString(fin);

        String prompt = """
            Bạn là một Giám đốc Tài chính Cấp cao (CFO / Financial Analytics Director) chuyên gia về tài chính nền tảng kinh tế chia sẻ (Platform/Marketplace Economy) và dịch vụ cứu hộ giao thông.
            Dưới đây là số liệu phân tích Trục 2: Tài chính, Dòng tiền & Doanh thu Sàn trong kỳ (%s):
            
            %s
            
            Hãy đóng vai trò chuyên gia CFO, phân tích chuyên sâu dữ liệu trên và đưa ra đánh giá cùng đề xuất hành động tối ưu dòng tiền và tăng trưởng doanh thu.
            BẮT BUỘC TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON với cấu trúc sau:
            {
              "executiveSummary": "Đoạn văn ngắn gọn 2-3 câu tóm tắt cốt lõi tình hình tổng doanh số, doanh thu hoa hồng sàn SRAS, giá trị đơn trung bình (AOV) và tỷ trọng thanh toán không tiền mặt.",
              "overallHealthStatus": "EXCELLENT" (nếu doanh thu cao, hoa hồng ổn định và tỷ lệ không tiền mặt >60%%) hoặc "STABLE" hoặc "WARNING" hoặc "CRITICAL",
              "healthScore": điểm số từ 0.0 đến 100.0,
              "highlights": [
                {
                  "title": "Tiêu đề điểm sáng tài chính",
                  "description": "Mô tả chi tiết điểm tích cực về doanh thu/dòng tiền",
                  "metric": "Số liệu đo lường cụ thể (ví dụ: '21.130.335 đ doanh số', '15.0%% hoa hồng', '68.5%% chuyển khoản')"
                }
              ],
              "bottlenecks": [
                {
                  "title": "Tiêu đề rủi ro/vấn đề tài chính",
                  "description": "Mô tả rủi ro dòng tiền, nguy cơ nợ đọng hoa hồng hoặc phí phát sinh chưa tối ưu",
                  "metric": "Số liệu chứng minh (ví dụ: '31.5%% tiền mặt', 'phí phụ tùng chiếm dưới 5%%')"
                }
              ],
              "recommendations": [
                {
                  "id": "REC-FIN-01",
                  "title": "Tiêu đề hành động tài chính ngắn gọn",
                  "priority": "URGENT" (🔴 khẩn cấp trong 24h) hoặc "OPTIMIZATION" (🟡 tối ưu chính sách/chiết khấu) hoặc "STRATEGIC" (🟢 chiến lược tăng trưởng doanh số),
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

        String aiText = callGeminiContent(activeKey, prompt);
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
                "Trong kỳ (%s), tổng doanh số giao dịch đạt %s đ từ %d đơn cứu hộ hoàn thành (AOV đạt %s đ/đơn). " +
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

    @Override
    public AiAnalyticsInsightResponse getIncidentAiInsights(String range, String from, String to, boolean forceRefresh) {
        String cacheKey = "INCIDENTS:" + (range != null ? range : "7_DAYS") + ":" + (from != null ? from : "") + ":" + (to != null ? to : "");

        if (!forceRefresh) {
            CacheItem cached = cache.get(cacheKey);
            if (cached != null && (System.currentTimeMillis() - cached.timestamp()) < CACHE_TTL_MS) {
                log.info("Lấy AI insights Trục 3 từ Cache (key={})", cacheKey);
                AiAnalyticsInsightResponse res = cached.data();
                res.setFromCache(true);
                return res;
            }
        }

        // 1. Lấy dữ liệu phân tích sự cố & bản đồ thực tế
        IncidentAnalyticsResponse incData = adminAnalyticsService.getIncidentAnalytics(range, from, to);

        // 2. Thử gọi Gemini AI phân tích
        AiAnalyticsInsightResponse response = null;
        if (geminiApiKeyProvider.hasKeys()) {
            try {
                response = geminiApiKeyProvider.executeWithFailover(activeKey -> callGeminiForIncidentInsights(activeKey, incData, range));
            } catch (Exception ex) {
                log.warn("Gọi Gemini AI phân tích Trục 3 thất bại (sẽ kích hoạt heuristic fallback): {}", ex.getMessage());
            }
        }

        // 3. Fallback Heuristic Rule-based nếu Gemini lỗi hoặc chưa có key
        if (response == null) {
            response = buildFallbackIncidentInsights(incData, range);
        }

        response.setPillar("INCIDENTS");
        response.setTimeRange(range != null ? range : "7_DAYS");
        response.setGeneratedAt(OffsetDateTime.now().toString());
        response.setFromCache(false);

        // Lưu cache
        cache.put(cacheKey, new CacheItem(response, System.currentTimeMillis()));

        return response;
    }

    /**
     * Gửi dữ liệu sự cố và bản đồ sang Gemini Generative Language API với định dạng JSON schema yêu cầu.
     */
    private AiAnalyticsInsightResponse callGeminiForIncidentInsights(String activeKey, IncidentAnalyticsResponse inc, String range) throws Exception {
        // Rút gọn mapPoints để tránh vượt quá token limit
        IncidentAnalyticsResponse compactData = IncidentAnalyticsResponse.builder()
                .totalIncidents(inc.getTotalIncidents())
                .vehicleBreakdown(inc.getVehicleBreakdown())
                .resolutionBreakdown(inc.getResolutionBreakdown())
                .peakHourLabel(inc.getPeakHourLabel())
                .peakHourCount(inc.getPeakHourCount())
                .nightIncidentRate(inc.getNightIncidentRate())
                .hourlyDistribution(inc.getHourlyDistribution())
                .topIssueTypes(inc.getTopIssueTypes())
                .topHotspots(inc.getTopHotspots())
                .build();

        String dataJson = objectMapper.writeValueAsString(compactData);

        String prompt = """
            Bạn là một Chuyên gia Trưởng về An toàn Giao thông và Điều phối Cứu hộ Đô thị (Urban Mobility & Roadside Incident Dispatch Expert).
            Dưới đây là số liệu phân tích Trục 3: Bản đồ Sự cố, Loại hỏng hóc & Mật độ Khu vực trong kỳ (%s):
            
            %s
            
            Hãy đóng vai trò chuyên gia, phân tích dữ liệu trên và đưa ra đánh giá cùng đề xuất hành động tối ưu vị trí trực chiến cứu hộ và giảm thiểu tắc nghẽn sự cố.
            BẮT BUỘC TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON với cấu trúc sau:
            {
              "executiveSummary": "Đoạn văn ngắn gọn 2-3 câu tóm tắt cốt lõi mật độ rủi ro, phân bổ địa bàn nóng, sự cố chủ đạo (lốp, ắc quy, chết máy) và khung giờ cao điểm phát sinh sự cố.",
              "overallHealthStatus": "EXCELLENT" (nếu mật độ phân tán đều, tỷ lệ ca đêm kiểm soát tốt) hoặc "STABLE" hoặc "WARNING" hoặc "CRITICAL",
              "healthScore": điểm số từ 0.0 đến 100.0,
              "highlights": [
                {
                  "title": "Tiêu đề điểm sáng vùng phủ/xử lý",
                  "description": "Mô tả chi tiết điểm tích cực trong năng lực ứng cứu sự cố",
                  "metric": "Số liệu đo lường cụ thể (ví dụ: '88.2%% xử lý tại chỗ', '100%% điểm nóng có gara trực')"
                }
              ],
              "bottlenecks": [
                {
                  "title": "Tiêu đề điểm nóng quá tải/rủi ro",
                  "description": "Mô tả vấn đề địa bàn, khung giờ dễ thiếu thợ hoặc loại sự cố cần phương tiện chuyên dụng",
                  "metric": "Số liệu chứng minh (ví dụ: '18 ca lúc 17h-18h', '24.5%% ca đêm', 'Quận Ngũ Hành Sơn chiếm 45%%')"
                }
              ],
              "recommendations": [
                {
                  "id": "REC-INC-01",
                  "title": "Tiêu đề hành động ngắn gọn",
                  "priority": "URGENT" (🔴 khẩn cấp trong 24h) hoặc "OPTIMIZATION" (🟡 tối ưu bố trí đội thợ) hoặc "STRATEGIC" (🟢 chiến lược vùng phủ),
                  "category": "HOTSPOT" hoặc "NIGHT_SHIFT" hoặc "VEHICLE_TYPE" hoặc "TOWING",
                  "problemStatement": "Chỉ rõ vấn đề/rủi ro phát hiện từ bản đồ và dữ liệu sự cố",
                  "proposedAction": "Hành động thực thi cụ thể cần làm",
                  "expectedImpact": "Tác động định lượng kỳ vọng đạt được"
                }
              ]
            }
            Lưu ý:
            - Phân tích đúng dựa trên số liệu thực tế được cung cấp.
            - Các đề xuất phải sát thực tế nghiệp vụ cứu hộ xe máy, ô tô trên địa bàn đô thị.
            - Trả về JSON thuần túy, không có markdown bọc ngoài hay chú thích thừa.
            """.formatted(range, dataJson);

        String aiText = callGeminiContent(activeKey, prompt);
        log.info("Gemini AI phân tích Trục 3 (Sự cố & Bản đồ) thành công (length={})", aiText.length());

        return objectMapper.readValue(aiText, AiAnalyticsInsightResponse.class);
    }

    /**
     * Fallback Heuristic Rule-based Engine cho Trục Sự cố khi Gemini offline hoặc rate-limit.
     */
    private AiAnalyticsInsightResponse buildFallbackIncidentInsights(IncidentAnalyticsResponse inc, String range) {
        long total = inc.getTotalIncidents();
        String peakHour = inc.getPeakHourLabel() != null ? inc.getPeakHourLabel() : "17:00 - 18:00";
        long peakCount = inc.getPeakHourCount();
        double nightRate = inc.getNightIncidentRate();

        String topIssueName = "Thủng / Nổ lốp xe";
        double topIssuePct = 40.0;
        if (inc.getTopIssueTypes() != null && !inc.getTopIssueTypes().isEmpty()) {
            topIssueName = inc.getTopIssueTypes().get(0).getIssueName();
            topIssuePct = inc.getTopIssueTypes().get(0).getPercentage();
        }

        String topHotspotName = "Đà Nẵng & Hội An";
        if (inc.getTopHotspots() != null && !inc.getTopHotspots().isEmpty()) {
            topHotspotName = inc.getTopHotspots().get(0).getAddress();
        }

        double healthScore = Math.min(100.0, Math.max(0.0, 85.0 - (nightRate * 0.4) - (peakCount > 10 ? 10.0 : 0.0)));
        String healthStatus = healthScore >= 80 ? "EXCELLENT" : healthScore >= 65 ? "STABLE" : healthScore >= 45 ? "WARNING" : "CRITICAL";

        String summary = String.format(
                "Trong kỳ (%s), ghi nhận %d sự cố cứu hộ. Loại hỏng hóc phổ biến nhất là '%s' (chiếm %.1f%%). " +
                "Khung giờ cao điểm phát sinh sự cố là %s với %d ca ghi nhận; tỷ lệ sự cố ban đêm (22h - 6h) là %.1f%%. Điểm nóng tập trung nhiều nhất tại %s.",
                range, total, topIssueName, topIssuePct, peakHour, peakCount, nightRate, topHotspotName
        );

        List<AiAnalyticsInsightResponse.InsightItem> highlights = new ArrayList<>();
        if (inc.getResolutionBreakdown() != null && inc.getResolutionBreakdown().getOnsitePercentage() >= 50.0) {
            highlights.add(AiAnalyticsInsightResponse.InsightItem.builder()
                    .title("Xử lý sự cố tại chỗ chiếm tỷ trọng áp đảo")
                    .description("Đa phần sự cố được khắc phục nhanh tại hiện trường, giảm thiểu thời gian chờ kéo xe.")
                    .metric(String.format("%.1f%% (%d ca)", inc.getResolutionBreakdown().getOnsitePercentage(), inc.getResolutionBreakdown().getOnsiteCount()))
                    .build());
        }

        if (inc.getVehicleBreakdown() != null) {
            highlights.add(AiAnalyticsInsightResponse.InsightItem.builder()
                    .title("Phân bổ cân bằng theo chủng loại xe")
                    .description("Hệ thống phục vụ đồng thời cả phương tiện xe máy và ô tô theo đúng năng lực gara.")
                    .metric(String.format("Xe máy: %.0f%% | Ô tô: %.0f%%", inc.getVehicleBreakdown().getMotorbikePercentage(), inc.getVehicleBreakdown().getCarPercentage()))
                    .build());
        }

        List<AiAnalyticsInsightResponse.InsightItem> bottlenecks = new ArrayList<>();
        if (peakCount >= 3) {
            bottlenecks.add(AiAnalyticsInsightResponse.InsightItem.builder()
                    .title("Áp lực điều phối trong khung giờ cao điểm")
                    .description("Nhu cầu cứu hộ dồn cục vào khung giờ tan tầm, dễ dẫn đến thiếu thợ trực tuyến.")
                    .metric(peakCount + " ca lúc " + peakHour)
                    .build());
        }

        if (nightRate > 15.0) {
            bottlenecks.add(AiAnalyticsInsightResponse.InsightItem.builder()
                    .title("Tỷ lệ sự cố ban đêm đáng lưu ý")
                    .description("Sự cố xảy ra từ 22h - 6h sáng tiềm ẩn rủi ro khách chờ lâu do nhiều gara đóng cửa.")
                    .metric(String.format("%.1f%% ca đêm", nightRate))
                    .build());
        }

        List<AiAnalyticsInsightResponse.AiActionRecommendation> recs = new ArrayList<>();
        recs.add(AiAnalyticsInsightResponse.AiActionRecommendation.builder()
                .id("REC-INC-01")
                .title("Điều động đội cứu hộ lưu động trực chiến tại điểm nóng")
                .priority(peakCount >= 5 ? "URGENT" : "OPTIMIZATION")
                .category("HOTSPOT")
                .problemStatement("Các điểm nóng như " + topHotspotName + " có mật độ sự cố cao vào khung giờ tan tầm " + peakHour + ".")
                .proposedAction("Khuyến khích 1-2 thợ xe máy ứng trực sẵn tại ngã tư trọng điểm từ 16h30 đến 19h30.")
                .expectedImpact("Rút ngắn thời gian tiếp cận xuống dưới 10 phút và giải tỏa nhanh tình trạng ùn ứ.")
                .build());

        recs.add(AiAnalyticsInsightResponse.AiActionRecommendation.builder()
                .id("REC-INC-02")
                .title("Xây dựng danh sách Gara trực đêm chuyên trách (Night Shift)")
                .priority("OPTIMIZATION")
                .category("NIGHT_SHIFT")
                .problemStatement("Khoảng " + String.format("%.1f%%", nightRate) + " sự cố phát sinh vào ca đêm (22h - 6h) khi số lượng gara online giảm sút.")
                .proposedAction("Ký thỏa thuận trực đêm với 2-3 gara chủ lực, hỗ trợ thêm phụ cấp trực đêm trên mỗi cuốc.")
                .expectedImpact("Đảm bảo tỷ lệ đáp ứng cuốc đêm đạt > 90% và hạn chế tình trạng khách bị hủy đơn.")
                .build());

        recs.add(AiAnalyticsInsightResponse.AiActionRecommendation.builder()
                .id("REC-INC-03")
                .title("Tăng cường xe cẩu kéo chuyên dụng trên tuyến vành đai")
                .priority("STRATEGIC")
                .category("TOWING")
                .problemStatement("Sự cố ô tô trên các trục đường ngoại ô và vành đai thường đòi hỏi xe kéo sàn trượt chuyên dụng.")
                .proposedAction("Mở rộng mạng lưới liên kết với các đội xe cứu hộ cẩu kéo ngoại thành và niêm yết giá kéo cố định.")
                .expectedImpact("Mở rộng bán kính cứu trợ ô tô lên toàn tuyến và gia tăng doanh thu phí kéo xe.")
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
    public AiAnalyticsInsightResponse getPartnerAiInsights(String range, String from, String to, boolean forceRefresh) {
        String cacheKey = "PARTNERS:" + (range != null ? range : "7_DAYS") + ":" + (from != null ? from : "") + ":" + (to != null ? to : "");

        if (!forceRefresh) {
            CacheItem cached = cache.get(cacheKey);
            if (cached != null && (System.currentTimeMillis() - cached.timestamp()) < CACHE_TTL_MS) {
                log.info("Lấy AI insights Trục 4 từ Cache (key={})", cacheKey);
                AiAnalyticsInsightResponse res = cached.data();
                res.setFromCache(true);
                return res;
            }
        }

        // 1. Lấy dữ liệu phân tích hiệu suất đối tác & kỹ thuật viên thực tế
        PartnerAnalyticsResponse partnerData = adminAnalyticsService.getPartnerAnalytics(range, from, to);

        // 2. Thử gọi Gemini AI phân tích
        AiAnalyticsInsightResponse response = null;
        if (geminiApiKeyProvider.hasKeys()) {
            try {
                response = geminiApiKeyProvider.executeWithFailover(activeKey -> callGeminiForPartnerInsights(activeKey, partnerData, range));
            } catch (Exception ex) {
                log.warn("Gọi Gemini AI phân tích Trục 4 thất bại (sẽ kích hoạt heuristic fallback): {}", ex.getMessage());
            }
        }

        // 3. Fallback Heuristic Rule-based nếu Gemini lỗi hoặc chưa có key
        if (response == null) {
            response = buildFallbackPartnerInsights(partnerData, range);
        }

        response.setPillar("PARTNERS");
        response.setTimeRange(range != null ? range : "7_DAYS");
        response.setGeneratedAt(OffsetDateTime.now().toString());
        response.setFromCache(false);

        // Lưu cache
        cache.put(cacheKey, new CacheItem(response, System.currentTimeMillis()));

        return response;
    }

    /**
     * Gửi dữ liệu đối tác & thợ sang Gemini Generative Language API với JSON schema yêu cầu.
     */
    private AiAnalyticsInsightResponse callGeminiForPartnerInsights(String activeKey, PartnerAnalyticsResponse partner, String range) throws Exception {
        String dataJson = objectMapper.writeValueAsString(partner);

        String prompt = """
            Bạn là một Giám đốc Quản trị Mạng lưới Đối tác & Kỹ thuật viên (Partner Operations & Network Director) của nền tảng Cứu hộ Giao thông Khẩn cấp.
            Dưới đây là số liệu phân tích Trục 4: Hiệu suất Đối tác Gara, Đội ngũ Kỹ thuật viên & Cảnh báo Rủi ro trong kỳ (%s):
            %s

            Nhiệm vụ của bạn:
            1. Đánh giá chất lượng mạng lưới đối tác (số gara online, tỷ lệ hoàn thành cuốc networkFulfillmentRate, điểm đánh giá trung bình avgNetworkRating).
            2. Phân tích bảng xếp hạng gara (Leaderboard), nhận diện gara dẫn đầu về doanh số/đơn và phát hiện các gara bị quá tải hoặc hiệu suất giảm sút.
            3. Đánh giá đội ngũ Kỹ thuật viên (Top Technicians), mức độ hoàn thành và sự tận tụy trong phục vụ.
            4. Phân tích danh sách cảnh báo rủi ro (riskWatchlist): gara có tỷ lệ hủy cao, đánh giá thấp, hoặc có khiếu nại chưa xử lý để đề xuất chế tài/hỗ trợ kịp thời.
            5. Đưa ra 3-4 khuyến nghị hành động chiến lược (recommendations) mang tính thực thi cao cho Quản trị viên nền tảng.

            BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON theo đúng cấu trúc schema sau (không dùng markdown backticks ```json ... ```):
            {
              "executiveSummary": "Đoạn văn súc tích (3-4 câu) tổng kết năng lực mạng lưới đối tác, tỷ lệ hoàn thành, đánh giá sao, và cảnh báo trọng yếu cần chú ý.",
              "overallHealthStatus": "EXCELLENT" hoặc "STABLE" hoặc "WARNING" hoặc "CRITICAL",
              "healthScore": 85.0 (thang điểm 100),
              "highlights": [
                {
                  "title": "Tiêu đề thành tựu nổi bật của mạng lưới đối tác",
                  "description": "Mô tả chi tiết gara/kỹ thuật viên xuất sắc hoặc độ ổn định dịch vụ",
                  "metric": "Số liệu đo lường cụ thể (ví dụ: 'AutoCare Hội An: 66/91 ca, Doanh số 21.1M', 'Đánh giá thợ: 5.0 sao')"
                }
              ],
              "bottlenecks": [
                {
                  "title": "Tiêu đề rủi ro/vấn đề đối tác",
                  "description": "Mô tả nguy cơ từ các gara trong riskWatchlist hoặc tỷ lệ hủy đơn cao",
                  "metric": "Số liệu chứng minh (ví dụ: 'Gara Thành Nhân: tỷ lệ hoàn thành 40%%', '1 vụ khiếu nại tồn đọng')"
                }
              ],
              "recommendations": [
                {
                  "id": "REC-PART-01",
                  "title": "Tiêu đề hành động ngắn gọn",
                  "priority": "URGENT" (🔴 khẩn cấp trong 24h) hoặc "OPTIMIZATION" (🟡 tối ưu vận hành đối tác) hoặc "STRATEGIC" (🟢 chính sách mạng lưới),
                  "category": "RISK_WATCHLIST" hoặc "TECHNICIAN_LOAD" hoặc "REWARD_PROGRAM" hoặc "CAPACITY",
                  "problemStatement": "Chỉ rõ vấn đề/rủi ro đối tác phát hiện từ dữ liệu",
                  "proposedAction": "Hành động thực thi cụ thể cần làm",
                  "expectedImpact": "Tác động định lượng kỳ vọng đạt được"
                }
              ]
            }
            Lưu ý:
            - Phân tích đúng dựa trên số liệu thực tế được cung cấp.
            - Các đề xuất phải sát thực tế nghiệp vụ quản lý đối tác gara và thợ cứu hộ.
            - Trả về JSON thuần túy, không có markdown bọc ngoài hay chú thích thừa.
            """.formatted(range, dataJson);

        String aiText = callGeminiContent(activeKey, prompt);
        log.info("Gemini AI phân tích Trục 4 (Đối tác & Kỹ thuật viên) thành công (length={})", aiText.length());

        return objectMapper.readValue(aiText, AiAnalyticsInsightResponse.class);
    }

    /**
     * Fallback Heuristic Rule-based Engine cho Trục Đối tác khi Gemini offline hoặc rate-limit.
     */
    private AiAnalyticsInsightResponse buildFallbackPartnerInsights(PartnerAnalyticsResponse partner, String range) {
        long totalGarages = partner.getTotalGarages();
        long onlineGarages = partner.getOnlineGarages();
        long totalTechs = partner.getTotalTechnicians();
        double fulfillmentRate = partner.getNetworkFulfillmentRate();
        double avgRating = partner.getAvgNetworkRating();
        int riskCount = partner.getRiskWatchlist() != null ? partner.getRiskWatchlist().size() : 0;

        // Top Gara
        String topGarageName = "Chưa có";
        long topGarageCompleted = 0;
        long topGarageGmv = 0;
        if (partner.getTopGarages() != null && !partner.getTopGarages().isEmpty()) {
            PartnerAnalyticsResponse.GaragePerformanceStat top = partner.getTopGarages().get(0);
            topGarageName = top.getGarageName();
            topGarageCompleted = top.getCompletedJobs();
            topGarageGmv = top.getTotalGmv();
        }

        // Tính toán Health Score
        double healthScore = 80.0;
        if (fulfillmentRate >= 80.0) {
            healthScore += 10.0;
        } else if (fulfillmentRate < 60.0) {
            healthScore -= 15.0;
        }

        if (avgRating >= 4.5) {
            healthScore += 5.0;
        } else if (avgRating < 4.0 && avgRating > 0.0) {
            healthScore -= 10.0;
        }

        healthScore -= (riskCount * 6.0);
        healthScore = Math.min(100.0, Math.max(20.0, healthScore));

        String healthStatus = healthScore >= 80 ? "EXCELLENT" : healthScore >= 65 ? "STABLE" : healthScore >= 45 ? "WARNING" : "CRITICAL";

        NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
        String gmvFormatted = currencyFormat.format(topGarageGmv);

        String summary = String.format(
                "Trong kỳ (%s), mạng lưới ghi nhận %d gara đối tác (%d đang trực tuyến) cùng %d kỹ thuật viên. " +
                "Tỷ lệ hoàn thành đơn mạng lưới đạt %.1f%% với điểm đánh giá uy tín trung bình %.1f★. " +
                "Đối tác xuất sắc nhất là '%s' (%d ca hoàn thành, Doanh số %s). Hệ thống phát hiện %d gara cần lưu ý rủi ro.",
                range, totalGarages, onlineGarages, totalTechs, fulfillmentRate, avgRating, topGarageName, topGarageCompleted, gmvFormatted, riskCount
        );

        List<AiAnalyticsInsightResponse.InsightItem> highlights = new ArrayList<>();
        if (topGarageCompleted > 0) {
            highlights.add(AiAnalyticsInsightResponse.InsightItem.builder()
                    .title("Đối tác chủ lực hoạt động xuất sắc")
                    .description(String.format("Gara '%s' giữ vai trò trụ cột mạng lưới với tỷ lệ hoàn thành ấn tượng.", topGarageName))
                    .metric(String.format("%d ca hoàn thành | Doanh số %s", topGarageCompleted, gmvFormatted))
                    .build());
        }

        if (partner.getTopTechnicians() != null && !partner.getTopTechnicians().isEmpty()) {
            PartnerAnalyticsResponse.TechnicianPerformanceStat topTech = partner.getTopTechnicians().get(0);
            highlights.add(AiAnalyticsInsightResponse.InsightItem.builder()
                    .title("Kỹ thuật viên tiêu biểu đạt chất lượng dịch vụ cao")
                    .description(String.format("KTV %s (%s) dẫn đầu danh sách thợ cứu hộ với điểm đánh giá uy tín.", topTech.getStaffName(), topTech.getGarageName()))
                    .metric(String.format("%d ca | %.1f★ (%d đánh giá)", topTech.getCompletedJobs(), topTech.getAvgRating(), topTech.getRatingCount()))
                    .build());
        }

        if (partner.getCapabilityBreakdown() != null && !partner.getCapabilityBreakdown().isEmpty()) {
            highlights.add(AiAnalyticsInsightResponse.InsightItem.builder()
                    .title("Năng lực cứu hộ toàn diện")
                    .description("Mạng lưới duy trì năng lực hỗ trợ linh hoạt cho cả xe máy và ô tô con.")
                    .metric(partner.getCapabilityBreakdown().size() + " nhóm năng lực sẵn sàng")
                    .build());
        }

        List<AiAnalyticsInsightResponse.InsightItem> bottlenecks = new ArrayList<>();
        if (riskCount > 0) {
            PartnerAnalyticsResponse.GarageRiskAlert firstRisk = partner.getRiskWatchlist().get(0);
            bottlenecks.add(AiAnalyticsInsightResponse.InsightItem.builder()
                    .title("Phát hiện đối tác trong danh sách cảnh báo rủi ro")
                    .description(String.format("Gara '%s': %s. Cần kiểm tra để tránh làm gián đoạn trải nghiệm người dùng.", firstRisk.getGarageName(), firstRisk.getReason()))
                    .metric(String.format("%d đối tác cảnh báo", riskCount))
                    .build());
        }

        if (onlineGarages < (totalGarages / 2.0) && totalGarages > 0) {
            bottlenecks.add(AiAnalyticsInsightResponse.InsightItem.builder()
                    .title("Tỷ lệ Gara trực tuyến thấp hơn kỳ vọng")
                    .description("Số lượng gara mở trạng thái Online dưới 50% tổng số đối tác đã phê duyệt.")
                    .metric(String.format("%d/%d gara online", onlineGarages, totalGarages))
                    .build());
        }

        List<AiAnalyticsInsightResponse.AiActionRecommendation> recs = new ArrayList<>();
        if (riskCount > 0) {
            recs.add(AiAnalyticsInsightResponse.AiActionRecommendation.builder()
                    .id("REC-PART-01")
                    .title("Kiểm toán & Hỗ trợ kỹ thuật cho các Gara trong Risk Watchlist")
                    .priority("URGENT")
                    .category("RISK_WATCHLIST")
                    .problemStatement(String.format("Có %d gara có tỷ lệ hủy cuốc cao hoặc khiếu nại chưa xử lý dứt điểm.", riskCount))
                    .proposedAction("Bộ phận vận hành liên hệ trực tiếp trưởng trạm gara để rà soát nguyên nhân từ chối cuốc và hỗ trợ thiết bị.")
                    .expectedImpact("Giảm tỷ lệ hủy cuốc của gara rủi ro xuống dưới 15% trong vòng 7 ngày.")
                    .build());
        }

        recs.add(AiAnalyticsInsightResponse.AiActionRecommendation.builder()
                .id("REC-PART-02")
                .title("Điều tiết luồng phân bổ cứu hộ tránh quá tải cục bộ")
                .priority("OPTIMIZATION")
                .category("TECHNICIAN_LOAD")
                .problemStatement("Các gara top đầu như " + topGarageName + " gánh tỷ trọng lớn cuốc cứu hộ, tiềm ẩn nguy cơ chậm trễ vào giờ cao điểm.")
                .proposedAction("Điều chỉnh thuật toán điều phối tự động mở rộng bán kính quét sang các gara vệ tinh lân cận khi gara chính bận > 2 cuốc.")
                .expectedImpact("Cân bằng tải mạng lưới và rút ngắn thời gian điều phối trung bình 15%.")
                .build());

        recs.add(AiAnalyticsInsightResponse.AiActionRecommendation.builder()
                .id("REC-PART-03")
                .title("Triển khai chính sách thưởng Top Đối tác & Kỹ thuật viên 5 Sao")
                .priority("STRATEGIC")
                .category("REWARD_PROGRAM")
                .problemStatement("Chưa có cơ chế thưởng hoa hồng lũy tiến gắn với điểm xếp hạng và tỷ lệ hoàn thành dịch vụ.")
                .proposedAction("Giảm 2% phí hoa hồng sàn cho các gara duy trì tỷ lệ hoàn thành > 90% và điểm sao >= 4.8★ liên tục 30 ngày.")
                .expectedImpact("Tăng tỷ lệ giữ chân đối tác chất lượng cao và tạo động lực mở app trực tuyến thường xuyên.")
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

    /**
     * Tự động tổng hợp và sinh nội dung cảnh báo cho các gara có tỷ lệ hủy cao hoặc tiếp cận trễ quá chuẩn.
     */
    private List<AiAnalyticsInsightResponse.GarageActionAlert> buildGarageActionAlerts(PartnerAnalyticsResponse partnerData) {
        List<AiAnalyticsInsightResponse.GarageActionAlert> alerts = new ArrayList<>();
        if (partnerData == null || partnerData.getTopGarages() == null) {
            return alerts;
        }

        for (PartnerAnalyticsResponse.GaragePerformanceStat stat : partnerData.getTopGarages()) {
            long assigned = stat.getTotalAssigned();
            long cancelled = stat.getCancelledJobs();
            long completed = stat.getCompletedJobs();
            long arrivalMinutes = stat.getAvgArrivalTimeMinutes();
            double cancelRate = assigned > 0 ? Math.round(((double) cancelled / assigned) * 1000.0) / 10.0 : 0.0;

            boolean highCancel = (cancelled > 0 && cancelRate >= 15.0) || (cancelled >= 2) || (cancelled > 0 && completed == 0);
            boolean lateArrival = arrivalMinutes > 20;

            if (highCancel || lateArrival) {
                String issueType;
                String issueSummary;
                String draftTitle;
                String draftBody;

                if (highCancel && lateArrival) {
                    issueType = "BOTH";
                    issueSummary = String.format("Hủy %d đơn (%.1f%%), đến trễ %d phút", cancelled, cancelRate, arrivalMinutes);
                    draftTitle = String.format("[Cảnh báo vận hành] Yêu cầu chấn chỉnh tỷ lệ hủy đơn và thời gian tiếp cận cứu hộ tại %s", stat.getGarageName());
                    draftBody = String.format("Hệ thống ghi nhận trong kỳ vừa qua, gara %s có %d ca cứu hộ bị hủy (chiếm %.1f%%) và thời gian tiếp cận hiện trường trung bình lên tới %d phút (vượt ngưỡng tiêu chuẩn 20 phút). Đề nghị Quý gara rà soát lại quy trình điều phối thợ và nâng cao tính sẵn sàng để đảm bảo chất lượng dịch vụ cho khách hàng.",
                            stat.getGarageName(), cancelled, cancelRate, arrivalMinutes);
                } else if (highCancel) {
                    issueType = "HIGH_CANCELLATION";
                    issueSummary = String.format("Tỷ lệ hủy đơn %.1f%% (%d đơn bị hủy)", cancelRate, cancelled);
                    draftTitle = String.format("[Cảnh báo vận hành] Nhắc nhở tỷ lệ hủy đơn cứu hộ cao tại %s", stat.getGarageName());
                    draftBody = String.format("Hệ thống ghi nhận gara %s có %d ca cứu hộ bị hủy (tỷ lệ hủy đạt %.1f%%). Tỷ lệ hủy đơn cao làm gián đoạn trải nghiệm của khách hàng và ảnh hưởng tiêu cực đến điểm đánh giá vận hành của gara trên sàn. Vui lòng kiểm tra và hạn chế việc từ chối hoặc hủy đơn sau khi đã nhận lệnh cứu hộ.",
                            stat.getGarageName(), cancelled, cancelRate);
                } else {
                    issueType = "LATE_ARRIVAL";
                    issueSummary = String.format("Thời gian tiếp cận %d phút (chuẩn ≤ 20 phút)", arrivalMinutes);
                    draftTitle = String.format("[Cảnh báo vận hành] Yêu cầu tối ưu thời gian tiếp cận hiện trường tại %s", stat.getGarageName());
                    draftBody = String.format("Thời gian tiếp cận hiện trường trung bình của gara %s hiện đang ở mức %d phút, vượt tiêu chuẩn vận hành cam kết (dưới 20 phút). Đề nghị Quý gara tối ưu lộ trình di chuyển và sắp xếp kỹ thuật viên phản ứng nhanh hơn khi nhận lệnh điều phối.",
                            stat.getGarageName(), arrivalMinutes);
                }

                alerts.add(AiAnalyticsInsightResponse.GarageActionAlert.builder()
                        .garageId(stat.getGarageId())
                        .garageName(stat.getGarageName())
                        .phone(stat.getPhone())
                        .address(stat.getAddress())
                        .issueType(issueType)
                        .issueSummary(issueSummary)
                        .cancelRate(cancelRate)
                        .cancelledJobs(cancelled)
                        .avgArrivalMinutes(arrivalMinutes)
                        .aiDraftNotificationTitle(draftTitle)
                        .aiDraftNotificationBody(draftBody)
                        .notificationSent(false)
                        .build());
            }
        }

        alerts.sort((a, b) -> {
            int scoreA = ("BOTH".equals(a.getIssueType()) ? 3 : ("HIGH_CANCELLATION".equals(a.getIssueType()) ? 2 : 1));
            int scoreB = ("BOTH".equals(b.getIssueType()) ? 3 : ("HIGH_CANCELLATION".equals(b.getIssueType()) ? 2 : 1));
            if (scoreA != scoreB) return Integer.compare(scoreB, scoreA);
            return Long.compare(b.getCancelledJobs(), a.getCancelledJobs());
        });

        return alerts;
    }

    @Override
    @Transactional
    public void sendGarageWarningNotification(Long garageId, String title, String body) {
        Garage garage = garageRepository.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Gara với ID: " + garageId));
        User owner = garage.getOwner();
        if (owner == null) {
            throw new IllegalStateException("Gara " + garage.getName() + " chưa được liên kết với tài khoản chủ gara nào.");
        }
        notificationService.createNotification(
                owner,
                NotificationType.SYSTEM_WARNING,
                title,
                body,
                "GARAGE",
                garage.getId()
        );
        log.info("Đã gửi thông báo cảnh báo vận hành tới Chủ gara {} (User ID: {})", garage.getName(), owner.getId());
    }
}


