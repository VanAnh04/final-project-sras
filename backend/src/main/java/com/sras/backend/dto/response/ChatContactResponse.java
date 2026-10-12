package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatContactResponse {

    private Long userId;
    private String name;
    private String phone;
    private String avatarUrl;
    /** Role đối phương: "GARAGE", "STAFF", "CUSTOMER" */
    private String role;
    /** Nhãn thân thiện: "Chủ gara", "Nhân viên cứu hộ", "Khách hàng" */
    private String roleLabel;
    private String garageName;
    private Boolean isOnline;
    private String onlineStatusText;
    private Long rescueRequestId;
    private String rescueCode;
}
