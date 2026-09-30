package com.sras.backend.service.impl;

import com.sras.backend.dto.request.GarageRegistrationRequest;
import com.sras.backend.dto.request.GarageReviewRequest;
import com.sras.backend.dto.response.GarageDashboardResponse;
import com.sras.backend.dto.response.GarageDocumentResponse;
import com.sras.backend.dto.response.GarageResponse;
import com.sras.backend.entity.DispatchOffer;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageDocument;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.Capability;
import com.sras.backend.entity.enums.GarageDocType;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.entity.enums.OfferStatus;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.VehicleType;
import com.sras.backend.entity.enums.WorkStatus;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.repository.DispatchOfferRepository;
import com.sras.backend.repository.GarageDocumentRepository;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.GarageStaffRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.GarageService;
import com.sras.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class GarageServiceImpl implements GarageService {

    private final GarageRepository garageRepository;
    private final GarageDocumentRepository garageDocumentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final GarageStaffRepository garageStaffRepository;
    private final RescueRequestRepository rescueRequestRepository;
    private final DispatchOfferRepository dispatchOfferRepository;

    @Override
    @Transactional
    public GarageResponse registerGarage(User user, GarageRegistrationRequest request) {
        Garage garage = garageRepository.findByOwner(user).orElse(null);

        if (garage != null) {
            if (garage.getStatus() == GarageStatus.PENDING) {
                throw new BadRequestException("Hồ sơ đăng ký của bạn đang chờ xét duyệt!");
            }
            if (garage.getStatus() == GarageStatus.APPROVED) {
                throw new BadRequestException("Bạn đã sở hữu một Gara đang hoạt động trên hệ thống!");
            }
            log.info("User {} re-applying for garage registration", user.getPhone());
        } else {
            garage = new Garage();
            garage.setOwner(user);
        }

        garage.setName(request.getName().trim());
        garage.setPhone(request.getPhone().trim());
        garage.setAddress(request.getAddress().trim());
        garage.setLat(request.getLat() != null ? request.getLat() : 10.7769);
        garage.setLng(request.getLng() != null ? request.getLng() : 106.7009);
        garage.setCapability(request.getCapability() != null ? request.getCapability() : Capability.BOTH);
        garage.setStatus(GarageStatus.PENDING);
        garage.setIsOnline(false);
        if (garage.getCommissionRate() == null) {
            garage.setCommissionRate(BigDecimal.valueOf(15.0));
        }

        Garage savedGarage = garageRepository.save(garage);

        List<GarageDocument> oldDocs = garageDocumentRepository.findByGarage(savedGarage);
        if (!oldDocs.isEmpty()) {
            garageDocumentRepository.deleteAll(oldDocs);
        }

        List<GarageDocument> docs = new ArrayList<>();
        if (request.getIdCardFrontUrl() != null && !request.getIdCardFrontUrl().isBlank()) {
            docs.add(createDoc(savedGarage, GarageDocType.OWNER_ID_CARD_FRONT, request.getIdCardFrontUrl(), "CCCD Mặt trước"));
        }
        if (request.getIdCardBackUrl() != null && !request.getIdCardBackUrl().isBlank()) {
            docs.add(createDoc(savedGarage, GarageDocType.OWNER_ID_CARD_BACK, request.getIdCardBackUrl(), "CCCD Mặt sau"));
        }
        if (request.getBusinessLicenseUrl() != null && !request.getBusinessLicenseUrl().isBlank()) {
            docs.add(createDoc(savedGarage, GarageDocType.BUSINESS_LICENSE, request.getBusinessLicenseUrl(), "Giấy phép ĐKKD"));
        }
        if (request.getFacadePhotoUrl() != null && !request.getFacadePhotoUrl().isBlank()) {
            docs.add(createDoc(savedGarage, GarageDocType.GARAGE_PHOTO, request.getFacadePhotoUrl(), "Ảnh mặt tiền gara"));
        }
        garageDocumentRepository.saveAll(docs);

        notificationService.createNotification(
                user,
                NotificationType.GARAGE_REVIEWED,
                "Hồ sơ đăng ký Gara đã được gửi",
                "Hồ sơ đăng ký Gara '" + savedGarage.getName() + "' của bạn đã được gửi thành công. Ban quản trị sẽ xét duyệt trong thời gian sớm nhất.",
                "GARAGE",
                savedGarage.getId()
        );

        return toGarageResponse(savedGarage, docs);
    }

    private GarageDocument createDoc(Garage garage, GarageDocType docType, String url, String note) {
        GarageDocument doc = new GarageDocument();
        doc.setGarage(garage);
        doc.setDocType(docType);
        doc.setFileUrl(url);
        doc.setNote(note);
        return doc;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<GarageResponse> getGarages(GarageStatus status, String keyword, Pageable pageable) {
        Page<Garage> page;
        if (StringUtils.hasText(keyword)) {
            page = garageRepository.searchGaragesWithKeyword(status, keyword.trim(), pageable);
        } else if (status != null) {
            page = garageRepository.findByStatus(status, pageable);
        } else {
            page = garageRepository.findAll(pageable);
        }

        return page.map(g -> {
            List<GarageDocument> docs = garageDocumentRepository.findByGarage(g);
            return toGarageResponse(g, docs);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public GarageResponse getGarageById(Long id) {
        Garage garage = garageRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy Gara với id: " + id));
        List<GarageDocument> docs = garageDocumentRepository.findByGarage(garage);
        return toGarageResponse(garage, docs);
    }

    @Override
    @Transactional
    public GarageResponse reviewGarage(Long id, GarageReviewRequest request) {
        Garage garage = garageRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy Gara với id: " + id));

        GarageStatus newStatus = request.getStatus();
        garage.setStatus(newStatus);

        if (newStatus == GarageStatus.APPROVED) {
            garage.setApprovedAt(OffsetDateTime.now());
            garage.setIsOnline(true);
            garage.setRejectionReason(null);
            if (request.getCommissionRate() != null) {
                garage.setCommissionRate(request.getCommissionRate());
            }

            // Upgrade User Role to GARAGE_OWNER
            User owner = garage.getOwner();
            owner.setRole(UserRole.GARAGE_OWNER);
            userRepository.save(owner);
            log.info("Upgraded user {} to GARAGE_OWNER", owner.getPhone());

            // Notify user
            notificationService.createNotification(
                    owner,
                    NotificationType.GARAGE_REVIEWED,
                    "Hồ sơ đăng ký Gara đã được phê duyệt!",
                    "Chúc mừng bạn! Gara '" + garage.getName() + "' đã được duyệt thành công. Tài khoản của bạn đã được nâng cấp lên Admin Gara. Bạn có thể bắt đầu vận hành ngay!",
                    "GARAGE",
                    garage.getId()
            );
        } else if (newStatus == GarageStatus.REJECTED) {
            garage.setRejectionReason(request.getRejectionReason());
            garage.setIsOnline(false);

            User owner = garage.getOwner();
            notificationService.createNotification(
                    owner,
                    NotificationType.GARAGE_REVIEWED,
                    "Hồ sơ đăng ký Gara bị từ chối",
                    "Rất tiếc, hồ sơ đăng ký Gara của bạn chưa được duyệt. Lý do: " + (request.getRejectionReason() != null ? request.getRejectionReason() : "Thông tin chưa đáp ứng tiêu chuẩn."),
                    "GARAGE",
                    garage.getId()
            );
        } else if (newStatus == GarageStatus.SUSPENDED) {
            garage.setIsOnline(false);
        }

        Garage updated = garageRepository.save(garage);
        List<GarageDocument> docs = garageDocumentRepository.findByGarage(updated);
        return toGarageResponse(updated, docs);
    }

    @Override
    @Transactional(readOnly = true)
    public GarageResponse getMyGarage(User user) {
        Garage garage = garageRepository.findByOwner(user)
                .orElseThrow(() -> new BadRequestException("Bạn chưa đăng ký Gara nào"));
        List<GarageDocument> docs = garageDocumentRepository.findByGarage(garage);
        return toGarageResponse(garage, docs);
    }

    @Override
    @Transactional
    public GarageResponse updateOnlineStatus(User user, Boolean isOnline) {
        Garage garage = garageRepository.findByOwner(user)
                .orElseThrow(() -> new BadRequestException("Bạn chưa sở hữu Gara nào"));
        garage.setIsOnline(Boolean.TRUE.equals(isOnline));
        Garage updated = garageRepository.save(garage);
        List<GarageDocument> docs = garageDocumentRepository.findByGarage(updated);
        return toGarageResponse(updated, docs);
    }

    @Override
    @Transactional
    public GarageResponse updateAutoAccept(User user, Boolean autoAccept) {
        Garage garage = garageRepository.findByOwner(user)
                .orElseThrow(() -> new BadRequestException("Bạn chưa sở hữu Gara nào"));
        garage.setAutoAccept(Boolean.TRUE.equals(autoAccept));
        Garage updated = garageRepository.save(garage);
        List<GarageDocument> docs = garageDocumentRepository.findByGarage(updated);
        return toGarageResponse(updated, docs);
    }

    @Override
    @Transactional(readOnly = true)
    public GarageDashboardResponse getDashboard(User user) {
        Garage garage = garageRepository.findByOwner(user).orElse(null);
        if (garage == null) {
            return GarageDashboardResponse.builder()
                    .garageName("Chưa đăng ký gara")
                    .isOnline(false)
                    .autoAccept(false)
                    .todayRevenue(0L)
                    .revenueGrowthPercent(0.0)
                    .availableStaffCount(0)
                    .busyStaffCount(0)
                    .activeOrderCount(0)
                    .completedOrderCount(0)
                    .onlineStaffLocations(List.of())
                    .pendingOrders(List.of())
                    .recentServices(List.of())
                    .build();
        }

        // ── Nhân viên thật (đếm rảnh/bận + danh sách) ──
        List<GarageStaff> staff = garageStaffRepository.findByGarageAndIsActiveTrue(garage);
        int available = 0, busy = 0;
        List<GarageDashboardResponse.StaffLocation> staffList = new ArrayList<>();
        for (GarageStaff s : staff) {
            boolean free = s.getStatus() == WorkStatus.FREE;
            if (free) available++;
            else if (s.getStatus() == WorkStatus.BUSY) busy++;
            staffList.add(GarageDashboardResponse.StaffLocation.builder()
                    .id(s.getId())
                    .name(s.getUser() != null ? s.getUser().getFullName() : "Nhân viên")
                    .phone(s.getUser() != null ? s.getUser().getPhone() : null)
                    .lat(null)
                    .lng(null) // chưa theo dõi GPS nhân viên theo thời gian thực
                    .isAvailable(free)
                    .build());
        }

        // ── Đơn đang chờ nhận (lời mời SENT + request PENDING_GARAGE) ──
        List<GarageDashboardResponse.PendingRescueOrder> pendingOrders = new ArrayList<>();
        for (DispatchOffer off : dispatchOfferRepository.findByGarageAndStatusOrderByCreatedAtDesc(garage, OfferStatus.SENT)) {
            RescueRequest r = off.getRequest();
            if (r.getStatus() != RescueStatus.PENDING_GARAGE) continue;
            pendingOrders.add(GarageDashboardResponse.PendingRescueOrder.builder()
                    .id(r.getId())
                    .orderType("Cứu hộ " + vehicleLabel(r.getVehicleType()))
                    .customerVehicle(r.getCustomer() != null ? r.getCustomer().getFullName() : "Khách hàng")
                    .issueDescription(r.getSymptom())
                    .timeAgo(relativeTime(r.getCreatedAt()))
                    .isUrgent(r.getVehicleType() == VehicleType.CAR)
                    .build());
        }

        // ── Đơn của gara: đếm active/completed, doanh thu hôm nay & lịch sử gần đây ──
        List<RescueRequest> all = rescueRequestRepository.findByGarageAndIsDeletedFalseOrderByCreatedAtDesc(garage);
        List<GarageDashboardResponse.RecentServiceItem> recentServices = new ArrayList<>();
        int activeCount = 0, completedCount = 0;
        long todayRevenue = 0, yesterdayRevenue = 0;
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        LocalDate yesterday = today.minusDays(1);
        for (RescueRequest r : all) {
            RescueStatus st = r.getStatus();
            if (st == RescueStatus.ACCEPTED || st == RescueStatus.ASSIGNED
                    || st == RescueStatus.EN_ROUTE || st == RescueStatus.ARRIVED) {
                activeCount++;
            } else if (st == RescueStatus.COMPLETED) {
                completedCount++;
                if (recentServices.size() < 5) {
                    recentServices.add(GarageDashboardResponse.RecentServiceItem.builder()
                            .id(r.getId())
                            .customerName(r.getCustomer() != null ? r.getCustomer().getFullName() : "")
                            .licensePlate(r.getRescueVehicle() != null ? r.getRescueVehicle().getLicensePlate() : "")
                            .serviceName(r.getSymptom())
                            .technicianName(r.getStaff() != null && r.getStaff().getUser() != null
                                    ? r.getStaff().getUser().getFullName() : "")
                            .status("Hoàn thành")
                            .build());
                }
                if (r.getCompletedAt() != null && r.getTotalAmount() != null) {
                    LocalDate d = r.getCompletedAt().atZoneSameInstant(ZoneId.systemDefault()).toLocalDate();
                    if (d.equals(today)) todayRevenue += r.getTotalAmount();
                    else if (d.equals(yesterday)) yesterdayRevenue += r.getTotalAmount();
                }
            }
        }
        double growth = yesterdayRevenue > 0
                ? (todayRevenue - yesterdayRevenue) * 100.0 / yesterdayRevenue
                : (todayRevenue > 0 ? 100.0 : 0.0);

        return GarageDashboardResponse.builder()
                .garageName(garage.getName())
                .isOnline(Boolean.TRUE.equals(garage.getIsOnline()))
                .autoAccept(Boolean.TRUE.equals(garage.getAutoAccept()))
                .todayRevenue(todayRevenue)
                .revenueGrowthPercent(Math.round(growth * 10) / 10.0)
                .availableStaffCount(available)
                .busyStaffCount(busy)
                .activeOrderCount(activeCount)
                .completedOrderCount(completedCount)
                .onlineStaffLocations(staffList)
                .pendingOrders(pendingOrders)
                .recentServices(recentServices)
                .build();
    }

    private String vehicleLabel(VehicleType t) {
        return t == VehicleType.CAR ? "ô tô" : "xe máy";
    }

    private String relativeTime(OffsetDateTime from) {
        if (from == null) return "";
        long mins = Duration.between(from, OffsetDateTime.now()).toMinutes();
        if (mins < 1) return "Vừa xong";
        if (mins < 60) return mins + " phút trước";
        long hours = mins / 60;
        if (hours < 24) return hours + " giờ trước";
        return (hours / 24) + " ngày trước";
    }

    private GarageResponse toGarageResponse(Garage g, List<GarageDocument> docs) {
        List<GarageDocumentResponse> docResponses = docs != null ? docs.stream()
                .map(d -> GarageDocumentResponse.builder()
                        .id(d.getId())
                        .docType(d.getDocType())
                        .fileUrl(d.getFileUrl())
                        .note(d.getNote())
                        .build())
                .toList() : List.of();

        User owner = g.getOwner();

        return GarageResponse.builder()
                .id(g.getId())
                .name(g.getName())
                .phone(g.getPhone())
                .email(owner != null ? owner.getEmail() : null)
                .address(g.getAddress())
                .lat(g.getLat())
                .lng(g.getLng())
                .capability(g.getCapability())
                .status(g.getStatus())
                .rejectionReason(g.getRejectionReason())
                .commissionRate(g.getCommissionRate())
                .isOnline(g.getIsOnline())
                .autoAccept(g.getAutoAccept())
                .creditBalance(g.getCreditBalance())
                .cashBalance(g.getCashBalance())
                .avgRating(g.getAvgRating())
                .ratingCount(g.getRatingCount())
                .approvedAt(g.getApprovedAt())
                .createdAt(g.getCreatedAt())
                .ownerId(owner != null ? owner.getId() : null)
                .ownerName(owner != null ? owner.getFullName() : null)
                .ownerPhone(owner != null ? owner.getPhone() : null)
                .documents(docResponses)
                .build();
    }
}