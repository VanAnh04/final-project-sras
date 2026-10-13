package com.sras.backend.repository;

import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.RescueRequestPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RescueRequestPhotoRepository extends JpaRepository<RescueRequestPhoto, Long> {

    List<RescueRequestPhoto> findByRequestOrderByIdAsc(RescueRequest request);
    List<RescueRequestPhoto> findByRequestOrderByIdDesc(RescueRequest request);
    List<RescueRequestPhoto> findByRequestInOrderByIdDesc(List<RescueRequest> requests);
}
