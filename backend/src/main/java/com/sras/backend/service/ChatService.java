package com.sras.backend.service;

import com.sras.backend.dto.request.SendMessageRequest;
import com.sras.backend.dto.response.ChatMessageResponse;
import com.sras.backend.dto.response.ConversationResponse;
import com.sras.backend.entity.User;

import java.util.List;

/** Chat 1-1 giữa các bên liên quan tới một đơn cứu hộ (khách, chủ gara, nhân viên). */
public interface ChatService {

    /** Gửi tin nhắn từ {@code sender} tới đối phương xác định bằng role trong {@code req.peer}. */
    ChatMessageResponse sendMessage(User sender, Long rescueRequestId, SendMessageRequest req);

    /** Lịch sử tin nhắn giữa {@code user} và đối phương (role {@code peer}) trong một đơn. */
    List<ChatMessageResponse> getThread(User user, Long rescueRequestId, String peer);

    /** Hộp thư của {@code user}: mỗi (đơn, đối phương) một dòng, kèm tin mới nhất, mới → cũ. */
    List<ConversationResponse> listConversations(User user);
}
