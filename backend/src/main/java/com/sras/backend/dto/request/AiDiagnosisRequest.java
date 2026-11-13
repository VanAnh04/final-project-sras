package com.sras.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiDiagnosisRequest {
    /** CAR hoặc MOTORBIKE */
    private String vehicleType;

    /** Tên xe chi tiết, ví dụ: "Honda Vision 2021", "Mazda 3", "Yamaha Exciter 150" */
    private String vehicleModel;

    /** ID phương tiện trong gara của khách (CustomerVehicle) nếu có */
    private Long customerVehicleId;

    /** Tọa độ hiện tại (để AI kiểm tra điểm đen rủi ro / lịch sử sự cố) */
    private Double lat;
    private Double lng;

    /** Tên đường / địa chỉ hiện tại */
    private String address;

    /** Mô tả hiện tượng bằng giọng nói hoặc văn bản gõ tay */
    private String symptomDescription;

    /** Danh sách URL ảnh đã tải lên hệ thống qua /api/upload */
    private List<String> photoUrls;
}
