package com.sras.backend.repository;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.WithdrawalRequest;
import com.sras.backend.entity.enums.PayoutMode;
import com.sras.backend.entity.enums.WithdrawalStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface WithdrawalRequestRepository extends JpaRepository<WithdrawalRequest, Long> {

    /** Khoá dòng để luồng chính, job đối soát và admin không cùng chốt một lệnh (chống hoàn tiền 2 lần). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from WithdrawalRequest w where w.id = :id")
    Optional<WithdrawalRequest> findWithLockById(@Param("id") Long id);

    Page<WithdrawalRequest> findByGarageAndIsDeletedFalseOrderByCreatedAtDesc(Garage garage, Pageable pageable);

    Optional<WithdrawalRequest> findByIdAndGarageAndIsDeletedFalse(Long id, Garage garage);

    List<WithdrawalRequest> findByIdIn(Collection<Long> ids);

    /** Lệnh AUTO còn dở dang — job đối soát quét. */
    @Query("select w.id from WithdrawalRequest w where w.payoutMode = :mode and w.status in :statuses order by w.id asc")
    List<Long> findIdsByPayoutModeAndStatusIn(@Param("mode") PayoutMode mode,
                                              @Param("statuses") Collection<WithdrawalStatus> statuses);

    /** Tổng tiền gara đã xin rút từ {@code from} (trừ các lệnh đã thất bại / bị từ chối). */
    @Query("select coalesce(sum(w.amount), 0) from WithdrawalRequest w where w.garage.id = :garageId "
            + "and w.createdAt >= :from and w.status not in :excluded")
    Long sumAmountByGarageSince(@Param("garageId") Long garageId,
                                @Param("from") OffsetDateTime from,
                                @Param("excluded") Collection<WithdrawalStatus> excluded);

    @Query("select count(w) from WithdrawalRequest w where w.garage.id = :garageId "
            + "and w.createdAt >= :from and w.status not in :excluded")
    long countByGarageSince(@Param("garageId") Long garageId,
                            @Param("from") OffsetDateTime from,
                            @Param("excluded") Collection<WithdrawalStatus> excluded);

    /** Tổng chi của toàn hệ thống từ {@code from} — trần chi mỗi ngày. */
    @Query("select coalesce(sum(w.amount), 0) from WithdrawalRequest w "
            + "where w.createdAt >= :from and w.status not in :excluded")
    Long sumAmountSince(@Param("from") OffsetDateTime from,
                        @Param("excluded") Collection<WithdrawalStatus> excluded);

    @Query("select w from WithdrawalRequest w where (:status is null or w.status = :status) "
            + "and (:needsReview is null or w.needsManualReview = :needsReview) order by w.createdAt desc")
    Page<WithdrawalRequest> searchForAdmin(@Param("status") WithdrawalStatus status,
                                           @Param("needsReview") Boolean needsReview,
                                           Pageable pageable);
}
