package com.sras.backend.service;

import com.sras.backend.dto.request.AddGarageStaffRequest;
import com.sras.backend.dto.response.GarageStaffResponse;
import com.sras.backend.dto.response.StaffDashboardResponse;
import com.sras.backend.entity.User;

import java.util.List;

public interface GarageStaffService {

    /**
     * Lấy danh sách kỹ thuật viên của Gara do owner quản lý.
     */
    List<GarageStaffResponse> getStaffList(User owner);

    /**
     * Thêm kỹ thuật viên mới vào Gara qua SĐT.
     */
    GarageStaffResponse addStaff(User owner, AddGarageStaffRequest request);

    /**
     * Bật / Tắt trạng thái hoạt động (nghỉ phép / làm việc) của nhân viên.
     */
    GarageStaffResponse toggleStaffActive(User owner, Long staffId);

    /**
     * Cho nhân viên thôi việc / Xoá khỏi Gara.
     */
    void removeStaff(User owner, Long staffId);

    /**
     * Lấy dữ liệu bảng điều khiển Home dành cho Thợ cứu hộ.
     */
    StaffDashboardResponse getStaffDashboard(User staffUser);

    /**
     * Thợ cứu hộ bật / tắt trạng thái sẵn sàng nhận đơn trực tuyến.
     */
    StaffDashboardResponse updateStaffOnlineStatus(User staffUser, boolean isOnline);

    /**
     * Thợ cứu hộ tự yêu cầu rời Gara hiện tại.
     */
    void staffLeaveGarage(User staffUser);

    /**
     * Lấy lời mời gia nhập Gara đang chờ (nếu có) của người dùng hiện tại.
     */
    GarageStaffResponse getPendingStaffInvitation(User user);

    /**
     * Chấp nhận lời mời gia nhập Gara -> chuyển quyền sang GARAGE_STAFF và đổi mật khẩu mới (nếu có).
     */
    void acceptStaffInvitation(User user, Long staffId, com.sras.backend.dto.request.AcceptStaffInvitationRequest request);

    /**
     * Từ chối lời mời gia nhập Gara -> giữ nguyên vai trò CUSTOMER.
     */
    void rejectStaffInvitation(User user, Long staffId);

    // ── Phía Quản trị viên (ADMIN) ──────────────────────────────────────

    org.springframework.data.domain.Page<GarageStaffResponse> getStaffForAdmin(
            Long garageId,
            com.sras.backend.entity.enums.WorkStatus status,
            Boolean isActive,
            String keyword,
            org.springframework.data.domain.Pageable pageable);

    java.util.Map<String, Long> getStaffStatsForAdmin();

    GarageStaffResponse getStaffDetailForAdmin(Long staffId);

    GarageStaffResponse toggleStaffActiveForAdmin(Long staffId);

    void removeStaffForAdmin(Long staffId);

    GarageStaffResponse addStaffForAdmin(Long garageId, AddGarageStaffRequest request);

    GarageStaffResponse reassignGarageForAdmin(Long staffId, Long newGarageId);

    // ── Quản lý ví thợ cứu hộ (Employee Wallet) ───────────────────────
    com.sras.backend.dto.response.StaffWalletResponse getStaffWallet(User staffUser);

    /**
     * Chủ Gara xem danh sách các đơn tiền mặt thợ đang giữ chưa nộp.
     */
    List<com.sras.backend.dto.response.RescueRequestResponse> getUnsettledCashOrders(User owner, Long staffId);

    /**
     * Chủ Gara xác nhận đã thu tiền mặt từ thợ (toàn bộ nếu orderIds rỗng/null, hoặc theo danh sách đơn cụ thể).
     */
    java.util.Map<String, Object> settleStaffCash(User owner, Long staffId, List<Long> orderIds);
}
