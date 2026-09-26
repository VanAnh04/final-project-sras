package com.sras.backend.service.impl;

import com.sras.backend.dto.response.ChatMessageResponse;
import com.sras.backend.dto.response.ConversationResponse;
import com.sras.backend.dto.response.RescueRequestResponse;
import com.sras.backend.entity.AiConversation;
import com.sras.backend.entity.AiMessage;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.AiRole;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.repository.AiConversationRepository;
import com.sras.backend.repository.AiMessageRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.service.RescueRequestService;
import com.sras.backend.websocket.ChatWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RescueRequestServiceImpl implements RescueRequestService {

    private final RescueRequestRepository rescueRequestRepository;
    private final AiConversationRepository aiConversationRepository;
    private final AiMessageRepository aiMessageRepository;
    private final ChatWebSocketHandler chatWebSocketHandler;

    @Override
    @Transactional(readOnly = true)
    public List<RescueRequestResponse> getMyRescueRequests(User currentUser) {
        List<RescueRequest> requests = rescueRequestRepository.findByCustomerOrderByCreatedAtDesc(currentUser);
        return requests.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RescueRequestResponse> getAssignedRescueRequests(User currentUser) {
        List<RescueRequest> requests = rescueRequestRepository.findByStaffOrOwnerUser(currentUser);
        return requests.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public RescueRequestResponse getRescueRequestById(Long id, User currentUser) {
        RescueRequest request = rescueRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ #" + id));
        return mapToResponse(request);
    }

    @Override
    @Transactional
    public List<ChatMessageResponse> getRescueRequestMessages(Long requestId, User currentUser) {
        RescueRequest request = findTargetRescueRequest(requestId, currentUser);
        if (request == null || request.getAiConversation() == null) {
            return Collections.emptyList();
        }

        AiConversation convo = request.getAiConversation();
        boolean isCustomer = (currentUser.getRole() == UserRole.CUSTOMER);
        if (isCustomer) {
            convo.setCustomerLastReadAt(OffsetDateTime.now());
        } else {
            convo.setStaffLastReadAt(OffsetDateTime.now());
        }
        aiConversationRepository.save(convo);

        try {
            String jsonPayload = String.format(
                "{\"event\":\"CONVERSATION_UPDATED\",\"requestId\":%d,\"conversationId\":%d}",
                request.getId(),
                convo.getId()
            );
            chatWebSocketHandler.broadcastChatMessage(jsonPayload);
        } catch (Exception ignored) {}

        Long convoId = convo.getId();
        List<AiMessage> messages = aiMessageRepository.findByConversationIdOrderByCreatedAtAsc(convoId);

        return messages.stream().map(m -> ChatMessageResponse.builder()
                .id(m.getId())
                .conversationId(convoId)
                .role(m.getRole())
                .content(m.getContent())
                .isMine(isCustomer ? m.getRole() == AiRole.USER : m.getRole() == AiRole.ASSISTANT)
                .createdAt(m.getCreatedAt())
                .build()).collect(Collectors.toList());
    }

    @Override
    public ChatMessageResponse sendRescueRequestMessage(Long requestId, String content, User currentUser) {
        RescueRequest request = findTargetRescueRequest(requestId, currentUser);
        if (request == null) {
            throw new ResourceNotFoundException("Không tìm thấy đơn cứu hộ để gửi tin nhắn");
        }

        AiConversation convo = request.getAiConversation();
        if (convo == null) {
            convo = new AiConversation();
            convo.setCustomer(request.getCustomer());
            convo.setVehicleType(request.getVehicleType());
            convo.setTitle("Trao đổi đơn cứu hộ #" + request.getCode());
            convo.setConvertedToRequest(true);
            convo = aiConversationRepository.save(convo);
            request.setAiConversation(convo);
            rescueRequestRepository.save(request);
        }

        AiRole role = (currentUser.getRole() == UserRole.CUSTOMER) ? AiRole.USER : AiRole.ASSISTANT;

        AiMessage message = new AiMessage();
        message.setConversation(convo);
        message.setRole(role);
        message.setContent(content);
        message.setIsGuardrailBlocked(false);

        AiMessage saved = aiMessageRepository.save(message);

        try {
            String jsonPayload = String.format(
                "{\"event\":\"CHAT_MESSAGE\",\"requestId\":%d,\"conversationId\":%d,\"messageId\":%d,\"senderId\":%d,\"senderRole\":\"%s\",\"content\":\"%s\",\"createdAt\":\"%s\"}",
                request.getId(),
                convo.getId(),
                saved.getId(),
                currentUser.getId(),
                currentUser.getRole().name(),
                saved.getContent() != null ? saved.getContent().replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") : "",
                saved.getCreatedAt() != null ? saved.getCreatedAt().toString() : ""
            );
            chatWebSocketHandler.broadcastChatMessage(jsonPayload);
        } catch (Exception ignored) {}

        return ChatMessageResponse.builder()
                .id(saved.getId())
                .conversationId(convo.getId())
                .role(saved.getRole())
                .content(saved.getContent())
                .isMine(true)
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> getConversations(User currentUser) {
        List<RescueRequest> requests;
        if (currentUser.getRole() == UserRole.CUSTOMER) {
            requests = rescueRequestRepository.findByCustomerOrderByCreatedAtDesc(currentUser);
        } else {
            requests = rescueRequestRepository.findByStaffOrOwnerUser(currentUser);
        }

        List<ConversationResponse> conversations = new ArrayList<>();
        for (RescueRequest req : requests) {
            if (req.getAiConversation() == null) continue;

            Long convoId = req.getAiConversation().getId();
            List<AiMessage> messages = aiMessageRepository.findByConversationIdOrderByCreatedAtAsc(convoId);

            String lastMsg = "Chưa có tin nhắn nào";
            OffsetDateTime lastTime = req.getCreatedAt();
            boolean isUnread = false;
            int unreadCount = 0;

            if (!messages.isEmpty()) {
                boolean isCustomer = (currentUser.getRole() == UserRole.CUSTOMER);
                AiMessage last = messages.get(messages.size() - 1);
                boolean isLastMine = isCustomer ? (last.getRole() == AiRole.USER) : (last.getRole() == AiRole.ASSISTANT);
                lastMsg = (isLastMine ? "Bạn: " : "") + last.getContent();
                lastTime = last.getCreatedAt();
                OffsetDateTime lastReadAt = isCustomer
                        ? req.getAiConversation().getCustomerLastReadAt()
                        : req.getAiConversation().getStaffLastReadAt();

                for (int i = messages.size() - 1; i >= 0; i--) {
                    AiMessage m = messages.get(i);
                    boolean isMine = isCustomer ? (m.getRole() == AiRole.USER) : (m.getRole() == AiRole.ASSISTANT);
                    if (!isMine) {
                        if (lastReadAt == null || (m.getCreatedAt() != null && m.getCreatedAt().isAfter(lastReadAt))) {
                            unreadCount++;
                        }
                    } else {
                        break;
                    }
                }
                isUnread = unreadCount > 0;
            }

            String peerName = "Người dùng";
            String peerPhone = "";
            String peerRole = "";
            String peerAvatar = null;

            if (currentUser.getRole() == UserRole.CUSTOMER) {
                String staffName = (req.getStaff() != null && req.getStaff().getUser() != null)
                        ? req.getStaff().getUser().getFullName()
                        : null;
                String garageName = (req.getGarage() != null) ? req.getGarage().getName() : null;

                if (staffName != null && garageName != null) {
                    peerName = staffName + " - " + garageName;
                } else if (garageName != null) {
                    peerName = garageName;
                } else if (staffName != null) {
                    peerName = staffName;
                }

                if (req.getStaff() != null && req.getStaff().getUser() != null) {
                    peerAvatar = req.getStaff().getUser().getAvatarUrl();
                    peerPhone = req.getStaff().getUser().getPhone();
                } else if (req.getGarage() != null && req.getGarage().getOwner() != null) {
                    peerAvatar = req.getGarage().getOwner().getAvatarUrl();
                    peerPhone = req.getGarage().getPhone();
                }
                peerRole = "Thợ cứu hộ";
            } else {
                if (req.getCustomer() != null) {
                    peerName = req.getCustomer().getFullName();
                    peerPhone = req.getCustomer().getPhone();
                    peerAvatar = req.getCustomer().getAvatarUrl();
                    peerRole = "Khách hàng";
                }
            }

            conversations.add(ConversationResponse.builder()
                    .id(convoId)
                    .requestId(req.getId())
                    .requestCode(req.getCode())
                    .peerName(peerName)
                    .peerPhone(peerPhone)
                    .peerRole(peerRole)
                    .peerAvatar(peerAvatar)
                    .lastMessage(lastMsg)
                    .lastMessageTime(lastTime)
                    .isUnread(isUnread)
                    .unreadCount(unreadCount)
                    .status(req.getStatus() != null ? req.getStatus().name() : "PENDING")
                    .vehicleInfo((req.getVehicleType() != null ? req.getVehicleType().name() : "") + " • " + (req.getSymptom() != null ? req.getSymptom() : ""))
                    .build());
        }

        return conversations;
    }

    private RescueRequest findTargetRescueRequest(Long requestId, User currentUser) {
        if (requestId != null && requestId > 0) {
            return rescueRequestRepository.findById(requestId).orElse(null);
        }
        if (currentUser.getRole() == UserRole.CUSTOMER) {
            List<RescueRequest> mine = rescueRequestRepository.findByCustomerOrderByCreatedAtDesc(currentUser);
            return mine.isEmpty() ? null : mine.get(0);
        } else {
            List<RescueRequest> assigned = rescueRequestRepository.findByStaffOrOwnerUser(currentUser);
            return assigned.isEmpty() ? null : assigned.get(0);
        }
    }

    private RescueRequestResponse mapToResponse(RescueRequest req) {
        RescueRequestResponse.CustomerInfoDto customerDto = null;
        if (req.getCustomer() != null) {
            customerDto = RescueRequestResponse.CustomerInfoDto.builder()
                    .id(req.getCustomer().getId())
                    .name(req.getCustomer().getFullName())
                    .phone(req.getCustomer().getPhone())
                    .avatarUrl(req.getCustomer().getAvatarUrl())
                    .build();
        }

        RescueRequestResponse.GarageInfoDto garageDto = null;
        if (req.getGarage() != null) {
            String gAvatar = req.getGarage().getOwner() != null ? req.getGarage().getOwner().getAvatarUrl() : null;
            garageDto = RescueRequestResponse.GarageInfoDto.builder()
                    .id(req.getGarage().getId())
                    .name(req.getGarage().getName())
                    .phone(req.getGarage().getPhone())
                    .address(req.getGarage().getAddress())
                    .avgRating(req.getGarage().getAvgRating())
                    .lat(req.getGarage().getLat())
                    .lng(req.getGarage().getLng())
                    .avatarUrl(gAvatar)
                    .build();
        }

        RescueRequestResponse.StaffInfoDto staffDto = null;
        if (req.getStaff() != null && req.getStaff().getUser() != null) {
            staffDto = RescueRequestResponse.StaffInfoDto.builder()
                    .id(req.getStaff().getId())
                    .name(req.getStaff().getUser().getFullName())
                    .phone(req.getStaff().getUser().getPhone())
                    .avatarUrl(req.getStaff().getUser().getAvatarUrl())
                    .build();
        }

        RescueRequestResponse.RescueVehicleInfoDto vehicleDto = null;
        if (req.getRescueVehicle() != null) {
            vehicleDto = RescueRequestResponse.RescueVehicleInfoDto.builder()
                    .id(req.getRescueVehicle().getId())
                    .licensePlate(req.getRescueVehicle().getLicensePlate())
                    .vehicleKind(req.getRescueVehicle().getVehicleKind() != null ? req.getRescueVehicle().getVehicleKind().name() : null)
                    .build();
        }

        return RescueRequestResponse.builder()
                .id(req.getId())
                .code(req.getCode())
                .status(req.getStatus())
                .vehicleType(req.getVehicleType())
                .symptom(req.getSymptom())
                .pickupLat(req.getPickupLat())
                .pickupLng(req.getPickupLng())
                .pickupAddress(req.getPickupAddress())
                .locationNote(req.getLocationNote())
                .rescueFee(req.getRescueFee())
                .totalAmount(req.getTotalAmount())
                .dispatchDistanceKm(req.getDispatchDistanceKm())
                .customer(customerDto)
                .garage(garageDto)
                .staff(staffDto)
                .rescueVehicle(vehicleDto)
                .createdAt(req.getCreatedAt())
                .enRouteAt(req.getEnRouteAt())
                .arrivedAt(req.getArrivedAt())
                .completedAt(req.getCompletedAt())
                .build();
    }
}
