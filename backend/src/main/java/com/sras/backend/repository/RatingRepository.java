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
            SELECT r.request.staff.id AS staffId,
                   AVG(r.stars)       AS avgStars,
                   COUNT(r)           AS cnt
            FROM Rating r
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
              AND r.request.staff.id IN :staffIds
            GROUP BY r.request.staff.id
            """)
    List<StaffRatingAgg> aggregateByStaff(@Param("staffIds") Collection<Long> staffIds);

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
            SELECT AVG(r.stars) AS avgStars, COUNT(r) AS cnt
            FROM Rating r
            WHERE r.direction = com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE
              AND r.request.staff.id = :staffId
            """)
    RatingAgg aggregateForStaff(@Param("staffId") Long staffId);
}
