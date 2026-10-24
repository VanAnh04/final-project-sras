package com.sras.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatRequest {

    private List<ChatMessage> messages;
    private String userLocation;
    private Double lat;
    private Double lng;
    private String vehicleType; // MOTORBIKE | CAR
    private List<String> photoUrls;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatMessage {
        private String role; // "user" hoặc "assistant" / "model"
        private String content;
        private String imageUrl;
    }
}
