package com.sras.backend.service.impl;

import com.sras.backend.dto.request.InventoryItemUpsertRequest;
import com.sras.backend.dto.request.InventoryStockAdjustRequest;
import com.sras.backend.dto.response.GarageInventoryOverviewResponse;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageInventoryItem;
import com.sras.backend.entity.GarageServicePrice;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.InventoryTransaction;
import com.sras.backend.entity.Notification;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.RescueRequestItem;
import com.sras.backend.entity.Service;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.Capability;
import com.sras.backend.entity.enums.FeeType;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.entity.enums.InventoryItemType;
import com.sras.backend.entity.enums.InventoryTxType;
import com.sras.backend.entity.enums.ItemStatus;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.entity.enums.QuoteItemInventoryStatus;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.GarageInventoryItemRepository;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.GarageServicePriceRepository;
import com.sras.backend.repository.GarageStaffRepository;
import com.sras.backend.repository.InventoryTransactionRepository;
import com.sras.backend.repository.NotificationRepository;
import com.sras.backend.repository.RescueRequestItemRepository;
import com.sras.backend.repository.ServiceRepository;
import com.sras.backend.service.InventoryService;
import com.sras.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@org.springframework.stereotype.Service
@RequiredArgsConstructor
@Slf4j
public class InventoryServiceImpl implements InventoryService {

    private final GarageInventoryItemRepository inventoryItemRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final GarageRepository garageRepository;
    private final GarageStaffRepository garageStaffRepository;
    private final ServiceRepository serviceRepository;
    private final GarageServicePriceRepository garageServicePriceRepository;
    private final RescueRequestItemRepository rescueRequestItemRepository;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;

    @Override
    public boolean isPartService(Service service) {
        if (service == null) return false;
        return isPhysicalPart(service, service.getName());
    }

    @Override
    public boolean isPhysicalPart(Service service, String fallbackName) {
        String name = service != null && service.getName() != null ? service.getName() : (fallbackName != null ? fallbackName : "");
        String code = service != null && service.getCode() != null ? service.getCode() : "";
        String nameLower = name.toLowerCase(Locale.ROOT).trim();
        String codeLower = code.toLowerCase(Locale.ROOT).trim();

        // 1. Phủ định các dịch vụ công thợ thuần túy (Dù có từ 'lốp', 'bình', v.v. nhưng mục đích là công thợ)
        boolean hasPureLaborKeyword = nameLower.contains("vá ") || nameLower.startsWith("vá") || nameLower.contains("vá xe")
                || nameLower.contains("kích bình") || nameLower.contains("câu bình")
                || nameLower.contains("sạc bình") || nameLower.contains("nạp bình")
                || nameLower.contains("kéo xe") || nameLower.contains("chở xe") || nameLower.contains("cẩu xe")
                || nameLower.contains("kiểm tra") || nameLower.contains("chẩn đoán") || nameLower.contains("chuẩn đoán")
                || nameLower.contains("xóa lỗi") || nameLower.contains("cân chỉnh") || nameLower.contains("mở khóa")
                || nameLower.contains("vệ sinh") || nameLower.contains("rửa xe")
                || codeLower.contains("patch") || codeLower.contains("jump") || codeLower.contains("tow");

        if (hasPureLaborKeyword) {
            // Ngoại lệ: Nếu trong tên ghi rõ thay thế phụ tùng (VD: "Bảo dưỡng phanh sau hoặc thay má phanh sau")
            if (!nameLower.contains("thay")) {
                return false;
            }
        }

        // 2. Nếu là dịch vụ tính theo km / kéo xe / cước cứu hộ -> Chắc chắn là công dịch vụ (LABOR)
        if (service != null && (service.getFeeType() == FeeType.TOWING_FEE || service.getFeeType() == FeeType.RESCUE_FEE)) {
            return false;
        }

        // 3. Nếu Service thuộc Category chuyên biệt về Phụ tùng / Vật tư thay thế
        if (service != null && service.getCategory() != null && service.getCategory().getName() != null) {
            String catNameLower = service.getCategory().getName().toLowerCase(Locale.ROOT);
            if (catNameLower.contains("phuộc")
                    || catNameLower.contains("bugi")
                    || catNameLower.contains("ắc quy")
                    || catNameLower.contains("dây curoa")
                    || catNameLower.contains("lọc gió")
                    || catNameLower.contains("bố thắng")
                    || catNameLower.contains("nhông sên dĩa")
                    || catNameLower.contains("lốp")
                    || catNameLower.contains("dầu nhớt")
                    || catNameLower.contains("phụ gia")) {
                return true;
            }
        }

        // 4. Nếu Service entity được cấu hình tường minh là PART (và không rơi vào nhóm thuần công thợ ở trên)
        if (service != null && service.getItemType() == InventoryItemType.PART) {
            return true;
        }

        // 5. Nhận diện các danh mục phụ tùng, vật tư thay thế, nhiên liệu vật lý
        return nameLower.contains("thay ") || nameLower.startsWith("thay")
                || nameLower.contains("phuộc") || nameLower.contains("giảm xóc") || nameLower.contains("nhún")
                || nameLower.contains("nhông sên dĩa") || nameLower.contains("nhông") || nameLower.contains("sên") || nameLower.contains("dĩa")
                || nameLower.contains("thay bình") || nameLower.contains("thay ắc quy")
                || nameLower.contains("thay lốp") || nameLower.contains("thay săm") || nameLower.contains("thay ruột")
                || nameLower.contains("bình ắc quy") || nameLower.contains("ắc quy mới")
                || nameLower.contains("lốp mới") || nameLower.contains("vỏ mới")
                || nameLower.contains("ruột xe") || nameLower.contains("săm xe")
                || nameLower.contains("má phanh") || nameLower.contains("bố thắng") || nameLower.contains("đĩa phanh")
                || nameLower.contains("dây curoa") || nameLower.contains("curoa") || nameLower.contains("bi nồi")
                || nameLower.contains("tiếp nhiên liệu") || nameLower.contains("nhiên liệu")
                || nameLower.contains("đổ xăng") || nameLower.contains("xăng")
                || nameLower.contains("thay nhớt") || nameLower.contains("dầu nhớt") || nameLower.contains("nhớt")
                || nameLower.contains("thay bugi") || nameLower.contains("bugi")
                || nameLower.contains("cầu chì") || nameLower.contains("lò xo") || nameLower.contains("rô tuyn")
                || nameLower.contains("bơm xăng") || nameLower.contains("củ đề") || nameLower.contains("máy phát")
                || nameLower.contains("lọc gió") || nameLower.contains("lọc nhớt") || nameLower.contains("nước làm mát")
                || codeLower.contains("replace") || codeLower.contains("fuel")
                || codeLower.contains("part") || codeLower.contains("battery_new")
                || codeLower.contains("tire_new") || codeLower.contains("tube")
                || codeLower.contains("phuoc") || codeLower.startsWith("prd_");
    }

    @Override
    public String resolveUnitLabel(Service service) {
        if (service == null) return "Cái";
        if (StringUtils.hasText(service.getDefaultUnitLabel())) {
            return service.getDefaultUnitLabel().trim();
        }
        String nameLower = (service.getName() != null ? service.getName() : "").toLowerCase(Locale.ROOT);
        if (nameLower.contains("phuộc") || nameLower.contains("giảm xóc")) return "Cây";
        if (nameLower.contains("ắc quy") || nameLower.contains("bình")) return "Bình";
        if (nameLower.contains("xăng") || nameLower.contains("nhiên liệu") || nameLower.contains("dầu")) return "Lít";
        if (nameLower.contains("nhớt") || nameLower.contains("nước làm mát")) return "Chai";
        if (nameLower.contains("lốp") || nameLower.contains("vỏ")) return "Chiếc";
        if (nameLower.contains("ruột") || nameLower.contains("săm")) return "Cái";
        if (nameLower.contains("má phanh") || nameLower.contains("bố thắng") || nameLower.contains("curoa") || nameLower.contains("nhông sên dĩa")) return "Bộ";
        return "Cái";
    }

