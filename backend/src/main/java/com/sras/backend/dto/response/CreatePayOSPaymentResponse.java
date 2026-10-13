package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePayOSPaymentResponse {
    private String checkoutUrl;
    private String qrCode;
    private Long orderCode;
    private String paymentLinkId;
    private Long amount;
    private String description;
    private String accountNumber;
    private String accountName;
    private String bin;
}
