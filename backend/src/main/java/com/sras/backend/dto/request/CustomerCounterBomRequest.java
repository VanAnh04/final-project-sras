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
public class CustomerCounterBomRequest {

    @NotBlank(message = "Nội dung giải trình không được để trống")
    @Size(max = 2000, message = "Nội dung giải trình tối đa 2000 ký tự")
    private String explanation;

    @Size(max = 500, message = "Đường dẫn ảnh tối đa 500 ký tự")
    private String attachmentUrl;
}

