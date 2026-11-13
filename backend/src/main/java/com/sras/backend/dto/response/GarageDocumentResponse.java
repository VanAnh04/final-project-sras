package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.GarageDocType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GarageDocumentResponse {
    private Long id;
    private GarageDocType docType;
    private String fileUrl;
    private String note;
}
