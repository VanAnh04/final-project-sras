package com.sras.backend.entity.enums;

/** Trạng thái một cuộc gọi thoại trong ứng dụng ({@code call_sessions.status}). */
public enum CallStatus {
    /** Vừa tạo, đang đổ chuông bên người nhận. */
    RINGING,
    /** Người nhận đã nghe máy. */
    ONGOING,
    /** Một bên cúp máy khi đang nói. */
    ENDED,
    /** Đổ chuông hết giờ không ai nghe. */
    MISSED,
    /** Người nhận từ chối. */
    REJECTED,
    /** Người gọi cúp khi đang đổ chuông. */
    CANCELLED,
    /** Mất kết nối, hoặc server khởi động lại giữa chừng. */
    FAILED
}
