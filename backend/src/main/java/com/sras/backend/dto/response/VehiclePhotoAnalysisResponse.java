package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.AiVerificationStatus;
import com.sras.backend.entity.enums.RescueVehicleKind;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehiclePhotoAnalysisResponse {
    private boolean vehiclePresent;
    private Boolean isRescueVehicle;
    private RescueVehicleKind detectedKind;
    private String detectedKindDescription;
    private String detectedPlate;
    private String normalizedPlate;
    private Double confidenceScore;
    private Boolean plateMatch;
    private Boolean kindMatch;
    private String photoQuality; // CLEAR, BLURRY, DARK, OBSTRUCTED
    private Boolean isScreenCapture;
    private AiVerificationStatus status;
    private String message;
    private String suggestion;
}

