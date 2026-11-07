package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportBomDonRequest {

    @NotBlank(message = "Lý do báo bom đơn không được để trống")
    @Size(max = 500, message = "Lý do tối đa 500 ký tự")
    private String reason;

    @Size(max = 500, message = "Đường dẫn ảnh tối đa 500 ký tự")
    private String photoUrl;

    private Double reporterLat;

    private Double reporterLng;
}

