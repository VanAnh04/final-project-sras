package com.sras.backend.service.impl;

import com.sras.backend.dto.response.ServiceImportResponse;
import com.sras.backend.entity.Service;
import com.sras.backend.entity.ServiceCategory;
import com.sras.backend.entity.enums.FeeType;
import com.sras.backend.entity.enums.ServiceUnit;
import com.sras.backend.exception.ExcelSchemaValidationException;
import com.sras.backend.repository.ServiceCategoryRepository;
import com.sras.backend.repository.ServiceRepository;
import com.sras.backend.service.ServiceExcelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.DataValidation;
import org.apache.poi.ss.usermodel.DataValidationConstraint;
import org.apache.poi.ss.usermodel.DataValidationHelper;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Name;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.Normalizer;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

@Slf4j
@org.springframework.stereotype.Service
@RequiredArgsConstructor
public class ServiceExcelServiceImpl implements ServiceExcelService {

    private final ServiceRepository serviceRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;

    // Chuẩn 8 cột nghiệp vụ (Đã bỏ cột Ghi chú theo yêu cầu người dùng)
    private static final String[] TEMPLATE_HEADERS = {
            "STT",
            "Danh mục dịch vụ (*)",
            "Tên dịch vụ (*)",
            "Mã dịch vụ (*)",
            "Loại phí (*)",
            "Đơn vị tính (*)",
            "Giá tối thiểu (VNĐ) (*)",
            "Giá tối đa (VNĐ) (*)"
    };

    @Override
    @Transactional(readOnly = true)
    public byte[] generateTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // Style Header
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setFontHeightInPoints((short) 11);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.ORANGE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(headerStyle);

            // Style Data
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(dataStyle);

            // Style Currency
            CellStyle currencyStyle = workbook.createCellStyle();
            DataFormat format = workbook.createDataFormat();
            currencyStyle.setDataFormat(format.getFormat("#,##0"));
            currencyStyle.setAlignment(HorizontalAlignment.RIGHT);
            currencyStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(currencyStyle);

            // Style Center (STT, Code, Unit)
            CellStyle centerStyle = workbook.createCellStyle();
            centerStyle.setAlignment(HorizontalAlignment.CENTER);
            centerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(centerStyle);

            // ================= Sheet 1: Danh sách dịch vụ mẫu =================
            Sheet sheet = workbook.createSheet("Menu Dịch Vụ");
            sheet.setDisplayGridlines(true);

            // Tạo Header Row
            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(28);
            for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(TEMPLATE_HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }

            // Lấy danh sách danh mục thực tế từ Database
            List<ServiceCategory> currentCategories = serviceCategoryRepository.findAllByOrderByDisplayOrderAsc();

            String catLabel1 = !currentCategories.isEmpty()
                    ? currentCategories.get(0).getName() + " (" + currentCategories.get(0).getCode() + ")"
                    : "Cứu hộ khẩn cấp (CAT_RESCUE)";
            String catLabel2 = currentCategories.size() > 1
                    ? currentCategories.get(1).getName() + " (" + currentCategories.get(1).getCode() + ")"
                    : catLabel1;

            // Dữ liệu mẫu (3 dòng chuẩn, không còn cột Ghi chú)
            Object[][] sampleData = {
                    {1, catLabel1, "Vá lốp ô tô lưu động", "TIRE_REPAIR_CAR", "SERVICE_FEE", "LAN", 100000L, 500000L},
                    {2, catLabel1, "Kích bình ắc quy xe máy", "JUMP_START_MOTO", "SERVICE_FEE", "LAN", 50000L, 150000L},
                    {3, catLabel2, "Kéo xe ô tô 4-7 chỗ", "TOWING_CAR_4_SEAT", "TOWING_FEE", "KM", 20000L, 35000L}
            };

            for (int r = 0; r < sampleData.length; r++) {
                Row row = sheet.createRow(r + 1);
                row.setHeightInPoints(22);
                Object[] rowData = sampleData[r];

                for (int c = 0; c < rowData.length; c++) {
                    Cell cell = row.createCell(c);
                    Object val = rowData[c];
                    if (val instanceof Number) {
                        cell.setCellValue(((Number) val).doubleValue());
                        if (c == 0) {
                            cell.setCellStyle(centerStyle);
                        } else {
                            cell.setCellStyle(currencyStyle);
                        }
                    } else {
                        cell.setCellValue(val != null ? val.toString() : "");
                        if (c == 0 || c == 3 || c == 4 || c == 5) {
                            cell.setCellStyle(centerStyle);
                        } else {
                            cell.setCellStyle(dataStyle);
                        }
                    }
                }
            }

