package com.sras.backend.entity.enums;

public enum InventoryTxType {
    /** Nhập thêm hàng mới vào kho Gara (+). */
    INBOUND,
    /** Xuất kho chính thức cho đơn cứu hộ đã được khách duyệt (-). */
    OUTBOUND_ORDER,
    /** Hoàn nhập kho tự động khi đơn cứu hộ bị hủy sau khi đã xuất kho (+). */
    RETURN_ORDER,
    /** Kiểm kê / Điều chỉnh chênh lệch tồn kho (+/-). */
    ADJUSTMENT,
    /** Xuất hủy vật tư bị hư hỏng / hao hụt (-). */
    DAMAGED
}
