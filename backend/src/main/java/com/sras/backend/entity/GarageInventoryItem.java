package com.sras.backend.entity;

import com.sras.backend.entity.enums.Capability;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Tồn kho Phụ tùng & Vật tư cứu hộ của từng Gara đối tác.
 * Bảo đảm bất biến: availableQty = onHandQty - reservedQty >= 0.
 */
@Getter
@Setter
@Entity
@Table(
        name = "garage_inventory_items",
        indexes = {
                @Index(name = "idx_garage_inv_garage", columnList = "garage_id"),
                @Index(name = "idx_garage_inv_garage_service", columnList = "garage_id, service_id")
        }
)
public class GarageInventoryItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    /** Liên kết tới danh mục Dịch vụ/Phụ tùng chuẩn của Sàn (có thể null nếu Gara tự thêm vật tư riêng). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private Service service;

    @Column(name = "sku_code", nullable = false, length = 50)
    private String skuCode;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "category_name", length = 100)
    private String categoryName;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", length = 15)
    private Capability vehicleType = Capability.BOTH;

    @Column(name = "unit_label", nullable = false, length = 30)
    private String unitLabel = "Cái";

    /** Số lượng tồn thực tế hiện có trong kho Gara (>= 0). */
    @Column(name = "on_hand_qty", nullable = false)
    private Integer onHandQty = 0;

    /** Số lượng đang tạm giữ cho các đơn cứu hộ đang chờ khách duyệt báo giá (>= 0). */
    @Column(name = "reserved_qty", nullable = false)
    private Integer reservedQty = 0;

    /** Định mức tồn kho tối thiểu để cảnh báo sắp hết hàng. */
    @Column(name = "min_stock_qty", nullable = false)
    private Integer minStockQty = 5;

    /** Giá vốn nhập bình quân (VNĐ) dùng để tính chi phí và lợi nhuận gộp. */
    @Column(name = "cost_price", nullable = false)
    private Long costPrice = 0L;

    /** Giá bán / thay thế niêm yết tại Gara (nằm trong [minPrice, maxPrice] của Sàn nếu gắn service). */
    @Column(name = "selling_price", nullable = false)
    private Long sellingPrice = 0L;

    @Column(name = "supplier_name", length = 150)
    private String supplierName;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public int getAvailableQty() {
        int onHand = onHandQty != null ? onHandQty : 0;
        int reserved = reservedQty != null ? reservedQty : 0;
        return Math.max(0, onHand - reserved);
    }
}
