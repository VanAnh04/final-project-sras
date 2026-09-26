package com.sras.backend.repository;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageServicePrice;
import com.sras.backend.entity.Service;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GarageServicePriceRepository extends JpaRepository<GarageServicePrice, Long> {
    List<GarageServicePrice> findByGarage(Garage garage);
    List<GarageServicePrice> findByGarageId(Long garageId);
    Optional<GarageServicePrice> findByGarageAndService(Garage garage, Service service);
    Optional<GarageServicePrice> findByGarageIdAndServiceId(Long garageId, Long serviceId);
}
