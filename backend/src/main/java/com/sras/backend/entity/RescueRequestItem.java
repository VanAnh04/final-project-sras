package com.sras.backend.entity;

import com.sras.backend.entity.enums.ItemPhase;
import com.sras.backend.entity.enums.ItemStatus;
import com.sras.backend.entity.enums.QuoteItemInventoryStatus;
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

import java.time.OffsetDateTime;

/**
 * Item ③ quote lines (replaces the removed quotes + quote_items). The customer approves each line;
 * only APPROVED lines add to {@code rescue_requests.service_fee} (ONSITE) or
 * {@code repair_tickets.total_amount} (AT_GARAGE).
 */
@Getter
@Setter
@Entity
@Table(name = "rescue_request_items", indexes = @Index(
        name = "idx_rescue_request_items_request_status", columnList = "request_id, status"))
public class RescueRequestItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private RescueRequest request;

    /** Hybrid: set when chosen from the garage menu, null when typed manually. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private Service service;

    @Column(name = "name_snapshot", nullable = false, length = 150)
    private String nameSnapshot;

    @Column(name = "unit_price_snapshot", nullable = false)
    private Long unitPriceSnapshot;

    @Column(name = "quantity", nullable = false)
    private Short quantity = 1;

    /** = unit_price_snapshot × quantity. */
    @Column(name = "amount", nullable = false)
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "phase", nullable = false, length = 15)
    private ItemPhase phase = ItemPhase.ONSITE;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 15)
    private ItemStatus status = ItemStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdByUser;

    @Column(name = "responded_at")
    private OffsetDateTime respondedAt;

    /** Mặt hàng phụ tùng trong kho Gara được gắn với dòng báo giá này (null nếu là công dịch vụ). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_item_id")
    private GarageInventoryItem inventoryItem;

    /** Trạng thái giữ / trừ tồn kho của dòng báo giá này (NONE, RESERVED, DEDUCTED, RELEASED). */
    @Enumerated(EnumType.STRING)
    @Column(name = "inventory_status", length = 20)
    private QuoteItemInventoryStatus inventoryStatus = QuoteItemInventoryStatus.NONE;
}
