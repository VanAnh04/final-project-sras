package com.sras.backend.dto.response;

import com.sras.backend.entity.DispatchConfig;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DispatchConfigResponse {

    private Long id;
    private Integer weightDistance;
    private Integer weightWorkload;
    private Integer weightRating;
    private Integer weightResponseRate;
    private Integer penaltyPerOrder;
    private Boolean isActive;
    private OffsetDateTime updatedAt;
    private Long updatedByUserId;

    public static DispatchConfigResponse fromEntity(DispatchConfig entity) {
        if (entity == null) return null;
        return DispatchConfigResponse.builder()
                .id(entity.getId())
                .weightDistance(entity.getWeightDistance())
                .weightWorkload(entity.getWeightWorkload())
                .weightRating(entity.getWeightRating())
                .weightResponseRate(entity.getWeightResponseRate())
                .penaltyPerOrder(entity.getPenaltyPerOrder())
                .isActive(entity.getIsActive())
                .updatedAt(entity.getUpdatedAt())
                .updatedByUserId(entity.getUpdatedByUserId())
                .build();
    }
}
