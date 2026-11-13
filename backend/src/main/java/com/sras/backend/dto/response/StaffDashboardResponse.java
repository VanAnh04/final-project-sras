package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.WorkStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffDashboardResponse {
    private Long staffId;
    private Long userId;
    private String fullName;
    private String phone;
    private String avatarUrl;
    private Long garageId;
    private String garageName;
    private String garageAddress;
    private String garagePhone;
    private Boolean isOnline;
    private WorkStatus status;
    private String currentAddress;
    private Double lat;
    private Double lng;
    private Integer todayCompletedJobs;
    private Long todayEarnings;
    private Long walletBalance;
}
