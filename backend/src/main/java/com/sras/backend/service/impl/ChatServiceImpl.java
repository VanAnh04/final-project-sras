package com.sras.backend.service.impl;

import com.sras.backend.dto.request.SendMessageRequest;
import com.sras.backend.dto.response.ChatMessageResponse;
import com.sras.backend.dto.response.ConversationResponse;
import com.sras.backend.entity.ChatMessage;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.dto.response.ChatContactResponse;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.WorkStatus;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.ChatMessageRepository;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.GarageStaffRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.service.ChatService;
import com.sras.backend.service.push.PushService;
import com.sras.backend.websocket.ChatWebSocketHandler;
import com.sras.backend.websocket.WsJson;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatServiceImpl implements ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final RescueRequestRepository rescueRequestRepository;
    private final GarageRepository garageRepository;
    private final GarageStaffRepository garageStaffRepository;
    private final RescueParticipants participants;
    private final ChatWebSocketHandler chatWebSocketHandler;
    private final PushService pushService;

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(User sender, Long rescueRequestId, SendMessageRequest req) {
        RescueRequest request = requireRequest(rescueRequestId);

        String senderRole = participants.roleOf(request, sender);
        if (senderRole == null) {
            throw new UnauthorizedException("Bạn không thuộc đơn cứu hộ này");
        }

        String peerRole = participants.normalizeRole(req.getPeer());
        User recipient = participants.resolvePeer(request, peerRole);
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

        // Người nhận không mở app (không có kết nối WS) → báo bằng push. Không lưu vào notifications.
        if (!chatWebSocketHandler.isOnline(recipient.getId())) {
            pushChatMessage(request, sender, senderRole, recipient, res);
        }

        return res;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getThread(User user, Long rescueRequestId, String peer) {
        RescueRequest request = requireRequest(rescueRequestId);

        String myRole = participants.roleOf(request, user);
        if (myRole == null) {
            throw new UnauthorizedException("Bạn không thuộc đơn cứu hộ này");
        }
        String peerRole = participants.normalizeRole(peer);
        User other = participants.resolvePeer(request, peerRole);
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
            String key = String.valueOf(peer.getId());
            if (byThread.containsKey(key)) continue; // đã có tin mới hơn của người này

            String peerRole = participants.roleOf(request, peer);
            if (peerRole == null) continue; // đối phương không còn thuộc đơn

            Map<String, Object> onlineInfo = resolveOnlineStatus(peer, peerRole);
            boolean isOnline = Boolean.TRUE.equals(onlineInfo.get("isOnline"));
            String statusText = (String) onlineInfo.get("statusText");

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
                    .isOnline(isOnline)
                    .onlineStatusText(statusText)
                    .build());
        }

        return new ArrayList<>(byThread.values());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatContactResponse> getSuggestedContacts(User user) {
        Map<Long, ChatContactResponse> map = new LinkedHashMap<>();

        // 1. Phía CHỦ GARA: Gợi ý toàn bộ nhân viên trong gara & khách hàng đơn gần đây
        if (user.getRole() == UserRole.GARAGE_OWNER) {
            garageRepository.findByOwner(user).ifPresent(garage -> {
                List<GarageStaff> staffList = garageStaffRepository.findByGarageAndIsDeletedFalseOrderByCreatedAtDesc(garage);
                List<RescueRequest> reqList = rescueRequestRepository.findByGarageAndIsDeletedFalseOrderByCreatedAtDesc(garage);
                Long defaultGarageReqId = !reqList.isEmpty() ? reqList.get(0).getId() : null;
                String defaultGarageCode = !reqList.isEmpty() ? reqList.get(0).getCode() : null;

                for (GarageStaff s : staffList) {
                    if (s.getUser() == null || s.getUser().getId().equals(user.getId())) continue;
                    boolean isOnline = Boolean.TRUE.equals(s.getIsActive());
                    String statusText = s.getStatus() == WorkStatus.BUSY ? "Đang bận cứu hộ" : (isOnline ? "Đang hoạt động" : "Ngoại tuyến");
                    
                    List<RescueRequest> jobs = rescueRequestRepository.findByStaffAndIsDeletedFalseOrderByCreatedAtDesc(s);
                    Long reqId = !jobs.isEmpty() ? jobs.get(0).getId() : defaultGarageReqId;
                    String code = !jobs.isEmpty() ? jobs.get(0).getCode() : defaultGarageCode;

                    map.put(s.getUser().getId(), ChatContactResponse.builder()
                            .userId(s.getUser().getId())
                            .name(s.getUser().getFullName())
                            .phone(s.getUser().getPhone())
                            .avatarUrl(s.getUser().getAvatarUrl())
                            .role(RescueParticipants.STAFF)
                            .roleLabel("Nhân viên cứu hộ")
                            .garageName(garage.getName())
                            .isOnline(isOnline)
                            .onlineStatusText(statusText)
                            .rescueRequestId(reqId)
                            .rescueCode(code)
                            .build());
                }

                for (RescueRequest r : reqList) {
                    if (r.getCustomer() != null && !map.containsKey(r.getCustomer().getId())) {
                        User c = r.getCustomer();
                        boolean isOnline = !isTerminalStatus(r.getStatus());
                        map.put(c.getId(), ChatContactResponse.builder()
                                .userId(c.getId())
                                .name(c.getFullName())
                                .phone(c.getPhone())
                                .avatarUrl(c.getAvatarUrl())
                                .role(RescueParticipants.CUSTOMER)
                                .roleLabel("Khách hàng")
                                .garageName(garage.getName())
                                .isOnline(isOnline)
                                .onlineStatusText(isOnline ? "Đang theo dõi đơn" : "Khách hàng cũ")
                                .rescueRequestId(r.getId())
                                .rescueCode(r.getCode())
                                .build());
                    }
                }
            });
        }
        // 2. Phía NHÂN VIÊN GARA: Gợi ý Chủ gara, đồng nghiệp & khách hàng
        else if (user.getRole() == UserRole.GARAGE_STAFF) {
            garageStaffRepository.findByUserAndIsDeletedFalse(user).ifPresent(staff -> {
                Garage garage = staff.getGarage();
                if (garage != null && garage.getOwner() != null) {
                    User owner = garage.getOwner();
                    boolean gOnline = Boolean.TRUE.equals(garage.getIsOnline()) && garage.getStatus() == GarageStatus.APPROVED;
                    List<RescueRequest> jobs = rescueRequestRepository.findByStaffAndIsDeletedFalseOrderByCreatedAtDesc(staff);
                    List<RescueRequest> garageRequests = rescueRequestRepository.findByGarageAndIsDeletedFalseOrderByCreatedAtDesc(garage);
                    Long reqId = !jobs.isEmpty() ? jobs.get(0).getId() : (!garageRequests.isEmpty() ? garageRequests.get(0).getId() : null);
                    String code = !jobs.isEmpty() ? jobs.get(0).getCode() : (!garageRequests.isEmpty() ? garageRequests.get(0).getCode() : null);

                    map.put(owner.getId(), ChatContactResponse.builder()
                            .userId(owner.getId())
                            .name(owner.getFullName())
                            .phone(owner.getPhone())
                            .avatarUrl(owner.getAvatarUrl())
                            .role(RescueParticipants.GARAGE)
                            .roleLabel("Chủ gara (" + garage.getName() + ")")
                            .garageName(garage.getName())
                            .isOnline(gOnline)
                            .onlineStatusText(gOnline ? "Đang hoạt động" : "Ngoại tuyến")
                            .rescueRequestId(reqId)
                            .rescueCode(code)
                            .build());
                }

                if (garage != null) {
                    List<GarageStaff> staffList = garageStaffRepository.findByGarageAndIsDeletedFalseOrderByCreatedAtDesc(garage);
                    for (GarageStaff s : staffList) {
                        if (s.getUser() == null || s.getUser().getId().equals(user.getId()) || map.containsKey(s.getUser().getId())) continue;
                        boolean isOnline = Boolean.TRUE.equals(s.getIsActive());
                        String statusText = s.getStatus() == WorkStatus.BUSY ? "Đang bận cứu hộ" : (isOnline ? "Đang hoạt động" : "Ngoại tuyến");
                        map.put(s.getUser().getId(), ChatContactResponse.builder()
                                .userId(s.getUser().getId())
                                .name(s.getUser().getFullName())
                                .phone(s.getUser().getPhone())
                                .avatarUrl(s.getUser().getAvatarUrl())
                                .role(RescueParticipants.STAFF)
                                .roleLabel("Đồng nghiệp")
                                .garageName(garage.getName())
                                .isOnline(isOnline)
                                .onlineStatusText(statusText)
                                .build());
                    }
                }

                List<RescueRequest> jobs = rescueRequestRepository.findByStaffAndIsDeletedFalseOrderByCreatedAtDesc(staff);
                for (RescueRequest r : jobs) {
                    if (r.getCustomer() != null && !map.containsKey(r.getCustomer().getId())) {
                        User c = r.getCustomer();
                        boolean isOnline = !isTerminalStatus(r.getStatus());
                        map.put(c.getId(), ChatContactResponse.builder()
                                .userId(c.getId())
                                .name(c.getFullName())
                                .phone(c.getPhone())
                                .avatarUrl(c.getAvatarUrl())
                                .role(RescueParticipants.CUSTOMER)
                                .roleLabel("Khách hàng")
                                .isOnline(isOnline)
                                .onlineStatusText(isOnline ? "Đang theo dõi đơn" : "Khách hàng cũ")
                                .rescueRequestId(r.getId())
                                .rescueCode(r.getCode())
                                .build());
                    }
                }
            });
        }
        // 3. Phía KHÁCH HÀNG: Gợi ý Chủ gara, nhân viên các đơn cứu hộ & Gara online uy tín
        else {
            List<RescueRequest> reqList = rescueRequestRepository.findByCustomerAndIsDeletedFalseOrderByCreatedAtDesc(user);
            for (RescueRequest r : reqList) {
                if (r.getGarage() != null && r.getGarage().getOwner() != null && !map.containsKey(r.getGarage().getOwner().getId())) {
                    User owner = r.getGarage().getOwner();
                    boolean gOnline = Boolean.TRUE.equals(r.getGarage().getIsOnline()) && r.getGarage().getStatus() == GarageStatus.APPROVED;
                    map.put(owner.getId(), ChatContactResponse.builder()
                            .userId(owner.getId())
                            .name(owner.getFullName())
                            .phone(owner.getPhone())
                            .avatarUrl(owner.getAvatarUrl())
                            .role(RescueParticipants.GARAGE)
                            .roleLabel("Chủ gara (" + r.getGarage().getName() + ")")
                            .garageName(r.getGarage().getName())
                            .isOnline(gOnline)
                            .onlineStatusText(gOnline ? "Đang hoạt động" : "Ngoại tuyến")
                            .rescueRequestId(r.getId())
                            .rescueCode(r.getCode())
                            .build());
                }
                if (r.getStaff() != null && r.getStaff().getUser() != null && !map.containsKey(r.getStaff().getUser().getId())) {
                    User sUser = r.getStaff().getUser();
                    boolean sOnline = Boolean.TRUE.equals(r.getStaff().getIsActive());
                    String statusText = r.getStaff().getStatus() == WorkStatus.BUSY ? "Đang hỗ trợ bạn" : (sOnline ? "Đang hoạt động" : "Ngoại tuyến");
                    map.put(sUser.getId(), ChatContactResponse.builder()
                            .userId(sUser.getId())
                            .name(sUser.getFullName())
                            .phone(sUser.getPhone())
                            .avatarUrl(sUser.getAvatarUrl())
                            .role(RescueParticipants.STAFF)
                            .roleLabel("Thợ cứu hộ")
                            .garageName(r.getGarage() != null ? r.getGarage().getName() : null)
                            .isOnline(sOnline)
                            .onlineStatusText(statusText)
                            .rescueRequestId(r.getId())
                            .rescueCode(r.getCode())
                            .build());
                }
            }
        }

        return new ArrayList<>(map.values());
    }

    private boolean isTerminalStatus(com.sras.backend.entity.enums.RescueStatus s) {
        if (s == null) return true;
        return s == com.sras.backend.entity.enums.RescueStatus.PAID
                || s == com.sras.backend.entity.enums.RescueStatus.RATED
                || s == com.sras.backend.entity.enums.RescueStatus.CANCELLED
                || s == com.sras.backend.entity.enums.RescueStatus.DECLINED;
    }

    private Map<String, Object> resolveOnlineStatus(User peer, String peerRole) {
        boolean isOnline = false;
        String statusText = "Ngoại tuyến";

        if (RescueParticipants.GARAGE.equalsIgnoreCase(peerRole)) {
            Optional<Garage> gOpt = garageRepository.findByOwner(peer);
            if (gOpt.isPresent()) {
                Garage g = gOpt.get();
                isOnline = Boolean.TRUE.equals(g.getIsOnline()) && g.getStatus() == GarageStatus.APPROVED;
                statusText = isOnline ? "Đang hoạt động" : "Ngoại tuyến";
            }
        } else if (RescueParticipants.STAFF.equalsIgnoreCase(peerRole)) {
            Optional<GarageStaff> sOpt = garageStaffRepository.findByUserAndIsDeletedFalse(peer);
            if (sOpt.isPresent()) {
                GarageStaff s = sOpt.get();
                isOnline = Boolean.TRUE.equals(s.getIsActive());
                if (s.getStatus() == WorkStatus.BUSY) {
                    statusText = "Đang bận cứu hộ";
                } else {
                    statusText = isOnline ? "Đang hoạt động" : "Ngoại tuyến";
                }
            }
        } else {
            boolean hasActiveJob = rescueRequestRepository.findByCustomerAndIsDeletedFalseOrderByCreatedAtDesc(peer)
                    .stream()
                    .anyMatch(r -> !isTerminalStatus(r.getStatus()));
            isOnline = hasActiveJob;
            statusText = isOnline ? "Đang hoạt động" : "Ngoại tuyến";
        }

        Map<String, Object> res = new HashMap<>();
        res.put("isOnline", isOnline);
        res.put("statusText", statusText);
        return res;
    }

    // ─────────────────────────── Helpers ───────────────────────────

    private void pushChatMessage(RescueRequest request, User sender, String senderRole, User recipient,
                                 ChatMessageResponse msg) {
        String preview = msg.getContent() != null ? msg.getContent() : "[Hình ảnh]";
        if (preview.length() > 100) preview = preview.substring(0, 100) + "…";
        String senderName = sender.getFullName() != null ? sender.getFullName() : "Tin nhắn mới";

        // Đủ tham số để app mở thẳng màn chat (/chat) với đúng đối phương.
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("type", "CHAT_MESSAGE");
        data.put("rescueRequestId", request.getId());
        data.put("peer", senderRole);
        data.put("peerName", senderName);
        if (sender.getPhone() != null) data.put("peerPhone", sender.getPhone());
        if (sender.getAvatarUrl() != null) data.put("peerAvatar", sender.getAvatarUrl());
        pushService.sendAfterCommit(recipient.getId(), null, senderName, preview, data);
    }

    private RescueRequest requireRequest(Long id) {
        return rescueRequestRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu cứu hộ"));
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
        sb.append(",\"senderRole\":").append(WsJson.str(r.getSenderRole()));
        sb.append(",\"senderName\":").append(WsJson.str(r.getSenderName()));
        sb.append(",\"senderAvatarUrl\":").append(WsJson.str(r.getSenderAvatarUrl()));
        sb.append(",\"recipientId\":").append(r.getRecipientId());
        sb.append(",\"recipientRole\":").append(WsJson.str(r.getRecipientRole()));
        sb.append(",\"content\":").append(WsJson.str(r.getContent()));
        sb.append(",\"imageUrl\":").append(WsJson.str(r.getImageUrl()));
        sb.append(",\"createdAt\":").append(WsJson.str(r.getCreatedAt() != null ? r.getCreatedAt().toString() : null));
        sb.append("}");
        return sb.toString();
    }
}
