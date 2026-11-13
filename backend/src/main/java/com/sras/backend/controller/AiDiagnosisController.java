package com.sras.backend.controller;

import com.sras.backend.dto.request.AiDiagnosisRequest;
import com.sras.backend.dto.response.AiDiagnosisResponse;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.RoadHazardWarningResponse;
import com.sras.backend.entity.User;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.AiDiagnosisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
public class AiDiagnosisController {

    private final AiDiagnosisService aiDiagnosisService;
    private final UserRepository userRepository;

    @PostMapping("/diagnose")
    public ResponseEntity<ApiResponse<AiDiagnosisResponse>> diagnoseBreakdown(
            Authentication authentication,
            @RequestBody AiDiagnosisRequest request) {
        User user = getCurrentUserOrNull(authentication);
        AiDiagnosisResponse response = aiDiagnosisService.diagnoseBreakdown(user, request);
        return ResponseEntity.ok(ApiResponse.success("Chẩn đoán sự cố thành công", response));
    }

    @GetMapping("/road-hazard-warning")
    public ResponseEntity<ApiResponse<RoadHazardWarningResponse>> checkRoadHazardWarning(
            Authentication authentication,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) String address) {
        try {
            User user = getCurrentUserOrNull(authentication);
            RoadHazardWarningResponse warning = aiDiagnosisService.checkRoadHazardWarning(user, lat, lng, address);
            if (warning == null) {
                warning = RoadHazardWarningResponse.builder().hasWarning(false).incidentCount(0).build();
            }
            return ResponseEntity.ok(ApiResponse.success(warning));
        } catch (Exception e) {
            log.warn("[AiDiagnosisController] checkRoadHazardWarning warning fallback: {}", e.getMessage());
            return ResponseEntity.ok(ApiResponse.success(
                    RoadHazardWarningResponse.builder().hasWarning(false).incidentCount(0).build()
            ));
        }
    }

    @PostMapping(value = "/transcribe-voice", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> transcribeVoice(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        String transcribedText = aiDiagnosisService.transcribeVoice(file);
        return ResponseEntity.ok(ApiResponse.success("Chuyển giọng nói thành văn bản thành công", java.util.Map.of("text", transcribedText)));
    }

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<com.sras.backend.dto.response.AiChatResponse>> chat(
            @RequestBody com.sras.backend.dto.request.AiChatRequest request) {
        com.sras.backend.dto.response.AiChatResponse response = aiDiagnosisService.chat(request);
        return ResponseEntity.ok(ApiResponse.success("Phản hồi từ trợ lý AI", response));
    }

    private User getCurrentUserOrNull(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return userRepository.findByPhone(authentication.getName()).orElse(null);
    }
}
