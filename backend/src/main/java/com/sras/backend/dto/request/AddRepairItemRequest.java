package com.sras.backend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AddRepairItemRequest {

    private Long serviceId;

    @NotBlank(message = "Tên hạng mục không được để trống")
    private String name;

    @NotNull(message = "Giá tiền không được để trống")
    @Min(value = 0, message = "Giá tiền không hợp lệ")
    private Long price;

    private Short quantity = 1;

    private String note;
}