            // Set column widths chuẩn đẹp
            sheet.setColumnWidth(0, 8 * 256);   // STT
            sheet.setColumnWidth(1, 40 * 256);  // Danh mục dịch vụ (*)
            sheet.setColumnWidth(2, 32 * 256);  // Tên dịch vụ (*)
            sheet.setColumnWidth(3, 24 * 256);  // Mã dịch vụ (*)
            sheet.setColumnWidth(4, 18 * 256);  // Loại phí (*)
            sheet.setColumnWidth(5, 16 * 256);  // Đơn vị tính (*)
            sheet.setColumnWidth(6, 24 * 256);  // Giá tối thiểu (*)
            sheet.setColumnWidth(7, 24 * 256);  // Giá tối đa (*)

            // ================= Sheet 2: Danh mục & Quy tắc giá trị =================
            Sheet guideSheet = workbook.createSheet("HuongDan_DanhMuc");
            guideSheet.setDisplayGridlines(true);

            CellStyle subHeaderStyle = workbook.createCellStyle();
            Font subHeaderFont = workbook.createFont();
            subHeaderFont.setBold(true);
            subHeaderFont.setColor(IndexedColors.WHITE.getIndex());
            subHeaderStyle.setFont(subHeaderFont);
            subHeaderStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            subHeaderStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            subHeaderStyle.setAlignment(HorizontalAlignment.LEFT);
            setBorder(subHeaderStyle);

            CellStyle guideHeaderStyle = workbook.createCellStyle();
            Font guideHeaderFont = workbook.createFont();
            guideHeaderFont.setBold(true);
            guideHeaderStyle.setFont(guideHeaderFont);
            guideHeaderStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            guideHeaderStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            guideHeaderStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(guideHeaderStyle);

            CellStyle guideCellStyle = workbook.createCellStyle();
            guideCellStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(guideCellStyle);

            int guideRowIdx = 0;

            // Bảng 1: Danh sách Danh mục trong hệ thống
            Row guideTitle1 = guideSheet.createRow(guideRowIdx++);
            Cell t1 = guideTitle1.createCell(0);
            t1.setCellValue("1. DANH SÁCH DANH MỤC DỊCH VỤ (Có thể chọn trực tiếp từ ô dropdown)");
            t1.setCellStyle(subHeaderStyle);

            Row catHeader = guideSheet.createRow(guideRowIdx++);
            Cell ch0 = catHeader.createCell(0); ch0.setCellValue("Tên Danh Mục Kèm Mã (Dạng chọn Dropdown)"); ch0.setCellStyle(guideHeaderStyle);
            Cell ch1 = catHeader.createCell(1); ch1.setCellValue("Mã danh mục (Code)"); ch1.setCellStyle(guideHeaderStyle);
            Cell ch2 = catHeader.createCell(2); ch2.setCellValue("Tên danh mục"); ch2.setCellStyle(guideHeaderStyle);
            Cell ch3 = catHeader.createCell(3); ch3.setCellValue("Phương tiện áp dụng"); ch3.setCellStyle(guideHeaderStyle);

            int catStartRow = guideRowIdx + 1; // 1-based
            if (currentCategories.isEmpty()) {
                Row r = guideSheet.createRow(guideRowIdx++);
                r.createCell(0).setCellValue("Cứu hộ khẩn cấp (CAT_RESCUE)"); r.getCell(0).setCellStyle(guideCellStyle);
                r.createCell(1).setCellValue("CAT_RESCUE"); r.getCell(1).setCellStyle(guideCellStyle);
                r.createCell(2).setCellValue("Cứu hộ khẩn cấp"); r.getCell(2).setCellStyle(guideCellStyle);
                r.createCell(3).setCellValue("BOTH"); r.getCell(3).setCellStyle(guideCellStyle);
            } else {
                for (ServiceCategory cat : currentCategories) {
                    Row r = guideSheet.createRow(guideRowIdx++);
                    String label = cat.getName() + " (" + cat.getCode() + ")";
                    r.createCell(0).setCellValue(label); r.getCell(0).setCellStyle(guideCellStyle);
                    r.createCell(1).setCellValue(cat.getCode()); r.getCell(1).setCellStyle(guideCellStyle);
                    r.createCell(2).setCellValue(cat.getName()); r.getCell(2).setCellStyle(guideCellStyle);
                    r.createCell(3).setCellValue(cat.getVehicleType() != null ? cat.getVehicleType().name() : "BOTH"); r.getCell(3).setCellStyle(guideCellStyle);
                }
            }
            int catEndRow = guideRowIdx; // 1-based

