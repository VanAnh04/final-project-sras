package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatMessageRequest {
    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    private String content;
}
