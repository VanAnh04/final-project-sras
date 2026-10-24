package com.sras.backend.controller;

import com.sras.backend.dto.request.AiDiagnosisRequest;
import com.sras.backend.dto.response.AiDiagnosisResponse;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.service.AiDiagnosisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiDiagnosisController {

    private final AiDiagnosisService aiDiagnosisService;

    @PostMapping("/diagnose")
    public ResponseEntity<ApiResponse<AiDiagnosisResponse>> diagnoseBreakdown(@RequestBody AiDiagnosisRequest request) {
        AiDiagnosisResponse response = aiDiagnosisService.diagnoseBreakdown(request);
        return ResponseEntity.ok(ApiResponse.success("Chẩn đoán sự cố thành công", response));
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
}
