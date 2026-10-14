package com.sras.backend.repository;

import com.sras.backend.entity.ServiceCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, Long> {
    Optional<ServiceCategory> findByCode(String code);
    Optional<ServiceCategory> findByCodeIgnoreCase(String code);
    Optional<ServiceCategory> findByNameIgnoreCase(String name);
    boolean existsByCode(String code);
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
    List<ServiceCategory> findAllByOrderByDisplayOrderAsc();
}
