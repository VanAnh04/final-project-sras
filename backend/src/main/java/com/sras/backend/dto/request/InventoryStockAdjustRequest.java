package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.InventoryTxType;
import lombok.Data;

@Data
public class InventoryStockAdjustRequest {
    /** Loại giao dịch: INBOUND (Nhập kho), ADJUSTMENT (Kiểm kê / Đặt lại tồn thực tế), DAMAGED (Xuất hủy hỏng). */
    private InventoryTxType txType;
    /** Số lượng nhập thêm (với INBOUND), số lượng hủy (với DAMAGED), hoặc số lượng tồn thực tế mới (với ADJUSTMENT). */
    private Integer quantity;
    /** Giá vốn nhập đơn vị mới (VNĐ - áp dụng khi INBOUND hoặc cập nhật giá vốn). */
    private Long unitCost;
    /** Giá bán cập nhật (VNĐ - tùy chọn). */
    private Long sellingPrice;
    /** Định mức cảnh báo tồn tối thiểu (tùy chọn). */
    private Integer minStockQty;
    private String supplierName;
    private String note;
}
