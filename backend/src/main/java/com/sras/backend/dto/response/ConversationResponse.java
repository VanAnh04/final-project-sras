package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationResponse {
    private Long id;
    private Long requestId;
    private String requestCode;
    private String peerName;
    private String peerPhone;
    private String peerRole;
    private String peerAvatar;
    private String lastMessage;
    private OffsetDateTime lastMessageTime;
    private Boolean isUnread;
    private Integer unreadCount;
    private String status;
    private String vehicleInfo;
}
