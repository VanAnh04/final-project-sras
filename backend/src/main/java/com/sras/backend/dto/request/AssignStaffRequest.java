package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Gara gán nhân viên + xe cứu hộ cho một yêu cầu đã ACCEPTED. */
@Data
public class AssignStaffRequest {

    @NotNull(message = "Vui lòng chọn nhân viên")
    private Long staffId;

    @NotNull(message = "Vui lòng chọn xe cứu hộ")
    private Long rescueVehicleId;
}
