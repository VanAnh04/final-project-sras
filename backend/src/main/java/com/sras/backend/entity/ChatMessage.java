package com.sras.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * A 1-1 chat message tied to a rescue request. Append-only: sent once, never edited.
 *
 * <p>The pair {@code (sender, recipient)} within a {@code rescueRequest} identifies a thread.
 * All three role pairs are supported (khách↔chủ, khách↔nhân viên, chủ↔nhân viên).
 */
@Getter
@Setter
@Entity
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_chat_messages_request_created", columnList = "rescue_request_id, created_at"),
        @Index(name = "idx_chat_messages_recipient", columnList = "recipient_id")
})
public class ChatMessage extends AppendOnlyEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rescue_request_id", nullable = false)
    private RescueRequest rescueRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    /** Nội dung text — nullable cho tin chỉ có ảnh. */
    @Column(name = "content", columnDefinition = "text")
    private String content;

    /** URL ảnh đính kèm (tương đối "/uploads/.." như phần còn lại của hệ thống). */
    @Column(name = "image_url", length = 500)
    private String imageUrl;
}
