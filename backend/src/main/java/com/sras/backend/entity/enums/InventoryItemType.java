package com.sras.backend.entity.enums;

public enum InventoryItemType {
    /** Dịch vụ công thợ thuần túy (không cần quản lý tồn kho). */
    LABOR,
    /** Phụ tùng / Vật tư tiêu hao (bắt buộc quản lý tồn kho và trừ kho theo đơn cứu hộ). */
    PART
}
