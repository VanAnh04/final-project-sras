package com.sras.backend.repository;

import com.sras.backend.entity.StoredFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StoredFileRepository extends JpaRepository<StoredFile, Long> {

    Optional<StoredFile> findByFileName(String fileName);

    boolean existsByFileName(String fileName);

    void deleteByFileName(String fileName);
}
