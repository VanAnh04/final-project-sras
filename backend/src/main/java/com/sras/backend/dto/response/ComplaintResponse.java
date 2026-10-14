package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.ComplaintStatus;
import com.sras.backend.entity.enums.ComplaintTargetType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintResponse {
    private Long id;
    private Long requestId;
    private String requestCode;
    private Long createdByUserId;
    private String createdByUserName;
    private String createdByUserPhone;
    private ComplaintTargetType targetType;
    private String content;
    private String attachmentUrl;
    private ComplaintStatus status;
    private String resolution;
    private Long handledByUserId;
    private String handledByUserName;
    private Long garageId;
    private String garageName;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
