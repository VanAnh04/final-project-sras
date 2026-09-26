package com.sras.backend.service;

import com.sras.backend.dto.response.ChatMessageResponse;
import com.sras.backend.dto.response.ConversationResponse;
import com.sras.backend.dto.response.RescueRequestResponse;
import com.sras.backend.entity.User;

import java.util.List;

public interface RescueRequestService {

    List<RescueRequestResponse> getMyRescueRequests(User currentUser);

    List<RescueRequestResponse> getAssignedRescueRequests(User currentUser);

    RescueRequestResponse getRescueRequestById(Long id, User currentUser);

    List<ChatMessageResponse> getRescueRequestMessages(Long requestId, User currentUser);

    ChatMessageResponse sendRescueRequestMessage(Long requestId, String content, User currentUser);

    List<ConversationResponse> getConversations(User currentUser);
}