            guideRowIdx++; // Khoảng trống

            // Bảng 2: Quy ước Loại phí
            Row guideTitle2 = guideSheet.createRow(guideRowIdx++);
            Cell t2 = guideTitle2.createCell(0);
            t2.setCellValue("2. QUY ƯỚC LOẠI PHÍ (Cột 'Loại phí (*)')");
            t2.setCellStyle(subHeaderStyle);

            Row feeHeader = guideSheet.createRow(guideRowIdx++);
            Cell fh0 = feeHeader.createCell(0); fh0.setCellValue("Mã loại phí (Giá trị chọn)"); fh0.setCellStyle(guideHeaderStyle);
            Cell fh1 = feeHeader.createCell(1); fh1.setCellValue("Giải thích ý nghĩa"); fh1.setCellStyle(guideHeaderStyle);

            String[][] feeRules = {
                    {"SERVICE_FEE", "Phí dịch vụ sửa chữa tại chỗ"},
                    {"RESCUE_FEE", "Phí cứu hộ khẩn cấp"},
                    {"TOWING_FEE", "Phí kéo xe cứu hộ"}
            };
            for (String[] fr : feeRules) {
                Row r = guideSheet.createRow(guideRowIdx++);
                Cell c0 = r.createCell(0); c0.setCellValue(fr[0]); c0.setCellStyle(guideCellStyle);
                Cell c1 = r.createCell(1); c1.setCellValue(fr[1]); c1.setCellStyle(guideCellStyle);
            }

            guideRowIdx++; // Khoảng trống

            // Bảng 3: Quy ước Đơn vị tính
            Row guideTitle3 = guideSheet.createRow(guideRowIdx++);
            Cell t3 = guideTitle3.createCell(0);
            t3.setCellValue("3. QUY ƯỚC ĐƠN VỊ TÍNH (Cột 'Đơn vị tính (*)')");
            t3.setCellStyle(subHeaderStyle);

            Row unitHeader = guideSheet.createRow(guideRowIdx++);
            Cell uh0 = unitHeader.createCell(0); uh0.setCellValue("Mã đơn vị (Giá trị chọn)"); uh0.setCellStyle(guideHeaderStyle);
            Cell uh1 = unitHeader.createCell(1); uh1.setCellValue("Giải thích ý nghĩa"); uh1.setCellStyle(guideHeaderStyle);

            String[][] unitRules = {
                    {"LAN", "Tính theo Lần / Lượt (hoặc gõ 'Lần')"},
                    {"KM", "Tính theo Kilomet (hoặc gõ 'Km')"}
            };
            for (String[] ur : unitRules) {
                Row r = guideSheet.createRow(guideRowIdx++);
                Cell c0 = r.createCell(0); c0.setCellValue(ur[0]); c0.setCellStyle(guideCellStyle);
                Cell c1 = r.createCell(1); c1.setCellValue(ur[1]); c1.setCellStyle(guideCellStyle);
            }

            guideSheet.setColumnWidth(0, 42 * 256);
            guideSheet.setColumnWidth(1, 24 * 256);
            guideSheet.setColumnWidth(2, 32 * 256);
            guideSheet.setColumnWidth(3, 24 * 256);

            // ================= CÀI ĐẶT DROPDOWN (DATA VALIDATION) CHO SHEET 1 =================
            DataValidationHelper validationHelper = sheet.getDataValidationHelper();

            // 1. Dropdown Danh mục dịch vụ (Cột B, index 1)
            try {
                Name namedRange = workbook.createName();
                namedRange.setNameName("CategoryOptions");
                namedRange.setRefersToFormula("HuongDan_DanhMuc!$A$" + catStartRow + ":$A$" + catEndRow);

                DataValidationConstraint catConstraint = validationHelper.createFormulaListConstraint("CategoryOptions");
                CellRangeAddressList catAddressList = new CellRangeAddressList(1, 1000, 1, 1);
                DataValidation catValidation = validationHelper.createValidation(catConstraint, catAddressList);
                catValidation.setShowErrorBox(false); // Cho phép người dùng nhập tự do nếu muốn
                sheet.addValidationData(catValidation);
            } catch (Exception ex) {
                log.warn("Không thể tạo DataValidation cho Category: {}", ex.getMessage());
            }

