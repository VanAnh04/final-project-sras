package com.sras.backend.repository;

import com.sras.backend.entity.DispatchConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DispatchConfigRepository extends JpaRepository<DispatchConfig, Long> {

    Optional<DispatchConfig> findFirstByIsActiveTrueAndIsDeletedFalseOrderByIdDesc();
}
