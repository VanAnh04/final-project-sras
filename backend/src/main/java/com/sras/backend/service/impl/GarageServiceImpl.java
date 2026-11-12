package com.sras.backend.service.impl;

import com.sras.backend.dto.request.GarageRegistrationRequest;
import com.sras.backend.dto.request.GarageReviewRequest;
import com.sras.backend.dto.response.GarageDashboardResponse;
import com.sras.backend.dto.response.GarageDocumentResponse;
import com.sras.backend.dto.response.GaragePublicProfileResponse;
import com.sras.backend.dto.response.GarageResponse;
import com.sras.backend.entity.DispatchConfig;
import com.sras.backend.entity.DispatchOffer;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageDocument;
import com.sras.backend.entity.GarageServicePrice;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.RescueVehicle;
import com.sras.backend.entity.Service;
import com.sras.backend.entity.ServiceCategory;
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
import com.sras.backend.repository.RatingRepository;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.GarageService;
import com.sras.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import com.sras.backend.dto.request.GarageServicePriceRequest;
import com.sras.backend.dto.response.GarageServicePriceResponse;
import com.sras.backend.entity.GarageServicePrice;
import com.sras.backend.entity.Service;
import com.sras.backend.repository.GarageServicePriceRepository;
import com.sras.backend.repository.ServiceRepository;
import java.util.Map;
import java.util.stream.Collectors;

