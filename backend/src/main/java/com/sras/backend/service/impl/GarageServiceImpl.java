package com.sras.backend.service.impl;

import com.sras.backend.dto.request.GarageRegistrationRequest;
import com.sras.backend.dto.request.GarageReviewRequest;
import com.sras.backend.dto.response.GarageDashboardResponse;
import com.sras.backend.dto.response.GarageDocumentResponse;
import com.sras.backend.dto.response.GarageResponse;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageDocument;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.Capability;
import com.sras.backend.entity.enums.GarageDocType;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.repository.GarageDocumentRepository;
import com.sras.backend.repository.GarageRepository;
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
import java.time.OffsetDateTime;
import java.util.ArrayList;
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
    private final GarageServicePriceRepository garageServicePriceRepository;
    private final ServiceRepository serviceRepository;

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
    @Transactional(readOnly = true)
    public GarageDashboardResponse getDashboard(User user) {
        Garage garage = garageRepository.findByOwner(user)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thông tin Gara của bạn"));

        double centerLat = garage.getLat() != null ? garage.getLat() : 10.7769;
        double centerLng = garage.getLng() != null ? garage.getLng() : 106.7009;

        List<GarageDashboardResponse.StaffLocation> staffList = List.of(
                GarageDashboardResponse.StaffLocation.builder()
                        .id(1L)
                        .name("Nguyễn Văn A")
                        .phone("0988.111.222")
                        .lat(centerLat + 0.0035)
                        .lng(centerLng - 0.0028)
                        .isAvailable(true)
                        .build(),
                GarageDashboardResponse.StaffLocation.builder()
                        .id(2L)
                        .name("Trần Văn B")
                        .phone("0988.333.444")
                        .lat(centerLat - 0.0022)
                        .lng(centerLng + 0.0041)
                        .isAvailable(true)
                        .build(),
                GarageDashboardResponse.StaffLocation.builder()
                        .id(3L)
                        .name("Lê Hoàng C")
                        .phone("0988.555.666")
                        .lat(centerLat + 0.0048)
                        .lng(centerLng + 0.0033)
                        .isAvailable(false)
                        .build()
        );

        List<GarageDashboardResponse.PendingRescueOrder> pendingOrders = List.of(
                GarageDashboardResponse.PendingRescueOrder.builder()
                        .id(101L)
                        .orderType("Khẩn cấp • Cứu hộ xe máy")
                        .customerVehicle("Honda SH 150i (59-X1 888.99)")
                        .issueDescription("Xe chết máy giữa đường, đề không lên điện")
                        .timeAgo("Cách 2.1 km • 3 phút trước")
                        .isUrgent(true)
                        .build(),
                GarageDashboardResponse.PendingRescueOrder.builder()
                        .id(102L)
                        .orderType("Cứu hộ ô tô")
                        .customerVehicle("Mazda CX-5 (51K-123.45)")
                        .issueDescription("Nổ lốp trước bên phụ, cần thay lốp dự phòng")
                        .timeAgo("Cách 4.5 km • 12 phút trước")
                        .isUrgent(false)
                        .build()
        );

        List<GarageDashboardResponse.RecentServiceItem> recentServices = List.of(
                GarageDashboardResponse.RecentServiceItem.builder()
                        .id(201L)
                        .customerName("Lê Minh Tâm")
                        .licensePlate("51H-987.65")
                        .serviceName("Thay ắc quy khô GS 45Ah")
                        .technicianName("Nguyễn Văn A")
                        .status("Hoàn thành (1.250.000đ)")
                        .build(),
                GarageDashboardResponse.RecentServiceItem.builder()
                        .id(202L)
                        .customerName("Phạm Quỳnh Anh")
                        .licensePlate("59F-345.12")
                        .serviceName("Kích bình xe máy")
                        .technicianName("Trần Văn B")
                        .status("Hoàn thành (150.000đ)")
                        .build()
        );

        return GarageDashboardResponse.builder()
                .garageName(garage.getName())
                .isOnline(Boolean.TRUE.equals(garage.getIsOnline()))
                .todayRevenue(1200000L)
                .revenueGrowthPercent(12.0)
                .availableStaffCount(3)
                .busyStaffCount(1)
                .onlineStaffLocations(staffList)
                .pendingOrders(pendingOrders)
                .recentServices(recentServices)
                .build();
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

    @Override
    @Transactional(readOnly = true)
    public List<GarageServicePriceResponse> getGarageServices(User user) {
        Garage garage = garageRepository.findByOwner(user)
                .orElseThrow(() -> new BadRequestException("Bạn chưa sở hữu Gara nào"));

        List<Service> catalogServices = serviceRepository.findAll();
        List<GarageServicePrice> existingPrices = garageServicePriceRepository.findByGarage(garage);
        Map<Long, GarageServicePrice> priceMap = existingPrices.stream()
                .collect(Collectors.toMap(p -> p.getService().getId(), p -> p, (a, b) -> a));

        return catalogServices.stream().map(svc -> {
            GarageServicePrice customPrice = priceMap.get(svc.getId());
            if (customPrice != null) {
                return GarageServicePriceResponse.builder()
                        .id(customPrice.getId())
                        .serviceId(svc.getId())
                        .serviceCode(svc.getCode())
                        .serviceName(svc.getName())
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
                        .build();
            } else {
                return GarageServicePriceResponse.builder()
                        .serviceId(svc.getId())
                        .serviceCode(svc.getCode())
                        .serviceName(svc.getName())
                        .feeType(svc.getFeeType())
                        .unit(svc.getUnit())
                        .minPrice(svc.getMinPrice())
                        .maxPrice(svc.getMaxPrice())
                        .price(svc.getMinPrice())
                        .isActive(true)
                        .nightSurgeEnabled(false)
                        .nightSurgePercent(0)
                        .holidaySurgeEnabled(false)
                        .holidaySurgePercent(0)
                        .build();
            }
        }).toList();
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

        return GarageServicePriceResponse.builder()
                .id(saved.getId())
                .serviceId(svc.getId())
                .serviceCode(svc.getCode())
                .serviceName(svc.getName())
                .feeType(svc.getFeeType())
                .unit(svc.getUnit())
                .minPrice(svc.getMinPrice())
                .maxPrice(svc.getMaxPrice())
                .price(saved.getPrice())
                .isActive(saved.getIsActive())
                .distanceTiersJson(saved.getDistanceTiersJson())
                .nightSurgeEnabled(saved.getNightSurgeEnabled())
                .nightSurgePercent(saved.getNightSurgePercent())
                .holidaySurgeEnabled(saved.getHolidaySurgeEnabled())
                .holidaySurgePercent(saved.getHolidaySurgePercent())
                .build();
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
                    p.setPrice(svc.getMinPrice() != null ? svc.getMinPrice() : 100000L);
                    return p;
                });

        priceObj.setIsActive(Boolean.TRUE.equals(isActive));
        GarageServicePrice saved = garageServicePriceRepository.save(priceObj);

        return GarageServicePriceResponse.builder()
                .id(saved.getId())
                .serviceId(svc.getId())
                .serviceCode(svc.getCode())
                .serviceName(svc.getName())
                .feeType(svc.getFeeType())
                .unit(svc.getUnit())
                .minPrice(svc.getMinPrice())
                .maxPrice(svc.getMaxPrice())
                .price(saved.getPrice())
                .isActive(saved.getIsActive())
                .distanceTiersJson(saved.getDistanceTiersJson())
                .nightSurgeEnabled(saved.getNightSurgeEnabled())
                .nightSurgePercent(saved.getNightSurgePercent())
                .holidaySurgeEnabled(saved.getHolidaySurgeEnabled())
                .holidaySurgePercent(saved.getHolidaySurgePercent())
                .build();
    }
}