package com.sras.backend.repository;

import com.sras.backend.entity.ActionOtp;
import com.sras.backend.entity.enums.ActionOtpPurpose;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public interface ActionOtpRepository extends JpaRepository<ActionOtp, Long> {

    /** OTP mới nhất còn dùng được — khoá dòng để hai request không cùng tiêu một mã. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ActionOtp> findFirstByUserIdAndPurposeAndUsedAtIsNullOrderByIdDesc(Long userId, ActionOtpPurpose purpose);

    Optional<ActionOtp> findFirstByUserIdAndPurposeOrderByIdDesc(Long userId, ActionOtpPurpose purpose);

    long countByUserIdAndPurposeAndCreatedAtAfter(Long userId, ActionOtpPurpose purpose, OffsetDateTime since);

    /** Vô hiệu các OTP cũ còn dùng được trước khi cấp mã mới. */
    @Modifying
    @Query("update ActionOtp o set o.usedAt = :now where o.user.id = :userId and o.purpose = :purpose and o.usedAt is null")
    int invalidateActive(@Param("userId") Long userId,
                         @Param("purpose") ActionOtpPurpose purpose,
                         @Param("now") OffsetDateTime now);
}
