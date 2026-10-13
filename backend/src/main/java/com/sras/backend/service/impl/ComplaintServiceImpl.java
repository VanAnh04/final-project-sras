package com.sras.backend.service.impl;

import com.sras.backend.dto.request.CreateComplaintRequest;
import com.sras.backend.dto.request.ResolveComplaintRequest;
import com.sras.backend.dto.response.ComplaintResponse;
import com.sras.backend.entity.Complaint;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.ComplaintStatus;
import com.sras.backend.entity.enums.ComplaintTargetType;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.repository.ComplaintRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.service.ComplaintService;
import com.sras.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ComplaintServiceImpl implements ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final RescueRequestRepository rescueRequestRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public ComplaintResponse createComplaint(User currentUser, CreateComplaintRequest req) {
        Complaint complaint = new Complaint();
        complaint.setCreatedByUser(currentUser);
        complaint.setTargetType(req.getTargetType());
        complaint.setContent(req.getContent());
        complaint.setAttachmentUrl(req.getAttachmentUrl());
        complaint.setStatus(ComplaintStatus.OPEN);

        if (req.getRequestId() != null) {
            RescueRequest rescueRequest = rescueRequestRepository.findById(req.getRequestId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ: " + req.getRequestId()));

            // 1 đơn cứu hộ chỉ được gửi khiếu nại 1 lần bởi người dùng
            if (complaintRepository.existsByRequestIdAndCreatedByUserId(req.getRequestId(), currentUser.getId())) {
                throw new IllegalArgumentException("Đơn cứu hộ này đã được gửi khiếu nại trước đó. Vui lòng theo dõi tiến trình xử lý tại chi tiết khiếu nại.");
            }

            complaint.setRequest(rescueRequest);
        }

        Complaint saved = complaintRepository.save(complaint);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplaintResponse> getMyComplaints(User currentUser) {
        return complaintRepository.findByCreatedByUserIdOrderByCreatedAtDesc(currentUser.getId()).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplaintResponse> getComplaintsByGarage(Long garageId) {
        return complaintRepository.findByGarageId(garageId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ComplaintResponse> getAdminComplaints(ComplaintStatus status, ComplaintTargetType targetType, Pageable pageable) {
        Page<Complaint> pageResult;
        if (status != null && targetType != null) {
            pageResult = complaintRepository.findByStatusAndTargetTypeOrderByCreatedAtDesc(status, targetType, pageable);
        } else if (status != null) {
            pageResult = complaintRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else if (targetType != null) {
            pageResult = complaintRepository.findByTargetTypeOrderByCreatedAtDesc(targetType, pageable);
        } else {
            pageResult = complaintRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        return pageResult.map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ComplaintResponse getComplaintDetail(Long id) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khiếu nại: " + id));
        return toResponse(complaint);
    }

    @Override
    @Transactional(readOnly = true)
    public ComplaintResponse getComplaintByRequest(Long requestId) {
        return complaintRepository.findFirstByRequestIdOrderByCreatedAtDesc(requestId)
                .map(this::toResponse)
                .orElse(null);
    }


    @Override
    @Transactional
    public ComplaintResponse resolveComplaint(User adminUser, Long id, ResolveComplaintRequest req) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khiếu nại: " + id));

        complaint.setStatus(req.getStatus());
        if (req.getResolution() != null) {
            complaint.setResolution(req.getResolution());
        }
        complaint.setHandledByUser(adminUser);

        Complaint saved = complaintRepository.save(complaint);

        // Gửi notification cho người tạo khiếu nại
        try {
            User creator = saved.getCreatedByUser();
            if (creator != null) {
                String statusText = switch (req.getStatus()) {
                    case IN_REVIEW -> "đang được ban quản trị tiếp nhận và xác minh";
                    case RESOLVED -> "đã được giải quyết hoàn tất";
                    case REJECTED -> "đã bị bác bỏ do không đủ căn cứ";
                    default -> "đã có cập nhật mới";
                };

                String body = "Khiếu nại #" + saved.getId() + " của bạn " + statusText + ".";
                if (req.getResolution() != null && !req.getResolution().isBlank()) {
                    body += " Kết luận: " + req.getResolution();
                }

                notificationService.createNotification(
                        creator,
                        NotificationType.SYSTEM_WARNING,
                        "Cập nhật khiếu nại #" + saved.getId(),
                        body,
                        "COMPLAINT",
                        saved.getId()
                );
            }
        } catch (Exception ex) {
            log.warn("Không gửi được notification xử lý khiếu nại: {}", ex.getMessage());
        }

        return toResponse(saved);
    }

    private ComplaintResponse toResponse(Complaint c) {
        RescueRequest req = c.getRequest();
        Garage garage = req != null ? req.getGarage() : null;
        User creator = c.getCreatedByUser();
        User handler = c.getHandledByUser();

        return ComplaintResponse.builder()
                .id(c.getId())
                .requestId(req != null ? req.getId() : null)
                .requestCode(req != null ? req.getCode() : null)
                .createdByUserId(creator != null ? creator.getId() : null)
                .createdByUserName(creator != null ? creator.getFullName() : null)
                .createdByUserPhone(creator != null ? creator.getPhone() : null)
                .targetType(c.getTargetType())
                .content(c.getContent())
                .attachmentUrl(c.getAttachmentUrl())
                .status(c.getStatus())
                .resolution(c.getResolution())
                .handledByUserId(handler != null ? handler.getId() : null)
                .handledByUserName(handler != null ? handler.getFullName() : null)
                .garageId(garage != null ? garage.getId() : null)
                .garageName(garage != null ? garage.getName() : null)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
