package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.Capability;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ServiceCategoryRequest {
    private String name;
    private String code;
    private Capability vehicleType;
    private Short displayOrder;
}
