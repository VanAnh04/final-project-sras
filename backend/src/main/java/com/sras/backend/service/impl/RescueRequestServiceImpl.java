package com.sras.backend.service.impl;

import com.sras.backend.dto.request.AssignStaffRequest;
import com.sras.backend.dto.request.CreateRescueRequestRequest;
import com.sras.backend.dto.response.RescueRequestResponse;
import com.sras.backend.entity.CustomerVehicle;
import com.sras.backend.entity.DispatchOffer;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.RescueRequestPhoto;
import com.sras.backend.entity.RescueStatusHistory;
import com.sras.backend.entity.RescueVehicle;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.ActorType;
import com.sras.backend.entity.enums.CancelledBy;
import com.sras.backend.entity.enums.Capability;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.entity.enums.OfferStatus;
import com.sras.backend.entity.enums.PhotoType;
import com.sras.backend.entity.enums.RequestPaymentMethod;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.VehicleType;
import com.sras.backend.entity.enums.WorkStatus;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.CustomerVehicleRepository;
import com.sras.backend.repository.RatingRepository;
import com.sras.backend.repository.DispatchOfferRepository;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.GarageStaffRepository;
import com.sras.backend.repository.RescueRequestPhotoRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.repository.RescueStatusHistoryRepository;
import com.sras.backend.repository.RescueVehicleRepository;
import com.sras.backend.entity.RescueRequestItem;
import com.sras.backend.entity.SystemWallet;
import com.sras.backend.entity.WalletTransaction;
import com.sras.backend.entity.enums.ItemPhase;
import com.sras.backend.entity.enums.ItemStatus;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.entity.enums.WalletTxnType;
import com.sras.backend.entity.enums.WalletType;
import com.sras.backend.repository.RescueRequestItemRepository;
import com.sras.backend.repository.ServiceRepository;
import com.sras.backend.repository.SystemWalletRepository;
import com.sras.backend.repository.WalletTransactionRepository;
import com.sras.backend.service.NotificationService;
import com.sras.backend.service.RescuePricingConfigService;
import com.sras.backend.service.RescueRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RescueRequestServiceImpl implements RescueRequestService {

    private static final short DEFAULT_RADIUS_KM = 15;
    /** Mỗi lần hết gara thì nới bán kính thêm bấy nhiêu km. */
    private static final short RADIUS_STEP_KM = 10;
    /** Nới tối đa tới đây; vẫn không có gara thì báo NO_GARAGE_FOUND. */
    private static final short MAX_RADIUS_KM = 50;
    private static final int OFFER_TTL_SECONDS = 90;

    private final RescueRequestRepository rescueRequestRepository;
    private final DispatchOfferRepository dispatchOfferRepository;
    private final RescueStatusHistoryRepository statusHistoryRepository;
    private final RescueRequestPhotoRepository photoRepository;
    private final GarageRepository garageRepository;
    private final GarageStaffRepository garageStaffRepository;
    private final RescueVehicleRepository rescueVehicleRepository;
    private final CustomerVehicleRepository customerVehicleRepository;
    private final RatingRepository ratingRepository;
    private final RescueRequestItemRepository rescueRequestItemRepository;
    private final ServiceRepository serviceRepository;
    private final RescuePricingConfigService pricingConfigService;
    private final NotificationService notificationService;
    private final WalletTransactionRepository walletTransactionRepository;
    private final SystemWalletRepository systemWalletRepository;
    private final RescueNotifier rescueNotifier;

    // ─────────────────────────── Khách tạo yêu cầu ───────────────────────────

    @Override
    @Transactional
    public RescueRequestResponse createRequest(User customer, CreateRescueRequestRequest req) {
        RescueRequest r = new RescueRequest();
        r.setCode(generateCode());
        r.setCustomer(customer);
        r.setVehicleType(req.getVehicleType());
        r.setSymptom(req.getSymptom().trim());
        r.setPickupLat(req.getPickupLat());
        r.setPickupLng(req.getPickupLng());
        r.setPickupAddress(req.getPickupAddress());
        r.setLocationNote(req.getLocationNote());
        r.setIssueType(req.getIssueType());
        r.setContactPhone(req.getContactPhone());
        r.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : RequestPaymentMethod.CASH);
        r.setSearchRadiusKm(DEFAULT_RADIUS_KM);
        r.setStatus(RescueStatus.SEARCHING);

        if (req.getCustomerVehicleId() != null) {
            CustomerVehicle cv = customerVehicleRepository.findById(req.getCustomerVehicleId()).orElse(null);
            if (cv != null && cv.getCustomer().getId().equals(customer.getId())) {
                r.setCustomerVehicle(cv);
            }
        }

        RescueRequest saved = rescueRequestRepository.save(r);
        recordHistory(saved, null, RescueStatus.SEARCHING, customer, ActorType.CUSTOMER, "Khách gửi yêu cầu cứu hộ");

        // Ảnh xe / hiện trường
        if (req.getPhotoUrls() != null) {
            for (String url : req.getPhotoUrls()) {
                if (url == null || url.isBlank()) continue;
                RescueRequestPhoto photo = new RescueRequestPhoto();
                photo.setRequest(saved);
                photo.setPhotoUrl(url.trim());
                photo.setPhotoType(PhotoType.CUSTOMER_ISSUE);
                photo.setUploadedBy(customer);
                photoRepository.save(photo);
            }
        }

        if (req.getGarageId() != null) {
            // ─── Chế độ "chọn gara trước" ───
            dispatchToChosenGarage(saved, req.getGarageId());
        } else {
            // Điều phối tuần tự: mời gara gần nhất trước, nới bán kính nếu cần.
            boolean sent = dispatchNextGarage(saved);
            if (!sent) {
                saved.setStatus(RescueStatus.NO_GARAGE_FOUND);
                recordHistory(saved, RescueStatus.SEARCHING, RescueStatus.NO_GARAGE_FOUND, null, ActorType.SYSTEM,
                        "Không tìm thấy gara trong bán kính tối đa " + MAX_RADIUS_KM + "km");
                rescueNotifier.noGarageFound(saved, null);
            } else if (saved.getStatus() != RescueStatus.ACCEPTED) {
                // Chưa auto-accept → chờ gara xác nhận. (Nếu đã ACCEPTED thì acceptOffer đã set + ghi history.)
                saved.setStatus(RescueStatus.PENDING_GARAGE);
                recordHistory(saved, RescueStatus.SEARCHING, RescueStatus.PENDING_GARAGE, null, ActorType.SYSTEM,
                        "Đã gửi lời mời tới gara gần nhất (bán kính " + saved.getSearchRadiusKm() + "km)");
            }
        }
        rescueRequestRepository.save(saved);

        log.info("Rescue request {} created by user {} (garageId={})", saved.getCode(), customer.getId(), req.getGarageId());
        return toResponse(saved);
    }

    /**
     * Gửi lời mời cứu hộ trực tiếp tới gara mà khách hàng đã chủ động lựa chọn.
     */
    private void dispatchToChosenGarage(RescueRequest req, Long garageId) {
        Garage g = garageRepository.findById(garageId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy Gara đã chọn"));
        if (g.getStatus() != GarageStatus.APPROVED) {
            throw new BadRequestException("Gara đã chọn hiện không hoạt động");
        }
        if (!Boolean.TRUE.equals(g.getIsOnline())) {
            throw new BadRequestException("Gara đã chọn hiện đang ngoại tuyến");
        }
        if (!capabilityMatches(g.getCapability(), req.getVehicleType())) {
            throw new BadRequestException("Gara đã chọn không hỗ trợ loại phương tiện của bạn");
        }

        double dist = haversineKm(req.getPickupLat(), req.getPickupLng(), g.getLat(), g.getLng());
        req.setGarage(g);
        req.setDispatchDistanceKm(BigDecimal.valueOf(dist).setScale(2, RoundingMode.HALF_UP));
        req.setSearchRadiusKm((short) Math.max(DEFAULT_RADIUS_KM, Math.ceil(dist)));
        req.setStatus(RescueStatus.PENDING_GARAGE);

        OffsetDateTime now = OffsetDateTime.now();
        DispatchOffer offer = new DispatchOffer();
        offer.setRequest(req);
        offer.setGarage(g);
        offer.setRank((short) 1);
        offer.setDistanceKm(BigDecimal.valueOf(dist).setScale(2, RoundingMode.HALF_UP));
        offer.setEtaMinutes((short) Math.max(5, Math.round(dist * 3)));
        offer.setQuotedFee(pricingConfigService.calculateRescueFee(req.getVehicleType(), dist, now));
        offer.setQuotedTowingFee(0L);
        offer.setEstimatedObligation(0L);
        offer.setStatus(OfferStatus.SENT);
        offer.setSentAt(now);
        offer.setExpiresAt(now.plusSeconds(OFFER_TTL_SECONDS));
        dispatchOfferRepository.save(offer);

        if (Boolean.TRUE.equals(g.getAutoAccept())) {
            acceptOffer(req, g, offer, null, ActorType.SYSTEM,
                    "Gara " + g.getName() + " tự động nhận yêu cầu");
        } else {
            recordHistory(req, RescueStatus.SEARCHING, RescueStatus.PENDING_GARAGE, null, ActorType.SYSTEM,
                    "Đã gửi yêu cầu trực tiếp tới gara " + g.getName());
            rescueNotifier.offerSent(req, g, offer.getDistanceKm());
        }
    }


    /**
     * Điều phối tuần tự: mời DUY NHẤT 1 gara gần nhất chưa từng được mời, trong bán kính
     * hiện tại. Nếu bán kính hiện tại đã hết gara thì nới rộng dần từng bậc tới giới hạn
     * tối đa. Trả về true nếu đã gửi được lời mời cho 1 gara.
     */
    private boolean dispatchNextGarage(RescueRequest req) {
        if (offerNearestGarage(req)) return true;
        while (req.getSearchRadiusKm() < MAX_RADIUS_KM) {
            short next = (short) Math.min(MAX_RADIUS_KM, req.getSearchRadiusKm() + RADIUS_STEP_KM);
            req.setSearchRadiusKm(next);
            if (offerNearestGarage(req)) return true;
        }
        return false;
    }

    /** Mời gara gần nhất CHƯA được mời trong bán kính hiện tại. true nếu tạo được lời mời. */
    private boolean offerNearestGarage(RescueRequest req) {
        List<Garage> candidates = garageRepository
                .findByStatusAndIsOnlineTrueAndIsDeletedFalse(GarageStatus.APPROVED);

        // Bỏ qua gara đã có lời mời (đã từ chối / đang treo) để không mời lại.
        Set<Long> alreadyOffered = dispatchOfferRepository.findByRequest(req).stream()
                .map(o -> o.getGarage().getId())
                .collect(Collectors.toSet());

        Garage best = null;
        double bestDist = Double.MAX_VALUE;
        for (Garage g : candidates) {
            if (g.getLat() == null || g.getLng() == null) continue;
            if (alreadyOffered.contains(g.getId())) continue;
            if (!capabilityMatches(g.getCapability(), req.getVehicleType())) continue;

            // Gara phải có nhân viên rảnh và xe cứu hộ rảnh phù hợp mới được gửi lời mời
            long freeStaff = garageStaffRepository.countByGarageAndIsDeletedFalseAndIsActiveTrueAndStatus(g, WorkStatus.FREE);
            if (freeStaff <= 0) continue;

            List<RescueVehicle> freeVehicles = rescueVehicleRepository.findByGarageAndIsDeletedFalseAndIsActiveTrueAndStatus(g, WorkStatus.FREE);
            boolean hasMatchingVehicle = freeVehicles.stream().anyMatch(v -> capabilityMatches(v.getCapability(), req.getVehicleType()));
            if (!hasMatchingVehicle) continue;

            double dist = haversineKm(req.getPickupLat(), req.getPickupLng(), g.getLat(), g.getLng());
            if (dist <= req.getSearchRadiusKm() && dist < bestDist) {
                best = g;
                bestDist = dist;
            }
        }
        if (best == null) return false;

        OffsetDateTime now = OffsetDateTime.now();
        DispatchOffer offer = new DispatchOffer();
        offer.setRequest(req);
        offer.setGarage(best);
        offer.setRank((short) (alreadyOffered.size() + 1)); // gara thứ mấy được mời
        offer.setDistanceKm(BigDecimal.valueOf(bestDist).setScale(2, RoundingMode.HALF_UP));
        offer.setEtaMinutes((short) Math.max(5, Math.round(bestDist * 3)));
        offer.setQuotedFee(pricingConfigService.calculateRescueFee(req.getVehicleType(), bestDist, now));
        offer.setQuotedTowingFee(0L);
        offer.setEstimatedObligation(0L);
        offer.setStatus(OfferStatus.SENT);
        offer.setSentAt(now);
        offer.setExpiresAt(now.plusSeconds(OFFER_TTL_SECONDS));
        dispatchOfferRepository.save(offer);

        // Gara bật "tự động nhận" → hệ thống chốt luôn, khách thấy thông tin gara ngay.
        if (Boolean.TRUE.equals(best.getAutoAccept())) {
            acceptOffer(req, best, offer, null, ActorType.SYSTEM,
                    "Gara " + best.getName() + " tự động nhận yêu cầu");
        } else {
            rescueNotifier.offerSent(req, best, offer.getDistanceKm());
        }
        return true;
    }

    // ─────────────────────────── Background Scheduler: Xử lý hết hạn 90s ───────────────────────────

    /**
     * Tiến trình ngầm quét mỗi 5s để tự động hết hạn các đơn cứu hộ quá 90s mà không có gara nhận.
     * Giải quyết triệt để vấn đề người dùng đặt đơn xong đăng xuất / tắt app thì đơn vẫn được xử lý.
     */
    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void processExpiredDispatchOffers() {
        OffsetDateTime now = OffsetDateTime.now();
        List<DispatchOffer> expiredOffers = dispatchOfferRepository.findExpiredOffers(OfferStatus.SENT, now);
        if (expiredOffers.isEmpty()) {
            return;
        }

        for (DispatchOffer offer : expiredOffers) {
            try {
                handleOfferExpiration(offer, now);
            } catch (Exception e) {
                log.error("Lỗi khi xử lý hết hạn offer id={}: {}", offer.getId(), e.getMessage(), e);
            }
        }
    }

    /**
     * Xử lý hết hạn 1 lời mời điều phối:
     * - Đơn chọn đích danh 1 gara: quá 90s không nhận -> DECLINED (coi như gara từ chối)
     * - Đơn cứu hộ khẩn cấp: quá 90s không nhận -> chuyển tiếp gara kế tiếp; nếu hết bán kính tối đa 50km -> NO_GARAGE_FOUND (không phải huỷ)
     */
    @Transactional
    public void handleOfferExpiration(DispatchOffer offer, OffsetDateTime now) {
        if (offer.getStatus() != OfferStatus.SENT) {
            return;
        }

        offer.setStatus(OfferStatus.TIMEOUT);
        offer.setRespondedAt(now);
        dispatchOfferRepository.save(offer);

        RescueRequest req = offer.getRequest();
        if (req == null || (req.getStatus() != RescueStatus.PENDING_GARAGE && req.getStatus() != RescueStatus.SEARCHING)) {
            return;
        }

        // 1. Trường hợp khách chọn đích danh 1 gara (req.getGarage() != null)
        // Nếu không đồng ý hoặc quá 90s đều được coi là bị từ chối (DECLINED)
        if (req.getGarage() != null) {
            req.setStatus(RescueStatus.DECLINED);
            rescueRequestRepository.save(req);

            String garageName = offer.getGarage() != null ? offer.getGarage().getName() : req.getGarage().getName();
            recordHistory(req, RescueStatus.PENDING_GARAGE, RescueStatus.DECLINED, null, ActorType.SYSTEM,
                    "Hết thời gian chờ gara " + garageName + " phản hồi (90s) - Coi như gara từ chối");

            notificationService.createNotification(
                    req.getCustomer(),
                    NotificationType.SYSTEM_WARNING,
                    "Gara đã không phản hồi",
                    "Gara " + garageName + " không phản hồi sau 90 giây. Bạn có thể chọn gara khác hoặc chuyển sang cứu hộ khẩn cấp.",
                    "RESCUE_REQUEST",
                    req.getId()
            );
            log.info("Yêu cầu {} chuyển sang DECLINED do gara {} không nhận sau 90s", req.getCode(), garageName);
            return;
        }

        // 2. Trường hợp cứu hộ khẩn cấp (điều phối tuần tự)
        // Gara hiện tại không nhận trong 90s -> chuyển tiếp sang gara tiếp theo
        String prevGarageName = offer.getGarage() != null ? offer.getGarage().getName() : "Gara";
        recordHistory(req, RescueStatus.PENDING_GARAGE, RescueStatus.PENDING_GARAGE, null, ActorType.SYSTEM,
                "Gara " + prevGarageName + " không phản hồi sau 90s - Chuyển tiếp tìm gara tiếp theo");

        boolean sent = dispatchNextGarage(req);
        if (!sent) {
            // Đã quét hết gara trong bán kính tối đa (MAX_RADIUS_KM = 50km) mà không có ai nhận -> NO_GARAGE_FOUND
            req.setStatus(RescueStatus.NO_GARAGE_FOUND);
            rescueRequestRepository.save(req);
            recordHistory(req, RescueStatus.PENDING_GARAGE, RescueStatus.NO_GARAGE_FOUND, null, ActorType.SYSTEM,
                    "Không tìm thấy gara nào nhận đơn trong bán kính tối đa " + MAX_RADIUS_KM + "km sau khi hết hạn 90s");

            rescueNotifier.noGarageFound(req, null);
            log.info("Yêu cầu khẩn cấp {} chuyển sang NO_GARAGE_FOUND do không còn gara nhận (quá bán kính {}km)", req.getCode(), MAX_RADIUS_KM);
        } else {
            if (req.getStatus() != RescueStatus.ACCEPTED) {
                req.setStatus(RescueStatus.PENDING_GARAGE);
                rescueRequestRepository.save(req);
            }
            log.info("Yêu cầu khẩn cấp {} đã chuyển tiếp sang gara tiếp theo sau khi offer {} hết hạn 90s", req.getCode(), offer.getId());
        }
    }

    /**
     * Kiểm tra tức thì khi có request truy vấn, đảm bảo client nhận trạng thái mới nhất ngay lập tức mà không cần đợi tick scheduler.
     */
    private void checkAndExpireRequestIfTimeout(RescueRequest req) {
        if (req == null || (req.getStatus() != RescueStatus.PENDING_GARAGE && req.getStatus() != RescueStatus.SEARCHING)) {
            return;
        }
        OffsetDateTime now = OffsetDateTime.now();
        List<DispatchOffer> offers = dispatchOfferRepository.findByRequest(req);
        for (DispatchOffer offer : offers) {
            if (offer.getStatus() == OfferStatus.SENT && offer.getExpiresAt() != null && offer.getExpiresAt().isBefore(now)) {
                handleOfferExpiration(offer, now);
            }
        }
    }

    // ─────────────────────────── Khách huỷ ───────────────────────────

    @Override
    @Transactional
    public RescueRequestResponse cancelByCustomer(User customer, Long requestId) {
        RescueRequest req = requireRequest(requestId);
        if (!req.getCustomer().getId().equals(customer.getId())) {
            throw new UnauthorizedException("Bạn không có quyền huỷ yêu cầu này");
        }
        RescueStatus from = req.getStatus();
        boolean cancellable = from == RescueStatus.SEARCHING
                || from == RescueStatus.PENDING_GARAGE
                || from == RescueStatus.ACCEPTED;
        if (!cancellable) {
            throw new BadRequestException("Chỉ có thể huỷ khi đơn đang tìm gara hoặc vừa được gara nhận");
        }

        // Chủ gara cần được báo hủy: gara đã nhận đơn + các gara đang giữ lời mời.
        Map<Long, User> ownersToNotify = new LinkedHashMap<>();
        if (req.getGarage() != null && req.getGarage().getOwner() != null) {
            ownersToNotify.put(req.getGarage().getOwner().getId(), req.getGarage().getOwner());
        }

        // Đóng mọi lời mời còn treo để gara không nhận đơn "ma".
        OffsetDateTime now = OffsetDateTime.now();
        for (DispatchOffer o : dispatchOfferRepository.findByRequest(req)) {
            if (o.getStatus() == OfferStatus.SENT) {
                User owner = o.getGarage().getOwner();
                if (owner != null) ownersToNotify.putIfAbsent(owner.getId(), owner);
                o.setStatus(OfferStatus.SKIPPED);
                o.setRespondedAt(now);
                dispatchOfferRepository.save(o);
            }
        }

        req.setStatus(RescueStatus.CANCELLED);
        req.setCancelledBy(CancelledBy.CUSTOMER);
        rescueRequestRepository.save(req);
        recordHistory(req, from, RescueStatus.CANCELLED, customer, ActorType.CUSTOMER, "Khách huỷ yêu cầu");
        rescueNotifier.cancelledByCustomer(req, customer, ownersToNotify.values());

        log.info("Rescue request {} cancelled by customer {}", req.getCode(), customer.getId());
        return toResponse(req);
    }

    // ─────────────────────────── Gara nhận + gán nhân viên ───────────────────────────

    @Override
    @Transactional
    public RescueRequestResponse garageAccept(User garageOwner, Long requestId) {
        Garage garage = requireGarage(garageOwner);
        RescueRequest req = requireRequest(requestId);

        if (req.getStatus() != RescueStatus.PENDING_GARAGE) {
            throw new BadRequestException("Yêu cầu không còn ở trạng thái chờ nhận");
        }
        DispatchOffer offer = dispatchOfferRepository.findByRequestAndGarage(req, garage)
                .orElseThrow(() -> new BadRequestException("Gara của bạn không có lời mời cho yêu cầu này"));
        if (offer.getStatus() != OfferStatus.SENT) {
            throw new BadRequestException("Lời mời đã hết hiệu lực hoặc đã được xử lý");
        }
        if (offer.getExpiresAt() != null && offer.getExpiresAt().isBefore(OffsetDateTime.now())) {
            handleOfferExpiration(offer, OffsetDateTime.now());
            throw new BadRequestException("Lời mời đã hết thời gian phản hồi (quá 90 giây)");
        }

        // 1. Kiểm tra nhân viên cứu hộ sẵn sàng (trạng thái rảnh FREE)
        long freeStaffCount = garageStaffRepository.countByGarageAndIsDeletedFalseAndIsActiveTrueAndStatus(garage, WorkStatus.FREE);
        if (freeStaffCount <= 0) {
            throw new BadRequestException("Gara hiện không có nhân viên nào đang sẵn sàng (trạng thái rảnh) để nhận đơn");
        }

        // 2. Kiểm tra xe cứu hộ sẵn sàng (trạng thái rảnh FREE)
        List<RescueVehicle> freeVehicles = rescueVehicleRepository.findByGarageAndIsDeletedFalseAndIsActiveTrueAndStatus(garage, WorkStatus.FREE);
        if (freeVehicles.isEmpty()) {
            throw new BadRequestException("Gara hiện không có xe cứu hộ nào đang sẵn sàng (trạng thái rảnh) để nhận đơn");
        }

        // 3. Kiểm tra xe cứu hộ phù hợp với loại phương tiện cần cứu hộ
        boolean hasMatchingVehicle = freeVehicles.stream().anyMatch(v -> capabilityMatches(v.getCapability(), req.getVehicleType()));
        if (!hasMatchingVehicle) {
            String vehicleTypeName = req.getVehicleType() == VehicleType.CAR ? "Ô tô" : "Xe máy";
            throw new BadRequestException("Gara không có xe cứu hộ phù hợp với loại phương tiện (" + vehicleTypeName + ") đang sẵn sàng để nhận đơn");
        }

        acceptOffer(req, garage, offer, garageOwner, ActorType.GARAGE_OWNER,
                "Gara " + garage.getName() + " đã nhận yêu cầu");
        return toResponse(req);
    }

    /**
     * Chốt 1 lời mời: gán gara vào đơn, chuyển ACCEPTED, chốt phí, đóng các lời mời khác.
     * Dùng chung cho: gara bấm nhận thủ công VÀ hệ thống tự động nhận (auto-accept).
     */
    private void acceptOffer(RescueRequest req, Garage garage, DispatchOffer offer,
                             User actor, ActorType actorType, String note) {
        // Kiểm tra an toàn trước khi chốt đơn
        long freeStaffCount = garageStaffRepository.countByGarageAndIsDeletedFalseAndIsActiveTrueAndStatus(garage, WorkStatus.FREE);
        if (freeStaffCount <= 0) {
            throw new BadRequestException("Gara hiện không có nhân viên nào đang sẵn sàng để nhận đơn");
        }
        List<RescueVehicle> freeVehicles = rescueVehicleRepository.findByGarageAndIsDeletedFalseAndIsActiveTrueAndStatus(garage, WorkStatus.FREE);
        if (freeVehicles.isEmpty()) {
            throw new BadRequestException("Gara hiện không có xe cứu hộ nào đang sẵn sàng để nhận đơn");
        }
        boolean hasMatchingVehicle = freeVehicles.stream().anyMatch(v -> capabilityMatches(v.getCapability(), req.getVehicleType()));
        if (!hasMatchingVehicle) {
            String vehicleTypeName = req.getVehicleType() == VehicleType.CAR ? "Ô tô" : "Xe máy";
            throw new BadRequestException("Gara không có xe cứu hộ phù hợp (" + vehicleTypeName + ") đang sẵn sàng");
        }

        RescueStatus from = req.getStatus();
        req.setGarage(garage);
        req.setStatus(RescueStatus.ACCEPTED);
        req.setDispatchDistanceKm(offer.getDistanceKm());
        req.setRescueFee(offer.getQuotedFee());
        req.setQuotedTowingFee(offer.getQuotedTowingFee());
        req.setTowingFee(0L);
        req.setServiceFee(0L);
        long initialTotal = offer.getQuotedFee() != null ? offer.getQuotedFee() : 0L;
        req.setTotalAmount(initialTotal);
        if (garage.getCommissionRate() != null) {
            req.setCommissionRate(garage.getCommissionRate().movePointLeft(2)); // 15.0% → 0.150
            req.setCommissionAmount(Math.round(initialTotal * req.getCommissionRate().doubleValue()));
        }
        // @Version trên rescue_requests ngăn 2 gara nhận cùng lúc (E-02)
        rescueRequestRepository.save(req);

        OffsetDateTime now = OffsetDateTime.now();
        offer.setStatus(OfferStatus.ACCEPTED);
        offer.setRespondedAt(now);
        dispatchOfferRepository.save(offer);

        for (DispatchOffer other : dispatchOfferRepository.findByRequest(req)) {
            if (!other.getId().equals(offer.getId()) && other.getStatus() == OfferStatus.SENT) {
                other.setStatus(OfferStatus.SKIPPED);
                other.setRespondedAt(now);
                dispatchOfferRepository.save(other);
            }
        }

        recordHistory(req, from, RescueStatus.ACCEPTED, actor, actorType, note);
        rescueNotifier.garageAccepted(req, actor, actorType == ActorType.SYSTEM);
    }

    @Override
    @Transactional
    public RescueRequestResponse garageDecline(User garageOwner, Long requestId) {
        Garage garage = requireGarage(garageOwner);
        RescueRequest req = requireRequest(requestId);

        if (req.getStatus() != RescueStatus.PENDING_GARAGE) {
            throw new BadRequestException("Yêu cầu không còn ở trạng thái chờ nhận");
        }
        DispatchOffer offer = dispatchOfferRepository.findByRequestAndGarage(req, garage)
                .orElseThrow(() -> new BadRequestException("Gara của bạn không có lời mời cho yêu cầu này"));

        OffsetDateTime now = OffsetDateTime.now();
        offer.setStatus(OfferStatus.REJECTED);
        offer.setRespondedAt(now);
        dispatchOfferRepository.save(offer);

        // Trường hợp khách chỉ định gara trước: gara từ chối thì kết thúc với trạng thái DECLINED
        // để khách chủ động chọn gara khác hoặc chuyển sang cứu hộ khẩn cấp.
        if (req.getGarage() != null) {
            req.setStatus(RescueStatus.DECLINED);
            rescueRequestRepository.save(req);
            recordHistory(req, RescueStatus.PENDING_GARAGE, RescueStatus.DECLINED, garageOwner,
                    ActorType.GARAGE_OWNER,
                    "Gara " + garage.getName() + " từ chối tiếp nhận yêu cầu cứu hộ");
            notificationService.createNotification(
                    req.getCustomer(),
                    NotificationType.SYSTEM_WARNING,
                    "Gara đã từ chối yêu cầu",
                    "Gara " + garage.getName() + " không thể nhận yêu cầu " + req.getCode() + " lúc này. Bạn có thể chọn gara khác hoặc gửi cứu hộ khẩn cấp.",
                    "RESCUE_REQUEST",
                    req.getId()
            );
            return toResponse(req);
        }

        // Tuần tự (cứu hộ khẩn cấp): gara từ chối → quét mời gara gần nhất KẾ TIẾP (nới bán kính nếu cần).
        // Chỉ khi đã hết gara trong bán kính tối đa mới báo không tìm được gara.
        boolean sent = dispatchNextGarage(req);
        if (!sent) {
            req.setStatus(RescueStatus.NO_GARAGE_FOUND);
            rescueRequestRepository.save(req);
            recordHistory(req, RescueStatus.PENDING_GARAGE, RescueStatus.NO_GARAGE_FOUND, garageOwner,
                    ActorType.GARAGE_OWNER,
                    "Gara " + garage.getName() + " từ chối — không còn gara nào trong bán kính tối đa "
                            + MAX_RADIUS_KM + "km");
            rescueNotifier.noGarageFound(req, garageOwner);
        } else if (req.getStatus() != RescueStatus.ACCEPTED) {
            // Gara kế tiếp chưa auto-accept → tiếp tục chờ. (Nếu auto-accept thì acceptOffer đã xử lý.)
            rescueRequestRepository.save(req); // lưu bán kính mới (nếu đã nới rộng)
            recordHistory(req, RescueStatus.PENDING_GARAGE, RescueStatus.PENDING_GARAGE, garageOwner,
                    ActorType.GARAGE_OWNER,
                    "Gara " + garage.getName() + " từ chối — đã chuyển sang gara kế tiếp (bán kính "
                            + req.getSearchRadiusKm() + "km)");
        }
        return toResponse(req);
    }

    @Override
    @Transactional
    public RescueRequestResponse assignStaff(User garageOwner, Long requestId, AssignStaffRequest dto) {
        Garage garage = requireGarage(garageOwner);
        RescueRequest req = requireRequest(requestId);

        if (req.getGarage() == null || !req.getGarage().getId().equals(garage.getId())) {
            throw new BadRequestException("Yêu cầu không thuộc gara của bạn");
        }
        if (req.getStatus() != RescueStatus.ACCEPTED) {
            throw new BadRequestException("Chỉ gán nhân viên khi yêu cầu đã được nhận");
        }

        GarageStaff staff = garageStaffRepository.findByIdAndGarage(dto.getStaffId(), garage)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy nhân viên thuộc gara"));
        RescueVehicle vehicle = rescueVehicleRepository.findByIdAndGarage(dto.getRescueVehicleId(), garage)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy xe cứu hộ thuộc gara"));

        // Không cho gán nhân viên/xe đang bận với đơn khác.
        if (staff.getStatus() == WorkStatus.BUSY) {
            throw new BadRequestException("Nhân viên đang thực hiện đơn khác, vui lòng chọn nhân viên khác");
        }
        if (Boolean.FALSE.equals(staff.getIsActive())) {
            throw new BadRequestException("Nhân viên không còn hoạt động");
        }
        if (vehicle.getStatus() == WorkStatus.BUSY) {
            throw new BadRequestException("Xe cứu hộ đang bận với đơn khác, vui lòng chọn xe khác");
        }

        req.setStaff(staff);
        req.setRescueVehicle(vehicle);
        req.setStatus(RescueStatus.ASSIGNED);
        staff.setStatus(WorkStatus.BUSY);
        vehicle.setStatus(WorkStatus.BUSY);
        garageStaffRepository.save(staff);
        rescueVehicleRepository.save(vehicle);
        rescueRequestRepository.save(req);

        recordHistory(req, RescueStatus.ACCEPTED, RescueStatus.ASSIGNED, garageOwner, ActorType.GARAGE_OWNER,
                "Gán nhân viên " + staff.getUser().getFullName() + " · xe " + vehicle.getLicensePlate());
        rescueNotifier.staffAssigned(req, garageOwner);
        return toResponse(req);
    }

    // ─────────────────────────── Tuần tự trạng thái ───────────────────────────

    @Override
    @Transactional
    public RescueRequestResponse advanceStatus(User actor, Long requestId, RescueStatus target) {
        RescueRequest req = requireRequest(requestId);
        RescueStatus from = req.getStatus();

        if (from == target) {
            return toResponse(req);
        }

        // Customer có thể duyệt báo giá: DIAGNOSED/ARRIVED -> REPAIRING_ONSITE hoặc TOW_TO_GARAGE
        if ((from == RescueStatus.DIAGNOSED || from == RescueStatus.ARRIVED) && (target == RescueStatus.REPAIRING_ONSITE || target == RescueStatus.TOW_TO_GARAGE)) {
            assertCanView(actor, req);
        } else {
            assertGarageSideAccess(actor, req);
        }

        boolean ok = (from == RescueStatus.ASSIGNED && target == RescueStatus.EN_ROUTE)
                || (from == RescueStatus.ACCEPTED && target == RescueStatus.EN_ROUTE)
                || (from == RescueStatus.EN_ROUTE && target == RescueStatus.ARRIVED)
                || (from == RescueStatus.ARRIVED && target == RescueStatus.DIAGNOSED)
                || (from == RescueStatus.ARRIVED && target == RescueStatus.REPAIRING_ONSITE)
                || (from == RescueStatus.ARRIVED && target == RescueStatus.COMPLETED)
                || (from == RescueStatus.DIAGNOSED && target == RescueStatus.REPAIRING_ONSITE)
                || (from == RescueStatus.DIAGNOSED && target == RescueStatus.TOWING)
                || (from == RescueStatus.DIAGNOSED && target == RescueStatus.TOW_TO_GARAGE)
                || (from == RescueStatus.DIAGNOSED && target == RescueStatus.COMPLETED)
                || (from == RescueStatus.TOWING && target == RescueStatus.TOW_TO_GARAGE)
                || (from == RescueStatus.TOWING && target == RescueStatus.COMPLETED)
                || (from == RescueStatus.REPAIRING_ONSITE && target == RescueStatus.TOW_TO_GARAGE)
                || (from == RescueStatus.REPAIRING_ONSITE && target == RescueStatus.COMPLETED)
                || (from == RescueStatus.TOW_TO_GARAGE && target == RescueStatus.COMPLETED);
        if (!ok) {
            throw new BadRequestException("Không thể chuyển từ " + from + " sang " + target);
        }

        OffsetDateTime now = OffsetDateTime.now();
        req.setStatus(target);
        if (target == RescueStatus.TOW_TO_GARAGE || target == RescueStatus.TOWING || target == RescueStatus.REPAIRING_ONSITE || target == RescueStatus.COMPLETED) {
            if (req.getQuoteStatus() == null || "PENDING".equalsIgnoreCase(req.getQuoteStatus())) {
                req.setQuoteStatus("APPROVED");
                List<RescueRequestItem> pendingItems = rescueRequestItemRepository.findByRequestOrderByIdAsc(req);
                if (pendingItems != null && !pendingItems.isEmpty()) {
                    for (RescueRequestItem it : pendingItems) {
                        if (it.getStatus() == ItemStatus.PENDING) {
                            it.setStatus(ItemStatus.APPROVED);
                        }
                    }
                    rescueRequestItemRepository.saveAll(pendingItems);
                }
            }
        }
        if (target == RescueStatus.EN_ROUTE) {
            req.setEnRouteAt(now);
        } else if (target == RescueStatus.ARRIVED) {
            req.setArrivedAt(now);
        } else if (target == RescueStatus.COMPLETED) {
            req.setCompletedAt(now);
            if (req.getStaff() != null) {
                req.getStaff().setStatus(WorkStatus.FREE);
                garageStaffRepository.save(req.getStaff());
            }
            if (req.getRescueVehicle() != null) {
                req.getRescueVehicle().setStatus(WorkStatus.FREE);
                rescueVehicleRepository.save(req.getRescueVehicle());
            }
        }
        rescueRequestRepository.save(req);

        ActorType actorType = actor.getRole() == UserRole.GARAGE_STAFF ? ActorType.GARAGE_STAFF
                : (actor.getRole() == UserRole.CUSTOMER ? ActorType.CUSTOMER : ActorType.GARAGE_OWNER);
        recordHistory(req, from, target, actor, actorType, null);
        rescueNotifier.statusAdvanced(req, actor, target);
        return toResponse(req);
    }

    @Override
    @Transactional
    public RescueRequestResponse updateRescuerLocation(User actor, Long requestId, double lat, double lng) {
        RescueRequest req = requireRequest(requestId);
        assertGarageSideAccess(actor, req);

        // Chỉ ghi nhận vị trí khi đơn đang trong hành trình cứu hộ.
        RescueStatus s = req.getStatus();
        if (s != RescueStatus.ASSIGNED && s != RescueStatus.EN_ROUTE && s != RescueStatus.ARRIVED
                && s != RescueStatus.DIAGNOSED && s != RescueStatus.REPAIRING_ONSITE && s != RescueStatus.TOWING && s != RescueStatus.TOW_TO_GARAGE) {
            throw new BadRequestException("Chỉ cập nhật vị trí khi đơn đang được cứu hộ");
        }

        OffsetDateTime now = OffsetDateTime.now();
        rescueRequestRepository.updateRescuerLocationQuick(requestId, lat, lng, now);
        return RescueRequestResponse.builder()
                .id(req.getId())
                .status(s)
                .rescuerLat(lat)
                .rescuerLng(lng)
                .rescuerLocationAt(now)
                .build();
    }

    // ─────────────────────────── Truy vấn ───────────────────────────

    @Override
    @Transactional
    public RescueRequestResponse getRequest(User user, Long id) {
        RescueRequest req = requireRequest(id);
        checkAndExpireRequestIfTimeout(req);
        assertCanView(user, req);
        return toResponse(req);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RescueRequestResponse> listMyRequests(User customer) {
        return toResponseList(rescueRequestRepository.findCustomerRequestsEager(customer));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RescueRequestResponse> listGarageOffers(User garageOwner) {
        Garage garage = requireGarage(garageOwner);
        OffsetDateTime now = OffsetDateTime.now();
        List<DispatchOffer> offers = dispatchOfferRepository.findByGarageAndStatusOrderByCreatedAtDesc(garage, OfferStatus.SENT)
                .stream()
                .filter(offer -> offer.getRequest().getStatus() == RescueStatus.PENDING_GARAGE)
                .filter(offer -> offer.getExpiresAt() == null || offer.getExpiresAt().isAfter(now))
                .toList();
        List<RescueRequest> reqs = offers.stream().map(DispatchOffer::getRequest).toList();
        List<RescueRequestResponse> responses = toResponseList(reqs);
        Map<Long, RescueRequestResponse> respMap = responses.stream()
                .collect(Collectors.toMap(RescueRequestResponse::getId, Function.identity(), (a, b) -> a));

        return offers.stream().map(offer -> {
            RescueRequestResponse resp = respMap.get(offer.getRequest().getId());
            if (resp == null) return null;
            if (offer.getQuotedFee() != null) {
                resp.setRescueFee(offer.getQuotedFee());
                resp.setMinPayableAmount(offer.getQuotedFee());
                resp.setInspectionFee(offer.getQuotedFee());
                resp.setTotalAmount(offer.getQuotedFee());
            }
            if (offer.getDistanceKm() != null) {
                resp.setDispatchDistanceKm(offer.getDistanceKm());
            }
            return resp;
        }).filter(Objects::nonNull).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RescueRequestResponse> listGarageActive(User garageOwner) {
        Garage garage = requireGarage(garageOwner);
        List<RescueStatus> active = List.of(
                RescueStatus.ACCEPTED, RescueStatus.ASSIGNED, RescueStatus.EN_ROUTE, RescueStatus.ARRIVED,
                RescueStatus.DIAGNOSED, RescueStatus.REPAIRING_ONSITE, RescueStatus.TOW_TO_GARAGE, RescueStatus.TOWING, RescueStatus.AWAITING_PAYMENT);
        return toResponseList(rescueRequestRepository.findGarageActiveEager(garage, active));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RescueRequestResponse> listGarageHistory(User garageOwner) {
        Garage garage = requireGarage(garageOwner);
        List<RescueStatus> processedStatuses = List.of(
                RescueStatus.COMPLETED, RescueStatus.PAID, RescueStatus.RATED,
                RescueStatus.CANCELLED, RescueStatus.DECLINED);
        return toResponseList(rescueRequestRepository.findGarageHistoryEager(garage, processedStatuses));
    }

    @Override
    @Transactional(readOnly = true)
    public RescueRequestResponse getStaffActive(User staffUser) {
        GarageStaff staff = garageStaffRepository.findByUserAndIsActiveTrue(staffUser).orElse(null);
        if (staff == null) {
            return null;
        }
        return rescueRequestRepository.findByStaffAndIsDeletedFalseOrderByCreatedAtDesc(staff)
                .stream()
                .filter(this::isStaffActionable)
                .findFirst()
                .map(this::toResponse)
                .orElse(null);
    }

    // Đơn nhân viên còn phải xử lý: đang trên đường/ tại hiện trường, chẩn đoán, sửa chữa,
    // hoặc chờ thanh toán tiền mặt/chuyển khoản.
    private boolean isStaffActionable(RescueRequest r) {
        RescueStatus s = r.getStatus();
        if (s == RescueStatus.ASSIGNED || s == RescueStatus.EN_ROUTE || s == RescueStatus.ARRIVED
                || s == RescueStatus.DIAGNOSED || s == RescueStatus.REPAIRING_ONSITE || s == RescueStatus.TOWING || s == RescueStatus.TOW_TO_GARAGE) return true;
        return s == RescueStatus.COMPLETED || s == RescueStatus.AWAITING_PAYMENT;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RescueRequestResponse> listStaffHistory(User staffUser) {
        // Dùng findByUserAndIsDeletedFalse để nhân viên dù isActive=false vẫn xem được lịch sử
        GarageStaff staff = garageStaffRepository.findByUserAndIsDeletedFalse(staffUser).orElse(null);
        if (staff == null) {
            log.warn("listStaffHistory: không tìm thấy GarageStaff cho user id={}", staffUser.getId());
            return List.of();
        }
        // JOIN FETCH eager-load tất cả lazy relationships để tránh LazyInitializationException
        List<RescueStatus> doneStatuses = List.of(RescueStatus.PAID, RescueStatus.COMPLETED, RescueStatus.RATED);
        return toResponseList(rescueRequestRepository.findStaffHistoryEager(staff, doneStatuses));
    }

    @Override
    @Transactional
    public RescueRequestResponse payByTransfer(User customer, Long requestId) {
        RescueRequest req = requireRequest(requestId);
        if (req.getCustomer() == null || !req.getCustomer().getId().equals(customer.getId())) {
            throw new UnauthorizedException("Bạn không có quyền thanh toán đơn này");
        }
        if (req.getPaymentMethod() != RequestPaymentMethod.BANK_TRANSFER) {
            throw new BadRequestException("Đơn này không thanh toán bằng chuyển khoản");
        }
        if (req.getStatus() == RescueStatus.CANCELLED || req.getStatus() == RescueStatus.DECLINED || req.getStatus() == RescueStatus.PAID) {
            throw new BadRequestException("Đơn không ở trạng thái chờ thanh toán");
        }
        // MOCK: coi như đã trừ tiền trên ngân hàng kết nối.
        RescueStatus from = req.getStatus();
        req.setStatus(RescueStatus.PAID);
        if (req.getCompletedAt() == null) {
            req.setCompletedAt(OffsetDateTime.now());
        }
        if (req.getStaff() != null) {
            req.getStaff().setStatus(WorkStatus.FREE);
            garageStaffRepository.save(req.getStaff());
        }
        if (req.getRescueVehicle() != null) {
            req.getRescueVehicle().setStatus(WorkStatus.FREE);
            rescueVehicleRepository.save(req.getRescueVehicle());
        }
        if (req.getCommissionRate() != null && req.getTotalAmount() != null) {
            req.setCommissionAmount(Math.round(req.getTotalAmount() * req.getCommissionRate().doubleValue()));
        }
        rescueRequestRepository.save(req);
        recordHistory(req, from, RescueStatus.PAID, customer, ActorType.CUSTOMER, "Thanh toán chuyển khoản thành công");
        rescueNotifier.paidByTransfer(req, customer);
        return toResponse(req);
    }

    @Override
    @Transactional
    public RescueRequestResponse confirmCashPaid(User actor, Long requestId) {
        RescueRequest req = requireRequest(requestId);
        assertGarageSideAccess(actor, req);
        if (req.getPaymentMethod() != null && req.getPaymentMethod() != RequestPaymentMethod.CASH) {
            throw new BadRequestException("Đơn này không thanh toán bằng tiền mặt (" + req.getPaymentMethod() + ")");
        }
        if (req.getStatus() == RescueStatus.CANCELLED || req.getStatus() == RescueStatus.DECLINED || req.getStatus() == RescueStatus.PAID) {
            throw new BadRequestException("Đơn không ở trạng thái chờ thanh toán tiền mặt");
        }
        if (!Boolean.TRUE.equals(req.getCashConfirmedByCustomer())) {
            throw new BadRequestException("Khách hàng chưa bấm xác nhận thanh toán tiền mặt trên ứng dụng. Vui lòng nhắc khách xác nhận trước.");
        }

        // 1. TÍNH TOÁN CHIẾT KHẤU HỆ THỐNG & ĐỐI SOÁT TIỀN MẶT
        Garage garage = req.getGarage();
        long totalAmount = req.getTotalAmount() != null && req.getTotalAmount() > 0 ? req.getTotalAmount() : 0L;

        // Chiết khấu hệ thống lấy theo từng Gara
        double rawRate = 15.0;
        if (req.getCommissionRate() != null && req.getCommissionRate().doubleValue() > 0) {
            rawRate = req.getCommissionRate().doubleValue();
        } else if (garage != null && garage.getCommissionRate() != null && garage.getCommissionRate().doubleValue() > 0) {
            rawRate = garage.getCommissionRate().doubleValue();
        }
        double systemRate = rawRate <= 1.0 ? rawRate : rawRate / 100.0;
        long systemShare = Math.round(totalAmount * systemRate);

        // 2. KHÁCH TRẢ TIỀN MẶT CHO NHÂN VIÊN -> NHÂN VIÊN BÀN GIAO CHO GARA
        // -> HỆ THỐNG TRỪ PHẦN CHIẾT KHẤU TỪ VÍ TÍN DỤNG CỦA GARA (VÍ TIỀN MẶT KHÔNG BỊ TRỪ)
        if (garage != null) {
            long currentCredit = garage.getCreditBalance() != null ? garage.getCreditBalance() : 500000L;
            long newCredit = currentCredit - systemShare;
            garage.setCreditBalance(newCredit);
            garageRepository.save(garage);

            WalletTransaction garageTxn = new WalletTransaction();
            garageTxn.setGarage(garage);
            garageTxn.setWalletType(WalletType.CREDIT);
            garageTxn.setType(WalletTxnType.CASH_COLLECT_DEDUCT);
            garageTxn.setAmount(-systemShare);
            garageTxn.setBalanceAfter(newCredit);
            garageTxn.setRefType("RESCUE_REQUEST");
            garageTxn.setRefId(req.getId());
            garageTxn.setDescription("Trừ " + Math.round(systemRate * 100) + "% chiết khấu hoa hồng đơn tiền mặt #" + req.getCode() + " từ ví tín dụng (Gara thu trực tiếp " + formatVnd(totalAmount) + ")");
            walletTransactionRepository.save(garageTxn);
        }

        // 3. CỘNG VÀO VÍ HỆ THỐNG (System Wallet)
        SystemWallet sysWallet = systemWalletRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> {
                    SystemWallet sw = new SystemWallet();
                    sw.setBalance(0L);
                    sw.setTotalCommissionCollected(0L);
                    return systemWalletRepository.save(sw);
                });
        sysWallet.setBalance(sysWallet.getBalance() + systemShare);
        sysWallet.setTotalCommissionCollected(sysWallet.getTotalCommissionCollected() + systemShare);
        systemWalletRepository.save(sysWallet);

        WalletTransaction sysTxn = new WalletTransaction();
        sysTxn.setGarage(garage);
        sysTxn.setWalletType(WalletType.SYSTEM);
        sysTxn.setType(WalletTxnType.ORDER_SPLIT_SYSTEM);
        sysTxn.setAmount(systemShare);
        sysTxn.setBalanceAfter(sysWallet.getBalance());
        sysTxn.setRefType("RESCUE_REQUEST");
        sysTxn.setRefId(req.getId());
        sysTxn.setDescription("Hệ thống nhận " + Math.round(systemRate * 100) + "% chiết khấu đơn tiền mặt #" + req.getCode() + " từ ví Gara");
        walletTransactionRepository.save(sysTxn);

        // 5. CẬP NHẬT TRẠNG THÁI ĐƠN & GIẢI PHÓNG THỢ/XE
        if (req.getCompletedAt() == null) {
            req.setCompletedAt(OffsetDateTime.now());
        }
        if (req.getStaff() != null) {
            req.getStaff().setStatus(WorkStatus.FREE);
            garageStaffRepository.save(req.getStaff());
        }
        if (req.getRescueVehicle() != null) {
            req.getRescueVehicle().setStatus(WorkStatus.FREE);
            rescueVehicleRepository.save(req.getRescueVehicle());
        }
        req.setCommissionRate(BigDecimal.valueOf(systemRate * 100));
        req.setCommissionAmount(systemShare);
        RescueStatus from = req.getStatus();
        req.setStatus(RescueStatus.PAID);
        rescueRequestRepository.save(req);
        ActorType actorType = actor.getRole() == UserRole.GARAGE_STAFF ? ActorType.GARAGE_STAFF : ActorType.GARAGE_OWNER;
        recordHistory(req, from, RescueStatus.PAID, actor, actorType, "Xác nhận đã nhận tiền mặt và hoàn tất đối soát ví");
        rescueNotifier.cashConfirmed(req, actor);
        return toResponse(req);
    }

    @Override
    @Transactional
    public RescueRequestResponse confirmCashChoiceByCustomer(User customer, Long requestId) {
        RescueRequest req = requireRequest(requestId);
        if (req.getCustomer() == null || !req.getCustomer().getId().equals(customer.getId())) {
            throw new UnauthorizedException("Bạn không có quyền thực hiện đơn này");
        }
        if (req.getStatus() == RescueStatus.CANCELLED || req.getStatus() == RescueStatus.DECLINED || req.getStatus() == RescueStatus.PAID) {
            throw new BadRequestException("Đơn không ở trạng thái có thể thanh toán");
        }
        req.setPaymentMethod(RequestPaymentMethod.CASH);
        req.setCashConfirmedByCustomer(true);
        rescueRequestRepository.save(req);
        recordHistory(req, req.getStatus(), req.getStatus(), customer, ActorType.CUSTOMER, "Khách hàng xác nhận thanh toán tiền mặt trực tiếp");
        return toResponse(req);
    }

    @Override
    @Transactional
    public RescueRequestResponse submitQuote(User actor, Long requestId, Map<String, Object> body) {
        RescueRequest req = requireRequest(requestId);
        assertGarageSideAccess(actor, req);

        // Lưu ảnh minh chứng chẩn đoán của thợ
        Object photoUrlsObj = body != null ? body.get("photoUrls") : null;
        if (photoUrlsObj instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof String url && !url.isBlank()) {
                    RescueRequestPhoto photo = new RescueRequestPhoto();
                    photo.setRequest(req);
                    photo.setPhotoUrl(url.trim());
                    photo.setPhotoType(PhotoType.STAFF_DIAGNOSIS);
                    photo.setUploadedBy(actor);
                    photoRepository.save(photo);
                }
            }
        } else if (body != null && body.get("photoUrl") instanceof String singleUrl && !singleUrl.isBlank()) {
            RescueRequestPhoto photo = new RescueRequestPhoto();
            photo.setRequest(req);
            photo.setPhotoUrl(singleUrl.trim());
            photo.setPhotoType(PhotoType.STAFF_DIAGNOSIS);
            photo.setUploadedBy(actor);
            photoRepository.save(photo);
        }

        // Lưu danh sách dịch vụ / phụ tùng vào rescue_request_items
        List<RescueRequestItem> oldItems = rescueRequestItemRepository.findByRequestOrderByIdAsc(req);
        if (oldItems != null && !oldItems.isEmpty()) {
            rescueRequestItemRepository.deleteAll(oldItems);
        }

        Object itemsObj = body != null ? body.get("repairItems") : null;
        long repairSum = 0L;
        if (itemsObj instanceof List<?> list) {
            for (Object o : list) {
                if (o instanceof Map<?, ?> itemMap) {
                    String name = (String) itemMap.get("name");
                    Number priceNum = (Number) itemMap.get("price");
                    Number qtyNum = (Number) itemMap.get("quantity");
                    Number serviceIdNum = (Number) itemMap.get("id");
                    if (name != null && !name.isBlank()) {
                        long price = priceNum != null ? priceNum.longValue() : 0L;
                        short qty = (qtyNum != null && qtyNum.shortValue() > 0) ? qtyNum.shortValue() : (short) 1;
                        long itemTotal = price * qty;
                        RescueRequestItem item = new RescueRequestItem();
                        item.setRequest(req);
                        item.setNameSnapshot(name);
                        item.setUnitPriceSnapshot(price);
                        item.setQuantity(qty);
                        item.setAmount(itemTotal);
                        item.setPhase(ItemPhase.ONSITE);
                        item.setStatus(ItemStatus.PENDING);
                        item.setCreatedByUser(actor);
                        if (serviceIdNum != null) {
                            serviceRepository.findById(serviceIdNum.longValue()).ifPresent(item::setService);
                        }
                        rescueRequestItemRepository.save(item);
                        repairSum += itemTotal;
                    }
                }
            }
        }

        // Cập nhật phí kiểm tra/cứu hộ hoặc cước kéo xe nếu có gửi kèm từ thợ
        Number inspectionFeeNum = body != null ? (Number) body.get("inspectionFee") : null;
        Number rescueFeeNum = body != null ? (Number) body.get("rescueFee") : null;
        Number towingFeeNum = body != null ? (Number) body.get("towingFee") : null;

        boolean isTowing = (body != null && Boolean.TRUE.equals(body.get("isTowing")))
                || (body != null && "TOW".equalsIgnoreCase(String.valueOf(body.get("quoteType"))));
        if (isTowing) {
            req.setQuoteType("TOW");
            String reason = body.get("towingReason") instanceof String s ? s.trim() : null;
            req.setTowingReason(reason);
        } else {
            req.setQuoteType("ONSITE");
            req.setTowingReason(null);
        }

        if (rescueFeeNum != null && rescueFeeNum.longValue() > 0) {
            req.setRescueFee(rescueFeeNum.longValue());
        } else if (req.getRescueFee() == null || req.getRescueFee() == 0L) {
            if (inspectionFeeNum != null && inspectionFeeNum.longValue() > 0) {
                req.setRescueFee(inspectionFeeNum.longValue());
            }
        }
        if (towingFeeNum != null && towingFeeNum.longValue() > 0) {
            req.setTowingFee(towingFeeNum.longValue());
        } else if (!isTowing) {
            req.setTowingFee(0L);
        }

        req.setServiceFee(repairSum);
        long rescueFee = req.getRescueFee() != null ? req.getRescueFee() : 0L;
        long towingFee = req.getTowingFee() != null ? req.getTowingFee() : 0L;
        long total = rescueFee + towingFee + repairSum;
        req.setTotalAmount(total);
        if (req.getCommissionRate() != null) {
            req.setCommissionAmount(Math.round(total * req.getCommissionRate().doubleValue()));
        }

        RescueStatus from = req.getStatus();
        req.setStatus(RescueStatus.DIAGNOSED);
        req.setQuoteStatus("PENDING");
        rescueRequestRepository.save(req);

        ActorType actorType = actor.getRole() == UserRole.GARAGE_STAFF ? ActorType.GARAGE_STAFF : ActorType.GARAGE_OWNER;
        String logNote = isTowing ? "Thợ gửi báo giá đề xuất kéo về garage" : "Thợ gửi báo giá sửa chữa tại chỗ";
        recordHistory(req, from, RescueStatus.DIAGNOSED, actor, actorType, logNote);
        rescueNotifier.quoteSubmitted(req, actor);

        return toResponse(req);
    }

    @Override
    @Transactional
    public RescueRequestResponse acceptQuote(User customer, Long requestId) {
        RescueRequest req = requireRequest(requestId);
        if (req.getCustomer() == null || !req.getCustomer().getId().equals(customer.getId())) {
            throw new UnauthorizedException("Bạn không có quyền thực hiện đơn này");
        }
        RescueStatus from = req.getStatus();

        boolean isTow = "TOW".equalsIgnoreCase(req.getQuoteType())
                || (req.getTowingFee() != null && req.getTowingFee() > 0 && req.getTowingReason() != null);
        RescueStatus targetStatus = isTow ? RescueStatus.TOWING : RescueStatus.REPAIRING_ONSITE;

        req.setStatus(targetStatus);
        req.setQuoteStatus("APPROVED");

        List<RescueRequestItem> items = rescueRequestItemRepository.findByRequestOrderByIdAsc(req);
        if (items != null) {
            for (RescueRequestItem item : items) {
                item.setStatus(ItemStatus.APPROVED);
            }
            rescueRequestItemRepository.saveAll(items);
        }

        rescueRequestRepository.save(req);
        String historyNote = isTow
                ? "Khách hàng đồng ý đề xuất kéo về garage, bắt đầu kéo xe và sửa chữa tại garage"
                : "Khách hàng đồng ý duyệt báo giá, bắt đầu sửa chữa tại chỗ";
        recordHistory(req, from, targetStatus, customer, ActorType.CUSTOMER, historyNote);
        return toResponse(req);
    }

    @Override
    @Transactional
    public RescueRequestResponse declineQuote(User customer, Long requestId) {
        RescueRequest req = requireRequest(requestId);
        if (req.getCustomer() == null || !req.getCustomer().getId().equals(customer.getId())) {
            throw new UnauthorizedException("Bạn không có quyền thực hiện đơn này");
        }
        RescueStatus from = req.getStatus();
        req.setQuoteStatus("DECLINED");
        // Khách từ chối: không sửa chữa, không kéo xe về garage
        // Chỉ thu phí di chuyển đến hiện trường / kiểm tra xe (rescueFee)
        req.setServiceFee(0L);
        req.setTowingFee(0L);
        long rescueFee = req.getRescueFee() != null ? req.getRescueFee() : 0L;
        long total = rescueFee;
        req.setTotalAmount(total);
        if (req.getCommissionRate() != null) {
            req.setCommissionAmount(Math.round(total * req.getCommissionRate().doubleValue()));
        }

        List<RescueRequestItem> items = rescueRequestItemRepository.findByRequestOrderByIdAsc(req);
        if (items != null) {
            for (RescueRequestItem item : items) {
                item.setStatus(ItemStatus.REJECTED);
            }
            rescueRequestItemRepository.saveAll(items);
        }

        // Chuyển sang chờ thanh toán phí di chuyển đến / kiểm tra xe
        req.setStatus(RescueStatus.AWAITING_PAYMENT);
        if (req.getCompletedAt() == null) {
            req.setCompletedAt(OffsetDateTime.now());
        }
        rescueRequestRepository.save(req);
        recordHistory(req, from, RescueStatus.AWAITING_PAYMENT, customer, ActorType.CUSTOMER, "Khách hàng từ chối báo giá, chuyển sang thanh toán phí di chuyển đến hiện trường");
        return toResponse(req);
    }

    @Override
    @Transactional
    public RescueRequestResponse addRepairItem(User actor, Long requestId, com.sras.backend.dto.request.AddRepairItemRequest reqDto) {
        RescueRequest req = requireRequest(requestId);
        assertGarageSideAccess(actor, req);

        RescueRequestItem item = new RescueRequestItem();
        item.setRequest(req);
        item.setNameSnapshot(reqDto.getName().trim());
        long unitPrice = reqDto.getPrice();
        short qty = (reqDto.getQuantity() != null && reqDto.getQuantity() > 0) ? reqDto.getQuantity() : (short) 1;
        long amount = unitPrice * qty;
        item.setUnitPriceSnapshot(unitPrice);
        item.setQuantity(qty);
        item.setAmount(amount);
        item.setPhase(req.getStatus() == RescueStatus.TOW_TO_GARAGE ? com.sras.backend.entity.enums.ItemPhase.AT_GARAGE : com.sras.backend.entity.enums.ItemPhase.ONSITE);
        item.setStatus(com.sras.backend.entity.enums.ItemStatus.APPROVED);
        item.setCreatedByUser(actor);
        if (reqDto.getServiceId() != null) {
            serviceRepository.findById(reqDto.getServiceId()).ifPresent(item::setService);
        }
        rescueRequestItemRepository.save(item);

        long oldServiceFee = req.getServiceFee() != null ? req.getServiceFee() : 0L;
        long newServiceFee = oldServiceFee + amount;
        req.setServiceFee(newServiceFee);

        long rescueFee = req.getRescueFee() != null ? req.getRescueFee() : 0L;
        long towingFee = req.getTowingFee() != null ? req.getTowingFee() : 0L;
        long total = rescueFee + towingFee + newServiceFee;
        req.setTotalAmount(total);
        if (req.getCommissionRate() != null) {
            req.setCommissionAmount(Math.round(total * req.getCommissionRate().doubleValue()));
        }
        rescueRequestRepository.save(req);

        if (req.getCustomer() != null) {
            notificationService.createNotification(
                    req.getCustomer(),
                    com.sras.backend.entity.enums.NotificationType.SYSTEM_WARNING,
                    "Phát sinh sửa chữa tại garage",
                    "Thợ đã bổ sung thêm: " + reqDto.getName().trim() + " (" + String.format("%,dđ", amount) + ") vào đơn sửa chữa của bạn.",
                    "RESCUE_REQUEST",
                    req.getId()
            );
        }
        return toResponse(req);
    }

    // ─────────────────────────── Helpers ───────────────────────────

    private Garage requireGarage(User owner) {
        return garageRepository.findByOwner(owner)
                .orElseThrow(() -> new BadRequestException("Bạn chưa sở hữu gara nào"));
    }

    private RescueRequest requireRequest(Long id) {
        return rescueRequestRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu cứu hộ"));
    }

    private void assertCanView(User user, RescueRequest req) {
        if (req.getCustomer().getId().equals(user.getId())) return;
        if (user.getRole() == UserRole.GARAGE_OWNER) {
            Garage g = garageRepository.findByOwner(user).orElse(null);
            if (g != null && ((req.getGarage() != null && req.getGarage().getId().equals(g.getId()))
                    || dispatchOfferRepository.findByRequestAndGarage(req, g).isPresent())) {
                return;
            }
        }
        if (user.getRole() == UserRole.GARAGE_STAFF && req.getStaff() != null
                && req.getStaff().getUser().getId().equals(user.getId())) {
            return;
        }
        throw new UnauthorizedException("Bạn không có quyền xem yêu cầu này");
    }

    private void assertGarageSideAccess(User user, RescueRequest req) {
        if (user.getRole() == UserRole.GARAGE_OWNER) {
            Garage g = garageRepository.findByOwner(user).orElse(null);
            if (g != null && req.getGarage() != null && req.getGarage().getId().equals(g.getId())) return;
        }
        if (user.getRole() == UserRole.GARAGE_STAFF) {
            if (req.getStaff() != null && req.getStaff().getUser() != null && req.getStaff().getUser().getId().equals(user.getId())) return;
            GarageStaff gs = garageStaffRepository.findByUserAndIsDeletedFalse(user).orElse(null);
            if (gs != null && req.getGarage() != null && gs.getGarage() != null && gs.getGarage().getId().equals(req.getGarage().getId())) {
                return;
            }
            if (gs != null) return;
        }
        if (req.getCustomer() != null && req.getCustomer().getId().equals(user.getId())) {
            return;
        }
        throw new UnauthorizedException("Bạn không có quyền cập nhật yêu cầu này");
    }

    private void recordHistory(RescueRequest req, RescueStatus from, RescueStatus to,
                               User actor, ActorType actorType, String note) {
        RescueStatusHistory h = new RescueStatusHistory();
        h.setRequest(req);
        h.setFromStatus(from);
        h.setToStatus(to);
        h.setChangedByUser(actor);
        h.setActorType(actorType);
        h.setNote(note);
        statusHistoryRepository.save(h);
    }

    private String generateCode() {
        String code;
        int guard = 0;
        do {
            code = "RQ" + Long.toString(System.currentTimeMillis(), 36).toUpperCase()
                    + Integer.toString((int) (Math.random() * 1296), 36).toUpperCase();
            guard++;
        } while (rescueRequestRepository.existsByCode(code) && guard < 5);
        return code;
    }

    private boolean capabilityMatches(Capability cap, VehicleType type) {
        if (cap == Capability.BOTH) return true;
        return (cap == Capability.CAR && type == VehicleType.CAR)
                || (cap == Capability.MOTORBIKE && type == VehicleType.MOTORBIKE);
    }

    private long quotedFee(VehicleType vehicleType, double distanceKm) {
        return pricingConfigService.calculateRescueFee(vehicleType, distanceKm, OffsetDateTime.now());
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

    private RescueRequestResponse toResponse(RescueRequest r) {
        if (r == null) return null;
        List<RescueRequestResponse> list = toResponseList(List.of(r));
        return list.isEmpty() ? null : list.get(0);
    }

    private List<RescueRequestResponse> toResponseList(List<RescueRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> requestIds = requests.stream().map(RescueRequest::getId).filter(Objects::nonNull).toList();
        List<Long> garageIds = requests.stream()
                .map(RescueRequest::getGarage)
                .filter(Objects::nonNull)
                .map(Garage::getId)
                .distinct()
                .toList();
        List<Long> staffIds = requests.stream()
                .map(RescueRequest::getStaff)
                .filter(Objects::nonNull)
                .map(GarageStaff::getId)
                .distinct()
                .toList();

        // 1. Batch load garage ratings
        Map<Long, RatingRepository.GarageRatingAgg> garageAggMap = new HashMap<>();
        if (!garageIds.isEmpty()) {
            ratingRepository.aggregateByGarages(garageIds)
                    .forEach(a -> garageAggMap.put(a.getGarageId(), a));
        }

        // 2. Batch load staff ratings
        Map<Long, RatingRepository.StaffRatingAgg> staffAggMap = new HashMap<>();
        if (!staffIds.isEmpty()) {
            ratingRepository.aggregateByStaff(staffIds)
                    .forEach(a -> staffAggMap.put(a.getStaffId(), a));
        }

        // 3. Batch load rated request IDs
        Set<Long> ratedRequestIds = new HashSet<>();
        if (!requestIds.isEmpty()) {
            ratedRequestIds.addAll(ratingRepository.findRatedRequestIds(
                    requestIds, com.sras.backend.entity.enums.RatingDirection.CUSTOMER_TO_GARAGE));
        }

        // 4. Batch load photos
        Map<Long, List<String>> photosMap = new HashMap<>();
        if (!requestIds.isEmpty()) {
            List<RescueRequestPhoto> photos = photoRepository.findByRequestIdIn(requestIds);
            for (RescueRequestPhoto p : photos) {
                if (p.getRequest() != null && p.getRequest().getId() != null) {
                    photosMap.computeIfAbsent(p.getRequest().getId(), k -> new ArrayList<>())
                            .add(p.getPhotoUrl());
                }
            }
        }

        // 5. Batch load repair items
        Map<Long, List<RescueRequestResponse.RescueRequestItemResponse>> itemsMap = new HashMap<>();
        if (!requestIds.isEmpty()) {
            List<RescueRequestItem> items = rescueRequestItemRepository.findByRequestIdIn(requestIds);
            for (RescueRequestItem i : items) {
                if (i.getRequest() != null && i.getRequest().getId() != null) {
                    itemsMap.computeIfAbsent(i.getRequest().getId(), k -> new ArrayList<>())
                            .add(RescueRequestResponse.RescueRequestItemResponse.builder()
                                    .id(i.getId())
                                    .serviceId(i.getService() != null ? i.getService().getId() : null)
                                    .name(i.getNameSnapshot())
                                    .price(i.getUnitPriceSnapshot())
                                    .quantity(i.getQuantity())
                                    .amount(i.getAmount())
                                    .status(i.getStatus() != null ? i.getStatus().name() : null)
                                    .build());
                }
            }
        }

        return requests.stream().map(r -> toResponseFast(r, garageAggMap, staffAggMap, ratedRequestIds, photosMap, itemsMap)).toList();
    }

    private RescueRequestResponse toResponseFast(
            RescueRequest r,
            Map<Long, RatingRepository.GarageRatingAgg> garageAggMap,
            Map<Long, RatingRepository.StaffRatingAgg> staffAggMap,
            Set<Long> ratedRequestIds,
            Map<Long, List<String>> photosMap,
            Map<Long, List<RescueRequestResponse.RescueRequestItemResponse>> itemsMap) {

        RescueRequestResponse.RescueRequestResponseBuilder b = RescueRequestResponse.builder()
                .id(r.getId())
                .code(r.getCode())
                .status(r.getStatus())
                .vehicleType(r.getVehicleType())
                .symptom(r.getSymptom())
                .pickupLat(r.getPickupLat())
                .pickupLng(r.getPickupLng())
                .pickupAddress(r.getPickupAddress())
                .locationNote(r.getLocationNote())
                .paymentMethod(r.getPaymentMethod())
                .cashConfirmedByCustomer(Boolean.TRUE.equals(r.getCashConfirmedByCustomer()))
                .quoteStatus(r.getQuoteStatus())
                .quoteType(r.getQuoteType())
                .towingReason(r.getTowingReason())
                .isTowing("TOW".equalsIgnoreCase(r.getQuoteType()) || (r.getTowingFee() != null && r.getTowingFee() > 0))
                .rescueFee(r.getRescueFee())
                .totalAmount(r.getTotalAmount())
                .dispatchDistanceKm(r.getDispatchDistanceKm())
                .createdAt(r.getCreatedAt())
                .enRouteAt(r.getEnRouteAt())
                .arrivedAt(r.getArrivedAt())
                .completedAt(r.getCompletedAt())
                .cancelReason(r.getCancelReason())
                .rescuerLat(r.getRescuerLat())
                .rescuerLng(r.getRescuerLng())
                .rescuerLocationAt(r.getRescuerLocationAt());

        if (r.getCustomerVehicle() != null) {
            CustomerVehicle cv = r.getCustomerVehicle();
            b.customerVehicle(RescueRequestResponse.CustomerVehicleInfo.builder()
                    .id(cv.getId())
                    .licensePlate(cv.getLicensePlate())
                    .brand(cv.getBrand())
                    .model(cv.getModel())
                    .color(cv.getColor())
                    .vehicleType(cv.getVehicleType() != null ? cv.getVehicleType().name() : null)
                    .build());
        }

        User c = r.getCustomer();
        if (c != null) {
            b.customer(RescueRequestResponse.CustomerInfo.builder()
                    .id(c.getId())
                    .name(c.getFullName())
                    .phone(c.getPhone())
                    .build());
        }

        Garage g = r.getGarage();
        if (g != null) {
            RatingRepository.GarageRatingAgg gAgg = garageAggMap.get(g.getId());
            b.garage(RescueRequestResponse.GarageInfo.builder()
                    .id(g.getId())
                    .name(g.getName())
                    .phone(g.getPhone())
                    .address(g.getAddress())
                    .avgRating(gAgg != null ? avgOf(gAgg.getAvgStars(), gAgg.getCnt()) : null)
                    .ratingCount(gAgg != null ? countOf(gAgg.getCnt()) : 0)
                    .lat(g.getLat())
                    .lng(g.getLng())
                    .build());
        }

        GarageStaff staff = r.getStaff();
        if (staff != null) {
            RatingRepository.StaffRatingAgg sAgg = staffAggMap.get(staff.getId());
            User su = staff.getUser();
            b.staff(RescueRequestResponse.StaffInfo.builder()
                    .id(staff.getId())
                    .name(su != null ? su.getFullName() : (staff.getId() != null ? "Nhân viên cứu hộ" : null))
                    .phone(su != null ? su.getPhone() : null)
                    .rating(sAgg != null ? avgOf(sAgg.getAvgStars(), sAgg.getCnt()) : null)
                    .ratingCount(sAgg != null ? countOf(sAgg.getCnt()) : 0)
                    .build());
        }

        RescueVehicle v = r.getRescueVehicle();
        if (v != null) {
            b.rescueVehicle(RescueRequestResponse.RescueVehicleInfo.builder()
                    .id(v.getId())
                    .licensePlate(v.getLicensePlate())
                    .vehicleKind(v.getVehicleKind() != null ? v.getVehicleKind().name() : null)
                    .build());
        }

        List<RescueRequestResponse.RescueRequestItemResponse> items = itemsMap.get(r.getId());
        if (items != null && !items.isEmpty()) {
            b.repairItems(items);
        }
        boolean isDeclinedQuote = "DECLINED".equalsIgnoreCase(r.getQuoteStatus());

        long rescueFee = r.getRescueFee() != null ? r.getRescueFee() : 0L;
        long towingFee = isDeclinedQuote ? 0L : (r.getTowingFee() != null ? r.getTowingFee() : 0L);
        long serviceFee = isDeclinedQuote ? 0L : (r.getServiceFee() != null ? r.getServiceFee() : 0L);
        long totalAmount = isDeclinedQuote ? rescueFee : (r.getTotalAmount() != null ? r.getTotalAmount() : (rescueFee + towingFee + serviceFee));

        b.rescueFee(rescueFee);
        b.towingFee(towingFee);
        b.serviceFee(serviceFee);
        b.totalAmount(totalAmount);
        b.minPayableAmount(rescueFee);
        b.inspectionFee(rescueFee);
        b.repairFee(serviceFee);
        b.isTowing(!isDeclinedQuote && ("TOW".equalsIgnoreCase(r.getQuoteType()) || (r.getTowingFee() != null && r.getTowingFee() > 0)));

        List<String> photos = photosMap.get(r.getId());
        b.photos(photos != null ? photos : Collections.emptyList());

        b.rated(ratedRequestIds.contains(r.getId()));

        return b.build();
    }

    private static BigDecimal avgOf(Double avgStars, Long cnt) {
        if (cnt == null || cnt == 0 || avgStars == null) return null;
        return BigDecimal.valueOf(avgStars).setScale(1, RoundingMode.HALF_UP);
    }

    private static Integer countOf(Long cnt) {
        return cnt == null ? 0 : cnt.intValue();
    }

    private static Integer countOf(RatingRepository.RatingAgg agg) {
        return (agg == null || agg.getCnt() == null) ? 0 : agg.getCnt().intValue();
    }

    private String formatVnd(long amount) {
        return String.format("%,dđ", amount).replace(',', '.');
    }
}
