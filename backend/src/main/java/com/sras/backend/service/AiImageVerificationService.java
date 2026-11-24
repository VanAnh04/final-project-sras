package com.sras.backend.service;

import com.sras.backend.dto.request.DocumentPhotoAnalysisRequest;
import com.sras.backend.dto.request.GarageDossierAnalysisRequest;
import com.sras.backend.dto.request.VehiclePhotoAnalysisRequest;
import com.sras.backend.dto.response.DocumentPhotoAnalysisResponse;
import com.sras.backend.dto.response.GarageDossierAnalysisResponse;
import com.sras.backend.dto.response.VehiclePhotoAnalysisResponse;

public interface AiImageVerificationService {

    /**
     * Phân tích ảnh xe cứu hộ: phát hiện phương tiện, loại xe, OCR biển số, kiểm tra chất lượng & khớp dữ liệu.
     */
    VehiclePhotoAnalysisResponse verifyVehiclePhoto(VehiclePhotoAnalysisRequest request);

    /**
     * Phân tích ảnh tài liệu (CCCD trước/sau, Giấy phép ĐKKD, Mặt tiền Gara): OCR & kiểm tra tính hợp lệ.
     */
    DocumentPhotoAnalysisResponse verifyDocumentPhoto(DocumentPhotoAnalysisRequest request);

    /**
     * Thẩm định toàn diện hồ sơ Gara: đối soát chéo 4 ảnh tài liệu với thông tin đăng ký.
     */
    GarageDossierAnalysisResponse verifyGarageDossier(GarageDossierAnalysisRequest request);
}

