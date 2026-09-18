package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.Capability;
import com.sras.backend.entity.enums.GarageStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GarageResponse {
    private Long id;
    private String code;
    private String name;
    private String phone;
    private String email;
    private String address;
    private Double lat;
    private Double lng;
    private Capability capability;
    private GarageStatus status;
    private String rejectionReason;
    private BigDecimal commissionRate;
    private Boolean isOnline;
    private Long creditBalance;
    private Long cashBalance;
    private BigDecimal avgRating;
    private Integer ratingCount;
    private OffsetDateTime approvedAt;
    private OffsetDateTime createdAt;

    private Long ownerId;
    private String ownerName;
    private String ownerPhone;

    private List<GarageDocumentResponse> documents;
}
