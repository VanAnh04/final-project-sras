package com.sras.backend.repository;

import com.sras.backend.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, Long entityId);

    Optional<AuditLog> findFirstByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, Long entityId);
}
