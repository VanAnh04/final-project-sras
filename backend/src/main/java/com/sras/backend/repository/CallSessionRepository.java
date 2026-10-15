package com.sras.backend.repository;

import com.sras.backend.entity.CallSession;
import com.sras.backend.entity.enums.CallStatus;
import jakarta.persistence.LockModeType;
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
public interface CallSessionRepository extends JpaRepository<CallSession, Long> {

    /** Khóa dòng để accept / reject / end / sweeper không giẫm chân nhau khi đổi trạng thái. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CallSession c where c.id = :id")
    Optional<CallSession> findWithLockById(@Param("id") Long id);

    /** Các cuộc gọi đang ở trạng thái {@code st} mà {@code userId} là người gọi hoặc người nhận (mới nhất trước). */
    @Query("select c from CallSession c where c.status in :st and (c.caller.id = :uid or c.callee.id = :uid) "
            + "order by c.createdAt desc")
    List<CallSession> findActiveByUser(@Param("uid") Long userId, @Param("st") Collection<CallStatus> st);

    @Query("select c.id from CallSession c where c.status = :st and c.createdAt < :before")
    List<Long> findIdsByStatusAndCreatedAtBefore(@Param("st") CallStatus st, @Param("before") OffsetDateTime before);

    /** Projection — sweeper chạy NGOÀI transaction nên không được chạm vào quan hệ LAZY. */
    interface CallParticipantsRef {
        Long getId();

        Long getCallerId();

        Long getCalleeId();
    }

    @Query("select c.id as id, c.caller.id as callerId, c.callee.id as calleeId from CallSession c where c.status = :st")
    List<CallParticipantsRef> findRefsByStatus(@Param("st") CallStatus st);

    List<CallSession> findByStatusIn(Collection<CallStatus> statuses);
}
