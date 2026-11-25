package com.sras.backend.repository;

import com.sras.backend.entity.LocationTrack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface LocationTrackRepository extends JpaRepository<LocationTrack, Long> {

    @Query("""
            SELECT lt FROM LocationTrack lt
            WHERE lt.request.id IN :requestIds
            ORDER BY lt.recordedAt ASC
            """)
    List<LocationTrack> findByRequestIdInOrderByRecordedAtAsc(@Param("requestIds") Collection<Long> requestIds);
}
