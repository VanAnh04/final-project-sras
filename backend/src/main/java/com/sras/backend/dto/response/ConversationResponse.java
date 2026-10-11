package com.sras.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

/**
 * Một dòng trong hộp thư: cuộc hội thoại 1-1 giữa người dùng hiện tại và một đối phương
 * trong phạm vi một đơn cứu hộ, kèm tin nhắn mới nhất để hiển thị preview.
 *
 * <p>Client mở thread bằng {@code (rescueRequestId, peerRole)} — giống tham số của màn chat.
 */
@Data
@Builder
public class ConversationResponse {

    private Long rescueRequestId;
    /** Mã đơn (ví dụ để hiển thị "#RQ123"). */
    private String rescueCode;
    /** Trạng thái đơn hiện tại (client có thể ẩn/hiện tuỳ trạng thái). */
    private String rescueStatus;

    private Long peerId;
    /** Role đối phương: CUSTOMER / GARAGE / STAFF — cũng là tham số {@code peer} khi mở thread. */
    private String peerRole;
    private String peerName;
    private String peerAvatarUrl;
    private String peerPhone;

    /** Preview tin mới nhất. */
    private String lastContent;
    private String lastImageUrl;
    private OffsetDateTime lastAt;
    /** true nếu tin mới nhất do chính người dùng hiện tại gửi. */
    private boolean lastFromMe;

    /** Trạng thái online/offline của đối phương */
    private Boolean isOnline;
    private String onlineStatusText;
}
