package com.sras.backend.repository;

import com.sras.backend.entity.CustomerVehicle;
import com.sras.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerVehicleRepository extends JpaRepository<CustomerVehicle, Long> {
    List<CustomerVehicle> findByCustomerAndIsDeletedFalse(User customer);
    List<CustomerVehicle> findByCustomerIdAndIsDeletedFalse(Long customerId);
    Optional<CustomerVehicle> findByIdAndCustomerAndIsDeletedFalse(Long id, User customer);
}
