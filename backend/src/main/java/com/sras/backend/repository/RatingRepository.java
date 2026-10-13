package com.sras.backend.repository;

import com.sras.backend.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface RatingRepository extends JpaRepository<Rating, Long> {

    /** Điểm trung bình + số lượt của nhân viên phụ trách đơn (đánh giá của KHÁCH → GARA). */
    interface StaffRatingAgg {
        Long getStaffId();
        Double getAvgStars();
        Long getCnt();
    }

    @Query("""
            SELECT COALESCE(r.staff.id, r.request.staff.id) AS staffId,
                   AVG(COALESCE(r.staffStars, r.stars))    AS avgStars,
                   COUNT(r)                                AS cnt
            FROM Rating r
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
              AND (r.staff.id IN :staffIds OR r.request.staff.id IN :staffIds)
            GROUP BY COALESCE(r.staff.id, r.request.staff.id)
            """)
    List<StaffRatingAgg> aggregateByStaff(@Param("staffIds") Collection<Long> staffIds);

    interface GarageRatingAgg {
        Long getGarageId();
        Double getAvgStars();
        Long getCnt();
    }

    @Query("""
            SELECT r.request.garage.id AS garageId,
                   AVG(r.stars)        AS avgStars,
                   COUNT(r)            AS cnt
            FROM Rating r
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
              AND r.request.garage.id IN :garageIds
            GROUP BY r.request.garage.id
            """)
    List<GarageRatingAgg> aggregateByGarages(@Param("garageIds") Collection<Long> garageIds);

    @Query("""
            SELECT r.request.id
            FROM Rating r
            WHERE r.direction = :direction
              AND r.request.id IN :requestIds
            """)
    List<Long> findRatedRequestIds(
            @Param("requestIds") Collection<Long> requestIds,
            @Param("direction") com.sras.backend.entity.enums.RatingDirection direction);

    /** Điểm trung bình + số lượt của 1 đối tượng (avg null / cnt 0 khi chưa có đánh giá). */
    interface RatingAgg {
        Double getAvgStars();
        Long getCnt();
    }

    @Query("""
            SELECT AVG(r.stars) AS avgStars, COUNT(r) AS cnt
            FROM Rating r
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
              AND r.request.garage.id = :garageId
            """)
    RatingAgg aggregateForGarage(@Param("garageId") Long garageId);

    @Query("""
            SELECT AVG(COALESCE(r.staffStars, r.stars)) AS avgStars, COUNT(r) AS cnt
            FROM Rating r
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
              AND (r.staff.id = :staffId OR r.request.staff.id = :staffId)
            """)
    RatingAgg aggregateForStaff(@Param("staffId") Long staffId);

    boolean existsByRequestIdAndDirection(Long requestId, com.sras.backend.entity.enums.RatingDirection direction);

    java.util.Optional<Rating> findByRequestIdAndDirection(Long requestId, com.sras.backend.entity.enums.RatingDirection direction);

    @Query(value = """
            SELECT r FROM Rating r
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
              AND r.request.garage.id = :garageId
            ORDER BY r.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(r) FROM Rating r
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
              AND r.request.garage.id = :garageId
            """)
    org.springframework.data.domain.Page<Rating> findByRequestGarageIdOrderByCreatedAtDesc(@Param("garageId") Long garageId, org.springframework.data.domain.Pageable pageable);

    @Query("""
            SELECT r FROM Rating r
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
              AND r.request.garage.id = :garageId
            ORDER BY r.createdAt DESC
            """)
    List<Rating> findByRequestGarageIdOrderByCreatedAtDesc(@Param("garageId") Long garageId);

    @Query("""
            SELECT r FROM Rating r
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
              AND (r.staff.id = :staffId OR r.request.staff.id = :staffId)
            ORDER BY r.createdAt DESC
            """)
    List<Rating> findByStaffIdOrderByCreatedAtDesc(@Param("staffId") Long staffId);

    @Query(value = """
            SELECT r FROM Rating r
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
              AND (r.staff.id = :staffId OR r.request.staff.id = :staffId)
            ORDER BY r.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(r) FROM Rating r
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
              AND (r.staff.id = :staffId OR r.request.staff.id = :staffId)
            """)
    org.springframework.data.domain.Page<Rating> findByStaffIdOrderByCreatedAtDesc(@Param("staffId") Long staffId, org.springframework.data.domain.Pageable pageable);

    @Query("""
            SELECT r FROM Rating r
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
              AND r.request.garage.id = :garageId
            ORDER BY r.createdAt DESC
            """)
    List<Rating> findStaffRatingsByGarageId(@Param("garageId") Long garageId);

    /** Thống kê đánh giá dành cho Admin dashboard. */
    interface AdminRatingStatsAgg {
        Long getTotalRatings();
        Double getAvgStars();
        Long getFiveStarCount();
        Long getFourStarCount();
        Long getThreeStarCount();
        Long getTwoStarCount();
        Long getOneStarCount();
    }

    @Query("""
            SELECT COUNT(r) AS totalRatings,
                   AVG(r.stars) AS avgStars,
                   SUM(CASE WHEN r.stars = 5 THEN 1L ELSE 0L END) AS fiveStarCount,
                   SUM(CASE WHEN r.stars = 4 THEN 1L ELSE 0L END) AS fourStarCount,
                   SUM(CASE WHEN r.stars = 3 THEN 1L ELSE 0L END) AS threeStarCount,
                   SUM(CASE WHEN r.stars = 2 THEN 1L ELSE 0L END) AS twoStarCount,
                   SUM(CASE WHEN r.stars = 1 THEN 1L ELSE 0L END) AS oneStarCount
            FROM Rating r
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
            """)
    AdminRatingStatsAgg getAdminRatingStats();

    @Query(value = """
            SELECT r FROM Rating r
            LEFT JOIN r.request req
            LEFT JOIN req.garage g
            LEFT JOIN r.staff s
            LEFT JOIN s.user su
            LEFT JOIN req.staff rs
            LEFT JOIN rs.user rsu
            LEFT JOIN r.raterUser u
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
              AND (:garageId IS NULL OR g.id = :garageId)
              AND (:staffId IS NULL OR s.id = :staffId OR rs.id = :staffId)
              AND (:stars IS NULL OR r.stars = :stars)
              AND (:keyword IS NULL OR :keyword = '' OR (
                    LOWER(req.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR u.phone LIKE CONCAT('%', :keyword, '%')
                 OR LOWER(g.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(COALESCE(su.fullName, rsu.fullName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(r.comment) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(r.staffComment) LIKE LOWER(CONCAT('%', :keyword, '%'))
              ))
            ORDER BY r.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(r) FROM Rating r
            LEFT JOIN r.request req
            LEFT JOIN req.garage g
            LEFT JOIN r.staff s
            LEFT JOIN s.user su
            LEFT JOIN req.staff rs
            LEFT JOIN rs.user rsu
            LEFT JOIN r.raterUser u
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
              AND (:garageId IS NULL OR g.id = :garageId)
              AND (:staffId IS NULL OR s.id = :staffId OR rs.id = :staffId)
              AND (:stars IS NULL OR r.stars = :stars)
              AND (:keyword IS NULL OR :keyword = '' OR (
                    LOWER(req.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR u.phone LIKE CONCAT('%', :keyword, '%')
                 OR LOWER(g.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(COALESCE(su.fullName, rsu.fullName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(r.comment) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(r.staffComment) LIKE LOWER(CONCAT('%', :keyword, '%'))
              ))
            """)
    org.springframework.data.domain.Page<Rating> findAdminRatings(
            @Param("garageId") Long garageId,
            @Param("staffId") Long staffId,
            @Param("stars") Short stars,
            @Param("keyword") String keyword,
            org.springframework.data.domain.Pageable pageable);
}

