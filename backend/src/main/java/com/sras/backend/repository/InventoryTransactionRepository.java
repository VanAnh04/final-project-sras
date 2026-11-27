package com.sras.backend.repository;

import com.sras.backend.entity.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {

    @Query("""
            SELECT tx FROM InventoryTransaction tx
            LEFT JOIN FETCH tx.garage g
            LEFT JOIN FETCH tx.inventoryItem item
            LEFT JOIN FETCH tx.rescueRequest req
            LEFT JOIN FETCH tx.performedByUser u
            ORDER BY tx.createdAt DESC
            """)
    List<InventoryTransaction> findAllWithDetailsOrderByCreatedAtDesc();

    @Query("""
            SELECT tx FROM InventoryTransaction tx
            LEFT JOIN FETCH tx.garage g
            LEFT JOIN FETCH tx.inventoryItem item
            LEFT JOIN FETCH tx.rescueRequest req
            LEFT JOIN FETCH tx.performedByUser u
            WHERE tx.garage.id = :garageId
            ORDER BY tx.createdAt DESC
            """)
    List<InventoryTransaction> findByGarageIdWithDetailsOrderByCreatedAtDesc(@Param("garageId") Long garageId);

    @Query("""
            SELECT tx FROM InventoryTransaction tx
            LEFT JOIN FETCH tx.inventoryItem item
            LEFT JOIN FETCH tx.performedByUser u
            WHERE tx.rescueRequest.id = :requestId
            ORDER BY tx.createdAt DESC
            """)
    List<InventoryTransaction> findByRescueRequestIdOrderByCreatedAtDesc(@Param("requestId") Long requestId);
}
