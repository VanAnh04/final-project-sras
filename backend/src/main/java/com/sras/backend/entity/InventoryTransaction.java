package com.sras.backend.entity;

import com.sras.backend.entity.enums.InventoryTxType;
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
 * Sổ cái bất biến (Append-Only Ledger) ghi nhận toàn bộ biến động Xuất - Nhập - Tồn kho của Gara.
 */
@Getter
@Setter
@Entity
@Table(
        name = "inventory_transactions",
        indexes = {
                @Index(name = "idx_inv_tx_garage_created", columnList = "garage_id, created_at"),
                @Index(name = "idx_inv_tx_item_created", columnList = "inventory_item_id, created_at"),
                @Index(name = "idx_inv_tx_request", columnList = "rescue_request_id")
        }
)
public class InventoryTransaction extends AppendOnlyEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inventory_item_id", nullable = false)
    private GarageInventoryItem inventoryItem;

    @Enumerated(EnumType.STRING)
    @Column(name = "tx_type", nullable = false, length = 30)
    private InventoryTxType txType;

    /** Số lượng biến động (+ khi nhập/hoàn kho, - khi xuất đơn/hủy hỏng). */
    @Column(name = "quantity_change", nullable = false)
    private Integer quantityChange;

    /** Tồn kho thực tế (on_hand_qty) ngay sau khi thực hiện giao dịch này. */
    @Column(name = "on_hand_after", nullable = false)
    private Integer onHandAfter;

    /** Giá vốn tại thời điểm giao dịch (VNĐ). */
    @Column(name = "unit_cost_snapshot")
    private Long unitCostSnapshot;

    /** Giá bán tại thời điểm xuất kho cho đơn cứu hộ (VNĐ). */
    @Column(name = "unit_price_snapshot")
    private Long unitPriceSnapshot;

    /** Đơn cứu hộ liên quan (nếu là xuất kho cứu hộ hoặc hoàn kho từ đơn hủy). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rescue_request_id")
    private RescueRequest rescueRequest;

    /** Người thực hiện giao dịch (Chủ Gara, Kỹ thuật viên cứu hộ, hoặc Admin). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by_user_id")
    private User performedByUser;

    @Column(name = "note", length = 500)
    private String note;
}
