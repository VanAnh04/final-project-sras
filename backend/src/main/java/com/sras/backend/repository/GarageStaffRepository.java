package com.sras.backend.repository;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GarageStaffRepository extends JpaRepository<GarageStaff, Long> {

    List<GarageStaff> findByGarageAndIsActiveTrue(Garage garage);

    Optional<GarageStaff> findByIdAndGarage(Long id, Garage garage);

    Optional<GarageStaff> findByUserAndIsActiveTrue(User user);
}
