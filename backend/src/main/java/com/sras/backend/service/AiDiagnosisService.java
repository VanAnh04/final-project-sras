package com.sras.backend.service;

import com.sras.backend.dto.request.AiDiagnosisRequest;
import com.sras.backend.dto.response.AiDiagnosisResponse;
import com.sras.backend.dto.request.AiChatRequest;
import com.sras.backend.dto.response.AiChatResponse;
import org.springframework.web.multipart.MultipartFile;

public interface AiDiagnosisService {
    AiDiagnosisResponse diagnoseBreakdown(AiDiagnosisRequest request);
    String transcribeVoice(MultipartFile voiceFile);
    AiChatResponse chat(AiChatRequest request);
}

