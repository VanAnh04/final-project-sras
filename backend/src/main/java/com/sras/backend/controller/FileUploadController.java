package com.sras.backend.controller;

import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.entity.StoredFile;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
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

    @GetMapping("/{fileName:.+}")
    public ResponseEntity<byte[]> viewFile(@PathVariable String fileName) {
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

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteFile(@RequestParam("url") String fileUrl) {
        boolean deleted = fileStorageService.deleteFile(fileUrl);
        return ResponseEntity.ok(ApiResponse.success(deleted ? "Đã xoá file thành công" : "File không tồn tại hoặc đã được xoá", null));
    }
}
