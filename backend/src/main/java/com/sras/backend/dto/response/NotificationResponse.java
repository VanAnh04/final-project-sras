package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private NotificationType type;
    private String title;
    private String body;
    private String refType;
    private Long refId;
    private Boolean isRead;
    private OffsetDateTime createdAt;
}
