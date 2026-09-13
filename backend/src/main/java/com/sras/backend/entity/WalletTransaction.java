package com.sras.backend.entity;

import com.sras.backend.entity.enums.WalletTxnType;
import com.sras.backend.entity.enums.WalletType;
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
 * Append-only wallet ledger (D-3). Every balance change writes a row here in the same transaction.
 *
 * <p>NOTE: the partial-unique index {@code uq_wallet_txn_withdrawal_once}
 * ({@code WHERE ref_type = 'WITHDRAWAL'}, RISK-A11) cannot be expressed with JPA annotations and
 * must be created via SQL migration.
 */
@Getter
@Setter
@Entity
@Table(name = "wallet_transactions", indexes = @Index(
        name = "idx_wallet_transactions_garage_created", columnList = "garage_id, created_at DESC"))
public class WalletTransaction extends AppendOnlyEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @Enumerated(EnumType.STRING)
    @Column(name = "wallet_type", nullable = false, length = 10)
    private WalletType walletType;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 25)
    private WalletTxnType type;

    /** Signed: positive credits, negative debits. */
    @Column(name = "amount", nullable = false)
    private Long amount;

    /** Balance of the wallet named by {@code wallet_type} (not the sum of both). CHECK &gt;= 0. */
    @Column(name = "balance_after", nullable = false)
    private Long balanceAfter;

    /** Free-form: {@code RESCUE_REQUEST · PAYMENT · WITHDRAWAL}. */
    @Column(name = "ref_type", length = 20)
    private String refType;

    @Column(name = "ref_id")
    private Long refId;

    @Column(name = "description", nullable = false, length = 255)
    private String description;

    /** Null if written by the system. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdByUser;
}
