package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.Capability;
import lombok.Data;

@Data
public class InventoryItemUpsertRequest {
    private Long garageId;
    private Long serviceId;
    private String skuCode;
    private String name;
    private String categoryName;
    private Capability vehicleType;
    private String unitLabel;
    private Integer initialQty;
    private Integer minStockQty;
    private Long costPrice;
    private Long sellingPrice;
    private String supplierName;
    private Boolean isActive;
    private String note;
}
