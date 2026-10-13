package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.Capability;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NearbyGarageResponse {
    private Long id;
    private String name;
    private String phone;
    private String address;
    private Double lat;
    private Double lng;
    private Capability capability;
    private Boolean isOnline;
    private Boolean autoAccept;
    private BigDecimal avgRating;
    private Integer ratingCount;
    private Double distanceKm;
    private Integer estimatedEtaMin;
    private Long estimatedRescueFee;
    /** true nếu gara có nhân viên rảnh và xe cứu hộ rảnh phù hợp */
    private Boolean available;
}
