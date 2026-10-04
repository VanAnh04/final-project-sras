package com.sras.backend.service.impl;

import com.sras.backend.exception.BadRequestException;
import com.sras.backend.service.FileStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageServiceImpl implements FileStorageService {

    private final Path fileStorageLocation;

    public FileStorageServiceImpl() {
        this.fileStorageLocation = Paths.get("uploads").toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (IOException ex) {
            log.error("Could not create upload directory", ex);
        }
    }

    @Override
    public String storeFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("File tải lên không được rỗng");
        }

        String originalFileName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String fileExtension = "";
        int dotIndex = originalFileName.lastIndexOf('.');
        if (dotIndex > 0) {
            fileExtension = originalFileName.substring(dotIndex);
        }

        String fileName = UUID.randomUUID() + fileExtension;

        try {
            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/" + fileName;
        } catch (IOException ex) {
            log.error("Could not store file " + fileName, ex);
            throw new BadRequestException("Lỗi lưu trữ file: " + ex.getMessage());
        }
    }

    @Override
    public boolean deleteFile(String fileUrl) {
        if (!StringUtils.hasText(fileUrl)) {
            return false;
        }

        // Tách lấy tên file tương đối từ fileUrl (vd: "/uploads/abc.jpg" -> "abc.jpg")
        String relativePath = fileUrl.trim();
        int uploadIdx = relativePath.lastIndexOf("/uploads/");
        if (uploadIdx >= 0) {
            relativePath = relativePath.substring(uploadIdx + "/uploads/".length());
        } else if (relativePath.startsWith("/")) {
            relativePath = relativePath.substring(1);
        }

        // Kiểm tra phòng chống path traversal
        String cleanName = StringUtils.cleanPath(relativePath);
        if (cleanName.contains("..") || cleanName.contains("/") || cleanName.contains("\\")) {
            log.warn("Cảnh báo path traversal khi cố xoá file: {}", fileUrl);
            return false;
        }

        try {
            Path targetLocation = this.fileStorageLocation.resolve(cleanName).normalize();
            if (!targetLocation.startsWith(this.fileStorageLocation)) {
                log.warn("File nằm ngoài thư mục lưu trữ: {}", targetLocation);
                return false;
            }

            boolean deleted = Files.deleteIfExists(targetLocation);
            if (deleted) {
                log.info("Đã xóa file đĩa: {}", targetLocation.getFileName());
            } else {
                log.debug("File không tồn tại trên đĩa để xóa: {}", targetLocation.getFileName());
            }
            return deleted;
        } catch (IOException ex) {
            log.error("Lỗi khi xóa file " + fileUrl, ex);
            return false;
        }
    }

    @Override
    public Path getFileStorageLocation() {
        return this.fileStorageLocation;
    }
}
