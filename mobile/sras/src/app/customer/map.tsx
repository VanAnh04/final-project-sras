import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Compass, 
  MapPin, 
  Search, 
  Star, 
  Phone, 
  Navigation, 
  Clock, 
  ShieldCheck,
  Wrench,
  SlidersHorizontal
} from 'lucide-react-native';

interface NearbyGarage {
  id: string;
  name: string;
  address: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  isOpen247: boolean;
  phone: string;
  specialties: string[];
}

const mockGarages: NearbyGarage[] = [
  {
    id: 'g1',
    name: 'Gara Cứu Hộ Giao Thông 24/7 Thành Phát',
    address: '120 Cầu Giấy, P. Quan Hoa, Q. Cầu Giấy, Hà Nội',
    distanceKm: 0.8,
    rating: 4.9,
    reviewCount: 248,
    isOpen247: true,
    phone: '0988 123 456',
    specialties: ['Cứu hộ lưu động', 'Kích bình ắc quy', 'Vá vỏ xe máy/ô tô', 'Kéo xe']
  },
  {
    id: 'g2',
    name: 'AutoPro Service & Repair Mỹ Đình',
    address: '58 Lê Đức Thọ, P. Mỹ Đình 2, Q. Nam Từ Liêm, Hà Nội',
    distanceKm: 1.5,
    rating: 4.8,
    reviewCount: 182,
    isOpen247: true,
    phone: '0912 345 678',
    specialties: ['Chẩn đoán điện tử', 'Sửa chữa gầm máy', 'Cứu hộ ngập nước']
  },
  {
    id: 'g3',
    name: 'Tiệm Sửa Xe Máy Cứu Hộ Khẩn Cấp Bách Khoa',
    address: '42 Tạ Quang Bửu, P. Bách Khoa, Q. Hai Bà Trưng, Hà Nội',
    distanceKm: 2.3,
    rating: 4.7,
    reviewCount: 95,
    isOpen247: false,
    phone: '0904 555 777',
    specialties: ['Sửa khóa Smartkey', 'Thay xăm lốp tận nơi', 'Tiếp xăng khẩn cấp']
  },
  {
    id: 'g4',
    name: 'Trung Tâm Cứu Hộ Ô Tô Thăng Long 116',
    address: 'Km 8 Đại lộ Thăng Long, Hoài Đức, Hà Nội',
    distanceKm: 3.2,
    rating: 4.9,
    reviewCount: 310,
    isOpen247: true,
    phone: '0903 999 888',
    specialties: ['Xe cẩu sàn trượt', 'Cứu hộ cao tốc', 'Sửa chữa lưu động']
  }
];

export default function CustomerMapScreen() {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | '247' | 'CAR' | 'MOTO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filterChips = [
    { key: 'ALL', label: 'Tất cả gara' },
    { key: '247', label: '⚡ Cứu hộ 24/7' },
    { key: 'CAR', label: '🚗 Gara Ô tô' },
    { key: 'MOTO', label: '🛵 Xe máy' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.currentLocationRow}>
          <MapPin size={16} color="#ea580c" />
          <Text style={styles.currentLocationLabel}>Vị trí hiện tại của bạn:</Text>
          <Text style={styles.currentLocationValue} numberOfLines={1}>Cầu Giấy, Hà Nội</Text>
        </View>

        <View style={styles.searchBar}>
          <Search size={18} color="#94a3b8" />
          <TextInput
            placeholder="Tìm gara, trạm cứu hộ gần bạn..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filterChips.map((chip) => {
            const isActive = selectedFilter === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                onPress={() => setSelectedFilter(chip.key as any)}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive
                ]}
              >
                <Text style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive
                ]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Simulated Map Visual Banner */}
      <View style={styles.mapBanner}>
        <View style={styles.mapGraphic}>
          <View style={styles.radarRingOuter} />
          <View style={styles.radarRingMiddle} />
          <View style={styles.radarPinCenter}>
            <MapPin size={20} color="#ffffff" />
          </View>
        </View>
        <View style={styles.mapBannerInfo}>
          <Text style={styles.mapBannerTitle}>Tìm thấy 12 gara trong bán kính 5km</Text>
          <Text style={styles.mapBannerSubtitle}>Tất cả các đối tác đều đã qua thẩm định chất lượng SRAS</Text>
        </View>
      </View>

      {/* Garages List */}
      <ScrollView contentContainerStyle={styles.garageList} showsVerticalScrollIndicator={false}>
        <Text style={styles.listHeaderTitle}>Gara & trạm cứu hộ lân cận</Text>

        {mockGarages.map((garage) => (
          <View key={garage.id} style={styles.garageCard}>
            <View style={styles.cardTopRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.garageName}>{garage.name}</Text>
                  <ShieldCheck size={16} color="#059669" />
                </View>
                <Text style={styles.garageAddress}>{garage.address}</Text>
              </View>

              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>{garage.distanceKm} km</Text>
              </View>
            </View>

            {/* Rating & 24/7 tag */}
            <View style={styles.metaRow}>
              <View style={styles.ratingBadge}>
                <Star size={14} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.ratingText}>{garage.rating}</Text>
                <Text style={styles.reviewCount}>({garage.reviewCount})</Text>
              </View>

              {garage.isOpen247 && (
                <View style={styles.open247Badge}>
                  <Clock size={12} color="#ea580c" />
                  <Text style={styles.open247Text}>Cứu hộ 24/7</Text>
                </View>
              )}
            </View>

            {/* Specialties */}
            <View style={styles.specialtiesWrap}>
              {garage.specialties.map((tag, idx) => (
                <View key={idx} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.callButton}>
                <Phone size={16} color="#ea580c" />
                <Text style={styles.callButtonText}>Gọi ngay</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.rescueRequestBtn}>
                <Navigation size={16} color="#ffffff" />
                <Text style={styles.rescueRequestBtnText}>Yêu cầu cứu hộ tới đây</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  currentLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  currentLocationLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  currentLocationValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  filterSection: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  mapBanner: {
    backgroundColor: '#1e293b',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mapGraphic: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRingOuter: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.4)',
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
  },
  radarRingMiddle: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.6)',
  },
  radarPinCenter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBannerInfo: {
    flex: 1,
  },
  mapBannerTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  mapBannerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  garageList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  garageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  garageName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
  },
  garageAddress: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
    lineHeight: 17,
  },
  distanceBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  distanceText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  reviewCount: {
    fontSize: 11,
    color: '#94a3b8',
  },
  open247Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  open247Text: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ea580c',
  },
  specialtiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#475569',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  rescueRequestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingVertical: 9,
    borderRadius: 10,
  },
  rescueRequestBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
