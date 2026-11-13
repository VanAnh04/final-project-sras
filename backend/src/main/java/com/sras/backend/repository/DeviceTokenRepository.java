package com.sras.backend.repository;

import com.sras.backend.entity.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

    /** Tìm cả bản ghi đã soft delete — cột token là UNIQUE nên phải tái sử dụng dòng cũ. */
    Optional<DeviceToken> findByFcmToken(String fcmToken);

    List<DeviceToken> findByUserIdAndIsDeletedFalse(Long userId);
}
