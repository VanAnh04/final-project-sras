package com.sras.backend.entity.enums;

public enum QuoteItemInventoryStatus {
    /** Hạng mục công dịch vụ, không liên kết kho. */
    NONE,
    /** Đã tạm giữ tồn kho (reserved_qty) khi thợ gửi báo giá chờ khách duyệt. */
    RESERVED,
    /** Đã chính thức trừ tồn kho (on_hand_qty) khi khách đồng ý báo giá. */
    DEDUCTED,
    /** Đã giải phóng tạm giữ hoặc hoàn trả lại kho (do khách từ chối báo giá hoặc hủy đơn). */
    RELEASED
}