            // 2. Dropdown Loại phí (Cột E, index 4)
            DataValidationConstraint feeConstraint = validationHelper.createExplicitListConstraint(
                    new String[]{"SERVICE_FEE", "RESCUE_FEE", "TOWING_FEE"}
            );
            CellRangeAddressList feeAddressList = new CellRangeAddressList(1, 1000, 4, 4);
            DataValidation feeValidation = validationHelper.createValidation(feeConstraint, feeAddressList);
            feeValidation.setShowErrorBox(false);
            sheet.addValidationData(feeValidation);

            // 3. Dropdown Đơn vị tính (Cột F, index 5)
            DataValidationConstraint unitConstraint = validationHelper.createExplicitListConstraint(
                    new String[]{"LAN", "KM"}
            );
            CellRangeAddressList unitAddressList = new CellRangeAddressList(1, 1000, 5, 5);
            DataValidation unitValidation = validationHelper.createValidation(unitConstraint, unitAddressList);
            unitValidation.setShowErrorBox(false);
            sheet.addValidationData(unitValidation);

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Lỗi khi tạo file Excel mẫu:", e);
            throw new RuntimeException("Không thể tạo file Excel mẫu: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportServicesToExcel(Long categoryId) {
        List<Service> services = (categoryId != null)
                ? serviceRepository.findByCategoryId(categoryId)
                : serviceRepository.findAll();

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // Style Header
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setFontHeightInPoints((short) 11);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(headerStyle);

            // Style Data
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(dataStyle);

            // Style Center (STT, Code, Unit)
            CellStyle centerStyle = workbook.createCellStyle();
            centerStyle.setAlignment(HorizontalAlignment.CENTER);
            centerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(centerStyle);

            // Style Currency
            CellStyle currencyStyle = workbook.createCellStyle();
            DataFormat format = workbook.createDataFormat();
            currencyStyle.setDataFormat(format.getFormat("#,##0"));
            currencyStyle.setAlignment(HorizontalAlignment.RIGHT);
            currencyStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(currencyStyle);

            // Style Status Active
            CellStyle activeStyle = workbook.createCellStyle();
            Font activeFont = workbook.createFont();
            activeFont.setBold(true);
            activeFont.setColor(IndexedColors.GREEN.getIndex());
            activeStyle.setFont(activeFont);
            activeStyle.setAlignment(HorizontalAlignment.CENTER);
            activeStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(activeStyle);

            // Style Status Inactive
            CellStyle inactiveStyle = workbook.createCellStyle();
            Font inactiveFont = workbook.createFont();
            inactiveFont.setColor(IndexedColors.RED.getIndex());
            inactiveStyle.setFont(inactiveFont);
            inactiveStyle.setAlignment(HorizontalAlignment.CENTER);
            inactiveStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(inactiveStyle);

            Sheet sheet = workbook.createSheet("Danh Sách Dịch Vụ");
            sheet.setDisplayGridlines(true);

            String[] exportHeaders = {
                    "STT",
                    "Danh mục dịch vụ",
                    "Tên dịch vụ",
                    "Mã dịch vụ",
                    "Loại phí",
                    "Đơn vị tính",
                    "Giá tối thiểu (VNĐ)",
                    "Giá tối đa (VNĐ)",
                    "Trạng thái"
            };

            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(28);
            for (int i = 0; i < exportHeaders.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(exportHeaders[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (Service s : services) {
                Row row = sheet.createRow(rowIdx);
                row.setHeightInPoints(22);

                // 0: STT
                Cell c0 = row.createCell(0);
                c0.setCellValue(rowIdx);
                c0.setCellStyle(centerStyle);

                // 1: Danh mục dịch vụ
                Cell c1 = row.createCell(1);
                String catText = s.getCategory() != null
                        ? s.getCategory().getName() + " (" + s.getCategory().getCode() + ")"
                        : "N/A";
                c1.setCellValue(catText);
                c1.setCellStyle(dataStyle);

                // 2: Tên dịch vụ
                Cell c2 = row.createCell(2);
                c2.setCellValue(s.getName() != null ? s.getName() : "");
                c2.setCellStyle(dataStyle);

                // 3: Mã dịch vụ
                Cell c3 = row.createCell(3);
                c3.setCellValue(s.getCode() != null ? s.getCode() : "");
                c3.setCellStyle(centerStyle);

                // 4: Loại phí
                Cell c4 = row.createCell(4);
                c4.setCellValue(s.getFeeType() != null ? s.getFeeType().name() : "");
                c4.setCellStyle(centerStyle);

                // 5: Đơn vị tính
                Cell c5 = row.createCell(5);
                c5.setCellValue(s.getUnit() != null ? s.getUnit().name() : "");
                c5.setCellStyle(centerStyle);

                // 6: Giá tối thiểu
                Cell c6 = row.createCell(6);
                if (s.getMinPrice() != null) {
                    c6.setCellValue(s.getMinPrice().doubleValue());
                    c6.setCellStyle(currencyStyle);
                } else {
                    c6.setCellValue("");
                    c6.setCellStyle(dataStyle);
                }

                // 7: Giá tối đa
                Cell c7 = row.createCell(7);
                if (s.getMaxPrice() != null) {
                    c7.setCellValue(s.getMaxPrice().doubleValue());
                    c7.setCellStyle(currencyStyle);
                } else {
                    c7.setCellValue("");
                    c7.setCellStyle(dataStyle);
                }

                // 8: Trạng thái
                Cell c8 = row.createCell(8);
                boolean isActive = Boolean.TRUE.equals(s.getIsActive());
                c8.setCellValue(isActive ? "Đang hoạt động" : "Tạm ngưng");
                c8.setCellStyle(isActive ? activeStyle : inactiveStyle);

                rowIdx++;
            }

            sheet.setColumnWidth(0, 8 * 256);
            sheet.setColumnWidth(1, 40 * 256);
            sheet.setColumnWidth(2, 34 * 256);
            sheet.setColumnWidth(3, 24 * 256);
            sheet.setColumnWidth(4, 18 * 256);
            sheet.setColumnWidth(5, 16 * 256);
            sheet.setColumnWidth(6, 24 * 256);
            sheet.setColumnWidth(7, 24 * 256);
            sheet.setColumnWidth(8, 20 * 256);

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Lỗi khi xuất danh sách dịch vụ ra Excel:", e);
            throw new RuntimeException("Không thể xuất file Excel: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public ServiceImportResponse importServicesFromExcel(MultipartFile file) {
        // =====================================================================
        // BƯỚC 1: KIỂM TRA ĐỊNH DẠNG FILE
        // =====================================================================
        if (file == null || file.isEmpty()) {
            throw new ExcelSchemaValidationException("Vui lòng chọn file Excel để tải lên.");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.toLowerCase().endsWith(".xlsx") && !filename.toLowerCase().endsWith(".xls"))) {
            throw new ExcelSchemaValidationException("File tải lên không đúng định dạng. Chỉ chấp nhận file Excel (.xlsx hoặc .xls).");
        }

        // =====================================================================
        // BƯỚC 2: KIỂM TRA CẤU TRÚC FILE (VALIDATION SCHEMA)
        // Nếu sai tên cột, thiếu cột bắt buộc -> NGAY LẬP TỨC DỪNG VÀ KHÔNG LƯU GÌ
        // =====================================================================
        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            if (workbook.getNumberOfSheets() == 0) {
                throw new ExcelSchemaValidationException("File Excel không có bất kỳ sheet nào.");
            }

            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null || sheet.getPhysicalNumberOfRows() == 0) {
                throw new ExcelSchemaValidationException("File Excel hoàn toàn rỗng, không chứa dữ liệu.");
            }

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                throw new ExcelSchemaValidationException("Không tìm thấy dòng tiêu đề (Header row 1) trong file Excel.");
            }

            // Ánh xạ vị trí cột từ header
            Map<String, Integer> colIndexMap = mapHeaderColumns(headerRow);

            // Kiểm tra các cột bắt buộc
            List<String> missingCols = new ArrayList<>();
            if (!colIndexMap.containsKey("CATEGORY")) missingCols.add("Danh mục dịch vụ (*)");
            if (!colIndexMap.containsKey("SERVICE_NAME")) missingCols.add("Tên dịch vụ (*)");
            if (!colIndexMap.containsKey("SERVICE_CODE")) missingCols.add("Mã dịch vụ (*)");
            if (!colIndexMap.containsKey("FEE_TYPE")) missingCols.add("Loại phí (*)");
            if (!colIndexMap.containsKey("UNIT")) missingCols.add("Đơn vị tính (*)");
            if (!colIndexMap.containsKey("MIN_PRICE")) missingCols.add("Giá tối thiểu (VNĐ) (*)");
            if (!colIndexMap.containsKey("MAX_PRICE")) missingCols.add("Giá tối đa (VNĐ) (*)");

            if (!missingCols.isEmpty()) {
                throw new ExcelSchemaValidationException(
                        "Cấu trúc file không hợp lệ! Thiếu các cột bắt buộc: " + String.join(", ", missingCols) +
                        ". Vui lòng tải file mẫu chuẩn và giữ nguyên tiêu đề các cột. KHÔNG có dữ liệu nào được lưu."
                );
            }

            int lastRow = sheet.getLastRowNum();
            if (lastRow < 1) {
                throw new ExcelSchemaValidationException("File Excel chỉ có dòng tiêu đề, không chứa bất kỳ dòng dữ liệu nào.");
            }

            // =====================================================================
            // BƯỚC 3: XỬ LÝ TỪNG DÒNG DỮ LIỆU & BỎ QUA DÒNG LỖI/TRÙNG
            // =====================================================================
            int totalRows = 0;
            int successCount = 0;
            int failureCount = 0;
            List<ServiceImportResponse.RowError> errors = new ArrayList<>();
            Set<String> processedCodesInBatch = new HashSet<>();
            List<Service> servicesToSave = new ArrayList<>();

            int catCol = colIndexMap.get("CATEGORY");
            int nameCol = colIndexMap.get("SERVICE_NAME");
            int codeCol = colIndexMap.get("SERVICE_CODE");
            int feeTypeCol = colIndexMap.get("FEE_TYPE");
            int unitCol = colIndexMap.get("UNIT");
            int minPriceCol = colIndexMap.get("MIN_PRICE");
            int maxPriceCol = colIndexMap.get("MAX_PRICE");

            for (int r = 1; r <= lastRow; r++) {
                Row row = sheet.getRow(r);
                if (isRowEmpty(row)) {
                    continue; // Bỏ qua dòng trống hoàn toàn
                }

                totalRows++;
                int displayRowNumber = r + 1; // 1-based index trên Excel

                String catVal = getCellString(row.getCell(catCol));
                String nameVal = getCellString(row.getCell(nameCol));
                String codeVal = getCellString(row.getCell(codeCol));
                String feeTypeVal = getCellString(row.getCell(feeTypeCol));
                String unitVal = getCellString(row.getCell(unitCol));
                Long minPriceVal = getCellLong(row.getCell(minPriceCol));
                Long maxPriceVal = getCellLong(row.getCell(maxPriceCol));

                List<String> rowReasons = new ArrayList<>();

                // 1. Kiểm tra trường bắt buộc không để trống
                if (catVal.isBlank()) rowReasons.add("Danh mục dịch vụ không được để trống");
                if (nameVal.isBlank()) rowReasons.add("Tên dịch vụ không được để trống");
                if (codeVal.isBlank()) rowReasons.add("Mã dịch vụ không được để trống");
                if (feeTypeVal.isBlank()) rowReasons.add("Loại phí không được để trống");
                if (unitVal.isBlank()) rowReasons.add("Đơn vị tính không được để trống");
                if (minPriceVal == null) rowReasons.add("Giá tối thiểu không hợp lệ hoặc để trống");
                if (maxPriceVal == null) rowReasons.add("Giá tối đa không hợp lệ hoặc để trống");

                // 2. Kiểm tra giá min/max
                if (minPriceVal != null && minPriceVal < 0) {
                    rowReasons.add("Giá tối thiểu không được âm");
                }
                if (maxPriceVal != null && maxPriceVal < 0) {
                    rowReasons.add("Giá tối đa không được âm");
                }
                if (minPriceVal != null && maxPriceVal != null && minPriceVal > maxPriceVal) {
                    rowReasons.add("Giá tối thiểu (" + formatNumber(minPriceVal) + " ₫) không được lớn hơn giá tối đa (" + formatNumber(maxPriceVal) + " ₫)");
                }

                // 3. Nhận diện danh mục linh hoạt (Hỗ trợ cả dạng "Tên (MÃ)", Mã Code hoặc Tên thuần túy)
                ServiceCategory category = null;
                if (!catVal.isBlank()) {
                    category = findCategory(catVal);
                    if (category == null) {
                        rowReasons.add("Danh mục '" + catVal + "' không tồn tại trong hệ thống");
                    }
                }

                // 4. Kiểm tra FeeType
                FeeType feeType = null;
                if (!feeTypeVal.isBlank()) {
                    feeType = parseFeeType(feeTypeVal);
                    if (feeType == null) {
                        rowReasons.add("Loại phí '" + feeTypeVal + "' không hợp lệ (Chỉ chấp nhận: SERVICE_FEE, RESCUE_FEE, TOWING_FEE)");
                    }
                }

                // 5. Kiểm tra ServiceUnit
                ServiceUnit unit = null;
                if (!unitVal.isBlank()) {
                    unit = parseServiceUnit(unitVal);
                    if (unit == null) {
                        rowReasons.add("Đơn vị tính '" + unitVal + "' không hợp lệ (Chỉ chấp nhận: LAN, KM)");
                    }
                }

                // 6. Kiểm tra trùng lặp mã dịch vụ (Unique code)
                String upperCode = codeVal.trim().toUpperCase();
                if (!codeVal.isBlank()) {
                    if (processedCodesInBatch.contains(upperCode)) {
                        rowReasons.add("Mã dịch vụ '" + codeVal + "' bị trùng lặp với dòng trước đó trong file Excel");
                    } else if (serviceRepository.existsByCode(upperCode)) {
                        rowReasons.add("Mã dịch vụ '" + codeVal + "' đã tồn tại trong cơ sở dữ liệu");
                    }
                }

                // ================= Kết luận dòng =================
                if (!rowReasons.isEmpty()) {
                    failureCount++;
                    errors.add(ServiceImportResponse.RowError.builder()
                            .rowNumber(displayRowNumber)
                            .serviceCode(!codeVal.isBlank() ? upperCode : "N/A")
                            .serviceName(!nameVal.isBlank() ? nameVal : "N/A")
                            .reason(String.join("; ", rowReasons))
                            .build());
                    continue; // Bỏ qua dòng lỗi/trùng, TIẾP TỤC dòng tiếp theo
                }

                // Dòng hợp lệ -> đưa vào danh sách chờ lưu
                processedCodesInBatch.add(upperCode);
                Service s = new Service();
                s.setCategory(category);
                s.setName(nameVal.trim());
                s.setCode(upperCode);
                s.setFeeType(feeType);
                s.setUnit(unit);
                s.setMinPrice(minPriceVal);
                s.setMaxPrice(maxPriceVal);
                s.setIsActive(true);
                servicesToSave.add(s);
                successCount++;
            }

            // Lưu tất cả các dòng hợp lệ vào DB
            if (!servicesToSave.isEmpty()) {
                serviceRepository.saveAll(servicesToSave);
            }

            return ServiceImportResponse.builder()
                    .totalRows(totalRows)
                    .successCount(successCount)
                    .failureCount(failureCount)
                    .errors(errors)
                    .build();

        } catch (ExcelSchemaValidationException e) {
            throw e;
        } catch (Exception e) {
            log.error("Lỗi khi đọc file Excel:", e);
            throw new ExcelSchemaValidationException("Lỗi cấu trúc hoặc định dạng file Excel không đọc được: " + e.getMessage());
        }
    }

