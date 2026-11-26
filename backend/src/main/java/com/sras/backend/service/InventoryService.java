package com.sras.backend.service;

import com.sras.backend.dto.request.InventoryItemUpsertRequest;
import com.sras.backend.dto.request.InventoryStockAdjustRequest;
import com.sras.backend.dto.response.GarageInventoryOverviewResponse;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.RescueRequestItem;
import com.sras.backend.entity.Service;
import com.sras.backend.entity.User;

import java.util.List;

public interface InventoryService {

    /** Kiểm tra xem một dịch vụ có phải là Phụ tùng / Vật tư cần quản lý tồn kho hay không. */
    boolean isPartService(Service service);

    /** Xác định đơn vị tính vật tư hiển thị cho một Service. */
    String resolveUnitLabel(Service service);

    /** Khởi tạo tự động kho phụ tùng tiêu chuẩn cho Gara nếu Gara chưa có dữ liệu kho. */
    void ensureGarageInventoryInitialized(Garage garage, User actor);

    /** Admin: Lấy tổng quan kho của toàn bộ Gara (hoặc lọc theo 1 Gara cụ thể). */
    GarageInventoryOverviewResponse getAdminInventoryOverview(Long garageId, User admin);

    /** Chủ Gara / Nhân viên Gara: Lấy tổng quan kho của Gara mình đang làm việc. */
    GarageInventoryOverviewResponse getMyGarageInventoryOverview(User actor);

    /** Tạo mới hoặc cập nhật thông tin mặt hàng phụ tùng trong kho Gara. */
    GarageInventoryOverviewResponse.InventoryItemDto upsertInventoryItem(
            Long itemId,
            InventoryItemUpsertRequest request,
            User actor
    );

    /** Thực hiện Nhập kho (INBOUND), Kiểm kê điều chỉnh (ADJUSTMENT), hoặc Xuất hủy hỏng (DAMAGED). */
    GarageInventoryOverviewResponse.InventoryItemDto adjustInventoryStock(
            Long itemId,
            InventoryStockAdjustRequest request,
            User actor
    );

    /** Đồng bộ toàn bộ danh mục phụ tùng chuẩn của Sàn vào kho của Gara. */
    GarageInventoryOverviewResponse syncStandardCatalogToGarage(Long garageId, User actor);

    /** Admin gửi thông báo cảnh báo / nhắc nhở tồn kho trực tiếp tới Chủ Gara. */
    void sendInventoryWarningToGarage(Long itemId, String title, String message, User admin);

    // ────────────── TÍCH HỢP VÒNG ĐỜI ĐƠN CỨU HỘ (2-PHASE RESERVATION & LEDGER) ──────────────

    /**
     * Pha 1: Tạm giữ tồn kho (reserved_qty += quantity) khi Thợ gửi báo giá (submitQuote).
     * Bắt buộc kiểm tra available_qty >= quantity với Pessimistic Write Lock để chống âm kho.
     */
    void reserveStockForQuoteItems(Garage garage, RescueRequest req, List<RescueRequestItem> items, User actor);

    /**
     * Pha 2: Chốt xuất kho chính thức (on_hand_qty -= quantity, reserved_qty -= quantity)
     * và ghi sổ cái InventoryTransaction (OUTBOUND_ORDER) khi Khách duyệt báo giá.
     */
    void commitReservedStockForOrder(RescueRequest req, User actor);

    /**
     * Xuất kho trực tiếp cho hạng mục phụ tùng bổ sung đã được duyệt ngay (addRepairItem).
     */
    void deductStockImmediatelyForApprovedItem(RescueRequest req, RescueRequestItem item, User actor);

    /**
     * Tự động Giải phóng tạm giữ (nếu đang RESERVED) hoặc Hoàn nhập kho (nếu đã DEDUCTED)
     * khi Khách từ chối báo giá, Thợ gửi lại báo giá mới, hoặc Đơn bị hủy.
     */
    void releaseOrReturnStockForOrder(RescueRequest req, User actor, String reason);
}
