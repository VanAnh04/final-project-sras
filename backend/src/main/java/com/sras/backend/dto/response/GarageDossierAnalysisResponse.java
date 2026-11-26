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
    private String representativeStatus;
    private String representativeComparison;
    private Double representativeScore;
    private Double representativeMaxScore;

    private Boolean garageNameMatched;
    private String garageNameStatus;
    private String garageNameComparison;
    private Double garageNameScore;
    private Double garageNameMaxScore;

    private Boolean addressMatched;
    private String addressStatus;
    private String addressStatusLabel;
    private String addressComparison;
    private Double addressScore;
    private Double addressMaxScore;

    private Boolean phoneMatched;
    private String phoneStatus;
    private String phoneComparison;
    private Double phoneScore;
    private Double phoneMaxScore;

    private Boolean emailMatched;
    private String emailStatus;
    private String emailComparison;
    private Double emailScore;
    private Double emailMaxScore;

    private Double docQualityScore;
    private Double docQualityMaxScore;

    private String extractedTaxCode;
    private String extractedIdNumber;
    private Boolean idNumberMatched;
    private String capReason;

    private List<String> warnings;
    private List<String> recommendations;
}

