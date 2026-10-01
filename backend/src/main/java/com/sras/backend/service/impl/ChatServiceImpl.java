package com.sras.backend.service.impl;

import com.sras.backend.dto.request.SendMessageRequest;
import com.sras.backend.dto.response.ChatMessageResponse;
import com.sras.backend.dto.response.ConversationResponse;
import com.sras.backend.entity.ChatMessage;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.ChatMessageRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.service.ChatService;
import com.sras.backend.websocket.ChatWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatServiceImpl implements ChatService {

    private static final String ROLE_CUSTOMER = "CUSTOMER";
    private static final String ROLE_GARAGE = "GARAGE";
    private static final String ROLE_STAFF = "STAFF";

    private final ChatMessageRepository chatMessageRepository;
    private final RescueRequestRepository rescueRequestRepository;
    private final ChatWebSocketHandler chatWebSocketHandler;

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(User sender, Long rescueRequestId, SendMessageRequest req) {
        RescueRequest request = requireRequest(rescueRequestId);

        String senderRole = roleOf(request, sender);
        if (senderRole == null) {
            throw new UnauthorizedException("Bạn không thuộc đơn cứu hộ này");
        }

        String peerRole = normalizeRole(req.getPeer());
        User recipient = resolvePeer(request, peerRole);
        if (recipient.getId().equals(sender.getId())) {
            throw new BadRequestException("Không thể tự gửi tin cho chính mình");
        }

        String content = req.getContent() != null ? req.getContent().trim() : null;
        String imageUrl = req.getImageUrl() != null ? req.getImageUrl().trim() : null;
        if ((content == null || content.isBlank()) && (imageUrl == null || imageUrl.isBlank())) {
            throw new BadRequestException("Tin nhắn trống");
        }

        ChatMessage msg = new ChatMessage();
        msg.setRescueRequest(request);
        msg.setSender(sender);
        msg.setRecipient(recipient);
        msg.setContent(content != null && !content.isBlank() ? content : null);
        msg.setImageUrl(imageUrl != null && !imageUrl.isBlank() ? imageUrl : null);
        ChatMessage saved = chatMessageRepository.save(msg);

        ChatMessageResponse res = toResponse(saved, senderRole, peerRole, sender, recipient);

        // Đẩy realtime tới người nhận + các thiết bị khác của người gửi.
        String payload = "{\"event\":\"CHAT_MESSAGE\",\"message\":" + toJson(res) + "}";
        chatWebSocketHandler.sendToUser(recipient.getId(), payload);
        chatWebSocketHandler.sendToUser(sender.getId(), payload);

        return res;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getThread(User user, Long rescueRequestId, String peer) {
        RescueRequest request = requireRequest(rescueRequestId);

        String myRole = roleOf(request, user);
        if (myRole == null) {
            throw new UnauthorizedException("Bạn không thuộc đơn cứu hộ này");
        }
        String peerRole = normalizeRole(peer);
        User other = resolvePeer(request, peerRole);
        if (other.getId().equals(user.getId())) {
            throw new BadRequestException("Đối phương không hợp lệ");
        }

        return chatMessageRepository.findThread(request.getId(), user.getId(), other.getId())
                .stream()
                .map(m -> {
                    boolean mineIsSender = m.getSender().getId().equals(user.getId());
                    String sRole = mineIsSender ? myRole : peerRole;
                    String rRole = mineIsSender ? peerRole : myRole;
                    return toResponse(m, sRole, rRole, m.getSender(), m.getRecipient());
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> listConversations(User user) {
        List<ChatMessage> all = chatMessageRepository.findAllInvolvingUser(user.getId());

        // Gom theo (đơn, đối phương). Vì repo trả mới → cũ, tin đầu tiên gặp là tin mới nhất.
        Map<String, ConversationResponse> byThread = new LinkedHashMap<>();
        for (ChatMessage m : all) {
            RescueRequest request = m.getRescueRequest();
            if (request == null || Boolean.TRUE.equals(request.getIsDeleted())) continue;

            boolean iAmSender = m.getSender().getId().equals(user.getId());
            User peer = iAmSender ? m.getRecipient() : m.getSender();
            String key = request.getId() + ":" + peer.getId();
            if (byThread.containsKey(key)) continue; // đã có tin mới hơn

            String peerRole = roleOf(request, peer);
            if (peerRole == null) continue; // đối phương không còn thuộc đơn

            byThread.put(key, ConversationResponse.builder()
                    .rescueRequestId(request.getId())
                    .rescueCode(request.getCode())
                    .rescueStatus(request.getStatus() != null ? request.getStatus().name() : null)
                    .peerId(peer.getId())
                    .peerRole(peerRole)
                    .peerName(peer.getFullName())
                    .peerAvatarUrl(peer.getAvatarUrl())
                    .peerPhone(peer.getPhone())
                    .lastContent(m.getContent())
                    .lastImageUrl(m.getImageUrl())
                    .lastAt(m.getCreatedAt())
                    .lastFromMe(iAmSender)
                    .build());
        }

        return new ArrayList<>(byThread.values());
    }

    // ─────────────────────────── Helpers ───────────────────────────

    private RescueRequest requireRequest(Long id) {
        return rescueRequestRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu cứu hộ"));
    }

    /** Role của {@code user} trong đơn: CUSTOMER / GARAGE / STAFF; null nếu không tham gia. */
    private String roleOf(RescueRequest req, User user) {
        if (req.getCustomer() != null && req.getCustomer().getId().equals(user.getId())) {
            return ROLE_CUSTOMER;
        }
        Garage garage = req.getGarage();
        if (garage != null && garage.getOwner() != null && garage.getOwner().getId().equals(user.getId())) {
            return ROLE_GARAGE;
        }
        if (req.getStaff() != null && req.getStaff().getUser() != null
                && req.getStaff().getUser().getId().equals(user.getId())) {
            return ROLE_STAFF;
        }
        return null;
    }

    /** Phân giải User đối phương từ role, kèm kiểm tra đã có mặt trong đơn. */
    private User resolvePeer(RescueRequest req, String peerRole) {
        switch (peerRole) {
            case ROLE_CUSTOMER:
                if (req.getCustomer() == null) throw new BadRequestException("Đơn chưa có khách hàng");
                return req.getCustomer();
            case ROLE_GARAGE:
                if (req.getGarage() == null || req.getGarage().getOwner() == null) {
                    throw new BadRequestException("Đơn chưa được gara nào nhận");
                }
                return req.getGarage().getOwner();
            case ROLE_STAFF:
                if (req.getStaff() == null || req.getStaff().getUser() == null) {
                    throw new BadRequestException("Đơn chưa được gán nhân viên");
                }
                return req.getStaff().getUser();
            default:
                throw new BadRequestException("Người nhận không hợp lệ: " + peerRole);
        }
    }

    private String normalizeRole(String raw) {
        if (raw == null) throw new BadRequestException("Thiếu người nhận");
        return raw.trim().toUpperCase();
    }

    private ChatMessageResponse toResponse(ChatMessage m, String senderRole, String recipientRole,
                                           User sender, User recipient) {
        return ChatMessageResponse.builder()
                .id(m.getId())
                .rescueRequestId(m.getRescueRequest().getId())
                .senderId(sender.getId())
                .senderRole(senderRole)
                .senderName(sender.getFullName())
                .senderAvatarUrl(sender.getAvatarUrl())
                .recipientId(recipient.getId())
                .recipientRole(recipientRole)
                .content(m.getContent())
                .imageUrl(m.getImageUrl())
                .createdAt(m.getCreatedAt())
                .build();
    }

    /** JSON thủ công để tránh nhập nhằng phiên bản Jackson (Spring Boot 4 / Jackson 3). */
    private String toJson(ChatMessageResponse r) {
        StringBuilder sb = new StringBuilder("{");
        sb.append("\"id\":").append(r.getId());
        sb.append(",\"rescueRequestId\":").append(r.getRescueRequestId());
        sb.append(",\"senderId\":").append(r.getSenderId());
        sb.append(",\"senderRole\":").append(jsonStr(r.getSenderRole()));
        sb.append(",\"senderName\":").append(jsonStr(r.getSenderName()));
        sb.append(",\"senderAvatarUrl\":").append(jsonStr(r.getSenderAvatarUrl()));
        sb.append(",\"recipientId\":").append(r.getRecipientId());
        sb.append(",\"recipientRole\":").append(jsonStr(r.getRecipientRole()));
        sb.append(",\"content\":").append(jsonStr(r.getContent()));
        sb.append(",\"imageUrl\":").append(jsonStr(r.getImageUrl()));
        sb.append(",\"createdAt\":").append(jsonStr(r.getCreatedAt() != null ? r.getCreatedAt().toString() : null));
        sb.append("}");
        return sb.toString();
    }

    private String jsonStr(String s) {
        if (s == null) return "null";
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append("\"").toString();
    }
}
