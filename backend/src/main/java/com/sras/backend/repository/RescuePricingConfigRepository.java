package com.sras.backend.repository;

import com.sras.backend.entity.RescuePricingConfig;
import com.sras.backend.entity.enums.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RescuePricingConfigRepository extends JpaRepository<RescuePricingConfig, Long> {

    Optional<RescuePricingConfig> findByVehicleTypeAndIsDeletedFalse(VehicleType vehicleType);
}
