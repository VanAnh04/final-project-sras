package com.sras.backend.repository;

import com.sras.backend.entity.Service;
import com.sras.backend.entity.ServiceCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceRepository extends JpaRepository<Service, Long> {
    Optional<Service> findByCode(String code);
    boolean existsByCode(String code);
    List<Service> findByCategory(ServiceCategory category);
    List<Service> findByCategoryId(Long categoryId);
}
