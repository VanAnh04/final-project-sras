package com.sras.backend.service.impl;

import com.sras.backend.dto.request.CreateComplaintRequest;
import com.sras.backend.dto.request.ResolveComplaintRequest;
import com.sras.backend.dto.response.ComplaintResponse;
import com.sras.backend.entity.Complaint;
import com.sras.backend.entity.CustomerVehicle;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.RescueVehicle;
import com.sras.backend.entity.User;
import com.sras.backend.entity.WalletTransaction;
import com.sras.backend.entity.enums.ComplaintStatus;
import com.sras.backend.entity.enums.ComplaintTargetType;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.entity.enums.WalletTxnType;
import com.sras.backend.entity.enums.WalletType;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.repository.ComplaintRepository;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.repository.WalletTransactionRepository;
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
    private final GarageRepository garageRepository;
    private final WalletTransactionRepository walletTransactionRepository;
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
        return complaintRepository.findByCreatedByUserIdEager(currentUser.getId()).stream()
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
        if (requestId == null) return null;
        List<Complaint> list = complaintRepository.findByRequestIdEager(requestId);
        return list.isEmpty() ? null : toResponse(list.get(0));
    }


    @Override
    @Transactional
    public ComplaintResponse resolveComplaint(User adminUser, Long id, ResolveComplaintRequest req) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khiếu nại: " + id));

        // Chỉ cho phép cập nhật khi khiếu nại chưa ở trạng thái RESOLVED. Khi đã giải quyết xong thì khoá, không cho lưu lại tránh hoàn tiền nhiều lần
        if (complaint.getStatus() == ComplaintStatus.RESOLVED) {
            throw new BadRequestException("Khiếu nại này đã được giải quyết hoàn tất trước đó, không thể thao tác lại.");
        }

        complaint.setStatus(req.getStatus());
        if (req.getResolution() != null) {
            complaint.setResolution(req.getResolution());
        }
        complaint.setHandledByUser(adminUser);

        Complaint saved = complaintRepository.save(complaint);

        // Chỉ xử lý bồi hoàn xăng xe nếu đây là khiếu nại BÁO BOM ĐƠN từ phía Gara / Thợ
        boolean isBomDonComplaint = complaint.getTargetType() == ComplaintTargetType.CUSTOMER
                && (complaint.getSuggestedCompensationAmount() != null || (complaint.getRequest() != null && complaint.getRequest().getBomReportedAt() != null));

        if (req.getStatus() == ComplaintStatus.RESOLVED) {
            if (isBomDonComplaint) {
                // Kiểm tra xem đơn cứu hộ đã từng được bồi hoàn trước đó chưa
                if (complaint.getRequest() != null && "APPROVED".equals(complaint.getRequest().getGasCompensationStatus())) {
                    throw new BadRequestException("Cuốc cứu hộ này đã được phê duyệt bồi hoàn xăng xe trước đó, không thể hoàn lần 2.");
                }

                Long compAmount = req.getApprovedCompensationAmount() != null && req.getApprovedCompensationAmount() > 0
                        ? req.getApprovedCompensationAmount()
                        : complaint.getSuggestedCompensationAmount();

                if (compAmount != null && compAmount > 0 && complaint.getRequest() != null && complaint.getRequest().getGarage() != null) {
                    RescueRequest rescueReq = complaint.getRequest();
                    Garage g = rescueReq.getGarage();
                    long currentCash = g.getCashBalance() != null ? g.getCashBalance() : 0L;
                    long newCash = currentCash + compAmount;
                    g.setCashBalance(newCash);
                    garageRepository.save(g);

                    WalletTransaction wt = new WalletTransaction();
                    wt.setGarage(g);
                    wt.setWalletType(WalletType.CASH);
                    wt.setType(WalletTxnType.COMPENSATION);
                    wt.setAmount(compAmount);
                    wt.setBalanceAfter(newCash);
                    wt.setRefType("RESCUE_REQUEST");
                    wt.setRefId(rescueReq.getId());
                    wt.setDescription("Bồi hoàn xăng xe do khách bom đơn #" + rescueReq.getCode() + " (Ban quản trị duyệt)");
                    wt.setCreatedByUser(adminUser);
                    walletTransactionRepository.save(wt);

                    rescueReq.setGasCompensationAmount(compAmount);
                    rescueReq.setGasCompensationStatus("APPROVED");
                    rescueRequestRepository.save(rescueReq);

                    complaint.setApprovedCompensationAmount(compAmount);
                    complaintRepository.save(complaint);

                    // Gửi thông báo cho Chủ Gara (refType RESCUE_REQUEST để click vào mở thẳng chi tiết đơn)
                    if (g.getOwner() != null) {
                        notificationService.createNotification(
                                g.getOwner(),
                                NotificationType.PAYMENT_RECEIVED,
                                "Bồi hoàn xăng xe đơn #" + rescueReq.getCode(),
                                "Ban quản trị đã phê duyệt bồi hoàn " + String.format("%,d", compAmount) + "đ tiền xăng xe cuốc cứu hộ #" + rescueReq.getCode() + " vào ví tiền mặt.",
                                "RESCUE_REQUEST",
                                rescueReq.getId()
                        );
                    }
                }
            }
        } else if (req.getStatus() == ComplaintStatus.REJECTED) {
            if (isBomDonComplaint && complaint.getRequest() != null) {
                RescueRequest rescueReq = complaint.getRequest();
                rescueReq.setGasCompensationStatus("REJECTED");
                rescueRequestRepository.save(rescueReq);
                Garage g = rescueReq.getGarage();
                if (g != null && g.getOwner() != null) {
                    notificationService.createNotification(
                            g.getOwner(),
                            NotificationType.SYSTEM_WARNING,
                            "Từ chối bồi hoàn đơn #" + rescueReq.getCode(),
                            "Yêu cầu bồi hoàn xăng xe cuốc #" + rescueReq.getCode() + " không được phê duyệt. Lý do: " + (req.getResolution() != null ? req.getResolution() : "Không đủ căn cứ."),
                            "RESCUE_REQUEST",
                            rescueReq.getId()
                    );
                }
            }
        }

        // Gửi notification cho người tạo khiếu nại (nếu gắn với đơn cứu hộ thì refType là RESCUE_REQUEST)
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

                String refType = saved.getRequest() != null ? "RESCUE_REQUEST" : "COMPLAINT";
                Long refId = saved.getRequest() != null ? saved.getRequest().getId() : saved.getId();

                notificationService.createNotification(
                        creator,
                        NotificationType.SYSTEM_WARNING,
                        "Cập nhật khiếu nại #" + saved.getId(),
                        body,
                        refType,
                        refId
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

        User customer = req != null ? req.getCustomer() : null;
        GarageStaff staff = req != null ? req.getStaff() : null;
        User staffUser = staff != null ? staff.getUser() : null;
        RescueVehicle vehicle = req != null ? req.getRescueVehicle() : null;
        CustomerVehicle custVehicle = req != null ? req.getCustomerVehicle() : null;
        User garageOwner = garage != null ? garage.getOwner() : null;

        String vehicleModel = custVehicle != null
                ? ((custVehicle.getBrand() != null ? custVehicle.getBrand() : "") + " " + (custVehicle.getModel() != null ? custVehicle.getModel() : "")).trim()
                : null;

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
                .customerCounterExplanation(c.getCustomerCounterExplanation())
                .customerCounterAttachmentUrl(c.getCustomerCounterAttachmentUrl())
                .customerCounteredAt(c.getCustomerCounteredAt())
                .suggestedCompensationAmount(c.getSuggestedCompensationAmount())
                .approvedCompensationAmount(c.getApprovedCompensationAmount())
                .arrivedAt(req != null ? req.getArrivedAt() : null)
                .bomReportedAt(req != null ? req.getBomReportedAt() : null)
                .bomWaitingMinutes(req != null ? req.getBomWaitingMinutes() : null)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                // === Thông tin mở rộng phục vụ đối soát, giám sát và bản đồ ===
                .customerName(customer != null ? customer.getFullName() : null)
                .customerPhone(req != null && req.getContactPhone() != null ? req.getContactPhone() : (customer != null ? customer.getPhone() : null))
                .garagePhone(garage != null ? garage.getPhone() : null)
                .garageAddress(garage != null ? garage.getAddress() : null)
                .garageOwnerName(garageOwner != null ? garageOwner.getFullName() : null)
                .garageOwnerPhone(garageOwner != null ? garageOwner.getPhone() : null)
                .garageLat(garage != null ? garage.getLat() : null)
                .garageLng(garage != null ? garage.getLng() : null)
                .staffId(staff != null ? staff.getId() : null)
                .staffName(staffUser != null ? staffUser.getFullName() : null)
                .staffPhone(staffUser != null ? staffUser.getPhone() : null)
                .rescueVehiclePlate(vehicle != null ? vehicle.getLicensePlate() : null)
                .orderStatus(req != null && req.getStatus() != null ? req.getStatus().name() : null)
                .orderTotalAmount(req != null ? req.getTotalAmount() : null)
                .orderRescueFee(req != null ? req.getRescueFee() : null)
                .orderTowingFee(req != null ? req.getTowingFee() : null)
                .vehicleType(req != null && req.getVehicleType() != null ? req.getVehicleType().name() : null)
                .customerVehiclePlate(custVehicle != null ? custVehicle.getLicensePlate() : null)
                .customerVehicleModel(vehicleModel != null && !vehicleModel.isEmpty() ? vehicleModel : null)
                .symptom(req != null ? req.getSymptom() : null)
                .pickupAddress(req != null ? req.getPickupAddress() : null)
                .pickupLat(req != null ? req.getPickupLat() : null)
                .pickupLng(req != null ? req.getPickupLng() : null)
                .enRouteAt(req != null ? req.getEnRouteAt() : null)
                .enRouteLat(req != null ? req.getEnRouteLat() : null)
                .enRouteLng(req != null ? req.getEnRouteLng() : null)
                .rescuerLat(req != null ? req.getRescuerLat() : null)
                .rescuerLng(req != null ? req.getRescuerLng() : null)
                .completedAt(req != null ? req.getCompletedAt() : null)
                .cancelReason(req != null ? req.getCancelReason() : null)
                .cancelledBy(req != null && req.getCancelledBy() != null ? req.getCancelledBy().name() : null)
                .build();
    }
}
