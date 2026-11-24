package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.AiVerificationStatus;
import com.sras.backend.entity.enums.GarageDocType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentPhotoAnalysisResponse {
    private GarageDocType docType;
    private boolean validDocument;
    private Double confidenceScore;
    private String photoQuality;
    private Boolean isScreenCapture;
    private AiVerificationStatus status;
    private String message;
    private Map<String, Object> extractedData;
}

