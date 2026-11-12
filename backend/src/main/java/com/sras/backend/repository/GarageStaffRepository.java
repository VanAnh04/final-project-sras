package com.sras.backend.repository;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.WorkStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GarageStaffRepository extends JpaRepository<GarageStaff, Long> {

    List<GarageStaff> findByGarageIdInAndIsDeletedFalseAndIsActiveTrue(java.util.Collection<Long> garageIds);

    List<GarageStaff> findByGarageAndIsActiveTrue(Garage garage);

    Optional<GarageStaff> findByIdAndGarage(Long id, Garage garage);

    /** Khoá dòng nhân viên khi cộng ví thợ. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from GarageStaff s where s.id = :id")
    Optional<GarageStaff> findWithLockById(@Param("id") Long id);

    Optional<GarageStaff> findByUserAndIsActiveTrue(User user);

    List<GarageStaff> findByGarageAndIsDeletedFalseOrderByCreatedAtDesc(Garage garage);

    Optional<GarageStaff> findByGarageAndIdAndIsDeletedFalse(Garage garage, Long id);

    Optional<GarageStaff> findByUserAndIsDeletedFalse(User user);

    boolean existsByUserAndIsDeletedFalse(User user);

    Optional<GarageStaff> findByGarageAndUserAndIsDeletedFalse(Garage garage, User user);

    Optional<GarageStaff> findByGarageAndUser(Garage garage, User user);

    boolean existsByGarageAndStaffCodeIgnoreCaseAndIsDeletedFalse(Garage garage, String staffCode);

    boolean existsByGarageAndStaffCodeIgnoreCaseAndIsDeletedFalseAndIdNot(Garage garage, String staffCode, Long id);

    long countByGarageAndIsDeletedFalseAndIsActiveTrue(Garage garage);

    long countByGarageAndIsDeletedFalseAndIsActiveTrueAndStatus(Garage garage, WorkStatus status);

    long countByGarageAndIsDeletedFalseAndIsActiveFalse(Garage garage);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM GarageStaff s WHERE s.isDeleted = false " +
            "AND (:garageId IS NULL OR s.garage.id = :garageId) " +
            "AND (:status IS NULL OR s.status = :status) " +
            "AND (:isActive IS NULL OR s.isActive = :isActive) " +
            "ORDER BY s.createdAt DESC")
    org.springframework.data.domain.Page<GarageStaff> findStaffForAdmin(
            @org.springframework.data.repository.query.Param("garageId") Long garageId,
            @org.springframework.data.repository.query.Param("status") WorkStatus status,
            @org.springframework.data.repository.query.Param("isActive") Boolean isActive,
            org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM GarageStaff s WHERE s.isDeleted = false " +
            "AND (:garageId IS NULL OR s.garage.id = :garageId) " +
            "AND (:status IS NULL OR s.status = :status) " +
            "AND (:isActive IS NULL OR s.isActive = :isActive) " +
            "AND (LOWER(s.user.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "     OR LOWER(s.user.phone) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "     OR LOWER(s.staffCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "     OR LOWER(s.garage.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "ORDER BY s.createdAt DESC")
    org.springframework.data.domain.Page<GarageStaff> searchStaffForAdminWithKeyword(
            @org.springframework.data.repository.query.Param("garageId") Long garageId,
            @org.springframework.data.repository.query.Param("status") WorkStatus status,
            @org.springframework.data.repository.query.Param("isActive") Boolean isActive,
            @org.springframework.data.repository.query.Param("keyword") String keyword,
            org.springframework.data.domain.Pageable pageable);

    long countByIsDeletedFalse();

    long countByIsDeletedFalseAndIsActiveTrue();

    long countByIsDeletedFalseAndIsActiveTrueAndStatus(WorkStatus status);

    long countByIsDeletedFalseAndIsActiveFalse();
}
