package com.sras.backend.repository;

import com.sras.backend.entity.Complaint;
import com.sras.backend.entity.enums.ComplaintStatus;
import com.sras.backend.entity.enums.ComplaintTargetType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    List<Complaint> findByCreatedByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("""
            SELECT c FROM Complaint c
            LEFT JOIN FETCH c.request r
            LEFT JOIN FETCH r.garage
            LEFT JOIN FETCH c.createdByUser
            LEFT JOIN FETCH c.handledByUser
            WHERE c.createdByUser.id = :userId
            ORDER BY c.createdAt DESC
            """)
    List<Complaint> findByCreatedByUserIdEager(@Param("userId") Long userId);

    Page<Complaint> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Complaint> findByStatusOrderByCreatedAtDesc(ComplaintStatus status, Pageable pageable);

    Page<Complaint> findByStatusAndTargetTypeOrderByCreatedAtDesc(ComplaintStatus status, ComplaintTargetType targetType, Pageable pageable);

    Page<Complaint> findByTargetTypeOrderByCreatedAtDesc(ComplaintTargetType targetType, Pageable pageable);

    List<Complaint> findByRequestIdOrderByCreatedAtDesc(Long requestId);

    @Query("""
            SELECT c FROM Complaint c
            LEFT JOIN FETCH c.request r
            LEFT JOIN FETCH r.garage
            LEFT JOIN FETCH c.createdByUser
            LEFT JOIN FETCH c.handledByUser
            WHERE c.request.id = :requestId
            ORDER BY c.createdAt DESC
            """)
    List<Complaint> findByRequestIdEager(@Param("requestId") Long requestId);

    boolean existsByRequestId(Long requestId);

    boolean existsByRequestIdAndCreatedByUserId(Long requestId, Long userId);

    java.util.Optional<Complaint> findFirstByRequestIdOrderByCreatedAtDesc(Long requestId);

    @Query("""
            SELECT c FROM Complaint c
            WHERE c.request.garage.id = :garageId
            ORDER BY c.createdAt DESC
            """)
    List<Complaint> findByGarageId(@Param("garageId") Long garageId);

    @Query("""
            SELECT c FROM Complaint c
            WHERE c.request.garage.id = :garageId
            ORDER BY c.createdAt DESC
            """)
    Page<Complaint> findByGarageIdPaged(@Param("garageId") Long garageId, Pageable pageable);
}
