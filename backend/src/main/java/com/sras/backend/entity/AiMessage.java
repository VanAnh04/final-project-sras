package com.sras.backend.entity;

import com.sras.backend.entity.enums.AiRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Append-only message within an AI conversation. */
@Getter
@Setter
@Entity
@Table(name = "ai_messages")
public class AiMessage extends AppendOnlyEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private AiConversation conversation;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 10)
    private AiRole role;

    @Column(name = "content", nullable = false, columnDefinition = "text")
    private String content;

    /** Whether the layer-2 guardrail replaced the content (R-03). */
    @Column(name = "is_guardrail_blocked", nullable = false)
    private Boolean isGuardrailBlocked = false;

    @Column(name = "blocked_topic", length = 50)
    private String blockedTopic;

    @Column(name = "token_count")
    private Integer tokenCount;
}
