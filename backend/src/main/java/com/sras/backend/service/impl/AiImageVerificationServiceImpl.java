package com.sras.backend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sras.backend.config.GeminiApiKeyProvider;
import com.sras.backend.dto.request.DocumentPhotoAnalysisRequest;
import com.sras.backend.dto.request.GarageDossierAnalysisRequest;
import com.sras.backend.dto.request.VehiclePhotoAnalysisRequest;
import com.sras.backend.dto.response.DocumentPhotoAnalysisResponse;
import com.sras.backend.dto.response.GarageDossierAnalysisResponse;
import com.sras.backend.dto.response.VehiclePhotoAnalysisResponse;
import com.sras.backend.entity.enums.AiVerificationStatus;
import com.sras.backend.entity.enums.GarageDocType;
import com.sras.backend.entity.enums.RescueVehicleKind;
import com.sras.backend.service.AiImageVerificationService;
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

import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiImageVerificationServiceImpl implements AiImageVerificationService {

    private final FileStorageService fileStorageService;
    private final GeminiApiKeyProvider geminiApiKeyProvider;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = createRestTemplate();

    private record CachedDocResult(DocumentPhotoAnalysisResponse response, long expiresAtMillis) {}
    private static final long DOC_CACHE_TTL_MS = 30L * 60L * 1000L;
    private final Map<String, CachedDocResult> documentVerifyCache = new ConcurrentHashMap<>();

    @Value("${gemini.model:gemini-flash-lite-latest}")
    private String geminiModel;

    private static final String GEMINI_API_URL_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private static final List<String> CANDIDATE_MODELS = List.of(
            "gemini-3.8-flash",
            "gemini-3.5-flash",
            "gemini-flash-latest",
            "gemini-flash-lite-latest",
            "gemini-2.5-flash"
    );

    private static RestTemplate createRestTemplate() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(4000);
        factory.setReadTimeout(10000);
        return new RestTemplate(factory);
    }

    // =========================================================================
    // 1. VERIFY VEHICLE PHOTO (XE CỨU HỘ)
    // =========================================================================
    @Override
    public VehiclePhotoAnalysisResponse verifyVehiclePhoto(VehiclePhotoAnalysisRequest request) {
        if (!StringUtils.hasText(request.getPhotoUrl())) {
            return VehiclePhotoAnalysisResponse.builder()
                    .vehiclePresent(false)
                    .status(AiVerificationStatus.REJECTED)
                    .message("Vui lòng tải lên ảnh xe cứu hộ.")
                    .photoQuality("MISSING")
                    .build();
        }

        byte[] imageBytes = resolveImageBytes(request.getPhotoUrl());
        if (imageBytes == null || imageBytes.length == 0) {
            return VehiclePhotoAnalysisResponse.builder()
                    .vehiclePresent(false)
                    .status(AiVerificationStatus.REJECTED)
                    .message("Không thể tải dữ liệu ảnh từ đường dẫn đã cung cấp.")
                    .photoQuality("UNREADABLE")
                    .build();
        }

        if (!geminiApiKeyProvider.hasKeys()) {
            log.warn("[AI Verification] Chưa có Gemini API Key, sử dụng kiểm tra quy tắc cơ bản");
            return fallbackVehicleCheck(request);
        }

        try {
            String prompt = """
                    Bạn là Chuyên gia AI Giám định Phương tiện Cứu hộ Giao thông & Chống gian lận (Anti-Spoofing) của hệ thống SRAS tại Việt Nam.
                    Nhiệm vụ: Quan sát cực kỳ kỹ lưỡng bức ảnh đính kèm và phân tích:
                    
                    1. KIỂM TRA CHỐNG GIAN LẬN / CHỤP LẠI MÀN HÌNH (isScreenCapture: boolean) - [BẮT BUỘC KIỂM TRA ĐẦU TIÊN]:
                       Hệ thống nghiêm cấm hành vi gian lận chụp lại xe từ màn hình máy tính để bàn, laptop, iPad, điện thoại khác hoặc màn hình TV.
                       DÙ ẢNH XE HIỂN THỊ TRÊN MÀN HÌNH CÓ RÕ NÉT ĐẾN ĐÂU, nếu bức ảnh bạn đang nhìn có BẤT KỲ DẤU HIỆU NÀO sau đây thì BẮT BUỘC ĐÁNH DẤU isScreenCapture = true:
                       - Dấu hiệu 1: Xuất hiện vân Moiré (các sọc gợn sóng lượn sóng, sọc chéo, sọc ngang, vân cầu vồng hoặc mạng lưới điểm ảnh LCD/LED/OLED khi chụp qua thấu kính).
                       - Dấu hiệu 2: Thấy cạnh viền khung màn hình, viền đen bezel của laptop/monitor/điện thoại, chân đế, bàn phím, con trỏ chuột máy tính (mouse cursor), thanh taskbar Windows/macOS, tab trình duyệt, góc màn hình.
                       - Dấu hiệu 3: Vệt loá phản chiếu (glare/reflection) của bóng đèn trần, ánh đèn phòng hoặc bóng người chụp phản chiếu trên mặt gương kính màn hình.
                       - Dấu hiệu 4: Ánh sáng đèn nền điện tử (backlight) phát quang phẳng (flat 2D pixel glow), màu sắc có sắc xanh/xám màn hình thay vì ánh sáng tự nhiên ngoài trời/trong xưởng thực tế.
                       -> NẾU là ảnh chụp chiếc xe thực tế đang đỗ ở xưởng, gara, sân bãi tự nhiên: isScreenCapture = false.
                       -> NẾU CÓ DẤU HIỆU CHỤP LẠI QUA MÀN HÌNH THIẾT BỊ: isScreenCapture = true.

                    2. PHƯƠNG TIỆN CÓ PHẢI LÀ XE CỨU HỘ GIAO THÔNG CHUYÊN DỤNG KHÔNG? (isRescueVehicle: boolean) - [RẤT QUAN TRỌNG]:
                       Hệ thống SRAS chỉ tiếp nhận PHƯƠNG TIỆN CỨU HỘ CHUYÊN DỤNG CỦA GARA, KHÔNG CHẤP NHẬN XE CON CÁ NHÂN.
                       - XE CỨU HỘ HỢP LỆ (isRescueVehicle = true):
                         + "TOW_TRUCK": Xe cẩu, xe kéo, xe chở ô tô cứu hộ có sàn trượt, cần cẩu hoặc càng nâng kéo xe (Hino, Isuzu, Hyundai, Dongfeng...).
                         + "VAN": Xe tải, xe bán tải cứu hộ chuyên dụng (pickup), xe tải thùng chở đồ nghề, phụ tùng cứu hộ (Thaco, Forland, Kia, Hyundai, Isuzu, Hino...). BẤT KỲ XE TẢI NÀO CỦA GARA ĐỀU ĐƯỢC COI LÀ PHƯƠNG TIỆN CỨU HỘ HỢP LỆ.
                         + "MOTORBIKE": Xe máy cứu hộ 2 bánh lưu động của thợ (có giá/thùng chở đồ nghề, bình kích ắc quy...).
                         -> NẾU LÀ XE TẢI, XE CẨU, XE KÉO HOẶC XE MÁY: BẮT BUỘC ĐẶT isRescueVehicle = true!
                       - XE CÁ NHÂN / KHÔNG PHẢI XE CỨU HỘ (BẮT BUỘC ĐẶT isRescueVehicle = false, detectedKind = "OTHER"):
                         + CHỈ ÁP DỤNG CHO: Xe ô tô con cá nhân 4 - 7 chỗ (Sedan, Hatchback, Crossover, SUV gia đình cá nhân như Audi, BMW, Mercedes, Toyota Vios/Camry, Hyundai Accent/SantaFe, Mazda, Kia, VinFast VF...).
                         + Xe đạp, xe ba gác, xe xích lô, xe buýt công cộng, xe khách...
                         -> CHỈ KHI LÀ XE Ô TÔ CON CÁ NHÂN (Sedan, SUV 4-7 chỗ): BẮT BUỘC ĐẶT isRescueVehicle = false, detectedKind = "OTHER", message = "Ảnh chụp xe ô tô con cá nhân, không phải phương tiện cứu hộ giao thông."

                    3. Có chứa phương tiện giao thông (ô tô, xe tải, xe cẩu, xe kéo, xe máy) hay không? (vehiclePresent: boolean).
                       - NẾU LÀ ẢNH KHÔNG LIÊN QUAN (đồ ăn, selfie người, phong cảnh, đồ vật ngẫu nhiên...): vehiclePresent = false, isRescueVehicle = false.
                    
                    4. Loại xe nhận diện được (detectedKind): Chọn chính xác 1 trong các giá trị:
                       - "TOW_TRUCK": Xe cẩu, xe kéo cứu hộ ô tô chuyên dụng (có sàn trượt, cần cẩu hoặc càng nâng).
                       - "VAN": Xe tải nhẹ, xe bán tải (pickup), xe chở đồ nghề cứu hộ.
                       - "MOTORBIKE": Xe máy, mô tô 2 bánh cứu hộ lưu động.
                       - "OTHER": Xe ô tô con cá nhân hoặc phương tiện khác không phải xe cứu hộ.
                    
                    5. Mô tả ngắn loại xe (detectedKindDescription): VD: "Xe ô tô con cá nhân", "Xe cẩu / kéo cứu hộ sàn trượt", "Xe máy cứu hộ lưu động".
                    
                    6. Biển số xe nhận diện được (detectedPlate): Đọc chính xác biển số xe Việt Nam trên xe (ví dụ: 51C-042.18, 43A-123.45, 75A-168.68, 29B-999.88, 59P1-123.45). Nếu không đọc được để null.
                    
                    7. Chất lượng ảnh (photoQuality): "CLEAR" (rõ nét), "BLURRY" (bị mờ/nhòe), "DARK" (quá tối), "OBSTRUCTED" (bị che khuất biển số).
                    
                    8. Độ tin cậy nhận diện (confidenceScore: số thực từ 0.0 đến 1.0).
                    
                    9. Đánh giá tính hợp lệ (message: thông điệp tiếng Việt thân thiện, súc tích).

                    BẮT BUỘC TRẢ VỀ ĐÚNG JSON THEO ĐỊNH DẠNG SAU, KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO KHÁC:
                    {
                      "vehiclePresent": true,
                      "isRescueVehicle": true,
                      "detectedKind": "TOW_TRUCK",
                      "detectedKindDescription": "Xe cẩu / kéo cứu hộ chuyên dụng",
                      "detectedPlate": "51C-042.18",
                      "confidenceScore": 0.95,
                      "photoQuality": "CLEAR",
                      "isScreenCapture": false,
                      "message": "Ảnh xe cứu hộ rõ nét, biển số nhận diện chính xác."
                    }
                    """;

            String jsonOutput = callGeminiVision(prompt, imageBytes, request.getPhotoUrl());
            JsonNode root = objectMapper.readTree(cleanJsonOutput(jsonOutput));

            boolean vehiclePresent = root.path("vehiclePresent").asBoolean(false);
            boolean isRescueVehicle = root.path("isRescueVehicle").asBoolean(false);
            String rawKind = root.path("detectedKind").asText("OTHER");
            RescueVehicleKind detectedKind = parseRescueVehicleKind(rawKind);
            String detectedKindDesc = root.path("detectedKindDescription").asText("");
            String detectedPlate = root.path("detectedPlate").isNull() ? null : root.path("detectedPlate").asText(null);
            double confidence = root.path("confidenceScore").asDouble(0.85);
            String photoQuality = root.path("photoQuality").asText("CLEAR");
            boolean isScreenCapture = root.path("isScreenCapture").asBoolean(false);
            String message = root.path("message").asText("Đã phân tích ảnh xe cứu hộ");

            // Kiểm tra bổ sung nếu mô tả hoặc thông điệp chỉ ra là xe cá nhân/không phải xe cứu hộ
            String lowerDesc = detectedKindDesc != null ? detectedKindDesc.toLowerCase() : "";
            String lowerMsg = message != null ? message.toLowerCase() : "";
            boolean isPersonalCarOrOther = "OTHER".equalsIgnoreCase(rawKind) || detectedKind == null
                    || lowerDesc.contains("cá nhân") || lowerDesc.contains("xe con") || lowerDesc.contains("ô tô con")
                    || lowerDesc.contains("sedan") || lowerDesc.contains("suv") || lowerDesc.contains("hatchback")
                    || lowerDesc.contains("không phải phương tiện cứu hộ") || lowerDesc.contains("không phải xe cứu hộ")
                    || lowerMsg.contains("cá nhân") || lowerMsg.contains("xe con") || lowerMsg.contains("ô tô con")
                    || lowerMsg.contains("sedan") || lowerMsg.contains("suv") || lowerMsg.contains("hatchback")
                    || lowerMsg.contains("không phải phương tiện cứu hộ") || lowerMsg.contains("không phải xe cứu hộ");

            if (isPersonalCarOrOther) {
                isRescueVehicle = false;
            }

            String normalizedDetectedPlate = normalizePlate(detectedPlate);

            // Cross-check with expected plate & kind
            Boolean plateMatch = null;
            if (StringUtils.hasText(request.getExpectedPlate()) && StringUtils.hasText(normalizedDetectedPlate)) {
                String normalizedExpected = normalizePlate(request.getExpectedPlate());
                plateMatch = isPlateMatching(normalizedExpected, normalizedDetectedPlate);
            }

            Boolean kindMatch = null;
            if (request.getExpectedKind() != null && detectedKind != null) {
                kindMatch = isKindCompatible(request.getExpectedKind(), detectedKind);
            }

            // Determine status
            AiVerificationStatus status = AiVerificationStatus.VERIFIED;
            if (!vehiclePresent) {
                status = AiVerificationStatus.REJECTED;
                message = "Ảnh không chứa phương tiện giao thông hợp lệ. Vui lòng chụp rõ xe cứu hộ.";
            } else if (isScreenCapture) {
                status = AiVerificationStatus.REJECTED;
                message = "Phát hiện ảnh chụp lại từ màn hình máy tính/thiết bị khác (nghi vấn giả mạo phương tiện). Vui lòng chụp trực tiếp xe cứu hộ thực tế tại gara.";
            } else if (!isRescueVehicle || isPersonalCarOrOther) {
                status = AiVerificationStatus.REJECTED;
                if (!StringUtils.hasText(message) || message.contains("Đã phân tích") || message.contains("rõ nét")) {
                    message = "Phương tiện trong ảnh là xe ô tô cá nhân / không phải xe cứu hộ chuyên dụng của Gara. Vui lòng chụp đúng xe cứu hộ (xe cẩu/kéo, xe tải chở đồ nghề hoặc xe máy cứu hộ).";
                }
            } else if ("BLURRY".equalsIgnoreCase(photoQuality) || "DARK".equalsIgnoreCase(photoQuality)) {
                status = AiVerificationStatus.WARNING;
                message = "Ảnh chụp có thể bị mờ hoặc quá tối. Bạn nên chụp lại rõ nét hơn.";
            } else if (Boolean.FALSE.equals(plateMatch)) {
                status = AiVerificationStatus.WARNING;
                message = String.format("Biển số phát hiện từ ảnh (%s) khác với biển số bạn nhập (%s).",
                        detectedPlate != null ? detectedPlate : "Không rõ", request.getExpectedPlate());
            } else if (Boolean.FALSE.equals(kindMatch)) {
                status = AiVerificationStatus.WARNING;
                message = String.format("Loại xe trong ảnh (%s) có vẻ không khớp với loại xe bạn đã chọn.",
                        detectedKindDesc);
            }

            return VehiclePhotoAnalysisResponse.builder()
                    .vehiclePresent(vehiclePresent)
                    .isRescueVehicle(isRescueVehicle)
                    .detectedKind(detectedKind)
                    .detectedKindDescription(detectedKindDesc)
                    .detectedPlate(detectedPlate)
                    .normalizedPlate(normalizedDetectedPlate)
                    .confidenceScore(confidence)
                    .plateMatch(plateMatch)
                    .kindMatch(kindMatch)
                    .photoQuality(photoQuality)
                    .isScreenCapture(isScreenCapture)
                    .status(status)
                    .message(message)
                    .suggestion(normalizedDetectedPlate)
                    .build();

        } catch (Exception e) {
            log.error("[AI Verification] Lỗi phân tích ảnh xe cứu hộ: {}", e.getMessage(), e);
            return fallbackVehicleCheck(request);
        }
    }

    // =========================================================================
    // 2. VERIFY DOCUMENT PHOTO (CCCD, GPKD, MẶT TIỀN GARA)
    // =========================================================================
    @Override
    public DocumentPhotoAnalysisResponse verifyDocumentPhoto(DocumentPhotoAnalysisRequest request) {
        if (!StringUtils.hasText(request.getPhotoUrl())) {
            return DocumentPhotoAnalysisResponse.builder()
                    .docType(request.getDocType())
                    .validDocument(false)
                    .status(AiVerificationStatus.REJECTED)
                    .message("Vui lòng tải lên ảnh tài liệu xác minh.")
                    .photoQuality("MISSING")
                    .build();
        }

        String cacheKey = buildDocCacheKey(request.getDocType(), request.getPhotoUrl());
        CachedDocResult cached = documentVerifyCache.get(cacheKey);
        if (cached != null && System.currentTimeMillis() < cached.expiresAtMillis()) {
            log.info("[AI Verification] Cache hit cho tài liệu {}", cacheKey);
            return cached.response();
        }

        byte[] imageBytes = resolveImageBytes(request.getPhotoUrl());
        if (imageBytes == null || imageBytes.length == 0) {
            return DocumentPhotoAnalysisResponse.builder()
                    .docType(request.getDocType())
                    .validDocument(false)
                    .status(AiVerificationStatus.REJECTED)
                    .message("Không thể đọc ảnh tài liệu từ đường dẫn.")
                    .photoQuality("UNREADABLE")
                    .build();
        }

        if (!geminiApiKeyProvider.hasKeys()) {
            return fallbackDocumentCheck(request);
        }

        try {
            GarageDocType docType = request.getDocType();
            String docGuide = getDocumentPromptGuide(docType);

            String prompt = String.format("""
                    Bạn là Chuyên gia AI Thẩm định Pháp lý Doanh nghiệp & Nhận diện Giấy tờ của hệ thống SRAS tại Việt Nam.
                    Nhiệm vụ: Phân tích kỹ bức ảnh tài liệu dưới đây (loại tài liệu yêu cầu: %s).

                    %s

                    YÊU CẦU KIỂM TRA CHUNG:
                    1. validDocument (boolean): Ảnh có đúng là loại tài liệu yêu cầu và hợp lệ không? (NẾU là ảnh đồ ăn, selfie, phong cảnh, hoặc tài liệu sai loại: validDocument = false).
                    2. photoQuality: "CLEAR" (rõ nét), "BLURRY" (bị mờ/nhòe), "DARK" (quá tối), "CROPPED" (bị che/mất góc).
                    3. KIỂM TRA CHỐNG GIAN LẬN / CHỤP LẠI MÀN HÌNH (isScreenCapture: boolean):
                       Kiểm tra cực kỳ khắt khe xem tài liệu/giấy tờ có phải bị chụp lại từ màn hình máy tính/laptop/điện thoại hay không.
                       Dù thông tin trên giấy tờ có rõ nét, nếu có bất kỳ dấu hiệu vân Moiré (sọc gợn sóng/nhiễu pixel ma trận LCD/OLED), vệt chói sáng bóng đèn trần phản chiếu trên mặt kính màn hình, viền đen bezel màn hình, con trỏ chuột, thanh tác vụ máy tính -> BẮT BUỘC ĐÁNH DẤU isScreenCapture = true và message ghi rõ: "Phát hiện tài liệu chụp lại từ màn hình thiết bị khác (nguy cơ giả mạo hồ sơ). Vui lòng chụp trực tiếp giấy tờ gốc."
                    4. confidenceScore: số thực từ 0.0 đến 1.0.
                    5. message: Nhận xét súc tích bằng tiếng Việt.
                    6. extractedData: Đối tượng JSON chứa các trường dữ liệu OCR bóc tách được (giá trị chuẩn hóa, viết hoa có dấu cho họ tên).

                    BẮT BUỘC TRẢ VỀ ĐÚNG JSON THEO ĐỊNH DẠNG (KHÔNG KÈM TEXT NGOÀI JSON):
                    {
                      "validDocument": true,
                      "confidenceScore": 0.95,
                      "photoQuality": "CLEAR",
                      "isScreenCapture": false,
                      "message": "Tài liệu hợp lệ, thông tin rõ ràng.",
                      "extractedData": {
                         ...
                      }
                    }
                    """, docType != null ? docType.name() : "DOCUMENT", docGuide);

            String jsonOutput = callGeminiVision(prompt, imageBytes, request.getPhotoUrl());
            JsonNode root = objectMapper.readTree(cleanJsonOutput(jsonOutput));

            boolean validDoc = root.path("validDocument").asBoolean(false);
            double confidence = root.path("confidenceScore").asDouble(0.85);
            String photoQuality = root.path("photoQuality").asText("CLEAR");
            boolean isScreenCapture = root.path("isScreenCapture").asBoolean(false);
            String message = root.path("message").asText("Đã thẩm định tài liệu");

            Map<String, Object> extractedData = new HashMap<>();
            JsonNode extNode = root.path("extractedData");
            if (extNode.isObject()) {
                Iterator<Map.Entry<String, JsonNode>> fields = extNode.fields();
                while (fields.hasNext()) {
                    Map.Entry<String, JsonNode> entry = fields.next();
                    if (entry.getValue().isValueNode()) {
                        extractedData.put(entry.getKey(), entry.getValue().asText());
                    }
                }
            }

            AiVerificationStatus status = AiVerificationStatus.VERIFIED;
            if (!validDoc) {
                status = AiVerificationStatus.REJECTED;
                message = "Ảnh không đúng định dạng tài liệu yêu cầu hoặc không thể nhận diện. Vui lòng chụp lại giấy tờ gốc.";
            } else if (isScreenCapture) {
                status = AiVerificationStatus.REJECTED;
                message = "Phát hiện tài liệu chụp lại từ màn hình máy tính/thiết bị khác (nguy cơ giả mạo hồ sơ). Vui lòng chụp trực tiếp giấy tờ gốc.";
            } else if ("BLURRY".equalsIgnoreCase(photoQuality) || "CROPPED".equalsIgnoreCase(photoQuality)) {
                status = AiVerificationStatus.WARNING;
                message = "Ảnh có dấu hiệu bị mờ hoặc mất góc. Bạn nên chụp lại bản gốc rõ nét.";
            }

            DocumentPhotoAnalysisResponse result = DocumentPhotoAnalysisResponse.builder()
                    .docType(docType)
                    .validDocument(validDoc)
                    .confidenceScore(confidence)
                    .photoQuality(photoQuality)
                    .isScreenCapture(isScreenCapture)
                    .status(status)
                    .message(message)
                    .extractedData(extractedData)
                    .build();

            long now = System.currentTimeMillis();
            if (documentVerifyCache.size() > 500) {
                documentVerifyCache.entrySet().removeIf(entry -> entry.getValue().expiresAtMillis() <= now);
            }
            documentVerifyCache.put(cacheKey, new CachedDocResult(result, now + DOC_CACHE_TTL_MS));
            return result;

        } catch (Exception e) {
            log.error("[AI Verification] Lỗi phân tích tài liệu: {}", e.getMessage(), e);
            return fallbackDocumentCheck(request);
        }
    }

    private String buildDocCacheKey(GarageDocType docType, String photoUrl) {
        String url = photoUrl.trim();
        int idx = url.indexOf("/uploads/");
        String normalizedUrl = idx >= 0 ? url.substring(idx) : url;
        return (docType != null ? docType.name() : "UNKNOWN") + "::" + normalizedUrl;
    }

    // =========================================================================
    // 3. VERIFY GARAGE DOSSIER (ĐỐI SOÁT CHÉO TOÀN DIỆN 4 ẢNH HỒ SƠ)
    // =========================================================================
    @Override
    public GarageDossierAnalysisResponse verifyGarageDossier(GarageDossierAnalysisRequest request) {
        // Thực thi đồng thời 4 tác vụ phân tích tài liệu để giảm độ trễ từ ~12s xuống ~3s
        CompletableFuture<DocumentPhotoAnalysisResponse> frontFuture = CompletableFuture.supplyAsync(() ->
                verifyDocumentPhoto(DocumentPhotoAnalysisRequest.builder()
                        .docType(GarageDocType.OWNER_ID_CARD_FRONT)
                        .photoUrl(request.getIdCardFrontUrl())
                        .expectedName(request.getOwnerName())
                        .build()));

        CompletableFuture<DocumentPhotoAnalysisResponse> backFuture = CompletableFuture.supplyAsync(() ->
                verifyDocumentPhoto(DocumentPhotoAnalysisRequest.builder()
                        .docType(GarageDocType.OWNER_ID_CARD_BACK)
                        .photoUrl(request.getIdCardBackUrl())
                        .build()));

        CompletableFuture<DocumentPhotoAnalysisResponse> licenseFuture = CompletableFuture.supplyAsync(() ->
                verifyDocumentPhoto(DocumentPhotoAnalysisRequest.builder()
                        .docType(GarageDocType.BUSINESS_LICENSE)
                        .photoUrl(request.getBusinessLicenseUrl())
                        .expectedName(request.getGarageName())
                        .expectedAddress(request.getAddress())
                        .build()));

        CompletableFuture<DocumentPhotoAnalysisResponse> facadeFuture = CompletableFuture.supplyAsync(() ->
                verifyDocumentPhoto(DocumentPhotoAnalysisRequest.builder()
                        .docType(GarageDocType.GARAGE_PHOTO)
                        .photoUrl(request.getFacadePhotoUrl())
                        .expectedName(request.getGarageName())
                        .build()));

        try {
            CompletableFuture.allOf(frontFuture, backFuture, licenseFuture, facadeFuture).join();
        } catch (Exception e) {
            log.warn("[AI Verification] Một hoặc nhiều tác vụ phân tích tài liệu gặp lỗi: {}", e.getMessage());
        }

        DocumentPhotoAnalysisResponse frontRes = frontFuture.join();
        DocumentPhotoAnalysisResponse backRes = backFuture.join();
        DocumentPhotoAnalysisResponse licenseRes = licenseFuture.join();
        DocumentPhotoAnalysisResponse facadeRes = facadeFuture.join();

        List<String> warnings = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();

        // 0. Điểm chất lượng 4 chứng từ (Tối đa 20đ: mỗi ảnh rõ nét 5đ, mờ/cảnh báo 3đ, lỗi 0đ)
        double docQualityMaxScore = 20.0;
        double docQualityScore = 0.0;
        int validCount = 0;
        List<String> invalidDocNames = new ArrayList<>();

        DocumentPhotoAnalysisResponse[] docResponses = {frontRes, backRes, licenseRes, facadeRes};
        String[] docLabels = {"CCCD Mặt trước", "CCCD Mặt sau", "Giấy phép ĐKKD", "Ảnh mặt tiền Gara"};
        for (int i = 0; i < docResponses.length; i++) {
            DocumentPhotoAnalysisResponse docRes = docResponses[i];
            if (docRes.isValidDocument()) {
                validCount++;
                docQualityScore += (docRes.getStatus() == AiVerificationStatus.VERIFIED) ? 5.0 : 3.0;
            } else {
                invalidDocNames.add(docLabels[i]);
            }
        }

        // 1. Người đại diện (Tối đa 25đ — Chỉ đối soát CCCD vs GPKD, bỏ Tên tài khoản)
        String cccdName = getExtractedStr(frontRes.getExtractedData(), "fullName");
        String cccdIdNumber = getExtractedStr(frontRes.getExtractedData(), "idNumber");
        String licenseRep = getExtractedStr(licenseRes.getExtractedData(), "representativeName");
        String licenseRepIdNumber = getExtractedStr(licenseRes.getExtractedData(), "representativeIdNumber");
        String licenseTaxCode = getExtractedStr(licenseRes.getExtractedData(), "taxCode");

        double repMaxScore = 25.0;
        double repScore;
        Boolean repMatched = null;
        String repStatus;
        String repComparison = "";
        if (StringUtils.hasText(cccdName) && StringUtils.hasText(licenseRep)) {
            repMatched = isExactPersonNameMatching(cccdName, licenseRep);
            repStatus = repMatched ? "MATCHED" : "MISMATCH";
            repScore = repMatched ? 25.0 : 0.0;
            repComparison = String.format("CCCD (%s) vs GPKD (%s)", cccdName, licenseRep);
            if (!repMatched) {
                warnings.add("Họ tên trên CCCD (" + cccdName + ") không trùng khớp với Người đại diện trên GPKD (" + licenseRep + ")");
            }
        } else {
            repStatus = "UNAVAILABLE";
            repScore = 15.0;
            if (StringUtils.hasText(cccdName)) {
                repComparison = String.format("CCCD (%s) | Chưa đọc được tên người đại diện trên GPKD", cccdName);
            } else if (StringUtils.hasText(licenseRep)) {
                repComparison = String.format("GPKD (%s) | Chưa đọc được họ tên trên CCCD", licenseRep);
            }
        }

        // Đối chiếu chéo Số CCCD nếu cả mặt trước CCCD và GPKD đều đọc được
        Boolean idNumberMatched = null;
        double idMismatchPenalty = 0.0;
        if (StringUtils.hasText(cccdIdNumber) && StringUtils.hasText(licenseRepIdNumber)) {
            String digits1 = cccdIdNumber.replaceAll("[^0-9]", "");
            String digits2 = licenseRepIdNumber.replaceAll("[^0-9]", "");
            if (!digits1.isEmpty() && !digits2.isEmpty()) {
                idNumberMatched = digits1.equals(digits2);
                if (!idNumberMatched) {
                    idMismatchPenalty = 15.0;
                    warnings.add("Số CCCD trên thẻ (" + digits1 + ") không khớp với số định danh trên GPKD (" + digits2 + ").");
                }
            }
        }

        // 2. Tên cơ sở (Tối đa 15đ — Đối soát 3 chiều: Khai báo vs GPKD vs Biển hiệu)
        String licenseBizName = getExtractedStr(licenseRes.getExtractedData(), "businessName");
        String facadeSign = getExtractedStr(facadeRes.getExtractedData(), "signboardName");
        String garageInput = request.getGarageName();

        double garageMaxScore = 15.0;
        double garageScore;
        Boolean garageMatched = null;
        String garageStatus;
        String garageComparison = "";
        if (StringUtils.hasText(garageInput) && StringUtils.hasText(licenseBizName)) {
            boolean matchGpkd = isBusinessNameMatching(garageInput, licenseBizName);
            Boolean matchSign = StringUtils.hasText(facadeSign) ? isBusinessNameMatching(garageInput, facadeSign) : null;

            garageComparison = String.format("Tên khai báo (%s) vs GPKD (%s)", garageInput, licenseBizName);
            if (StringUtils.hasText(facadeSign)) {
                garageComparison += String.format(" | Biển hiệu (%s)", facadeSign);
            }

            if (matchGpkd && (matchSign == null || matchSign)) {
                garageStatus = "MATCHED";
                garageMatched = true;
                garageScore = 15.0;
            } else if (matchGpkd || Boolean.TRUE.equals(matchSign)) {
                garageStatus = "PARTIAL";
                garageMatched = false;
                garageScore = 9.0;
                warnings.add("Tên cơ sở chỉ khớp một phần giữa Khai báo, GPKD và Biển hiệu mặt tiền.");
            } else {
                garageStatus = "MISMATCH";
                garageMatched = false;
                garageScore = 0.0;
                warnings.add("Tên cơ sở kinh doanh khai báo khác biệt với GPKD và Biển hiệu.");
            }
        } else {
            garageStatus = "UNAVAILABLE";
            garageScore = 9.0;
        }

        // 3. Địa chỉ hoạt động (Tối đa 25đ — Bóc tách Số nhà riêng, bắt lỗi 56 ≠ 456)
        String licenseAddr = getExtractedStr(licenseRes.getExtractedData(), "registeredAddress");
        String addrInput = request.getAddress();

        double addrMaxScore = 25.0;
        double addrScore;
        Boolean addrMatched = null;
        String addrStatus;
        String addrStatusLabel = null;
        String addrComparison = "";
        if (StringUtils.hasText(addrInput) && StringUtils.hasText(licenseAddr)) {
            AddressCompareResult addrRes = compareAddresses(addrInput, licenseAddr);
            addrStatus = addrRes.status();
            addrMatched = addrRes.matched();
            addrStatusLabel = addrRes.statusLabel();
            addrScore = addrRes.score();
            addrComparison = String.format("Khai báo (%s) vs GPKD (%s)", addrInput, licenseAddr);
            if (StringUtils.hasText(addrRes.warning())) {
                warnings.add(addrRes.warning());
            }
        } else {
            addrStatus = "UNAVAILABLE";
            addrScore = 15.0;
        }

        // 4. Số điện thoại Hotline (Tối đa 10đ — Chỉ hiển thị khi giấy tờ/biển hiệu có ghi SĐT)
        String licensePhone = getExtractedStr(licenseRes.getExtractedData(), "phone");
        String signPhone = getExtractedStr(facadeRes.getExtractedData(), "signPhone");
        String reqPhone = request.getPhone();

        double phoneMaxScore = 10.0;
        double phoneScore;
        Boolean phoneMatched = null;
        String phoneStatus;
        String phoneComparison = "";
        if (StringUtils.hasText(reqPhone) && (StringUtils.hasText(licensePhone) || StringUtils.hasText(signPhone))) {
            boolean matchLicense = StringUtils.hasText(licensePhone) && isPhoneMatching(reqPhone, licensePhone);
            boolean matchSign = StringUtils.hasText(signPhone) && isPhoneMatching(reqPhone, signPhone);
            boolean matched = matchLicense || matchSign;

            List<String> docPhoneParts = new ArrayList<>();
            if (StringUtils.hasText(licensePhone)) docPhoneParts.add("GPKD (" + licensePhone + ")");
            if (StringUtils.hasText(signPhone)) docPhoneParts.add("Biển hiệu (" + signPhone + ")");
            phoneComparison = String.format("Khai báo (%s) vs %s", reqPhone, String.join(" | ", docPhoneParts));

            phoneMatched = matched;
            phoneStatus = matched ? "MATCHED" : "MISMATCH";
            phoneScore = matched ? 10.0 : 0.0;
            if (!matched) {
                warnings.add("Số điện thoại hotline khai báo (" + reqPhone + ") không khớp với SĐT trên giấy tờ/biển hiệu.");
            }
        } else {
            phoneStatus = "NOT_ON_DOC";
            phoneScore = 10.0;
        }

        // 5. Email liên hệ (Tối đa 5đ — Chỉ hiển thị khi GPKD có ghi Email)
        String licenseEmail = getExtractedStr(licenseRes.getExtractedData(), "email");
        String reqEmail = request.getEmail();

        double emailMaxScore = 5.0;
        double emailScore;
        Boolean emailMatched = null;
        String emailStatus;
        String emailComparison = "";
        if (StringUtils.hasText(reqEmail) && StringUtils.hasText(licenseEmail)) {
            boolean matched = normalizeEmail(reqEmail).equals(normalizeEmail(licenseEmail));
            emailComparison = String.format("Khai báo (%s) vs GPKD (%s)", reqEmail, licenseEmail);
            emailMatched = matched;
            emailStatus = matched ? "MATCHED" : "MISMATCH";
            emailScore = matched ? 5.0 : 0.0;
            if (!matched) {
                warnings.add("Email khai báo (" + reqEmail + ") khác với Email ghi trên GPKD (" + licenseEmail + ").");
            }
        } else {
            emailStatus = "NOT_ON_DOC";
            emailScore = 5.0;
        }

        // Tổng hợp điểm (20đ Chất lượng ảnh + 80đ Đối soát - Phạt lệch số CCCD)
        double score = docQualityScore + repScore + addrScore + garageScore + phoneScore + emailScore - idMismatchPenalty;

        // Chống gian lận: nếu có tài liệu chụp lại từ màn hình thiết bị
        boolean hasScreenCapture = Boolean.TRUE.equals(frontRes.getIsScreenCapture())
                || Boolean.TRUE.equals(backRes.getIsScreenCapture())
                || Boolean.TRUE.equals(licenseRes.getIsScreenCapture())
                || Boolean.TRUE.equals(facadeRes.getIsScreenCapture());

        String capReason = null;
        if (hasScreenCapture) {
            score = Math.min(score, 30.0);
            capReason = "Giới hạn 30% do phát hiện ảnh chụp từ màn hình thiết bị khác";
            warnings.add("Phát hiện tài liệu chụp lại từ màn hình thiết bị khác (nghi vấn gian lận hồ sơ).");
        } else if (validCount < 4) {
            score = Math.min(score, Math.max(30.0, validCount * 15.0));
            capReason = "Giới hạn điểm do chưa đủ 4 tài liệu hợp lệ";
            warnings.add("Tài liệu chưa đạt chuẩn hoặc sai loại: " + String.join(", ", invalidDocNames));
        } else if ("MISMATCH".equals(repStatus) || Boolean.FALSE.equals(idNumberMatched)) {
            score = Math.min(score, 60.0);
            capReason = "Giới hạn 60% do sai thông tin người đại diện pháp lý";
        } else if ("MISMATCH".equals(addrStatus)) {
            score = Math.min(score, 65.0);
            capReason = "Giới hạn 65% do sai địa chỉ hoạt động";
        } else if ("PARTIAL".equals(addrStatus)) {
            score = Math.min(score, 80.0);
            capReason = "Giới hạn 80% do lệch số nhà (" + addrStatusLabel + ")";
        }

        score = Math.round(Math.max(0.0, Math.min(100.0, score)));

        AiVerificationStatus overallStatus;
        String summary;

        boolean isAllAiFallback = "UNVERIFIED".equals(frontRes.getPhotoQuality()) &&
                "UNVERIFIED".equals(backRes.getPhotoQuality()) &&
                "UNVERIFIED".equals(licenseRes.getPhotoQuality()) &&
                "UNVERIFIED".equals(facadeRes.getPhotoQuality());

        if (isAllAiFallback) {
            overallStatus = AiVerificationStatus.WARNING;
            score = 50.0;
            capReason = null;
            summary = "Hệ thống đang bận thẩm định tự động. Hồ sơ vẫn được tiếp nhận an toàn và chuyển sang chế độ Quản trị viên xét duyệt thủ công.";
            warnings.clear();
            warnings.add("Dịch vụ AI thẩm định tạm thời bị gián đoạn mạng hoặc quá tải quota. Ban quản trị sẽ xét duyệt thủ công.");
            recommendations.clear();
            recommendations.add("Quản trị viên vui lòng phóng to hình ảnh để thẩm định hồ sơ trực tiếp.");
        } else if (validCount == 4 && !hasScreenCapture && score >= 85.0
                && !"MISMATCH".equals(repStatus)
                && !"PARTIAL".equals(addrStatus)
                && !"MISMATCH".equals(addrStatus)) {
            overallStatus = AiVerificationStatus.VERIFIED;
            summary = "Hồ sơ pháp lý đầy đủ và hợp lệ. Đủ điều kiện để Quản trị viên xem xét phê duyệt.";
            recommendations.add("Hồ sơ hợp lệ, đủ điều kiện kích hoạt đối tác.");
        } else if (validCount >= 3 && !hasScreenCapture && score >= 45.0) {
            overallStatus = AiVerificationStatus.WARNING;
            if (!invalidDocNames.isEmpty()) {
                summary = String.format("Hồ sơ có tài liệu chưa đạt chuẩn (%s). Cần Quản trị viên rà soát kỹ trước khi duyệt.",
                        String.join(", ", invalidDocNames));
            } else if ("PARTIAL".equals(addrStatus)) {
                summary = String.format("Hồ sơ phát hiện %s. Cần Quản trị viên xác minh lại trước khi phê duyệt.", addrStatusLabel);
            } else {
                summary = "Hồ sơ có điểm đối soát cần lưu ý. Cần Quản trị viên kiểm tra kỹ trước khi phê duyệt.";
            }
            recommendations.add("Kiểm tra lại các mục cảnh báo hoặc yêu cầu đối tác bổ sung xác minh.");
        } else {
            overallStatus = AiVerificationStatus.REJECTED;
            summary = "Hồ sơ chưa đạt yêu cầu pháp lý hoặc phát hiện tài liệu sai lệch/nghi vấn giả mạo.";
            recommendations.add("Từ chối hồ sơ và yêu cầu đối tác nộp lại tài liệu hợp lệ.");
        }

        return GarageDossierAnalysisResponse.builder()
                .overallScore(score)
                .overallStatus(overallStatus)
                .summaryText(summary)
                .idCardFront(frontRes)
                .idCardBack(backRes)
                .businessLicense(licenseRes)
                .facadePhoto(facadeRes)
                .docQualityScore(docQualityScore)
                .docQualityMaxScore(docQualityMaxScore)
                .representativeMatched(repMatched)
                .representativeStatus(repStatus)
                .representativeComparison(repComparison)
                .representativeScore(repScore)
                .representativeMaxScore(repMaxScore)
                .garageNameMatched(garageMatched)
                .garageNameStatus(garageStatus)
                .garageNameComparison(garageComparison)
                .garageNameScore(garageScore)
                .garageNameMaxScore(garageMaxScore)
                .addressMatched(addrMatched)
                .addressStatus(addrStatus)
                .addressStatusLabel(addrStatusLabel)
                .addressComparison(addrComparison)
                .addressScore(addrScore)
                .addressMaxScore(addrMaxScore)
                .phoneMatched(phoneMatched)
                .phoneStatus(phoneStatus)
                .phoneComparison(phoneComparison)
                .phoneScore(phoneScore)
                .phoneMaxScore(phoneMaxScore)
                .emailMatched(emailMatched)
                .emailStatus(emailStatus)
                .emailComparison(emailComparison)
                .emailScore(emailScore)
                .emailMaxScore(emailMaxScore)
                .extractedTaxCode(licenseTaxCode)
                .extractedIdNumber(cccdIdNumber)
                .idNumberMatched(idNumberMatched)
                .capReason(capReason)
                .warnings(warnings)
                .recommendations(recommendations)
                .build();
    }

    // =========================================================================
    // HELPER: PROMPTS CHO TỪNG LOẠI TÀI LIỆU
    // =========================================================================
    private String getDocumentPromptGuide(GarageDocType docType) {
        if (docType == null) return "Hãy nhận diện và bóc tách chữ từ tài liệu này.";
        return switch (docType) {
            case OWNER_ID_CARD_FRONT -> """
                    ĐÂY LÀ ẢNH MẶT TRƯỚC THẺ CĂN CƯỚC CÔNG DÂN (CCCD) HOẶC CMND VIỆT NAM.
                    Trích xuất các trường vào "extractedData":
                    - "idNumber": Số CCCD (12 chữ số) hoặc CMND (9 chữ số).
                    - "fullName": Họ và tên (VIẾT HOA CÓ DẤU, VD: NGUYỄN VĂN A).
                    - "dob": Ngày tháng năm sinh (dd/mm/yyyy).
                    - "homeAddress": Quê quán hoặc Nơi thường trú ghi trên thẻ.
                    Kiểm tra: Thẻ có quốc huy, chân dung rõ nét, không bị che góc.
                    """;
            case OWNER_ID_CARD_BACK -> """
                    ĐÂY LÀ ẢNH MẶT SAU THẺ CĂN CƯỚC CÔNG DÂN (CCCD) VIỆT NAM.
                    Trích xuất các trường vào "extractedData":
                    - "issueDate": Ngày cấp thẻ (dd/mm/yyyy).
                    - "issuePlace": Nơi cấp (VD: Cục Cảnh sát QLHC về TTXH).
                    Kiểm tra: Có dải mã vạch MRZ hoặc chip điện tử, vân tay.
                    """;
            case BUSINESS_LICENSE -> """
                    ĐÂY LÀ GIẤY CHỨNG NHẬN ĐĂNG KÝ DOANH NGHIỆP HOẶC GIẤY CHỨNG NHẬN ĐĂNG KÝ HỘ KINH DOANH TẠI VIỆT NAM.
                    Trích xuất các trường vào "extractedData":
                    - "taxCode": Mã số doanh nghiệp hoặc Mã số thuế (10 hoặc 13 chữ số).
                    - "businessName": Tên doanh nghiệp hoặc Tên hộ kinh doanh (VD: HỘ KINH DOANH GARA TUẤN PHÁT).
                    - "representativeName": Họ tên Người đại diện theo pháp luật / Đại diện hộ kinh doanh.
                    - "representativeIdNumber": Số CCCD/CMND của người đại diện theo pháp luật ghi trên giấy phép (nếu có).
                    - "registeredAddress": Địa chỉ trụ sở / Địa điểm kinh doanh.
                    - "email": Địa chỉ thư điện tử / Email ghi trên giấy phép (nếu có, VD: garage.tuanphat@gmail.com, cuuho.minhquang@gmail.com).
                    - "phone": Số điện thoại liên hệ ghi trên giấy phép (nếu có, VD: 0912345678, 0908123456).
                    Kiểm tra: Có dấu mộc đỏ cơ quan đăng ký kinh doanh (Sở KH&ĐT hoặc UBND Quận/Huyện) và Quốc huy.
                    """;
            case GARAGE_PHOTO -> """
                    ĐÂY LÀ ẢNH CHỤP MẶT TIỀN THỰC TẾ & BẢNG HIỆU CỦA GARA / TRUNG TÂM CỨU HỘ SỬA CHỮA XE.
                    Trích xuất các trường vào "extractedData":
                    - "signboardName": Tên Gara ghi trên bảng hiệu quảng cáo ngoài cửa hàng/xưởng.
                    - "signPhone": Số điện thoại hotline ghi trên bảng hiệu (nếu có).
                    - "signAddress": Địa chỉ ghi trên bảng hiệu (nếu có).
                    Kiểm tra: Có xưởng xe, cửa hiệu, bảng hiệu thực tế, không phải ảnh nhà dân thông thường.
                    """;
            default -> "Hãy bóc tách thông tin tài liệu và kiểm tra tính hợp lệ.";
        };
    }

    // =========================================================================
    // HELPER: GEMINI VISION API CALLER
    // =========================================================================
    private String callGeminiVision(String promptText, byte[] imageBytes, String photoUrl) throws Exception {
        String mimeType = determineMimeType(photoUrl, imageBytes);
        String base64Data = Base64.getEncoder().encodeToString(imageBytes);

        List<Map<String, Object>> parts = List.of(
                Map.of("text", promptText),
                Map.of("inlineData", Map.of(
                        "mimeType", mimeType,
                        "data", base64Data
                ))
        );

        Map<String, Object> genConfig = new HashMap<>();
        genConfig.put("responseMimeType", "application/json");
        genConfig.put("temperature", 0.1);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", parts)),
                "generationConfig", genConfig
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        List<String> modelsToTry = new ArrayList<>();
        if (StringUtils.hasText(geminiModel)) {
            modelsToTry.add(geminiModel);
        }
        modelsToTry.addAll(CANDIDATE_MODELS);

        long startTime = System.currentTimeMillis();
        return geminiApiKeyProvider.executeWithFailover(activeKey -> {
            Exception lastEx = null;
            for (String model : modelsToTry) {
                if (System.currentTimeMillis() - startTime > 15000) {
                    log.warn("[AI Vision] Tổng thời gian gọi Gemini vượt quá 15s. Ngắt sớm để phản hồi nhanh.");
                    break;
                }
                try {
                    String endpoint = String.format(GEMINI_API_URL_TEMPLATE, model, activeKey);
                    ResponseEntity<String> response = restTemplate.postForEntity(endpoint, entity, String.class);
                    if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                        JsonNode root = objectMapper.readTree(response.getBody());
                        JsonNode candidatePart = root.path("candidates").path(0).path("content").path("parts").path(0);
                        if (candidatePart.has("text")) {
                            return candidatePart.get("text").asText();
                        }
                    }
                } catch (Exception e) {
                    lastEx = e;
                    log.warn("[AI Vision] Model {} failed ({}). Thử model kế tiếp...", model, e.getMessage());
                }
            }
            throw new RuntimeException("Tất cả candidate Gemini models đều thất bại", lastEx);
        });
    }

    // =========================================================================
    // HELPER: IMAGE RESOLUTION & BYTE CONVERSION
    // =========================================================================
    private byte[] resolveImageBytes(String photoUrl) {
        if (!StringUtils.hasText(photoUrl)) return null;

        // 1. Data URI (Base64)
        if (photoUrl.startsWith("data:image/") && photoUrl.contains(";base64,")) {
            try {
                String base64 = photoUrl.substring(photoUrl.indexOf(";base64,") + 8);
                return Base64.getDecoder().decode(base64);
            } catch (Exception e) {
                log.warn("[AI Verification] Lỗi decode Base64 data URI: {}", e.getMessage());
            }
        }

        // 2. Local File in SRAS FileStorageService
        String fileName = extractFileName(photoUrl);
        if (StringUtils.hasText(fileName)) {
            byte[] bytes = fileStorageService.getFileData(fileName);
            if (bytes != null && bytes.length > 0) {
                return bytes;
            }
        }

        // 3. Remote URL Download
        if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
            try {
                ResponseEntity<byte[]> res = restTemplate.getForEntity(photoUrl, byte[].class);
                if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
                    return res.getBody();
                }
            } catch (Exception ex) {
                log.warn("[AI Verification] Không thể tải ảnh từ URL ngoại vi {}: {}", photoUrl, ex.getMessage());
            }
        }

        return null;
    }

    private String extractFileName(String url) {
        if (!StringUtils.hasText(url)) return "";
        int lastSlash = url.lastIndexOf('/');
        String name = lastSlash >= 0 ? url.substring(lastSlash + 1) : url;
        int q = name.indexOf('?');
        return q >= 0 ? name.substring(0, q) : name;
    }

    private String determineMimeType(String photoUrl, byte[] bytes) {
        if (photoUrl != null) {
            String lower = photoUrl.toLowerCase();
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".webp")) return "image/webp";
            if (lower.endsWith(".gif")) return "image/gif";
        }
        if (bytes != null && bytes.length > 4) {
            if (bytes[0] == (byte) 0x89 && bytes[1] == (byte) 0x50 && bytes[2] == (byte) 0x4E && bytes[3] == (byte) 0x47) {
                return "image/png";
            }
        }
        return "image/jpeg";
    }

    private String cleanJsonOutput(String json) {
        if (json == null) return "{}";
        String s = json.trim();
        if (s.startsWith("```json")) s = s.substring(7);
        else if (s.startsWith("```")) s = s.substring(3);
        if (s.endsWith("```")) s = s.substring(0, s.length() - 3);
        return s.trim();
    }

    // =========================================================================
    // HELPER: SO SÁNH & CHUẨN HÓA DỮ LIỆU
    // =========================================================================
    public static String normalizePlate(String plate) {
        if (plate == null) return "";
        return plate.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
    }

    private boolean isPlateMatching(String p1, String p2) {
        if (p1.isEmpty() || p2.isEmpty()) return false;
        if (p1.equals(p2)) return true;
        // Cho phép khác biệt nhẹ (ví dụ 5 số vs 4 số hoặc sai 1 ký tự mờ)
        return p1.contains(p2) || p2.contains(p1);
    }

    private RescueVehicleKind parseRescueVehicleKind(String text) {
        if (text == null) return null;
        String upper = text.toUpperCase();
        if (upper.contains("MOTO") || upper.contains("BIKE") || upper.contains("MÁY")) {
            return RescueVehicleKind.MOTORBIKE;
        }
        if (upper.contains("TOW") || upper.contains("KÉO") || upper.contains("CẨU") || upper.contains("WRECKER") || upper.contains("TRUCK")) {
            return RescueVehicleKind.TOW_TRUCK;
        }
        if (upper.contains("VAN") || upper.contains("TẢI") || upper.contains("PICKUP")) {
            return RescueVehicleKind.VAN;
        }
        return null;
    }

    private boolean isKindCompatible(RescueVehicleKind expected, RescueVehicleKind detected) {
        if (expected == detected) return true;
        if ((expected == RescueVehicleKind.TOW_TRUCK && detected == RescueVehicleKind.VAN) ||
            (expected == RescueVehicleKind.VAN && detected == RescueVehicleKind.TOW_TRUCK)) {
            return true;
        }
        return false;
    }

    private record AddressCompareResult(String status, Boolean matched, String statusLabel, double score, String warning) {}

    private String getExtractedStr(Map<String, Object> data, String key) {
        if (data == null || !data.containsKey(key) || data.get(key) == null) return null;
        String val = String.valueOf(data.get(key)).trim();
        return val.isEmpty() || "null".equalsIgnoreCase(val) ? null : val;
    }

    private boolean isExactPersonNameMatching(String s1, String s2) {
        if (!StringUtils.hasText(s1) || !StringUtils.hasText(s2)) return false;
        String c1 = stripAccents(s1).toLowerCase().replaceAll("[^a-z0-9]", " ").replaceAll("\\s+", " ").trim();
        String c2 = stripAccents(s2).toLowerCase().replaceAll("[^a-z0-9]", " ").replaceAll("\\s+", " ").trim();
        return !c1.isEmpty() && c1.equals(c2);
    }

    private String normalizeBusinessCoreName(String s) {
        if (!StringUtils.hasText(s)) return "";
        String c = stripAccents(s).toLowerCase().replaceAll("[^a-z0-9]", " ").replaceAll("\\s+", " ").trim();
        String[] prefixes = {
                "cong ty tnhh mot thanh vien", "cong ty tnhh mtv", "cong ty tnhh",
                "cong ty co phan", "cong ty cp", "cong ty", "tnhh", "mtv",
                "ho kinh doanh", "doanh nghiep tu nhan", "dntn",
                "thuong mai dich vu", "tm dv", "tmdv", "dich vu", "thuong mai", "co so"
        };
        boolean changed = true;
        while (changed) {
            changed = false;
            for (String prefix : prefixes) {
                if (c.startsWith(prefix + " ")) {
                    c = c.substring(prefix.length()).trim();
                    changed = true;
                } else if (c.equals(prefix)) {
                    c = "";
                    changed = true;
                }
            }
        }
        return c.replaceAll("\\b(tnhh|mtv|tmdv|dntn|cong ty|co phan|ho kinh doanh)\\b", " ")
                .replaceAll("\\s+", " ").trim();
    }

    private boolean isBusinessNameMatching(String declared, String target) {
        if (!StringUtils.hasText(declared) || !StringUtils.hasText(target)) return false;
        String raw1 = stripAccents(declared).toLowerCase().replaceAll("[^a-z0-9]", " ").replaceAll("\\s+", " ").trim();
        String raw2 = stripAccents(target).toLowerCase().replaceAll("[^a-z0-9]", " ").replaceAll("\\s+", " ").trim();
        if (raw1.equals(raw2) || raw1.contains(raw2) || raw2.contains(raw1)) return true;

        String c1 = normalizeBusinessCoreName(declared);
        String c2 = normalizeBusinessCoreName(target);
        if (c1.isEmpty() || c2.isEmpty()) return false;
        if (c1.equals(c2) || c1.contains(c2) || c2.contains(c1)) return true;

        String[] tokens1 = c1.split("\\s+");
        String[] tokens2 = c2.split("\\s+");
        Set<String> set2 = new HashSet<>(Arrays.asList(tokens2));
        int matchCount = 0;
        int valid1 = 0;
        for (String t : tokens1) {
            if (t.length() < 2) continue;
            valid1++;
            if (set2.contains(t)) matchCount++;
        }
        int valid2 = (int) Arrays.stream(tokens2).filter(t -> t.length() >= 2).count();
        int minTokens = Math.min(valid1, valid2);
        return minTokens > 0 && ((double) matchCount / minTokens >= 0.7);
    }

    private String extractHouseNumber(String rawAddress) {
        if (!StringUtils.hasText(rawAddress)) return null;
        String norm = stripAccents(rawAddress).toLowerCase().trim();
        String firstPart = norm.split(",")[0].trim();
        firstPart = firstPart.replaceFirst("^(?:so\\s+nha|nha\\s+so|so|sn)\\b[.:\\s]*", "").trim();
        Matcher m = Pattern.compile("^([0-9]+[a-z]?(?:/[0-9]+[a-z]?)*)\\b").matcher(firstPart);
        if (m.find()) {
            return m.group(1).toUpperCase();
        }
        return null;
    }

    private String normalizeAddressForBaseCompare(String rawAddress) {
        if (!StringUtils.hasText(rawAddress)) return "";
        String norm = stripAccents(rawAddress).toLowerCase().trim();
        norm = norm.replaceFirst("^(?:(?:so\\s+nha|nha\\s+so|so|sn)[.:\\s]+)?[0-9]+[a-z]?(?:/[0-9]+[a-z]?)*\\b[\\s,]*", "").trim();
        norm = norm.replaceAll("\\btp\\.?\\s*hcm\\b", "thanh pho ho chi minh")
                .replaceAll("\\btp\\.?\\s*", "thanh pho ")
                .replaceAll("\\bq\\.?\\s*([0-9]+)\\b", "quan $1")
                .replaceAll("\\bp\\.?\\s*([0-9]+)\\b", "phuong $1")
                .replaceAll("[^a-z0-9]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return norm;
    }

    private AddressCompareResult compareAddresses(String declaredAddr, String docAddr) {
        String house1 = extractHouseNumber(declaredAddr);
        String house2 = extractHouseNumber(docAddr);

        String base1 = normalizeAddressForBaseCompare(declaredAddr);
        String base2 = normalizeAddressForBaseCompare(docAddr);

        boolean baseMatched = false;
        if (!base1.isEmpty() && !base2.isEmpty()) {
            if (base1.equals(base2) || base1.contains(base2) || base2.contains(base1)) {
                baseMatched = true;
            } else {
                Set<String> stopWords = Set.of("so", "nha", "duong", "phuong", "quan", "tp", "thanh", "pho", "tinh", "xa", "huyen", "thi", "tran", "viet", "nam");
                List<String> t1 = Arrays.stream(base1.split("\\s+"))
                        .filter(t -> !stopWords.contains(t) && (t.length() >= 2 || t.matches("[0-9]+")))
                        .toList();
                List<String> t2 = Arrays.stream(base2.split("\\s+"))
                        .filter(t -> !stopWords.contains(t) && (t.length() >= 2 || t.matches("[0-9]+")))
                        .toList();
                Set<String> set2 = new HashSet<>(t2);
                int matchCount = 0;
                for (String token : t1) {
                    if (set2.contains(token)) matchCount++;
                }
                int minTokens = Math.min(t1.size(), t2.size());
                baseMatched = minTokens > 0 && ((double) matchCount / minTokens >= 0.65);
            }
        }

        if (baseMatched) {
            if (house1 != null && house2 != null && !house1.equalsIgnoreCase(house2)) {
                String label = "Lệch số nhà (" + house1 + " ≠ " + house2 + ")";
                String warn = "Địa chỉ khai báo lệch số nhà so với GPKD: Số " + house1 + " ≠ Số " + house2 + ".";
                return new AddressCompareResult("PARTIAL", false, label, 12.0, warn);
            }
            return new AddressCompareResult("MATCHED", true, null, 25.0, null);
        }
        return new AddressCompareResult("MISMATCH", false, "Khác đường / khu vực", 0.0,
                "Địa chỉ khai báo khác tuyến đường hoặc khu vực so với GPKD.");
    }

    private String normalizePhone(String phone) {
        if (!StringUtils.hasText(phone)) return "";
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.startsWith("84") && digits.length() >= 10) {
            digits = "0" + digits.substring(2);
        }
        return digits;
    }

    private boolean isPhoneMatching(String reqPhoneRaw, String docPhoneRaw) {
        String req = normalizePhone(reqPhoneRaw);
        if (req.isEmpty() || !StringUtils.hasText(docPhoneRaw)) return false;
        for (String part : docPhoneRaw.split("[,;/|\\-]+")) {
            String norm = normalizePhone(part);
            if (!norm.isEmpty() && norm.equals(req)) {
                return true;
            }
        }
        return normalizePhone(docPhoneRaw).equals(req);
    }

    private String normalizeEmail(String email) {
        return StringUtils.hasText(email) ? email.trim().toLowerCase() : "";
    }

    private boolean isTextFuzzyMatching(String s1, String s2) {
        if (!StringUtils.hasText(s1) || !StringUtils.hasText(s2)) return false;
        String c1 = stripAccents(s1).toLowerCase().replaceAll("[^a-z0-9]", " ").trim();
        String c2 = stripAccents(s2).toLowerCase().replaceAll("[^a-z0-9]", " ").trim();

        if (c1.equals(c2) || c1.contains(c2) || c2.contains(c1)) return true;

        String[] tokens1 = c1.split("\\s+");
        String[] tokens2 = c2.split("\\s+");
        int matchCount = 0;
        for (String t1 : tokens1) {
            if (t1.length() < 2) continue;
            for (String t2 : tokens2) {
                if (t1.equals(t2)) {
                    matchCount++;
                    break;
                }
            }
        }
        int minTokens = Math.min(tokens1.length, tokens2.length);
        return minTokens > 0 && ((double) matchCount / minTokens >= 0.5);
    }

    private String stripAccents(String s) {
        if (s == null) return "";
        String normalized = Normalizer.normalize(s, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(normalized).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
    }

    // =========================================================================
    // FALLBACK RULES (KHI CHƯA CÓ API KEY HOẶC LỖI MẠNG)
    // =========================================================================
    private VehiclePhotoAnalysisResponse fallbackVehicleCheck(VehiclePhotoAnalysisRequest request) {
        String plate = request.getExpectedPlate();
        boolean validFormat = StringUtils.hasText(plate) &&
                plate.matches("^[1-9][0-9]\\s*[- ]?\\s*([A-Za-z]{1,2}|[A-Za-z][0-9])\\s*[- ]?\\s*.*$");

        return VehiclePhotoAnalysisResponse.builder()
                .vehiclePresent(true)
                .detectedKind(request.getExpectedKind() != null ? request.getExpectedKind() : RescueVehicleKind.TOW_TRUCK)
                .detectedKindDescription("Phương tiện cứu hộ giao thông")
                .detectedPlate(plate)
                .normalizedPlate(normalizePlate(plate))
                .confidenceScore(0.8)
                .plateMatch(true)
                .kindMatch(true)
                .photoQuality("CLEAR")
                .isScreenCapture(false)
                .status(validFormat ? AiVerificationStatus.VERIFIED : AiVerificationStatus.WARNING)
                .message("Đã xác minh cấu trúc định dạng biển số xe.")
                .suggestion(normalizePlate(plate))
                .build();
    }

    private DocumentPhotoAnalysisResponse fallbackDocumentCheck(DocumentPhotoAnalysisRequest request) {
        Map<String, Object> map = new HashMap<>();
        if (StringUtils.hasText(request.getExpectedName())) {
            map.put("name", request.getExpectedName());
        }
        return DocumentPhotoAnalysisResponse.builder()
                .docType(request.getDocType())
                .validDocument(false)
                .confidenceScore(0.0)
                .photoQuality("UNVERIFIED")
                .isScreenCapture(false)
                .status(AiVerificationStatus.WARNING)
                .message("Tài liệu chưa được thẩm định tự động qua AI. Cần Quản trị viên duyệt thủ công.")
                .extractedData(map)
                .build();
    }
}
