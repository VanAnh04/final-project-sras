import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Star, X, CheckCircle2, Building2, User, Wrench } from 'lucide-react-native';
import { ratingApi, RatingDto } from '../api/ratingApi';

interface RatingModalProps {
  visible: boolean;
  requestId: number;
  requestCode?: string;
  garageName?: string;
  staffName?: string;
  onClose: () => void;
  onSuccess: (rating: RatingDto) => void;
}

const QUICK_TAGS_GARAGE = [
  'Tiếp nhận nhanh',
  'Giá cả minh bạch',
  'Cơ sở uy tín',
  'Tư vấn chu đáo',
];

const QUICK_TAGS_STAFF = [
  'Thái độ nhiệt tình',
  'Tay nghề giỏi, cẩn thận',
  'Đến đúng hẹn',
  'Tác phong lịch sự',
];

const STAR_LABELS: Record<number, string> = {
  1: 'Rất không hài lòng 😞',
  2: 'Chưa hài lòng 😐',
  3: 'Bình thường 🙂',
  4: 'Hài lòng 😊',
  5: 'Tuyệt vời ⭐',
};

export default function RatingModal({
  visible,
  requestId,
  requestCode,
  garageName,
  staffName,
  onClose,
  onSuccess,
}: RatingModalProps) {
  // Đánh giá Gara
  const [garageStars, setGarageStars] = useState<number>(5);
  const [garageComment, setGarageComment] = useState<string>('');

  // Đánh giá Thợ
  const [staffStars, setStaffStars] = useState<number>(5);
  const [staffComment, setStaffComment] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);

  const handleToggleGarageTag = (tag: string) => {
    if (garageComment.includes(tag)) {
      setGarageComment((prev) => prev.replace(tag, '').replace(/  +/g, ' ').trim());
    } else {
      setGarageComment((prev) => (prev ? `${prev} · ${tag}` : tag));
    }
  };

  const handleToggleStaffTag = (tag: string) => {
    if (staffComment.includes(tag)) {
      setStaffComment((prev) => prev.replace(tag, '').replace(/  +/g, ' ').trim());
    } else {
      setStaffComment((prev) => (prev ? `${prev} · ${tag}` : tag));
    }
  };

  const handleSubmit = async () => {
    if (!garageStars || garageStars < 1) {
      Alert.alert('Chưa chọn số sao Gara', 'Vui lòng chọn từ 1 đến 5 sao cho Gara.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await ratingApi.create({
        requestId,
        stars: garageStars,
        comment: garageComment.trim(),
        staffStars: staffName ? staffStars : undefined,
        staffComment: staffName ? staffComment.trim() : undefined,
      });

      Alert.alert('Cảm ơn bạn!', 'Đánh giá của bạn dành cho Gara và Thợ đã được ghi nhận.');
      onSuccess(res);
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Không thể gửi đánh giá lúc này.';
      Alert.alert('Lỗi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
          >
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Đánh giá dịch vụ</Text>
                  <Text style={styles.subTitle}>
                    Đơn {requestCode ? `#${requestCode}` : `#${requestId}`}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={submitting}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                {/* KHỐI 1: ĐÁNH GIÁ GARA */}
                <View style={styles.ratingSection}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.iconCircleGarage}>
                      <Building2 size={16} color="#ea580c" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionTitle}>1. Đánh giá Gara cứu hộ</Text>
                      <Text style={styles.targetName} numberOfLines={1}>
                        {garageName || 'Gara đối tác'}
                      </Text>
                    </View>
                  </View>

                  {/* Stars Gara */}
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => {
                      const isActive = s <= garageStars;
                      return (
                        <TouchableOpacity
                          key={s}
                          onPress={() => setGarageStars(s)}
                          activeOpacity={0.7}
                          style={styles.starBtn}
                        >
                          <Star
                            size={32}
                            color={isActive ? '#f59e0b' : '#cbd5e1'}
                            fill={isActive ? '#f59e0b' : 'none'}
                            strokeWidth={2}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.starLabel}>{STAR_LABELS[garageStars]}</Text>

                  {/* Tags Gara */}
                  <View style={styles.tagsRow}>
                    {QUICK_TAGS_GARAGE.map((tag) => {
                      const isSelected = garageComment.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[styles.tagChip, isSelected && styles.tagChipActive]}
                          onPress={() => handleToggleGarageTag(tag)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>
                            {tag}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="Nhận xét về dịch vụ chung của Gara (tuỳ chọn)..."
                    placeholderTextColor="#94a3b8"
                    value={garageComment}
                    onChangeText={setGarageComment}
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                  />
                </View>

                {/* KHỐI 2: ĐÁNH GIÁ THỢ CỨU HỘ (nếu có thợ) */}
                {staffName && (
                  <View style={[styles.ratingSection, { marginTop: 14 }]}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.iconCircleStaff}>
                        <User size={16} color="#0284c7" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sectionTitle}>2. Đánh giá Thợ cứu hộ</Text>
                        <Text style={styles.targetName} numberOfLines={1}>
                          Thợ: <Text style={{ color: '#0284c7' }}>{staffName}</Text>
                        </Text>
                      </View>
                    </View>

                    {/* Stars Thợ */}
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((s) => {
                        const isActive = s <= staffStars;
                        return (
                          <TouchableOpacity
                            key={s}
                            onPress={() => setStaffStars(s)}
                            activeOpacity={0.7}
                            style={styles.starBtn}
                          >
                            <Star
                              size={32}
                              color={isActive ? '#f59e0b' : '#cbd5e1'}
                              fill={isActive ? '#f59e0b' : 'none'}
                              strokeWidth={2}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={styles.starLabel}>{STAR_LABELS[staffStars]}</Text>

                    {/* Tags Thợ */}
                    <View style={styles.tagsRow}>
                      {QUICK_TAGS_STAFF.map((tag) => {
                        const isSelected = staffComment.includes(tag);
                        return (
                          <TouchableOpacity
                            key={tag}
                            style={[styles.tagChip, isSelected && styles.tagChipActiveStaff]}
                            onPress={() => handleToggleStaffTag(tag)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.tagText, isSelected && styles.tagTextActiveStaff]}>
                              {tag}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder={`Nhận xét về thái độ & tay nghề của thợ ${staffName}...`}
                      placeholderTextColor="#94a3b8"
                      value={staffComment}
                      onChangeText={setStaffComment}
                      multiline
                      numberOfLines={3}
                      maxLength={500}
                    />
                  </View>
                )}
              </ScrollView>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.9}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.4} />
                    <Text style={styles.submitBtnText}>Gửi toàn bộ đánh giá</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 440,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subTitle: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  ratingSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconCircleGarage: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleStaff: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  targetName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
    marginTop: 1,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  starBtn: {
    padding: 2,
  },
  starLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#b45309',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  tagChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  tagChipActiveStaff: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0284c7',
  },
  tagText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  tagTextActive: {
    color: '#ea580c',
    fontWeight: '700',
  },
  tagTextActiveStaff: {
    color: '#0284c7',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 10,
    fontSize: 12.5,
    color: '#0f172a',
    textAlignVertical: 'top',
    minHeight: 56,
  },
  submitBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
