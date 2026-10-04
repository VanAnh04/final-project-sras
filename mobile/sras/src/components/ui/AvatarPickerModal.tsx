import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { X, Check, Camera, Link2, Sparkles, User, Image as ImageIcon, Plus } from 'lucide-react-native';
import axiosClient from '../../api/axiosClient';
import { rescueApi } from '../../api/rescueApi';

const { width } = Dimensions.get('window');

export const PRESET_AVATARS = [
  { id: '1', name: 'Nữ năng động', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80' },
  { id: '2', name: 'Nữ thanh lịch', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80' },
  { id: '3', name: 'Nam phong độ', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80' },
  { id: '4', name: 'Nam trẻ trung', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80' },
  { id: '5', name: 'Avatar 3D', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80' },
  { id: '6', name: 'Nữ cá tính', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80' },
  { id: '7', name: 'Nam lịch lãm', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80' },
  { id: '8', name: 'Nữ hiện đại', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80' },
];

interface AvatarPickerModalProps {
  visible: boolean;
  currentAvatarUrl: string;
  userName?: string;
  onClose: () => void;
  onSelectAvatar: (avatarUrl: string) => Promise<void> | void;
}

export default function AvatarPickerModal({
  visible,
  currentAvatarUrl,
  userName = 'User',
  onClose,
  onSelectAvatar,
}: AvatarPickerModalProps) {
  const [selectedUrl, setSelectedUrl] = useState<string>(currentAvatarUrl);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [customInputUrl, setCustomInputUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedUrl(currentAvatarUrl);
      setCustomInputUrl(currentAvatarUrl?.startsWith('http') ? currentAvatarUrl : '');
    }
  }, [visible, currentAvatarUrl]);

  // Chọn ảnh từ thư viện thiết bị (Gallery)
  const pickImageFromGallery = async () => {
    try {
      setIsPickingImage(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cấp quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để chọn ảnh đại diện.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedUrl(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Lỗi khi mở thư viện ảnh:', err);
    } finally {
      setIsPickingImage(false);
    }
  };

  // Chụp ảnh trực tiếp từ máy ảnh (Camera)
  const takePhotoWithCamera = async () => {
    try {
      setIsPickingImage(true);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cấp quyền máy ảnh', 'Vui lòng cấp quyền sử dụng máy ảnh để chụp ảnh đại diện.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedUrl(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Lỗi khi mở máy ảnh:', err);
    } finally {
      setIsPickingImage(false);
    }
  };

  const generateInitialsAvatar = () => {
    const encoded = encodeURIComponent(userName.trim() || 'User');
    const url = `https://ui-avatars.com/api/?name=${encoded}&background=ea580c&color=fff&size=256&bold=true`;
    setSelectedUrl(url);
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customInputUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      setSelectedUrl(trimmed);
    }
  };

  const handleSave = async () => {
    if (!selectedUrl) return;
    let uploadedUrl: string | null = null;
    let finalUrl = selectedUrl;
    try {
      setIsSaving(true);
      // Nếu là ảnh cục bộ trên thiết bị (file://, content://, data:), upload lên server trước khi lưu
      if (selectedUrl.startsWith('file://') || selectedUrl.startsWith('content://') || selectedUrl.startsWith('data:')) {
        uploadedUrl = await rescueApi.uploadPhoto(selectedUrl);
        finalUrl = uploadedUrl;
      }
      await onSelectAvatar(finalUrl);
      onClose();
    } catch (err: any) {
      // Rollback: nếu cập nhật avatar thất bại, xóa ảnh vừa upload để tránh ảnh mồ côi
      if (uploadedUrl) {
        await rescueApi.deletePhoto(uploadedUrl);
      }
      Alert.alert('Lỗi', err?.response?.data?.message || err?.message || 'Không thể lưu ảnh đại diện.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <Camera size={18} color="#ea580c" />
              </View>
              <Text style={styles.modalTitle}>Đổi ảnh đại diện</Text>
            </View>
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={onClose}
              disabled={isSaving || isPickingImage}
              activeOpacity={0.7}
            >
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Current Avatar Preview */}
          <View style={styles.previewSection}>
            <View style={styles.previewRing}>
              <Image
                source={{ uri: selectedUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80' }}
                style={styles.previewImage}
              />
              <View style={styles.sparkleBadge}>
                <Sparkles size={12} color="#ffffff" />
              </View>
            </View>
            <Text style={styles.previewName}>{userName}</Text>
          </View>

          {/* Quick Photo Upload Action Buttons */}
          <View style={styles.quickUploadRow}>
            {/* Gallery Button */}
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={pickImageFromGallery}
              disabled={isPickingImage}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconBox, { backgroundColor: '#eff6ff' }]}>
                <ImageIcon size={20} color="#2563eb" />
              </View>
              <Text style={styles.quickBtnText}>Thư viện ảnh</Text>
            </TouchableOpacity>

            {/* Camera Button */}
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={takePhotoWithCamera}
              disabled={isPickingImage}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconBox, { backgroundColor: '#f0fdf4' }]}>
                <Camera size={20} color="#16a34a" />
              </View>
              <Text style={styles.quickBtnText}>Chụp ảnh</Text>
            </TouchableOpacity>

            {/* Initials SRAS Logo */}
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={generateInitialsAvatar}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconBox, { backgroundColor: '#fff7ed' }]}>
                <User size={20} color="#ea580c" />
              </View>
              <Text style={styles.quickBtnText}>Tạo theo tên</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'presets' && styles.tabButtonActive]}
              onPress={() => setActiveTab('presets')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'presets' && styles.tabTextActive]}>
                Bộ sưu tập có sẵn
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'custom' && styles.tabButtonActive]}
              onPress={() => setActiveTab('custom')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'custom' && styles.tabTextActive]}>
                Nhập link ảnh
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Area */}
          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {activeTab === 'presets' ? (
              <View style={styles.presetsWrapper}>
                
                {/* 4-column Grid */}
                <View style={styles.avatarGrid}>
                  {PRESET_AVATARS.map((item) => {
                    const isSelected = selectedUrl === item.url;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.avatarItemWrap,
                          isSelected && styles.avatarItemWrapActive,
                        ]}
                        onPress={() => setSelectedUrl(item.url)}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: item.url }} style={styles.avatarThumbnail} />
                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <Check size={12} color="#ffffff" strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.customUrlWrapper}>
                <Text style={styles.fieldLabel}>Dán đường link ảnh đại diện (URL)</Text>
                <View style={styles.inputWrap}>
                  <Link2 size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="https://example.com/my-photo.jpg"
                    placeholderTextColor="#94a3b8"
                    value={customInputUrl}
                    onChangeText={setCustomInputUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {customInputUrl.length > 0 && (
                    <TouchableOpacity onPress={() => setCustomInputUrl('')}>
                      <X size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.previewBtn}
                  onPress={handleApplyCustomUrl}
                  activeOpacity={0.8}
                >
                  <Text style={styles.previewBtnText}>Xem trước ảnh</Text>
                </TouchableOpacity>
                <Text style={styles.customHint}>Hỗ trợ các link ảnh trực tiếp định dạng JPG, PNG hoặc WebP.</Text>
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSaving || isPickingImage}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={isSaving || isPickingImage}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 6,
  },
  previewSection: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#fafaf9',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  previewRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#ea580c',
    position: 'relative',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
  },
  sparkleBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#ea580c',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  previewName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 6,
  },
  quickUploadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  quickBtn: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  quickIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  contentScroll: {
    paddingHorizontal: 20,
    maxHeight: 220,
  },
  presetsWrapper: {
    paddingVertical: 10,
    gap: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  avatarItemWrap: {
    width: (width - 40 - 36) / 4,
    height: (width - 40 - 36) / 4,
    borderRadius: (width - 40 - 36) / 8,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarItemWrapActive: {
    borderColor: '#ea580c',
    transform: [{ scale: 1.05 }],
  },
  avatarThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  selectedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ea580c',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  customUrlWrapper: {
    paddingVertical: 12,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    height: '100%',
  },
  previewBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  previewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  customHint: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  saveButton: {
    flex: 1.6,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#ea580c',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
