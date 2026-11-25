package com.sras.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GarageDossierAnalysisRequest {
    private String garageName;
    private String ownerName;
    private String phone;
    private String email;
    private String address;
    private String idCardFrontUrl;
    private String idCardBackUrl;
    private String businessLicenseUrl;
    private String facadePhotoUrl;
}

