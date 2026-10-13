package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.RatingDirection;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RatingResponse {
    private Long id;
    private Long requestId;
    private String requestCode;
    private RatingDirection direction;
    private Long raterUserId;
    private String raterName;
    private String raterPhone;
    private Short stars;
    private String comment;
    private Long garageId;
    private String garageName;
    private Long staffId;
    private String staffName;
    private String staffCode;
    private Short staffStars;
    private String staffComment;
    private OffsetDateTime createdAt;
}