    /**
     * Nhận diện danh mục linh hoạt:
     * - Dạng chọn Dropdown: "Cứu hộ khẩn cấp (CAT_RESCUE)" -> Tự tách ra CAT_RESCUE
     * - Dạng mã Code thuần: "CAT_RESCUE", "TIRE_SERVICE"
     * - Dạng tên danh mục thuần: "Cứu hộ khẩn cấp", "Cứu hộ lốp & Vỏ xe"
     */
    private ServiceCategory findCategory(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String trimmed = raw.trim();

        // 1. Nếu có ngoặc tròn dạng "Tên danh mục (MÃ_CODE)", tách mã code bên trong ngoặc
        int openParen = trimmed.lastIndexOf('(');
        int closeParen = trimmed.lastIndexOf(')');
        if (openParen >= 0 && closeParen > openParen) {
            String extractedCode = trimmed.substring(openParen + 1, closeParen).trim();
            Optional<ServiceCategory> opt = serviceCategoryRepository.findByCodeIgnoreCase(extractedCode);
            if (opt.isPresent()) return opt.get();
        }

        // 2. Thử tìm trực tiếp theo mã code
        Optional<ServiceCategory> opt = serviceCategoryRepository.findByCodeIgnoreCase(trimmed);
        if (opt.isPresent()) return opt.get();

        // 3. Thử tìm theo tên danh mục
        opt = serviceCategoryRepository.findByNameIgnoreCase(trimmed);
        if (opt.isPresent()) return opt.get();

        // 4. Nếu có dấu ngoặc nhưng code không tìm thấy, thử tìm theo tên trước dấu ngoặc
        if (openParen > 0) {
            String namePart = trimmed.substring(0, openParen).trim();
            opt = serviceCategoryRepository.findByNameIgnoreCase(namePart);
            if (opt.isPresent()) return opt.get();
        }

        return null;
    }

