package com.sras.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateDispatchConfigRequest {

    @NotNull(message = "Trọng số khoảng cách không được để trống")
    @Min(value = 0, message = "Trọng số khoảng cách phải từ 0 đến 100")
    @Max(value = 100, message = "Trọng số khoảng cách phải từ 0 đến 100")
    private Integer weightDistance;

    @NotNull(message = "Trọng số công bằng hôm nay không được để trống")
    @Min(value = 0, message = "Trọng số công bằng phải từ 0 đến 100")
    @Max(value = 100, message = "Trọng số công bằng phải từ 0 đến 100")
    private Integer weightWorkload;

    @NotNull(message = "Trọng số đánh giá sao không được để trống")
    @Min(value = 0, message = "Trọng số đánh giá sao phải từ 0 đến 100")
    @Max(value = 100, message = "Trọng số đánh giá sao phải từ 0 đến 100")
    private Integer weightRating;

    @NotNull(message = "Trọng số tỷ lệ nhận đơn không được để trống")
    @Min(value = 0, message = "Trọng số tỷ lệ nhận đơn phải từ 0 đến 100")
    @Max(value = 100, message = "Trọng số tỷ lệ nhận đơn phải từ 0 đến 100")
    private Integer weightResponseRate;

    @NotNull(message = "Điểm trừ mỗi đơn không được để trống")
    @Min(value = 0, message = "Điểm trừ mỗi đơn phải >= 0")
    @Max(value = 100, message = "Điểm trừ mỗi đơn tối đa 100")
    private Integer penaltyPerOrder;
}
