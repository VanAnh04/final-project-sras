package com.sras.backend.service;

import com.sras.backend.dto.request.AiDiagnosisRequest;
import com.sras.backend.dto.response.AiDiagnosisResponse;
import com.sras.backend.dto.request.AiChatRequest;
import com.sras.backend.dto.response.AiChatResponse;
import com.sras.backend.dto.response.RoadHazardWarningResponse;
import com.sras.backend.entity.User;
import org.springframework.web.multipart.MultipartFile;

public interface AiDiagnosisService {
    AiDiagnosisResponse diagnoseBreakdown(AiDiagnosisRequest request);
    AiDiagnosisResponse diagnoseBreakdown(User customer, AiDiagnosisRequest request);
    RoadHazardWarningResponse checkRoadHazardWarning(User customer, Double lat, Double lng, String address);
    String transcribeVoice(MultipartFile voiceFile);
    AiChatResponse chat(AiChatRequest request);
}