    private Map<String, Integer> mapHeaderColumns(Row headerRow) {
        Map<String, Integer> map = new HashMap<>();
        for (int c = 0; c < headerRow.getLastCellNum(); c++) {
            Cell cell = headerRow.getCell(c);
            if (cell == null) continue;
            String text = normalize(getCellString(cell));
            if (text.contains("danh muc") || text.contains("category")) {
                map.putIfAbsent("CATEGORY", c);
            } else if (text.contains("ten dich vu") || text.contains("service name")) {
                map.putIfAbsent("SERVICE_NAME", c);
            } else if (text.contains("ma dich vu") || text.contains("service code")) {
                map.putIfAbsent("SERVICE_CODE", c);
            } else if (text.contains("loai phi") || text.contains("feetype") || text.contains("fee type")) {
                map.putIfAbsent("FEE_TYPE", c);
            } else if (text.contains("don vi tinh") || text.contains("don vi") || text.contains("unit")) {
                map.putIfAbsent("UNIT", c);
            } else if (text.contains("toi thieu") || text.contains("min price") || text.contains("gia min")) {
                map.putIfAbsent("MIN_PRICE", c);
            } else if (text.contains("toi da") || text.contains("max price") || text.contains("gia max")) {
                map.putIfAbsent("MAX_PRICE", c);
            }
        }
        return map;
    }

