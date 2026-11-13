package com.sras.backend.service.impl;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.repository.GarageStaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Xác định ai tham gia một đơn cứu hộ và đóng vai gì — dùng chung cho chat và gọi thoại.
 * Vai trò trong đơn: {@link #CUSTOMER} (khách), {@link #GARAGE} (chủ gara), {@link #STAFF} (nhân viên).
 *
 * <p>Các hàm đọc quan hệ LAZY của đơn nên phải gọi trong transaction của service.
 */
@Component
@RequiredArgsConstructor
public class RescueParticipants {

    public static final String CUSTOMER = "CUSTOMER";
    public static final String GARAGE = "GARAGE";
    public static final String STAFF = "STAFF";

    private final GarageStaffRepository garageStaffRepository;

    /** Role của {@code user} trong đơn: CUSTOMER / GARAGE / STAFF; null nếu không tham gia. */
    public String roleOf(RescueRequest req, User user) {
        if (req.getCustomer() != null && req.getCustomer().getId().equals(user.getId())) {
            return CUSTOMER;
        }
        Garage garage = req.getGarage();
        if (garage != null && garage.getOwner() != null && garage.getOwner().getId().equals(user.getId())) {
            return GARAGE;
        }
        if (req.getStaff() != null && req.getStaff().getUser() != null
                && req.getStaff().getUser().getId().equals(user.getId())) {
            return STAFF;
        }
        if (garage != null && garageStaffRepository.findByGarageAndUserAndIsDeletedFalse(garage, user).isPresent()) {
            return STAFF;
        }
        return null;
    }

    /** Phân giải User đối phương từ role, kèm kiểm tra đã có mặt trong đơn. */
    public User resolvePeer(RescueRequest req, String peerRole) {
        switch (peerRole) {
            case CUSTOMER:
                if (req.getCustomer() == null) throw new BadRequestException("Đơn chưa có khách hàng");
                return req.getCustomer();
            case GARAGE:
                if (req.getGarage() == null || req.getGarage().getOwner() == null) {
                    throw new BadRequestException("Đơn chưa được gara nào nhận");
                }
                return req.getGarage().getOwner();
            case STAFF:
                if (req.getStaff() != null && req.getStaff().getUser() != null) {
                    return req.getStaff().getUser();
                }
                if (req.getGarage() != null) {
                    List<GarageStaff> staff = garageStaffRepository.findByGarageAndIsDeletedFalseOrderByCreatedAtDesc(req.getGarage());
                    if (!staff.isEmpty() && staff.get(0).getUser() != null) {
                        return staff.get(0).getUser();
                    }
                }
                throw new BadRequestException("Đơn chưa được gán nhân viên");
            default:
                throw new BadRequestException("Người nhận không hợp lệ: " + peerRole);
        }
    }

    public String normalizeRole(String raw) {
        if (raw == null) throw new BadRequestException("Thiếu người nhận");
        return raw.trim().toUpperCase();
    }

    /** true nếu {@code user} chính là nhân viên được gán cho đơn ({@code rescueRequest.staff}). */
    public boolean isAssignedStaff(RescueRequest req, User user) {
        return req.getStaff() != null && req.getStaff().getUser() != null
                && req.getStaff().getUser().getId().equals(user.getId());
    }

    /**
     * Như {@link #resolvePeer} nhưng vai STAFF bắt buộc là nhân viên được gán cho đơn — không lấy đại
     * nhân viên đầu tiên của gara như chat, vì cuộc gọi phải tới đúng người đang xử lý đơn.
     */
    public User resolveAssignedPeer(RescueRequest req, String peerRole) {
        if (STAFF.equals(peerRole)) {
            if (req.getStaff() == null || req.getStaff().getUser() == null) {
                throw new BadRequestException("Đơn chưa được gán nhân viên");
            }
            return req.getStaff().getUser();
        }
        return resolvePeer(req, peerRole);
    }
}
