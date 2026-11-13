package com.sras.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

/** Một cuộc gọi thoại. Client tự suy ra mình là người gọi hay người nhận bằng {@code callerId}/{@code calleeId}. */
@Data
@Builder
public class CallResponse {

    private Long id;
    private Long rescueRequestId;
    private String rescueCode;

    /** RINGING / ONGOING / ENDED / MISSED / REJECTED / CANCELLED / FAILED */
    private String status;

    private Long callerId;
    /** CUSTOMER / GARAGE / STAFF */
    private String callerRole;
    private String callerName;
    private String callerAvatarUrl;

    private Long calleeId;
    /** CUSTOMER / GARAGE / STAFF */
    private String calleeRole;
    private String calleeName;
    private String calleeAvatarUrl;

    private OffsetDateTime createdAt;
    private OffsetDateTime answeredAt;
    private OffsetDateTime endedAt;
    private Integer durationSec;

    /** Người nhận đang có kết nối realtime hay không. Chỉ có ở phản hồi của lúc bắt đầu gọi, còn lại là null. */
    private Boolean calleeOnline;
}
