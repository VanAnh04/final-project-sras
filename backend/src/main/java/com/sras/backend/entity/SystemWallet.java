package com.sras.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * System Wallet (Ví tổng hệ thống SRAS).
 * Nhận hoa hồng chiết khấu từ các đơn cứu hộ theo tỷ lệ hợp đồng.
 */
@Getter
@Setter
@Entity
@Table(name = "system_wallets")
public class SystemWallet extends BaseEntity {

    @Column(name = "name", nullable = false, length = 100)
    private String name = "SRAS_SYSTEM_WALLET";

    /** Số dư khả dụng hiện tại của ví hệ thống. CHECK >= 0. */
    @Column(name = "balance", nullable = false)
    private Long balance = 0L;

    /** Tổng hoa hồng/chiết khấu hệ thống đã thu từ trước đến nay. */
    @Column(name = "total_commission_collected", nullable = false)
    private Long totalCommissionCollected = 0L;
}
