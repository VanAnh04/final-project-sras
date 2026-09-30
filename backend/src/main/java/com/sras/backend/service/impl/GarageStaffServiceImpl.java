package com.sras.backend.service.impl;

import com.sras.backend.dto.request.AddGarageStaffRequest;
import com.sras.backend.dto.response.GarageStaffResponse;
import com.sras.backend.dto.response.StaffDashboardResponse;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.UserStatus;
import com.sras.backend.entity.enums.WorkStatus;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.GarageStaffRepository;
import com.sras.backend.repository.RatingRepository;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.GarageStaffService;
import com.sras.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GarageStaffServiceImpl implements GarageStaffService {

    private final GarageRepository garageRepository;
    private final GarageStaffRepository garageStaffRepository;
    private final UserRepository userRepository;
    private final RatingRepository ratingRepository;
    private final NotificationService notificationService;
    private final PasswordEncoder passwordEncoder;

    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#%&";
    private static final SecureRandom RANDOM = new SecureRandom();

    private String generateRandomPassword(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(PASSWORD_CHARS.charAt(RANDOM.nextInt(PASSWORD_CHARS.length())));
        }
        return sb.toString();
    }

    private Garage getApprovedGarage(User owner) {
        Garage garage = garageRepository.findByOwner(owner)
                .orElseThrow(() -> new BadRequestException("Bạn chưa sở hữu Gara nào trên hệ thống"));
        if (garage.getStatus() != GarageStatus.APPROVED) {
            throw new BadRequestException("Hồ sơ Gara của bạn chưa được phê duyệt hoặc đang bị tạm ngưng");
        }
        return garage;
    }

    @Override
    @Transactional(readOnly = true)
    public List<GarageStaffResponse> getStaffList(User owner) {
        Garage garage = getApprovedGarage(owner);
        List<GarageStaff> staffList = garageStaffRepository.findByGarageAndIsDeletedFalseOrderByCreatedAtDesc(garage);

        Map<Long, RatingRepository.StaffRatingAgg> ratingByStaff = staffList.isEmpty()
                ? Map.of()
                : ratingRepository.aggregateByStaff(staffList.stream().map(GarageStaff::getId).toList())
                        .stream().collect(Collectors.toMap(
                                RatingRepository.StaffRatingAgg::getStaffId, Function.identity()));

        return staffList.stream()
                .map(s -> toResponse(s, ratingByStaff.get(s.getId())))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public GarageStaffResponse addStaff(User owner, AddGarageStaffRequest request) {
        Garage garage = getApprovedGarage(owner);
        String phone = request.getPhone().trim();

        // 1. Kiểm tra không được tự thêm chính mình
        if (phone.equals(owner.getPhone())) {
            throw new BadRequestException("Bạn không thể tự thêm chính mình làm nhân viên trong Gara của mình.");
        }

        // 2. Tìm tài khoản theo SĐT
        User staffUser = userRepository.findByPhone(phone).orElse(null);
        String assignedPassword = StringUtils.hasText(request.getPassword()) ? request.getPassword() : generateRandomPassword(8);
        String email = StringUtils.hasText(request.getEmail()) ? request.getEmail().trim().toLowerCase() : null;

        if (email != null && userRepository.existsByEmail(email)) {
            if (staffUser == null || staffUser.getEmail() == null || !email.equalsIgnoreCase(staffUser.getEmail())) {
                throw new BadRequestException("Email đã tồn tại trong hệ thống");
            }
        }

        if (staffUser != null) {
            // Kiểm tra không được thêm tài khoản ADMIN
            if (staffUser.getRole() == UserRole.ADMIN) {
                throw new BadRequestException("Không thể thêm tài khoản Quản trị viên hệ thống (Admin) làm nhân viên cứu hộ.");
            }

            // Kiểm tra không được thêm Chủ của một Gara khác
            if (garageRepository.existsByOwner(staffUser) && !staffUser.getId().equals(owner.getId())) {
                throw new BadRequestException("Tài khoản này hiện đang là Chủ của một Gara khác trên hệ thống.");
            }

            // Kiểm tra xem thợ này có đang làm việc tại Gara nào còn hiệu lực không (isDeleted = false)
            Optional<GarageStaff> activeStaffInAnyGarage = garageStaffRepository.findByUserAndIsDeletedFalse(staffUser);
            if (activeStaffInAnyGarage.isPresent()) {
                GarageStaff currentStaff = activeStaffInAnyGarage.get();
                if (currentStaff.getGarage().getId().equals(garage.getId())) {
                    if (Boolean.TRUE.equals(currentStaff.getIsActive())) {
                        throw new BadRequestException("Nhân viên này đã có trong danh sách đội ngũ của Gara bạn rồi.");
                    } else {
                        throw new BadRequestException("Nhân viên này đã có trong Gara (đang tạm ngưng). Bạn chỉ cần gạt nút kích hoạt lại.");
                    }
                } else {
                    String otherGarageName = currentStaff.getGarage().getName();
                    throw new BadRequestException("Nhân viên này đang làm việc tại Gara '" + otherGarageName + "'. Nhân viên cần thôi việc tại Gara cũ trước khi gia nhập Gara mới.");
                }
            }

            // Nâng cấp quyền tài khoản sang GARAGE_STAFF
            staffUser.setRole(UserRole.GARAGE_STAFF);
            if (StringUtils.hasText(request.getFullName())) {
                staffUser.setFullName(request.getFullName().trim());
            }
            if (email != null) {
                staffUser.setEmail(email);
            }
            if (StringUtils.hasText(request.getAvatarUrl())) {
                staffUser.setAvatarUrl(request.getAvatarUrl().trim());
            }

            // Cập nhật mật khẩu mới do chủ xưởng cấp
            staffUser.setPasswordHash(passwordEncoder.encode(assignedPassword));
            userRepository.save(staffUser);
        } else {
            // Chưa có tài khoản -> Tự động tạo mới
            staffUser = new User();
            staffUser.setPhone(phone);
            if (email != null) {
                staffUser.setEmail(email);
            }
            staffUser.setFullName(request.getFullName().trim());
            if (StringUtils.hasText(request.getAvatarUrl())) {
                staffUser.setAvatarUrl(request.getAvatarUrl().trim());
            }
            staffUser.setRole(UserRole.GARAGE_STAFF);
            staffUser.setStatus(UserStatus.ACTIVE);
            staffUser.setIsPhoneVerified(true);
            staffUser.setDebtAmount(0L);
            staffUser.setIsBlockedByDebt(false);
            staffUser.setPasswordHash(passwordEncoder.encode(assignedPassword));
            staffUser = userRepository.save(staffUser);
            log.info("Tạo tài khoản thợ mới cho SĐT {}", phone);
        }

        // 3. Tạo hoặc khôi phục bản ghi trong garage_staff
        // Tìm xem thợ này trước đó đã từng có bản ghi cũ ở gara này chưa (kể cả isDeleted = true)
        Optional<GarageStaff> oldRecordOpt = garageStaffRepository.findByGarageAndUser(garage, staffUser);
        GarageStaff staffRecord;
        if (oldRecordOpt.isPresent()) {
            staffRecord = oldRecordOpt.get();
            staffRecord.setIsDeleted(false);
            staffRecord.setIsActive(true);
            staffRecord.setStatus(WorkStatus.FREE);
            if (StringUtils.hasText(request.getStaffCode())) {
                staffRecord.setStaffCode(request.getStaffCode().trim());
            }
        } else {
            staffRecord = new GarageStaff();
            staffRecord.setGarage(garage);
            staffRecord.setUser(staffUser);
            staffRecord.setStaffCode(StringUtils.hasText(request.getStaffCode())
                    ? request.getStaffCode().trim()
                    : "NV-" + staffUser.getId());
            staffRecord.setStatus(WorkStatus.FREE);
            staffRecord.setIsActive(true);
        }

        GarageStaff saved = garageStaffRepository.save(staffRecord);

        // Bắn thông báo cho Thợ
        try {
            notificationService.createNotification(
                    staffUser,
                    NotificationType.NEW_ORDER,
                    "Bạn đã được thêm vào Gara!",
                    "Chúc mừng! Bạn đã được thêm vào Gara '" + garage.getName() + "' với vai trò Kỹ thuật viên cứu hộ.",
                    "GARAGE",
                    garage.getId()
            );
        } catch (Exception e) {
            log.warn("Không thể gửi thông báo cho thợ: {}", e.getMessage());
        }

        GarageStaffResponse response = toResponse(saved);
        response.setTempPassword(assignedPassword); // Trả về mật khẩu khởi tạo 1 lần duy nhất cho chủ xưởng copy
        return response;
    }

    @Override
    @Transactional
    public GarageStaffResponse toggleStaffActive(User owner, Long staffId) {
        Garage garage = getApprovedGarage(owner);
        GarageStaff staff = garageStaffRepository.findByGarageAndIdAndIsDeletedFalse(garage, staffId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy nhân viên trong Gara"));

        if (staff.getStatus() == WorkStatus.BUSY) {
            throw new BadRequestException("Nhân viên đang thực hiện ca cứu hộ, không thể tạm ngưng lúc này");
        }

        staff.setIsActive(!Boolean.TRUE.equals(staff.getIsActive()));
        GarageStaff updated = garageStaffRepository.save(staff);
        return toResponse(updated);
    }

    @Override
    @Transactional
    public void removeStaff(User owner, Long staffId) {
        Garage garage = getApprovedGarage(owner);
        GarageStaff staff = garageStaffRepository.findByGarageAndIdAndIsDeletedFalse(garage, staffId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy nhân viên trong Gara"));

        if (staff.getStatus() == WorkStatus.BUSY) {
            throw new BadRequestException("Nhân viên đang thực hiện ca cứu hộ (BUSY), không thể cho thôi việc lúc này!");
        }

        // Đánh dấu thôi việc: isDeleted = true, isActive = false
        staff.setIsDeleted(true);
        staff.setIsActive(false);
        garageStaffRepository.save(staff);

        // Trả vai trò User về CUSTOMER
        User staffUser = staff.getUser();
        staffUser.setRole(UserRole.CUSTOMER);
        userRepository.save(staffUser);

        try {
            notificationService.createNotification(
                    staffUser,
                    NotificationType.GARAGE_REVIEWED,
                    "Thông báo thôi việc",
                    "Bạn đã được Gara '" + garage.getName() + "' cho thôi việc. Tài khoản của bạn đã trở về trạng thái Khách hàng tự do.",
                    "GARAGE",
                    garage.getId()
            );
        } catch (Exception e) {
            log.warn("Không thể gửi thông báo thôi việc: {}", e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public StaffDashboardResponse getStaffDashboard(User staffUser) {
        Garage garage = null;
        GarageStaff staff = null;
        boolean isOnline = true;

        Optional<GarageStaff> staffOpt = garageStaffRepository.findByUserAndIsDeletedFalse(staffUser);
        if (staffOpt.isPresent()) {
            staff = staffOpt.get();
            garage = staff.getGarage();
            isOnline = Boolean.TRUE.equals(staff.getIsActive());
        } else {
            Optional<Garage> ownerGarageOpt = garageRepository.findByOwner(staffUser);
            if (ownerGarageOpt.isPresent()) {
                garage = ownerGarageOpt.get();
                isOnline = Boolean.TRUE.equals(garage.getIsOnline());
            } else {
                throw new BadRequestException("Bạn chưa được liên kết vào Gara nào hoặc đã thôi việc");
            }
        }

        String realGarageAddress = (garage.getAddress() != null && !garage.getAddress().isBlank())
                ? garage.getAddress()
                : "Chưa cập nhật địa chỉ gara";

        return StaffDashboardResponse.builder()
                .staffId(staff != null ? staff.getId() : 0L)
                .userId(staffUser.getId())
                .fullName(staffUser.getFullName())
                .phone(staffUser.getPhone())
                .avatarUrl(staffUser.getAvatarUrl())
                .garageId(garage.getId())
                .garageName(garage.getName())
                .garageAddress(realGarageAddress)
                .garagePhone(garage.getPhone())
                .isOnline(isOnline)
                .status(staff != null ? staff.getStatus() : WorkStatus.FREE)
                .currentAddress(realGarageAddress)
                .lat(garage.getLat())
                .lng(garage.getLng())
                .todayCompletedJobs(3) // Thống kê 3 cuốc hôm nay
                .todayEarnings(900000L) // Thu nhập 900.000đ hôm nay
                .build();
    }

    @Override
    @Transactional
    public StaffDashboardResponse updateStaffOnlineStatus(User staffUser, boolean isOnline) {
        GarageStaff staff = garageStaffRepository.findByUserAndIsDeletedFalse(staffUser)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thông tin nhân viên"));

        staff.setIsActive(isOnline);
        garageStaffRepository.save(staff);
        return getStaffDashboard(staffUser);
    }

    @Override
    @Transactional
    public void staffLeaveGarage(User staffUser) {
        GarageStaff staff = garageStaffRepository.findByUserAndIsDeletedFalse(staffUser)
                .orElseThrow(() -> new BadRequestException("Bạn không thuộc Gara nào"));

        if (staff.getStatus() == WorkStatus.BUSY) {
            throw new BadRequestException("Bạn đang có ca cứu hộ chưa hoàn tất, không thể rời Gara lúc này!");
        }

        staff.setIsDeleted(true);
        staff.setIsActive(false);
        garageStaffRepository.save(staff);

        staffUser.setRole(UserRole.CUSTOMER);
        userRepository.save(staffUser);
    }

    private GarageStaffResponse toResponse(GarageStaff staff) {
        return toResponse(staff, null);
    }

    private GarageStaffResponse toResponse(GarageStaff staff, RatingRepository.StaffRatingAgg agg) {
        Double avg = null;
        Integer count = 0;
        if (agg != null && agg.getCnt() != null && agg.getCnt() > 0 && agg.getAvgStars() != null) {
            avg = BigDecimal.valueOf(agg.getAvgStars()).setScale(1, RoundingMode.HALF_UP).doubleValue();
            count = agg.getCnt().intValue();
        }
        User u = staff.getUser();
        Garage g = staff.getGarage();
        String fullName = u != null ? u.getFullName() : "Kỹ thuật viên";
        return GarageStaffResponse.builder()
                .id(staff.getId())
                .userId(u != null ? u.getId() : null)
                .fullName(fullName)
                .phone(u != null ? u.getPhone() : "")
                .avatarUrl(u != null ? u.getAvatarUrl() : null)
                .staffCode(staff.getStaffCode())
                .status(staff.getStatus())
                .isActive(staff.getIsActive())
                .garageId(g != null ? g.getId() : null)
                .garageName(g != null ? g.getName() : null)
                .garageAddress(g != null ? g.getAddress() : null)
                .garagePhone(g != null ? g.getPhone() : null)
                .activeJobsCount(staff.getStatus() == WorkStatus.BUSY ? 1 : 0)
                .todayCompletedJobs(3)
                .rating(avg)
                .ratingCount(count)
                .createdAt(staff.getCreatedAt())
                .build();
    }
}
