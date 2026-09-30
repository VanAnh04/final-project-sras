package com.sras.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

/**
 * Một tin nhắn chat. Client tự tính {@code mine = senderId === user.id} và định tuyến thread bằng
 * {@code (rescueRequestId, peerRole)} trong đó peerRole là role của phía đối diện người xem.
 */
@Data
@Builder
public class ChatMessageResponse {

    private Long id;
    private Long rescueRequestId;

    private Long senderId;
    /** CUSTOMER / GARAGE / STAFF */
    private String senderRole;
    private String senderName;
    private String senderAvatarUrl;

    private Long recipientId;
    /** CUSTOMER / GARAGE / STAFF */
    private String recipientRole;

    private String content;
    private String imageUrl;

    private OffsetDateTime createdAt;
}
