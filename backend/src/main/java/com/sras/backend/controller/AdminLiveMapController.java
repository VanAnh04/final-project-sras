package com.sras.backend.controller;

import com.sras.backend.dto.response.AdminLiveMapResponse;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.entity.DispatchOffer;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.LocationTrack;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.entity.enums.OfferStatus;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.entity.enums.WorkStatus;
import com.sras.backend.repository.DispatchOfferRepository;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.GarageStaffRepository;
import com.sras.backend.repository.LocationTrackRepository;
import com.sras.backend.repository.RatingRepository;
import com.sras.backend.repository.RescueRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/admin/live-map")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminLiveMapController {

    private static final List<RescueStatus> ACTIVE_RESCUE_STATUSES = List.of(
            RescueStatus.DRAFT,
            RescueStatus.SEARCHING,
            RescueStatus.PENDING_GARAGE,
            RescueStatus.ACCEPTED,
            RescueStatus.ASSIGNED,
            RescueStatus.EN_ROUTE,
            RescueStatus.ARRIVED,
            RescueStatus.DIAGNOSED,
            RescueStatus.REPAIRING_ONSITE,
            RescueStatus.TOWING,
            RescueStatus.TOW_TO_GARAGE,
            RescueStatus.COMPLETED,
            RescueStatus.AWAITING_PAYMENT
    );

    private final GarageRepository garageRepository;
    private final GarageStaffRepository garageStaffRepository;
    private final RescueRequestRepository rescueRequestRepository;
    private final DispatchOfferRepository dispatchOfferRepository;
    private final LocationTrackRepository locationTrackRepository;
    private final RatingRepository ratingRepository;

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AdminLiveMapResponse>> getLiveMapOverview() {
        OffsetDateTime now = OffsetDateTime.now();

        // 1. Lấy tất cả Gara đã duyệt (hoặc đang tạm ngưng/chờ duyệt có tọa độ hợp lệ)
        List<Garage> allGarages = garageRepository.findAll().stream()
                .filter(g -> !Boolean.TRUE.equals(g.getIsDeleted()))
                .filter(g -> g.getStatus() == GarageStatus.APPROVED || g.getStatus() == GarageStatus.SUSPENDED)
                .filter(g -> g.getLat() != null && g.getLng() != null)
                .toList();

        List<Long> garageIds = allGarages.stream().map(Garage::getId).toList();

        // Batch load đánh giá sao của Gara
        Map<Long, RatingRepository.GarageRatingAgg> ratingMap = new HashMap<>();
        if (!garageIds.isEmpty()) {
            ratingRepository.aggregateByGarages(garageIds).forEach(a -> ratingMap.put(a.getGarageId(), a));
        }

        // Batch load nhân viên của các Gara để đếm số thợ rảnh/bận
        Map<Long, List<GarageStaff>> staffByGarageMap = new HashMap<>();
        if (!garageIds.isEmpty()) {
            List<GarageStaff> staffList = garageStaffRepository.findByGarageIdInAndIsDeletedFalse(garageIds);
            for (GarageStaff gs : staffList) {
                if (gs.getGarage() != null && gs.getGarage().getId() != null) {
                    staffByGarageMap.computeIfAbsent(gs.getGarage().getId(), k -> new ArrayList<>()).add(gs);
                }
            }
        }

        // 2. Lấy toàn bộ đơn cứu hộ đang diễn ra theo thời gian thực
        List<RescueRequest> activeRequests = rescueRequestRepository.findAllActiveForLiveMapEager(ACTIVE_RESCUE_STATUSES);

        // Đếm số đơn đang xử lý theo từng Gara
        Map<Long, Integer> activeOrdersByGarage = new HashMap<>();
        for (RescueRequest r : activeRequests) {
            if (r.getGarage() != null && r.getGarage().getId() != null) {
                activeOrdersByGarage.merge(r.getGarage().getId(), 1, Integer::sum);
            }
        }

        // Batch load breadcrumbs từ bảng location_tracks và lời mời Gara từ dispatch_offers cho các đơn đang hoạt động
        Map<Long, List<AdminLiveMapResponse.TrackPoint>> tracksByRequestMap = new HashMap<>();
        Map<Long, Garage> offeredGarageByRequestMap = new HashMap<>();
        List<Long> activeReqIds = activeRequests.stream().map(RescueRequest::getId).filter(Objects::nonNull).toList();
        if (!activeReqIds.isEmpty()) {
            List<LocationTrack> tracks = locationTrackRepository.findByRequestIdInOrderByRecordedAtAsc(activeReqIds);
            for (LocationTrack lt : tracks) {
                if (lt.getRequest() != null && lt.getRequest().getId() != null) {
                    List<AdminLiveMapResponse.TrackPoint> list = tracksByRequestMap
                            .computeIfAbsent(lt.getRequest().getId(), k -> new ArrayList<>());
                    if (list.size() >= 40) {
                        list.remove(0);
                    }
                    list.add(AdminLiveMapResponse.TrackPoint.builder()
                            .lat(lt.getLat())
                            .lng(lt.getLng())
                            .recordedAt(lt.getRecordedAt())
                            .build());
                }
            }

            List<DispatchOffer> offers = dispatchOfferRepository.findByRequestIdInWithGarage(activeReqIds);
            for (DispatchOffer offer : offers) {
                if (offer.getRequest() != null && offer.getGarage() != null) {
                    Long reqId = offer.getRequest().getId();
                    if (offer.getStatus() == OfferStatus.SENT || offer.getStatus() == OfferStatus.ACCEPTED || !offeredGarageByRequestMap.containsKey(reqId)) {
                        offeredGarageByRequestMap.put(reqId, offer.getGarage());
                    }
                }
            }
        }

        // 3. Xây dựng danh sách Gara
        int onlineGaragesCount = 0;
        int offlineGaragesCount = 0;
        List<AdminLiveMapResponse.LiveGarageItem> garageItems = new ArrayList<>();

        for (Garage g : allGarages) {
            boolean isOnline = g.getStatus() == GarageStatus.APPROVED && Boolean.TRUE.equals(g.getIsOnline());
            if (isOnline) {
                onlineGaragesCount++;
            } else {
                offlineGaragesCount++;
            }

            List<GarageStaff> gStaff = staffByGarageMap.getOrDefault(g.getId(), Collections.emptyList());
            int totalStaff = gStaff.size();
            int freeStaff = (int) gStaff.stream().filter(s -> s.getStatus() == WorkStatus.FREE).count();
            int busyStaff = totalStaff - freeStaff;

            RatingRepository.GarageRatingAgg rAgg = ratingMap.get(g.getId());
            BigDecimal avgRating = (rAgg != null && rAgg.getAvgStars() != null && rAgg.getCnt() != null && rAgg.getCnt() > 0)
                    ? BigDecimal.valueOf(rAgg.getAvgStars()).setScale(1, RoundingMode.HALF_UP)
                    : (g.getAvgRating() != null ? g.getAvgRating() : null);
            Integer ratingCount = (rAgg != null && rAgg.getCnt() != null)
                    ? rAgg.getCnt().intValue()
                    : (g.getRatingCount() != null ? g.getRatingCount() : 0);

            String phone = StringUtils.hasText(g.getPhone()) ? g.getPhone()
                    : (g.getOwner() != null ? g.getOwner().getPhone() : "");

            garageItems.add(AdminLiveMapResponse.LiveGarageItem.builder()
                    .id(g.getId())
                    .name(g.getName())
                    .phone(phone)
                    .address(g.getAddress())
                    .lat(g.getLat())
                    .lng(g.getLng())
                    .status(g.getStatus() != null ? g.getStatus().name() : "APPROVED")
                    .isOnline(isOnline)
                    .capability(g.getCapability() != null ? g.getCapability().name() : "BOTH")
                    .avgRating(avgRating)
                    .ratingCount(ratingCount)
                    .ownerName(g.getOwner() != null ? g.getOwner().getFullName() : null)
                    .ownerPhone(g.getOwner() != null ? g.getOwner().getPhone() : null)
                    .totalStaff(totalStaff)
                    .freeStaff(freeStaff)
                    .busyStaff(busyStaff)
                    .activeOrdersCount(activeOrdersByGarage.getOrDefault(g.getId(), 0))
                    .build());
        }

        // 4. Xây dựng danh sách Đơn cứu hộ & Vị trí nhân viên theo thời gian thực
        int searchingCount = 0;
        int enRouteCount = 0;
        int onsiteCount = 0;
        int activeRescuersCount = 0;

        List<AdminLiveMapResponse.LiveIncidentItem> incidentItems = new ArrayList<>();
        for (RescueRequest r : activeRequests) {
            RescueStatus st = r.getStatus();
            if (st == RescueStatus.SEARCHING || st == RescueStatus.PENDING_GARAGE) {
                searchingCount++;
            } else if (st == RescueStatus.ACCEPTED || st == RescueStatus.ASSIGNED || st == RescueStatus.EN_ROUTE) {
                enRouteCount++;
            } else {
                onsiteCount++;
            }

            // Xác định Gara liên quan (Gara đã nhận đơn HOẶC Gara đang được gửi lời mời trong dispatch_offers)
            Garage effectiveGarage = r.getGarage() != null ? r.getGarage() : offeredGarageByRequestMap.get(r.getId());

            // Xác định vị trí thực tế của nhân viên cứu hộ:
            // 1. Ưu tiên rescuerLat / rescuerLng (do App nhân viên đẩy liên tục mỗi 0.1s vào bảng rescue_requests)
            // 2. Nếu nhân viên đã tới nơi (ARRIVED / DIAGNOSED / REPAIRING_ONSITE) mà chưa có rescuerLat thì lấy vị trí điểm đón
            // 3. Nếu nhân viên vừa được gán (ASSIGNED / EN_ROUTE) hoặc Gara đã nhận chưa kịp đẩy GPS đầu tiên thì lấy tọa độ Gara xuất phát
            Double rescuerLat = r.getRescuerLat();
            Double rescuerLng = r.getRescuerLng();
            if (rescuerLat == null || rescuerLng == null) {
                if (st == RescueStatus.ARRIVED || st == RescueStatus.DIAGNOSED || st == RescueStatus.REPAIRING_ONSITE) {
                    rescuerLat = r.getPickupLat();
                    rescuerLng = r.getPickupLng();
                } else if (r.getEnRouteLat() != null && r.getEnRouteLng() != null) {
                    rescuerLat = r.getEnRouteLat();
                    rescuerLng = r.getEnRouteLng();
                } else if (effectiveGarage != null && effectiveGarage.getLat() != null && effectiveGarage.getLng() != null
                        && (r.getStaff() != null || st == RescueStatus.ACCEPTED || st == RescueStatus.ASSIGNED || st == RescueStatus.EN_ROUTE)) {
                    rescuerLat = effectiveGarage.getLat();
                    rescuerLng = effectiveGarage.getLng();
                }
            }

            if ((r.getStaff() != null || st == RescueStatus.EN_ROUTE || st == RescueStatus.ASSIGNED) && rescuerLat != null && rescuerLng != null) {
                activeRescuersCount++;
            }

            Long locationAgeSec = null;
            if (r.getRescuerLocationAt() != null) {
                locationAgeSec = Math.max(0L, Duration.between(r.getRescuerLocationAt(), now).toSeconds());
            }

            // Tính khoảng cách từ vị trí hiện tại của Nhân viên (hoặc từ Gara được mời) tới vị trí Đơn cứu hộ
            Double targetLat = r.getMeetLat() != null ? r.getMeetLat() : r.getPickupLat();
            Double targetLng = r.getMeetLng() != null ? r.getMeetLng() : r.getPickupLng();
            Double remainingDistKm = null;
            if (rescuerLat != null && rescuerLng != null && targetLat != null && targetLng != null) {
                double dist = haversineKm(rescuerLat, rescuerLng, targetLat, targetLng);
                remainingDistKm = BigDecimal.valueOf(dist).setScale(2, RoundingMode.HALF_UP).doubleValue();
            } else if (effectiveGarage != null && effectiveGarage.getLat() != null && effectiveGarage.getLng() != null
                    && targetLat != null && targetLng != null) {
                double dist = haversineKm(effectiveGarage.getLat(), effectiveGarage.getLng(), targetLat, targetLng);
                remainingDistKm = BigDecimal.valueOf(dist).setScale(2, RoundingMode.HALF_UP).doubleValue();
            }

            incidentItems.add(AdminLiveMapResponse.LiveIncidentItem.builder()
                    .id(r.getId())
                    .code(r.getCode())
                    .status(st != null ? st.name() : "SEARCHING")
                    .vehicleType(r.getVehicleType() != null ? r.getVehicleType().name() : "CAR")
                    .issueType(r.getIssueType())
                    .symptom(r.getSymptom())
                    .quoteType(r.getQuoteType())
                    .pickupLat(r.getPickupLat())
                    .pickupLng(r.getPickupLng())
                    .pickupAddress(r.getPickupAddress())
                    .customerLat(r.getCustomerLat())
                    .customerLng(r.getCustomerLng())
                    .meetLat(r.getMeetLat())
                    .meetLng(r.getMeetLng())
                    .enRouteLat(r.getEnRouteLat())
                    .enRouteLng(r.getEnRouteLng())
                    .rescuerLat(rescuerLat)
                    .rescuerLng(rescuerLng)
                    .rescuerLocationAt(r.getRescuerLocationAt())
                    .rescuerLocationAgeSec(locationAgeSec)
                    .remainingDistanceKm(remainingDistKm)
                    .dispatchDistanceKm(r.getDispatchDistanceKm())
                    .customerId(r.getCustomer() != null ? r.getCustomer().getId() : null)
                    .customerName(r.getCustomer() != null ? r.getCustomer().getFullName() : "Khách hàng")
                    .customerPhone(StringUtils.hasText(r.getContactPhone()) ? r.getContactPhone()
                            : (r.getCustomer() != null ? r.getCustomer().getPhone() : ""))
                    .customerLicensePlate(r.getCustomerVehicle() != null ? r.getCustomerVehicle().getLicensePlate() : null)
                    .garageId(effectiveGarage != null ? effectiveGarage.getId() : null)
                    .garageName(effectiveGarage != null ? effectiveGarage.getName() : null)
                    .garagePhone(effectiveGarage != null ? effectiveGarage.getPhone() : null)
                    .garageLat(effectiveGarage != null ? effectiveGarage.getLat() : null)
                    .garageLng(effectiveGarage != null ? effectiveGarage.getLng() : null)
                    .staffId(r.getStaff() != null ? r.getStaff().getId() : null)
                    .staffName(r.getStaff() != null && r.getStaff().getUser() != null
                            ? r.getStaff().getUser().getFullName() : null)
                    .staffPhone(r.getStaff() != null && r.getStaff().getUser() != null
                            ? r.getStaff().getUser().getPhone() : null)
                    .staffCode(r.getStaff() != null ? r.getStaff().getStaffCode() : null)
                    .rescueVehiclePlate(r.getRescueVehicle() != null ? r.getRescueVehicle().getLicensePlate() : null)
                    .rescueVehicleKind(r.getRescueVehicle() != null && r.getRescueVehicle().getVehicleKind() != null
                            ? r.getRescueVehicle().getVehicleKind().name() : null)
                    .createdAt(r.getCreatedAt())
                    .enRouteAt(r.getEnRouteAt())
                    .arrivedAt(r.getArrivedAt())
                    .breadcrumbs(tracksByRequestMap.getOrDefault(r.getId(), Collections.emptyList()))
                    .build());
        }

        AdminLiveMapResponse.SummaryStats summary = AdminLiveMapResponse.SummaryStats.builder()
                .totalGarages(garageItems.size())
                .onlineGarages(onlineGaragesCount)
                .offlineGarages(offlineGaragesCount)
                .activeIncidentsCount(incidentItems.size())
                .searchingIncidentsCount(searchingCount)
                .enRouteIncidentsCount(enRouteCount)
                .onsiteIncidentsCount(onsiteCount)
                .activeRescuersCount(activeRescuersCount)
                .build();

        AdminLiveMapResponse response = AdminLiveMapResponse.builder()
                .summary(summary)
                .garages(garageItems)
                .activeIncidents(incidentItems)
                .serverTime(now)
                .build();

        return ResponseEntity.ok(ApiResponse.success("Đồng bộ bản đồ điều hành thời gian thực thành công", response));
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
}
