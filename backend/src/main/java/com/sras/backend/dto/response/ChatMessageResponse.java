package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.AiRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {
    private Long id;
    private Long conversationId;
    private AiRole role;
    private String content;
    private Boolean isMine;
    private OffsetDateTime createdAt;
}
