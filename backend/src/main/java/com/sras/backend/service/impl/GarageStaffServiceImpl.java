package com.sras.backend.service.impl;

import com.sras.backend.dto.request.AddGarageStaffRequest;
import com.sras.backend.dto.response.GarageStaffResponse;
import com.sras.backend.dto.response.RescueRequestResponse;
import com.sras.backend.dto.response.StaffDashboardResponse;
import com.sras.backend.dto.response.StaffWalletResponse;
import com.sras.backend.dto.response.WalletTransactionResponse;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.entity.WalletTransaction;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.entity.enums.StaffInvitationStatus;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.UserStatus;
import com.sras.backend.entity.enums.WorkStatus;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.GarageStaffRepository;
import com.sras.backend.repository.RatingRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.repository.WalletTransactionRepository;
import com.sras.backend.service.GarageStaffService;
import com.sras.backend.service.NotificationService;
import com.sras.backend.util.PhoneUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
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
    private final RescueRequestRepository rescueRequestRepository;
    private final UserRepository userRepository;
    private final RatingRepository ratingRepository;
    private final NotificationService notificationService;
    private final PasswordEncoder passwordEncoder;
    private final WalletTransactionRepository walletTransactionRepository;

    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#%&";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final List<RescueStatus> ONGOING_STAFF_STATUSES = List.of(
            RescueStatus.ASSIGNED, RescueStatus.EN_ROUTE, RescueStatus.ARRIVED,
            RescueStatus.DIAGNOSED, RescueStatus.REPAIRING_ONSITE, RescueStatus.TOWING,
            RescueStatus.TOW_TO_GARAGE, RescueStatus.COMPLETED, RescueStatus.AWAITING_PAYMENT);

    private boolean hasOngoingRescueOrder(GarageStaff staff) {
        if (staff == null) {
            return false;
        }
        return staff.getStatus() == WorkStatus.BUSY
                || rescueRequestRepository.existsByStaffAndIsDeletedFalseAndStatusIn(staff, ONGOING_STAFF_STATUSES);
    }

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
        return doAddStaff(garage, request, owner);
    }

    private GarageStaffResponse doAddStaff(Garage garage, AddGarageStaffRequest request, User owner) {
        String phone = PhoneUtils.normalizeVnPhone(request.getPhone());

        // 1. Kiểm tra không được tự thêm chính mình (nếu do owner gọi)
        if (owner != null && phone != null && phone.equals(PhoneUtils.normalizeVnPhone(owner.getPhone()))) {
            throw new BadRequestException("Bạn không thể tự thêm chính mình làm nhân viên trong Gara của mình.");
        }

        // 2. Tìm tài khoản theo SĐT (hỗ trợ cả biến thể +84 / 84 / 0)
        User staffUser = userRepository.findFirstByPhoneIn(PhoneUtils.phoneVariants(phone)).orElse(null);
        String assignedPassword = StringUtils.hasText(request.getPassword()) ? request.getPassword() : generateRandomPassword(8);
        String email = StringUtils.hasText(request.getEmail()) ? request.getEmail().trim().toLowerCase() : null;

        if (email != null && userRepository.existsByEmail(email)) {
            if (staffUser == null || staffUser.getEmail() == null || !email.equalsIgnoreCase(staffUser.getEmail())) {
                throw new BadRequestException("Email đã tồn tại trong hệ thống");
            }
        }

        boolean isExistingUser = (staffUser != null);

        if (isExistingUser) {
            // Kiểm tra không được thêm tài khoản ADMIN
            if (staffUser.getRole() == UserRole.ADMIN) {
                throw new BadRequestException("Không thể thêm tài khoản Quản trị viên hệ thống (Admin) làm nhân viên cứu hộ.");
            }

            // Kiểm tra trạng thái Gara của tài khoản này (nếu có)
            Optional<Garage> ownedGarageOpt = garageRepository.findByOwner(staffUser);
            if (ownedGarageOpt.isPresent() && (owner == null || !staffUser.getId().equals(owner.getId()))) {
                Garage ownedGarage = ownedGarageOpt.get();
                if (ownedGarage.getStatus() == GarageStatus.APPROVED) {
                    throw new BadRequestException("Tài khoản này hiện đang là Chủ của một Gara đang hoạt động trên hệ thống.");
                } else if (ownedGarage.getStatus() == GarageStatus.PENDING) {
                    throw new BadRequestException("Tài khoản này đang có hồ sơ đăng ký Gara chờ xét duyệt. Vui lòng nhờ ứng viên vào mục 'Đăng ký Đối tác' bấm 'Rút lại hồ sơ' trước khi gia nhập làm thợ.");
                }
                // Nếu Gara bị REJECTED (từ chối): Cho phép gia nhập làm nhân viên cứu hộ bình thường!
            }

            // Kiểm tra xem thợ này có đang làm việc tại Gara nào còn hiệu lực không (isDeleted = false)
            Optional<GarageStaff> activeStaffInAnyGarage = garageStaffRepository.findByUserAndIsDeletedFalse(staffUser);
            if (activeStaffInAnyGarage.isPresent()) {
                GarageStaff currentStaff = activeStaffInAnyGarage.get();
                if (currentStaff.getGarage().getId().equals(garage.getId())) {
                    if (currentStaff.getInvitationStatus() == StaffInvitationStatus.PENDING) {
                        throw new BadRequestException("Bạn đã gửi lời mời gia nhập cho nhân viên này rồi. Vui lòng chờ nhân viên xác nhận trên ứng dụng.");
                    } else if (Boolean.TRUE.equals(currentStaff.getIsActive())) {
                        throw new BadRequestException("Nhân viên này đã có trong danh sách đội ngũ của Gara bạn rồi.");
                    } else {
                        throw new BadRequestException("Nhân viên này đã có trong Gara (đang tạm ngưng). Bạn chỉ cần gạt nút kích hoạt lại.");
                    }
                } else {
                    String otherGarageName = currentStaff.getGarage().getName();
                    if (currentStaff.getInvitationStatus() == StaffInvitationStatus.PENDING) {
                        throw new BadRequestException("Nhân viên này đang có một lời mời gia nhập Gara '" + otherGarageName + "' chưa phản hồi.");
                    } else {
                        throw new BadRequestException("Nhân viên này đang làm việc tại Gara '" + otherGarageName + "'. Nhân viên cần thôi việc tại Gara cũ trước khi gia nhập Gara mới.");
                    }
                }
            }

            // Với tài khoản đã tồn tại: TUYỆT ĐỐI KHÔNG đổi mật khẩu và CHƯA đổi role ngay!
            // Giữ nguyên mật khẩu và vai trò hiện tại của người dùng. Role sẽ chỉ nâng cấp khi họ bấm Đồng ý lời mời.
        } else {
            // Chưa có tài khoản -> Tự động tạo mới với vai trò thợ và mật khẩu khởi tạo
            staffUser = new User();
            staffUser.setPhone(phone);
            if (email != null) {
                staffUser.setEmail(email);
            }
            staffUser.setFullName(request.getFullName().trim());
            if (StringUtils.hasText(request.getAvatarUrl())) {
                staffUser.setAvatarUrl(request.getAvatarUrl().trim());
            } else {
                String nameForAvatar = StringUtils.hasText(request.getFullName()) ? request.getFullName().trim() : "Staff";
                String encodedName = java.net.URLEncoder.encode(nameForAvatar, java.nio.charset.StandardCharsets.UTF_8);
                staffUser.setAvatarUrl("https://ui-avatars.com/api/?name=" + encodedName + "&background=ea580c&color=fff&size=256&bold=true");
            }
            staffUser.setRole(UserRole.CUSTOMER);
            staffUser.setStatus(UserStatus.ACTIVE);
            staffUser.setIsPhoneVerified(false);
            staffUser.setDebtAmount(0L);
            staffUser.setIsBlockedByDebt(false);
            staffUser.setPasswordHash(passwordEncoder.encode(assignedPassword));
            staffUser = userRepository.save(staffUser);
            log.info("Tạo tài khoản thợ mới (vai trò ban đầu CUSTOMER) cho SĐT {}", phone);
        }

        // 3. Tạo hoặc khôi phục bản ghi trong garage_staff
        // Tìm xem thợ này trước đó đã từng có bản ghi cũ ở gara này chưa (kể cả isDeleted = true)
        Optional<GarageStaff> oldRecordOpt = garageStaffRepository.findByGarageAndUser(garage, staffUser);
        Long existingStaffRecordId = oldRecordOpt.map(GarageStaff::getId).orElse(null);

        String candidateStaffCode;
        if (StringUtils.hasText(request.getStaffCode())) {
            candidateStaffCode = request.getStaffCode().trim();
            boolean isDuplicate = (existingStaffRecordId != null)
                    ? garageStaffRepository.existsByGarageAndStaffCodeIgnoreCaseAndIsDeletedFalseAndIdNot(garage, candidateStaffCode, existingStaffRecordId)
                    : garageStaffRepository.existsByGarageAndStaffCodeIgnoreCaseAndIsDeletedFalse(garage, candidateStaffCode);
            if (isDuplicate) {
                throw new BadRequestException("Mã nhân viên '" + candidateStaffCode + "' đã tồn tại trong Gara. Vui lòng chọn mã khác.");
            }
        } else if (oldRecordOpt.isPresent() && StringUtils.hasText(oldRecordOpt.get().getStaffCode())) {
            candidateStaffCode = oldRecordOpt.get().getStaffCode().trim();
            if (garageStaffRepository.existsByGarageAndStaffCodeIgnoreCaseAndIsDeletedFalseAndIdNot(garage, candidateStaffCode, existingStaffRecordId)) {
                candidateStaffCode = generateUniqueStaffCode(garage, staffUser.getId());
            }
        } else {
            candidateStaffCode = generateUniqueStaffCode(garage, staffUser.getId());
        }

        GarageStaff staffRecord;
        if (oldRecordOpt.isPresent()) {
            staffRecord = oldRecordOpt.get();
            staffRecord.setIsDeleted(false);
            staffRecord.setStaffCode(candidateStaffCode);
            staffRecord.setStatus(WorkStatus.FREE);
            staffRecord.setIsActive(false);
            staffRecord.setInvitationStatus(StaffInvitationStatus.PENDING);
        } else {
            staffRecord = new GarageStaff();
            staffRecord.setGarage(garage);
            staffRecord.setUser(staffUser);
            staffRecord.setStaffCode(candidateStaffCode);
            staffRecord.setStatus(WorkStatus.FREE);
            staffRecord.setIsActive(false);
            staffRecord.setInvitationStatus(StaffInvitationStatus.PENDING);
        }

        GarageStaff saved = garageStaffRepository.save(staffRecord);

        // Bắn thông báo cho Thợ / Người được mời
        try {
            if (isExistingUser) {
                notificationService.createNotification(
                        staffUser,
                        NotificationType.STAFF_INVITATION,
                        "Lời mời tham gia Đội cứu hộ!",
                        "Gara '" + garage.getName() + "' đã gửi cho bạn lời mời tham gia làm Kỹ thuật viên cứu hộ (Mã NV: " + candidateStaffCode + ").",
                        "STAFF_INVITATION",
                        saved.getId()
                );
            } else {
                notificationService.createNotification(
                        staffUser,
                        NotificationType.NEW_ORDER,
                        "Bạn đã được thêm vào Gara!",
                        "Chúc mừng! Bạn đã được thêm vào Gara '" + garage.getName() + "' với vai trò Kỹ thuật viên cứu hộ.",
                        "GARAGE",
                        garage.getId()
                );
            }
        } catch (Exception e) {
            log.warn("Không thể gửi thông báo cho thợ: {}", e.getMessage());
        }

        GarageStaffResponse response = toResponse(saved);
        if (isExistingUser) {
            response.setTempPassword(null); // Không có mật khẩu tạm vì là tài khoản cũ của người dùng
            response.setIsNewUser(false);
        } else {
            response.setTempPassword(assignedPassword); // Trả về mật khẩu khởi tạo 1 lần duy nhất cho tài khoản mới
            response.setIsNewUser(true);
        }
        return response;
    }

    @Override
    @Transactional
    public GarageStaffResponse toggleStaffActive(User owner, Long staffId) {
        Garage garage = getApprovedGarage(owner);
        GarageStaff staff = garageStaffRepository.findByGarageAndIdAndIsDeletedFalse(garage, staffId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy nhân viên trong Gara"));

        boolean nextState = !Boolean.TRUE.equals(staff.getIsActive());
        if (!nextState && hasOngoingRescueOrder(staff)) {
            throw new BadRequestException("Nhân viên đang thực hiện hoặc chờ thanh toán ca cứu hộ, không thể tạm ngưng lúc này");
        }

        staff.setIsActive(nextState);
        GarageStaff updated = garageStaffRepository.save(staff);
        return toResponse(updated);
    }

    @Override
    @Transactional
    public void removeStaff(User owner, Long staffId) {
        Garage garage = getApprovedGarage(owner);
        GarageStaff staff = garageStaffRepository.findByGarageAndIdAndIsDeletedFalse(garage, staffId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy nhân viên trong Gara"));

        if (hasOngoingRescueOrder(staff)) {
            throw new BadRequestException("Nhân viên đang thực hiện hoặc chờ thanh toán ca cứu hộ, không thể cho thôi việc lúc này!");
        }

        boolean wasPending = (staff.getInvitationStatus() == StaffInvitationStatus.PENDING);

        // Đánh dấu thôi việc: isDeleted = true, isActive = false
        staff.setIsDeleted(true);
        staff.setIsActive(false);
        garageStaffRepository.save(staff);

        // Trả vai trò User về CUSTOMER (nếu trước đó đã là staff chính thức)
        User staffUser = staff.getUser();
        if (staffUser != null && !wasPending) {
            staffUser.setRole(UserRole.CUSTOMER);
            userRepository.save(staffUser);
        }

        try {
            if (wasPending) {
                notificationService.createNotification(
                        staffUser,
                        NotificationType.SYSTEM_WARNING,
                        "Thu hồi lời mời gia nhập",
                        "Gara '" + garage.getName() + "' đã thu hồi lời mời gia nhập đội ngũ kỹ thuật viên.",
                        "GARAGE",
                        garage.getId()
                );
            } else {
                notificationService.createNotification(
                        staffUser,
                        NotificationType.STAFF_INVITATION,
                        "Thông báo thôi việc",
                        "Bạn đã được Gara '" + garage.getName() + "' cho thôi việc. Tài khoản của bạn đã trở về trạng thái Khách hàng tự do.",
                        "GARAGE",
                        garage.getId()
                );
            }
        } catch (Exception e) {
            log.warn("Không thể gửi thông báo: {}", e.getMessage());
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
                .staffCode(staff != null ? staff.getStaffCode() : null)
                .invitationStatus(staff != null && staff.getInvitationStatus() != null ? staff.getInvitationStatus() : StaffInvitationStatus.ACCEPTED)
                .isOnline(isOnline)
                .status(staff != null ? staff.getStatus() : WorkStatus.FREE)
                .currentAddress(realGarageAddress)
                .lat(garage.getLat())
                .lng(garage.getLng())
                .todayCompletedJobs(staff != null ? (int) rescueRequestRepository.countTodayCompletedJobs(staff, OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).withHour(0).withMinute(0).withSecond(0).withNano(0)) : 0)
                .todayEarnings(0L)
                .walletBalance(staff != null && staff.getWalletBalance() != null ? staff.getWalletBalance() : 0L)
                .build();
    }

    @Override
    @Transactional
    public StaffDashboardResponse updateStaffOnlineStatus(User staffUser, boolean isOnline) {
        List<GarageStaff> staffs = garageStaffRepository.findByUserAndIsDeletedFalseOrderByIdDesc(staffUser);
        if (staffs.isEmpty()) {
            throw new BadRequestException("Không tìm thấy thông tin nhân viên");
        }
        GarageStaff staff = staffs.get(0);

        if (!isOnline && hasOngoingRescueOrder(staff)) {
            throw new BadRequestException("Bạn đang có ca cứu hộ chưa hoàn tất hoặc chờ thanh toán, không thể tắt trạng thái nhận ca lúc này!");
        }

        staff.setIsActive(isOnline);
        garageStaffRepository.save(staff);
        return getStaffDashboard(staffUser);
    }

    @Override
    @Transactional
    public void staffLeaveGarage(User staffUser) {
        List<GarageStaff> staffs = garageStaffRepository.findByUserAndIsDeletedFalseOrderByIdDesc(staffUser);
        if (staffs.isEmpty()) {
            throw new BadRequestException("Bạn không thuộc Gara nào");
        }
        GarageStaff staff = staffs.get(0);

        if (hasOngoingRescueOrder(staff)) {
            throw new BadRequestException("Bạn đang có ca cứu hộ chưa hoàn tất hoặc chờ thanh toán, không thể rời Gara lúc này!");
        }

        Garage garage = staff.getGarage();

        staff.setIsDeleted(true);
        staff.setIsActive(false);
        garageStaffRepository.save(staff);

        staffUser.setRole(UserRole.CUSTOMER);
        userRepository.save(staffUser);

        // Bắn thông báo cho Chủ Gara khi nhân viên tự rời Gara
        try {
            if (garage != null && garage.getOwner() != null) {
                notificationService.createNotification(
                        garage.getOwner(),
                        NotificationType.STAFF_INVITATION,
                        "Kỹ thuật viên đã rời khỏi Gara",
                        staffUser.getFullName() + " (" + staffUser.getPhone() + ") đã xin thôi việc và rời khỏi Gara của bạn.",
                        "GARAGE_STAFF",
                        garage.getId()
                );
            }
        } catch (Exception e) {
            log.warn("Không thể gửi thông báo cho chủ Gara khi thợ rời gara: {}", e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public GarageStaffResponse getPendingStaffInvitation(User user) {
        return garageStaffRepository.findByUserAndInvitationStatusAndIsDeletedFalse(user, StaffInvitationStatus.PENDING)
                .map(this::toResponse)
                .orElse(null);
    }

    @Override
    @Transactional
    public void acceptStaffInvitation(User user, Long staffId, com.sras.backend.dto.request.AcceptStaffInvitationRequest request) {
        GarageStaff staff = garageStaffRepository.findByIdAndUserAndIsDeletedFalse(staffId, user)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy lời mời gia nhập"));

        if (staff.getInvitationStatus() != StaffInvitationStatus.PENDING) {
            throw new BadRequestException("Lời mời này không ở trạng thái chờ xác nhận");
        }

        // Kiểm tra xem user có đang có hồ sơ Gara đang chờ duyệt không
        Optional<Garage> ownedGarageOpt = garageRepository.findByOwner(user);
        if (ownedGarageOpt.isPresent() && ownedGarageOpt.get().getStatus() == GarageStatus.PENDING) {
            throw new BadRequestException("Bạn đang có hồ sơ đăng ký mở Gara chờ duyệt. Vui lòng rút hồ sơ mở Gara trước khi đồng ý làm nhân viên.");
        }

        // Nếu có yêu cầu đổi mật khẩu mới (áp dụng cho tài khoản thợ mới đăng nhập lần đầu)
        if (request != null && StringUtils.hasText(request.getNewPassword())) {
            String newPass = request.getNewPassword().trim();
            if (newPass.length() < 6) {
                throw new BadRequestException("Mật khẩu mới phải có ít nhất 6 ký tự");
            }
            user.setPasswordHash(passwordEncoder.encode(newPass));
        }

        staff.setInvitationStatus(StaffInvitationStatus.ACCEPTED);
        staff.setIsActive(true);
        garageStaffRepository.save(staff);

        user.setRole(UserRole.GARAGE_STAFF);
        userRepository.save(user);

        // Bắn thông báo cho Chủ Gara
        try {
            Garage garage = staff.getGarage();
            if (garage != null && garage.getOwner() != null) {
                notificationService.createNotification(
                        garage.getOwner(),
                        NotificationType.STAFF_ASSIGNED,
                        "Nhân viên đã đồng ý gia nhập!",
                        user.getFullName() + " (" + user.getPhone() + ") đã đồng ý lời mời gia nhập đội ngũ cứu hộ của Gara bạn.",
                        "GARAGE_STAFF",
                        garage.getId()
                );
            }
        } catch (Exception e) {
            log.warn("Không thể gửi thông báo cho chủ Gara: {}", e.getMessage());
        }
    }

    @Override
    @Transactional
    public void rejectStaffInvitation(User user, Long staffId) {
        GarageStaff staff = garageStaffRepository.findByIdAndUserAndIsDeletedFalse(staffId, user)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy lời mời gia nhập"));

        if (staff.getInvitationStatus() != StaffInvitationStatus.PENDING) {
            throw new BadRequestException("Lời mời này không ở trạng thái chờ xác nhận");
        }

        staff.setInvitationStatus(StaffInvitationStatus.REJECTED);
        staff.setIsDeleted(true);
        staff.setIsActive(false);
        garageStaffRepository.save(staff);

        // Nếu user đang ở vai trò thợ thì chuyển về vai trò khách hàng thông thường
        if (user.getRole() == UserRole.GARAGE_STAFF) {
            user.setRole(UserRole.CUSTOMER);
            userRepository.save(user);
        }

        // Bắn thông báo thông thường cho Chủ Gara (loại STAFF_INVITATION, không phải SYSTEM_WARNING)
        try {
            Garage garage = staff.getGarage();
            if (garage != null && garage.getOwner() != null) {
                notificationService.createNotification(
                        garage.getOwner(),
                        NotificationType.STAFF_INVITATION,
                        "Lời mời gia nhập bị từ chối",
                        user.getFullName() + " (" + user.getPhone() + ") đã từ chối lời mời gia nhập Gara của bạn.",
                        "GARAGE_STAFF",
                        garage.getId()
                );
            }
        } catch (Exception e) {
            log.warn("Không thể gửi thông báo cho chủ Gara: {}", e.getMessage());
        }
    }

    // ── Phía Quản trị viên (ADMIN) ──────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<GarageStaffResponse> getStaffForAdmin(
            Long garageId,
            WorkStatus status,
            Boolean isActive,
            String keyword,
            Pageable pageable) {
        Page<GarageStaff> page;
        if (StringUtils.hasText(keyword)) {
            page = garageStaffRepository.searchStaffForAdminWithKeyword(garageId, status, isActive, keyword.trim(), pageable);
        } else {
            page = garageStaffRepository.findStaffForAdmin(garageId, status, isActive, pageable);
        }

        List<GarageStaff> staffList = page.getContent();
        Map<Long, RatingRepository.StaffRatingAgg> ratingByStaff = staffList.isEmpty()
                ? Map.of()
                : ratingRepository.aggregateByStaff(staffList.stream().map(GarageStaff::getId).toList())
                        .stream().collect(Collectors.toMap(
                                RatingRepository.StaffRatingAgg::getStaffId, Function.identity()));

        return page.map(s -> toResponse(s, ratingByStaff.get(s.getId())));
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getStaffStatsForAdmin() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("TOTAL", garageStaffRepository.countByIsDeletedFalse());
        stats.put("ACTIVE", garageStaffRepository.countByIsDeletedFalseAndIsActiveTrue());
        stats.put("FREE", garageStaffRepository.countByIsDeletedFalseAndIsActiveTrueAndStatus(WorkStatus.FREE));
        stats.put("BUSY", garageStaffRepository.countByIsDeletedFalseAndIsActiveTrueAndStatus(WorkStatus.BUSY));
        stats.put("INACTIVE", garageStaffRepository.countByIsDeletedFalseAndIsActiveFalse());
        return stats;
    }

    @Override
    @Transactional(readOnly = true)
    public GarageStaffResponse getStaffDetailForAdmin(Long staffId) {
        GarageStaff staff = garageStaffRepository.findById(staffId)
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .orElseThrow(() -> new BadRequestException("Không tìm thấy nhân viên kỹ thuật"));

        RatingRepository.StaffRatingAgg agg = ratingRepository.aggregateByStaff(List.of(staff.getId()))
                .stream().findFirst().orElse(null);

        return toResponse(staff, agg);
    }

    @Override
    @Transactional
    public GarageStaffResponse toggleStaffActiveForAdmin(Long staffId) {
        GarageStaff staff = garageStaffRepository.findById(staffId)
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .orElseThrow(() -> new BadRequestException("Không tìm thấy nhân viên kỹ thuật"));

        boolean nextState = !Boolean.TRUE.equals(staff.getIsActive());
        if (!nextState && hasOngoingRescueOrder(staff)) {
            throw new BadRequestException("Kỹ thuật viên đang thực hiện hoặc chờ thanh toán ca cứu hộ, không thể tạm dừng hoạt động!");
        }

        staff.setIsActive(nextState);
        GarageStaff saved = garageStaffRepository.save(staff);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void removeStaffForAdmin(Long staffId) {
        GarageStaff staff = garageStaffRepository.findById(staffId)
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .orElseThrow(() -> new BadRequestException("Không tìm thấy nhân viên kỹ thuật"));

        if (hasOngoingRescueOrder(staff)) {
            throw new BadRequestException("Kỹ thuật viên đang thực hiện hoặc chờ thanh toán ca cứu hộ, không thể cho thôi việc!");
        }

        staff.setIsDeleted(true);
        staff.setIsActive(false);
        garageStaffRepository.save(staff);

        User staffUser = staff.getUser();
        if (staffUser != null) {
            staffUser.setRole(UserRole.CUSTOMER);
            userRepository.save(staffUser);
        }
    }

    @Override
    @Transactional
    public GarageStaffResponse addStaffForAdmin(Long garageId, AddGarageStaffRequest request) {
        Garage garage = garageRepository.findById(garageId)
                .filter(g -> !Boolean.TRUE.equals(g.getIsDeleted()))
                .orElseThrow(() -> new BadRequestException("Không tìm thấy Gara đối tác"));
        return doAddStaff(garage, request, null);
    }

    @Override
    @Transactional
    public GarageStaffResponse reassignGarageForAdmin(Long staffId, Long newGarageId) {
        GarageStaff staff = garageStaffRepository.findById(staffId)
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .orElseThrow(() -> new BadRequestException("Không tìm thấy nhân viên kỹ thuật"));

        if (hasOngoingRescueOrder(staff)) {
            throw new BadRequestException("Kỹ thuật viên đang có ca cứu hộ chưa hoàn tất hoặc chờ thanh toán, không thể điều chuyển Gara!");
        }

        Garage newGarage = garageRepository.findById(newGarageId)
                .filter(g -> !Boolean.TRUE.equals(g.getIsDeleted()))
                .orElseThrow(() -> new BadRequestException("Không tìm thấy Gara mới cần chuyển đến"));

        if (staff.getGarage().getId().equals(newGarage.getId())) {
            throw new BadRequestException("Kỹ thuật viên đã thuộc Gara này rồi.");
        }

        // Kiểm tra nếu mã nhân viên bị trùng ở Gara mới thì tự động sinh mã mới phù hợp
        if (StringUtils.hasText(staff.getStaffCode())
                && garageStaffRepository.existsByGarageAndStaffCodeIgnoreCaseAndIsDeletedFalse(newGarage, staff.getStaffCode().trim())) {
            staff.setStaffCode(generateUniqueStaffCode(newGarage, staff.getUser().getId()));
        }

        staff.setGarage(newGarage);
        GarageStaff saved = garageStaffRepository.save(staff);
        return toResponse(saved);
    }

    private String generateUniqueStaffCode(Garage garage, Long userId) {
        String baseCode = "NV-" + (userId != null ? userId : System.currentTimeMillis() % 10000);
        String candidate = baseCode;
        int counter = 1;
        while (garageStaffRepository.existsByGarageAndStaffCodeIgnoreCaseAndIsDeletedFalse(garage, candidate)) {
            candidate = baseCode + "_" + counter++;
        }
        return candidate;
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

        OffsetDateTime startOfDay = OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"))
                .withHour(0).withMinute(0).withSecond(0).withNano(0);
        int todayCompleted = (int) rescueRequestRepository.countTodayCompletedJobs(staff, startOfDay);
        int activeJobs = (int) rescueRequestRepository.countActiveJobs(staff);
        long unsettledCash = rescueRequestRepository.sumUnsettledCashByStaff(staff);
        int unsettledCount = rescueRequestRepository.countUnsettledCashOrdersByStaff(staff);

        return GarageStaffResponse.builder()
                .id(staff.getId())
                .userId(u != null ? u.getId() : null)
                .fullName(fullName)
                .phone(u != null ? u.getPhone() : "")
                .avatarUrl(u != null ? u.getAvatarUrl() : null)
                .staffCode(staff.getStaffCode())
                .status(staff.getStatus())
                .isActive(staff.getIsActive())
                .invitationStatus(staff.getInvitationStatus() != null ? staff.getInvitationStatus() : StaffInvitationStatus.ACCEPTED)
                .garageId(g != null ? g.getId() : null)
                .garageName(g != null ? g.getName() : null)
                .garageAddress(g != null ? g.getAddress() : null)
                .garagePhone(g != null ? g.getPhone() : null)
                .activeJobsCount(activeJobs)
                .todayCompletedJobs(todayCompleted)
                .unsettledCash(unsettledCash)
                .unsettledCashOrdersCount(unsettledCount)
                .rating(avg)
                .ratingCount(count)
                .createdAt(staff.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public StaffWalletResponse getStaffWallet(User staffUser) {
        GarageStaff staff = garageStaffRepository.findByUserAndIsDeletedFalse(staffUser)
                .orElseThrow(() -> new BadRequestException("Bạn không phải là nhân viên gara hoặc chưa được kích hoạt"));

        List<WalletTransaction> txns = walletTransactionRepository.findByStaffOrderByCreatedAtDesc(staff);
        List<WalletTransactionResponse> txnResponses = txns.stream()
                .map(t -> WalletTransactionResponse.builder()
                        .id(t.getId())
                        .walletType(t.getWalletType() != null ? t.getWalletType().name() : null)
                        .type(t.getType() != null ? t.getType().name() : null)
                        .amount(t.getAmount())
                        .balanceAfter(t.getBalanceAfter())
                        .description(t.getDescription())
                        .refType(t.getRefType())
                        .refId(t.getRefId())
                        .createdAt(t.getCreatedAt())
                        .build())
                .toList();

        return StaffWalletResponse.builder()
                .staffId(staff.getId())
                .walletBalance(staff.getWalletBalance() != null ? staff.getWalletBalance() : 0L)
                .staffName(staff.getUser() != null ? staff.getUser().getFullName() : null)
                .staffCode(staff.getStaffCode())
                .garageId(staff.getGarage() != null ? staff.getGarage().getId() : null)
                .garageName(staff.getGarage() != null ? staff.getGarage().getName() : null)
                .transactions(txnResponses)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RescueRequestResponse> getUnsettledCashOrders(User owner, Long staffId) {
        Garage garage = getApprovedGarage(owner);
        GarageStaff staff = garageStaffRepository.findByIdAndGarage(staffId, garage)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên trong gara của bạn"));
        List<RescueRequest> orders = rescueRequestRepository.findUnsettledCashOrdersByStaff(staff);
        return orders.stream().map(this::toOrderResponse).toList();
    }

    @Override
    @Transactional
    public Map<String, Object> settleStaffCash(User owner, Long staffId, List<Long> orderIds) {
        Garage garage = getApprovedGarage(owner);
        GarageStaff staff = garageStaffRepository.findByIdAndGarage(staffId, garage)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên trong gara của bạn"));

        User staffUser = null;
        if (staff.getUser() != null) {
            staffUser = userRepository.findById(staff.getUser().getId()).orElse(null);
        }
        String staffName = staffUser != null ? staffUser.getFullName() : "Kỹ thuật viên";

        OffsetDateTime now = OffsetDateTime.now();
        long settledAmount;
        int settledCount;

        if (orderIds != null && !orderIds.isEmpty()) {
            settledAmount = rescueRequestRepository.sumUnsettledCashByStaffAndOrders(staff, orderIds);
            settledCount = rescueRequestRepository.settleSpecificCashOrdersForStaff(staff, orderIds, now);
            if (settledCount <= 0) {
                throw new BadRequestException("Các đơn được chọn không có tiền mặt cần nộp hoặc đã được thu trước đó");
            }
        } else {
            settledAmount = rescueRequestRepository.sumUnsettledCashByStaff(staff);
            settledCount = rescueRequestRepository.settleAllCashOrdersForStaff(staff, now);
            if (settledCount <= 0) {
                throw new BadRequestException("Nhân viên hiện không giữ khoản tiền mặt nào cần nộp");
            }
        }

        // Gửi thông báo Push & Notification tới nhân viên
        if (staffUser != null) {
            String title = "Chủ Gara đã xác nhận thu tiền mặt";
            String body = "Chủ gara " + garage.getName() + " đã xác nhận thu "
                    + String.format("%,d", settledAmount) + "đ tiền mặt (" + settledCount + " đơn) từ bạn.";
            try {
                notificationService.createNotification(
                        staffUser,
                        NotificationType.PAYMENT_SUCCESS,
                        title,
                        body,
                        "CASH_SETTLEMENT",
                        staff.getId());
            } catch (Exception e) {
                log.warn("Gửi thông báo quyết toán tiền mặt thất bại: {}", e.getMessage());
            }
        }

        return Map.of(
                "staffId", staff.getId(),
                "staffName", staffName,
                "settledAmount", settledAmount,
                "settledCount", settledCount,
                "settledAt", now.toString()
        );
    }

    private RescueRequestResponse toOrderResponse(RescueRequest r) {
        User cust = r.getCustomer();
        RescueRequestResponse.CustomerInfo custInfo = cust != null
                ? RescueRequestResponse.CustomerInfo.builder()
                        .id(cust.getId())
                        .name(cust.getFullName())
                        .phone(r.getContactPhone() != null ? r.getContactPhone() : cust.getPhone())
                        .build()
                : null;

        return RescueRequestResponse.builder()
                .id(r.getId())
                .code(r.getCode())
                .customer(custInfo)
                .vehicleType(r.getVehicleType())
                .symptom(r.getSymptom())
                .pickupAddress(r.getPickupAddress())
                .paymentMethod(r.getPaymentMethod())
                .cashConfirmedByCustomer(Boolean.TRUE.equals(r.getCashConfirmedByCustomer()))
                .cashSettled(Boolean.TRUE.equals(r.getCashSettled()))
                .cashSettledAt(r.getCashSettledAt())
                .totalAmount(r.getTotalAmount())
                .rescueFee(r.getRescueFee())
                .serviceFee(r.getServiceFee())
                .towingFee(r.getTowingFee())
                .createdAt(r.getCreatedAt())
                .completedAt(r.getCompletedAt())
                .build();
    }
}