    private FeeType parseFeeType(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String n = normalize(raw).toUpperCase().replace(" ", "_");
        if (n.contains("SERVICE") || n.contains("SUA_CHUA") || n.contains("DICH_VU")) {
            return FeeType.SERVICE_FEE;
        }
        if (n.contains("RESCUE") || n.contains("CUU_HO")) {
            return FeeType.RESCUE_FEE;
        }
        if (n.contains("TOWING") || n.contains("KEO_XE")) {
            return FeeType.TOWING_FEE;
        }
        try {
            return FeeType.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            return null;
        }
    }

    private ServiceUnit parseServiceUnit(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String n = normalize(raw).toUpperCase();
        if (n.contains("LAN") || n.contains("LUOT")) {
            return ServiceUnit.LAN;
        }
        if (n.contains("KM") || n.contains("KILOMET")) {
            return ServiceUnit.KM;
        }
        try {
            return ServiceUnit.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isRowEmpty(Row row) {
        if (row == null) return true;
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String val = getCellString(cell);
                if (!val.trim().isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                if (d == (long) d) {
                    yield String.valueOf((long) d);
                } else {
                    yield String.valueOf(d);
                }
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield cell.getStringCellValue().trim();
                } catch (Exception e) {
                    yield String.valueOf((long) cell.getNumericCellValue());
                }
            }
            default -> "";
        };
    }

    private Long getCellLong(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                return (long) Math.round(cell.getNumericCellValue());
            } else if (cell.getCellType() == CellType.STRING) {
                String text = cell.getStringCellValue().replaceAll("[^0-9-]", "").trim();
                return text.isEmpty() ? null : Long.parseLong(text);
            } else if (cell.getCellType() == CellType.FORMULA) {
                return (long) Math.round(cell.getNumericCellValue());
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }

    private String normalize(String input) {
        if (input == null) return "";
        String temp = Normalizer.normalize(input, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(temp).replaceAll("")
                .toLowerCase()
                .replaceAll("đ", "d")
                .replaceAll("[^a-z0-9 ]", " ")
                .trim();
    }

    private void setBorder(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }

    private String formatNumber(long val) {
        return NumberFormat.getInstance(new Locale("vi", "VN")).format(val);
    }
}
