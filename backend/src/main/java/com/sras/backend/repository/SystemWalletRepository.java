package com.sras.backend.repository;

import com.sras.backend.entity.SystemWallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SystemWalletRepository extends JpaRepository<SystemWallet, Long> {
    Optional<SystemWallet> findFirstByOrderByIdAsc();
}
