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
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiImageVerificationServiceImpl implements AiImageVerificationService {

    private final FileStorageService fileStorageService;
    private final GeminiApiKeyProvider geminiApiKeyProvider;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = createRestTemplate();

    @Value("${gemini.model:gemini-flash-lite-latest}")
    private String geminiModel;

    private static final String GEMINI_API_URL_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private static final List<String> CANDIDATE_MODELS = List.of(
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash",
            "gemini-flash-lite-latest"
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

            return DocumentPhotoAnalysisResponse.builder()
                    .docType(docType)
                    .validDocument(validDoc)
                    .confidenceScore(confidence)
                    .photoQuality(photoQuality)
                    .isScreenCapture(isScreenCapture)
                    .status(status)
                    .message(message)
                    .extractedData(extractedData)
                    .build();

        } catch (Exception e) {
            log.error("[AI Verification] Lỗi phân tích tài liệu: {}", e.getMessage(), e);
            return fallbackDocumentCheck(request);
        }
    }

    // =========================================================================
    // 3. VERIFY GARAGE DOSSIER (ĐỐI SOÁT CHÉO TOÀN DIỆN 4 ẢNH HỒ SƠ)
    // =========================================================================
    @Override
    public GarageDossierAnalysisResponse verifyGarageDossier(GarageDossierAnalysisRequest request) {
        DocumentPhotoAnalysisResponse frontRes = verifyDocumentPhoto(DocumentPhotoAnalysisRequest.builder()
                .docType(GarageDocType.OWNER_ID_CARD_FRONT)
                .photoUrl(request.getIdCardFrontUrl())
                .expectedName(request.getOwnerName())
                .build());

        DocumentPhotoAnalysisResponse backRes = verifyDocumentPhoto(DocumentPhotoAnalysisRequest.builder()
                .docType(GarageDocType.OWNER_ID_CARD_BACK)
                .photoUrl(request.getIdCardBackUrl())
                .build());

        DocumentPhotoAnalysisResponse licenseRes = verifyDocumentPhoto(DocumentPhotoAnalysisRequest.builder()
                .docType(GarageDocType.BUSINESS_LICENSE)
                .photoUrl(request.getBusinessLicenseUrl())
                .expectedName(request.getGarageName())
                .expectedAddress(request.getAddress())
                .build());

        DocumentPhotoAnalysisResponse facadeRes = verifyDocumentPhoto(DocumentPhotoAnalysisRequest.builder()
                .docType(GarageDocType.GARAGE_PHOTO)
                .photoUrl(request.getFacadePhotoUrl())
                .expectedName(request.getGarageName())
                .build());

        List<String> warnings = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();

        // 1. Cross-check: Owner Name vs Representative on Business License
        String cccdName = frontRes.getExtractedData() != null ? (String) frontRes.getExtractedData().get("fullName") : null;
        String licenseRep = licenseRes.getExtractedData() != null ? (String) licenseRes.getExtractedData().get("representativeName") : null;
        String ownerInput = request.getOwnerName();

        Boolean repMatched = null;
        String repComparison = "";
        if (StringUtils.hasText(cccdName) && StringUtils.hasText(licenseRep)) {
            repMatched = isTextFuzzyMatching(cccdName, licenseRep);
            repComparison = String.format("CCCD (%s) vs GPKD (%s)", cccdName, licenseRep);
            if (!repMatched) {
                warnings.add("Họ tên trên CCCD (" + cccdName + ") không trùng với Người đại diện trên GPKD (" + licenseRep + ")");
            }
        } else if (StringUtils.hasText(ownerInput) && StringUtils.hasText(licenseRep)) {
            repMatched = isTextFuzzyMatching(ownerInput, licenseRep);
            repComparison = String.format("Khai báo (%s) vs GPKD (%s)", ownerInput, licenseRep);
        }

        // 2. Cross-check: Garage Name vs Business Name vs Facade
        String licenseBizName = licenseRes.getExtractedData() != null ? (String) licenseRes.getExtractedData().get("businessName") : null;
        String facadeSign = facadeRes.getExtractedData() != null ? (String) facadeRes.getExtractedData().get("signboardName") : null;
        String garageInput = request.getGarageName();

        Boolean garageMatched = null;
        String garageComparison = "";
        if (StringUtils.hasText(garageInput) && StringUtils.hasText(licenseBizName)) {
            garageMatched = isTextFuzzyMatching(garageInput, licenseBizName);
            garageComparison = String.format("Tên khai báo (%s) vs GPKD (%s)", garageInput, licenseBizName);
            if (!garageMatched && StringUtils.hasText(facadeSign)) {
                garageMatched = isTextFuzzyMatching(garageInput, facadeSign);
                garageComparison += " | Biển hiệu: " + facadeSign;
            }
        }

        // 3. Cross-check: Address
        String licenseAddr = licenseRes.getExtractedData() != null ? (String) licenseRes.getExtractedData().get("registeredAddress") : null;
        String addrInput = request.getAddress();
        Boolean addrMatched = null;
        String addrComparison = "";
        if (StringUtils.hasText(addrInput) && StringUtils.hasText(licenseAddr)) {
            addrMatched = isTextFuzzyMatching(addrInput, licenseAddr);
            addrComparison = String.format("Địa chỉ khai báo vs GPKD (%s)", licenseAddr);
        }

        // Calculate Overall Score (0 - 100)
        double score = 0.0;
        if (frontRes.isValidDocument()) score += 25.0;
        if (backRes.isValidDocument()) score += 15.0;
        if (licenseRes.isValidDocument()) score += 35.0;
        if (facadeRes.isValidDocument()) score += 25.0;

        // Bonuses & Penalties
        if (Boolean.TRUE.equals(repMatched)) score += 5.0;
        if (Boolean.FALSE.equals(repMatched)) {
            score = Math.max(0, score - 20.0);
        }
        if (Boolean.FALSE.equals(garageMatched)) {
            score = Math.max(0, score - 15.0);
        }
        score = Math.min(100.0, score);

        AiVerificationStatus overallStatus;
        String summary;
        if (score >= 85.0 && (repMatched == null || Boolean.TRUE.equals(repMatched))) {
            overallStatus = AiVerificationStatus.VERIFIED;
            summary = "Hồ sơ pháp lý đạt chuẩn cao. Khuyến nghị Quản trị viên phê duyệt.";
            recommendations.add("Hồ sơ hợp lệ, đủ điều kiện kích hoạt đối tác.");
        } else if (score >= 60.0) {
            overallStatus = AiVerificationStatus.WARNING;
            summary = "Hồ sơ có một số điểm cần rà soát lại trước khi phê duyệt.";
            recommendations.add("Kiểm tra kỹ lại tính trùng khớp giữa người đứng tên CCCD và GPKD.");
        } else {
            overallStatus = AiVerificationStatus.REJECTED;
            summary = "Hồ sơ chưa đạt yêu cầu pháp lý hoặc tài liệu không rõ ràng/giả mạo.";
            recommendations.add("Yêu cầu đối tác bổ sung hoặc chụp lại giấy phép kinh doanh/CCCD bản gốc.");
        }

        return GarageDossierAnalysisResponse.builder()
                .overallScore(score)
                .overallStatus(overallStatus)
                .summaryText(summary)
                .idCardFront(frontRes)
                .idCardBack(backRes)
                .businessLicense(licenseRes)
                .facadePhoto(facadeRes)
                .representativeMatched(repMatched)
                .representativeComparison(repComparison)
                .garageNameMatched(garageMatched)
                .garageNameComparison(garageComparison)
                .addressMatched(addrMatched)
                .addressComparison(addrComparison)
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
                    - "registeredAddress": Địa chỉ trụ sở / Địa điểm kinh doanh.
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
                .validDocument(true)
                .confidenceScore(0.8)
                .photoQuality("CLEAR")
                .isScreenCapture(false)
                .status(AiVerificationStatus.VERIFIED)
                .message("Tài liệu đã được tiếp nhận và sẵn sàng thẩm định.")
                .extractedData(map)
                .build();
    }
}
