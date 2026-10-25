package com.sras.backend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sras.backend.dto.request.AiDiagnosisRequest;
import com.sras.backend.dto.response.AiDiagnosisResponse;
import com.sras.backend.dto.request.AiChatRequest;
import com.sras.backend.dto.response.AiChatResponse;
import com.sras.backend.service.AiDiagnosisService;
import com.sras.backend.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageServicePrice;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.GarageServicePriceRepository;
import com.sras.backend.repository.ServiceRepository;

import jakarta.annotation.PostConstruct;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiAiDiagnosisServiceImpl implements AiDiagnosisService {

    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;
    private final GarageRepository garageRepository;
    private final GarageServicePriceRepository garageServicePriceRepository;
    private final ServiceRepository serviceRepository;
    private final RestTemplate restTemplate = createRestTemplate();
    private final List<JsonNode> faultKnowledgeBase = new ArrayList<>();

    @PostConstruct
    public void initKnowledgeBase() {
        try {
            org.springframework.core.io.Resource resource = new org.springframework.core.io.ClassPathResource("knowledge/vehicle_fault_knowledge.json");
            if (resource.exists()) {
                JsonNode arrayNode = objectMapper.readTree(resource.getInputStream());
                if (arrayNode.isArray()) {
                    faultKnowledgeBase.clear();
                    for (JsonNode item : arrayNode) {
                        faultKnowledgeBase.add(item);
                    }
                    log.info("[SRAS Knowledge Base] Đã nạp thành công {} bản ghi tri thức kỹ thuật xe từ vehicle_fault_knowledge.json", faultKnowledgeBase.size());
                }
            } else {
                log.warn("[SRAS Knowledge Base] Không tìm thấy file knowledge/vehicle_fault_knowledge.json trong classpath.");
            }
        } catch (Exception e) {
            log.error("[SRAS Knowledge Base] Lỗi nạp cơ sở tri thức sự cố xe", e);
        }
    }

    public String findRelevantKnowledgeContext(String vehicleType, String symptom) {
        if (faultKnowledgeBase.isEmpty() || !StringUtils.hasText(symptom)) {
            return "";
        }
        String sLower = symptom.toLowerCase();
        String[] keywords = sLower.split("\\s+");

        List<Map.Entry<Integer, JsonNode>> scored = new ArrayList<>();
        for (JsonNode node : faultKnowledgeBase) {
            String nodeVehicle = node.path("vehicle_type").asText("");
            if (!"BOTH".equalsIgnoreCase(nodeVehicle) && StringUtils.hasText(vehicleType) && !vehicleType.equalsIgnoreCase(nodeVehicle)) {
                continue;
            }

            int score = 0;
            String nodeSymptom = node.path("symptom").asText("").toLowerCase();
            String nodeIssue = node.path("diagnosed_issue").asText("").toLowerCase();
            String nodeCategory = node.path("category").asText("").toLowerCase();

            for (String kw : keywords) {
                if (kw.length() < 2) continue;
                if (nodeSymptom.contains(kw)) score += 2;
                if (nodeIssue.contains(kw)) score += 3;
                if (nodeCategory.contains(kw)) score += 2;
            }

            if (score > 0) {
                scored.add(new AbstractMap.SimpleEntry<>(score, node));
            }
        }

        scored.sort((a, b) -> Integer.compare(b.getKey(), a.getKey()));
        if (scored.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("\n=== KIẾN THỨC KỸ THUẬT XE THỰC TẾ THAM KHẢO ===\n");
        int limit = Math.min(3, scored.size());
        for (int i = 0; i < limit; i++) {
            JsonNode item = scored.get(i).getValue();
            sb.append(String.format("• Ca bệnh tham khảo (%s - %s):\n",
                    item.path("vehicle_type").asText(), item.path("category").asText()));
            sb.append("  - Hiện tượng nhận diện: ").append(item.path("symptom").asText()).append("\n");
            sb.append("  - Chẩn đoán hư hỏng: ").append(item.path("diagnosed_issue").asText()).append("\n");
            sb.append("  - Phân loại sự cố: ").append(item.path("suggested_issue_type").asText()).append(" (Mức độ: ").append(item.path("severity").asText()).append(")\n");
            sb.append("  - Dịch vụ đề xuất: ").append(item.path("suggested_service").asText()).append("\n");
            sb.append("  - Hướng xử lý an toàn: ").append(item.path("emergency_advice").asText()).append("\n");
            JsonNode steps = item.path("troubleshooting_steps");
            if (steps.isArray() && steps.size() > 0) {
                sb.append("  - Các bước khắc phục đề xuất: ");
                List<String> stepList = new ArrayList<>();
                for (JsonNode st : steps) {
                    stepList.add(st.asText());
                }
                sb.append(String.join("; ", stepList)).append("\n");
            }
            sb.append("\n");
        }
        sb.append("DỰA VÀO KIẾN THỨC KỸ THUẬT TRÊN ĐỂ ĐƯA RA TÊN BỆNH, NGUYÊN NHÂN VÀ HƯỚNG XỬ LÝ CHUẨN XÁC NHẤT!\n");
        return sb.toString();
    }

    private static RestTemplate createRestTemplate() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8000);
        factory.setReadTimeout(20000);
        return new RestTemplate(factory);
    }

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-3.5-flash-lite}")
    private String geminiModel;

    private static final String GEMINI_API_URL_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private static final List<String> CANDIDATE_MODELS = List.of(
            "gemini-3.5-flash-lite",
            "gemini-flash-latest",
            "gemini-3.5-flash",
            "gemini-3.8-flash"
    );

    @Override
    public AiDiagnosisResponse diagnoseBreakdown(AiDiagnosisRequest request) {
        String symptom = request.getSymptomDescription() != null ? request.getSymptomDescription().trim() : "";
        String vehicleType = StringUtils.hasText(request.getVehicleType()) ? request.getVehicleType().trim() : "MOTORBIKE";
        String vehicleModel = StringUtils.hasText(request.getVehicleModel()) ? request.getVehicleModel().trim() : (vehicleType.equals("CAR") ? "Ô tô phổ thông" : "Xe máy phổ thông");

        if (StringUtils.hasText(geminiApiKey)) {
            // Danh sách các model thử nghiệm theo thứ tự ưu tiên
            Set<String> modelsToTry = new LinkedHashSet<>();
            if (StringUtils.hasText(geminiModel)) {
                modelsToTry.add(geminiModel);
            }
            modelsToTry.addAll(CANDIDATE_MODELS);

            Exception lastEx = null;
            for (String model : modelsToTry) {
                try {
                    return callGeminiApi(model, vehicleType, vehicleModel, symptom, request.getPhotoUrls());
                } catch (Exception e) {
                    lastEx = e;
                    log.warn("[Gemini AI] Model {} failed ({}). Trying next model if available...", model, e.getMessage());
                }
            }
            log.error("[Gemini AI] All Gemini models failed: {}", lastEx != null ? lastEx.getMessage() : "unknown error", lastEx);
            return fallbackRuleBasedDiagnosis(vehicleType, vehicleModel, symptom, "Hệ thống AI tạm bận, đang dùng bộ chẩn đoán dự phòng.");
        } else {
            log.warn("[Gemini AI] GEMINI_API_KEY is not configured. Falling back to rule-based diagnostic engine.");
            return fallbackRuleBasedDiagnosis(vehicleType, vehicleModel, symptom, "Chưa kích hoạt GEMINI_API_KEY trên server.");
        }
    }

    private AiDiagnosisResponse callGeminiApi(String modelToUse, String vehicleType, String vehicleModel, String symptom, List<String> photoUrls) throws Exception {
        String endpoint = String.format(GEMINI_API_URL_TEMPLATE, modelToUse, geminiApiKey);

        // System prompt chuyên gia xe máy / ô tô Việt Nam
        String systemInstruction = """
                Bạn là một kỹ sư chẩn đoán kỹ thuật cứu hộ xe máy và ô tô giàu kinh nghiệm tại Việt Nam thuộc hệ thống SRAS (Smart Roadside Assistance System).
                Nhiệm vụ của bạn là phân tích triệu chứng (qua âm thanh/mô tả của tài xế và hình ảnh đính kèm nếu có) để:
                1. Nhận diện chính xác sự cố kỹ thuật hoặc hư hỏng.
                   ĐẶC BIỆT CHÚ Ý QUAN SÁT HÌNH ẢNH:
                   - KIỂM TRA TÍNH HỢP LỆ CỦA DỮ LIỆU ĐẦU VÀO:
                     + TRƯỜNG HỢP 1 (Tài xế KHÔNG gửi ảnh, chỉ nhập chữ hoặc nói giọng nói):
                       Nếu mô tả KHÔNG liên quan đến sự cố kỹ thuật xe cộ (ví dụ: tâm sự cảm xúc "Hôm nay tôi buồn", "thất tình", chào hỏi "alo", "hello", nói chuyện thời tiết, đồ ăn, trêu đùa):
                       * BẮT BUỘC chẩn đoán "diagnosedIssue": "Mô tả không liên quan đến sự cố xe"
                       * "confidence": "THAP"
                       * "confidenceScore": 10
                       * "severity": "NHE"
                       * "emergencyAdvice": "Mô tả của bạn không chứa thông tin về sự cố xe. Vui lòng nhập đúng hiện tượng xe gặp phải (ví dụ: xe không đề được, chết máy, thủng lốp...) hoặc chụp ảnh xe để AI chẩn đoán."
                       * "suggestedIssueType": "OTHER"
                       * "suggestedService": "Tư vấn kiểm tra sự cố"
                       * "autoFilledNote": "Chưa rõ triệu chứng xe (nội dung mô tả không liên quan)"
                       * "troubleshootingSteps": [
                           "Vui lòng nhập rõ hiện tượng hư hỏng của xe (tiếng kêu, đề không nổ, khói bốc ra...)",
                           "Hoặc chụp ảnh bộ phận xe nghi bị hỏng để AI phân tích"
                         ]
                     + TRƯỜNG HỢP 2 (Tài xế CÓ gửi hình ảnh đính kèm):
                       Nếu hình ảnh gửi lên KHÔNG LIÊN QUAN ĐẾN XE CỘ / GIAO THÔNG (ví dụ: ảnh chân dung người, đồ ăn thức uống, phong cảnh, động vật, màn hình máy tính, tài liệu không liên quan, ảnh chụp mờ đen xì không thấy gì):
                       * BẮT BUỘC chẩn đoán "diagnosedIssue": "Hình ảnh không liên quan đến sự cố xe"
                       * "confidence": "THAP"
                       * "confidenceScore": 10
                       * "severity": "NHE"
                       * "emergencyAdvice": "Hình ảnh bạn gửi không thể hiện sự cố phương tiện. Vui lòng chụp rõ vị trí hư hỏng trên xe (lốp xe, táp-lô, động cơ) hoặc mô tả triệu chứng bằng chữ/giọng nói để AI chẩn đoán chính xác."
                       * "suggestedIssueType": "OTHER"
                       * "suggestedService": "Kiểm tra sự cố trực tiếp"
                       * "autoFilledNote": "Cần thợ kiểm tra trực tiếp (ảnh chụp không liên quan hoặc không rõ sự cố)"
                       * "troubleshootingSteps": [
                           "Vui lòng chụp lại ảnh cận cảnh bộ phận xe nghi ngờ bị hỏng",
                           "Hoặc mô tả chi tiết biểu hiện của xe bằng giọng nói/tin nhắn"
                         ]
                   - Nếu có hình ảnh hoặc mô tả liên quan đến sự cố xe: Hãy quan sát thật kỹ để chẩn đoán chính xác:
                     + Nếu thấy bánh xe / lốp xe (bị xẹp, cán đinh, rách, nứt, non hơi, cong méo vành) -> BẮT BUỘC chẩn đoán là sự cố thủng lốp / xẹp lốp (mã "FLAT_TIRE"), dịch vụ "Vá lốp / Thay lốp lưu động", KHÔNG ĐƯỢC đoán mơ hồ.
                     + Nếu thấy bảng đồng hồ táp-lô có đèn báo (check engine, bình ắc quy, áp suất dầu, nhiệt độ két nước) -> chỉ rõ lỗi của đèn báo đó.
                     + Nếu thấy lốc máy / gầm xe rò rỉ dầu nhớt, nước làm mát -> chẩn đoán mã "ENGINE_FAILURE".
                     + Nếu thấy vỡ vỏ xe, móp méo cản trước/sau, gãy càng -> chẩn đoán mã "ACCIDENT".
                   - Nếu tài xế không ghi mô tả chi tiết bằng chữ, BẮT BUỘC bạn phải dựa vào hình ảnh đính kèm để gọi đúng tên bệnh cụ thể, TUYỆT ĐỐI KHÔNG đoán chung chung là "Sự cố kỹ thuật ô tô qua hình ảnh".
                2. Phân loại vào 1 trong các mã sự cố hệ thống:
                   - "DEAD_BATTERY" (hết ắc quy, đề tạch tạch, yếu điện, còi không kêu)
                   - "FLAT_TIRE" (thủng lốp, rách lốp, non hơi, cán đinh, xẹp bánh)
                   - "ENGINE_FAILURE" (chết máy, tắt máy đột ngột khi đang chạy, hụt ga, đề không nổ, đứt curoa, lột dên, bó máy, quá nhiệt, đèn check engine)
                   - "OUT_OF_FUEL" (hết xăng, chết máy do cạn bình xăng)
                   - "ACCIDENT" (tai nạn đâm va, gãy càng, cong vành, đổ ngã vỡ yếm)
                   - "OTHER" (sự cố khác hoặc không xác định)
                3. Đưa ra lời khuyên an toàn tức thì cho tài xế.
                4. Tạo 1 câu tóm tắt chuẩn mực để tự động điền vào ghi chú gửi cho thợ cứu hộ.
                5. QUY TẮC DIỄN ĐẠT:
                   - Trả lời tự nhiên, chuyên nghiệp như chuyên gia kỹ thuật xe.
                   - TUYỆT ĐỐI KHÔNG trích dẫn các mã định danh nội bộ (như HD_..., DASH_LIGHT_...) hoặc nói "theo cơ sở tri thức", "theo sổ tay trang xx".
                   - CHỈ nêu rõ: Tên bệnh/sự cố, nguyên nhân chính, hướng xử lý an toàn tại chỗ và dịch vụ cứu hộ phù hợp.

                QUAN TRỌNG: Bạn BẮT BUỘC phải trả về định dạng JSON thuần với cấu trúc sau:
                {
                  "diagnosedIssue": "Tên sự cố ngắn gọn chính xác (ví dụ: 'Xe bị xẹp lốp / Thủng lốp')",
                  "confidence": "CAO hoặc TRUNG_BINH hoặc THAP",
                  "confidenceScore": 90,
                  "severity": "NGUY_HIEM hoặc CANH_BAO hoặc NHE",
                  "emergencyAdvice": "Lời khuyên tức thì cho tài xế để đảm bảo an toàn",
                  "suggestedIssueType": "DEAD_BATTERY hoặc FLAT_TIRE hoặc ENGINE_FAILURE hoặc OUT_OF_FUEL hoặc ACCIDENT hoặc OTHER",
                  "suggestedService": "Tên dịch vụ đề xuất (ví dụ: 'Cứu hộ vá lốp / Thay lốp lưu động')",
                  "autoFilledNote": "Câu tóm tắt gửi thợ cứu hộ (ví dụ: 'Xe ô tô bị thủng lốp, cần thợ mang đồ nghề vá hoặc lốp dự phòng')",
                  "troubleshootingSteps": [
                    "Bước kiểm tra nhanh 1",
                    "Bước kiểm tra nhanh 2"
                  ]
                }
                """;

        boolean hasPhotos = photoUrls != null && !photoUrls.isEmpty();
        List<Map<String, Object>> parts = new ArrayList<>();
        StringBuilder promptText = new StringBuilder();
        promptText.append(String.format("Loại phương tiện: %s\n", vehicleType.equals("CAR") ? "Ô TÔ" : "XE MÁY"));
        promptText.append(String.format("Dòng xe chi tiết: %s\n", vehicleModel));
        promptText.append(String.format("Hình ảnh đính kèm: %s\n", hasPhotos ? "CÓ " + photoUrls.size() + " ẢNH" : "KHÔNG CÓ ẢNH"));
        promptText.append(String.format("Triệu chứng mô tả bởi tài xế: %s\n", symptom.isEmpty() ? "(Tài xế không ghi mô tả bằng chữ, hãy quan sát kỹ ảnh đính kèm)" : symptom));
        
        // Grounding tri thức thực tế tại Việt Nam vào prompt
        String knowledgeContext = findRelevantKnowledgeContext(vehicleType, symptom);
        if (StringUtils.hasText(knowledgeContext)) {
            promptText.append("\n").append(knowledgeContext).append("\n");
        }

        parts.add(Map.of("text", promptText.toString()));

        // Nạp ảnh nếu có (tối đa 2 ảnh đầu tiên để tối ưu tốc độ)
        if (photoUrls != null && !photoUrls.isEmpty()) {
            int count = 0;
            for (String photoUrl : photoUrls) {
                if (count >= 2) break;
                try {
                    String fileName = extractFileNameFromUrl(photoUrl);
                    byte[] imageBytes = fileStorageService.getFileData(fileName);
                    if (imageBytes != null && imageBytes.length > 0) {
                        String mimeType = photoUrl.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
                        String base64Data = Base64.getEncoder().encodeToString(imageBytes);
                        parts.add(Map.of(
                                "inlineData", Map.of(
                                        "mimeType", mimeType,
                                        "data", base64Data
                                )
                        ));
                        log.info("[Gemini AI] Đã đính kèm ảnh thành công: {} ({} bytes, type={})", fileName, imageBytes.length, mimeType);
                        count++;
                    } else {
                        log.warn("[Gemini AI] Không tìm thấy dữ liệu ảnh trên máy chủ: {} (raw={})", fileName, photoUrl);
                    }
                } catch (Exception ex) {
                    log.warn("[Gemini AI] Could not attach photo {} to prompt: {}", photoUrl, ex.getMessage());
                }
            }
        }

        Map<String, Object> requestBody = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))),
                "contents", List.of(Map.of("parts", parts)),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "temperature", 0.2
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(endpoint, entity, String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Gemini returned non-200 status: " + response.getStatusCode());
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode candidate = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
        String jsonText = candidate.asText();

        return objectMapper.readValue(jsonText, AiDiagnosisResponse.class);
    }

    private String extractFileNameFromUrl(String url) {
        if (url == null) return "";
        int lastSlash = url.lastIndexOf('/');
        return lastSlash >= 0 ? url.substring(lastSlash + 1) : url;
    }

    /**
     * Thuật toán chẩn đoán dự phòng bằng quy tắc chuyên sâu khi chưa có API Key hoặc mạng lỗi
     */
    private AiDiagnosisResponse fallbackRuleBasedDiagnosis(String vehicleType, String vehicleModel, String symptom, String hint) {
        String lower = symptom.toLowerCase();

        // 1. Ưu tiên tra cứu trực tiếp trong Cơ sở tri thức chuẩn đã cào từ sổ tay thợ xe máy / gara
        if (!faultKnowledgeBase.isEmpty() && StringUtils.hasText(symptom)) {
            String[] keywords = lower.split("\\s+");
            JsonNode bestMatch = null;
            int maxScore = 0;

            for (JsonNode node : faultKnowledgeBase) {
                String nodeVehicle = node.path("vehicle_type").asText("");
                if (!"BOTH".equalsIgnoreCase(nodeVehicle) && StringUtils.hasText(vehicleType) && !vehicleType.equalsIgnoreCase(nodeVehicle)) {
                    continue;
                }

                int score = 0;
                String nodeSymptom = node.path("symptom").asText("").toLowerCase();
                String nodeIssue = node.path("diagnosed_issue").asText("").toLowerCase();
                for (String kw : keywords) {
                    if (kw.length() < 2) continue;
                    if (nodeSymptom.contains(kw)) score += 2;
                    if (nodeIssue.contains(kw)) score += 3;
                }

                if (score > maxScore) {
                    maxScore = score;
                    bestMatch = node;
                }
            }

            if (bestMatch != null && maxScore >= 4) {
                String matchIssue = bestMatch.path("diagnosed_issue").asText();
                String matchType = bestMatch.path("suggested_issue_type").asText();
                String matchSeverity = bestMatch.path("severity").asText();
                String matchAdvice = bestMatch.path("emergency_advice").asText();
                String matchService = bestMatch.path("suggested_service").asText();
                List<String> matchSteps = new ArrayList<>();
                JsonNode stepsNode = bestMatch.path("troubleshooting_steps");
                if (stepsNode.isArray()) {
                    for (JsonNode st : stepsNode) {
                        matchSteps.add(st.asText());
                    }
                }

                String autoNote = String.format("%s: %s (Chẩn đoán: %s)", vehicleModel, symptom, matchIssue);

                return AiDiagnosisResponse.builder()
                        .diagnosedIssue(matchIssue)
                        .confidence("CAO")
                        .confidenceScore(92)
                        .severity(matchSeverity)
                        .emergencyAdvice(matchAdvice)
                        .suggestedIssueType(matchType)
                        .suggestedService(matchService)
                        .autoFilledNote(autoNote)
                        .troubleshootingSteps(matchSteps)
                        .build();
            }
        }

        // 2. Dự phòng theo quy tắc từ khóa cơ bản
        String issueType = "OTHER";
        String diagnosedIssue = "Sự cố cơ khí / Cần thợ kiểm tra trực tiếp";
        String severity = "CANH_BAO";
        String advice = "Hãy dắt xe gọn vào lề đường an toàn và bật đèn cảnh báo nếu có.";
        String service = "Kiểm tra sự cố lưu động";
        int score = 82;
        List<String> steps = new ArrayList<>();

        if (lower.contains("đề") && (lower.contains("không") || lower.contains("tạch") || lower.contains("yếu") || lower.contains("bình") || lower.contains("ắc quy") || lower.contains("acquy"))
                || lower.contains("hết điện") || lower.contains("hết bình") || lower.contains("còi không kêu")) {
            issueType = "DEAD_BATTERY";
            diagnosedIssue = "Hết bình ắc quy / Củ đề mất tiếp xúc";
            severity = "CANH_BAO";
            advice = "Không nên cố bấm đề liên tục để tránh cháy củ đề và kiệt bình.";
            service = "Kích bình / Thay ắc quy lưu động";
            score = 90;
            steps.add("Thử bấm còi hoặc bật xi-nhan để kiểm tra xem điện bình còn mạnh không.");
            steps.add("Kiểm tra xem công tắc chân chống nghiêng đã gạt lên hết chưa.");
        } else if (lower.contains("lốp") || lower.contains("săm") || lower.contains("xăm") || lower.contains("đinh") || lower.contains("bánh") || lower.contains("non hơi") || lower.contains("xẹp") || lower.contains("thủng")) {
            issueType = "FLAT_TIRE";
            diagnosedIssue = "Thủng lốp / Cán đinh hoặc xì hơi bánh xe";
            severity = "CANH_BAO";
            advice = "Không nên cố chạy xe với lốp xẹp để tránh méo vành và rách săm/lốp.";
            service = "Vá lốp / Thay săm lưu động";
            score = 92;
            steps.add("Kiểm tra bề mặt lốp tìm đinh hoặc dị vật găm vào.");
            steps.add("Không tự ý rút đinh ra nếu chưa có đồ nghề vá chuyên dụng.");
        } else if (lower.contains("xăng") || lower.contains("cạn bình") || lower.contains("hết xăng")) {
            issueType = "OUT_OF_FUEL";
            diagnosedIssue = "Hết xăng hoặc nghẹt đường dẫn nhiên liệu";
            severity = "NHE";
            advice = "Dựng chân chống giữa và lắc nhẹ bình xăng để kiểm tra lượng xăng còn lại.";
            service = "Tiếp xăng khẩn cấp";
            score = 88;
            steps.add("Mở nắp bình xăng kiểm tra mức xăng thực tế.");
        } else if (lower.contains("tai nạn") || lower.contains("va chạm") || lower.contains("đâm") || lower.contains("gãy") || lower.contains("ngã") || lower.contains("móp")) {
            issueType = "ACCIDENT";
            diagnosedIssue = "Hư hỏng do va chạm / Tai nạn giao thông";
            severity = "NGUY_HIEM";
            advice = "Nếu có người bị thương hãy gọi 115 ngay. Di chuyển phương tiện vào lề an toàn nếu có thể.";
            service = "Cứu hộ kéo xe về gara đối tác";
            score = 95;
            steps.add("Tắt khóa điện ngay để tránh chập cháy dây điện hoặc rò rỉ xăng.");
        } else if (lower.contains("tắt máy") || lower.contains("chết máy") || lower.contains("khựng") || lower.contains("giật")
                || lower.contains("hụt ga") || lower.contains("không nổ") || lower.contains("curoa") || lower.contains("nhớt")
                || lower.contains("bó máy") || lower.contains("bugi") || lower.contains("khói") || lower.contains("đèn fi") || lower.contains("cá vàng")) {
            issueType = "ENGINE_FAILURE";
            diagnosedIssue = "Hỏng động cơ / Chết máy đột ngột (Bugi/Nhiên liệu/Dây curoa)";
            severity = "NGUY_HIEM";
            advice = "Tấp xe vào lề đường ngay, tắt khóa điện để tránh bó máy hoặc hỏng pít-tông nghiêm trọng hơn.";
            service = "Cứu hộ sửa chữa động cơ / Kéo xe về gara";
            score = 88;
            steps.add("Chờ động cơ nguội bớt, kiểm tra xem que thăm nhớt còn nhớt không.");
            steps.add("Kiểm tra nắp chụp bugi có bị bung hoặc ướt nước không.");
            steps.add("Bật khóa điện lắng nghe bơm xăng có kêu rè rè không.");
        }

        String autoNote = String.format("%s: %s (AI gợi ý: %s)", vehicleModel, symptom.isEmpty() ? diagnosedIssue : symptom, diagnosedIssue);

        return AiDiagnosisResponse.builder()
                .diagnosedIssue(diagnosedIssue)
                .confidence("CAO")
                .confidenceScore(score)
                .severity(severity)
                .emergencyAdvice(advice)
                .suggestedIssueType(issueType)
                .suggestedService(service)
                .autoFilledNote(autoNote)
                .troubleshootingSteps(steps)
                .build();
    }

    @Override
    public String transcribeVoice(org.springframework.web.multipart.MultipartFile voiceFile) {
        if (voiceFile == null || voiceFile.isEmpty()) {
            throw new IllegalArgumentException("File ghi âm không được để trống");
        }
        if (!StringUtils.hasText(geminiApiKey)) {
            throw new IllegalStateException("Hệ thống chưa cấu hình GEMINI_API_KEY để nhận diện giọng nói.");
        }

        try {
            byte[] audioBytes = voiceFile.getBytes();
            String contentType = voiceFile.getContentType();
            String filename = voiceFile.getOriginalFilename() != null ? voiceFile.getOriginalFilename().toLowerCase() : "";

            if (!StringUtils.hasText(contentType) || contentType.equals("application/octet-stream")) {
                if (filename.endsWith(".m4a") || filename.endsWith(".mp4")) {
                    contentType = "audio/mp4";
                } else if (filename.endsWith(".wav")) {
                    contentType = "audio/wav";
                } else if (filename.endsWith(".mp3")) {
                    contentType = "audio/mp3";
                } else if (filename.endsWith(".webm")) {
                    contentType = "audio/webm";
                } else {
                    contentType = "audio/mp4";
                }
            }

            Set<String> modelsToTry = new LinkedHashSet<>();
            if (StringUtils.hasText(geminiModel)) {
                modelsToTry.add(geminiModel);
            }
            modelsToTry.addAll(CANDIDATE_MODELS);

            Exception lastEx = null;
            for (String model : modelsToTry) {
                try {
                    return callGeminiAudioTranscription(model, audioBytes, contentType);
                } catch (Exception e) {
                    lastEx = e;
                    log.warn("[Gemini AI] Voice transcription model {} failed ({}). Trying next...", model, e.getMessage());
                }
            }
            throw (lastEx != null ? lastEx : new RuntimeException("Không thể nhận diện giọng nói."));
        } catch (Exception e) {
            log.error("[Gemini AI] Error transcribing voice file: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi phân tích giọng nói: " + e.getMessage());
        }
    }

    private String callGeminiAudioTranscription(String modelToUse, byte[] audioBytes, String mimeType) throws Exception {
        String endpoint = String.format(GEMINI_API_URL_TEMPLATE, modelToUse, geminiApiKey);

        String prompt = """
                Bạn là trợ lý nhận dạng giọng nói tiếng Việt cho hệ thống cứu hộ giao thông SRAS.
                Hãy nghe đoạn ghi âm sau của khách hàng và trích xuất chính xác lời nói của họ mô tả về sự cố xe hoặc tình trạng hư hỏng thành văn bản tiếng Việt.
                Yêu cầu:
                - Chỉ trả về đúng nội dung câu nói của khách hàng bằng tiếng Việt có dấu.
                - Không thêm bất kỳ lời bình luận, lời chào, định dạng markdown hay dấu ngoặc kép nào.
                """;

        String base64Audio = Base64.getEncoder().encodeToString(audioBytes);

        List<Map<String, Object>> parts = List.of(
                Map.of("text", prompt),
                Map.of("inlineData", Map.of(
                        "mimeType", mimeType,
                        "data", base64Audio
                ))
        );

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", parts)),
                "generationConfig", Map.of(
                        "temperature", 0.1
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(endpoint, entity, String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Gemini returned non-200 status: " + response.getStatusCode());
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode candidate = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
        String transcribed = candidate.asText();
        if (transcribed == null) return "";
        return transcribed.trim().replaceAll("^\"|\"$", "");
    }

    @Override
    public AiChatResponse chat(AiChatRequest request) {
        if (request == null || request.getMessages() == null || request.getMessages().isEmpty()) {
            return AiChatResponse.builder()
                    .reply("Chào bạn! Tôi là Trợ lý AI cứu hộ SRAS 24/7. Bạn đang gặp sự cố xe gì hay cần hỗ trợ kiểm tra xe trên đường không?")
                    .isRescueProposal(false)
                    .build();
        }

        if (!StringUtils.hasText(geminiApiKey)) {
            log.warn("[Gemini AI] GEMINI_API_KEY is not configured. Using rule-based fallback chat.");
            return fallbackRuleBasedChat(request);
        }

        Set<String> modelsToTry = new LinkedHashSet<>();
        if (StringUtils.hasText(geminiModel)) {
            modelsToTry.add(geminiModel);
        }
        modelsToTry.addAll(CANDIDATE_MODELS);

        Exception lastEx = null;
        for (String model : modelsToTry) {
            try {
                return callGeminiChat(model, request);
            } catch (Exception e) {
                lastEx = e;
                log.warn("[Gemini AI] Chat model {} failed ({}). Trying next...", model, e.getMessage());
            }
        }

        log.error("[Gemini AI] All chat candidate models failed. Falling back to rule-based chat.", lastEx);
        return fallbackRuleBasedChat(request);
    }

    private double calculateDistanceKm(double lat1, double lng1, double lat2, double lng2) {
        double earthRadius = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(earthRadius * c * 10.0) / 10.0;
    }

    private String buildDatabaseGroundingContext(Double userLat, Double userLng, String vehicleType) {
        StringBuilder sb = new StringBuilder();
        try {
            List<Garage> allApproved = garageRepository.findByStatusAndIsDeletedFalse(GarageStatus.APPROVED);
            if (allApproved == null || allApproved.isEmpty()) {
                sb.append("Hiện tại chưa có gara nào được phê duyệt trong hệ thống.\n");
                return sb.toString();
            }

            // Sắp xếp gara theo khoảng cách gần nhất nếu có GPS khách
            if (userLat != null && userLng != null) {
                allApproved.sort((g1, g2) -> {
                    Double d1 = (g1.getLat() != null && g1.getLng() != null)
                            ? calculateDistanceKm(userLat, userLng, g1.getLat(), g1.getLng()) : 999999.0;
                    Double d2 = (g2.getLat() != null && g2.getLng() != null)
                            ? calculateDistanceKm(userLat, userLng, g2.getLat(), g2.getLng()) : 999999.0;
                    return d1.compareTo(d2);
                });
            }

            sb.append("DANH SÁCH GARA THỰC TẾ TRONG HỆ THỐNG SRAS (DATABASE LIVE):\n");
            for (int i = 0; i < allApproved.size(); i++) {
                Garage g = allApproved.get(i);
                boolean isOnline = Boolean.TRUE.equals(g.getIsOnline());
                sb.append(String.format("%d. Gara: \"%s\" (ID: %d)\n", i + 1, g.getName(), g.getId()));
                sb.append(String.format("   - Trạng thái trực: %s\n", isOnline ? "ĐANG TRỰC ONLINE (SẴN SÀNG NHẬN ĐƠN NGAY)" : "NGOẠI TUYẾN / NGHỈ TRỰC"));
                sb.append(String.format("   - Địa chỉ: %s\n", g.getAddress() != null ? g.getAddress() : "Chưa cập nhật"));
                sb.append(String.format("   - Hotline liên hệ: %s\n", g.getPhone() != null ? g.getPhone() : "1900 6868"));
                sb.append(String.format("   - Khả năng phục vụ: %s | Đánh giá uy tín: %.1f sao (%d lượt)\n",
                        g.getCapability() != null ? g.getCapability().name() : "Chung",
                        g.getAvgRating() != null ? g.getAvgRating().doubleValue() : 5.0,
                        g.getRatingCount() != null ? g.getRatingCount() : 0));

                if (userLat != null && userLng != null && g.getLat() != null && g.getLng() != null) {
                    double dist = calculateDistanceKm(userLat, userLng, g.getLat(), g.getLng());
                    long travelFeeBike = Math.max(30000L, Math.round(15000.0 * dist / 1000.0) * 1000L);
                    long travelFeeCar = Math.max(50000L, Math.round(25000.0 * dist / 1000.0) * 1000L);
                    sb.append(String.format("   - Khoảng cách đến vị trí khách: %.1f km\n", dist));
                    sb.append(String.format("   - Phí di chuyển dự kiến đến khách: Xe máy: %,d đ (15.000đ/km, cước sàn 30k) | Ô tô: %,d đ (25.000đ/km, cước sàn 50k)\n",
                            travelFeeBike, travelFeeCar));
                }

                // Bảng giá riêng của gara
                try {
                    List<GarageServicePrice> prices = garageServicePriceRepository.findByGarage(g);
                    if (prices != null && !prices.isEmpty()) {
                        List<String> priceStrs = new ArrayList<>();
                        for (GarageServicePrice p : prices) {
                            if (Boolean.TRUE.equals(p.getIsActive()) && p.getService() != null) {
                                priceStrs.add(String.format("%s: %,d đ", p.getService().getName(), p.getPrice()));
                            }
                        }
                        if (!priceStrs.isEmpty()) {
                            sb.append("   - Bảng giá dịch vụ niêm yết của gara: ").append(String.join(", ", priceStrs)).append("\n");
                        }
                    }
                } catch (Exception ex) {
                    // ignore
                }
            }

            // Dịch vụ chuẩn hệ thống
            try {
                List<com.sras.backend.entity.Service> services = serviceRepository.findAll();
                if (services != null && !services.isEmpty()) {
                    sb.append("\nBẢNG GIÁ DỊCH VỤ TIÊU CHUẨN TOÀN HỆ THỐNG SRAS:\n");
                    for (com.sras.backend.entity.Service s : services) {
                        if (Boolean.TRUE.equals(s.getIsActive())) {
                            sb.append(String.format("• %s: %,d đ - %,d đ / %s\n",
                                    s.getName(),
                                    s.getMinPrice() != null ? s.getMinPrice() : 0,
                                    s.getMaxPrice() != null ? s.getMaxPrice() : 0,
                                    s.getUnit() != null ? s.getUnit().name() : "Lần"));
                        }
                    }
                }
            } catch (Exception ex) {
                // ignore
            }

        } catch (Exception e) {
            log.error("[Gemini AI] Error building database grounding context", e);
            sb.append("Không thể nạp dữ liệu gara trực tiếp từ database.\n");
        }
        return sb.toString();
    }

    private AiChatResponse callGeminiChat(String modelToUse, AiChatRequest request) throws Exception {
        String endpoint = String.format(GEMINI_API_URL_TEMPLATE, modelToUse, geminiApiKey);

        // 1. Nạp ảnh trước nếu có (từ photoUrls hoặc từ tin nhắn của khách)
        List<String> photosToAnalyze = new ArrayList<>();
        if (request.getPhotoUrls() != null) {
            photosToAnalyze.addAll(request.getPhotoUrls());
        }
        if (request.getMessages() != null) {
            for (AiChatRequest.ChatMessage msg : request.getMessages()) {
                if (StringUtils.hasText(msg.getImageUrl()) && !photosToAnalyze.contains(msg.getImageUrl())) {
                    photosToAnalyze.add(msg.getImageUrl());
                }
            }
        }

        List<Map<String, Object>> imageParts = new ArrayList<>();
        int photoCount = 0;
        for (String photoUrl : photosToAnalyze) {
            if (photoCount >= 3) break;
            try {
                String fileName = extractFileNameFromUrl(photoUrl);
                byte[] imageBytes = fileStorageService.getFileData(fileName);
                if (imageBytes != null && imageBytes.length > 0) {
                    String mimeType = photoUrl.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
                    String base64Data = Base64.getEncoder().encodeToString(imageBytes);
                    imageParts.add(Map.of(
                            "inlineData", Map.of(
                                    "mimeType", mimeType,
                                    "data", base64Data
                            )
                    ));
                    photoCount++;
                    log.info("[Gemini AI Chat] Đã nạp thành công ảnh Base64 cho Gemini: {} ({} bytes, mime={})", fileName, imageBytes.length, mimeType);
                } else {
                    log.warn("[Gemini AI Chat] Không tìm thấy dữ liệu ảnh trên máy chủ: {} (raw={})", fileName, photoUrl);
                }
            } catch (Exception ex) {
                log.warn("[Gemini AI Chat] Failed to load chat image: {}", photoUrl, ex);
            }
        }

        StringBuilder historyBuilder = new StringBuilder();
        historyBuilder.append("HỘI THOẠI TRƯỚC ĐÓ GIỮA KHÁCH HÀNG VÀ BẠN:\n");
        for (AiChatRequest.ChatMessage msg : request.getMessages()) {
            String roleName = "user".equalsIgnoreCase(msg.getRole()) ? "Khách hàng" : "Trợ lý AI SRAS";
            historyBuilder.append(roleName).append(": ").append(msg.getContent());
            if (StringUtils.hasText(msg.getImageUrl())) {
                historyBuilder.append(" [Có gửi kèm ảnh xe]");
            }
            historyBuilder.append("\n");
        }

        String locationContext = StringUtils.hasText(request.getUserLocation())
                ? "Vị trí hiện tại của khách: " + request.getUserLocation()
                : (request.getLat() != null && request.getLng() != null
                    ? "Tọa độ GPS khách: " + request.getLat() + ", " + request.getLng()
                    : "Chưa rõ vị trí chính xác");

        String vehicleContext = StringUtils.hasText(request.getVehicleType())
                ? "Loại xe khách đang chọn: " + request.getVehicleType()
                : "Chưa xác định rõ xe máy hay ô tô";

        String dbGrounding = buildDatabaseGroundingContext(request.getLat(), request.getLng(), request.getVehicleType());

        // Lấy tin nhắn cuối cùng của khách để đối chiếu với kho tri thức kỹ thuật xe
        String lastUserMsg = "";
        if (request.getMessages() != null && !request.getMessages().isEmpty()) {
            for (int i = request.getMessages().size() - 1; i >= 0; i--) {
                if ("user".equalsIgnoreCase(request.getMessages().get(i).getRole())) {
                    lastUserMsg = request.getMessages().get(i).getContent();
                    break;
                }
            }
        }
        String knowledgeGrounding = findRelevantKnowledgeContext(request.getVehicleType(), lastUserMsg);
        String fullGrounding = dbGrounding + (StringUtils.hasText(knowledgeGrounding) ? "\n" + knowledgeGrounding : "");

        String photoInstruction = photoCount > 0
                ? String.format("""

                === HƯỚNG DẪN QUAN TRỌNG VỀ HÌNH ẢNH ĐÍNH KÈM ===
                Khách hàng CÓ ĐÍNH KÈM %d HÌNH ẢNH SỰ CỐ XE TRONG YÊU CẦU NÀY (đã được đính kèm ở phần inlineData).
                - Bạn BẮT BUỘC PHẢI QUAN SÁT KỸ HÌNH ẢNH và mô tả trực tiếp những gì bạn nhìn thấy (ví dụ: lốp xe bị thủng cán đinh / xẹp sát vành, đèn cảnh báo gì đang sáng trên taplo, vết móp va quẹt ở vị trí nào...).
                - TUYỆT ĐỐI KHÔNG NÓI 'Tôi không nhận được hình ảnh' hoặc 'Tôi không thể xem ảnh'. Bạn là Gemini Multimodal AI có đầy đủ năng lực thị giác máy tính để phân tích ảnh xe!
                - Đưa ra chẩn đoán chuyên môn, hướng dẫn an toàn tại chỗ và đề xuất dịch vụ cứu hộ phù hợp nhất.
                """, photoCount)
                : "";

        String prompt = String.format("""
                Bạn là Trợ lý AI Cứu hộ Giao thông SRAS (Smart Rescue Assistance System) tại Việt Nam.
                Nhiệm vụ của bạn:
                1. Trò chuyện ân cần, lịch sự, đóng vai chuyên gia kỹ thuật xe và điều phối cứu hộ 24/7.
                2. Lắng nghe khách mô tả sự cố, hỏi thăm thêm nếu cần chẩn đoán, hoặc tư vấn an toàn tại hiện trường.
                3. BẮT BUỘC TRẢ LỜI DỰA TRÊN DỮ LIỆU THỰC TẾ TRONG HỆ THỐNG SRAS DƯỚI ĐÂY:
                   %s
                %s

                QUY TẮC TRẢ LỜI CÂU HỎI VÀ TƯ VẤN KHÁCH HÀNG:
                - PHONG CÁCH NÓI CHUYỆN:
                  + Trả lời tự nhiên, thân thiện, ân cần như một chuyên gia cứu hộ xe đang trực tiếp tư vấn cho khách.
                  + TUYỆT ĐỐI KHÔNG nhắc đến các mã định danh nội bộ (như HD_..., DASH_LIGHT_...) và KHÔNG nói "Dựa theo cơ sở tri thức hệ thống SRAS", "Theo sách hướng dẫn sử dụng trang xx".
                  + CHỈ tập trung vào: Tên bệnh/sự cố xe đang gặp phải, nguyên nhân do đâu, hướng giải quyết an toàn tại chỗ và các bước khách có thể tự kiểm tra, hướng dẫn đặt cứu hộ nếu cần thợ.
                - KHI KHÁCH HỎI "GARA NÀO ĐANG ONLINE?" hoặc "AI ĐANG TRỰC?":
                  + Tra cứu trong dữ liệu trên và CHỈ LIỆT KÊ các gara có trạng thái "ĐANG TRỰC ONLINE (SẴN SÀNG NHẬN ĐƠN NGAY)".
                  + Báo rõ tên gara, địa chỉ, hotline, khoảng cách tới khách (nếu có GPS).
                  + Nếu không có gara nào online, báo chân thật và hướng dẫn khách gọi tổng đài 1900 6868.
                - KHI KHÁCH HỎI "GARA NÀO GẦN TÔI NHẤT?":
                  + So sánh khoảng cách (km) và chỉ ra đúng gara có số km nhỏ nhất tới khách. Nêu rõ gara đó cách bao nhiêu km, đang Online hay Offline, địa chỉ và hotline.
                - KHI KHÁCH HỎI "DỊCH VỤ VÀ GIÁ CỦA GARA [TÊN]":
                  + Tra cứu đúng bảng giá dịch vụ niêm yết của gara đó trong dữ liệu (hoặc giá chuẩn hệ thống).
                - KHI KHÁCH HỎI "NẾU TÔI ĐẶT GARA NÀY THÌ GIÁ DI CHUYỂN LÀ BAO NHIÊU?":
                  + Trả lời chính xác khoảng cách km từ gara đó tới chỗ khách và mức phí di chuyển dự kiến theo loại xe (Xe máy: 15.000đ/km, cước sàn 30k; Ô tô: 25.000đ/km, cước sàn 50k) như đã được tính sẵn trong dữ liệu trên.
                - KHI KHÁCH CẦN GỌI CỨU HỘ HOẶC ĐỒNG Ý ĐẶT GARA:
                  + Đặt `isRescueProposal = true` và điền đầy đủ `proposedOrder`:
                    `garageId`: ID của gara (nếu khách chỉ định hoặc gara gần nhất),
                    `garageName`: Tên gara,
                    `vehicleType`: "MOTORBIKE" hoặc "CAR",
                    `issueType`: "DEAD_BATTERY" | "FLAT_TIRE" | "OUT_OF_FUEL" | "ENGINE_FAILURE" | "TOWING" | "OTHER",
                    `title`: Tên ngắn gọn đề xuất (VD: Vá lốp lưu động - Gara Auto ABC),
                    `description`: Tóm tắt sự cố và gara phục vụ,
                    `estimatedPrice`: Mức giá dịch vụ,
                    `estimatedTravelFee`: Mức phí di chuyển đến khách,
                    `distanceKm`: Khoảng cách km,
                    `address`: Địa chỉ khách hoặc vị trí GPS.
                  + Nếu khách chỉ đang hỏi thông tin chung, đặt `isRescueProposal = false`.

                THÔNG TIN KHÁCH HÀNG:
                - %s
                - %s
                - Toạ độ GPS khách: lat=%s, lng=%s

                %s

                YÊU CẦU ĐỊNH DẠNG: Chỉ trả về JSON duy nhất, không dùng markdown ```json:
                {
                  "reply": "Lời đáp chi tiết, tự nhiên, chính xác theo dữ liệu và hình ảnh (nếu có) cho khách...",
                  "isRescueProposal": true hoặc false,
                  "proposedOrder": {
                    "garageId": 1 hoặc null,
                    "garageName": "Tên gara nếu có",
                    "vehicleType": "MOTORBIKE" hoặc "CAR",
                    "vehicleModel": "Dòng xe (nếu có)",
                    "issueType": "DEAD_BATTERY" | "FLAT_TIRE" | "OUT_OF_FUEL" | "ENGINE_FAILURE" | "TOWING" | "OTHER",
                    "title": "Tên đề xuất",
                    "description": "Mô tả ngắn",
                    "estimatedPrice": "Giá dịch vụ dự kiến",
                    "estimatedTravelFee": "Phí di chuyển dự kiến",
                    "distanceKm": 3.2,
                    "address": "Địa chỉ khách",
                    "lat": %s,
                    "lng": %s
                  }
                }
                """,
                fullGrounding,
                photoInstruction,
                locationContext,
                vehicleContext,
                request.getLat() != null ? request.getLat().toString() : "null",
                request.getLng() != null ? request.getLng().toString() : "null",
                historyBuilder.toString(),
                request.getLat() != null ? request.getLat().toString() : "null",
                request.getLng() != null ? request.getLng().toString() : "null"
        );

        List<Map<String, Object>> chatParts = new ArrayList<>();
        // Đính kèm các ảnh đa phương thức trước để model phân tích
        chatParts.addAll(imageParts);
        chatParts.add(Map.of("text", prompt));

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", chatParts)),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "temperature", 0.3
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(endpoint, entity, String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Gemini returned non-200 status: " + response.getStatusCode());
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode partsNode = root.path("candidates").path(0).path("content").path("parts");
        String jsonText = "";
        if (partsNode.isArray()) {
            for (JsonNode part : partsNode) {
                if (part.has("text") && StringUtils.hasText(part.get("text").asText())) {
                    jsonText = part.get("text").asText();
                }
            }
        }
        if (!StringUtils.hasText(jsonText)) {
            jsonText = root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText();
        }

        jsonText = cleanJsonOutput(jsonText);
        return objectMapper.readValue(jsonText, AiChatResponse.class);
    }

    private String cleanJsonOutput(String raw) {
        if (!StringUtils.hasText(raw)) return "{}";
        String cleaned = raw.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }

    private AiChatResponse fallbackRuleBasedChat(AiChatRequest request) {
        String lastUserMsg = "";
        for (int i = request.getMessages().size() - 1; i >= 0; i--) {
            if ("user".equalsIgnoreCase(request.getMessages().get(i).getRole())) {
                lastUserMsg = request.getMessages().get(i).getContent();
                break;
            }
        }

        String lower = lastUserMsg.toLowerCase();
        Double userLat = request.getLat();
        Double userLng = request.getLng();
        String vType = (request.getVehicleType() != null && request.getVehicleType().equalsIgnoreCase("CAR")) ? "CAR" : "MOTORBIKE";
        if (lower.contains("ô tô") || lower.contains("oto") || lower.contains("xe con") || lower.contains("bán tải")) {
            vType = "CAR";
        }

        List<Garage> approvedGarages = new ArrayList<>();
        try {
            approvedGarages = garageRepository.findByStatusAndIsDeletedFalse(GarageStatus.APPROVED);
        } catch (Exception ex) {
            log.warn("Cannot query garages in fallback", ex);
        }

        // Sắp xếp theo khoảng cách nếu có GPS
        if (userLat != null && userLng != null && !approvedGarages.isEmpty()) {
            approvedGarages.sort((g1, g2) -> {
                Double d1 = (g1.getLat() != null && g1.getLng() != null)
                        ? calculateDistanceKm(userLat, userLng, g1.getLat(), g1.getLng()) : 999999.0;
                Double d2 = (g2.getLat() != null && g2.getLng() != null)
                        ? calculateDistanceKm(userLat, userLng, g2.getLat(), g2.getLng()) : 999999.0;
                return d1.compareTo(d2);
            });
        }

        // 1. CÂU HỎI VỀ GARA ĐANG ONLINE
        if (lower.contains("online") || lower.contains("đang trực") || lower.contains("ai trực") || lower.contains("mở cửa")) {
            List<Garage> onlineGarages = approvedGarages.stream().filter(g -> Boolean.TRUE.equals(g.getIsOnline())).toList();
            if (onlineGarages.isEmpty()) {
                return AiChatResponse.builder()
                        .reply("Hiện tại hệ thống kiểm tra chưa có gara nào bật chế độ trực Online. Nếu bạn đang gặp sự cố khẩn cấp trên đường, hãy bấm gọi ngay Tổng đài SRAS 1900 6868 để kỹ thuật viên hỗ trợ điều xe trực tiếp cho bạn nhé!")
                        .isRescueProposal(false)
                        .build();
            }

            StringBuilder sb = new StringBuilder("Hiện tại có " + onlineGarages.size() + " gara đang trực Online sẵn sàng tiếp nhận cứu hộ:\n\n");
            for (int i = 0; i < onlineGarages.size(); i++) {
                Garage g = onlineGarages.get(i);
                sb.append(String.format("🟢 %d. %s\n", i + 1, g.getName()));
                sb.append(String.format("   • Địa chỉ: %s\n", g.getAddress() != null ? g.getAddress() : "Chưa cập nhật"));
                sb.append(String.format("   • Hotline: %s\n", g.getPhone() != null ? g.getPhone() : "1900 6868"));
                if (userLat != null && userLng != null && g.getLat() != null && g.getLng() != null) {
                    double dist = calculateDistanceKm(userLat, userLng, g.getLat(), g.getLng());
                    long travelFee = vType.equals("CAR")
                            ? Math.max(50000L, Math.round(25000.0 * dist / 1000.0) * 1000L)
                            : Math.max(30000L, Math.round(15000.0 * dist / 1000.0) * 1000L);
                    sb.append(String.format("   • Cách bạn: %.1f km (Phí di chuyển ước tính: %,d đ)\n", dist, travelFee));
                }
            }
            sb.append("\nBạn muốn gửi yêu cầu đến gara nào trong danh sách trên?");

            Garage nearestOnline = onlineGarages.get(0);
            Double distNearest = (userLat != null && userLng != null && nearestOnline.getLat() != null && nearestOnline.getLng() != null)
                    ? calculateDistanceKm(userLat, userLng, nearestOnline.getLat(), nearestOnline.getLng()) : null;
            long fee = (distNearest != null)
                    ? (vType.equals("CAR") ? Math.max(50000L, Math.round(25000.0 * distNearest / 1000.0) * 1000L)
                                          : Math.max(30000L, Math.round(15000.0 * distNearest / 1000.0) * 1000L))
                    : 30000L;

            return AiChatResponse.builder()
                    .reply(sb.toString())
                    .isRescueProposal(true)
                    .proposedOrder(AiChatResponse.ProposedRescueOrder.builder()
                            .garageId(nearestOnline.getId())
                            .garageName(nearestOnline.getName())
                            .vehicleType(vType)
                            .issueType("OTHER")
                            .title("Điều phối từ " + nearestOnline.getName())
                            .description("Yêu cầu cứu hộ gara gần nhất đang online")
                            .estimatedPrice("Báo giá theo hạng mục")
                            .estimatedTravelFee(String.format("%,d đ", fee))
                            .distanceKm(distNearest)
                            .address(StringUtils.hasText(request.getUserLocation()) ? request.getUserLocation() : "Vị trí GPS hiện tại")
                            .lat(userLat)
                            .lng(userLng)
                            .build())
                    .build();
        }

        // 2. CÂU HỎI VỀ GARA GẦN TÔI
        if (lower.contains("gần tôi") || lower.contains("gần nhất") || lower.contains("quanh đây") || lower.contains("ở đâu gần")) {
            if (approvedGarages.isEmpty()) {
                return AiChatResponse.builder()
                        .reply("Hệ thống chưa ghi nhận thông tin gara nào trong khu vực của bạn. Vui lòng gọi Hotline 1900 6868 để được hỗ trợ khẩn cấp.")
                        .isRescueProposal(false)
                        .build();
            }

            Garage nearest = approvedGarages.get(0);
            Double dist = (userLat != null && userLng != null && nearest.getLat() != null && nearest.getLng() != null)
                    ? calculateDistanceKm(userLat, userLng, nearest.getLat(), nearest.getLng()) : null;
            boolean isOnline = Boolean.TRUE.equals(nearest.getIsOnline());
            long travelFee = (dist != null)
                    ? (vType.equals("CAR") ? Math.max(50000L, Math.round(25000.0 * dist / 1000.0) * 1000L)
                                          : Math.max(30000L, Math.round(15000.0 * dist / 1000.0) * 1000L))
                    : 30000L;

            String rep = String.format("Gara gần bạn nhất theo dữ liệu hệ thống là:\n\n" +
                    "🏠 **%s** (%s)\n" +
                    "• Trạng thái: %s\n" +
                    "• Khoảng cách: %s\n" +
                    "• Địa chỉ: %s\n" +
                    "• Hotline: %s\n" +
                    "• Phí di chuyển dự kiến (%s): %,d đ\n\n" +
                    "Bạn có muốn tôi tạo yêu cầu cứu hộ từ gara này cho bạn ngay không?",
                    nearest.getName(),
                    isOnline ? "Đang trực Online" : "Ngoại tuyến",
                    isOnline ? "🟢 Sẵn sàng nhận đơn" : "⚪ Tạm nghỉ trực",
                    dist != null ? String.format("%.1f km", dist) : "Chưa rõ toạ độ",
                    nearest.getAddress(),
                    nearest.getPhone() != null ? nearest.getPhone() : "1900 6868",
                    vType.equals("CAR") ? "Ô tô" : "Xe máy",
                    travelFee);

            return AiChatResponse.builder()
                    .reply(rep)
                    .isRescueProposal(true)
                    .proposedOrder(AiChatResponse.ProposedRescueOrder.builder()
                            .garageId(nearest.getId())
                            .garageName(nearest.getName())
                            .vehicleType(vType)
                            .issueType("OTHER")
                            .title("Cứu hộ từ " + nearest.getName())
                            .description(String.format("Gara gần nhất (%s)", dist != null ? String.format("%.1f km", dist) : "khu vực"))
                            .estimatedPrice("Theo dịch vụ yêu cầu")
                            .estimatedTravelFee(String.format("%,d đ", travelFee))
                            .distanceKm(dist)
                            .address(StringUtils.hasText(request.getUserLocation()) ? request.getUserLocation() : "Vị trí GPS hiện tại")
                            .lat(userLat)
                            .lng(userLng)
                            .build())
                    .build();
        }

        // 3. CÂU HỎI VỀ PHÍ DI CHUYỂN HOẶC GIÁ ĐẶT GARA
        if (lower.contains("giá di chuyển") || lower.contains("phí di chuyển") || lower.contains("cước di chuyển") ||
                lower.contains("phí đến") || lower.contains("tiền di chuyển") || lower.contains("bao nhiêu km")) {

            // Tìm gara được nhắc tới trong câu hoặc lấy gara gần nhất
            Garage targetGarage = null;
            for (Garage g : approvedGarages) {
                if (g.getName() != null && lower.contains(g.getName().toLowerCase())) {
                    targetGarage = g;
                    break;
                }
            }
            if (targetGarage == null && !approvedGarages.isEmpty()) {
                targetGarage = approvedGarages.get(0);
            }

            if (targetGarage != null && userLat != null && userLng != null && targetGarage.getLat() != null && targetGarage.getLng() != null) {
                double dist = calculateDistanceKm(userLat, userLng, targetGarage.getLat(), targetGarage.getLng());
                long feeBike = Math.max(30000L, Math.round(15000.0 * dist / 1000.0) * 1000L);
                long feeCar = Math.max(50000L, Math.round(25000.0 * dist / 1000.0) * 1000L);

                String rep = String.format("Theo dữ liệu định vị, khoảng cách từ **%s** đến vị trí của bạn là **%.1f km**.\n\n" +
                        "Phí di chuyển cứu hộ được tính theo biểu cước chuẩn:\n" +
                        "• Xe máy: **%,d đ** (15.000đ/km, cước tối thiểu 30.000đ)\n" +
                        "• Ô tô: **%,d đ** (25.000đ/km, cước tối thiểu 50.000đ)\n\n" +
                        "Gara này hiện %s. Bạn có muốn tạo đơn gọi thợ đến ngay không?",
                        targetGarage.getName(),
                        dist,
                        feeBike,
                        feeCar,
                        Boolean.TRUE.equals(targetGarage.getIsOnline()) ? "🟢 Đang trực Online sẵn sàng đi ngay" : "⚪ Đang tạm nghỉ trực");

                long feeChosen = vType.equals("CAR") ? feeCar : feeBike;
                return AiChatResponse.builder()
                        .reply(rep)
                        .isRescueProposal(true)
                        .proposedOrder(AiChatResponse.ProposedRescueOrder.builder()
                                .garageId(targetGarage.getId())
                                .garageName(targetGarage.getName())
                                .vehicleType(vType)
                                .issueType("OTHER")
                                .title("Cứu hộ từ " + targetGarage.getName())
                                .description(String.format("Khoảng cách %.1f km", dist))
                                .estimatedPrice("Cước di chuyển")
                                .estimatedTravelFee(String.format("%,d đ", feeChosen))
                                .distanceKm(dist)
                                .address(StringUtils.hasText(request.getUserLocation()) ? request.getUserLocation() : "Vị trí GPS hiện tại")
                                .lat(userLat)
                                .lng(userLng)
                                .build())
                        .build();
            }
        }

        // 4. SỰ CỐ CỤ THỂ (Lốp, bình, xăng, kéo xe)
        boolean wantsRescue = lower.contains("cứu") || lower.contains("gọi") || lower.contains("đến") ||
                lower.contains("kéo") || lower.contains("giúp") || lower.contains("đặt") || lower.contains("hộ");

        if (lower.contains("lốp") || lower.contains("xì") || lower.contains("đinh") || lower.contains("thủng") || lower.contains("xẹp")) {
            return AiChatResponse.builder()
                    .reply("Tôi nhận thấy xe bạn có thể đang bị cán đinh hoặc thủng lốp. Bạn hãy giảm tốc độ từ từ và dắt xe gọn vào lề an toàn, tránh tiếp tục đi để không làm biến dạng vành xe. " +
                            (wantsRescue ? "Tôi đã chuẩn bị sẵn phiếu yêu cầu vá lốp lưu động ngay bên dưới, bạn hãy bấm 'Xác nhận tạo đơn' để gara gần nhất tiếp nhận ngay nhé!" : "Nếu cần thợ đến vá lốp tận nơi, bạn có thể bấm xác nhận bên dưới."))
                    .isRescueProposal(true)
                    .proposedOrder(AiChatResponse.ProposedRescueOrder.builder()
                            .vehicleType(vType)
                            .issueType("FLAT_TIRE")
                            .title(vType.equals("CAR") ? "Vá lốp ô tô lưu động" : "Vá lốp xe máy tận nơi")
                            .description("Bánh xe bị cán đinh / xì hơi trên đường")
                            .estimatedPrice(vType.equals("CAR") ? "120.000đ - 200.000đ" : "50.000đ - 80.000đ")
                            .address(StringUtils.hasText(request.getUserLocation()) ? request.getUserLocation() : "Vị trí GPS hiện tại")
                            .lat(request.getLat())
                            .lng(request.getLng())
                            .build())
                    .build();
        } else if (lower.contains("bình") || lower.contains("ắc quy") || lower.contains("acquy") || lower.contains("đề") || lower.contains("tạch")) {
            return AiChatResponse.builder()
                    .reply("Triệu chứng bấm đề tạch tạch hoặc im lặng thường do ắc quy đã kiệt điện hoặc hỏng củ đề. Bạn không nên bấm giữ nút đề liên tục tránh gây cháy mô-tơ đề. " +
                            "Hệ thống SRAS có đội kích bình và mang ắc quy mới thay tận chỗ.")
                    .isRescueProposal(true)
                    .proposedOrder(AiChatResponse.ProposedRescueOrder.builder()
                            .vehicleType(vType)
                            .issueType("DEAD_BATTERY")
                            .title(vType.equals("CAR") ? "Kích bình ắc quy ô tô" : "Kích bình / Thay ắc quy xe máy")
                            .description("Xe hết điện bình không thể khởi động")
                            .estimatedPrice(vType.equals("CAR") ? "150.000đ - 250.000đ" : "80.000đ - 120.000đ")
                            .address(StringUtils.hasText(request.getUserLocation()) ? request.getUserLocation() : "Vị trí GPS hiện tại")
                            .lat(request.getLat())
                            .lng(request.getLng())
                            .build())
                    .build();
        } else if (lower.contains("xăng") || lower.contains("dầu") || lower.contains("cạn")) {
            return AiChatResponse.builder()
                    .reply("Xe bạn dường như đã cạn nhiên liệu trên đường. Đội cứu hộ SRAS có thể giao xăng RON 95 hoặc dầu Diesel khẩn cấp tận xe của bạn.")
                    .isRescueProposal(true)
                    .proposedOrder(AiChatResponse.ProposedRescueOrder.builder()
                            .vehicleType(vType)
                            .issueType("OUT_OF_FUEL")
                            .title("Cấp cứu nhiên liệu tận nơi")
                            .description("Giao xăng / dầu khẩn cấp tận xe")
                            .estimatedPrice(vType.equals("CAR") ? "160.000đ (5 lít)" : "60.000đ (2 lít)")
                            .address(StringUtils.hasText(request.getUserLocation()) ? request.getUserLocation() : "Vị trí GPS hiện tại")
                            .lat(request.getLat())
                            .lng(request.getLng())
                            .build())
                    .build();
        } else if (lower.contains("kéo") || lower.contains("cẩu") || lower.contains("tai nạn") || lower.contains("hỏng nặng")) {
            return AiChatResponse.builder()
                    .reply("Đối với các sự cố hư hỏng nặng hoặc va chạm, SRAS có xe cẩu kéo sàn trượt chuyên dụng để chở xe an toàn về gara uy tín hoặc địa chỉ của bạn.")
                    .isRescueProposal(true)
                    .proposedOrder(AiChatResponse.ProposedRescueOrder.builder()
                            .vehicleType(vType)
                            .issueType("TOWING")
                            .title(vType.equals("CAR") ? "Xe kéo sàn trượt ô tô" : "Kéo xe máy về gara")
                            .description("Cứu hộ kéo xe gặp sự cố về trạm")
                            .estimatedPrice(vType.equals("CAR") ? "450.000đ - 800.000đ" : "150.000đ - 250.000đ")
                            .address(StringUtils.hasText(request.getUserLocation()) ? request.getUserLocation() : "Vị trí GPS hiện tại")
                            .lat(request.getLat())
                            .lng(request.getLng())
                            .build())
                    .build();
        }

        boolean hasAttachedPhoto = (request.getPhotoUrls() != null && !request.getPhotoUrls().isEmpty()) ||
                (request.getMessages() != null && request.getMessages().stream().anyMatch(m -> StringUtils.hasText(m.getImageUrl())));
        if (hasAttachedPhoto) {
            return AiChatResponse.builder()
                    .reply("Tôi đã nhận được hình ảnh xe của bạn. Để đảm bảo an toàn, bạn hãy dắt xe gọn vào lề đường. Tôi đã chuẩn bị sẵn phiếu yêu cầu kiểm tra sự cố lưu động ngay bên dưới để bạn tạo đơn gọi thợ đến hỗ trợ xử lý ngay nhé!")
                    .isRescueProposal(true)
                    .proposedOrder(AiChatResponse.ProposedRescueOrder.builder()
                            .vehicleType(vType)
                            .issueType("OTHER")
                            .title(vType.equals("CAR") ? "Kiểm tra sự cố ô tô lưu động" : "Kiểm tra sự cố xe máy tận nơi")
                            .description("Khách hàng gửi hình ảnh sự cố, cần thợ kiểm tra trực tiếp")
                            .estimatedPrice(vType.equals("CAR") ? "150.000đ - 250.000đ" : "50.000đ - 100.000đ")
                            .address(StringUtils.hasText(request.getUserLocation()) ? request.getUserLocation() : "Vị trí GPS hiện tại")
                            .lat(request.getLat())
                            .lng(request.getLng())
                            .build())
                    .build();
        }

        return AiChatResponse.builder()
                .reply("Chào bạn! Tôi là Trợ lý AI cứu hộ SRAS 24/7. Tôi có thể giúp bạn kiểm tra xem **các gara nào đang online**, **gara nào gần bạn nhất**, **bảng giá dịch vụ** hay **phí di chuyển của gara đến vị trí của bạn**. Bạn cần thông tin gì cứ hỏi tôi nhé!")
                .isRescueProposal(false)
                .build();
    }
}
