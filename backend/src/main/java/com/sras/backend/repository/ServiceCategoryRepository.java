package com.sras.backend.repository;

import com.sras.backend.entity.ServiceCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, Long> {
    Optional<ServiceCategory> findByCode(String code);
    boolean existsByCode(String code);
    List<ServiceCategory> findAllByOrderByDisplayOrderAsc();
}
