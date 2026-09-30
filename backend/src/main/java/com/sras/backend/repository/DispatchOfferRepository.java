package com.sras.backend.repository;

import com.sras.backend.entity.DispatchOffer;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.enums.OfferStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DispatchOfferRepository extends JpaRepository<DispatchOffer, Long> {

    List<DispatchOffer> findByRequest(RescueRequest request);

    Optional<DispatchOffer> findByRequestAndGarage(RescueRequest request, Garage garage);

    List<DispatchOffer> findByGarageAndStatusOrderByCreatedAtDesc(Garage garage, OfferStatus status);
}
