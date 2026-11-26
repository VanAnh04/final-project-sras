package com.sras.backend.controller;

import com.sras.backend.dto.request.DocumentPhotoAnalysisRequest;
import com.sras.backend.dto.request.GarageDossierAnalysisRequest;
import com.sras.backend.dto.request.VehiclePhotoAnalysisRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.DocumentPhotoAnalysisResponse;
import com.sras.backend.dto.response.GarageDossierAnalysisResponse;
import com.sras.backend.dto.response.VehiclePhotoAnalysisResponse;
import com.sras.backend.service.AiImageVerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai/verify")
@RequiredArgsConstructor
@Slf4j
public class AiImageVerificationController {

    private final AiImageVerificationService aiImageVerificationService;

    /**
     * Phân tích ảnh xe cứu hộ: kiểm tra phương tiện, loại xe, OCR đọc biển số & chất lượng ảnh.
     */
    @PostMapping("/vehicle-photo")
    public ResponseEntity<ApiResponse<VehiclePhotoAnalysisResponse>> verifyVehiclePhoto(
            @RequestBody VehiclePhotoAnalysisRequest request) {
        log.info("[AI Verify] Phân tích ảnh xe cứu hộ: url={}, expectedPlate={}, expectedKind={}",
                request.getPhotoUrl(), request.getExpectedPlate(), request.getExpectedKind());
        VehiclePhotoAnalysisResponse response = aiImageVerificationService.verifyVehiclePhoto(request);
        return ResponseEntity.ok(ApiResponse.success("Phân tích ảnh xe cứu hộ thành công", response));
    }

    /**
     * Phân tích & OCR ảnh tài liệu pháp lý (CCCD mặt trước/sau, Giấy phép ĐKKD, Ảnh mặt tiền Gara).
     */
    @PostMapping("/document-photo")
    public ResponseEntity<ApiResponse<DocumentPhotoAnalysisResponse>> verifyDocumentPhoto(
            @RequestBody DocumentPhotoAnalysisRequest request) {
        log.info("[AI Verify] Phân tích ảnh tài liệu: type={}, url={}", request.getDocType(), request.getPhotoUrl());
        DocumentPhotoAnalysisResponse response = aiImageVerificationService.verifyDocumentPhoto(request);
        return ResponseEntity.ok(ApiResponse.success("Thẩm định tài liệu thành công", response));
    }

    /**
     * Thẩm định toàn diện bộ hồ sơ Gara và đối soát chéo 4 chiều.
     */
    @PostMapping("/garage-dossier")
    public ResponseEntity<ApiResponse<GarageDossierAnalysisResponse>> verifyGarageDossier(
            @RequestBody GarageDossierAnalysisRequest request) {
        log.info("[AI Verify] Đối soát hồ sơ Gara: garageName={}, ownerName={}",
                request.getGarageName(), request.getOwnerName());
        GarageDossierAnalysisResponse response = aiImageVerificationService.verifyGarageDossier(request);
        return ResponseEntity.ok(ApiResponse.success("Đối soát hồ sơ Gara thành công", response));
    }
}