@org.springframework.stereotype.Service
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
    private final GarageServicePriceRepository garageServicePriceRepository;
    private final ServiceRepository serviceRepository;
    private final com.sras.backend.repository.RatingRepository ratingRepository;
    private final com.sras.backend.repository.RescueVehicleRepository rescueVehicleRepository;
    private final com.sras.backend.service.RescuePricingConfigService pricingConfigService;
    private final com.sras.backend.service.RoutingService routingService;
    private final com.sras.backend.service.DispatchScoringService dispatchScoringService;

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
        if (Boolean.TRUE.equals(autoAccept)) {
            long credit = garage.getCreditBalance() != null ? garage.getCreditBalance() : 0L;
            if (credit < 500_000L) {
                throw new BadRequestException("Số dư ví tín dụng hiện tại (" + formatVnd(credit) +
                        ") không đủ 500.000đ. Vui lòng nạp tiền vào ví trước khi bật Tự động nhận cuốc.");
            }
        }
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
                    .creditBalance(0L)
                    .cashBalance(0L)
                    .isWalletEligible(false)
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
            } else if (r.getStatus() == RescueStatus.CANCELLED && r.getGasCompensationAmount() != null && r.getGasCompensationAmount() > 0) {
                completedCount++;
                if (recentServices.size() < 5) {
                    recentServices.add(GarageDashboardResponse.RecentServiceItem.builder()
                            .id(r.getId())
                            .customerName(r.getCustomer() != null ? r.getCustomer().getFullName() : "")
                            .licensePlate(r.getRescueVehicle() != null ? r.getRescueVehicle().getLicensePlate() : "")
                            .serviceName("Bồi hoàn xăng (" + (r.getSymptom() != null ? r.getSymptom() : "Cứu hộ") + ")")
                            .technicianName(r.getStaff() != null && r.getStaff().getUser() != null
                                    ? r.getStaff().getUser().getFullName() : "")
                            .status("Bồi hoàn xăng")
                            .build());
                }
                OffsetDateTime compTime = r.getUpdatedAt() != null ? r.getUpdatedAt() : r.getCreatedAt();
                if (compTime != null) {
                    LocalDate d = compTime.atZoneSameInstant(ZoneId.systemDefault()).toLocalDate();
                    if (d.equals(today)) todayRevenue += r.getGasCompensationAmount();
                    else if (d.equals(yesterday)) yesterdayRevenue += r.getGasCompensationAmount();
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
                .creditBalance(garage.getCreditBalance() != null ? garage.getCreditBalance() : 0L)
                .cashBalance(garage.getCashBalance() != null ? garage.getCashBalance() : 0L)
                .isWalletEligible(garage.getCreditBalance() != null && garage.getCreditBalance() >= 500_000L)
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
                .code(String.format("GR-%04d", g.getId()))
                .name(g.getName())
                .phone(StringUtils.hasText(g.getPhone()) ? g.getPhone() : (owner != null && StringUtils.hasText(owner.getPhone()) ? owner.getPhone().trim() : null))
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

    private GarageServicePriceResponse toGarageServicePriceResponse(Service svc, GarageServicePrice customPrice) {
        ServiceCategory cat = svc.getCategory();
        Long catId = cat != null ? cat.getId() : null;
        String catName = cat != null ? cat.getName() : null;
        String catCode = cat != null ? cat.getCode() : null;
        String catVehType = cat != null && cat.getVehicleType() != null ? cat.getVehicleType().name() : null;

        if (customPrice != null) {
            return GarageServicePriceResponse.builder()
                    .id(customPrice.getId())
                    .serviceId(svc.getId())
                    .serviceCode(svc.getCode())
                    .serviceName(svc.getName())
                    .categoryId(catId)
                    .categoryName(catName)
                    .categoryCode(catCode)
                    .categoryVehicleType(catVehType)
                    .feeType(svc.getFeeType())
                    .unit(svc.getUnit())
                    .minPrice(svc.getMinPrice())
                    .maxPrice(svc.getMaxPrice())
                    .price(customPrice.getPrice())
                    .isActive(customPrice.getIsActive())
                    .distanceTiersJson(customPrice.getDistanceTiersJson())
                    .nightSurgeEnabled(customPrice.getNightSurgeEnabled())
                    .nightSurgePercent(customPrice.getNightSurgePercent())
                    .holidaySurgeEnabled(customPrice.getHolidaySurgeEnabled())
                    .holidaySurgePercent(customPrice.getHolidaySurgePercent())
                    .isConfigured(true)
                    .build();
        } else {
            return GarageServicePriceResponse.builder()
                    .serviceId(svc.getId())
                    .serviceCode(svc.getCode())
                    .serviceName(svc.getName())
                    .categoryId(catId)
                    .categoryName(catName)
                    .categoryCode(catCode)
                    .categoryVehicleType(catVehType)
                    .feeType(svc.getFeeType())
                    .unit(svc.getUnit())
                    .minPrice(svc.getMinPrice())
                    .maxPrice(svc.getMaxPrice())
                    .price(svc.getMinPrice())
                    .isActive(false)
                    .nightSurgeEnabled(false)
                    .nightSurgePercent(0)
                    .holidaySurgeEnabled(false)
                    .holidaySurgePercent(0)
                    .isConfigured(false)
                    .build();
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<GarageServicePriceResponse> getGarageServices(User user) {
        Garage garage = garageRepository.findByOwner(user)
                .orElseThrow(() -> new BadRequestException("Bạn chưa sở hữu Gara nào"));

        List<Service> catalogServices = serviceRepository.findAll();
        List<GarageServicePrice> existingPrices = garageServicePriceRepository.findByGarage(garage);
        Map<Long, GarageServicePrice> priceMap = existingPrices.stream()
                .collect(Collectors.toMap(p -> p.getService().getId(), p -> p, (a, b) -> a));

        return catalogServices.stream().map(svc -> toGarageServicePriceResponse(svc, priceMap.get(svc.getId()))).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<GarageServicePriceResponse> getGarageServicesByGarageId(Long garageId) {
        Garage garage = garageRepository.findById(garageId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy Gara với id: " + garageId));

        List<Service> catalogServices = serviceRepository.findAll();
        List<GarageServicePrice> existingPrices = garageServicePriceRepository.findByGarage(garage);
        Map<Long, GarageServicePrice> priceMap = existingPrices.stream()
                .collect(Collectors.toMap(p -> p.getService().getId(), p -> p, (a, b) -> a));

        return catalogServices.stream().map(svc -> toGarageServicePriceResponse(svc, priceMap.get(svc.getId()))).toList();
    }

    @Override
    @Transactional
    public GarageServicePriceResponse updateGarageServicePrice(User user, Long serviceId, GarageServicePriceRequest request) {
        Garage garage = garageRepository.findByOwner(user)
                .orElseThrow(() -> new BadRequestException("Bạn chưa sở hữu Gara nào"));

        Service svc = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy dịch vụ với id: " + serviceId));

        if (request.getPrice() != null) {
            if (svc.getMinPrice() != null && request.getPrice() < svc.getMinPrice()) {
                throw new BadRequestException("Mức giá không được nhỏ hơn giá tối thiểu: " + svc.getMinPrice() + " VNĐ");
            }
            if (svc.getMaxPrice() != null && request.getPrice() > svc.getMaxPrice()) {
                throw new BadRequestException("Mức giá không được lớn hơn giá tối đa: " + svc.getMaxPrice() + " VNĐ");
            }
        }

        GarageServicePrice priceObj = garageServicePriceRepository.findByGarageAndService(garage, svc)
                .orElseGet(() -> {
                    GarageServicePrice p = new GarageServicePrice();
                    p.setGarage(garage);
                    p.setService(svc);
                    return p;
                });

        priceObj.setPrice(request.getPrice());
        if (request.getIsActive() != null) {
            priceObj.setIsActive(request.getIsActive());
        }
        priceObj.setDistanceTiersJson(request.getDistanceTiersJson());
        priceObj.setNightSurgeEnabled(Boolean.TRUE.equals(request.getNightSurgeEnabled()));
        priceObj.setNightSurgePercent(request.getNightSurgePercent() != null ? request.getNightSurgePercent() : 0);
        priceObj.setHolidaySurgeEnabled(Boolean.TRUE.equals(request.getHolidaySurgeEnabled()));
        priceObj.setHolidaySurgePercent(request.getHolidaySurgePercent() != null ? request.getHolidaySurgePercent() : 0);

        GarageServicePrice saved = garageServicePriceRepository.save(priceObj);

        return toGarageServicePriceResponse(svc, saved);
    }

    @Override
    @Transactional
    public GarageServicePriceResponse toggleGarageService(User user, Long serviceId, Boolean isActive) {
        Garage garage = garageRepository.findByOwner(user)
                .orElseThrow(() -> new BadRequestException("Bạn chưa sở hữu Gara nào"));

        Service svc = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy dịch vụ với id: " + serviceId));

        GarageServicePrice priceObj = garageServicePriceRepository.findByGarageAndService(garage, svc)
                .orElseGet(() -> {
                    GarageServicePrice p = new GarageServicePrice();
                    p.setGarage(garage);
                    p.setService(svc);
                    p.setPrice(svc.getMinPrice() != null ? svc.getMinPrice() : 0L);
                    return p;
                });

        if (Boolean.TRUE.equals(isActive)) {
            Long currentPrice = priceObj.getPrice();
            if (currentPrice == null) {
                currentPrice = svc.getMinPrice() != null ? svc.getMinPrice() : 0L;
                priceObj.setPrice(currentPrice);
            }
            if (svc.getMinPrice() != null && currentPrice < svc.getMinPrice()) {
                throw new BadRequestException("Mức giá hiện tại (" + String.format("%,d", currentPrice) + " VNĐ) thấp hơn khung giá tối thiểu (" + String.format("%,d", svc.getMinPrice()) + " VNĐ). Vui lòng cập nhật lại giá trước khi bật dịch vụ.");
            }
            if (svc.getMaxPrice() != null && currentPrice > svc.getMaxPrice()) {
                throw new BadRequestException("Mức giá hiện tại (" + String.format("%,d", currentPrice) + " VNĐ) vượt quá khung giá tối đa (" + String.format("%,d", svc.getMaxPrice()) + " VNĐ). Vui lòng cập nhật lại giá trước khi bật dịch vụ.");
            }
        }

        priceObj.setIsActive(Boolean.TRUE.equals(isActive));
        GarageServicePrice saved = garageServicePriceRepository.save(priceObj);

        return toGarageServicePriceResponse(svc, saved);
    }

        @Override
    @Transactional(readOnly = true)
    public List<com.sras.backend.dto.response.NearbyGarageResponse> getNearbyGarages(
            Double lat, Double lng, VehicleType vehicleType, Double radiusKm) {
        if (lat == null || lng == null) {
            throw new BadRequestException("Toạ độ vị trí không hợp lệ");
        }
        double maxDist = (radiusKm != null && radiusKm > 0) ? radiusKm : 20.0;

        List<Garage> approvedGarages = garageRepository.findByStatusAndIsOnlineTrueAndIsDeletedFalse(GarageStatus.APPROVED);
        if (approvedGarages == null || approvedGarages.isEmpty()) {
            return List.of();
        }

        // 1. Lọc nhanh theo bán kính và khả năng phục vụ trong bộ nhớ (0ms)
        List<Garage> matchingGarages = new ArrayList<>();
        Map<Long, Double> distanceMap = new HashMap<>();
        for (Garage g : approvedGarages) {
            if (g.getLat() == null || g.getLng() == null) continue;
            if (vehicleType != null && !capabilityMatches(g.getCapability(), vehicleType)) continue;

            double dist = haversineKm(lat, lng, g.getLat(), g.getLng());
            if (dist <= maxDist) {
                matchingGarages.add(g);
                // Hệ số bù đường bộ chuẩn Việt Nam (1.30): tính toán tức thì, không bị nghẽn mạng Goong API
                double roadDist = BigDecimal.valueOf(dist * 1.30).setScale(1, RoundingMode.HALF_UP).doubleValue();
                distanceMap.put(g.getId(), roadDist);
            }
        }

        if (matchingGarages.isEmpty()) {
            return List.of();
        }

        List<Long> garageIds = matchingGarages.stream().map(Garage::getId).toList();

        // 2. Tải theo Batch đồng loạt (chỉ 5 truy vấn SQL nhanh thay vì hàng chục câu lệnh lặp)
        // 2.1 Batch Thợ:
        List<GarageStaff> allStaff = garageStaffRepository.findByGarageIdInAndIsDeletedFalseAndIsActiveTrue(garageIds);
        Map<Long, Long> freeStaffMap = (allStaff != null ? allStaff.stream() : java.util.stream.Stream.<GarageStaff>empty())
                .filter(s -> s.getStatus() == WorkStatus.FREE)
                .collect(Collectors.groupingBy(s -> s.getGarage().getId(), Collectors.counting()));

        // 2.2 Batch Xe cứu hộ:
        List<RescueVehicle> allVehicles = rescueVehicleRepository.findByGarageIdInAndIsDeletedFalseAndIsActiveTrue(garageIds);
        Map<Long, List<RescueVehicle>> freeVehiclesMap = (allVehicles != null ? allVehicles.stream() : java.util.stream.Stream.<RescueVehicle>empty())
                .filter(v -> v.getStatus() == WorkStatus.FREE)
                .collect(Collectors.groupingBy(v -> v.getGarage().getId()));

        // 2.3 Batch Đánh giá sao:
        List<RatingRepository.GarageRatingAgg> ratingAggs = ratingRepository.aggregateByGarages(garageIds);
        Map<Long, RatingRepository.GarageRatingAgg> ratingMap = (ratingAggs != null ? ratingAggs.stream() : java.util.stream.Stream.<RatingRepository.GarageRatingAgg>empty())
                .collect(Collectors.toMap(RatingRepository.GarageRatingAgg::getGarageId, r -> r, (a, b) -> a));

        // 2.4 Batch Ảnh hồ sơ (Cover photo):
        List<GarageDocument> allDocs = garageDocumentRepository.findByGarageIdIn(garageIds);
        Map<Long, String> coverImageMap = (allDocs != null ? allDocs.stream() : java.util.stream.Stream.<GarageDocument>empty())
                .filter(d -> d.getDocType() == GarageDocType.GARAGE_PHOTO && StringUtils.hasText(d.getFileUrl()))
                .collect(Collectors.toMap(d -> d.getGarage().getId(), GarageDocument::getFileUrl, (a, b) -> a));

        // 2.5 Batch Đơn trong ngày & Tỉ lệ nhận đơn:
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime startOfDay = now.toLocalDate().atStartOfDay().atOffset(now.getOffset());
        OffsetDateTime thirtyDaysAgo = now.minusDays(30);

        Map<Long, Long> ordersTodayMap = new HashMap<>();
        List<Object[]> todayRows = rescueRequestRepository.countOrdersTodayBatch(garageIds, startOfDay);
        if (todayRows != null) {
            for (Object[] row : todayRows) {
                if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                    ordersTodayMap.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
                }
            }
        }

        Map<Long, Long> completedOrdersMap = new HashMap<>();
        List<Object[]> completedRows = rescueRequestRepository.countCompletedBatch(garageIds);
        if (completedRows != null) {
            for (Object[] row : completedRows) {
                if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                    completedOrdersMap.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
                }
            }
        }

        Map<Long, Double> acceptRateMap = new HashMap<>();
        List<Object[]> acceptRows = dispatchOfferRepository.computeAcceptanceRateBatch(garageIds, thirtyDaysAgo);
        if (acceptRows != null) {
            for (Object[] row : acceptRows) {
                if (row != null && row.length >= 3 && row[0] != null && row[1] != null && row[2] != null) {
                    long total = ((Number) row[1]).longValue();
                    long accepted = ((Number) row[2]).longValue();
                    double rate = total > 0 ? ((double) accepted / (double) total) : 1.0;
                    acceptRateMap.put(((Number) row[0]).longValue(), rate);
                }
            }
        }

        DispatchConfig dispatchConfig = dispatchScoringService.getActiveConfig();
        List<com.sras.backend.dto.response.NearbyGarageResponse> result = new ArrayList<>();

        for (Garage g : matchingGarages) {
            double roadDist = distanceMap.getOrDefault(g.getId(), 1.0);
            long freeStaff = freeStaffMap.getOrDefault(g.getId(), 0L);
            List<RescueVehicle> freeVehicles = freeVehiclesMap.getOrDefault(g.getId(), List.of());
            boolean hasMatchingVehicle = (vehicleType == null)
                    ? !freeVehicles.isEmpty()
                    : freeVehicles.stream().anyMatch(v -> capabilityMatches(v.getCapability(), vehicleType));

            boolean isWalletEligible = g.getCreditBalance() != null && g.getCreditBalance() >= 500_000L;
            String availabilityStatus;
            if (!Boolean.TRUE.equals(g.getIsOnline())) {
                availabilityStatus = "OFFLINE";
            } else if (!isWalletEligible) {
                availabilityStatus = "LOW_BALANCE";
            } else if (freeStaff > 0 && hasMatchingVehicle) {
                availabilityStatus = "READY";
            } else if (freeStaff == 0 && hasMatchingVehicle) {
                availabilityStatus = "NO_STAFF";
            } else if (freeStaff > 0 && !hasMatchingVehicle) {
                availabilityStatus = "NO_VEHICLE";
            } else {
                availabilityStatus = "NO_STAFF";
            }
            boolean available = "READY".equals(availabilityStatus);

            RatingRepository.GarageRatingAgg rAgg = ratingMap.get(g.getId());
            BigDecimal avgRating = (rAgg != null && rAgg.getCnt() != null && rAgg.getCnt() > 0 && rAgg.getAvgStars() != null)
                    ? BigDecimal.valueOf(rAgg.getAvgStars()).setScale(1, RoundingMode.HALF_UP)
                    : null;
            Integer ratingCount = (rAgg != null && rAgg.getCnt() != null) ? rAgg.getCnt().intValue() : 0;

            long estimatedFee = pricingConfigService.calculateRescueFee(vehicleType, roadDist, now);
            int etaMin = (int) Math.max(5, Math.round(roadDist * 3));

            long ordersToday = ordersTodayMap.getOrDefault(g.getId(), 0L);
            double acceptRate = acceptRateMap.getOrDefault(g.getId(), 1.0);
            double rawStars = avgRating != null ? avgRating.doubleValue() : 4.5;
            double systemScore = dispatchScoringService.calculateScore(
                    g, roadDist, maxDist, ordersToday, rawStars, acceptRate, dispatchConfig);

            String coverImg = coverImageMap.get(g.getId());

            List<String> badges = new ArrayList<>();
            badges.add("VERIFIED");
            if (available) badges.add("READY_NOW");
            if (avgRating != null && avgRating.doubleValue() >= 4.5 && ratingCount >= 2) badges.add("TOP_RATED");

            String garagePhone = g.getPhone();
            if (!StringUtils.hasText(garagePhone) && g.getOwner() != null && StringUtils.hasText(g.getOwner().getPhone())) {
                garagePhone = g.getOwner().getPhone().trim();
            } else if (garagePhone != null) {
                garagePhone = garagePhone.trim();
            }

            result.add(com.sras.backend.dto.response.NearbyGarageResponse.builder()
                    .id(g.getId())
                    .name(g.getName())
                    .phone(garagePhone)
                    .address(g.getAddress())
                    .lat(g.getLat())
                    .lng(g.getLng())
                    .capability(g.getCapability())
                    .isOnline(g.getIsOnline())
                    .autoAccept(g.getAutoAccept())
                    .avgRating(avgRating)
                    .ratingCount(ratingCount)
                    .distanceKm(roadDist)
                    .estimatedEtaMin(etaMin)
                    .estimatedRescueFee(estimatedFee)
                    .available(available)
                    .availabilityStatus(availabilityStatus)
                    .activeRescueVehicleCount(freeVehicles.size())
                    .badges(badges)
                    .coverImageUrl(coverImg)
                    .specialties(List.of())
                    .totalOrders((int) Math.max(g.getTotalOrders() != null ? g.getTotalOrders() : 0, completedOrdersMap.getOrDefault(g.getId(), 0L)))
                    .score(systemScore)
                    .build());
        }

        result.sort((a, b) -> {
            if (a.getScore() != null && b.getScore() != null) {
                int comp = Double.compare(b.getScore(), a.getScore());
                if (comp != 0) return comp;
            }
            return Double.compare(a.getDistanceKm(), b.getDistanceKm());
        });
        if (!result.isEmpty()) {
            if (!result.get(0).getBadges().contains("FASTEST")) {
                result.get(0).getBadges().add("FASTEST");
            }
            long minFee = result.stream()
                    .mapToLong(r -> r.getEstimatedRescueFee() != null ? r.getEstimatedRescueFee() : Long.MAX_VALUE)
                    .min().orElse(0);
            if (minFee > 0) {
                for (com.sras.backend.dto.response.NearbyGarageResponse r : result) {
                    if (r.getEstimatedRescueFee() != null && r.getEstimatedRescueFee() == minFee) {
                        if (!r.getBadges().contains("BEST_PRICE")) {
                            r.getBadges().add("BEST_PRICE");
                        }
                    }
                }
            }
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public GaragePublicProfileResponse getGaragePublicProfile(Long id, Double lat, Double lng, VehicleType vehicleType) {
        Garage g = garageRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy Gara với id: " + id));

        List<GarageDocument> docs = garageDocumentRepository.findByGarageId(g.getId());
        List<String> photos = docs != null ? docs.stream()
                .filter(d -> d.getDocType() == GarageDocType.GARAGE_PHOTO)
                .map(GarageDocument::getFileUrl)
                .filter(StringUtils::hasText)
                .toList() : List.of();
        String coverImageUrl = !photos.isEmpty() ? photos.get(0) : null;

        List<GarageStaff> staffList = garageStaffRepository.findByGarageAndIsActiveTrue(g);
        int totalStaff = staffList != null ? staffList.size() : 0;
        int activeStaff = staffList != null ? (int) staffList.stream()
                .filter(s -> s.getStatus() == WorkStatus.FREE && !Boolean.TRUE.equals(s.getIsDeleted()))
                .count() : 0;

        List<RescueVehicle> vehicles = rescueVehicleRepository.findByGarageAndIsDeletedFalseAndIsActiveTrue(g);
        int rescueVehicleCount = vehicles != null ? vehicles.size() : 0;

        // Tính trực tiếp trong bộ nhớ từ danh sách đã query, loại bỏ 2 query thừa
        long freeStaff = activeStaff;
        List<RescueVehicle> freeVehicles = vehicles != null
                ? vehicles.stream().filter(v -> v.getStatus() == WorkStatus.FREE).toList()
                : List.of();
        int activeRescueVehicleCount = freeVehicles.size();

        boolean hasMatchingVehicle = (vehicleType == null)
                ? !freeVehicles.isEmpty()
                : freeVehicles.stream().anyMatch(v -> capabilityMatches(v.getCapability(), vehicleType));
        boolean isWalletEligible = g.getCreditBalance() != null && g.getCreditBalance() >= 500_000L;
        String availabilityStatus;
        if (!Boolean.TRUE.equals(g.getIsOnline())) {
            availabilityStatus = "OFFLINE";
        } else if (!isWalletEligible) {
            availabilityStatus = "LOW_BALANCE";
        } else if (freeStaff > 0 && hasMatchingVehicle) {
            availabilityStatus = "READY";
        } else if (freeStaff == 0 && hasMatchingVehicle) {
            availabilityStatus = "NO_STAFF";
        } else if (freeStaff > 0 && !hasMatchingVehicle) {
            availabilityStatus = "NO_VEHICLE";
        } else {
            availabilityStatus = "NO_STAFF";
        }
        boolean available = "READY".equals(availabilityStatus);

        com.sras.backend.repository.RatingRepository.RatingAgg agg = ratingRepository.aggregateForGarage(g.getId());
        BigDecimal avgRating = (agg != null && agg.getCnt() != null && agg.getCnt() > 0 && agg.getAvgStars() != null)
                ? BigDecimal.valueOf(agg.getAvgStars()).setScale(1, RoundingMode.HALF_UP)
                : null;
        Integer ratingCount = (agg != null && agg.getCnt() != null) ? agg.getCnt().intValue() : 0;

        List<GarageServicePriceResponse> allServices = getGarageServicesByGarageId(g.getId());
        List<String> specialties = allServices != null ? allServices.stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                .map(GarageServicePriceResponse::getServiceName)
                .filter(StringUtils::hasText)
                .limit(4)
                .toList() : List.of();

        Double distanceKm = null;
        Integer etaMin = null;
        Long estimatedRescueFee = null;

        if (lat != null && lng != null && g.getLat() != null && g.getLng() != null) {
            double straightDist = haversineKm(lat, lng, g.getLat(), g.getLng());
            double roadDist = BigDecimal.valueOf(straightDist * 1.30).setScale(1, RoundingMode.HALF_UP).doubleValue();
            estimatedRescueFee = pricingConfigService.calculateRescueFee(vehicleType, roadDist, OffsetDateTime.now());
            etaMin = (int) Math.max(5, Math.round(roadDist * 3));
            distanceKm = roadDist;
        }

        Double profileScore = null;
        if (distanceKm != null) {
            OffsetDateTime now = OffsetDateTime.now();
            OffsetDateTime startOfDay = now.toLocalDate().atStartOfDay().atOffset(now.getOffset());
            OffsetDateTime thirtyDaysAgo = now.minusDays(30);

            long ordersToday = 0L;
            List<Object[]> todayRows = rescueRequestRepository.countOrdersTodayBatch(List.of(g.getId()), startOfDay);
            if (todayRows != null && !todayRows.isEmpty() && todayRows.get(0).length >= 2 && todayRows.get(0)[1] != null) {
                ordersToday = ((Number) todayRows.get(0)[1]).longValue();
            }

            double acceptRate = 1.0;
            List<Object[]> acceptRows = dispatchOfferRepository.computeAcceptanceRateBatch(List.of(g.getId()), thirtyDaysAgo);
            if (acceptRows != null && !acceptRows.isEmpty() && acceptRows.get(0).length >= 3 && acceptRows.get(0)[1] != null && acceptRows.get(0)[2] != null) {
                long total = ((Number) acceptRows.get(0)[1]).longValue();
                long accepted = ((Number) acceptRows.get(0)[2]).longValue();
                if (total > 0) {
                    acceptRate = ((double) accepted / (double) total);
                }
            }

            DispatchConfig dispatchConfig = dispatchScoringService.getActiveConfig();
            double rawStars = avgRating != null ? avgRating.doubleValue() : 4.5;
            profileScore = dispatchScoringService.calculateScore(
                    g, distanceKm, 20.0, ordersToday, rawStars, acceptRate, dispatchConfig);
        }

        List<String> badges = new ArrayList<>();
        badges.add("VERIFIED");
        if (available) badges.add("READY_NOW");
        if (avgRating != null && avgRating.doubleValue() >= 4.5 && ratingCount >= 2) badges.add("TOP_RATED");

        String garagePhone = g.getPhone();
        if (!StringUtils.hasText(garagePhone) && g.getOwner() != null && StringUtils.hasText(g.getOwner().getPhone())) {
            garagePhone = g.getOwner().getPhone().trim();
        } else if (garagePhone != null) {
            garagePhone = garagePhone.trim();
        }

        long completedOrders = rescueRequestRepository.countCompletedByGarageId(g.getId());
        int effectiveTotalOrders = (int) Math.max(g.getTotalOrders() != null ? g.getTotalOrders() : 0, completedOrders);

        return GaragePublicProfileResponse.builder()
                .id(g.getId())
                .name(g.getName())
                .phone(garagePhone)
                .address(g.getAddress())
                .lat(g.getLat())
                .lng(g.getLng())
                .capability(g.getCapability())
                .isOnline(g.getIsOnline())
                .autoAccept(g.getAutoAccept())
                .available(available)
                .availabilityStatus(availabilityStatus)
                .avgRating(avgRating)
                .ratingCount(ratingCount)
                .totalOrders(effectiveTotalOrders)
                .cancelRate(g.getCancelRate())
                .memberSince(g.getApprovedAt() != null ? g.getApprovedAt() : g.getCreatedAt())
                .isVerified(g.getStatus() == GarageStatus.APPROVED)
                .distanceKm(distanceKm)
                .estimatedEtaMin(etaMin)
                .estimatedRescueFee(estimatedRescueFee)
                .score(profileScore)
                .badges(badges)
                .specialties(specialties)
                .coverImageUrl(coverImageUrl)
                .photos(photos)
                .activeStaffCount(activeStaff)
                .totalStaffCount(totalStaff)
                .activeRescueVehicleCount(activeRescueVehicleCount)
                .rescueVehicleCount(rescueVehicleCount)
                .services(allServices)
                .build();
    }


private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double r = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private boolean capabilityMatches(Capability cap, VehicleType type) {
        if (cap == null || type == null) return false;
        if (cap == Capability.BOTH) return true;
        if (type == VehicleType.MOTORBIKE) return cap == Capability.MOTORBIKE;
        if (type == VehicleType.CAR) return cap == Capability.CAR;
        return false;
    }

    private String formatVnd(long amount) {
        return String.format("%,dđ", amount).replace(',', '.');
    }
}
