package com.sras.backend.repository;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.RescueVehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RescueVehicleRepository extends JpaRepository<RescueVehicle, Long> {

    List<RescueVehicle> findByGarageIdInAndIsDeletedFalseAndIsActiveTrue(java.util.Collection<Long> garageIds);

    List<RescueVehicle> findByGarageAndIsActiveTrue(Garage garage);

    List<RescueVehicle> findByGarageAndIsDeletedFalseAndIsActiveTrue(Garage garage);

    long countByGarageAndIsDeletedFalseAndIsActiveTrue(Garage garage);

    Optional<RescueVehicle> findByIdAndGarage(Long id, Garage garage);

    Optional<RescueVehicle> findByGarageAndLicensePlateIgnoreCase(Garage garage, String licensePlate);

    boolean existsByLicensePlateIgnoreCaseAndIsDeletedFalse(String licensePlate);

    List<RescueVehicle> findByGarageAndIsDeletedFalseAndIsActiveTrueAndStatus(Garage garage, com.sras.backend.entity.enums.WorkStatus status);

    long countByGarageAndIsDeletedFalseAndIsActiveTrueAndStatus(Garage garage, com.sras.backend.entity.enums.WorkStatus status);
}
