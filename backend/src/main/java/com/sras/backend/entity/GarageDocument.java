package com.sras.backend.entity;

import com.sras.backend.entity.enums.GarageDocType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Registration documents for a garage (G-15). */
@Getter
@Setter
@Entity
@Table(name = "garage_documents")
public class GarageDocument extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @Enumerated(EnumType.STRING)
    @Column(name = "doc_type", nullable = false, length = 30)
    private GarageDocType docType;

    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    @Column(name = "note", length = 255)
    private String note;
}
