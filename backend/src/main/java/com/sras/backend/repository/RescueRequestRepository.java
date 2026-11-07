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

    /**
     * Thống kê số lượng đơn đang xử lý gom nhóm theo từng Gara (dành cho AI phân tích tải công việc).
     */
    @Query("""
            SELECT r.garage.id, COUNT(r)
            FROM RescueRequest r
            WHERE r.isDeleted = false
              AND r.status IN :statuses
              AND r.garage IS NOT NULL
            GROUP BY r.garage.id
            """)
    List<Object[]> countActiveRequestsGroupedByGarage(@Param("statuses") List<RescueStatus> statuses);

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

    // ==========================================
    // CÁC TRUY VẤN ANALYTICS (TRỤC 3: SỰ CỐ & ĐỊA BÀN)
    // ==========================================

    @Query(value = """
            SELECT 
                COALESCE(r.vehicle_type, 'CAR') AS v_type,
                COUNT(r.id) AS count
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.created_at >= :from AND r.created_at <= :to
            GROUP BY r.vehicle_type
            """, nativeQuery = true)
    List<Object[]> getVehicleBreakdown(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    @Query(value = """
            SELECT 
                COALESCE(r.quote_type, 'ONSITE') AS q_type,
                COUNT(r.id) AS count
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.created_at >= :from AND r.created_at <= :to
            GROUP BY r.quote_type
            """, nativeQuery = true)
    List<Object[]> getResolutionBreakdown(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    @Query(value = """
            SELECT 
                CAST(EXTRACT(HOUR FROM (r.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')) AS INTEGER) AS hr,
                COUNT(r.id) AS count
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.created_at >= :from AND r.created_at <= :to
            GROUP BY hr
            ORDER BY hr ASC
            """, nativeQuery = true)
    List<Object[]> getHourlyDistribution(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    @Query(value = """
            SELECT 
                COALESCE(NULLIF(TRIM(r.issue_type), ''), 'OTHER') AS issue,
                COUNT(r.id) AS count
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.created_at >= :from AND r.created_at <= :to
            GROUP BY 1
            ORDER BY count DESC
            LIMIT 8
            """, nativeQuery = true)
    List<Object[]> getTopIssueTypes(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    @Query(value = """
            SELECT 
                COALESCE(NULLIF(TRIM(r.pickup_address), ''), 'Khu vực không xác định') AS addr,
                COUNT(r.id) AS count
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.created_at >= :from AND r.created_at <= :to
            GROUP BY 1
            ORDER BY count DESC
            LIMIT 6
            """, nativeQuery = true)
    List<Object[]> getTopIncidentHotspots(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    @Query(value = """
            SELECT 
                r.id,
                r.code,
                r.pickup_lat,
                r.pickup_lng,
                COALESCE(r.pickup_address, 'Chưa xác định'),
                COALESCE(r.issue_type, 'OTHER'),
                COALESCE(r.vehicle_type, 'CAR'),
                COALESCE(r.quote_type, 'ONSITE'),
                r.status,
                TO_CHAR(r.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM/YYYY')
            FROM rescue_requests r
            WHERE r.is_deleted = false
              AND r.pickup_lat IS NOT NULL 
              AND r.pickup_lng IS NOT NULL
              AND r.created_at >= :from AND r.created_at <= :to
            ORDER BY r.created_at DESC
            LIMIT 150
            """, nativeQuery = true)
    List<Object[]> getIncidentMapPoints(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    /**
     * Bảng xếp hạng Gara trong kỳ (total assigned, completed, cancelled, gmv, commission, avg arrival minutes).
     */
    @Query(value = """
            SELECT 
                g.id AS garage_id,
                g.name AS garage_name,
                g.phone AS phone,
                g.address AS address,
                g.capability AS capability,
                COALESCE(g_rt.avg_rating, CASE WHEN g.rating_count > 0 THEN g.avg_rating ELSE 0.0 END) AS avg_rating,
                COALESCE(g_rt.rating_count, g.rating_count, 0) AS rating_count,
                g.is_online AS is_online,
                COUNT(r.id) AS total_assigned,
                COUNT(CASE WHEN r.status IN ('COMPLETED', 'AWAITING_PAYMENT', 'PAID', 'RATED') THEN 1 END) AS completed_jobs,
                COUNT(CASE WHEN r.status IN ('CANCELLED', 'DECLINED') THEN 1 END) AS cancelled_jobs,
                COALESCE(SUM(CASE WHEN r.status IN ('COMPLETED', 'AWAITING_PAYMENT', 'PAID', 'RATED') THEN COALESCE(r.total_amount, r.rescue_fee, 0) ELSE 0 END), 0) AS total_gmv,
                COALESCE(SUM(CASE WHEN r.status IN ('COMPLETED', 'AWAITING_PAYMENT', 'PAID', 'RATED') THEN COALESCE(r.commission_amount, 0) ELSE 0 END), 0) AS commission,
                COALESCE(AVG(CASE WHEN r.status IN ('COMPLETED', 'AWAITING_PAYMENT', 'PAID', 'RATED') AND r.arrived_at IS NOT NULL 
                                 THEN EXTRACT(EPOCH FROM (r.arrived_at - COALESCE(r.en_route_at, r.created_at))) / 60.0 END), 0) AS avg_arrival_minutes
            FROM garages g
            LEFT JOIN (
                SELECT 
                    req.garage_id,
                    ROUND(CAST(AVG(rt.stars) AS numeric), 1) AS avg_rating,
                    COUNT(rt.id) AS rating_count
                FROM ratings rt
                JOIN rescue_requests req ON rt.request_id = req.id
                WHERE rt.direction = 'CUSTOMER_TO_GARAGE'
                  AND rt.is_deleted = false
                GROUP BY req.garage_id
            ) g_rt ON g_rt.garage_id = g.id
            LEFT JOIN rescue_requests r ON r.garage_id = g.id 
                 AND r.is_deleted = false 
                 AND r.created_at >= :from AND r.created_at <= :to
            WHERE g.is_deleted = false AND g.status = 'APPROVED'
            GROUP BY g.id, g.name, g.phone, g.address, g.capability, g.avg_rating, g.rating_count, g_rt.avg_rating, g_rt.rating_count, g.is_online
            ORDER BY completed_jobs DESC, total_gmv DESC
            LIMIT 50
            """, nativeQuery = true)
    List<Object[]> getGaragePerformanceLeaderboard(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    /**
     * Số khiếu nại phát sinh theo từng Gara trong kỳ.
     */
    @Query(value = """
            SELECT 
                r.garage_id,
                COUNT(c.id) AS complaint_count
            FROM complaints c
            JOIN rescue_requests r ON c.request_id = r.id
            WHERE c.is_deleted = false 
              AND r.is_deleted = false
              AND r.garage_id IS NOT NULL
              AND c.created_at >= :from AND c.created_at <= :to
            GROUP BY r.garage_id
            """, nativeQuery = true)
    List<Object[]> getGarageComplaintCounts(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    /**
     * Bảng xếp hạng Kỹ thuật viên (Thợ cứu hộ) trong kỳ.
     */
    @Query(value = """
            SELECT 
                s.id AS staff_id,
                COALESCE(u.full_name, 'Kỹ thuật viên') AS staff_name,
                COALESCE(u.phone, '') AS phone,
                g.name AS garage_name,
                COUNT(r.id) AS completed_jobs,
                COALESCE(ROUND(CAST(AVG(rt.staff_stars) AS numeric), 1), 0.0) AS avg_rating,
                COUNT(rt.id) AS rating_count
            FROM garage_staff s
            JOIN users u ON s.user_id = u.id
            JOIN garages g ON s.garage_id = g.id
            JOIN rescue_requests r ON r.staff_id = s.id 
                 AND r.is_deleted = false 
                 AND r.status IN ('COMPLETED', 'AWAITING_PAYMENT', 'PAID', 'RATED')
                 AND r.created_at >= :from AND r.created_at <= :to
            LEFT JOIN ratings rt ON rt.request_id = r.id AND rt.staff_stars IS NOT NULL AND rt.is_deleted = false
            WHERE s.is_deleted = false
            GROUP BY s.id, u.full_name, u.phone, g.name
            ORDER BY completed_jobs DESC, avg_rating DESC
            LIMIT 20
            """, nativeQuery = true)
    List<Object[]> getTechnicianLeaderboard(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    /**
     * Cơ cấu năng lực đối tác (Capability breakdown: CAR, MOTORBIKE, BOTH).
     */
    @Query(value = """
            SELECT 
                COALESCE(capability, 'BOTH') AS cap,
                COUNT(id) AS count
            FROM garages
            WHERE is_deleted = false AND status = 'APPROVED'
            GROUP BY capability
            """, nativeQuery = true)
    List<Object[]> getGarageCapabilityBreakdown();

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

    /**
     * Đếm số lần Gara đã được tự động bồi hoàn xăng xe trong tháng hiện tại (hạn mức tối đa 2 lần/tháng).
     */
    @Query("""
            SELECT COUNT(r) FROM RescueRequest r
            WHERE r.garage = :garage
              AND r.isDeleted = false
              AND r.gasCompensationStatus = 'AUTO_CREDITED'
              AND r.updatedAt >= :startOfMonth
            """)
    long countAutoCompensationsThisMonth(
            @Param("garage") Garage garage,
            @Param("startOfMonth") OffsetDateTime startOfMonth);
}
