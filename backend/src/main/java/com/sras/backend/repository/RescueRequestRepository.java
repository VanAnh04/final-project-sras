package com.sras.backend.repository;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.RescueStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RescueRequestRepository extends JpaRepository<RescueRequest, Long> {

    Optional<RescueRequest> findByIdAndIsDeletedFalse(Long id);

    List<RescueRequest> findByCustomerAndIsDeletedFalseOrderByCreatedAtDesc(User customer);

    List<RescueRequest> findByGarageAndIsDeletedFalseOrderByCreatedAtDesc(Garage garage);

    List<RescueRequest> findByStaffAndIsDeletedFalseOrderByCreatedAtDesc(GarageStaff staff);

    boolean existsByCode(String code);

    /**
     * Lịch sử đơn của nhân viên (PAID / COMPLETED).
     * JOIN FETCH để tránh LazyInitializationException khi đọc các quan hệ ngoài transaction.
     */
    @Query("""
            SELECT DISTINCT r FROM RescueRequest r
            LEFT JOIN FETCH r.customer
            LEFT JOIN FETCH r.garage
            LEFT JOIN FETCH r.staff s
            LEFT JOIN FETCH s.user
            LEFT JOIN FETCH r.rescueVehicle
            WHERE r.staff = :staff
              AND r.isDeleted = false
              AND r.status IN :statuses
            ORDER BY r.createdAt DESC
            """)
    List<RescueRequest> findStaffHistoryEager(
            @Param("staff") GarageStaff staff,
            @Param("statuses") List<RescueStatus> statuses);

    @Query("""
            SELECT COUNT(r) FROM RescueRequest r
            WHERE r.staff = :staff
              AND r.isDeleted = false
              AND r.status IN (
                    com.sras.backend.entity.enums.RescueStatus.COMPLETED,
                    com.sras.backend.entity.enums.RescueStatus.AWAITING_PAYMENT,
                    com.sras.backend.entity.enums.RescueStatus.PAID,
                    com.sras.backend.entity.enums.RescueStatus.RATED
              )
              AND r.createdAt >= :startOfDay
            """)
    long countTodayCompletedJobs(
            @Param("staff") GarageStaff staff,
            @Param("startOfDay") java.time.OffsetDateTime startOfDay);

    @Query("""
            SELECT COUNT(r) FROM RescueRequest r
            WHERE r.staff = :staff
              AND r.isDeleted = false
              AND r.status IN (
                    com.sras.backend.entity.enums.RescueStatus.ASSIGNED,
                    com.sras.backend.entity.enums.RescueStatus.EN_ROUTE,
                    com.sras.backend.entity.enums.RescueStatus.ARRIVED,
                    com.sras.backend.entity.enums.RescueStatus.DIAGNOSED,
                    com.sras.backend.entity.enums.RescueStatus.REPAIRING_ONSITE,
                    com.sras.backend.entity.enums.RescueStatus.TOWING
              )
            """)
    long countActiveJobs(@Param("staff") GarageStaff staff);
}
