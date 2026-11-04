package com.sras.backend.repository;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.RescueStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RescueRequestRepository extends JpaRepository<RescueRequest, Long> {

    Optional<RescueRequest> findByIdAndIsDeletedFalse(Long id);

    List<RescueRequest> findByCustomerAndIsDeletedFalseOrderByCreatedAtDesc(User customer);

    /**
     * Danh sách đơn của khách (tab Hoạt động) kèm JOIN FETCH tất cả quan hệ.
     */
    @Query("""
            SELECT DISTINCT r FROM RescueRequest r
            LEFT JOIN FETCH r.customer
            LEFT JOIN FETCH r.customerVehicle
            LEFT JOIN FETCH r.garage
            LEFT JOIN FETCH r.staff s
            LEFT JOIN FETCH s.user
            LEFT JOIN FETCH r.rescueVehicle
            WHERE r.customer = :customer
              AND r.isDeleted = false
            ORDER BY r.createdAt DESC
            """)
    List<RescueRequest> findCustomerRequestsEager(@Param("customer") User customer);

    List<RescueRequest> findByGarageAndIsDeletedFalseOrderByCreatedAtDesc(Garage garage);

    /**
     * Đơn đang xử lý của gara kèm JOIN FETCH tất cả quan hệ.
     */
    @Query("""
            SELECT DISTINCT r FROM RescueRequest r
            LEFT JOIN FETCH r.customer
            LEFT JOIN FETCH r.customerVehicle
            LEFT JOIN FETCH r.garage
            LEFT JOIN FETCH r.staff s
            LEFT JOIN FETCH s.user
            LEFT JOIN FETCH r.rescueVehicle
            WHERE r.garage = :garage
              AND r.isDeleted = false
              AND r.status IN :statuses
            ORDER BY r.createdAt DESC
            """)
    List<RescueRequest> findGarageActiveEager(
            @Param("garage") Garage garage,
            @Param("statuses") List<RescueStatus> statuses);

    List<RescueRequest> findByStaffAndIsDeletedFalseOrderByCreatedAtDesc(GarageStaff staff);

    boolean existsByCode(String code);

    @Query("""
            SELECT DISTINCT r FROM RescueRequest r
            LEFT JOIN FETCH r.customer
            LEFT JOIN FETCH r.garage
            LEFT JOIN FETCH r.staff s
            LEFT JOIN FETCH s.user
            LEFT JOIN FETCH r.rescueVehicle
            WHERE r.isDeleted = false
            ORDER BY r.createdAt DESC
            """)
    List<RescueRequest> findAllForAdminFinanceEager();

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


    /**
     * Lịch sử đơn của gara (PAID / COMPLETED / RATED / CANCELLED / DECLINED).
     */
    @Query("""
            SELECT DISTINCT r FROM RescueRequest r
            LEFT JOIN FETCH r.customer
            LEFT JOIN FETCH r.customerVehicle
            LEFT JOIN FETCH r.garage
            LEFT JOIN FETCH r.staff s
            LEFT JOIN FETCH s.user
            LEFT JOIN FETCH r.rescueVehicle
            WHERE r.garage = :garage
              AND r.isDeleted = false
              AND r.status IN :statuses
            ORDER BY r.createdAt DESC
            """)
    List<RescueRequest> findGarageHistoryEager(
            @Param("garage") Garage garage,
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

    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE RescueRequest r
            SET r.rescuerLat = :lat,
                r.rescuerLng = :lng,
                r.rescuerLocationAt = :at
            WHERE r.id = :id
            """)
    int updateRescuerLocationQuick(
            @Param("id") Long id,
            @Param("lat") Double lat,
            @Param("lng") Double lng,
            @Param("at") OffsetDateTime at);

    @Query("""
            SELECT r.garage.id, COUNT(r) FROM RescueRequest r
            WHERE r.garage.id IN :garageIds
              AND r.isDeleted = false
              AND r.status NOT IN (
                    com.sras.backend.entity.enums.RescueStatus.CANCELLED,
                    com.sras.backend.entity.enums.RescueStatus.DECLINED,
                    com.sras.backend.entity.enums.RescueStatus.NO_GARAGE_FOUND
              )
              AND r.createdAt >= :startOfDay
            GROUP BY r.garage.id
            """)
    List<Object[]> countOrdersTodayBatch(
            @Param("garageIds") java.util.Collection<Long> garageIds,
            @Param("startOfDay") OffsetDateTime startOfDay);

    /**
     * Đếm tổng số ca cứu hộ thực tế đã hoàn thành của một garage (COMPLETED, AWAITING_PAYMENT, PAID, RATED).
     */
    @Query("""
            SELECT COUNT(r) FROM RescueRequest r
            WHERE r.garage.id = :garageId
              AND r.isDeleted = false
              AND r.status IN (
                    com.sras.backend.entity.enums.RescueStatus.COMPLETED,
                    com.sras.backend.entity.enums.RescueStatus.AWAITING_PAYMENT,
                    com.sras.backend.entity.enums.RescueStatus.PAID,
                    com.sras.backend.entity.enums.RescueStatus.RATED
              )
            """)
    long countCompletedByGarageId(@Param("garageId") Long garageId);

    /**
     * Đếm theo batch tổng số ca cứu hộ thực tế đã hoàn thành cho danh sách garage.
     */
    @Query("""
            SELECT r.garage.id, COUNT(r) FROM RescueRequest r
            WHERE r.garage.id IN :garageIds
              AND r.isDeleted = false
              AND r.status IN (
                    com.sras.backend.entity.enums.RescueStatus.COMPLETED,
                    com.sras.backend.entity.enums.RescueStatus.AWAITING_PAYMENT,
                    com.sras.backend.entity.enums.RescueStatus.PAID,
                    com.sras.backend.entity.enums.RescueStatus.RATED
              )
            GROUP BY r.garage.id
            """)
    List<Object[]> countCompletedBatch(@Param("garageIds") java.util.Collection<Long> garageIds);
}