    @Override
    @Transactional
    public void ensureGarageInventoryInitialized(Garage garage, User actor) {
        if (garage == null || garage.getId() == null) return;

        List<Service> allServices = serviceRepository.findAll();
        List<GarageInventoryItem> existingItems = inventoryItemRepository.findByGarageIdAndIsDeletedFalse(garage.getId());
        Map<Long, GarageInventoryItem> byServiceId = new HashMap<>();
        Map<String, GarageInventoryItem> bySku = new HashMap<>();

        for (GarageInventoryItem gi : existingItems) {
            if (gi.getService() != null && gi.getService().getId() != null) {
                byServiceId.put(gi.getService().getId(), gi);
                // Tự động rút gọn mã SKU quá dài (> 16 ký tự) về dạng chuẩn gọn PT-0108
                if (gi.getSkuCode() != null && gi.getSkuCode().length() > 16) {
                    String compactSku = String.format("PT-%04d", gi.getService().getId());
                    gi.setSkuCode(compactSku);
                    inventoryItemRepository.save(gi);
                }
            }
            if (StringUtils.hasText(gi.getSkuCode())) {
                bySku.put(gi.getSkuCode().toUpperCase(Locale.ROOT), gi);
            }
        }

        List<GarageServicePrice> customPrices = garageServicePriceRepository.findByGarage(garage);
        Map<Long, GarageServicePrice> priceMap = new HashMap<>();
        for (GarageServicePrice p : customPrices) {
            if (p.getService() != null && p.getService().getId() != null) {
                priceMap.put(p.getService().getId(), p);
            }
        }

        for (Service svc : allServices) {
            if (Boolean.FALSE.equals(svc.getIsActive())) continue;
            if (svc.getFeeType() == FeeType.TOWING_FEE || svc.getFeeType() == FeeType.RESCUE_FEE) continue;

            GarageServicePrice gp = priceMap.get(svc.getId());
            boolean activeInGarageMenu = gp != null && !Boolean.FALSE.equals(gp.getIsActive());
            if (!isPartService(svc) && !activeInGarageMenu) continue;

            boolean isPhysical = isPhysicalPart(svc, svc.getName());
            InventoryItemType targetType = isPhysical ? InventoryItemType.PART : InventoryItemType.LABOR;
            if (svc.getItemType() != targetType) {
                svc.setItemType(targetType);
                if (isPhysical) {
                    svc.setDefaultUnitLabel(resolveUnitLabel(svc));
                    if (svc.getRecommendedMinStock() == null || svc.getRecommendedMinStock() <= 0) {
                        svc.setRecommendedMinStock(5);
                    }
                }
                serviceRepository.save(svc);
            }

            if (byServiceId.containsKey(svc.getId())) {
                GarageInventoryItem existingInv = byServiceId.get(svc.getId());
                if (gp == null && existingInv.getSellingPrice() != null && existingInv.getSellingPrice() > 0) {
                    syncSellingPriceToGarageMenu(garage, svc, existingInv.getSellingPrice());
                }
                continue;
            }

            String rawCode = StringUtils.hasText(svc.getCode()) ? svc.getCode().trim().toUpperCase(Locale.ROOT) : "";
            String sku = (rawCode.length() > 0 && rawCode.length() <= 12)
                    ? "PT-" + rawCode
                    : String.format("PT-%04d", svc.getId());
            if (bySku.containsKey(sku)) {
                sku = String.format("PT-%04d", svc.getId());
            }
            if (bySku.containsKey(sku)) continue;

            long minPrice = svc.getMinPrice() != null ? svc.getMinPrice() : 50_000L;
            long maxPrice = svc.getMaxPrice() != null ? svc.getMaxPrice() : minPrice;
            long sellingPrice = (gp != null && gp.getPrice() != null && gp.getPrice() > 0)
                    ? gp.getPrice()
                    : Math.round((minPrice + maxPrice) / 2000.0) * 1000L;
            long costPrice = Math.max(10_000L, Math.round((sellingPrice * 0.72) / 1000.0) * 1000L);

            int initialQty = resolveDefaultInitialStock(svc);
            int minStock = svc.getRecommendedMinStock() != null && svc.getRecommendedMinStock() > 0
                    ? svc.getRecommendedMinStock()
                    : 3;

            GarageInventoryItem item = new GarageInventoryItem();
            item.setGarage(garage);
            item.setService(svc);
            item.setSkuCode(sku);
            item.setName(svc.getName());
            item.setCategoryName(svc.getCategory() != null ? svc.getCategory().getName() : "Phụ tùng cứu hộ");
            item.setVehicleType(svc.getCategory() != null && svc.getCategory().getVehicleType() != null
                    ? svc.getCategory().getVehicleType()
                    : Capability.BOTH);
            item.setUnitLabel(resolveUnitLabel(svc));
            item.setOnHandQty(initialQty);
            item.setReservedQty(0);
            item.setMinStockQty(minStock);
            item.setCostPrice(costPrice);
            item.setSellingPrice(sellingPrice);
            item.setSupplierName("Kho Vật tư Chuẩn SRAS");
            item.setIsActive(true);
            GarageInventoryItem saved = inventoryItemRepository.save(item);
            byServiceId.put(svc.getId(), saved);
            bySku.put(sku, saved);

            if (gp == null) {
                syncSellingPriceToGarageMenu(garage, svc, sellingPrice);
            }

            InventoryTransaction initTx = new InventoryTransaction();
            initTx.setGarage(garage);
            initTx.setInventoryItem(saved);
            initTx.setTxType(InventoryTxType.INBOUND);
            initTx.setQuantityChange(initialQty);
            initTx.setOnHandAfter(initialQty);
            initTx.setUnitCostSnapshot(costPrice);
            initTx.setUnitPriceSnapshot(sellingPrice);
            initTx.setPerformedByUser(actor != null ? actor : garage.getOwner());
            initTx.setNote("Khởi tạo định mức tồn kho ban đầu theo danh mục phụ tùng chuẩn Sàn");
            inventoryTransactionRepository.save(initTx);
        }

        // Tự động đối soát & đồng bộ các đơn cứu hộ đang giữ chỗ (RESERVED) hoặc đã hoàn tất thanh toán (PAID)
        reconcileGarageOrderInventory(garage, actor);
    }

    private int resolveDefaultInitialStock(Service svc) {
        String nameLower = (svc.getName() != null ? svc.getName() : "").toLowerCase(Locale.ROOT);
        if (nameLower.contains("xăng") || nameLower.contains("nhiên liệu")) return 30;
        if (nameLower.contains("nhớt") || nameLower.contains("bugi") || nameLower.contains("ruột") || nameLower.contains("săm")) return 15;
        if (nameLower.contains("ắc quy") || nameLower.contains("bình") || nameLower.contains("lốp")) return 8;
        return 12;
    }

    @Override
    @Transactional
    public GarageInventoryOverviewResponse getAdminInventoryOverview(Long garageId, User admin) {
        List<Garage> activeGarages = garageRepository.findAll().stream()
                .filter(g -> !Boolean.TRUE.equals(g.getIsDeleted()))
                .filter(g -> g.getStatus() == GarageStatus.APPROVED || g.getStatus() == GarageStatus.SUSPENDED)
                .toList();

        List<GarageInventoryItem> allItems = garageId != null
                ? inventoryItemRepository.findByGarageIdAndIsDeletedFalse(garageId)
                : inventoryItemRepository.findAllActiveWithGarageAndService();

        List<InventoryTransaction> transactions = garageId != null
                ? inventoryTransactionRepository.findByGarageIdWithDetailsOrderByCreatedAtDesc(garageId)
                : inventoryTransactionRepository.findAllWithDetailsOrderByCreatedAtDesc();

        return buildOverviewResponse(activeGarages, allItems, transactions);
    }

