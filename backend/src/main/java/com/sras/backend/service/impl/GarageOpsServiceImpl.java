package com.sras.backend.service.impl;

import com.sras.backend.dto.request.CreateRescueVehicleRequest;
import com.sras.backend.dto.response.GarageStaffResponse;
import com.sras.backend.dto.response.RescueVehicleResponse;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.RescueVehicle;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.WorkStatus;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.GarageStaffRepository;
import com.sras.backend.repository.RatingRepository;
import com.sras.backend.repository.RescueVehicleRepository;
import com.sras.backend.service.GarageOpsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GarageOpsServiceImpl implements GarageOpsService {

    private final GarageRepository garageRepository;
    private final GarageStaffRepository garageStaffRepository;
    private final RescueVehicleRepository rescueVehicleRepository;
    private final RatingRepository ratingRepository;

    private Garage requireGarage(User owner) {
        return garageRepository.findByOwner(owner)
                .orElseThrow(() -> new BadRequestException("Bạn chưa sở hữu gara nào"));
    }

    @Override
    @Transactional(readOnly = true)
    public List<GarageStaffResponse> listStaff(User owner) {
        Garage garage = requireGarage(owner);
        List<GarageStaff> staff = garageStaffRepository.findByGarageAndIsActiveTrue(garage);

        // Rating THẬT: gộp điểm trung bình + số lượt theo nhân viên (đánh giá của khách).
        Map<Long, RatingRepository.StaffRatingAgg> ratingByStaff = staff.isEmpty()
                ? Map.of()
                : ratingRepository.aggregateByStaff(staff.stream().map(GarageStaff::getId).toList())
                        .stream().collect(Collectors.toMap(
                                RatingRepository.StaffRatingAgg::getStaffId, Function.identity()));

        return staff.stream()
                .map(s -> toStaffResponse(s, ratingByStaff.get(s.getId())))
                .toList();
    }


    @Override
    @Transactional(readOnly = true)
    public List<RescueVehicleResponse> listVehicles(User owner) {
        Garage garage = requireGarage(owner);
        return rescueVehicleRepository.findByGarageAndIsActiveTrue(garage)
                .stream().map(this::toVehicleResponse).toList();
    }

    @Override
    @Transactional
    public RescueVehicleResponse createVehicle(User owner, CreateRescueVehicleRequest req) {
        Garage garage = requireGarage(owner);

        RescueVehicle v = new RescueVehicle();
        v.setGarage(garage);
        v.setLicensePlate(req.getLicensePlate().trim().toUpperCase());
        v.setVehicleKind(req.getVehicleKind());
        if (req.getImageUrl() != null && !req.getImageUrl().isBlank()) {
            v.setImageUrl(req.getImageUrl().trim());
        }
        v.setCapability(garage.getCapability());
        v.setStatus(WorkStatus.FREE);
        v.setIsActive(true);
        v = rescueVehicleRepository.save(v);

        return toVehicleResponse(v);
    }

    private GarageStaffResponse toStaffResponse(GarageStaff s, RatingRepository.StaffRatingAgg agg) {
        Double avg = null;
        Integer count = 0;
        if (agg != null && agg.getCnt() != null && agg.getCnt() > 0 && agg.getAvgStars() != null) {
            avg = BigDecimal.valueOf(agg.getAvgStars()).setScale(1, RoundingMode.HALF_UP).doubleValue();
            count = agg.getCnt().intValue();
        }
        User u = s.getUser();
        String fullName = u != null ? u.getFullName() : null;
        return GarageStaffResponse.builder()
                .id(s.getId())
                .userId(u != null ? u.getId() : null)
                .fullName(fullName)
                .phone(u != null ? u.getPhone() : null)
                .avatarUrl(u != null ? u.getAvatarUrl() : null)
                .staffCode(s.getStaffCode())
                .status(s.getStatus())
                .isActive(s.getIsActive())
                .garageId(s.getGarage() != null ? s.getGarage().getId() : null)
                .garageName(s.getGarage() != null ? s.getGarage().getName() : null)
                .rating(avg)
                .ratingCount(count)
                .createdAt(s.getCreatedAt())
                .build();
    }

    private RescueVehicleResponse toVehicleResponse(RescueVehicle v) {
        return RescueVehicleResponse.builder()
                .id(v.getId())
                .licensePlate(v.getLicensePlate())
                .vehicleKind(v.getVehicleKind() != null ? v.getVehicleKind().name() : null)
                .imageUrl(v.getImageUrl())
                .status(v.getStatus() != null ? v.getStatus().name() : null)
                .build();
    }
}
