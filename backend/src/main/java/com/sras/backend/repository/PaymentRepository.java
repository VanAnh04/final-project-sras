package com.sras.backend.repository;

import com.sras.backend.entity.Payment;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.enums.PaymentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByProviderOrderCode(Long providerOrderCode);
    Optional<Payment> findFirstByRequestAndStatusOrderByCreatedAtDesc(RescueRequest request, PaymentStatus status);
    List<Payment> findByRequestOrderByCreatedAtDesc(RescueRequest request);

    /** Khoá dòng payment khi cộng tiền — webhook và lần tra trạng thái chạy song song không cộng 2 lần. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.id = :id")
    Optional<Payment> findWithLockById(@Param("id") Long id);
}