    @Override
    @Transactional
    public GarageInventoryOverviewResponse getMyGarageInventoryOverview(User actor) {
        Garage garage = resolveActorGarage(actor);

        // Lấy danh sách dịch vụ đang được gara BẬT (isActive = true)
        List<GarageServicePrice> activeGarageServices = garageServicePriceRepository.findByGarage(garage).stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsActive()))
                .toList();

        Map<Long, GarageInventoryItem> existingItemsByService = inventoryItemRepository
                .findByGarageIdAndIsDeletedFalse(garage.getId()).stream()
                .filter(i -> i.getService() != null && i.getService().getId() != null)
                .collect(Collectors.toMap(i -> i.getService().getId(), i -> i, (a, b) -> a));

        // 1. Với các dịch vụ đang BẬT: Đảm bảo có GarageInventoryItem tương ứng và isActive = true
        for (GarageServicePrice gsp : activeGarageServices) {
            Service svc = gsp.getService();
            if (svc == null) continue;

            GarageInventoryItem invItem = existingItemsByService.get(svc.getId());
            if (invItem == null) {
                invItem = new GarageInventoryItem();
                invItem.setGarage(garage);
                invItem.setService(svc);
                invItem.setName(svc.getName());
                invItem.setSkuCode(String.format("PT-%04d", svc.getId()));
                invItem.setCategoryName(svc.getCategory() != null ? svc.getCategory().getName() : "Phụ tùng cứu hộ");
                invItem.setVehicleType(svc.getCategory() != null && svc.getCategory().getVehicleType() != null
                        ? svc.getCategory().getVehicleType() : Capability.BOTH);
                invItem.setUnitLabel(resolveUnitLabel(svc));
                invItem.setOnHandQty(0);
                invItem.setReservedQty(0);
                invItem.setMinStockQty(svc.getRecommendedMinStock() != null ? svc.getRecommendedMinStock() : 3);
                invItem.setSellingPrice(gsp.getPrice() != null ? gsp.getPrice() : (svc.getMinPrice() != null ? svc.getMinPrice() : 0L));
                invItem.setCostPrice(0L);
                invItem.setSupplierName("Kho Gara");
                invItem.setIsActive(true);
                inventoryItemRepository.save(invItem);
            } else if (!Boolean.TRUE.equals(invItem.getIsActive())) {
                invItem.setIsActive(true);
                if (gsp.getPrice() != null && gsp.getPrice() > 0) {
                    invItem.setSellingPrice(gsp.getPrice());
                }
                inventoryItemRepository.save(invItem);
            }
        }

        // 2. Với các item trong kho mà dịch vụ bị TẮT hoặc không còn trong danh sách bật: set isActive = false
        Set<Long> activeServiceIds = activeGarageServices.stream()
                .filter(p -> p.getService() != null)
                .map(p -> p.getService().getId())
                .collect(Collectors.toSet());

        for (Map.Entry<Long, GarageInventoryItem> entry : existingItemsByService.entrySet()) {
            if (!activeServiceIds.contains(entry.getKey())) {
                GarageInventoryItem item = entry.getValue();
                if (Boolean.TRUE.equals(item.getIsActive())) {
                    item.setIsActive(false);
                    inventoryItemRepository.save(item);
                }
            }
        }

        // 3. Chỉ trả về các item đang ACTIVE (tương ứng với các dịch vụ đã bật)
        List<GarageInventoryItem> items = inventoryItemRepository
                .findByGarageIdAndIsActiveTrueAndIsDeletedFalse(garage.getId());

        List<InventoryTransaction> transactions = inventoryTransactionRepository
                .findByGarageIdWithDetailsOrderByCreatedAtDesc(garage.getId());

        // Tự động kiểm tra và cảnh báo Chủ Gara nếu có phụ tùng hết hoặc sắp hết (chống spam 12h)
        autoNotifyLowStockForGarage(garage);

        return buildOverviewResponse(List.of(garage), items, transactions);
    }

    @Override
    @Transactional
    public GarageInventoryOverviewResponse.InventoryItemDto upsertInventoryItem(
            Long itemId,
            InventoryItemUpsertRequest request,
            User actor
    ) {
        Garage targetGarage;
        if (actor.getRole() == UserRole.ADMIN) {
            if (itemId != null) {
                GarageInventoryItem existing = inventoryItemRepository.findById(itemId)
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mặt hàng kho #" + itemId));
                targetGarage = existing.getGarage();
            } else if (request.getGarageId() != null) {
                targetGarage = garageRepository.findById(request.getGarageId())
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Gara #" + request.getGarageId()));
            } else {
                throw new BadRequestException("Vui lòng chọn Gara cần thêm phụ tùng vào kho");
            }
        } else {
            targetGarage = resolveActorGarage(actor);
        }

        Service linkedService = null;
        if (request.getServiceId() != null) {
            linkedService = serviceRepository.findById(request.getServiceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ/phụ tùng chuẩn #" + request.getServiceId()));
        }

        GarageInventoryItem item;
        boolean isNew = (itemId == null);
        if (isNew) {
            if (linkedService != null) {
                Optional<GarageInventoryItem> dupService = inventoryItemRepository
                        .findFirstByGarageIdAndServiceIdAndIsDeletedFalse(targetGarage.getId(), linkedService.getId());
                if (dupService.isPresent()) {
                    throw new BadRequestException("Mặt hàng '" + linkedService.getName() + "' đã tồn tại trong kho của Gara này");
                }
            }
            String rawSku = StringUtils.hasText(request.getSkuCode())
                    ? request.getSkuCode().trim().toUpperCase(Locale.ROOT)
                    : (linkedService != null ? "PT-" + linkedService.getCode() : "PT-" + System.currentTimeMillis() % 100000);
            if (inventoryItemRepository.findByGarageIdAndSkuCodeIgnoreCaseAndIsDeletedFalse(targetGarage.getId(), rawSku).isPresent()) {
                throw new BadRequestException("Mã phụ tùng (SKU) '" + rawSku + "' đã tồn tại trong kho của Gara này");
            }

            item = new GarageInventoryItem();
            item.setGarage(targetGarage);
            item.setService(linkedService);
            item.setSkuCode(rawSku);
            item.setOnHandQty(0);
            item.setReservedQty(0);
        } else {
            item = inventoryItemRepository.findByIdForUpdate(itemId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mặt hàng kho #" + itemId));
            assertCanManageGarageInventory(actor, item.getGarage());
            if (StringUtils.hasText(request.getSkuCode())) {
                item.setSkuCode(request.getSkuCode().trim().toUpperCase(Locale.ROOT));
            }
            if (linkedService != null) {
                item.setService(linkedService);
            }
        }

        String itemName = StringUtils.hasText(request.getName())
                ? request.getName().trim()
                : (linkedService != null ? linkedService.getName() : item.getName());
        if (!StringUtils.hasText(itemName)) {
            throw new BadRequestException("Tên phụ tùng / vật tư không được để trống");
        }
        item.setName(itemName);

        if (StringUtils.hasText(request.getCategoryName())) {
            item.setCategoryName(request.getCategoryName().trim());
        } else if (linkedService != null && linkedService.getCategory() != null) {
            item.setCategoryName(linkedService.getCategory().getName());
        } else if (!StringUtils.hasText(item.getCategoryName())) {
            item.setCategoryName("Phụ tùng cứu hộ");
        }

        if (request.getVehicleType() != null) {
            item.setVehicleType(request.getVehicleType());
        } else if (linkedService != null && linkedService.getCategory() != null && linkedService.getCategory().getVehicleType() != null) {
            item.setVehicleType(linkedService.getCategory().getVehicleType());
        }

        if (StringUtils.hasText(request.getUnitLabel())) {
            item.setUnitLabel(request.getUnitLabel().trim());
        } else if (linkedService != null) {
            item.setUnitLabel(resolveUnitLabel(linkedService));
        }

        if (request.getMinStockQty() != null && request.getMinStockQty() >= 0) {
            item.setMinStockQty(request.getMinStockQty());
        }

        long costPrice = request.getCostPrice() != null && request.getCostPrice() >= 0
                ? request.getCostPrice()
                : (item.getCostPrice() != null ? item.getCostPrice() : 0L);
        item.setCostPrice(costPrice);

        long sellingPrice = request.getSellingPrice() != null && request.getSellingPrice() >= 0
                ? request.getSellingPrice()
                : (item.getSellingPrice() != null ? item.getSellingPrice() : costPrice);

        // Kiểm tra khung giá trần/sàn của Admin nếu mặt hàng gắn với danh mục chuẩn của Sàn
        Service effectiveSvc = item.getService();
        if (effectiveSvc != null) {
            if (effectiveSvc.getMinPrice() != null && sellingPrice < effectiveSvc.getMinPrice()) {
                throw new BadRequestException("Giá bán niêm yết (" + String.format("%,d", sellingPrice)
                        + "đ) không được thấp hơn giá sàn quy định của hệ thống ("
                        + String.format("%,d", effectiveSvc.getMinPrice()) + "đ)");
            }
            if (effectiveSvc.getMaxPrice() != null && sellingPrice > effectiveSvc.getMaxPrice()) {
                throw new BadRequestException("Giá bán niêm yết (" + String.format("%,d", sellingPrice)
                        + "đ) không được vượt quá giá trần quy định của hệ thống ("
                        + String.format("%,d", effectiveSvc.getMaxPrice()) + "đ)");
            }
        }
        item.setSellingPrice(sellingPrice);

        if (request.getSupplierName() != null) {
            item.setSupplierName(request.getSupplierName().trim());
        }
        if (request.getIsActive() != null) {
            item.setIsActive(request.getIsActive());
        }

        int initQty = (isNew && request.getInitialQty() != null && request.getInitialQty() > 0)
                ? request.getInitialQty()
                : 0;
        if (isNew && initQty > 0) {
            item.setOnHandQty(initQty);
        }

        GarageInventoryItem saved = inventoryItemRepository.save(item);

        // Đồng bộ giá bán sang bảng garage_service_prices nếu có gắn service chuẩn
        if (effectiveSvc != null && sellingPrice > 0) {
            syncSellingPriceToGarageMenu(targetGarage, effectiveSvc, sellingPrice);
        }

        if (isNew && initQty > 0) {
            InventoryTransaction tx = new InventoryTransaction();
            tx.setGarage(targetGarage);
            tx.setInventoryItem(saved);
            tx.setTxType(InventoryTxType.INBOUND);
            tx.setQuantityChange(initQty);
            tx.setOnHandAfter(initQty);
            tx.setUnitCostSnapshot(costPrice);
            tx.setUnitPriceSnapshot(sellingPrice);
            tx.setPerformedByUser(actor);
            tx.setNote(StringUtils.hasText(request.getNote())
                    ? request.getNote().trim()
                    : "Nhập kho ban đầu khi tạo mã phụ tùng mới");
            inventoryTransactionRepository.save(tx);
        }

        return toItemDto(saved);
    }

    @Override
    @Transactional
    public GarageInventoryOverviewResponse.InventoryItemDto adjustInventoryStock(
            Long itemId,
            InventoryStockAdjustRequest request,
            User actor
    ) {
        GarageInventoryItem item = inventoryItemRepository.findByIdForUpdate(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mặt hàng trong kho #" + itemId));

        assertCanManageGarageInventory(actor, item.getGarage());

        InventoryTxType txType = request.getTxType() != null ? request.getTxType() : InventoryTxType.INBOUND;
        int inputQty = request.getQuantity() != null ? request.getQuantity() : 0;
        int currentOnHand = item.getOnHandQty() != null ? item.getOnHandQty() : 0;
        int currentReserved = item.getReservedQty() != null ? item.getReservedQty() : 0;

        int qtyChange;
        int newOnHand;

        if (txType == InventoryTxType.INBOUND) {
            if (inputQty <= 0) {
                throw new BadRequestException("Số lượng nhập kho phải lớn hơn 0");
            }
            qtyChange = inputQty;
            newOnHand = currentOnHand + inputQty;

            // Tính lại giá vốn bình quân gia quyền (Weighted Average Cost) khi nhập lô hàng mới
            if (request.getUnitCost() != null && request.getUnitCost() > 0) {
                long oldCost = item.getCostPrice() != null ? item.getCostPrice() : request.getUnitCost();
                long totalOldValue = (long) Math.max(0, currentOnHand) * oldCost;
                long totalNewValue = (long) inputQty * request.getUnitCost();
                long weightedCost = newOnHand > 0
                        ? Math.round((double) (totalOldValue + totalNewValue) / newOnHand)
                        : request.getUnitCost();
                item.setCostPrice(weightedCost);
            }
        } else if (txType == InventoryTxType.DAMAGED) {
            if (inputQty <= 0) {
                throw new BadRequestException("Số lượng xuất hủy hỏng phải lớn hơn 0");
            }
            int available = Math.max(0, currentOnHand - currentReserved);
            if (inputQty > available) {
                throw new BadRequestException("Chỉ có thể xuất hủy tối đa " + available + " " + item.getUnitLabel()
                        + " khả dụng (đang có " + currentReserved + " " + item.getUnitLabel() + " giữ chỗ cho đơn cứu hộ)");
            }
            qtyChange = -inputQty;
            newOnHand = currentOnHand - inputQty;
        } else if (txType == InventoryTxType.ADJUSTMENT) {
            if (inputQty < currentReserved) {
                throw new BadRequestException("Số lượng kiểm kê thực tế (" + inputQty
                        + ") không thể nhỏ hơn số lượng đang tạm giữ cho đơn cứu hộ đang chạy (" + currentReserved + ")");
            }
            qtyChange = inputQty - currentOnHand;
            newOnHand = inputQty;
            if (request.getUnitCost() != null && request.getUnitCost() >= 0) {
                item.setCostPrice(request.getUnitCost());
            }
        } else {
            throw new BadRequestException("Loại giao dịch điều chỉnh kho không hợp lệ: " + txType);
        }

        if (request.getMinStockQty() != null && request.getMinStockQty() >= 0) {
            item.setMinStockQty(request.getMinStockQty());
        }

        if (request.getSellingPrice() != null && request.getSellingPrice() > 0) {
            Service svc = item.getService();
            if (svc != null) {
                if (svc.getMinPrice() != null && request.getSellingPrice() < svc.getMinPrice()) {
                    throw new BadRequestException("Giá bán không được thấp hơn giá sàn quy định: "
                            + String.format("%,d", svc.getMinPrice()) + "đ");
                }
                if (svc.getMaxPrice() != null && request.getSellingPrice() > svc.getMaxPrice()) {
                    throw new BadRequestException("Giá bán không được vượt quá giá trần quy định: "
                            + String.format("%,d", svc.getMaxPrice()) + "đ");
                }
                syncSellingPriceToGarageMenu(item.getGarage(), svc, request.getSellingPrice());
            }
            item.setSellingPrice(request.getSellingPrice());
        }

        if (StringUtils.hasText(request.getSupplierName())) {
            item.setSupplierName(request.getSupplierName().trim());
        }

        item.setOnHandQty(newOnHand);
        GarageInventoryItem saved = inventoryItemRepository.save(item);

        if (qtyChange != 0 || txType == InventoryTxType.ADJUSTMENT) {
            InventoryTransaction tx = new InventoryTransaction();
            tx.setGarage(item.getGarage());
            tx.setInventoryItem(saved);
            tx.setTxType(txType);
            tx.setQuantityChange(qtyChange);
            tx.setOnHandAfter(newOnHand);
            tx.setUnitCostSnapshot(request.getUnitCost() != null ? request.getUnitCost() : saved.getCostPrice());
            tx.setUnitPriceSnapshot(saved.getSellingPrice());
            tx.setPerformedByUser(actor);
            String defaultNote = txType == InventoryTxType.INBOUND
                    ? "Nhập bổ sung +" + inputQty + " " + saved.getUnitLabel() + " vào kho"
                    : (txType == InventoryTxType.DAMAGED
                            ? "Xuất hủy " + inputQty + " " + saved.getUnitLabel() + " hư hỏng/hao hụt"
                            : "Kiểm kê kho thực tế: " + currentOnHand + " -> " + newOnHand + " " + saved.getUnitLabel());
            tx.setNote(StringUtils.hasText(request.getNote()) ? request.getNote().trim() : defaultNote);
            inventoryTransactionRepository.save(tx);
        }

        return toItemDto(saved);
    }

    @Override
    @Transactional
    public GarageInventoryOverviewResponse syncStandardCatalogToGarage(Long garageId, User actor) {
        Garage targetGarage;
        if (actor.getRole() == UserRole.ADMIN) {
            if (garageId != null) {
                targetGarage = garageRepository.findById(garageId)
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Gara #" + garageId));
            } else {
                return getAdminInventoryOverview(null, actor);
            }
        } else {
            targetGarage = resolveActorGarage(actor);
        }

        ensureGarageInventoryInitialized(targetGarage, actor);
        return actor.getRole() == UserRole.ADMIN
                ? getAdminInventoryOverview(targetGarage.getId(), actor)
                : getMyGarageInventoryOverview(actor);
    }

    @Override
    @Transactional
    public void sendInventoryWarningToGarage(Long itemId, String title, String message, User admin) {
        GarageInventoryItem item = inventoryItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mặt hàng kho #" + itemId));

        Garage garage = item.getGarage();
        if (garage == null || garage.getOwner() == null) {
            throw new BadRequestException("Không tìm thấy thông tin Chủ Gara của mặt hàng này");
        }

        int minStock = item.getMinStockQty() != null ? item.getMinStockQty() : 3;
        boolean isOutOfStock = item.getAvailableQty() <= 0;
        boolean isLowStock = !isOutOfStock && item.getAvailableQty() <= minStock;

        String defaultTitle;
        String defaultMsg;
        if (isOutOfStock) {
            defaultTitle = "Cảnh báo đã hết hàng: " + item.getName();
            defaultMsg = "Mặt hàng '" + item.getName() + "' tại gara đã hết hàng (tồn khả dụng: 0 "
                    + item.getUnitLabel() + "). Để tránh gián đoạn việc cứu hộ, hãy nhập thêm hàng ngay!";
        } else if (isLowStock) {
            defaultTitle = "Cảnh báo sắp hết hàng: " + item.getName();
            defaultMsg = "Mặt hàng '" + item.getName() + "' tại gara sắp hết (hiện chỉ còn "
                    + item.getAvailableQty() + " " + item.getUnitLabel() + ", định mức: " + minStock + " " + item.getUnitLabel()
                    + "). Vui lòng kiểm tra và nhập thêm hàng.";
        } else {
            defaultTitle = "Cảnh báo Kho Phụ tùng: " + item.getName();
            defaultMsg = "Ban Quản Trị nhắc nhở Gara kiểm tra và đối soát số lượng tồn kho thực tế của mặt hàng '"
                    + item.getName() + "'. Tồn khả dụng hiện tại: "
                    + item.getAvailableQty() + " " + item.getUnitLabel() + ".";
        }

        String finalTitle = StringUtils.hasText(title) ? title.trim() : defaultTitle;
        String finalMsg = StringUtils.hasText(message) ? message.trim() : defaultMsg;

        notificationService.createNotification(
                garage.getOwner(),
                NotificationType.SYSTEM_WARNING,
                finalTitle,
                finalMsg,
                "INVENTORY",
                item.getId()
        );
    }

    @Override
    @Transactional
    public void autoNotifyLowStockForGarage(Garage garage) {
        if (garage == null || garage.getOwner() == null) return;
        try {
            List<GarageInventoryItem> items = inventoryItemRepository.findByGarageIdAndIsActiveTrueAndIsDeletedFalse(garage.getId());
            java.time.OffsetDateTime threshold = java.time.OffsetDateTime.now().minusHours(12);

            for (GarageInventoryItem item : items) {
                if (!isPhysicalPart(item.getService(), item.getName())) {
                    continue;
                }
                int available = item.getAvailableQty();
                int minStock = item.getMinStockQty() != null ? item.getMinStockQty() : 3;

                if (available <= minStock) {
                    List<Notification> recent = notificationRepository.findRecentNotifications(
                            garage.getOwner(), "INVENTORY", item.getId(), threshold
                    );
                    if (recent == null || recent.isEmpty()) {
                        String title;
                        String msg;
                        if (available <= 0) {
                            title = "Cảnh báo đã hết hàng: " + item.getName();
                            msg = "Mặt hàng '" + item.getName() + "' tại gara đã hết hàng (tồn khả dụng: 0 "
                                    + item.getUnitLabel() + "). Để tránh gián đoạn việc cứu hộ, hãy nhập thêm hàng ngay!";
                        } else {
                            title = "Cảnh báo sắp hết hàng: " + item.getName();
                            msg = "Mặt hàng '" + item.getName() + "' tại gara sắp hết (hiện chỉ còn "
                                    + available + " " + item.getUnitLabel() + ", định mức: " + minStock + " " + item.getUnitLabel()
                                    + "). Vui lòng kiểm tra và nhập thêm hàng.";
                        }
                        notificationService.createNotification(
                                garage.getOwner(),
                                NotificationType.SYSTEM_WARNING,
                                title,
                                msg,
                                "INVENTORY",
                                item.getId()
                        );
                    }
                }
            }
        } catch (Exception e) {
            log.error("Lỗi khi tự động cảnh báo tồn kho gara #{}: {}", garage.getId(), e.getMessage());
        }
    }

    @Override
    @Transactional
    public int scanAndWarnAllLowStockItems(Long garageId, User admin) {
        List<Garage> targetGarages;
        if (garageId != null && garageId > 0) {
            Garage g = garageRepository.findById(garageId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Gara #" + garageId));
            targetGarages = List.of(g);
        } else {
            targetGarages = garageRepository.findAll().stream()
                    .filter(g -> Boolean.FALSE.equals(g.getIsDeleted()))
                    .toList();
        }

        int count = 0;
        for (Garage garage : targetGarages) {
            if (garage.getOwner() == null) continue;
            List<GarageInventoryItem> items = inventoryItemRepository.findByGarageIdAndIsActiveTrueAndIsDeletedFalse(garage.getId());
            List<String> outOfStockNames = new ArrayList<>();
            List<String> lowStockNames = new ArrayList<>();

            for (GarageInventoryItem item : items) {
                if (!isPhysicalPart(item.getService(), item.getName())) {
                    continue;
                }
                int available = item.getAvailableQty();
                int minStock = item.getMinStockQty() != null ? item.getMinStockQty() : 3;

                if (available <= 0) {
                    outOfStockNames.add(item.getName());
                } else if (available <= minStock) {
                    lowStockNames.add(item.getName());
                }
            }

            if (!outOfStockNames.isEmpty() || !lowStockNames.isEmpty()) {
                StringBuilder msgBuilder = new StringBuilder();
                msgBuilder.append("Quản trị viên gửi cảnh báo hết hàng cho các mặt hàng");
                List<String> allShortages = new ArrayList<>(outOfStockNames);
                if (allShortages.isEmpty()) {
                    allShortages.addAll(lowStockNames);
                }
                String joined = String.join(", ", allShortages.stream().limit(5).toList());
                if (allShortages.size() > 5) {
                    joined += "... và " + (allShortages.size() - 5) + " mặt hàng khác";
                }
                msgBuilder.append(": ").append(joined).append(". Chú ý nhập thêm.");

                String title = !outOfStockNames.isEmpty()
                        ? "Cảnh báo hết hàng từ Quản trị viên"
                        : "Cảnh báo sắp hết hàng từ Quản trị viên";

                notificationService.createNotification(
                        garage.getOwner(),
                        NotificationType.SYSTEM_WARNING,
                        title,
                        msgBuilder.toString(),
                        "INVENTORY",
                        garage.getId()
                );
                count += (outOfStockNames.size() + lowStockNames.size());
            }
        }
        return count;
    }

    // ────────────────────────── TÍCH HỢP VÒNG ĐỜI ĐƠN CỨU HỘ ──────────────────────────

    private GarageInventoryItem resolveOrCreateInventoryItemForQuoteItem(
            Garage garage,
            RescueRequestItem qItem,
            User actor
    ) {
        if (garage == null || qItem == null) return null;

        if (qItem.getInventoryItem() != null && qItem.getInventoryItem().getId() != null) {
            return inventoryItemRepository.findByIdForUpdate(qItem.getInventoryItem().getId()).orElse(null);
        }

        Service svc = qItem.getService();
        if (svc == null && StringUtils.hasText(qItem.getNameSnapshot())) {
            String snap = qItem.getNameSnapshot().trim();
            svc = serviceRepository.findAll().stream()
                    .filter(s -> s.getName() != null && s.getName().trim().equalsIgnoreCase(snap))
                    .findFirst()
                    .orElse(null);
            if (svc != null) {
                qItem.setService(svc);
            }
        }

        if (svc != null && svc.getId() != null) {
            GarageInventoryItem byService = inventoryItemRepository
                    .findByGarageIdAndServiceIdForUpdate(garage.getId(), svc.getId())
                    .orElse(null);
            if (byService != null) {
                return byService;
            }

            // Tự động khởi tạo mặt hàng kho cho dịch vụ/thiết bị này nếu kho Gara chưa có
            String sku = String.format("PT-%04d", svc.getId());
            if (inventoryItemRepository.findByGarageIdAndSkuCodeIgnoreCaseAndIsDeletedFalse(garage.getId(), sku).isPresent()) {
                sku = "PT-" + svc.getId() + "-" + (System.currentTimeMillis() % 1000);
            }
            long sellingPrice = qItem.getUnitPriceSnapshot() != null && qItem.getUnitPriceSnapshot() > 0
                    ? qItem.getUnitPriceSnapshot()
                    : (svc.getMinPrice() != null ? svc.getMinPrice() : 100_000L);
            long costPrice = Math.max(10_000L, Math.round((sellingPrice * 0.72) / 1000.0) * 1000L);
            int initialQty = Math.max(12, (qItem.getQuantity() != null ? qItem.getQuantity() : 1) + 5);

            GarageInventoryItem created = new GarageInventoryItem();
            created.setGarage(garage);
            created.setService(svc);
            created.setSkuCode(sku);
            created.setName(svc.getName());
            created.setCategoryName(svc.getCategory() != null ? svc.getCategory().getName() : "Phụ tùng cứu hộ");
            created.setVehicleType(svc.getCategory() != null && svc.getCategory().getVehicleType() != null
                    ? svc.getCategory().getVehicleType()
                    : Capability.BOTH);
            created.setUnitLabel(resolveUnitLabel(svc));
            created.setOnHandQty(initialQty);
            created.setReservedQty(0);
            created.setMinStockQty(5);
            created.setCostPrice(costPrice);
            created.setSellingPrice(sellingPrice);
            created.setSupplierName("Kho Vật tư Chuẩn SRAS");
            created.setIsActive(true);
            GarageInventoryItem saved = inventoryItemRepository.save(created);

            InventoryTransaction initTx = new InventoryTransaction();
            initTx.setGarage(garage);
            initTx.setInventoryItem(saved);
            initTx.setTxType(InventoryTxType.INBOUND);
            initTx.setQuantityChange(initialQty);
            initTx.setOnHandAfter(initialQty);
            initTx.setUnitCostSnapshot(costPrice);
            initTx.setUnitPriceSnapshot(sellingPrice);
            initTx.setPerformedByUser(actor != null ? actor : garage.getOwner());
            initTx.setNote("Khởi tạo định mức tồn kho tự động cho hạng mục '" + svc.getName() + "'");
            inventoryTransactionRepository.save(initTx);

            return saved;
        }

        // Trường hợp hạng mục tự nhập tên (không có service_id): tìm theo tên tương ứng trong kho Gara
        String rawName = qItem.getNameSnapshot() != null ? qItem.getNameSnapshot().trim().toLowerCase(Locale.ROOT) : "";
        if (!rawName.isEmpty()) {
            List<GarageInventoryItem> garageItems = inventoryItemRepository.findByGarageIdAndIsDeletedFalse(garage.getId());
            for (GarageInventoryItem candidate : garageItems) {
                String cName = candidate.getName() != null ? candidate.getName().trim().toLowerCase(Locale.ROOT) : "";
                if (!cName.isEmpty() && (cName.equals(rawName) || cName.contains(rawName) || rawName.contains(cName))) {
                    return inventoryItemRepository.findByIdForUpdate(candidate.getId()).orElse(candidate);
                }
            }
            String[] keywords = {"phanh", "lốp", "săm", "ruột", "ắc quy", "bình", "nhớt", "bugi", "xăng", "nhiên liệu", "cầu chì", "curoa"};
            for (String kw : keywords) {
                if (rawName.contains(kw)) {
                    for (GarageInventoryItem candidate : garageItems) {
                        String cName = candidate.getName() != null ? candidate.getName().toLowerCase(Locale.ROOT) : "";
                        if (cName.contains(kw)) {
                            return inventoryItemRepository.findByIdForUpdate(candidate.getId()).orElse(candidate);
                        }
                    }
                }
            }
        }

        return null;
    }

    private void reconcileGarageOrderInventory(Garage garage, User actor) {
        if (garage == null || garage.getId() == null) return;
        try {
            List<RescueRequestItem> allGarageQuoteItems = rescueRequestItemRepository
                    .findAllByGarageIdWithDetails(garage.getId());
            if (allGarageQuoteItems == null || allGarageQuoteItems.isEmpty()) return;

            java.time.OffsetDateTime recentThreshold = java.time.OffsetDateTime.now().minusHours(24);

            for (RescueRequestItem qItem : allGarageQuoteItems) {
                RescueRequest req = qItem.getRequest();
                if (req == null) continue;

                RescueStatus st = req.getStatus();
                boolean isQuoteDeclined = "DECLINED".equalsIgnoreCase(req.getQuoteStatus())
                        || qItem.getStatus() == ItemStatus.REJECTED
                        || st == RescueStatus.CANCELLED
                        || st == RescueStatus.DECLINED;

                if (isQuoteDeclined) {
                    if (qItem.getInventoryStatus() == QuoteItemInventoryStatus.RESERVED) {
                        qItem.setInventoryStatus(QuoteItemInventoryStatus.RELEASED);
                        rescueRequestItemRepository.save(qItem);
                    }
                    continue;
                }

                // 1. Đơn đang trong quá trình Báo giá / Chờ khách duyệt / Đang sửa -> Giữ chỗ (RESERVED)
                boolean isHoldingOrder = (st == RescueStatus.DIAGNOSED
                        || st == RescueStatus.REPAIRING_ONSITE
                        || st == RescueStatus.TOWING
                        || st == RescueStatus.TOW_TO_GARAGE)
                        && !"DECLINED".equalsIgnoreCase(req.getQuoteStatus())
                        && qItem.getStatus() != ItemStatus.REJECTED;

                if (isHoldingOrder) {
                    if (qItem.getInventoryStatus() == null || qItem.getInventoryStatus() == QuoteItemInventoryStatus.NONE) {
                        GarageInventoryItem invItem = resolveOrCreateInventoryItemForQuoteItem(garage, qItem, actor);
                        if (invItem != null) {
                            qItem.setInventoryItem(invItem);
                            qItem.setInventoryStatus(QuoteItemInventoryStatus.RESERVED);
                            rescueRequestItemRepository.save(qItem);
                        }
                    }
                } else if (st == RescueStatus.COMPLETED || st == RescueStatus.AWAITING_PAYMENT || st == RescueStatus.PAID || st == RescueStatus.RATED) {
                    // 2. Đơn đã hoàn tất sửa chữa (COMPLETED / AWAITING_PAYMENT / PAID / RATED)
                    // Chỉ trừ kho khi khách chấp nhận sửa chữa (QuoteStatus = APPROVED)
                    boolean isApproved = "APPROVED".equalsIgnoreCase(req.getQuoteStatus())
                            && !"DECLINED".equalsIgnoreCase(req.getQuoteStatus())
                            && qItem.getStatus() != ItemStatus.REJECTED;

                    if (isApproved && qItem.getInventoryStatus() != QuoteItemInventoryStatus.DEDUCTED) {
                        GarageInventoryItem invItem = resolveOrCreateInventoryItemForQuoteItem(garage, qItem, actor);
                        if (invItem != null) {
                            int qty = qItem.getQuantity() != null && qItem.getQuantity() > 0 ? qItem.getQuantity() : 1;
                            int currentOnHand = invItem.getOnHandQty() != null ? invItem.getOnHandQty() : 0;
                            int currentReserved = invItem.getReservedQty() != null ? invItem.getReservedQty() : 0;
                            if (qItem.getInventoryStatus() == QuoteItemInventoryStatus.RESERVED) {
                                invItem.setReservedQty(Math.max(0, currentReserved - qty));
                            }
                            int newOnHand = Math.max(0, currentOnHand - qty);
                            invItem.setOnHandQty(newOnHand);
                            inventoryItemRepository.save(invItem);

                            qItem.setInventoryItem(invItem);
                            qItem.setInventoryStatus(QuoteItemInventoryStatus.DEDUCTED);
                            rescueRequestItemRepository.save(qItem);

                            User performer = req.getStaff() != null && req.getStaff().getUser() != null
                                    ? req.getStaff().getUser()
                                    : (actor != null ? actor : garage.getOwner());

                            InventoryTransaction tx = new InventoryTransaction();
                            tx.setGarage(garage);
                            tx.setInventoryItem(invItem);
                            tx.setTxType(InventoryTxType.OUTBOUND_ORDER);
                            tx.setQuantityChange(-qty);
                            tx.setOnHandAfter(newOnHand);
                            tx.setUnitCostSnapshot(invItem.getCostPrice());
                            tx.setUnitPriceSnapshot(qItem.getUnitPriceSnapshot());
                            tx.setRescueRequest(req);
                            tx.setPerformedByUser(performer);
                            tx.setNote("Xuất kho " + qty + " " + invItem.getUnitLabel() + " cho đơn cứu hộ #" + req.getCode());
                            inventoryTransactionRepository.save(tx);
                        }
                    }
                }
            }

            // 3. Đồng bộ chính xác tổng số lượng Đang tạm giữ (reservedQty) trên từng mã phụ tùng từ các đơn đang giữ chỗ
            Map<Long, Integer> activeReservedByItemId = new HashMap<>();
            for (RescueRequestItem qItem : allGarageQuoteItems) {
                RescueRequest req = qItem.getRequest();
                if (req == null) continue;
                RescueStatus st = req.getStatus();
                boolean isHoldingOrder = (st == RescueStatus.DIAGNOSED
                        || st == RescueStatus.REPAIRING_ONSITE
                        || st == RescueStatus.TOWING
                        || st == RescueStatus.TOW_TO_GARAGE)
                        && !"DECLINED".equalsIgnoreCase(req.getQuoteStatus())
                        && qItem.getStatus() != ItemStatus.REJECTED;

                if (isHoldingOrder
                        && qItem.getInventoryStatus() == QuoteItemInventoryStatus.RESERVED
                        && qItem.getInventoryItem() != null
                        && qItem.getInventoryItem().getId() != null) {
                    int qty = qItem.getQuantity() != null && qItem.getQuantity() > 0 ? qItem.getQuantity() : 1;
                    activeReservedByItemId.merge(qItem.getInventoryItem().getId(), qty, Integer::sum);
                }
            }

            List<GarageInventoryItem> garageItems = inventoryItemRepository.findByGarageIdAndIsDeletedFalse(garage.getId());
            for (GarageInventoryItem gi : garageItems) {
                int expectedReserved = activeReservedByItemId.getOrDefault(gi.getId(), 0);
                int currentReserved = gi.getReservedQty() != null ? gi.getReservedQty() : 0;
                if (currentReserved != expectedReserved) {
                    gi.setReservedQty(expectedReserved);
                    inventoryItemRepository.save(gi);
                }
            }
        } catch (Exception e) {
            log.warn("Lỗi đối soát tự động tồn kho theo đơn cứu hộ của Gara #{}: {}", garage.getId(), e.getMessage());
        }
    }

    @Override
    @Transactional
    public void reserveStockForQuoteItems(Garage garage, RescueRequest req, List<RescueRequestItem> items, User actor) {
        if (garage == null || items == null || items.isEmpty()) return;

        for (RescueRequestItem qItem : items) {
            if (qItem.getInventoryStatus() == QuoteItemInventoryStatus.RESERVED
                    || qItem.getInventoryStatus() == QuoteItemInventoryStatus.DEDUCTED) {
                continue;
            }

            // Dịch vụ công thợ thuần túy (LABOR, kéo xe, vá lốp, kích bình) không cần giữ chỗ kho
            Service checkSvc = qItem.getService();
            if (!isPhysicalPart(checkSvc, qItem.getNameSnapshot())) {
                qItem.setInventoryStatus(QuoteItemInventoryStatus.NONE);
                rescueRequestItemRepository.save(qItem);
                continue;
            }

            GarageInventoryItem invItem = resolveOrCreateInventoryItemForQuoteItem(garage, qItem, actor);
            if (invItem == null) {
                qItem.setInventoryStatus(QuoteItemInventoryStatus.NONE);
                rescueRequestItemRepository.save(qItem);
                continue;
            }

            int neededQty = qItem.getQuantity() != null && qItem.getQuantity() > 0 ? qItem.getQuantity() : 1;
            int available = invItem.getAvailableQty();

            if (available < neededQty) {
                throw new BadRequestException("Phụ tùng '" + invItem.getName() + "' trong kho Gara hiện chỉ còn "
                        + available + " " + invItem.getUnitLabel() + " khả dụng (báo giá yêu cầu: " + neededQty
                        + " " + invItem.getUnitLabel() + "). Vui lòng nhập thêm kho hoặc giảm số lượng!");
            }

            int currentReserved = invItem.getReservedQty() != null ? invItem.getReservedQty() : 0;
            invItem.setReservedQty(currentReserved + neededQty);
            inventoryItemRepository.save(invItem);

            qItem.setInventoryItem(invItem);
            qItem.setInventoryStatus(QuoteItemInventoryStatus.RESERVED);
            rescueRequestItemRepository.save(qItem);
        }
    }

    @Override
    @Transactional
    public void commitReservedStockForOrder(RescueRequest req, User actor) {
        if (req == null || req.getGarage() == null) return;
        if ("DECLINED".equalsIgnoreCase(req.getQuoteStatus())
                || req.getStatus() == RescueStatus.DECLINED
                || req.getStatus() == RescueStatus.CANCELLED) {
            return;
        }

        List<RescueRequestItem> items = rescueRequestItemRepository.findByRequestOrderByIdAsc(req);
        if (items == null || items.isEmpty()) return;

        for (RescueRequestItem qItem : items) {
            if (qItem.getInventoryStatus() == QuoteItemInventoryStatus.DEDUCTED) {
                continue; // Đã xuất kho rồi, không trừ lặp lại (Idempotent)
            }
            if (qItem.getStatus() == ItemStatus.REJECTED || "DECLINED".equalsIgnoreCase(req.getQuoteStatus())) {
                continue;
            }

            Service checkSvc = qItem.getService();
            if (!isPhysicalPart(checkSvc, qItem.getNameSnapshot())) {
                continue;
            }

            GarageInventoryItem invItem = resolveOrCreateInventoryItemForQuoteItem(req.getGarage(), qItem, actor);
            if (invItem == null) continue;

            int qty = qItem.getQuantity() != null && qItem.getQuantity() > 0 ? qItem.getQuantity() : 1;
            int currentOnHand = invItem.getOnHandQty() != null ? invItem.getOnHandQty() : 0;
            int currentReserved = invItem.getReservedQty() != null ? invItem.getReservedQty() : 0;

            if (qItem.getInventoryStatus() == QuoteItemInventoryStatus.RESERVED) {
                invItem.setReservedQty(Math.max(0, currentReserved - qty));
            }

            int newOnHand = Math.max(0, currentOnHand - qty);
            invItem.setOnHandQty(newOnHand);
            inventoryItemRepository.save(invItem);

            qItem.setInventoryItem(invItem);
            qItem.setInventoryStatus(QuoteItemInventoryStatus.DEDUCTED);
            rescueRequestItemRepository.save(qItem);

            User performer = req.getStaff() != null && req.getStaff().getUser() != null
                    ? req.getStaff().getUser()
                    : (actor != null ? actor : req.getGarage().getOwner());

            InventoryTransaction tx = new InventoryTransaction();
            tx.setGarage(req.getGarage());
            tx.setInventoryItem(invItem);
            tx.setTxType(InventoryTxType.OUTBOUND_ORDER);
            tx.setQuantityChange(-qty);
            tx.setOnHandAfter(newOnHand);
            tx.setUnitCostSnapshot(invItem.getCostPrice());
            tx.setUnitPriceSnapshot(qItem.getUnitPriceSnapshot());
            tx.setRescueRequest(req);
            tx.setPerformedByUser(performer);
            tx.setNote("Xuất kho " + qty + " " + invItem.getUnitLabel() + " cho đơn cứu hộ #" + req.getCode());
            inventoryTransactionRepository.save(tx);

            notifyLowStockIfApplicable(invItem, req);
        }
    }

    @Override
    @Transactional
    public void deductStockImmediatelyForApprovedItem(RescueRequest req, RescueRequestItem qItem, User actor) {
        if (req == null || req.getGarage() == null || qItem == null) return;
        // Khi đơn đang sửa chữa / chờ thanh toán, tạm giữ tồn kho (RESERVED) cho hạng mục phát sinh, và sẽ chốt trừ kho khi hoàn tất đơn
        reserveStockForQuoteItems(req.getGarage(), req, List.of(qItem), actor);
    }

    @Override
    @Transactional
    public void releaseOrReturnStockForOrder(RescueRequest req, User actor, String reason) {
        if (req == null || req.getGarage() == null) return;

        List<RescueRequestItem> items = rescueRequestItemRepository.findByRequestOrderByIdAsc(req);
        if (items == null || items.isEmpty()) return;

        for (RescueRequestItem qItem : items) {
            QuoteItemInventoryStatus st = qItem.getInventoryStatus();
            if (st == null || st == QuoteItemInventoryStatus.NONE || st == QuoteItemInventoryStatus.RELEASED) {
                continue;
            }

            GarageInventoryItem invRef = qItem.getInventoryItem();
            if (invRef == null && qItem.getService() != null) {
                invRef = inventoryItemRepository
                        .findFirstByGarageIdAndServiceIdAndIsDeletedFalse(req.getGarage().getId(), qItem.getService().getId())
                        .orElse(null);
            }
            if (invRef == null) continue;

            GarageInventoryItem invItem = inventoryItemRepository.findByIdForUpdate(invRef.getId()).orElse(null);
            if (invItem == null) continue;

            int qty = qItem.getQuantity() != null && qItem.getQuantity() > 0 ? qItem.getQuantity() : 1;

            if (st == QuoteItemInventoryStatus.RESERVED) {
                int currentReserved = invItem.getReservedQty() != null ? invItem.getReservedQty() : 0;
                invItem.setReservedQty(Math.max(0, currentReserved - qty));
                inventoryItemRepository.save(invItem);
            } else if (st == QuoteItemInventoryStatus.DEDUCTED) {
                int currentOnHand = invItem.getOnHandQty() != null ? invItem.getOnHandQty() : 0;
                int newOnHand = currentOnHand + qty;
                invItem.setOnHandQty(newOnHand);
                inventoryItemRepository.save(invItem);

                InventoryTransaction returnTx = new InventoryTransaction();
                returnTx.setGarage(req.getGarage());
                returnTx.setInventoryItem(invItem);
                returnTx.setTxType(InventoryTxType.RETURN_ORDER);
                returnTx.setQuantityChange(qty);
                returnTx.setOnHandAfter(newOnHand);
                returnTx.setUnitCostSnapshot(invItem.getCostPrice());
                returnTx.setUnitPriceSnapshot(qItem.getUnitPriceSnapshot());
                returnTx.setRescueRequest(req);
                returnTx.setPerformedByUser(actor != null ? actor : req.getGarage().getOwner());
                returnTx.setNote("Hoàn nhập kho tự động +" + qty + " " + invItem.getUnitLabel()
                        + " từ đơn #" + req.getCode() + (StringUtils.hasText(reason) ? " (" + reason + ")" : ""));
                inventoryTransactionRepository.save(returnTx);
            }

            qItem.setInventoryStatus(QuoteItemInventoryStatus.RELEASED);
            rescueRequestItemRepository.save(qItem);
        }
    }

    // ────────────────────────── HELPERS ──────────────────────────

    private void notifyLowStockIfApplicable(GarageInventoryItem invItem, RescueRequest req) {
        try {
            int available = invItem.getAvailableQty();
            int minStock = invItem.getMinStockQty() != null ? invItem.getMinStockQty() : 3;
            if (invItem.getGarage() != null && invItem.getGarage().getOwner() != null) {
                if (available <= 0) {
                    notificationService.createNotification(
                            invItem.getGarage().getOwner(),
                            NotificationType.SYSTEM_WARNING,
                            "Cảnh báo đã hết phụ tùng trong kho: " + invItem.getName(),
                            "Mặt hàng '" + invItem.getName() + "' sau khi xuất cho đơn #"
                                    + req.getCode() + " đã hết hàng (tồn khả dụng: 0 " + invItem.getUnitLabel()
                                    + "). Để tránh gián đoạn việc cứu hộ, hãy nhập thêm hàng ngay!",
                            "INVENTORY",
                            invItem.getId()
                    );
                } else if (available <= minStock) {
                    notificationService.createNotification(
                            invItem.getGarage().getOwner(),
                            NotificationType.SYSTEM_WARNING,
                            "Cảnh báo sắp hết phụ tùng trong kho: " + invItem.getName(),
                            "Mặt hàng '" + invItem.getName() + "' sau khi xuất cho đơn #"
                                    + req.getCode() + " sắp hết (hiện chỉ còn " + available + " " + invItem.getUnitLabel()
                                    + ", định mức tối thiểu: " + minStock + " " + invItem.getUnitLabel()
                                    + "). Vui lòng kiểm tra và nhập thêm hàng.",
                            "INVENTORY",
                            invItem.getId()
                    );
                }
            }
        } catch (Exception e) {
            log.debug("Không thể gửi thông báo cảnh báo tồn kho thấp: {}", e.getMessage());
        }
    }

    private void syncSellingPriceToGarageMenu(Garage garage, Service service, long sellingPrice) {
        try {
            GarageServicePrice gp = garageServicePriceRepository.findByGarageAndService(garage, service)
                    .orElseGet(() -> {
                        GarageServicePrice p = new GarageServicePrice();
                        p.setGarage(garage);
                        p.setService(service);
                        p.setIsActive(true);
                        return p;
                    });
            gp.setPrice(sellingPrice);
            if (gp.getIsActive() == null) {
                gp.setIsActive(true);
            }
            garageServicePriceRepository.save(gp);
        } catch (Exception e) {
            log.debug("Không thể đồng bộ giá bán sang garage_service_prices: {}", e.getMessage());
        }
    }

    private Garage resolveActorGarage(User actor) {
        if (actor == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để truy cập kho Gara");
        }
        if (actor.getRole() == UserRole.GARAGE_OWNER) {
            return garageRepository.findByOwner(actor)
                    .orElseThrow(() -> new BadRequestException("Bạn chưa đăng ký sở hữu Gara nào"));
        }
        if (actor.getRole() == UserRole.GARAGE_STAFF) {
            GarageStaff gs = garageStaffRepository.findByUserAndIsDeletedFalse(actor)
                    .orElseThrow(() -> new BadRequestException("Tài khoản nhân viên chưa trực thuộc Gara nào"));
            return gs.getGarage();
        }
        throw new UnauthorizedException("Tài khoản không có quyền truy cập kho Gara");
    }

    private void assertCanManageGarageInventory(User actor, Garage garage) {
        if (actor.getRole() == UserRole.ADMIN) return;
        Garage actorGarage = resolveActorGarage(actor);
        if (!actorGarage.getId().equals(garage.getId())) {
            throw new UnauthorizedException("Bạn không có quyền thao tác trên kho của Gara khác");
        }
    }

    private GarageInventoryOverviewResponse buildOverviewResponse(
            List<Garage> garages,
            List<GarageInventoryItem> items,
            List<InventoryTransaction> transactions
    ) {
        int totalSkuCount = items.size();
        int totalOnHand = 0;
        int totalReserved = 0;
        int totalAvailable = 0;
        int lowStockCount = 0;
        int outOfStockCount = 0;
        long totalCostValue = 0L;
        long totalRetailValue = 0L;

        Map<Long, List<GarageInventoryItem>> itemsByGarage = new HashMap<>();
        List<GarageInventoryOverviewResponse.InventoryItemDto> itemDtos = new ArrayList<>();

        for (GarageInventoryItem gi : items) {
            boolean isPart = isPhysicalPart(gi.getService(), gi.getName());
            int onHand = gi.getOnHandQty() != null ? gi.getOnHandQty() : 0;
            int reserved = gi.getReservedQty() != null ? gi.getReservedQty() : 0;
            int available = gi.getAvailableQty();
            int minStock = gi.getMinStockQty() != null ? gi.getMinStockQty() : 3;
            long cost = gi.getCostPrice() != null ? gi.getCostPrice() : 0L;
            long retail = gi.getSellingPrice() != null ? gi.getSellingPrice() : 0L;

            if (isPart) {
                totalOnHand += onHand;
                totalReserved += reserved;
                totalAvailable += available;
                totalCostValue += (long) onHand * cost;
                totalRetailValue += (long) onHand * retail;

                if (available <= 0) {
                    outOfStockCount++;
                } else if (available <= minStock) {
                    lowStockCount++;
                }
            }

            if (gi.getGarage() != null && gi.getGarage().getId() != null) {
                itemsByGarage.computeIfAbsent(gi.getGarage().getId(), k -> new ArrayList<>()).add(gi);
            }
            itemDtos.add(toItemDto(gi));
        }

        List<GarageInventoryOverviewResponse.GarageStockSummaryItem> garageSummaries = new ArrayList<>();
        for (Garage g : garages) {
            List<GarageInventoryItem> gItems = itemsByGarage.getOrDefault(g.getId(), List.of());
            int gOnHand = 0;
            int gReserved = 0;
            int gLow = 0;
            int gOut = 0;
            long gValue = 0L;

            for (GarageInventoryItem gi : gItems) {
                boolean isPart = isPhysicalPart(gi.getService(), gi.getName());
                if (!isPart) continue;

                int onHand = gi.getOnHandQty() != null ? gi.getOnHandQty() : 0;
                int reserved = gi.getReservedQty() != null ? gi.getReservedQty() : 0;
                int available = gi.getAvailableQty();
                int minStock = gi.getMinStockQty() != null ? gi.getMinStockQty() : 3;
                gOnHand += onHand;
                gReserved += reserved;
                gValue += (long) onHand * (gi.getCostPrice() != null ? gi.getCostPrice() : 0L);
                if (available <= 0) gOut++;
                else if (available <= minStock) gLow++;
            }

            garageSummaries.add(GarageInventoryOverviewResponse.GarageStockSummaryItem.builder()
                    .garageId(g.getId())
                    .garageName(g.getName())
                    .garageAddress(g.getAddress())
                    .garagePhone(StringUtils.hasText(g.getPhone()) ? g.getPhone()
                            : (g.getOwner() != null ? g.getOwner().getPhone() : ""))
                    .isOnline(Boolean.TRUE.equals(g.getIsOnline()))
                    .totalSkus(gItems.size())
                    .totalOnHandUnits(gOnHand)
                    .totalReservedUnits(gReserved)
                    .lowStockSkus(gLow)
                    .outOfStockSkus(gOut)
                    .totalCostValue(gValue)
                    .build());
        }

        List<GarageInventoryOverviewResponse.InventoryTransactionDto> txDtos = transactions.stream()
                .limit(150)
                .map(this::toTxDto)
                .toList();

        return GarageInventoryOverviewResponse.builder()
                .summary(GarageInventoryOverviewResponse.SummaryStats.builder()
                        .totalGaragesWithInventory(garages.size())
                        .totalSkuCount(totalSkuCount)
                        .totalOnHandUnits(totalOnHand)
                        .totalReservedUnits(totalReserved)
                        .totalAvailableUnits(totalAvailable)
                        .lowStockCount(lowStockCount)
                        .outOfStockCount(outOfStockCount)
                        .totalInventoryCostValue(totalCostValue)
                        .totalInventoryRetailValue(totalRetailValue)
                        .build())
                .garageSummaries(garageSummaries)
                .items(itemDtos)
                .recentTransactions(txDtos)
                .build();
    }

    private GarageInventoryOverviewResponse.InventoryItemDto toItemDto(GarageInventoryItem gi) {
        Service svc = gi.getService();
        boolean isPart = isPhysicalPart(svc, gi.getName());
        String itemType = isPart ? "PART" : "LABOR";
        int available = gi.getAvailableQty();
        int minStock = gi.getMinStockQty() != null ? gi.getMinStockQty() : 3;
        // Dịch vụ công thợ thuần túy (LABOR) không bao giờ bị báo hết hàng hay sắp hết hàng
        String status = !isPart ? "OK" : (available <= 0 ? "OUT_OF_STOCK" : (available <= minStock ? "LOW_STOCK" : "OK"));

        return GarageInventoryOverviewResponse.InventoryItemDto.builder()
                .id(gi.getId())
                .garageId(gi.getGarage() != null ? gi.getGarage().getId() : null)
                .garageName(gi.getGarage() != null ? gi.getGarage().getName() : null)
                .serviceId(svc != null ? svc.getId() : null)
                .serviceCode(svc != null ? svc.getCode() : null)
                .serviceName(svc != null ? svc.getName() : null)
                .minAllowedPrice(svc != null ? svc.getMinPrice() : null)
                .maxAllowedPrice(svc != null ? svc.getMaxPrice() : null)
                .skuCode(gi.getSkuCode())
                .name(gi.getName())
                .itemType(itemType)
                .categoryName(gi.getCategoryName())
                .vehicleType(gi.getVehicleType() != null ? gi.getVehicleType().name() : "BOTH")
                .unitLabel(gi.getUnitLabel())
                .onHandQty(gi.getOnHandQty() != null ? gi.getOnHandQty() : 0)
                .reservedQty(gi.getReservedQty() != null ? gi.getReservedQty() : 0)
                .availableQty(available)
                .minStockQty(minStock)
                .costPrice(gi.getCostPrice() != null ? gi.getCostPrice() : 0L)
                .sellingPrice(gi.getSellingPrice() != null ? gi.getSellingPrice() : 0L)
                .supplierName(gi.getSupplierName())
                .isActive(gi.getIsActive())
                .stockStatus(status)
                .updatedAt(gi.getUpdatedAt() != null ? gi.getUpdatedAt() : gi.getCreatedAt())
                .build();
    }

    private GarageInventoryOverviewResponse.InventoryTransactionDto toTxDto(InventoryTransaction tx) {
        GarageInventoryItem item = tx.getInventoryItem();
        RescueRequest req = tx.getRescueRequest();
        User u = tx.getPerformedByUser();

        return GarageInventoryOverviewResponse.InventoryTransactionDto.builder()
                .id(tx.getId())
                .garageId(tx.getGarage() != null ? tx.getGarage().getId() : null)
                .garageName(tx.getGarage() != null ? tx.getGarage().getName() : null)
                .inventoryItemId(item != null ? item.getId() : null)
                .skuCode(item != null ? item.getSkuCode() : null)
                .itemName(item != null ? item.getName() : null)
                .unitLabel(item != null ? item.getUnitLabel() : "Cái")
                .txType(tx.getTxType() != null ? tx.getTxType().name() : "INBOUND")
                .quantityChange(tx.getQuantityChange())
                .onHandAfter(tx.getOnHandAfter())
                .unitCostSnapshot(tx.getUnitCostSnapshot())
                .unitPriceSnapshot(tx.getUnitPriceSnapshot())
                .rescueRequestId(req != null ? req.getId() : null)
                .rescueRequestCode(req != null ? req.getCode() : null)
                .performedByName(u != null ? u.getFullName() : "Hệ thống")
                .performedByRole(u != null && u.getRole() != null ? u.getRole().name() : "SYSTEM")
                .note(tx.getNote())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
