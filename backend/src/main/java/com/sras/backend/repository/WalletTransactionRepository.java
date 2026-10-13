package com.sras.backend.repository;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.WalletTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {
    List<WalletTransaction> findByGarageOrderByCreatedAtDesc(Garage garage);
    Page<WalletTransaction> findByGarageOrderByCreatedAtDesc(Garage garage, Pageable pageable);
    List<WalletTransaction> findByStaffOrderByCreatedAtDesc(GarageStaff staff);
    Page<WalletTransaction> findByStaffOrderByCreatedAtDesc(GarageStaff staff, Pageable pageable);
    List<WalletTransaction> findByWalletTypeOrderByCreatedAtDesc(com.sras.backend.entity.enums.WalletType walletType);
    Page<WalletTransaction> findByWalletTypeOrderByCreatedAtDesc(com.sras.backend.entity.enums.WalletType walletType, Pageable pageable);
}
