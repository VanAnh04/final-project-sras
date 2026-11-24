package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.RescueVehicleKind;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehiclePhotoAnalysisRequest {
    private String photoUrl;
    private String expectedPlate;
    private RescueVehicleKind expectedKind;
}

