package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiDiagnosisResponse {
    /** Tên sự cố dự đoán ngắn gọn (Ví dụ: "Hỏng bình ắc quy / Lỏng cọc bình") */
    private String diagnosedIssue;

    /** Mức độ tin cậy: "CAO", "TRUNG_BINH", "CAN_KIEM_TRA" */
    private String confidence;

    /** Điểm phần trăm tin cậy (Ví dụ: 85, 90) */
    private Integer confidenceScore;

    /** Mức độ nguy hiểm: "NGUY_HIEM", "CANH_BAO", "NHE" */
    private String severity;

    /** Lời khuyên xử lý an toàn khẩn cấp tức thời */
    private String emergencyAdvice;

    /** Loại sự cố tương thích với hệ thống cứu hộ: OUT_OF_FUEL, FLAT_TIRE, DEAD_BATTERY, ENGINE_FAILURE, ACCIDENT, OTHER */
    private String suggestedIssueType;

    /** Nhóm dịch vụ khuyến nghị (Ví dụ: "Kích bình / Thay ắc quy lưu động", "Cứu hộ kéo xe về gara") */
    private String suggestedService;

    /** Câu tóm tắt triệu chứng tối ưu để tự động điền vào ô ghi chú gửi thợ cứu hộ */
    private String autoFilledNote;

    /** Các bước kiểm tra nhanh tại chỗ để loại trừ nguyên nhân */
    private List<String> troubleshootingSteps;
}
