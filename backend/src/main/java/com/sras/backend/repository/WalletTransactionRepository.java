package com.sras.backend.repository;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.WalletTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    /**
     * Số dư một ví của gara tính thẳng từ sổ cái. Với ví CASH đây là NGUỒN SỰ THẬT duy nhất của số tiền rút được:
     * chỉ tiền payOS đã xác nhận mới sinh dòng CASH dương (ORDER_SPLIT_GARAGE / WITHDRAWAL_REFUND).
     */
    @Query("select coalesce(sum(t.amount), 0) from WalletTransaction t where t.garage.id = :garageId and t.walletType = :walletType")
    Long sumAmountByGarageIdAndWalletType(@Param("garageId") Long garageId,
                                          @Param("walletType") com.sras.backend.entity.enums.WalletType walletType);
}
