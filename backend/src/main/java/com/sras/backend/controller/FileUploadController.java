package com.sras.backend.controller;

import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileStorageService fileStorageService;

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadFile(
            @RequestParam("file") MultipartFile file) {
        String fileUrl = fileStorageService.storeFile(file);
        return ResponseEntity.ok(ApiResponse.success("Tải file thành công", Map.of("url", fileUrl)));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteFile(@RequestParam("url") String fileUrl) {
        boolean deleted = fileStorageService.deleteFile(fileUrl);
        return ResponseEntity.ok(ApiResponse.success(deleted ? "Đã xoá file thành công" : "File không tồn tại hoặc đã được xoá", null));
    }
}
