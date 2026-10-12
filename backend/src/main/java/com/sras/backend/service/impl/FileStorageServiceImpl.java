package com.sras.backend.service.impl;

import com.sras.backend.entity.StoredFile;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.repository.StoredFileRepository;
import com.sras.backend.service.FileStorageService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageServiceImpl implements FileStorageService {

    private final StoredFileRepository storedFileRepository;

    @Override
    @Transactional
    public String storeFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File tải lên không được rỗng");
        }

        String originalFileName = StringUtils.cleanPath(Objects.requireNonNullElse(file.getOriginalFilename(), "image"));
        String fileExtension = "";
        int dotIndex = originalFileName.lastIndexOf('.');
        if (dotIndex > 0) {
            fileExtension = originalFileName.substring(dotIndex).toLowerCase();
        }

        String fileName = UUID.randomUUID() + fileExtension;
        String contentType = file.getContentType();
        if (!StringUtils.hasText(contentType)) {
            contentType = determineContentType(fileExtension);
        }

        try {
            byte[] data = file.getBytes();
            StoredFile storedFile = StoredFile.builder()
                    .fileName(fileName)
                    .originalName(originalFileName)
                    .contentType(contentType)
                    .fileSize((long) data.length)
                    .data(data)
                    .build();

            storedFileRepository.save(storedFile);
            log.info("Đã lưu ảnh vào Database thành công: {} ({} bytes, type={})", fileName, data.length, contentType);
            return "/uploads/" + fileName;
        } catch (IOException ex) {
            log.error("Lỗi khi đọc dữ liệu file để lưu vào Database: {}", fileName, ex);
            throw new BadRequestException("Lỗi lưu trữ file vào cơ sở dữ liệu: " + ex.getMessage());
        }
    }

    @Override
    @Transactional
    public boolean deleteFile(String fileUrl) {
        if (!StringUtils.hasText(fileUrl)) {
            return false;
        }

        String fileName = extractFileName(fileUrl);
        if (!StringUtils.hasText(fileName)) {
            return false;
        }

        Optional<StoredFile> fileOpt = storedFileRepository.findByFileName(fileName);
        if (fileOpt.isPresent()) {
            storedFileRepository.delete(fileOpt.get());
            log.info("Đã xóa file khỏi Database: {}", fileName);
            return true;
        }

        log.debug("Không tìm thấy file trong Database để xóa: {}", fileName);
        return false;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<StoredFile> getFile(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return Optional.empty();
        }

        String cleanName = extractFileName(fileName);
        Optional<StoredFile> fromDb = storedFileRepository.findByFileName(cleanName);
        if (fromDb.isPresent()) {
            return fromDb;
        }

        // Tự động kiểm tra và chuyển đổi dữ liệu từ đĩa cũ sang database nếu có
        return migrateSingleDiskFileIfPresent(cleanName);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] getFileData(String fileName) {
        return getFile(fileName).map(StoredFile::getData).orElse(null);
    }

    @Override
    public Path getFileStorageLocation() {
        return Paths.get("uploads").toAbsolutePath().normalize();
    }

    private String extractFileName(String raw) {
        String cleaned = StringUtils.cleanPath(raw.trim());
        int uploadIdx = cleaned.lastIndexOf("/uploads/");
        if (uploadIdx >= 0) {
            cleaned = cleaned.substring(uploadIdx + "/uploads/".length());
        } else {
            int apiUploadIdx = cleaned.lastIndexOf("/api/upload/");
            if (apiUploadIdx >= 0) {
                cleaned = cleaned.substring(apiUploadIdx + "/api/upload/".length());
            } else if (cleaned.startsWith("/")) {
                cleaned = cleaned.substring(1);
            }
        }
        return cleaned;
    }

    private String determineContentType(String extension) {
        return switch (extension.toLowerCase()) {
            case ".png" -> "image/png";
            case ".gif" -> "image/gif";
            case ".webp" -> "image/webp";
            case ".svg" -> "image/svg+xml";
            case ".pdf" -> "application/pdf";
            default -> "image/jpeg";
        };
    }

    /**
     * Khởi động: Tự động di chuyển các file ảnh cũ từ thư mục uploads (nếu có)
     * vào bảng stored_files trong Database để đảm bảo dữ liệu không bị thất lạc.
     */
    @PostConstruct
    public void migrateLegacyDiskFiles() {
        try {
            Path diskDir = Paths.get("uploads").toAbsolutePath().normalize();
            if (!Files.exists(diskDir) || !Files.isDirectory(diskDir)) {
                return;
            }

            try (var stream = Files.list(diskDir)) {
                stream.filter(Files::isRegularFile).forEach(path -> {
                    String fileName = path.getFileName().toString();
                    if (!storedFileRepository.existsByFileName(fileName)) {
                        try {
                            byte[] data = Files.readAllBytes(path);
                            String contentType = Files.probeContentType(path);
                            if (!StringUtils.hasText(contentType)) {
                                int dot = fileName.lastIndexOf('.');
                                String ext = dot > 0 ? fileName.substring(dot) : "";
                                contentType = determineContentType(ext);
                            }

                            StoredFile sf = StoredFile.builder()
                                    .fileName(fileName)
                                    .originalName(fileName)
                                    .contentType(contentType)
                                    .fileSize((long) data.length)
                                    .data(data)
                                    .build();
                            storedFileRepository.save(sf);
                            log.info("Đã đồng bộ ảnh cũ từ ổ đĩa vào Database: {}", fileName);
                        } catch (Exception e) {
                            log.warn("Không thể đồng bộ file cũ {}: {}", fileName, e.getMessage());
                        }
                    }
                });
            }
        } catch (Exception e) {
            log.warn("Không thể kiểm tra thư mục uploads cũ để đồng bộ: {}", e.getMessage());
        }
    }

    private Optional<StoredFile> migrateSingleDiskFileIfPresent(String fileName) {
        try {
            Path diskFile = Paths.get("uploads").resolve(fileName).toAbsolutePath().normalize();
            if (Files.exists(diskFile) && Files.isRegularFile(diskFile)) {
                byte[] data = Files.readAllBytes(diskFile);
                String contentType = Files.probeContentType(diskFile);
                if (!StringUtils.hasText(contentType)) {
                    int dot = fileName.lastIndexOf('.');
                    String ext = dot > 0 ? fileName.substring(dot) : "";
                    contentType = determineContentType(ext);
                }

                StoredFile sf = StoredFile.builder()
                        .fileName(fileName)
                        .originalName(fileName)
                        .contentType(contentType)
                        .fileSize((long) data.length)
                        .data(data)
                        .build();
                StoredFile saved = storedFileRepository.save(sf);
                log.info("Đã chuyển đổi file đĩa sang Database theo yêu cầu: {}", fileName);
                return Optional.of(saved);
            }
        } catch (Exception e) {
            log.warn("Lỗi đọc file từ đĩa dự phòng {}: {}", fileName, e.getMessage());
        }
        return Optional.empty();
    }

    @Override
    public String storeBase64OrKeepUrl(String value) {
        if (!StringUtils.hasText(value)) {
            return value;
        }

        String trimmed = value.trim();
        if (trimmed.startsWith("data:image/") || (trimmed.contains(";base64,") && trimmed.startsWith("data:"))) {
            try {
                String[] parts = trimmed.split(";base64,", 2);
                if (parts.length == 2) {
                    String meta = parts[0]; // e.g. data:image/png
                    String base64Data = parts[1];
                    String contentType = meta.replace("data:", "").trim();
                    String extension = ".png";
                    if (contentType.contains("jpeg") || contentType.contains("jpg")) {
                        extension = ".jpg";
                    } else if (contentType.contains("webp")) {
                        extension = ".webp";
                    } else if (contentType.contains("gif")) {
                        extension = ".gif";
                    }

                    byte[] data = java.util.Base64.getDecoder().decode(base64Data);
                    String fileName = UUID.randomUUID() + extension;
                    StoredFile sf = StoredFile.builder()
                            .fileName(fileName)
                            .originalName("base64_upload" + extension)
                            .contentType(contentType)
                            .fileSize((long) data.length)
                            .data(data)
                            .build();
                    storedFileRepository.save(sf);
                    log.info("Đã lưu Base64 ảnh vào Database thành công: /uploads/{} ({} bytes)", fileName, data.length);
                    return "/uploads/" + fileName;
                }
            } catch (Exception e) {
                log.error("Lỗi khi chuyển đổi và lưu Base64 vào database: {}", e.getMessage());
            }
        }

        return trimmed;
    }
}
