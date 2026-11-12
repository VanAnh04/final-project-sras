package com.sras.backend.repository;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GarageDocumentRepository extends JpaRepository<GarageDocument, Long> {
    List<GarageDocument> findByGarage(Garage garage);
    List<GarageDocument> findByGarageId(Long garageId);
    List<GarageDocument> findByGarageIdIn(java.util.Collection<Long> garageIds);
}
