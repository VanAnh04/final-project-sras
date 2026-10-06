package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.FeeType;
import com.sras.backend.entity.enums.ServiceUnit;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class GarageServicePriceResponse {
    private Long id;
    private Long serviceId;
    private String serviceCode;
    private String serviceName;
    private Long categoryId;
    private String categoryName;
    private String categoryCode;
    private String categoryVehicleType;
    private FeeType feeType;
    private ServiceUnit unit;
    private Long minPrice;
    private Long maxPrice;
    private Long price;
    private Boolean isActive;
    private String distanceTiersJson;
    private Boolean nightSurgeEnabled;
    private Integer nightSurgePercent;
    private Boolean holidaySurgeEnabled;
    private Integer holidaySurgePercent;
}
