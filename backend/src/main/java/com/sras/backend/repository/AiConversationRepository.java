package com.sras.backend.repository;

import com.sras.backend.entity.AiConversation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiConversationRepository extends JpaRepository<AiConversation, Long> {
}
