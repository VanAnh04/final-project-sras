import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Star, X, User, MessageSquare, Award } from 'lucide-react-native';
import { ratingApi, RatingDto } from '../api/ratingApi';

interface StaffReviewsModalProps {
  visible: boolean;
  staffId: number | null;
  staffName?: string;
  staffCode?: string;
  avgRating?: number | null;
  ratingCount?: number | null;
  onClose: () => void;
}

export default function StaffReviewsModal({
  visible,
  staffId,
  staffName,
  staffCode,
  avgRating,
  ratingCount,
  onClose,
}: StaffReviewsModalProps) {
  const [reviews, setReviews] = useState<RatingDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !staffId) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await ratingApi.getByStaff(staffId);
        if (alive) setReviews(data || []);
      } catch (err) {
        console.warn('Lỗi tải đánh giá của thợ:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [visible, staffId]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.avatarWrap}>
                    <User size={20} color="#0284c7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={1}>
                      {staffName || 'Nhân viên'}
                    </Text>
                    <Text style={styles.subTitle}>
                      {staffCode ? `Mã NV: ${staffCode}` : 'Thợ cứu hộ'} • Đánh giá từ khách
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* KPI Score Card */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiLeft}>
                  <Text style={styles.scoreText}>
                    {avgRating != null && avgRating > 0 ? avgRating.toFixed(1) : '5.0'}
                  </Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={15}
                        color="#f59e0b"
                        fill={s <= Math.round(avgRating || 5) ? '#f59e0b' : 'none'}
                      />
                    ))}
                  </View>
                  <Text style={styles.countText}>
                    Dựa trên {ratingCount || reviews.length || 0} lượt đánh giá
                  </Text>
                </View>

                <View style={styles.kpiBadge}>
                  <Award size={20} color="#059669" />
                  <Text style={styles.kpiBadgeText}>Thợ cứu hộ</Text>
                </View>
              </View>

              <Text style={styles.listHeading}>Lịch sử phản hồi từ khách hàng</Text>

              {/* Reviews List */}
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                {loading ? (
                  <View style={styles.centerBox}>
                    <ActivityIndicator size="small" color="#ea580c" />
                    <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
                  </View>
                ) : reviews.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <MessageSquare size={36} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>Chưa có đánh giá nào</Text>
                    <Text style={styles.emptySub}>
                      Khách hàng chưa gửi nhận xét riêng cho thợ này sau các ca cứu hộ.
                    </Text>
                  </View>
                ) : (
                  reviews.map((r, idx) => {
                    const stars = r.staffStars || r.stars || 5;
                    const comment = r.staffComment || r.comment;

                    return (
                      <View key={r.id || idx} style={styles.reviewCard}>
                        {/* Card top */}
                        <View style={styles.cardTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.customerName}>
                              {r.raterName || 'Khách hàng'}
                            </Text>
                            <Text style={styles.requestCode}>
                              {r.requestCode ? `Đơn #${r.requestCode}` : `#${r.requestId}`}
                            </Text>
                          </View>

                          <View style={styles.cardStarsRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={12}
                                color={s <= stars ? '#f59e0b' : '#cbd5e1'}
                                fill={s <= stars ? '#f59e0b' : 'none'}
                              />
                            ))}
                          </View>
                        </View>

                        {/* Comment text */}
                        {comment ? (
                          <Text style={styles.commentText}>"{comment}"</Text>
                        ) : (
                          <Text style={styles.noCommentText}>Khách hàng chỉ chấm sao, không để lại nhận xét.</Text>
                        )}

                        <Text style={styles.timeText}>
                          {r.createdAt
                            ? new Date(r.createdAt).toLocaleDateString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
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
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  subTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  kpiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiLeft: {
    gap: 3,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#b45309',
    letterSpacing: -0.5,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  countText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  kpiBadge: {
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 4,
  },
  kpiBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
  },
  listHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginTop: 16,
    marginBottom: 10,
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  loadingText: {
    fontSize: 12.5,
    color: '#64748b',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginTop: 6,
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  reviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  requestCode: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ea580c',
    marginTop: 1,
  },
  cardStarsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  commentText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
    marginTop: 4,
  },
  noCommentText: {
    fontSize: 11.5,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 2,
  },
  timeText: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 4,
  },
});
