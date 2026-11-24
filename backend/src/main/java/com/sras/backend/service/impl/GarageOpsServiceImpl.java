package com.sras.backend.service.impl;

import com.sras.backend.dto.request.CreateRescueVehicleRequest;
import com.sras.backend.dto.response.GarageStaffResponse;
import com.sras.backend.dto.response.RescueVehicleResponse;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.RescueVehicle;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.AiVerificationStatus;
import com.sras.backend.entity.enums.WorkStatus;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.GarageStaffRepository;
import com.sras.backend.repository.RatingRepository;
import com.sras.backend.repository.RescueVehicleRepository;
import com.sras.backend.service.GarageOpsService;
import lombok.RequiredArgsConstructor;
import com.sras.backend.dto.request.VehiclePhotoAnalysisRequest;
import com.sras.backend.dto.response.VehiclePhotoAnalysisResponse;
import com.sras.backend.service.AiImageVerificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GarageOpsServiceImpl implements GarageOpsService {

    private final GarageRepository garageRepository;
    private final GarageStaffRepository garageStaffRepository;
    private final RescueVehicleRepository rescueVehicleRepository;
    private final RatingRepository ratingRepository;
    private final AiImageVerificationService aiImageVerificationService;

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
                .stream()
                .filter(v -> !Boolean.TRUE.equals(v.getIsDeleted()))
                .map(this::toVehicleResponse)
                .toList();
    }

    private static final Pattern PLATE_PATTERN = Pattern.compile(
            CreateRescueVehicleRequest.LICENSE_PLATE_REGEX
    );

    public static String formatLicensePlate(String input) {
        if (input == null || input.isBlank()) {
            throw new BadRequestException("Biển số xe không được để trống");
        }
        String trimmed = input.trim();
        Matcher m = PLATE_PATTERN.matcher(trimmed);
        if (!m.matches()) {
            throw new BadRequestException("Biển số xe không đúng định dạng chuẩn (VD: 51C-04218, 29A-12345, 59P1-23456)");
        }
        // Tách các thành phần: tỉnh, seri, số
        Pattern extractPattern = Pattern.compile(
                "^\\s*([1-9][0-9])\\s*[- ]?\\s*([A-Za-z]{1,2}|[A-Za-z][0-9])\\s*[- ]?\\s*([0-9]{3}\\.[0-9]{2}|[0-9]{5}|[0-9]{2}\\.[0-9]{2}|[0-9]{4})\\s*$"
        );
        Matcher em = extractPattern.matcher(trimmed);
        if (em.matches()) {
            String province = em.group(1);
            String series = em.group(2).toUpperCase();
            String numbers = em.group(3).replace(".", "");
            return province + series + "-" + numbers;
        }
        return trimmed.replace(".", "").toUpperCase();
    }

    @Override
    @Transactional
    public RescueVehicleResponse createVehicle(User owner, CreateRescueVehicleRequest req) {
        Garage garage = requireGarage(owner);

        String normalizedPlate = formatLicensePlate(req.getLicensePlate());
        String cleanPlate = normalizedPlate.replaceAll("[^A-Za-z0-9]", "").toUpperCase();

        // 1. Kiểm tra xem xe này đã có trong gara hiện tại chưa (so khớp chuẩn hóa bỏ ký tự đặc biệt)
        List<RescueVehicle> allInGarage = rescueVehicleRepository.findByGarageAndIsActiveTrue(garage);
        boolean duplicateInGarage = allInGarage.stream().anyMatch(v ->
                !Boolean.TRUE.equals(v.getIsDeleted()) &&
                v.getLicensePlate() != null &&
                v.getLicensePlate().replaceAll("[^A-Za-z0-9]", "").equalsIgnoreCase(cleanPlate)
        );
        if (duplicateInGarage) {
            throw new BadRequestException("Xe có biển số " + normalizedPlate + " đã tồn tại trong Gara của bạn!");
        }

        // 2. Kích hoạt lại xe nếu trước đó đã từng có xe cùng biển số bị xóa (soft delete)
        List<RescueVehicle> existingInGarage = rescueVehicleRepository
                .findByGarageAndLicensePlateIgnoreCase(garage, normalizedPlate);
        if (!existingInGarage.isEmpty()) {
            RescueVehicle existing = existingInGarage.get(0);
            existing.setIsDeleted(false);
            existing.setIsActive(true);
            existing.setLicensePlate(normalizedPlate);
            existing.setVehicleKind(req.getVehicleKind());
            existing.setStatus(WorkStatus.FREE);
            if (req.getImageUrl() != null && !req.getImageUrl().isBlank()) {
                existing.setImageUrl(req.getImageUrl().trim());
            }
            existing = rescueVehicleRepository.save(existing);
            return toVehicleResponse(existing);
        }

        // 3. Kiểm tra xem xe này đã được đăng ký bởi gara khác trong hệ thống chưa
        boolean duplicateSystem = rescueVehicleRepository.findAll().stream().anyMatch(v ->
                !Boolean.TRUE.equals(v.getIsDeleted()) &&
                v.getGarage() != null && !v.getGarage().getId().equals(garage.getId()) &&
                v.getLicensePlate() != null &&
                v.getLicensePlate().replaceAll("[^A-Za-z0-9]", "").equalsIgnoreCase(cleanPlate)
        );
        if (duplicateSystem) {
            throw new BadRequestException("Biển số xe " + normalizedPlate + " đã được đăng ký bởi gara khác trên hệ thống!");
        }

        RescueVehicle v = new RescueVehicle();
        v.setGarage(garage);
        v.setLicensePlate(normalizedPlate);
        v.setVehicleKind(req.getVehicleKind());
        if (req.getImageUrl() != null && !req.getImageUrl().isBlank()) {
            String img = req.getImageUrl().trim();
            v.setImageUrl(img);
            try {
                VehiclePhotoAnalysisResponse aiRes = aiImageVerificationService.verifyVehiclePhoto(
                        VehiclePhotoAnalysisRequest.builder()
                                .photoUrl(img)
                                .expectedPlate(normalizedPlate)
                                .expectedKind(req.getVehicleKind())
                                .build()
                );
                if (aiRes != null) {
                    if (aiRes.getStatus() == AiVerificationStatus.REJECTED || Boolean.TRUE.equals(aiRes.getIsScreenCapture()) || Boolean.FALSE.equals(aiRes.getIsRescueVehicle())) {
                        throw new BadRequestException("Ảnh xe cứu hộ không hợp lệ: " + (aiRes.getMessage() != null ? aiRes.getMessage() : "AI phát hiện ảnh không phải phương tiện cứu hộ hợp lệ của Gara."));
                    }
                    if (Boolean.FALSE.equals(aiRes.getPlateMatch())) {
                        throw new BadRequestException("Biển số xe " + normalizedPlate + " không khớp với biển số nhận diện trên ảnh (" + (aiRes.getDetectedPlate() != null ? aiRes.getDetectedPlate() : "không rõ") + ")!");
                    }
                    if (Boolean.FALSE.equals(aiRes.getKindMatch())) {
                        throw new BadRequestException("Loại xe đăng ký (" + req.getVehicleKind() + ") không khớp với loại xe nhận diện trên ảnh (" + aiRes.getDetectedKind() + ")!");
                    }
                    v.setAiVerificationStatus(aiRes.getStatus());
                    v.setAiDetectedPlate(aiRes.getDetectedPlate());
                    v.setAiConfidenceScore(aiRes.getConfidenceScore());
                    v.setAiNotes(aiRes.getMessage());
                }
            } catch (BadRequestException bre) {
                throw bre;
            } catch (Exception ex) {
                log.warn("[GarageOps] Không thể xác minh AI ảnh xe: {}", ex.getMessage());
            }
        }
        v.setCapability(garage.getCapability());
        v.setStatus(WorkStatus.FREE);
        v.setIsActive(true);
        v = rescueVehicleRepository.save(v);

        return toVehicleResponse(v);
    }

    @Override
    @Transactional
    public void deleteVehicle(User owner, Long vehicleId) {
        Garage garage = requireGarage(owner);
        RescueVehicle vehicle = rescueVehicleRepository.findByIdAndGarage(vehicleId, garage)
                .filter(v -> !Boolean.TRUE.equals(v.getIsDeleted()))
                .orElseThrow(() -> new BadRequestException("Không tìm thấy xe cứu hộ trong Gara"));

        if (vehicle.getStatus() == WorkStatus.BUSY) {
            throw new BadRequestException("Xe cứu hộ đang thực hiện ca cứu hộ (BUSY), không thể xóa lúc này!");
        }

        vehicle.setIsDeleted(true);
        vehicle.setIsActive(false);
        rescueVehicleRepository.save(vehicle);
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
                .isActive(v.getIsActive())
                .aiVerificationStatus(v.getAiVerificationStatus())
                .aiDetectedPlate(v.getAiDetectedPlate())
                .aiConfidenceScore(v.getAiConfidenceScore())
                .aiNotes(v.getAiNotes())
                .build();
    }
}
