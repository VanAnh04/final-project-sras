package com.sras.backend.entity.enums;

/**
 * Trạng thái thẩm định dữ liệu / hình ảnh bằng AI Multimodal.
 */
public enum AiVerificationStatus {
    VERIFIED,   // Hợp lệ, độ tin cậy cao
    WARNING,    // Cảnh báo: có sự sai lệch nhỏ hoặc nghi vấn chất lượng ảnh
    REJECTED,   // Không hợp lệ: phát hiện giả mạo, ảnh không đúng loại, hoặc không thể đọc
    UNVERIFIED  // Chưa qua kiểm tra
}

