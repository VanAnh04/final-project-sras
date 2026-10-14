package com.sras.backend.repository;

import com.sras.backend.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /** Toàn bộ tin nhắn của một cặp (a↔b) trong một đơn, cũ → mới. */
    @Query("select m from ChatMessage m where m.rescueRequest.id = :rid " +
            "and ((m.sender.id = :a and m.recipient.id = :b) " +
            "  or (m.sender.id = :b and m.recipient.id = :a)) " +
            "order by m.createdAt asc, m.id asc")
    List<ChatMessage> findThread(@Param("rid") Long rescueRequestId,
                                 @Param("a") Long userA,
                                 @Param("b") Long userB);

    /**
     * Mọi tin nhắn có {@code userId} là người gửi hoặc người nhận, mới → cũ.
     * Dùng để dựng hộp thư: gom theo (đơn, đối phương) và lấy tin mới nhất.
     */
    @Query("select m from ChatMessage m " +
            "where m.sender.id = :uid or m.recipient.id = :uid " +
            "order by m.createdAt desc, m.id desc")
    List<ChatMessage> findAllInvolvingUser(@Param("uid") Long userId);

    /** Toàn bộ tin nhắn trong một đơn có liên quan tới user, cũ → mới (dùng khi fallback cho đơn). */
    @Query("select m from ChatMessage m where m.rescueRequest.id = :rid " +
            "and (m.sender.id = :uid or m.recipient.id = :uid) " +
            "order by m.createdAt asc, m.id asc")
    List<ChatMessage> findByRescueRequestInvolvingUser(@Param("rid") Long rescueRequestId,
                                                      @Param("uid") Long userId);

    /** Toàn bộ tin nhắn trong một đơn cứu hộ, cũ → mới. */
    @Query("select m from ChatMessage m where m.rescueRequest.id = :rid " +
            "order by m.createdAt asc, m.id asc")
    List<ChatMessage> findByRescueRequestId(@Param("rid") Long rescueRequestId);
}
