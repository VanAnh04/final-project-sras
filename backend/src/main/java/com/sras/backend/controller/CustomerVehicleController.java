package com.sras.backend.controller;

import com.sras.backend.dto.request.CreateCustomerVehicleRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.CustomerVehicleResponse;
import com.sras.backend.entity.User;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.CustomerVehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/customer-vehicles")
@RequiredArgsConstructor
public class CustomerVehicleController {

    private final CustomerVehicleService customerVehicleService;
    private final UserRepository userRepository;

    /** Danh sách xe đã lưu của khách (để chọn khi gửi yêu cầu cứu hộ). */
    @GetMapping
    public ResponseEntity<ApiResponse<List<CustomerVehicleResponse>>> mine(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(customerVehicleService.listMine(user)));
    }

    /** Thêm phương tiện mới vào gara của khách. */
    @PostMapping
    public ResponseEntity<ApiResponse<CustomerVehicleResponse>> create(
            Authentication authentication,
            @Valid @RequestBody CreateCustomerVehicleRequest request) {
        User user = getCurrentUser(authentication);
        CustomerVehicleResponse created = customerVehicleService.create(user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Thêm phương tiện thành công", created));
    }

    /** Cập nhật thông tin phương tiện. */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerVehicleResponse>> update(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody CreateCustomerVehicleRequest request) {
        User user = getCurrentUser(authentication);
        CustomerVehicleResponse updated = customerVehicleService.update(user, id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật phương tiện thành công", updated));
    }

    /** Xóa phương tiện khỏi gara cá nhân. */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            Authentication authentication,
            @PathVariable Long id) {
        User user = getCurrentUser(authentication);
        customerVehicleService.delete(user, id);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa phương tiện thành công", null));
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để tiếp tục");
        }
        return userRepository.findByPhone(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin người dùng"));
    }
}
