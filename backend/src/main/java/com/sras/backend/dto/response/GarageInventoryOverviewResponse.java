package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GarageInventoryOverviewResponse {

    private SummaryStats summary;
    private List<GarageStockSummaryItem> garageSummaries;
    private List<InventoryItemDto> items;
    private List<InventoryTransactionDto> recentTransactions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryStats {
        private int totalGaragesWithInventory;
        private int totalSkuCount;
        private int totalOnHandUnits;
        private int totalReservedUnits;
        private int totalAvailableUnits;
        private int lowStockCount;
        private int outOfStockCount;
        private long totalInventoryCostValue;
        private long totalInventoryRetailValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GarageStockSummaryItem {
        private Long garageId;
        private String garageName;
        private String garageAddress;
        private String garagePhone;
        private Boolean isOnline;
        private int totalSkus;
        private int totalOnHandUnits;
        private int totalReservedUnits;
        private int lowStockSkus;
        private int outOfStockSkus;
        private long totalCostValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InventoryItemDto {
        private Long id;
        private Long garageId;
        private String garageName;
        private Long serviceId;
        private String serviceCode;
        private String serviceName;
        private Long minAllowedPrice;
        private Long maxAllowedPrice;
        private String skuCode;
        private String name;
        private String categoryName;
        private String vehicleType;
        private String unitLabel;
        private Integer onHandQty;
        private Integer reservedQty;
        private Integer availableQty;
        private Integer minStockQty;
        private Long costPrice;
        private Long sellingPrice;
        private String supplierName;
        private Boolean isActive;
        /** OK, LOW_STOCK, OUT_OF_STOCK */
        private String stockStatus;
        private OffsetDateTime updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InventoryTransactionDto {
        private Long id;
        private Long garageId;
        private String garageName;
        private Long inventoryItemId;
        private String skuCode;
        private String itemName;
        private String unitLabel;
        private String txType;
        private Integer quantityChange;
        private Integer onHandAfter;
        private Long unitCostSnapshot;
        private Long unitPriceSnapshot;
        private Long rescueRequestId;
        private String rescueRequestCode;
        private String performedByName;
        private String performedByRole;
        private String note;
        private OffsetDateTime createdAt;
    }
}
