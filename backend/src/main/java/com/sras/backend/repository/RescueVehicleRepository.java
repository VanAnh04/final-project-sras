package com.sras.backend.repository;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.RescueVehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RescueVehicleRepository extends JpaRepository<RescueVehicle, Long> {

    List<RescueVehicle> findByGarageAndIsActiveTrue(Garage garage);

    Optional<RescueVehicle> findByIdAndGarage(Long id, Garage garage);
}
