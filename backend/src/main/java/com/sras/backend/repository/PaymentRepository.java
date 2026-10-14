package com.sras.backend.repository;

import com.sras.backend.entity.Payment;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByProviderOrderCode(Long providerOrderCode);
    Optional<Payment> findFirstByRequestAndStatusOrderByCreatedAtDesc(RescueRequest request, PaymentStatus status);
    List<Payment> findByRequestOrderByCreatedAtDesc(RescueRequest request);
}
