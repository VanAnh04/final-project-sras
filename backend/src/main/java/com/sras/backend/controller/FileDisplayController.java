package com.sras.backend.controller;

import com.sras.backend.entity.StoredFile;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

/**
 * Controller phục vụ ảnh và file trực tiếp từ cơ sở dữ liệu qua đường dẫn /uploads/**.
 * Đảm bảo tương thích hoàn toàn với tất cả URL ảnh hiện có của hệ thống.
 */
@RestController
@RequiredArgsConstructor
public class FileDisplayController {

    private final FileStorageService fileStorageService;

    @GetMapping("/uploads/{fileName:.+}")
    public ResponseEntity<byte[]> viewUploadFile(@PathVariable String fileName) {
        StoredFile storedFile = fileStorageService.getFile(fileName)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy file: " + fileName));

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (StringUtils.hasText(storedFile.getContentType())) {
            try {
                mediaType = MediaType.parseMediaType(storedFile.getContentType());
            } catch (Exception ignored) {
            }
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(storedFile.getFileSize())
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=2592000, must-revalidate")
                .body(storedFile.getData());
    }
}
