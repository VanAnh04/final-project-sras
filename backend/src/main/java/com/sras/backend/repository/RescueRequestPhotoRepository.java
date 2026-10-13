package com.sras.backend.repository;

import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.RescueRequestPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface RescueRequestPhotoRepository extends JpaRepository<RescueRequestPhoto, Long> {

    List<RescueRequestPhoto> findByRequestOrderByIdAsc(RescueRequest request);
    List<RescueRequestPhoto> findByRequestOrderByIdDesc(RescueRequest request);

    @Query("SELECT p FROM RescueRequestPhoto p WHERE p.request.id IN :requestIds ORDER BY p.id DESC")
    List<RescueRequestPhoto> findByRequestIdIn(@Param("requestIds") Collection<Long> requestIds);
}
