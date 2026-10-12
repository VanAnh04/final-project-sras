package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GarageServicePriceRequest {
    @NotNull(message = "Chi phí không được để trống")
    private Long price;

    private Boolean isActive;

    private String distanceTiersJson;

    private Boolean nightSurgeEnabled = false;

    private Integer nightSurgePercent = 0;

    private Boolean holidaySurgeEnabled = false;

    private Integer holidaySurgePercent = 0;
}
