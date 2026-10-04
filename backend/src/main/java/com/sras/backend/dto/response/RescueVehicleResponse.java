package com.sras.backend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RescueVehicleResponse {
    private Long id;
    private String licensePlate;
    private String vehicleKind;
    private String imageUrl;
    /** FREE / BUSY */
    private String status;
}
