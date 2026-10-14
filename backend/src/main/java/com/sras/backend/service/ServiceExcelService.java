package com.sras.backend.service;

import com.sras.backend.dto.response.ServiceImportResponse;
import org.springframework.web.multipart.MultipartFile;

public interface ServiceExcelService {
    /**
     * Tạo file Excel mẫu (.xlsx) chuẩn cấu trúc để người dùng tải về nhập dữ liệu.
     */
    byte[] generateTemplate();

    /**
     * Nhập dữ liệu dịch vụ hàng loạt từ file Excel.
     * Thực hiện kiểm tra schema (cấu trúc header, cột bắt buộc) trước, nếu sai lập tức dừng lại.
     * Sau đó duyệt từng dòng, bỏ qua các dòng lỗi/trùng và tiếp tục nhập các dòng hợp lệ.
     */
    ServiceImportResponse importServicesFromExcel(MultipartFile file);

    /**
     * Xuất danh sách dịch vụ và bảng giá hiện có trong cơ sở dữ liệu ra file Excel (.xlsx).
     * @param categoryId Bộ lọc danh mục (null nếu xuất tất cả)
     */
    byte[] exportServicesToExcel(Long categoryId);
}
