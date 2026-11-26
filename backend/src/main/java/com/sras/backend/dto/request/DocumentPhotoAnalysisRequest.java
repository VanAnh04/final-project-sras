package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.GarageDocType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentPhotoAnalysisRequest {
    private String photoUrl;
    private GarageDocType docType;
    private String expectedName;
    private String expectedAddress;
}

