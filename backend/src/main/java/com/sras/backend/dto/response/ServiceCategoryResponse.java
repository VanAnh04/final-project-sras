package com.sras.backend.dto.response;

import com.sras.backend.entity.ServiceCategory;
import com.sras.backend.entity.enums.Capability;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceCategoryResponse {
    private Long id;
    private String name;
    private String code;
    private Capability vehicleType;
    private Short displayOrder;
    private Boolean isActive;
    private OffsetDateTime createdAt;

    public static ServiceCategoryResponse fromEntity(ServiceCategory entity) {
        if (entity == null) {
            return null;
        }
        return ServiceCategoryResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .code(entity.getCode())
                .vehicleType(entity.getVehicleType())
                .displayOrder(entity.getDisplayOrder())
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
