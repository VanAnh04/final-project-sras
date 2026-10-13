package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.RequestPaymentMethod;
import com.sras.backend.entity.enums.VehicleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/** Payload khách gửi khi tạo yêu cầu cứu hộ (Bước "Gửi yêu cầu"). */
@Data
public class CreateRescueRequestRequest {

    @NotNull(message = "Vui lòng chọn loại xe")
    private VehicleType vehicleType;

    @NotBlank(message = "Vui lòng mô tả tình trạng xe")
    private String symptom;

    @NotNull(message = "Thiếu toạ độ vị trí")
    private Double pickupLat;

    @NotNull(message = "Thiếu toạ độ vị trí")
    private Double pickupLng;

    private String pickupAddress;

    private String locationNote;

    /** Loại sự cố có cấu trúc (OUT_OF_FUEL, FLAT_TIRE, DEAD_BATTERY, ENGINE_FAILURE, ACCIDENT, OTHER). */
    private String issueType;

    /** SĐT liên hệ cho ca này (mặc định = SĐT tài khoản). */
    private String contactPhone;

    /** Xe đã lưu trong hồ sơ (tuỳ chọn). */
    private Long customerVehicleId;

    /** Ảnh xe/hiện trường để gara nhận diện. */
    private List<String> photoUrls;

    /** Mặc định CASH nếu để trống. */
    private RequestPaymentMethod paymentMethod;

    /** ID gara mà khách chỉ định trước (null nếu là cứu hộ khẩn cấp / auto-dispatch). */
    private Long garageId;
}
