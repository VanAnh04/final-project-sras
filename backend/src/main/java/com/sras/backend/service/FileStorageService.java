package com.sras.backend.service;

import com.sras.backend.entity.StoredFile;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.util.Optional;

public interface FileStorageService {
    String storeFile(MultipartFile file);
    boolean deleteFile(String fileUrl);
    Optional<StoredFile> getFile(String fileName);
    byte[] getFileData(String fileName);
    Path getFileStorageLocation();
    String storeBase64OrKeepUrl(String value);
}
