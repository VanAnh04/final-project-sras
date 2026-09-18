package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.FeeType;
import com.sras.backend.entity.enums.ServiceUnit;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ServiceRequest {
    private Long categoryId;
    private String name;
    private String code;
    private FeeType feeType;
    private Long minPrice;
    private Long maxPrice;
    private ServiceUnit unit;
}
