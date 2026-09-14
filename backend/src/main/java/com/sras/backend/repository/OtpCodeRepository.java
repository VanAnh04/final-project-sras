package com.sras.backend.repository;

import com.sras.backend.entity.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {
    Optional<OtpCode> findTopByPhoneOrderByCreatedAtDesc(String phone);
}
