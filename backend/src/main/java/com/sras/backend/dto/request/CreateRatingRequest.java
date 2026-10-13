package com.sras.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateRatingRequest {

    @NotNull(message = "ID yêu cầu cứu hộ không được để trống")
    private Long requestId;

    @NotNull(message = "Số sao đánh giá Gara không được để trống")
    @Min(value = 1, message = "Số sao tối thiểu là 1")
    @Max(value = 5, message = "Số sao tối đa là 5")
    private Short stars;

    @Size(max = 1000, message = "Bình luận Gara tối đa 1000 ký tự")
    private String comment;

    @Min(value = 1, message = "Số sao thợ tối thiểu là 1")
    @Max(value = 5, message = "Số sao thợ tối đa là 5")
    private Short staffStars;

    @Size(max = 1000, message = "Bình luận thợ tối đa 1000 ký tự")
    private String staffComment;
}
