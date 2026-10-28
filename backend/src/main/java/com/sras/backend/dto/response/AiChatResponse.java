package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatResponse {

    /** Nội dung tin nhắn trả lời bằng tiếng Việt của trợ lý AI */
    private String reply;

    /** true nếu AI đề xuất gửi đơn cứu hộ dựa trên cuộc trò chuyện */
    private Boolean isRescueProposal;

    /** Thông tin đơn cứu hộ đề xuất để hiển thị thẻ xác nhận 1 chạm */
    private ProposedRescueOrder proposedOrder;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProposedRescueOrder {
        private Long garageId;
        private String garageName;
        private String vehicleType; // MOTORBIKE | CAR
        private String vehicleModel;
        private String issueType; // DEAD_BATTERY | FLAT_TIRE | OUT_OF_FUEL | ENGINE_FAILURE | TOWING | OTHER
        private String title;
        private String description;
        private String estimatedPrice;
        private String estimatedTravelFee;
        private Double distanceKm;
        private String address;
        private Double lat;
        private Double lng;
    }
}
