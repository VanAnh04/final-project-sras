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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import com.sras.backend.dto.response.RoadHazardWarningResponse;
import com.sras.backend.entity.CustomerVehicle;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageServicePrice;
import com.sras.backend.entity.Rating;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.entity.enums.WorkStatus;
import com.sras.backend.repository.CustomerVehicleRepository;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.GarageServicePriceRepository;
import com.sras.backend.repository.GarageStaffRepository;
import com.sras.backend.repository.RatingRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.repository.ServiceRepository;

import jakarta.annotation.PostConstruct;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class GeminiAiDiagnosisServiceImpl implements AiDiagnosisService {

    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;
    private final GarageRepository garageRepository;
    private final GarageServicePriceRepository garageServicePriceRepository;
    private final ServiceRepository serviceRepository;
    private final RescueRequestRepository rescueRequestRepository;
    private final CustomerVehicleRepository customerVehicleRepository;
    private final RatingRepository ratingRepository;
    private final GarageStaffRepository garageStaffRepository;
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

    private static final Set<String> KNOWLEDGE_STOP_WORDS = Set.of(
            "sự", "cố", "tôi", "cho", "này", "giúp", "hình", "ảnh", "kiểm", "tra",
            "chuẩn", "đoán", "chẩn", "được", "không", "nhé", "với", "trong", "làm",
            "sao", "bị", "gì", "thế", "nào", "hỏi", "có", "xe", "của", "và", "là", "bạn",
            "từ", "hộ", "cứu", "gara", "ơi", "ạ", "xem"
    );

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
                if (kw.length() < 2 || KNOWLEDGE_STOP_WORDS.contains(kw)) continue;
                if (nodeSymptom.contains(kw)) score += 2;
                if (nodeIssue.contains(kw)) score += 3;
                if (nodeCategory.contains(kw)) score += 2;
            }

            // Chỉ đưa vào danh sách nếu có từ khoá kỹ thuật thực thụ khớp (điểm tối thiểu 5)
            if (score >= 5) {
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
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(8000);
        return new RestTemplate(factory);
    }

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-3-flash-preview}")
    private String geminiModel;

    private static final String GEMINI_API_URL_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private static final List<String> CANDIDATE_MODELS = List.of(
            "gemini-3-flash-preview",
            "gemini-3.1-flash-lite-preview",
            "gemini-3.5-flash-lite"
    );

    private static final List<String> AUDIO_MODELS = List.of(
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemini-3-flash-preview",
            "gemini-3.8-flash",
            "gemini-flash-latest"
    );

    // RestTemplate riêng cho audio: upload + xử lý âm thanh cần timeout dài hơn text
    private static final RestTemplate AUDIO_REST_TEMPLATE = createAudioRestTemplate();

    private static RestTemplate createAudioRestTemplate() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8000);
        factory.setReadTimeout(40000);
        return new RestTemplate(factory);
    }

    @Override
    public AiDiagnosisResponse diagnoseBreakdown(AiDiagnosisRequest request) {
        return diagnoseBreakdown(null, request);
    }

    @Override
    public AiDiagnosisResponse diagnoseBreakdown(User customer, AiDiagnosisRequest request) {
        String symptom = request.getSymptomDescription() != null ? request.getSymptomDescription().trim() : "";
        String vehicleType = StringUtils.hasText(request.getVehicleType()) ? request.getVehicleType().trim() : "MOTORBIKE";
        String vehicleModel = StringUtils.hasText(request.getVehicleModel()) ? request.getVehicleModel().trim() : (vehicleType.equals("CAR") ? "Ô tô phổ thông" : "Xe máy phổ thông");

        // Ngữ cảnh cá nhân hoá
        StringBuilder personalizationContext = new StringBuilder();
        String personalizationNote = null;
        boolean isFrequentLocation = false;
        int incidentCountAtLocation = 0;

        if (customer != null) {
            // 1. Cá nhân hoá theo xe của khách hàng
            CustomerVehicle vehicle = null;
            if (request.getCustomerVehicleId() != null) {
                vehicle = customerVehicleRepository.findById(request.getCustomerVehicleId()).orElse(null);
            }
            if (vehicle == null) {
                List<CustomerVehicle> myVehicles = customerVehicleRepository.findByCustomerAndIsDeletedFalse(customer);
                if (myVehicles != null && !myVehicles.isEmpty()) {
                    vehicle = myVehicles.stream().filter(v -> Boolean.TRUE.equals(v.getIsDefault())).findFirst().orElse(myVehicles.get(0));
                }
            }

            if (vehicle != null) {
                vehicleType = vehicle.getVehicleType().name();
                vehicleModel = (vehicle.getBrand() + " " + (vehicle.getModel() != null ? vehicle.getModel() : "") + (vehicle.getYear() != null ? " (" + vehicle.getYear() + ")" : "")).trim();
                personalizationContext.append(String.format("• Thông tin xe thực tế của khách hàng: %s (Biển số: %s, Màu: %s, Loại: %s)\n",
                        vehicleModel,
                        vehicle.getLicensePlate() != null ? vehicle.getLicensePlate() : "Chưa rõ",
                        vehicle.getColor() != null ? vehicle.getColor() : "Chưa rõ",
                        vehicleType.equals("CAR") ? "Ô tô" : "Xe máy"));
            }

            // 2. Kiểm tra cung đường rủi ro thường xuyên bị sự cố (ngưỡng >= 2 lần)
            RoadHazardWarningResponse hazardCheck = checkRoadHazardWarning(customer, request.getLat(), request.getLng(), request.getAddress());
            if (hazardCheck != null && hazardCheck.isHasWarning() && hazardCheck.getIncidentCount() >= 2) {
                isFrequentLocation = true;
                incidentCountAtLocation = hazardCheck.getIncidentCount();
                personalizationNote = String.format("AI phát hiện: Bạn đang ở khu vực '%s' — nơi xe của bạn đã từng gặp sự cố %d lần trước đây.",
                        hazardCheck.getRoadName() != null ? hazardCheck.getRoadName() : "này", incidentCountAtLocation);

                personalizationContext.append(String.format("• CẢNH BÁO ĐIỂM ĐEN SỰ CỐ CÁ NHÂN: Khách hàng đang ở đoạn đường '%s' — nơi xe này ĐÃ TỪNG GẶP SỰ CỐ %d LẦN trước đây!\n",
                        hazardCheck.getRoadName() != null ? hazardCheck.getRoadName() : "này", incidentCountAtLocation));
                if (hazardCheck.getPastIncidents() != null && !hazardCheck.getPastIncidents().isEmpty()) {
                    personalizationContext.append("  Các sự cố lần trước tại đây:\n");
                    for (RoadHazardWarningResponse.PastIncidentSummary p : hazardCheck.getPastIncidents()) {
                        personalizationContext.append(String.format("  - Ngày %s: Bệnh [%s] - Triệu chứng: %s\n",
                                p.getDate(), p.getIssueTypeName() != null ? p.getIssueTypeName() : p.getIssueType(), p.getSymptom()));
                    }
                }
                personalizationContext.append("HÃY ĐỐI CHIẾU TRIỆU CHỨNG VỚI CÁC BỆNH TRƯỚC ĐÓ TẠI CON ĐƯỜNG NÀY ĐỂ ĐƯA RA CHẨN ĐOÁN VÀ LỜI KHUYÊN PHÒNG NGỪA CHÍNH XÁC NHẤT!\n");
            }
        }

        AiDiagnosisResponse finalResponse;
        if (StringUtils.hasText(geminiApiKey)) {
            // Danh sách các model thử nghiệm theo thứ tự ưu tiên
            Set<String> modelsToTry = new LinkedHashSet<>();
            if (StringUtils.hasText(geminiModel)) {
                modelsToTry.add(geminiModel);
            }
            modelsToTry.addAll(CANDIDATE_MODELS);

            Exception lastEx = null;
            AiDiagnosisResponse geminiResult = null;
            for (String model : modelsToTry) {
                try {
                    geminiResult = callGeminiApi(model, vehicleType, vehicleModel, symptom, request.getPhotoUrls(), personalizationContext.toString());
                    break;
                } catch (Exception e) {
                    lastEx = e;
                    log.warn("[Gemini AI] Model {} failed ({}). Trying next model if available...", model, e.getMessage());
                }
            }
            if (geminiResult != null) {
                finalResponse = geminiResult;
            } else {
                log.error("[Gemini AI] All Gemini models failed: {}", lastEx != null ? lastEx.getMessage() : "unknown error", lastEx);
                finalResponse = fallbackRuleBasedDiagnosis(vehicleType, vehicleModel, symptom, "Hệ thống AI tạm bận, đang dùng bộ chẩn đoán dự phòng.");
            }
        } else {
            log.warn("[Gemini AI] GEMINI_API_KEY is not configured. Falling back to rule-based diagnostic engine.");
            finalResponse = fallbackRuleBasedDiagnosis(vehicleType, vehicleModel, symptom, "Chưa kích hoạt GEMINI_API_KEY trên server.");
        }

        // Bổ sung thông tin cá nhân hoá vào kết quả phản hồi
        if (StringUtils.hasText(personalizationNote)) {
            finalResponse.setPersonalizationNote(personalizationNote);
            finalResponse.setIsFrequentBreakdownLocation(isFrequentLocation);
            finalResponse.setLocationIncidentCount(incidentCountAtLocation);
        }

        return finalResponse;
    }

    private AiDiagnosisResponse callGeminiApi(String modelToUse, String vehicleType, String vehicleModel, String symptom, List<String> photoUrls, String personalizationContext) throws Exception {
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

        // Bổ sung dữ liệu cá nhân hoá xe & lịch sử cung đường nếu có
        if (StringUtils.hasText(personalizationContext)) {
            promptText.append("\n=== DỮ LIỆU CÁ NHÂN HOÁ PHƯƠNG TIỆN & LỊCH SỬ SỰ CỐ ===\n");
            promptText.append(personalizationContext).append("\n");
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

        Map<String, Object> genConfig = new HashMap<>();
        genConfig.put("responseMimeType", "application/json");
        genConfig.put("temperature", 0.2);
        if (modelToUse.contains("gemini-3-flash")) {
            genConfig.put("thinkingConfig", Map.of("thinkingBudget", 0));
        }

        Map<String, Object> requestBody = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))),
                "contents", List.of(Map.of("parts", parts)),
                "generationConfig", genConfig
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
                    break;
                }
            }
        }
        if (!StringUtils.hasText(jsonText)) {
            jsonText = root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText();
        }

        jsonText = cleanJsonOutput(jsonText);
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
            log.warn("[Gemini AI] Chưa cấu hình GEMINI_API_KEY để nhận diện giọng nói.");
            return "";
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
                } else if (filename.endsWith(".ogg")) {
                    contentType = "audio/ogg";
                } else if (filename.endsWith(".aac")) {
                    contentType = "audio/aac";
                } else {
                    contentType = "audio/mp4";
                }
            }

            // Ưu tiên các model âm thanh chuyên dụng như gemini-3.5-transcribe
            List<String> modelsToTry = new ArrayList<>(AUDIO_MODELS);
            if (StringUtils.hasText(geminiModel) && !modelsToTry.contains(geminiModel)) {
                modelsToTry.add(geminiModel);
            }

            log.info("[Gemini AI Voice] Nhận file {} bytes, contentType={}", audioBytes.length, contentType);
            for (String model : modelsToTry) {
                for (int attempt = 1; attempt <= 2; attempt++) {
                    try {
                        String transcribed = callGeminiAudioTranscription(model, audioBytes, contentType);
                        if (StringUtils.hasText(transcribed)) {
                            log.info("[Gemini AI Voice] Nhận diện thành công qua model {}: \"{}\"", model, transcribed);
                            return transcribed;
                        }
                        break; // model trả rỗng -> thử model khác
                    } catch (Exception e) {
                        log.warn("[Gemini AI] Voice model {} lần {} lỗi: {}", model, attempt, e.getMessage());
                        String msg = String.valueOf(e.getMessage());
                        boolean retryable = msg.contains("503") || msg.contains("429") || msg.contains("timed out");
                        if (!retryable) break;
                        try { Thread.sleep(800); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                    }
                }
            }
            log.warn("[Gemini AI] Không phát hiện được tiếng nói rõ ràng trong file ghi âm.");
            return "";
        } catch (Exception e) {
            log.error("[Gemini AI] Error transcribing voice file: {}", e.getMessage(), e);
            // Trả về chuỗi rỗng để client hiển thị popup nhắc khách nói lại, không văng 500
            return "";
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
                - Nếu đoạn ghi âm im lặng hoặc không nghe rõ từ nào, hãy trả về rỗng.
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

        ResponseEntity<String> response = AUDIO_REST_TEMPLATE.postForEntity(endpoint, entity, String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Gemini returned non-200 status: " + response.getStatusCode());
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode candidates = root.path("candidates");
        if (candidates.isMissingNode() || !candidates.isArray() || candidates.isEmpty()) {
            return "";
        }

        JsonNode partsNode = candidates.path(0).path("content").path("parts");
        if (partsNode.isMissingNode() || !partsNode.isArray()) {
            return "";
        }

        StringBuilder textBuilder = new StringBuilder();
        for (JsonNode part : partsNode) {
            if (part.has("text")) {
                textBuilder.append(part.path("text").asText(""));
            }
        }

        String transcribed = textBuilder.toString().trim();
        return transcribed.replaceAll("^\"|\"$", "").trim();
    }

    @Override
    public AiChatResponse chat(AiChatRequest request) {
        if (request == null || request.getMessages() == null || request.getMessages().isEmpty()) {
            return AiChatResponse.builder()
                    .reply("Chào bạn! Tôi là Trợ lý cứu hộ SRAS 24/7. Bạn đang gặp sự cố xe gì hay cần hỗ trợ kiểm tra xe trên đường không?")
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

            // 1. Thống kê tải công việc theo thời gian thực (số ca cứu hộ đang xử lý của từng Gara)
            List<RescueStatus> activeStatuses = List.of(
                    RescueStatus.ACCEPTED,
                    RescueStatus.ASSIGNED,
                    RescueStatus.EN_ROUTE,
                    RescueStatus.ARRIVED,
                    RescueStatus.DIAGNOSED,
                    RescueStatus.REPAIRING_ONSITE,
                    RescueStatus.TOWING,
                    RescueStatus.TOW_TO_GARAGE
            );
            Map<Long, Long> activeOrdersByGarage = new HashMap<>();
            try {
                List<Object[]> rawCounts = rescueRequestRepository.countActiveRequestsGroupedByGarage(activeStatuses);
                if (rawCounts != null) {
                    for (Object[] row : rawCounts) {
                        if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                            activeOrdersByGarage.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
                        }
                    }
                }
            } catch (Exception ex) {
                log.warn("[Gemini AI] Lỗi lấy số đơn active theo gara: {}", ex.getMessage());
            }

            // 2. Lấy dữ liệu đánh giá thực tế từ bảng ratings qua ratingRepository
            List<Long> allGarageIds = allApproved.stream().map(Garage::getId).toList();
            Map<Long, RatingRepository.GarageRatingAgg> ratingAggMap = new HashMap<>();
            try {
                List<RatingRepository.GarageRatingAgg> aggList = ratingRepository.aggregateByGarages(allGarageIds);
                if (aggList != null) {
                    for (RatingRepository.GarageRatingAgg agg : aggList) {
                        if (agg != null && agg.getGarageId() != null) {
                            ratingAggMap.put(agg.getGarageId(), agg);
                        }
                    }
                }
            } catch (Exception ex) {
                log.warn("[Gemini AI] Lỗi lấy aggregateByGarages: {}", ex.getMessage());
            }

            // BẢNG XẾP HẠNG GARA UY TÍN NHẤT (DỰA 100% TRÊN BẢNG RATINGS THỰC TẾ TRONG DATABASE)
            List<Garage> ratedGarages = allApproved.stream()
                    .filter(g -> {
                        RatingRepository.GarageRatingAgg a = ratingAggMap.get(g.getId());
                        return a != null && a.getCnt() != null && a.getCnt() > 0;
                    })
                    .sorted((g1, g2) -> {
                        RatingRepository.GarageRatingAgg a1 = ratingAggMap.get(g1.getId());
                        RatingRepository.GarageRatingAgg a2 = ratingAggMap.get(g2.getId());
                        double r1 = (a1 != null && a1.getAvgStars() != null) ? a1.getAvgStars() : 0.0;
                        double r2 = (a2 != null && a2.getAvgStars() != null) ? a2.getAvgStars() : 0.0;
                        int cmp = Double.compare(r2, r1);
                        if (cmp != 0) return cmp;
                        long c1 = (a1 != null && a1.getCnt() != null) ? a1.getCnt() : 0L;
                        long c2 = (a2 != null && a2.getCnt() != null) ? a2.getCnt() : 0L;
                        return Long.compare(c2, c1);
                    })
                    .toList();

            sb.append("=== BẢNG XẾP HẠNG GARA UY TÍN NHẤT (DỮ LIỆU ĐÁNH GIÁ THỰC TẾ TỪ KHÁCH HÀNG) ===\n");
            if (ratedGarages.isEmpty()) {
                sb.append("• Hiện tại tất cả các gara trong hệ thống đều là gara mới tham gia và CHƯA CÓ bất kỳ lượt đánh giá sao nào từ khách hàng trên hệ thống SRAS.\n");
            } else {
                // CHỈ LẤY ĐÚNG DUY NHẤT 1 GARA ĐỨNG ĐẦU BẢNG XẾP HẠNG
                Garage top1 = ratedGarages.get(0);
                RatingRepository.GarageRatingAgg a = ratingAggMap.get(top1.getId());
                long count = a.getCnt();
                double score = a.getAvgStars() != null ? Math.round(a.getAvgStars() * 10.0) / 10.0 : 5.0;
                long orders = activeOrdersByGarage.getOrDefault(top1.getId(), 0L);
                sb.append(String.format("• GARA CÓ ĐIỂM ĐÁNH GIÁ CAO NHẤT HIỆN TẠI (DUY NHẤT 1 GARA): \"%s\" [Mã hệ thống: %d - TUYỆT ĐỐI KHÔNG IN ID RA CÂU TRẢ LỜI] — ⭐ %.1f/5.0 sao (chính xác từ %d lượt đánh giá thực tế) — Trạng thái: %s — Tải việc: %s\n",
                        top1.getName(), top1.getId(), score, count,
                        Boolean.TRUE.equals(top1.getIsOnline()) ? "🟢 Đang trực Online" : "⚪ Ngoại tuyến",
                        orders == 0 ? "Rất rảnh (0 đơn)" : (orders <= 2 ? orders + " đơn đang làm" : "Đang bận (" + orders + " đơn)")));
            }
            sb.append("\n");

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

            sb.append("DANH SÁCH CHI TIẾT CÁC GARA TRONG HỆ THỐNG SRAS (DATABASE LIVE):\n");
            for (int i = 0; i < allApproved.size(); i++) {
                Garage g = allApproved.get(i);
                boolean isOnline = Boolean.TRUE.equals(g.getIsOnline());
                long activeOrders = activeOrdersByGarage.getOrDefault(g.getId(), 0L);

                String busyStatus;
                if (activeOrders == 0) {
                    busyStatus = "RẤT RẢNH (Hiện có 0 ca cứu hộ đang làm, thợ sẵn sàng xuất phát cứu hộ ngay tức thì)";
                } else if (activeOrders <= 2) {
                    busyStatus = String.format("BẬN VỪA PHẢI (Đang xử lý %d ca cứu hộ, thợ vẫn đáp ứng được đơn tiếp theo)", activeOrders);
                } else {
                    busyStatus = String.format("ĐANG RẤT BẬN / QUÁ TẢI (Đang có %d ca cứu hộ đang xử lý, khách có thể phải chờ lâu hơn)", activeOrders);
                }

                RatingRepository.GarageRatingAgg a = ratingAggMap.get(g.getId());
                long rCount = (a != null && a.getCnt() != null) ? a.getCnt() : 0L;
                String ratingDesc;
                if (rCount > 0) {
                    double rScore = (a != null && a.getAvgStars() != null) ? Math.round(a.getAvgStars() * 10.0) / 10.0 : 5.0;
                    ratingDesc = String.format("⭐ %.1f / 5.0 sao (từ %d lượt đánh giá thực tế của khách hàng)", rScore, rCount);
                } else {
                    ratingDesc = "Chưa có lượt đánh giá nào từ khách hàng (đây là Gara mới tham gia hệ thống SRAS)";
                }

                sb.append(String.format("%d. Gara: \"%s\" [Mã hệ thống: %d - DÙNG CHO PROPOSED ORDER, TUYỆT ĐỐI KHÔNG IN ID RA CÂU TRẢ LỜI CHO KHÁCH]\n", i + 1, g.getName(), g.getId()));
                sb.append(String.format("   - Trạng thái trực: %s\n", isOnline ? "ĐANG TRỰC ONLINE (SẴN SÀNG NHẬN ĐƠN NGAY)" : "NGOẠI TUYẾN / NGHỈ TRỰC"));
                sb.append(String.format("   - Tình trạng bận/rảnh: %s\n", busyStatus));
                sb.append(String.format("   - Đánh giá chất lượng thực tế: %s\n", ratingDesc));
                sb.append(String.format("   - Địa chỉ: %s\n", g.getAddress() != null ? g.getAddress() : "Chưa cập nhật"));
                sb.append(String.format("   - Hotline liên hệ: %s\n", g.getPhone() != null ? g.getPhone() : "1900 6868"));
                sb.append(String.format("   - Khả năng phục vụ: %s\n", g.getCapability() != null ? g.getCapability().name() : "Chung"));

                // Lấy thông tin thợ trực
                try {
                    long busyStaff = garageStaffRepository.countByGarageAndIsDeletedFalseAndIsActiveTrueAndStatus(g, WorkStatus.BUSY);
                    long availableStaff = garageStaffRepository.countByGarageAndIsDeletedFalseAndIsActiveTrueAndStatus(g, WorkStatus.FREE);
                    long totalStaff = garageStaffRepository.countByGarageAndIsDeletedFalseAndIsActiveTrue(g);
                    if (totalStaff > 0) {
                        sb.append(String.format("   - Nhân sự kỹ thuật: %d thợ trực (Trong đó: %d thợ rảnh sẵn sàng đi ngay, %d thợ đang xử lý sự cố)\n",
                                totalStaff, availableStaff, busyStaff));
                    }
                } catch (Exception ex) {
                    // ignore
                }


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
            String roleName = "user".equalsIgnoreCase(msg.getRole()) ? "Khách hàng" : "Trợ lý SRAS";
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
                Khách hàng CÓ ĐÍNH KÈM %d HÌNH ẢNH TRONG YÊU CẦU NÀY (được đính kèm ở phần inlineData).
                BƯỚC 1 - XÁC MINH ĐỐI TƯỢNG TRONG HÌNH ẢNH:
                - Bạn PHẢI quan sát kỹ hình ảnh xem có chứa phương tiện giao thông (ô tô, xe máy, xe điện), phụ tùng xe (bánh xe, lốp, động cơ, táp-lô đồng hồ, bình điện...), hoặc hiện trường sự cố giao thông hay không.
                - NẾU HÌNH ẢNH KHÔNG LIÊN QUAN ĐẾN XE CỘ / GIAO THÔNG (ví dụ: màn hình máy tính/laptop, mã code, IDE/VS Code, ảnh chân dung người, selfie, đồ ăn thức uống, động vật, phong cảnh, đồ vật văn phòng, tài liệu, ảnh chụp mờ tối đen...):
                  + BẮT BUỘC trả lời ngắn gọn (1-2 câu): Nói rõ hình ảnh bạn thấy là gì (ví dụ: màn hình máy tính, đồ ăn...), và cho biết hình ảnh không liên quan đến phương tiện giao thông hoặc sự cố xe.
                  + TUYỆT ĐỐI KHÔNG SUY DIỄN nội dung trên màn hình/vật thể thành sự cố xe! KHÔNG trả lời lan man dài dòng!
                  + BẮT BUỘC đặt "isRescueProposal": false và "proposedOrder": null! TUYỆT ĐỐI KHÔNG TẠO ĐƠN CỨU HỘ!
                - NẾU HÌNH ẢNH ĐÚNG LÀ XE CỘ / SỰ CỐ XE:
                  + Quan sát kỹ chi tiết (bánh xẹp, cán đinh, đèn cảnh báo táp-lô, rò rỉ nhớt, va quẹt...).
                  + Đưa ra chẩn đoán chuyên môn súc tích, hướng dẫn an toàn tại chỗ và đề xuất dịch vụ cứu hộ phù hợp nếu cần thiết.
                - TUYỆT ĐỐI KHÔNG NÓI 'Tôi không nhận được hình ảnh' hoặc 'Tôi không thể xem ảnh'. Bạn là Gemini Multimodal AI có đầy đủ năng lực thị giác máy tính!
                """, photoCount)
                : "";

        String prompt = String.format("""
                Bạn là Trợ lý Cứu hộ Giao thông SRAS (Smart Rescue Assistance System) tại Việt Nam.
                Nhiệm vụ của bạn:
                1. Trò chuyện ân cần, lịch sự, đóng vai chuyên gia kỹ thuật xe và điều phối cứu hộ 24/7.
                2. Lắng nghe khách mô tả sự cố, hỏi thăm thêm nếu cần chẩn đoán, hoặc tư vấn an toàn tại hiện trường.
                3. BẮT BUỘC TRẢ LỜI DỰA TRÊN DỮ LIỆU THỰC TẾ TRONG HỆ THỐNG SRAS DƯỚI ĐÂY:
                   %s
                %s

                QUY TẮC BẮT BUỘC VỀ PHẠM VI HỖ TRỢ VÀ PHONG CÁCH TRẢ LỜI:
                1. KIỂM SOÁT PHẠM VI CHUYÊN MÔN (RẤT QUAN TRỌNG):
                   - Bạn CHỈ hỗ trợ các vấn đề liên quan đến: Cứu hộ giao thông, sửa chữa/chẩn đoán sự cố xe máy & ô tô, tìm gara, tra cứu giá dịch vụ và phí di chuyển cứu hộ.
                   - KHI KHÁCH HỎI CÂU HỎI HOẶC GỬI HÌNH ẢNH NGOÀI PHẠM VI (ví dụ: hỏi lập trình/viết code, giải toán, dịch thuật, thơ ca, thời tiết, tâm sự cảm xúc, trêu đùa, đồ ăn, công nghệ khác, ảnh màn hình laptop...):
                     + BẮT BUỘC từ chối lịch sự, NGẮN GỌN (1-2 câu), TUYỆT ĐỐI KHÔNG trả lời lan man dài dòng về chủ đề ngoài luồng đó.
                     + Ví dụ lời đáp: "Tôi là Trợ lý cứu hộ chuyên nghiệp của SRAS. Nội dung này nằm ngoài phạm vi hỗ trợ của tôi. Nếu xe của bạn đang gặp trục trặc kỹ thuật hoặc cần tìm gara, hãy mô tả để tôi hỗ trợ ngay nhé!"
                     + BẮT BUỘC đặt `isRescueProposal = false` và `proposedOrder = null`.
                2. NGUYÊN TẮC ĐỀ XUẤT ĐẶT CỨU HỘ (isRescueProposal):
                   - CHỈ ĐƯỢC đặt `isRescueProposal = true` khi:
                     (a) Khách THỰC SỰ đang gặp sự cố xe cộ (được xác thực qua mô tả xe hoặc hình ảnh xe thật sự gặp nạn); HOẶC
                     (b) Khách rõ ràng yêu cầu gọi cứu hộ / đồng ý đặt gara hỗ trợ tại chỗ.
                   - NẾU KHÁCH GỬI ẢNH KHÔNG LIÊN QUAN ĐẾN XE (như màn hình máy tính, đồ ăn...), hoặc câu hỏi ngoài luồng, hoặc chỉ hỏi thăm thông tin chung:
                     + BẮT BUỘC đặt `isRescueProposal = false` và `proposedOrder = null`! TUYỆT ĐỐI KHÔNG gán ghép đơn cứu hộ hay chọn gara!
                3. PHONG CÁCH TRẢ LỜI VÀ CÁC QUY TẮC BẮT BUỘC:
                   - QUY TẮC CẤM HIỂN THỊ ID (TUYỆT ĐỐI BẮT BUỘC):
                     + Trong TOÀN BỘ câu trả lời hiển thị cho khách hàng, TUYỆT ĐỐI KHÔNG ĐƯỢC nhắc đến mã ID của Gara (ví dụ: TUYỆT ĐỐI KHÔNG ĐƯỢC viết 'ID: 9', 'ID: 11', '(ID: 9)', 'Gara (ID: 11)', 'Mã ID: 9').
                     + Người dùng không quan tâm và KHÔNG ĐƯỢC thấy các mã ID kỹ thuật nội bộ này!
                     + Luôn gọi Gara bằng tên thương hiệu đầy đủ và tự nhiên (ví dụ: **Gara AutoCare Hội An**, **Gara Thành Nhân Đà Nẵng**).
                     + Mã ID chỉ được sử dụng ngầm duy nhất ở trường `garageId` trong JSON `proposedOrder` nếu có tạo đơn đề xuất.
                   - QUY TẮC ĐỊNH DẠNG VĂN BẢN (IN ĐẬM THÔNG TIN QUAN TRỌNG):
                     + Hãy chủ động sử dụng Markdown **in đậm** cho tất cả các thông tin cốt lõi trong câu trả lời để người dùng dễ đọc và nắm bắt nhanh:
                       * **Tên Gara** (ví dụ: **Gara Thành Nhân Đà Nẵng**)
                       * **Điểm đánh giá & số lượt đánh giá** (theo đúng số liệu thực tế trong dữ liệu)
                       * **Khoảng cách & thời gian ước tính** (ví dụ: **1.7 km**, **khoảng 10 phút**)
                       * **Trạng thái hoạt động** (ví dụ: **Đang trực Online**, **Rất rảnh (0 đơn)**, **Đang xử lý 2 đơn**)
                       * **Chi phí & giá tiền** (ví dụ: **50.000đ**, **15.000đ/km**)
                   - QUY TẮC VỀ DỮ LIỆU ĐÁNH GIÁ (TRUNG THỰC VÀ CHÍNH XÁC):
                     + BẮT BUỘC trả lời chính xác theo số liệu trong 'Đánh giá chất lượng thực tế' được cung cấp ở trên.
                     + NẾU GARA CHƯA CÓ LƯỢT ĐÁNH GIÁ NÀO (Gara mới): Bắt buộc nói rõ là gara này **chưa có lượt đánh giá nào từ khách hàng (đây là Gara mới tham gia hệ thống SRAS)**. TUYỆT ĐỐI KHÔNG tự bịa số sao hay số lượng khách đánh giá!
                     + NẾU GARA ĐÃ CÓ ĐÁNH GIÁ: Nêu chính xác số điểm sao và số lượt đánh giá trong dữ liệu.
                      + TUYỆT ĐỐI KHÔNG trích dẫn nhận xét, lời bình của khách (TUYỆT ĐỐI KHÔNG viết các câu như "với nhận xét như...", "với nhận xét thực tế như...").
                   - PHONG CÁCH TỔNG QUAN:
                     + Trả lời ngắn gọn, súc tích, đi thẳng vào trọng tâm, tự nhiên như chuyên gia kỹ thuật cứu hộ xe.
                     + KHÔNG trả lời lan man dài dòng, KHÔNG lặp lại thông tin thừa.
                     + TUYỆT ĐỐI KHÔNG nhắc đến các mã định danh nội bộ (như HD_..., DASH_LIGHT_...) và KHÔNG nói "Dựa theo cơ sở tri thức hệ thống SRAS", "Theo sách hướng dẫn sử dụng trang xx".
                     + Tập trung vào: Tên bệnh/sự cố xe, nguyên nhân cốt lõi, cách xử lý an toàn tại chỗ và hướng dẫn đặt cứu hộ nếu cần thợ.
                4. CÁC CÂU HỎI VỀ GARA VÀ DỊCH VỤ:
                   - KHI KHÁCH HỎI "GARA NÀO ĐÁNH GIÁ CAO NHẤT?" / "GARA NÀO UY TÍN NHẤT?" / "GARA NÀO TỐT NHẤT?":
                      + BẮT BUỘC CHỈ NÊU ĐÚNG DUY NHẤT 1 GARA CÓ ĐIỂM ĐÁNH GIÁ CAO NHẤT HIỆN TẠI TRONG "BẢNG XẾP HẠNG GARA UY TÍN NHẤT" (TUYỆT ĐỐI KHÔNG liệt kê gara thứ 2, thứ 3...).
                      + Nêu rõ tên Gara số 1 đó, điểm số ⭐ sao thực tế và số lượt đánh giá (lấy chính xác từ mục BẢNG XẾP HẠNG, TUYỆT ĐỐI KHÔNG tự bịa số sao hay số lượng đánh giá).
                      + TUYỆT ĐỐI KHÔNG trích dẫn nhận xét, lời bình của khách hàng (KHÔNG viết "với nhận xét như...", "với nhận xét thực tế như...").
                      + Nêu rõ tình trạng bận/rảnh hiện tại, trạng thái trực Online/Ngoại tuyến và khoảng cách/phí di chuyển đến chỗ khách (nếu có GPS).
                      + Nếu tất cả gara đều chưa có đánh giá nào, báo thật thà là các gara đều mới tham gia và chưa có đánh giá nào trên hệ thống.
                    - KHI KHÁCH HỎI "GARA NÀO BẬN?" / "GARA NÀO RẢNH?" / "GARA NÀO ĐẾN NHANH NHẤT?":
                     + Tra cứu chỉ số "Tình trạng bận/rảnh" và "Nhân sự kỹ thuật" của các gara trong dữ liệu:
                       * Nêu rõ Gara nào đang RẤT RẢNH (0 ca cứu hộ đang làm, thợ sẵn sàng xuất phát ngay -> đến nhanh nhất).
                       * Nêu rõ Gara nào đang BẬN (đang có bao nhiêu ca cứu hộ đang làm, có thể phải chờ lâu hơn).
                       * Khuyên khách nên chọn gara vừa gần, vừa đang rảnh để được cứu hộ nhanh nhất.
                   - KHI KHÁCH HỎI "NÊN CHỌN GARA NÀO?":
                     + Phân tích đa tiêu chí: Gara đang ONLINE + Khoảng cách gần + Đang rảnh (0-1 đơn) + Đánh giá cao (> 4.5 sao) để đưa ra lời khuyên tối ưu nhất cho khách.
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
                  "reply": "Lời đáp súc tích, ngắn gọn, chính xác theo dữ liệu và hình ảnh (nếu có) cho khách...",
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
        AiChatResponse chatResp = objectMapper.readValue(jsonText, AiChatResponse.class);
        if (chatResp != null && !Boolean.TRUE.equals(chatResp.getIsRescueProposal())) {
            chatResp.setIsRescueProposal(false);
            chatResp.setProposedOrder(null);
        }
        return chatResp;
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

        // Kiểm tra câu hỏi ngoài luồng (out-of-scope)
        if (lower.contains("code") || lower.contains("lập trình") || lower.contains("bài tập") ||
                lower.contains("thơ") || lower.contains("hát") || lower.contains("nấu ăn") ||
                lower.contains("thời tiết") || lower.contains("yêu") || lower.contains("buồn") ||
                lower.contains("chơi") || lower.contains("game") || lower.contains("máy tính") ||
                lower.contains("laptop") || lower.contains("phim")) {
            return AiChatResponse.builder()
                    .reply("Tôi là Trợ lý cứu hộ chuyên nghiệp của SRAS. Nội dung này nằm ngoài phạm vi hỗ trợ của tôi. Nếu xe của bạn đang gặp trục trặc kỹ thuật hoặc cần tìm gara hỗ trợ, hãy mô tả để tôi hỗ trợ ngay nhé!")
                    .isRescueProposal(false)
                    .proposedOrder(null)
                    .build();
        }
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

        // 2.1 CÂU HỎI VỀ GARA ĐÁNH GIÁ CAO NHẤT / UY TÍN NHẤT
        if (lower.contains("đánh giá cao") || lower.contains("sao cao") || lower.contains("uy tín") ||
                lower.contains("tốt nhất") || lower.contains("review") || lower.contains("chất lượng nhất")) {
            if (approvedGarages.isEmpty()) {
                return AiChatResponse.builder()
                        .reply("Hệ thống chưa có dữ liệu đánh giá gara nào. Vui lòng gọi Hotline 1900 6868 để được hỗ trợ.")
                        .isRescueProposal(false)
                        .build();
            }

            // Lấy đánh giá thực tế từ bảng ratings
            List<Long> fallbackGarageIds = approvedGarages.stream().map(Garage::getId).toList();
            Map<Long, RatingRepository.GarageRatingAgg> fallbackRatingMap = new HashMap<>();
            try {
                List<RatingRepository.GarageRatingAgg> aList = ratingRepository.aggregateByGarages(fallbackGarageIds);
                if (aList != null) {
                    for (RatingRepository.GarageRatingAgg a : aList) {
                        if (a != null && a.getGarageId() != null) {
                            fallbackRatingMap.put(a.getGarageId(), a);
                        }
                    }
                }
            } catch (Exception ex) {
                log.warn("Cannot aggregate ratings in fallback", ex);
            }

            List<Garage> sortedByRating = new ArrayList<>(approvedGarages);
            sortedByRating.sort((g1, g2) -> {
                RatingRepository.GarageRatingAgg a1 = fallbackRatingMap.get(g1.getId());
                RatingRepository.GarageRatingAgg a2 = fallbackRatingMap.get(g2.getId());
                long c1 = (a1 != null && a1.getCnt() != null) ? a1.getCnt() : 0L;
                long c2 = (a2 != null && a2.getCnt() != null) ? a2.getCnt() : 0L;
                if (c1 > 0 && c2 == 0) return -1;
                if (c1 == 0 && c2 > 0) return 1;

                double r1 = (a1 != null && a1.getAvgStars() != null && c1 > 0) ? a1.getAvgStars() : 0.0;
                double r2 = (a2 != null && a2.getAvgStars() != null && c2 > 0) ? a2.getAvgStars() : 0.0;
                int cmp = Double.compare(r2, r1);
                if (cmp != 0) return cmp;
                return Long.compare(c2, c1);
            });

            Garage topGarage = sortedByRating.get(0);
            RatingRepository.GarageRatingAgg topAgg = fallbackRatingMap.get(topGarage.getId());
            long topCount = (topAgg != null && topAgg.getCnt() != null) ? topAgg.getCnt() : 0L;
            Double dist = (userLat != null && userLng != null && topGarage.getLat() != null && topGarage.getLng() != null)
                    ? calculateDistanceKm(userLat, userLng, topGarage.getLat(), topGarage.getLng()) : null;
            boolean isOnline = Boolean.TRUE.equals(topGarage.getIsOnline());
            long travelFee = (dist != null)
                    ? (vType.equals("CAR") ? Math.max(50000L, Math.round(25000.0 * dist / 1000.0) * 1000L)
                                          : Math.max(30000L, Math.round(15000.0 * dist / 1000.0) * 1000L))
                    : 30000L;

            StringBuilder repBuilder = new StringBuilder();
            repBuilder.append("🏆 **Gara dẫn đầu bảng xếp hạng uy tín hiện tại:**\n\n");
            if (topCount > 0) {
                double topStars = (topAgg != null && topAgg.getAvgStars() != null) ? Math.round(topAgg.getAvgStars() * 10.0) / 10.0 : (topGarage.getAvgRating() != null ? topGarage.getAvgRating().doubleValue() : 0.0);
                repBuilder.append(String.format("⭐ **%s** — Đạt **%.1f / 5.0 sao** (từ **%d lượt đánh giá thực tế** của khách hàng)\n",
                        topGarage.getName(), topStars, topCount));
            } else {
                repBuilder.append(String.format("⭐ **%s** — **Gara mới tham gia hệ thống SRAS** (chưa có lượt đánh giá nào từ khách hàng)\n",
                        topGarage.getName()));
            }
            repBuilder.append(String.format("• **Trạng thái:** %s\n", isOnline ? "🟢 **Đang trực Online (Sẵn sàng phục vụ)**" : "⚪ **Tạm nghỉ trực**"));
            if (dist != null) {
                repBuilder.append(String.format("• **Khoảng cách tới bạn:** **%.1f km** (Phí di chuyển dự kiến: **%,d đ**)\n", dist, travelFee));
            }
            repBuilder.append(String.format("• **Địa chỉ:** %s\n", topGarage.getAddress() != null ? topGarage.getAddress() : "Chưa cập nhật"));
            repBuilder.append(String.format("• **Hotline:** %s\n\n", topGarage.getPhone() != null ? topGarage.getPhone() : "1900 6868"));


            repBuilder.append("Bạn có muốn tôi tạo đơn gọi thợ từ gara uy tín này hỗ trợ bạn không?");

            return AiChatResponse.builder()
                    .reply(repBuilder.toString())
                    .isRescueProposal(true)
                    .proposedOrder(AiChatResponse.ProposedRescueOrder.builder()
                            .garageId(topGarage.getId())
                            .garageName(topGarage.getName())
                            .vehicleType(vType)
                            .issueType("OTHER")
                            .title("Cứu hộ từ " + topGarage.getName() + " (Uy tín cao nhất)")
                            .description(String.format("Đánh giá %.1f sao", topGarage.getAvgRating() != null ? topGarage.getAvgRating().doubleValue() : 5.0))
                            .estimatedPrice("Theo dịch vụ yêu cầu")
                            .estimatedTravelFee(String.format("%,d đ", travelFee))
                            .distanceKm(dist)
                            .address(StringUtils.hasText(request.getUserLocation()) ? request.getUserLocation() : "Vị trí GPS hiện tại")
                            .lat(userLat)
                            .lng(userLng)
                            .build())
                    .build();
        }

        // 2.2 CÂU HỎI VỀ GARA BẬN / RẢNH / ĐẾN NHANH NHẤT
        if (lower.contains("bận") || lower.contains("rảnh") || lower.contains("đông") ||
                lower.contains("quá tải") || lower.contains("đến nhanh") || lower.contains("chờ lâu")) {
            if (approvedGarages.isEmpty()) {
                return AiChatResponse.builder()
                        .reply("Hệ thống chưa có dữ liệu gara. Vui lòng gọi Hotline 1900 6868.")
                        .isRescueProposal(false)
                        .build();
            }

            List<RescueStatus> activeStatuses = List.of(
                    RescueStatus.ACCEPTED, RescueStatus.ASSIGNED, RescueStatus.EN_ROUTE,
                    RescueStatus.ARRIVED, RescueStatus.DIAGNOSED, RescueStatus.REPAIRING_ONSITE,
                    RescueStatus.TOWING, RescueStatus.TOW_TO_GARAGE
            );
            Map<Long, Long> activeCounts = new HashMap<>();
            try {
                List<Object[]> rawCounts = rescueRequestRepository.countActiveRequestsGroupedByGarage(activeStatuses);
                if (rawCounts != null) {
                    for (Object[] row : rawCounts) {
                        if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                            activeCounts.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
                        }
                    }
                }
            } catch (Exception ex) {
                // ignore
            }

            StringBuilder repBuilder = new StringBuilder();
            repBuilder.append("📊 **Tình hình tải công việc thực tế của các gara hiện tại:**\n\n");

            List<Garage> freeGarages = new ArrayList<>();
            List<Garage> busyGarages = new ArrayList<>();

            for (Garage g : approvedGarages) {
                long orders = activeCounts.getOrDefault(g.getId(), 0L);
                if (orders == 0) {
                    freeGarages.add(g);
                } else {
                    busyGarages.add(g);
                }
            }

            if (!freeGarages.isEmpty()) {
                repBuilder.append("🟢 **Gara đang RẢNH (Sẵn sàng cử thợ đi ngay tức thì):**\n");
                for (Garage g : freeGarages) {
                    boolean isOnline = Boolean.TRUE.equals(g.getIsOnline());
                    Double dist = (userLat != null && userLng != null && g.getLat() != null && g.getLng() != null)
                            ? calculateDistanceKm(userLat, userLng, g.getLat(), g.getLng()) : null;
                    repBuilder.append(String.format("• **%s** — %s%s (0 ca đang chờ)\n",
                            g.getName(),
                            isOnline ? "Đang Online" : "Ngoại tuyến",
                            dist != null ? String.format(", cách %.1f km", dist) : ""));
                }
                repBuilder.append("\n");
            }

            if (!busyGarages.isEmpty()) {
                repBuilder.append("🟡 **Gara đang có đơn xử lý (Có thể phải chờ):**\n");
                for (Garage g : busyGarages) {
                    long orders = activeCounts.getOrDefault(g.getId(), 0L);
                    repBuilder.append(String.format("• **%s** — Đang xử lý **%d ca cứu hộ**\n", g.getName(), orders));
                }
                repBuilder.append("\n");
            }

            Garage bestChoice = !freeGarages.isEmpty() ? freeGarages.get(0) : approvedGarages.get(0);
            Double dist = (userLat != null && userLng != null && bestChoice.getLat() != null && bestChoice.getLng() != null)
                    ? calculateDistanceKm(userLat, userLng, bestChoice.getLat(), bestChoice.getLng()) : null;
            long travelFee = (dist != null)
                    ? (vType.equals("CAR") ? Math.max(50000L, Math.round(25000.0 * dist / 1000.0) * 1000L)
                                          : Math.max(30000L, Math.round(15000.0 * dist / 1000.0) * 1000L))
                    : 30000L;

            repBuilder.append(String.format("👉 Khuyến nghị: Bạn nên đặt **%s** để thợ có thể xuất phát đến hỗ trợ bạn nhanh nhất!", bestChoice.getName()));

            return AiChatResponse.builder()
                    .reply(repBuilder.toString())
                    .isRescueProposal(true)
                    .proposedOrder(AiChatResponse.ProposedRescueOrder.builder()
                            .garageId(bestChoice.getId())
                            .garageName(bestChoice.getName())
                            .vehicleType(vType)
                            .issueType("OTHER")
                            .title("Cứu hộ nhanh từ " + bestChoice.getName())
                            .description("Gara đang rảnh, thợ sẵn sàng xuất phát ngay")
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
                .reply("Chào bạn! Tôi là Trợ lý cứu hộ SRAS 24/7. Tôi có thể giúp bạn kiểm tra xem **các gara nào đang online**, **gara nào gần bạn nhất**, **bảng giá dịch vụ** hay **phí di chuyển của gara đến vị trí của bạn**. Bạn cần thông tin gì cứ hỏi tôi nhé!")
                .isRescueProposal(false)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public RoadHazardWarningResponse checkRoadHazardWarning(User customer, Double lat, Double lng, String address) {
        if (customer == null || (lat == null && !StringUtils.hasText(address))) {
            return RoadHazardWarningResponse.builder().hasWarning(false).incidentCount(0).build();
        }
        try {

        List<RescueRequest> pastRequests = rescueRequestRepository.findCustomerRequestsEager(customer);
        if (pastRequests == null || pastRequests.isEmpty()) {
            return RoadHazardWarningResponse.builder().hasWarning(false).incidentCount(0).build();
        }

        String searchRoad = extractMainRoadName(address);

        List<RescueRequest> matchedRequests = new ArrayList<>();
        for (RescueRequest req : pastRequests) {
            boolean isNearby = false;

            // 1. Kiểm tra toạ độ GPS nếu có (bán kính <= 1.5 km)
            if (lat != null && lng != null && req.getPickupLat() != null && req.getPickupLng() != null) {
                double distanceKm = calculateDistanceKm(lat, lng, req.getPickupLat(), req.getPickupLng());
                if (distanceKm <= 1.5) {
                    isNearby = true;
                }
            }

            // 2. Kiểm tra tên con đường nếu trùng khớp
            if (!isNearby && StringUtils.hasText(searchRoad) && StringUtils.hasText(req.getPickupAddress())) {
                String reqRoad = extractMainRoadName(req.getPickupAddress());
                if (StringUtils.hasText(reqRoad) && (searchRoad.toLowerCase().contains(reqRoad.toLowerCase()) || reqRoad.toLowerCase().contains(searchRoad.toLowerCase()))) {
                    isNearby = true;
                }
            }

            if (isNearby) {
                matchedRequests.add(req);
            }
        }

        int count = matchedRequests.size();
        // MỨC ĐỘ THƯỜNG XUYÊN: Bị hư tại cùng 1 con đường/khu vực TRÊN 2 LẦN (>= 2 lần) mới cảnh báo
        if (count < 2) {
            return RoadHazardWarningResponse.builder()
                    .hasWarning(false)
                    .incidentCount(count)
                    .build();
        }

        // Tên con đường hiển thị
        String displayRoadName = StringUtils.hasText(searchRoad) ? searchRoad :
                (StringUtils.hasText(address) ? address :
                        (matchedRequests.get(0).getPickupAddress() != null ? extractMainRoadName(matchedRequests.get(0).getPickupAddress()) : "khu vực này"));

        // Thống kê các sự cố cũ
        Map<String, Integer> issueCounts = new LinkedHashMap<>();
        List<RoadHazardWarningResponse.PastIncidentSummary> pastSummaries = new ArrayList<>();
        java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");

        for (RescueRequest r : matchedRequests) {
            String issue = r.getIssueType() != null ? r.getIssueType() : "OTHER";
            issueCounts.put(issue, issueCounts.getOrDefault(issue, 0) + 1);

            String vehicleName = "Xe của bạn";
            try {
                if (r.getCustomerVehicle() != null) {
                    String b = r.getCustomerVehicle().getBrand() != null ? r.getCustomerVehicle().getBrand() : "";
                    String m = r.getCustomerVehicle().getModel() != null ? r.getCustomerVehicle().getModel() : "";
                    vehicleName = (b + " " + m).trim();
                    if (vehicleName.isEmpty()) vehicleName = "Xe của bạn";
                } else if (r.getVehicleType() != null) {
                    vehicleName = r.getVehicleType().name().equals("CAR") ? "Ô tô" : "Xe máy";
                }
            } catch (Exception ignored) {
                if (r.getVehicleType() != null) {
                    vehicleName = r.getVehicleType().name().equals("CAR") ? "Ô tô" : "Xe máy";
                }
            }

            pastSummaries.add(RoadHazardWarningResponse.PastIncidentSummary.builder()
                    .date(r.getCreatedAt() != null ? r.getCreatedAt().format(dtf) : "Trước đây")
                    .issueType(issue)
                    .issueTypeName(mapIssueTypeToName(issue))
                    .vehicleName(vehicleName)
                    .symptom(r.getSymptom())
                    .build());
        }

        // Loại bệnh thường gặp nhất tại cung đường này
        String mostCommonIssue = issueCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("OTHER");
        String commonIssueName = mapIssueTypeToName(mostCommonIssue);

        String warningMsg = String.format("Cảnh báo cung đường rủi ro: Bạn đã từng gặp sự cố %d lần tại %s (chủ yếu là: %s). Hãy giảm tốc độ, chú ý quan sát dị vật hoặc cân nhắc lộ trình thay thế.",
                count, displayRoadName, commonIssueName);

        List<String> recommendations = new ArrayList<>();
        recommendations.add("Giảm tốc độ và quan sát kỹ mặt đường để tránh đinh nhọn, nắp cống hoặc ổ gà.");
        if ("FLAT_TIRE".equals(mostCommonIssue)) {
            recommendations.add("Đoạn đường này có nguy cơ rải đinh hoặc vật sắc nhọn cao, hạn chế đi sát mép lề đường bên phải.");
        } else if ("ENGINE_FAILURE".equals(mostCommonIssue)) {
            recommendations.add("Đoạn đường này có tiền sử ngập nước hoặc ùn tắc dài, hãy quan sát đồng hồ nhiệt độ máy và không đi vào vùng nước ngập sâu.");
        } else if ("DEAD_BATTERY".equals(mostCommonIssue)) {
            recommendations.add("Kiểm tra lại điện áp bình ắc-quy và đèn báo sạc trước khi tiếp tục hành trình dài.");
        }
        recommendations.add("Hệ thống cứu hộ SRAS đã định vị sẵn các trạm/gara cứu hộ đối tác gần nhất để sẵn sàng ứng cứu nếu có sự cố.");

        return RoadHazardWarningResponse.builder()
                .hasWarning(true)
                .roadName(displayRoadName)
                .incidentCount(count)
                .pastIncidents(pastSummaries)
                .aiWarningMessage(warningMsg)
                .safetyRecommendations(recommendations)
                .build();
        } catch (Exception e) {
            log.warn("[AI Road Hazard Warning] Fallback: {}", e.getMessage());
            return RoadHazardWarningResponse.builder().hasWarning(false).incidentCount(0).build();
        }
    }

    private String mapIssueTypeToName(String issueType) {
        if (issueType == null) return "Sự cố cơ khí";
        return switch (issueType) {
            case "FLAT_TIRE" -> "Thủng lốp / Cán đinh";
            case "DEAD_BATTERY" -> "Hết ắc quy / Mất điện";
            case "ENGINE_FAILURE" -> "Chết máy / Hỏng động cơ";
            case "OUT_OF_FUEL" -> "Hết nhiên liệu";
            case "ACCIDENT" -> "Va chạm / Tai nạn";
            default -> "Sự cố cơ khí";
        };
    }

    private String extractMainRoadName(String address) {
        if (!StringUtils.hasText(address)) return "";
        String clean = address.trim();
        // Bỏ số nhà ở đầu (ví dụ "123 Nguyễn Văn Linh" -> "Nguyễn Văn Linh")
        clean = clean.replaceFirst("^\\d+[A-Za-z0-9/\\-]*\\s+", "");
        // Lấy đoạn đầu trước dấu phẩy
        if (clean.contains(",")) {
            clean = clean.split(",")[0].trim();
        }
        return clean;
    }
}
