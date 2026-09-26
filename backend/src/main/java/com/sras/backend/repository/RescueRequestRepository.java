package com.sras.backend.repository;

import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.RescueStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RescueRequestRepository extends JpaRepository<RescueRequest, Long> {

    List<RescueRequest> findByCustomerOrderByCreatedAtDesc(User customer);

    @Query("SELECT r FROM RescueRequest r WHERE (r.staff.user = :user OR r.garage.owner = :user) AND r.isDeleted = false ORDER BY r.createdAt DESC")
    List<RescueRequest> findByStaffOrOwnerUser(@Param("user") User user);

    @Query("SELECT r FROM RescueRequest r WHERE (r.staff.user = :user OR r.garage.owner = :user) AND r.status IN :statuses AND r.isDeleted = false ORDER BY r.createdAt DESC")
    List<RescueRequest> findByStaffOrOwnerUserAndStatusIn(@Param("user") User user, @Param("statuses") List<RescueStatus> statuses);
}
