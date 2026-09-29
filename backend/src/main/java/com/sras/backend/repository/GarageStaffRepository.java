package com.sras.backend.repository;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.WorkStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GarageStaffRepository extends JpaRepository<GarageStaff, Long> {

    List<GarageStaff> findByGarageAndIsDeletedFalseOrderByCreatedAtDesc(Garage garage);

    Optional<GarageStaff> findByGarageAndIdAndIsDeletedFalse(Garage garage, Long id);

    Optional<GarageStaff> findByUserAndIsDeletedFalse(User user);

    boolean existsByUserAndIsDeletedFalse(User user);

    Optional<GarageStaff> findByGarageAndUserAndIsDeletedFalse(Garage garage, User user);

    Optional<GarageStaff> findByGarageAndUser(Garage garage, User user);

    long countByGarageAndIsDeletedFalseAndIsActiveTrue(Garage garage);

    long countByGarageAndIsDeletedFalseAndIsActiveTrueAndStatus(Garage garage, WorkStatus status);

    long countByGarageAndIsDeletedFalseAndIsActiveFalse(Garage garage);
}
