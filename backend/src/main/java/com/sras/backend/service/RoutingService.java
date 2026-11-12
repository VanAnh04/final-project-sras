package com.sras.backend.service;

import com.sras.backend.entity.enums.VehicleType;

public interface RoutingService {
    /**
     * Calculates actual driving distance in kilometers between two points using Goong Direction API.
     * Falls back to haversine distance with road correction factor if API is unavailable.
     *
     * @param originLat Origin latitude
     * @param originLng Origin longitude
     * @param destLat Destination latitude
     * @param destLng Destination longitude
     * @param vehicleType Vehicle type (MOTORBIKE or CAR)
     * @return Distance in kilometers, rounded to 2 decimal places
     */
    double calculateRoadDistanceKm(double originLat, double originLng, double destLat, double destLng, VehicleType vehicleType);
}
