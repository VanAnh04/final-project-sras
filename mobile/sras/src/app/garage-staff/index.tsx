import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Điều hướng tự động về /garage-staff/home.
 * Tất cả tính năng thực tế từ bản đồ Goong Map, GPS, quản lý cuốc cứu hộ,
 * tới Dashboard thợ (Switch online, Radar, Thống kê ca trực)
 * đã được quy tụ đồng bộ về file: src/app/garage-staff/home.tsx.
 */
export default function GarageStaffIndexRedirect() {
  return <Redirect href="/garage-staff/home" />;
}
