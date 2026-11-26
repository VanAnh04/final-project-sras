package com.sras.backend.controller;

import com.sras.backend.dto.request.InventoryItemUpsertRequest;
import com.sras.backend.dto.request.InventoryStockAdjustRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.GarageInventoryOverviewResponse;
import com.sras.backend.entity.User;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;
    private final UserRepository userRepository;

    // ────────────────────────── 1. API CHO WEB ADMIN ──────────────────────────

    @GetMapping("/admin/inventory/overview")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<GarageInventoryOverviewResponse>> getAdminInventoryOverview(
            Authentication authentication,
            @RequestParam(required = false) Long garageId
    ) {
        User admin = getCurrentUser(authentication);
        GarageInventoryOverviewResponse res = inventoryService.getAdminInventoryOverview(garageId, admin);
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu quản lý kho toàn hệ thống thành công", res));
    }

    @PostMapping("/admin/inventory/items")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<GarageInventoryOverviewResponse.InventoryItemDto>> createAdminInventoryItem(
            Authentication authentication,
            @RequestBody InventoryItemUpsertRequest request
    ) {
        User admin = getCurrentUser(authentication);
        var created = inventoryService.upsertInventoryItem(null, request, admin);
        return ResponseEntity.ok(ApiResponse.success("Thêm phụ tùng vào kho Gara thành công", created));
    }

    @PutMapping("/admin/inventory/items/{itemId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<GarageInventoryOverviewResponse.InventoryItemDto>> updateAdminInventoryItem(
            Authentication authentication,
            @PathVariable Long itemId,
            @RequestBody InventoryItemUpsertRequest request
    ) {
        User admin = getCurrentUser(authentication);
        var updated = inventoryService.upsertInventoryItem(itemId, request, admin);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin phụ tùng kho thành công", updated));
    }

    @PostMapping("/admin/inventory/items/{itemId}/adjust")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<GarageInventoryOverviewResponse.InventoryItemDto>> adjustAdminInventoryStock(
            Authentication authentication,
            @PathVariable Long itemId,
            @RequestBody InventoryStockAdjustRequest request
    ) {
        User admin = getCurrentUser(authentication);
        var adjusted = inventoryService.adjustInventoryStock(itemId, request, admin);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật số lượng tồn kho thành công", adjusted));
    }

    @PostMapping("/admin/inventory/sync-catalog")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<GarageInventoryOverviewResponse>> syncCatalogForAdmin(
            Authentication authentication,
            @RequestParam(required = false) Long garageId
    ) {
        User admin = getCurrentUser(authentication);
        var overview = inventoryService.syncStandardCatalogToGarage(garageId, admin);
        return ResponseEntity.ok(ApiResponse.success("Đồng bộ danh mục phụ tùng chuẩn vào kho Gara thành công", overview));
    }

    @PostMapping("/admin/inventory/items/{itemId}/warn")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> sendInventoryWarning(
            Authentication authentication,
            @PathVariable Long itemId,
            @RequestBody java.util.Map<String, String> body
    ) {
        User admin = getCurrentUser(authentication);
        String title = body != null ? body.get("title") : null;
        String message = body != null ? body.get("message") : null;
        inventoryService.sendInventoryWarningToGarage(itemId, title, message, admin);
        return ResponseEntity.ok(ApiResponse.success("Đã gửi thông báo cảnh báo kho tới Chủ Gara thành công", null));
    }

    // ────────────────────────── 2. API CHO CHỦ GARA & NHÂN VIÊN GARA ──────────────────────────

    @GetMapping("/garages/me/inventory")
    public ResponseEntity<ApiResponse<GarageInventoryOverviewResponse>> getMyGarageInventory(
            Authentication authentication
    ) {
        User actor = getCurrentUser(authentication);
        var overview = inventoryService.getMyGarageInventoryOverview(actor);
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu kho phụ tùng Gara thành công", overview));
    }

    @PostMapping("/garages/me/inventory/items")
    public ResponseEntity<ApiResponse<GarageInventoryOverviewResponse.InventoryItemDto>> createMyGarageInventoryItem(
            Authentication authentication,
            @RequestBody InventoryItemUpsertRequest request
    ) {
        User actor = getCurrentUser(authentication);
        var created = inventoryService.upsertInventoryItem(null, request, actor);
        return ResponseEntity.ok(ApiResponse.success("Thêm phụ tùng mới vào kho Gara thành công", created));
    }

    @PutMapping("/garages/me/inventory/items/{itemId}")
    public ResponseEntity<ApiResponse<GarageInventoryOverviewResponse.InventoryItemDto>> updateMyGarageInventoryItem(
            Authentication authentication,
            @PathVariable Long itemId,
            @RequestBody InventoryItemUpsertRequest request
    ) {
        User actor = getCurrentUser(authentication);
        var updated = inventoryService.upsertInventoryItem(itemId, request, actor);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin phụ tùng kho thành công", updated));
    }

    @PostMapping("/garages/me/inventory/items/{itemId}/adjust")
    public ResponseEntity<ApiResponse<GarageInventoryOverviewResponse.InventoryItemDto>> adjustMyGarageInventoryStock(
            Authentication authentication,
            @PathVariable Long itemId,
            @RequestBody InventoryStockAdjustRequest request
    ) {
        User actor = getCurrentUser(authentication);
        var adjusted = inventoryService.adjustInventoryStock(itemId, request, actor);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tồn kho thành công", adjusted));
    }

    @PostMapping("/garages/me/inventory/sync-catalog")
    public ResponseEntity<ApiResponse<GarageInventoryOverviewResponse>> syncMyGarageCatalog(
            Authentication authentication
    ) {
        User actor = getCurrentUser(authentication);
        var overview = inventoryService.syncStandardCatalogToGarage(null, actor);
        return ResponseEntity.ok(ApiResponse.success("Đồng bộ danh mục phụ tùng chuẩn thành công", overview));
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || authentication.getName() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để tiếp tục");
        }
        String principal = authentication.getName();
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByPhone(principal))
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin người dùng"));
    }
}
