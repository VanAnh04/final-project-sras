package com.sras.backend.dto.response;

import com.sras.backend.entity.Service;
import com.sras.backend.entity.enums.FeeType;
import com.sras.backend.entity.enums.ServiceUnit;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceResponse {
    private Long id;
    private Long categoryId;
    private String categoryName;
    private String categoryCode;
    private String name;
    private String code;
    private FeeType feeType;
    private Long minPrice;
    private Long maxPrice;
    private ServiceUnit unit;
    private Boolean isActive;
    private OffsetDateTime createdAt;

    public static ServiceResponse fromEntity(Service entity) {
        if (entity == null) {
            return null;
        }
        return ServiceResponse.builder()
                .id(entity.getId())
                .categoryId(entity.getCategory() != null ? entity.getCategory().getId() : null)
                .categoryName(entity.getCategory() != null ? entity.getCategory().getName() : null)
                .categoryCode(entity.getCategory() != null ? entity.getCategory().getCode() : null)
                .name(entity.getName())
                .code(entity.getCode())
                .feeType(entity.getFeeType())
                .minPrice(entity.getMinPrice())
                .maxPrice(entity.getMaxPrice())
                .unit(entity.getUnit())
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
