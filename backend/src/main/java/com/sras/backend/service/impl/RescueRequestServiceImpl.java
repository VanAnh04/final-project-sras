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
import com.sras.backend.service.RescueRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
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
    private static final long BASE_FEE = 50_000L;
    private static final long FEE_PER_KM = 15_000L;
    private static final int OFFER_TTL_SECONDS = 60;

    private final RescueRequestRepository rescueRequestRepository;
    private final DispatchOfferRepository dispatchOfferRepository;
    private final RescueStatusHistoryRepository statusHistoryRepository;
    private final RescueRequestPhotoRepository photoRepository;
    private final GarageRepository garageRepository;
    private final GarageStaffRepository garageStaffRepository;
    private final RescueVehicleRepository rescueVehicleRepository;
    private final CustomerVehicleRepository customerVehicleRepository;
    private final RatingRepository ratingRepository;

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

        // Điều phối tuần tự: mời gara gần nhất trước, nới bán kính nếu cần.
        boolean sent = dispatchNextGarage(saved);
        if (!sent) {
            saved.setStatus(RescueStatus.NO_GARAGE_FOUND);
            recordHistory(saved, RescueStatus.SEARCHING, RescueStatus.NO_GARAGE_FOUND, null, ActorType.SYSTEM,
                    "Không tìm thấy gara trong bán kính tối đa " + MAX_RADIUS_KM + "km");
        } else if (saved.getStatus() != RescueStatus.ACCEPTED) {
            // Chưa auto-accept → chờ gara xác nhận. (Nếu đã ACCEPTED thì acceptOffer đã set + ghi history.)
            saved.setStatus(RescueStatus.PENDING_GARAGE);
            recordHistory(saved, RescueStatus.SEARCHING, RescueStatus.PENDING_GARAGE, null, ActorType.SYSTEM,
                    "Đã gửi lời mời tới gara gần nhất (bán kính " + saved.getSearchRadiusKm() + "km)");
        }
        rescueRequestRepository.save(saved);

        log.info("Rescue request {} created by user {} (sent={})", saved.getCode(), customer.getId(), sent);
        return toResponse(saved);
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
        offer.setQuotedFee(quotedFee(bestDist));
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
        }
        return true;
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

        // Đóng mọi lời mời còn treo để gara không nhận đơn "ma".
        OffsetDateTime now = OffsetDateTime.now();
        for (DispatchOffer o : dispatchOfferRepository.findByRequest(req)) {
            if (o.getStatus() == OfferStatus.SENT) {
                o.setStatus(OfferStatus.SKIPPED);
                o.setRespondedAt(now);
                dispatchOfferRepository.save(o);
            }
        }

        req.setStatus(RescueStatus.CANCELLED);
        req.setCancelledBy(CancelledBy.CUSTOMER);
        rescueRequestRepository.save(req);
        recordHistory(req, from, RescueStatus.CANCELLED, customer, ActorType.CUSTOMER, "Khách huỷ yêu cầu");

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
        RescueStatus from = req.getStatus();
        req.setGarage(garage);
        req.setStatus(RescueStatus.ACCEPTED);
        req.setDispatchDistanceKm(offer.getDistanceKm());
        req.setRescueFee(offer.getQuotedFee());
        req.setQuotedTowingFee(offer.getQuotedTowingFee());
        req.setTotalAmount(offer.getQuotedFee());
        if (garage.getCommissionRate() != null) {
            req.setCommissionRate(garage.getCommissionRate().movePointLeft(2)); // 15.0% → 0.150
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

        // Tuần tự: gara từ chối → quét mời gara gần nhất KẾ TIẾP (nới bán kính nếu cần).
        // Chỉ khi đã hết gara trong bán kính tối đa mới báo không tìm được gara.
        boolean sent = dispatchNextGarage(req);
        if (!sent) {
            req.setStatus(RescueStatus.NO_GARAGE_FOUND);
            rescueRequestRepository.save(req);
            recordHistory(req, RescueStatus.PENDING_GARAGE, RescueStatus.NO_GARAGE_FOUND, garageOwner,
                    ActorType.GARAGE_OWNER,
                    "Gara " + garage.getName() + " từ chối — không còn gara nào trong bán kính tối đa "
                            + MAX_RADIUS_KM + "km");
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
        return toResponse(req);
    }

    // ─────────────────────────── Tuần tự trạng thái ───────────────────────────

    @Override
    @Transactional
    public RescueRequestResponse advanceStatus(User actor, Long requestId, RescueStatus target) {
        RescueRequest req = requireRequest(requestId);
        assertGarageSideAccess(actor, req);

        RescueStatus from = req.getStatus();
        boolean ok = (from == RescueStatus.ASSIGNED && target == RescueStatus.EN_ROUTE)
                || (from == RescueStatus.EN_ROUTE && target == RescueStatus.ARRIVED)
                || (from == RescueStatus.ARRIVED && target == RescueStatus.COMPLETED);
        if (!ok) {
            throw new BadRequestException("Không thể chuyển từ " + from + " sang " + target);
        }

        OffsetDateTime now = OffsetDateTime.now();
        req.setStatus(target);
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

        ActorType actorType = actor.getRole() == UserRole.GARAGE_STAFF ? ActorType.GARAGE_STAFF : ActorType.GARAGE_OWNER;
        recordHistory(req, from, target, actor, actorType, null);
        return toResponse(req);
    }

    @Override
    @Transactional
    public RescueRequestResponse updateRescuerLocation(User actor, Long requestId, double lat, double lng) {
        RescueRequest req = requireRequest(requestId);
        assertGarageSideAccess(actor, req);

        // Chỉ ghi nhận vị trí khi đơn đang trong hành trình cứu hộ.
        RescueStatus s = req.getStatus();
        if (s != RescueStatus.ASSIGNED && s != RescueStatus.EN_ROUTE && s != RescueStatus.ARRIVED) {
            throw new BadRequestException("Chỉ cập nhật vị trí khi đơn đang được cứu hộ");
        }

        req.setRescuerLat(lat);
        req.setRescuerLng(lng);
        req.setRescuerLocationAt(OffsetDateTime.now());
        rescueRequestRepository.save(req);
        return toResponse(req);
    }

    // ─────────────────────────── Truy vấn ───────────────────────────

    @Override
    @Transactional(readOnly = true)
    public RescueRequestResponse getRequest(User user, Long id) {
        RescueRequest req = requireRequest(id);
        assertCanView(user, req);
        return toResponse(req);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RescueRequestResponse> listMyRequests(User customer) {
        return rescueRequestRepository.findByCustomerAndIsDeletedFalseOrderByCreatedAtDesc(customer)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RescueRequestResponse> listGarageOffers(User garageOwner) {
        Garage garage = requireGarage(garageOwner);
        return dispatchOfferRepository.findByGarageAndStatusOrderByCreatedAtDesc(garage, OfferStatus.SENT)
                .stream()
                .map(DispatchOffer::getRequest)
                .filter(r -> r.getStatus() == RescueStatus.PENDING_GARAGE)
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RescueRequestResponse> listGarageActive(User garageOwner) {
        Garage garage = requireGarage(garageOwner);
        List<RescueStatus> active = List.of(
                RescueStatus.ACCEPTED, RescueStatus.ASSIGNED, RescueStatus.EN_ROUTE, RescueStatus.ARRIVED);
        return rescueRequestRepository.findByGarageAndIsDeletedFalseOrderByCreatedAtDesc(garage)
                .stream()
                .filter(r -> active.contains(r.getStatus()))
                .map(this::toResponse)
                .toList();
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

    // Đơn nhân viên còn phải xử lý: đang trên đường/ tại hiện trường,
    // hoặc đã xong nhưng thu tiền mặt → còn phải xác nhận đã nhận tiền.
    private boolean isStaffActionable(RescueRequest r) {
        RescueStatus s = r.getStatus();
        if (s == RescueStatus.ASSIGNED || s == RescueStatus.EN_ROUTE || s == RescueStatus.ARRIVED) return true;
        return s == RescueStatus.COMPLETED && r.getPaymentMethod() == RequestPaymentMethod.CASH;
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
        List<RescueStatus> doneStatuses = List.of(RescueStatus.PAID, RescueStatus.COMPLETED);
        return rescueRequestRepository.findStaffHistoryEager(staff, doneStatuses)
                .stream()
                .map(this::toResponse)
                .toList();
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
        if (req.getStatus() != RescueStatus.COMPLETED && req.getStatus() != RescueStatus.AWAITING_PAYMENT) {
            throw new BadRequestException("Chỉ thanh toán khi đơn đã hoàn thành cứu hộ");
        }
        // MOCK: coi như đã trừ tiền trên ngân hàng kết nối.
        RescueStatus from = req.getStatus();
        req.setStatus(RescueStatus.PAID);
        rescueRequestRepository.save(req);
        recordHistory(req, from, RescueStatus.PAID, customer, ActorType.CUSTOMER, "Thanh toán chuyển khoản");
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
        if (req.getStatus() != RescueStatus.COMPLETED && req.getStatus() != RescueStatus.AWAITING_PAYMENT && req.getStatus() != RescueStatus.ARRIVED) {
            throw new BadRequestException("Chỉ xác nhận thu tiền khi đơn đã hoàn thành hoặc đang tại hiện trường");
        }
        if (req.getStatus() == RescueStatus.ARRIVED) {
            req.setCompletedAt(OffsetDateTime.now());
            if (req.getStaff() != null) {
                req.getStaff().setStatus(WorkStatus.FREE);
                garageStaffRepository.save(req.getStaff());
            }
            if (req.getRescueVehicle() != null) {
                req.getRescueVehicle().setStatus(WorkStatus.FREE);
                rescueVehicleRepository.save(req.getRescueVehicle());
            }
        }
        RescueStatus from = req.getStatus();
        req.setStatus(RescueStatus.PAID);
        rescueRequestRepository.save(req);
        ActorType actorType = actor.getRole() == UserRole.GARAGE_STAFF ? ActorType.GARAGE_STAFF : ActorType.GARAGE_OWNER;
        recordHistory(req, from, RescueStatus.PAID, actor, actorType, "Xác nhận đã nhận tiền mặt");
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
        if (req.getGarage() == null) {
            throw new BadRequestException("Yêu cầu chưa được gara nào nhận");
        }
        if (user.getRole() == UserRole.GARAGE_OWNER) {
            Garage g = garageRepository.findByOwner(user).orElse(null);
            if (g != null && req.getGarage().getId().equals(g.getId())) return;
        }
        if (user.getRole() == UserRole.GARAGE_STAFF) {
            if (req.getStaff() != null && req.getStaff().getUser().getId().equals(user.getId())) return;
            GarageStaff gs = garageStaffRepository.findByUserAndIsActiveTrue(user).orElse(null);
            if (gs != null && req.getGarage() != null && gs.getGarage().getId().equals(req.getGarage().getId())) {
                return;
            }
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

    private long quotedFee(double distanceKm) {
        return BASE_FEE + Math.round(distanceKm * FEE_PER_KM);
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
                .rescueFee(r.getRescueFee())
                .totalAmount(r.getTotalAmount())
                .dispatchDistanceKm(r.getDispatchDistanceKm())
                .createdAt(r.getCreatedAt())
                .enRouteAt(r.getEnRouteAt())
                .arrivedAt(r.getArrivedAt())
                .completedAt(r.getCompletedAt())
                .rescuerLat(r.getRescuerLat())
                .rescuerLng(r.getRescuerLng())
                .rescuerLocationAt(r.getRescuerLocationAt());

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
            RatingRepository.RatingAgg gAgg = ratingRepository.aggregateForGarage(g.getId());
            b.garage(RescueRequestResponse.GarageInfo.builder()
                    .id(g.getId())
                    .name(g.getName())
                    .phone(g.getPhone())
                    .address(g.getAddress())
                    .avgRating(avgOf(gAgg))
                    .ratingCount(countOf(gAgg))
                    .lat(g.getLat())
                    .lng(g.getLng())
                    .build());
        }

        GarageStaff staff = r.getStaff();
        if (staff != null) {
            RatingRepository.RatingAgg sAgg = ratingRepository.aggregateForStaff(staff.getId());
            b.staff(RescueRequestResponse.StaffInfo.builder()
                    .id(staff.getId())
                    .name(staff.getUser().getFullName())
                    .phone(staff.getUser().getPhone())
                    .rating(avgOf(sAgg))
                    .ratingCount(countOf(sAgg))
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

        b.photos(photoRepository.findByRequestOrderByIdAsc(r).stream()
                .map(RescueRequestPhoto::getPhotoUrl).toList());

        return b.build();
    }

    /** Điểm trung bình thật (làm tròn 1 chữ số); null nếu chưa có lượt đánh giá nào. */
    private static BigDecimal avgOf(RatingRepository.RatingAgg agg) {
        if (agg == null || agg.getCnt() == null || agg.getCnt() == 0 || agg.getAvgStars() == null) return null;
        return BigDecimal.valueOf(agg.getAvgStars()).setScale(1, RoundingMode.HALF_UP);
    }

    private static Integer countOf(RatingRepository.RatingAgg agg) {
        return (agg == null || agg.getCnt() == null) ? 0 : agg.getCnt().intValue();
    }
}
