package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.AiVerificationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GarageDossierAnalysisResponse {
    private Double overallScore;
    private AiVerificationStatus overallStatus;
    private String summaryText;

    private DocumentPhotoAnalysisResponse idCardFront;
    private DocumentPhotoAnalysisResponse idCardBack;
    private DocumentPhotoAnalysisResponse businessLicense;
    private DocumentPhotoAnalysisResponse facadePhoto;

    private Boolean representativeMatched;
    private String representativeComparison;

    private Boolean garageNameMatched;
    private String garageNameComparison;

    private Boolean addressMatched;
    private String addressComparison;

    private List<String> warnings;
    private List<String> recommendations;
}

