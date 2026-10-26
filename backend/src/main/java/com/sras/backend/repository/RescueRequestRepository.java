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

    // ==========================================
    // CÁC TRUY VẤN ANALYTICS (TRỤC 1: SLA & VẬN HÀNH)
    // ==========================================

    @Query(value = """
            SELECT 
                COUNT(r.id) AS total,
                COALESCE(SUM(CASE WHEN r.status IN ('COMPLETED', 'AWAITING_PAYMENT', 'PAID', 'RATED') THEN 1 ELSE 0 END), 0) AS completed,
                COALESCE(SUM(CASE WHEN r.status IN ('ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'DIAGNOSED', 'REPAIRING_ONSITE', 'TOWING', 'TOW_TO_GARAGE') THEN 1 ELSE 0 END), 0) AS active,
                COALESCE(SUM(CASE WHEN r.status IN ('CANCELLED', 'DECLINED', 'NO_GARAGE_FOUND') THEN 1 ELSE 0 END), 0) AS cancelled
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.created_at >= :from AND r.created_at <= :to
            """, nativeQuery = true)
    List<Object[]> getOperationsCountSummary(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    @Query(value = """
            SELECT 
                COALESCE(AVG(CASE 
                    WHEN r.arrived_at IS NOT NULL AND r.en_route_at IS NOT NULL AND r.arrived_at >= r.en_route_at 
                    THEN EXTRACT(EPOCH FROM (r.arrived_at - r.en_route_at)) / 60.0 
                    ELSE NULL END), 0.0) AS avg_arrival_minutes,
                COALESCE(AVG(CASE 
                    WHEN r.completed_at IS NOT NULL AND r.arrived_at IS NOT NULL AND r.completed_at >= r.arrived_at 
                    THEN EXTRACT(EPOCH FROM (r.completed_at - r.arrived_at)) / 60.0 
                    ELSE NULL END), 0.0) AS avg_handling_minutes,
                COALESCE(AVG(CASE 
                    WHEN r.dispatch_distance_km IS NOT NULL 
                    THEN CAST(r.dispatch_distance_km AS DOUBLE PRECISION) 
                    ELSE NULL END), 0.0) AS avg_dispatch_distance_km
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.created_at >= :from AND r.created_at <= :to
            """, nativeQuery = true)
    List<Object[]> getOperationsSlaAverages(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    @Query(value = """
            SELECT 
                COUNT(r.id) AS step_created,
                COALESCE(SUM(CASE WHEN r.status NOT IN ('DRAFT', 'SEARCHING', 'NO_GARAGE_FOUND') THEN 1 ELSE 0 END), 0) AS step_accepted,
                COALESCE(SUM(CASE WHEN r.en_route_at IS NOT NULL OR r.status IN ('EN_ROUTE', 'ARRIVED', 'DIAGNOSED', 'REPAIRING_ONSITE', 'TOWING', 'TOW_TO_GARAGE', 'COMPLETED', 'AWAITING_PAYMENT', 'PAID', 'RATED') THEN 1 ELSE 0 END), 0) AS step_en_route,
                COALESCE(SUM(CASE WHEN r.arrived_at IS NOT NULL OR r.status IN ('ARRIVED', 'DIAGNOSED', 'REPAIRING_ONSITE', 'TOWING', 'TOW_TO_GARAGE', 'COMPLETED', 'AWAITING_PAYMENT', 'PAID', 'RATED') THEN 1 ELSE 0 END), 0) AS step_arrived,
                COALESCE(SUM(CASE WHEN r.status IN ('COMPLETED', 'AWAITING_PAYMENT', 'PAID', 'RATED') THEN 1 ELSE 0 END), 0) AS step_completed
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.created_at >= :from AND r.created_at <= :to
            """, nativeQuery = true)
    List<Object[]> getOperationsFunnel(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    @Query(value = """
            SELECT 
                COALESCE(r.cancelled_by, 'UNKNOWN') AS cancelled_by,
                COUNT(r.id) AS count
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.status = 'CANCELLED'
              AND r.created_at >= :from AND r.created_at <= :to
            GROUP BY r.cancelled_by
            """, nativeQuery = true)
    List<Object[]> getCancellationByRole(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    @Query(value = """
            SELECT 
                COALESCE(NULLIF(TRIM(r.cancel_reason), ''), 'Không nêu lý do') AS reason,
                COUNT(r.id) AS count
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.status = 'CANCELLED'
              AND r.created_at >= :from AND r.created_at <= :to
            GROUP BY 1
            ORDER BY count DESC
            LIMIT 5
            """, nativeQuery = true)
    List<Object[]> getTopCancellationReasons(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    @Query(value = """
            SELECT 
                TO_CHAR(r.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS day,
                COUNT(r.id) AS total,
                COALESCE(SUM(CASE WHEN r.status IN ('COMPLETED', 'AWAITING_PAYMENT', 'PAID', 'RATED') THEN 1 ELSE 0 END), 0) AS completed,
                COALESCE(SUM(CASE WHEN r.status IN ('CANCELLED', 'DECLINED', 'NO_GARAGE_FOUND') THEN 1 ELSE 0 END), 0) AS cancelled
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.created_at >= :from AND r.created_at <= :to
            GROUP BY day
            ORDER BY day ASC
            """, nativeQuery = true)
    List<Object[]> getDailyOperationsTrends(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    // ==========================================
    // CÁC TRUY VẤN ANALYTICS (TRỤC 2: TÀI CHÍNH & DOANH THU)
    // ==========================================

    @Query(value = """
            SELECT 
                COALESCE(SUM(COALESCE(r.total_amount, r.rescue_fee, 0)), 0) AS total_gmv,
                COALESCE(SUM(COALESCE(r.commission_amount, 0)), 0) AS total_commission,
                COUNT(r.id) AS completed_count
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.status IN ('COMPLETED', 'AWAITING_PAYMENT', 'PAID', 'RATED')
              AND r.created_at >= :from AND r.created_at <= :to
            """, nativeQuery = true)
    List<Object[]> getFinancialSummary(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    @Query(value = """
            SELECT 
                COALESCE(SUM(COALESCE(r.rescue_fee, 0)), 0) AS rescue_fee,
                COALESCE(SUM(COALESCE(r.towing_fee, 0)), 0) AS towing_fee,
                COALESCE(SUM(COALESCE(r.service_fee, 0)), 0) AS service_fee
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.status IN ('COMPLETED', 'AWAITING_PAYMENT', 'PAID', 'RATED')
              AND r.created_at >= :from AND r.created_at <= :to
            """, nativeQuery = true)
    List<Object[]> getFinancialFeeBreakdown(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    @Query(value = """
            SELECT 
                COALESCE(r.payment_method, 'CASH') AS method,
                COUNT(r.id) AS count,
                COALESCE(SUM(COALESCE(r.total_amount, r.rescue_fee, 0)), 0) AS amount
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.status IN ('COMPLETED', 'AWAITING_PAYMENT', 'PAID', 'RATED')
              AND r.created_at >= :from AND r.created_at <= :to
            GROUP BY r.payment_method
            """, nativeQuery = true)
    List<Object[]> getFinancialPaymentMethodBreakdown(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    @Query(value = """
            SELECT 
                TO_CHAR(r.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS day,
                COALESCE(SUM(COALESCE(r.total_amount, r.rescue_fee, 0)), 0) AS gmv,
                COALESCE(SUM(COALESCE(r.commission_amount, 0)), 0) AS commission,
                COUNT(r.id) AS order_count
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.status IN ('COMPLETED', 'AWAITING_PAYMENT', 'PAID', 'RATED')
              AND r.created_at >= :from AND r.created_at <= :to
            GROUP BY day
            ORDER BY day ASC
            """, nativeQuery = true)
    List<Object[]> getDailyFinancialTrends(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);
}


