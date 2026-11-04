import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Star,
  Search,
  X,
  FileText,
  Wrench,
  ChevronRight,
  RotateCw,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import axiosClient from '../../api/axiosClient';
import { ratingApi, RatingDto } from '../../api/ratingApi';

type ReviewScope = 'ALL' | 'GARAGE' | 'STAFF' | 'WITH_COMMENT';
type TimeRange = 'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS';

export default function GarageReviewsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const { user } = useAuth();

  const handleBack = useCallback(() => {
    if (params.from === 'garage-profile') {
      router.replace('/garage-owner/garage-profile');
    } else {
      router.replace('/garage-owner/settings');
    }
  }, [params.from]);

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [handleBack]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratings, setRatings] = useState<RatingDto[]>([]);
  const [garageInfo, setGarageInfo] = useState<{ id?: number; name?: string; code?: string }>({});

  // Bộ lọc & Tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStar, setSelectedStar] = useState<number | null>(null);
  const [scope, setScope] = useState<ReviewScope>('ALL');
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');

  const fetchRatings = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await axiosClient.get('/garages/me');
      if (res?.data) {
        const d = res.data;
        setGarageInfo({
          id: d.id,
          name: d.name,
          code: d.code || (d.id ? `GR-${String(d.id).padStart(4, '0')}` : 'GR-0001'),
        });

        if (d.id) {
          const list = await ratingApi.getByGarageList(d.id);
          setRatings(list || []);
        }
      }
    } catch (err: any) {
      console.warn('Lỗi tải đánh giá gara:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRatings();
  }, [fetchRatings]);

  // Thống kê phân phối sao & số lượng theo từng nhóm
  const stats = useMemo(() => {
    if (ratings.length === 0) {
      return {
        total: 0,
        avgGarage: 0,
        avgStaff: 0,
        fiveStar: 0,
        fourStar: 0,
        threeStar: 0,
        twoStar: 0,
        oneStar: 0,
        garageCommentCount: 0,
        staffCommentCount: 0,
        withCommentsCount: 0,
        staffRatingsCount: 0,
      };
    }

    let sumGarage = 0;
    let sumStaff = 0;
    let staffCount = 0;
    let count5 = 0;
    let count4 = 0;
    let count3 = 0;
    let count2 = 0;
    let count1 = 0;
    let garageCommentCount = 0;
    let staffCommentCount = 0;
    let withCommentsCount = 0;
    let staffRatingsCount = 0;

    for (const r of ratings) {
      const gStars = r.stars || 5;
      sumGarage += gStars;
      if (gStars === 5) count5++;
      else if (gStars === 4) count4++;
      else if (gStars === 3) count3++;
      else if (gStars === 2) count2++;
      else count1++;

      const hasGC = Boolean(r.comment && r.comment.trim());
      const hasSC = Boolean(r.staffComment && r.staffComment.trim());
      const hasStaff = Boolean(r.staffName || r.staffId != null || r.staffStars != null);

      if (hasGC) garageCommentCount++;
      if (hasSC) staffCommentCount++;
      if (hasGC || hasSC) withCommentsCount++;
      if (hasStaff) staffRatingsCount++;

      if (r.staffStars != null) {
        sumStaff += r.staffStars;
        staffCount++;
      }
    }

    return {
      total: ratings.length,
      avgGarage: Math.round((sumGarage / ratings.length) * 10) / 10,
      avgStaff: staffCount > 0 ? Math.round((sumStaff / staffCount) * 10) / 10 : 0,
      fiveStar: count5,
      fourStar: count4,
      threeStar: count3,
      twoStar: count2,
      oneStar: count1,
      garageCommentCount,
      staffCommentCount,
      withCommentsCount,
      staffRatingsCount,
    };
  }, [ratings]);

  // Danh sách đánh giá sau khi áp dụng lọc và tìm kiếm
  const filteredRatings = useMemo(() => {
    let list = [...ratings];
    const q = searchQuery.trim().toLowerCase();

    // 1. Tìm kiếm theo từ khóa
    if (q) {
      list = list.filter((r) => {
        const rater = (r.raterName || '').toLowerCase();
        const staff = (r.staffName || '').toLowerCase();
        const code = (r.requestCode || '').toLowerCase();
        const comment = (r.comment || '').toLowerCase();
        const staffCmt = (r.staffComment || '').toLowerCase();
        return (
          rater.includes(q) ||
          staff.includes(q) ||
          code.includes(q) ||
          comment.includes(q) ||
          staffCmt.includes(q)
        );
      });
    }

    // 2. Lọc theo đối tượng (Scope: Tất cả | Gara | Thợ cứu hộ | Có nhận xét)
    if (scope === 'GARAGE') {
      if (stats.garageCommentCount > 0) {
        list = list.filter((r) => Boolean(r.comment && r.comment.trim()));
      }
    } else if (scope === 'STAFF') {
      if (stats.staffCommentCount > 0) {
        list = list.filter((r) => Boolean(r.staffComment && r.staffComment.trim()));
      } else {
        list = list.filter((r) => Boolean(r.staffName || r.staffId != null || r.staffStars != null));
      }
    } else if (scope === 'WITH_COMMENT') {
      list = list.filter((r) => Boolean((r.comment && r.comment.trim()) || (r.staffComment && r.staffComment.trim())));
    }

    // 3. Lọc theo khoảng thời gian (Time Range: Tất cả | Hôm nay | 1 tuần | 1 tháng)
    if (timeRange !== 'ALL') {
      const now = new Date();
      list = list.filter((r) => {
        if (!r.createdAt) return false;
        const itemDate = new Date(r.createdAt);
        if (isNaN(itemDate.getTime())) return false;

        if (timeRange === 'TODAY') {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          return itemDate >= startOfToday;
        }

        if (timeRange === '7_DAYS') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return itemDate >= sevenDaysAgo;
        }

        if (timeRange === '30_DAYS') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return itemDate >= thirtyDaysAgo;
        }

        return true;
      });
    }

    // 4. Lọc theo số sao
    if (selectedStar !== null) {
      list = list.filter((r) => {
        const targetStars = scope === 'STAFF' ? (r.staffStars || r.stars) : r.stars;
        return targetStars === selectedStar;
      });
    }

    // 5. Luôn sắp xếp đánh giá mới nhất lên đầu
    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return list;
  }, [ratings, searchQuery, selectedStar, scope, timeRange, stats]);

  const handleViewOrder = (requestId?: number) => {
    if (!requestId) return;
    router.push({
      pathname: '/garage-owner/order-detail',
      params: { id: String(requestId), from: 'reviews' },
    });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStar(null);
    setScope('ALL');
    setTimeRange('ALL');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Quản lý Đánh giá</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {garageInfo.name ? `${garageInfo.name} (${garageInfo.code})` : 'Phản hồi từ khách hàng'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onRefresh}
          style={styles.refreshBtn}
          activeOpacity={0.7}
          disabled={loading || refreshing}
        >
          <RotateCw size={19} color="#ea580c" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ea580c']} />
        }
      >
        {/* KPI Score Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.scoreRow}>
            {/* Cột điểm Gara */}
            <View style={styles.scoreCol}>
              <View style={styles.scoreHeaderBadge}>
                <Building2 size={13} color="#ea580c" strokeWidth={2.4} />
                <Text style={styles.scoreColTitle}>Điểm Gara</Text>
              </View>
              <Text style={styles.scoreBigNumber}>
                {stats.total > 0 ? stats.avgGarage.toFixed(1) : '--'}
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    color="#f59e0b"
                    fill={s <= Math.round(stats.avgGarage) ? '#f59e0b' : '#cbd5e1'}
                  />
                ))}
              </View>
              <Text style={styles.scoreSubText}>
                {stats.total > 0 ? `${stats.total} lượt đánh giá` : 'Chưa có dữ liệu'}
              </Text>
            </View>

            <View style={styles.scoreDivider} />

            {/* Cột điểm Thợ / Kỹ thuật viên */}
            <View style={styles.scoreCol}>
              <View style={[styles.scoreHeaderBadge, { backgroundColor: '#f0f9ff' }]}>
                <Wrench size={13} color="#0284c7" strokeWidth={2.4} />
                <Text style={[styles.scoreColTitle, { color: '#0369a1' }]}>Điểm Thợ</Text>
              </View>
              <Text style={[styles.scoreBigNumber, { color: '#0369a1' }]}>
                {stats.avgStaff > 0 ? stats.avgStaff.toFixed(1) : '--'}
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    color="#0284c7"
                    fill={s <= Math.round(stats.avgStaff) ? '#0284c7' : '#cbd5e1'}
                  />
                ))}
              </View>
              <Text style={styles.scoreSubText}>
                {stats.avgStaff > 0 ? 'Thái độ & Tay nghề' : 'Đang cập nhật'}
              </Text>
            </View>
          </View>

          {/* Thanh phân bổ tỉ lệ số sao */}
          {stats.total > 0 && (
            <View style={styles.distributionBox}>
              <Text style={styles.distTitle}>Phân bổ đánh giá theo số sao</Text>
              {[
                { star: 5, count: stats.fiveStar },
                { star: 4, count: stats.fourStar },
                { star: 3, count: stats.threeStar },
                { star: 2, count: stats.twoStar },
                { star: 1, count: stats.oneStar },
              ].map((item) => {
                const percent = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
                const isSelected = selectedStar === item.star;
                return (
                  <TouchableOpacity
                    key={item.star}
                    style={[styles.distRow, isSelected && styles.distRowActive]}
                    onPress={() => setSelectedStar(isSelected ? null : item.star)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.distLabelRow}>
                      <Text style={styles.distStarText}>{item.star}</Text>
                      <Star size={11} color="#f59e0b" fill="#f59e0b" />
                    </View>

                    <View style={styles.progressTrack}>
                      <View style={[styles.progressBar, { width: `${percent}%` }]} />
                    </View>

                    <Text style={styles.distCountText}>
                      {item.count} ({percent}%)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Thanh tìm kiếm */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBarInner}>
            <Search size={18} color="#ea580c" strokeWidth={2.4} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên khách, thợ, mã đơn, nội dung..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="never"
              autoCorrect={false}
            />
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchBtn}
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <X size={14} color="#64748b" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Scope Tabs (Tất cả | Gara | Thợ cứu hộ | Có nhận xét) */}
        <View style={styles.scopeTabsScrollWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopeTabsScroll}>
            <TouchableOpacity
              style={[styles.scopeTabPill, scope === 'ALL' && styles.scopeTabPillActive]}
              onPress={() => setScope('ALL')}
              activeOpacity={0.8}
            >
              <Text style={[styles.scopeTabPillText, scope === 'ALL' && styles.scopeTabPillTextActive]}>
                Tất cả ({stats.total})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.scopeTabPill, scope === 'GARAGE' && styles.scopeTabPillActive]}
              onPress={() => setScope('GARAGE')}
              activeOpacity={0.8}
            >
              <Text style={[styles.scopeTabPillText, scope === 'GARAGE' && styles.scopeTabPillTextActive]}>
                Gara ({stats.garageCommentCount > 0 ? stats.garageCommentCount : stats.total})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.scopeTabPill, scope === 'STAFF' && styles.scopeTabPillActive]}
              onPress={() => setScope('STAFF')}
              activeOpacity={0.8}
            >
              <Text style={[styles.scopeTabPillText, scope === 'STAFF' && styles.scopeTabPillTextActive]}>
                Thợ cứu hộ ({stats.staffCommentCount > 0 ? stats.staffCommentCount : stats.staffRatingsCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.scopeTabPill, scope === 'WITH_COMMENT' && styles.scopeTabPillActive]}
              onPress={() => setScope('WITH_COMMENT')}
              activeOpacity={0.8}
            >
              <Text style={[styles.scopeTabPillText, scope === 'WITH_COMMENT' && styles.scopeTabPillTextActive]}>
                Có nhận xét ({stats.withCommentsCount})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Hộp bộ lọc nhanh: Thời gian & Số sao (Thiết kế tinh gọn, tiện ích) */}
        <View style={styles.compactFilterCard}>
          {/* Hàng 1: Thời gian */}
          <View style={styles.compactFilterRow}>
            <View style={styles.filterRowLead}>
              <Calendar size={13} color="#ea580c" strokeWidth={2.3} />
              <Text style={styles.filterRowLeadText}>Thời gian:</Text>
            </View>
            <View style={styles.compactSegmentTrack}>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'TODAY', label: 'Hôm nay' },
                { key: '7_DAYS', label: '1 tuần' },
                { key: '30_DAYS', label: '1 tháng' },
              ].map((t) => {
                const active = timeRange === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.compactSegmentBtn, active && styles.compactSegmentBtnActive]}
                    onPress={() => setTimeRange(t.key as TimeRange)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.compactSegmentText, active && styles.compactSegmentTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Đường phân cách siêu mỏng */}
          <View style={styles.compactDivider} />

          {/* Hàng 2: Số sao */}
          <View style={styles.compactFilterRow}>
            <View style={styles.filterRowLead}>
              <Star size={13} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.filterRowLeadText}>Số sao:</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.starChipsScroll}>
              <TouchableOpacity
                style={[styles.miniStarChip, selectedStar === null && styles.miniStarChipActive]}
                onPress={() => setSelectedStar(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.miniStarChipText, selectedStar === null && styles.miniStarChipTextActive]}>
                  Tất cả
                </Text>
              </TouchableOpacity>
              {[5, 4, 3, 2, 1].map((s) => {
                const active = selectedStar === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.miniStarChip, active && styles.miniStarChipActive]}
                    onPress={() => setSelectedStar(active ? null : s)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.miniStarChipText, active && styles.miniStarChipTextActive]}>
                      {s}
                    </Text>
                    <Star
                      size={10.5}
                      color={active ? '#ea580c' : '#f59e0b'}
                      fill={active ? '#ea580c' : '#f59e0b'}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Header danh sách & Đặt lại bộ lọc */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listCountHeading}>
            {filteredRatings.length} đánh giá
            {searchQuery.trim() ? ` cho "${searchQuery}"` : ''}
          </Text>

          {(selectedStar !== null || scope !== 'ALL' || timeRange !== 'ALL' || searchQuery.trim().length > 0) && (
            <TouchableOpacity style={styles.resetFiltersBtn} onPress={resetFilters} activeOpacity={0.7}>
              <RotateCw size={11.5} color="#ea580c" strokeWidth={2.4} />
              <Text style={styles.resetFiltersText}>Đặt lại</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Danh sách thẻ đánh giá */}
        {loading && ratings.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text style={styles.loadingText}>Đang tải danh sách đánh giá...</Text>
          </View>
        ) : filteredRatings.length > 0 ? (
          filteredRatings.map((r) => {
            const dateStr = r.createdAt
              ? new Date(r.createdAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';

            const customerInitial = (r.raterName || 'K').charAt(0).toUpperCase();

            return (
              <View key={r.id} style={styles.reviewCard}>
                {/* Header đánh giá: Khách hàng + Thời gian + Mã đơn */}
                <View style={styles.cardHeader}>
                  <View style={styles.customerAvatar}>
                    <Text style={styles.avatarInitial}>{customerInitial}</Text>
                  </View>

                  <View style={styles.customerInfoCol}>
                    <Text style={styles.customerName}>{r.raterName || 'Khách hàng SRAS'}</Text>
                    <View style={styles.cardMetaRow}>
                      <Calendar size={11} color="#94a3b8" />
                      <Text style={styles.cardTimeText}>{dateStr}</Text>
                    </View>
                  </View>

                  {r.requestCode && (
                    <TouchableOpacity
                      style={styles.requestCodeBadge}
                      onPress={() => handleViewOrder(r.requestId)}
                      activeOpacity={0.7}
                    >
                      <FileText size={11} color="#ea580c" strokeWidth={2.4} />
                      <Text style={styles.requestCodeText}>#{r.requestCode}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Khối hiển thị sao & nhận xét theo Scope */}
                {scope === 'GARAGE' ? (
                  // 1. Chế độ xem riêng Gara
                  <>
                    <View style={styles.starsContainer}>
                      <View style={styles.starBadgeGroup}>
                        <Building2 size={13} color="#ea580c" strokeWidth={2.4} />
                        <Text style={styles.starGroupLabel}>Gara & Dịch vụ:</Text>
                        <View style={styles.starIconsRow}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={13}
                              color={s <= r.stars ? '#f59e0b' : '#e2e8f0'}
                              fill={s <= r.stars ? '#f59e0b' : 'none'}
                            />
                          ))}
                        </View>
                        <Text style={styles.starScorePill}>{r.stars}.0</Text>
                      </View>
                    </View>
                    {r.comment ? (
                      <View style={styles.commentBox}>
                        <Text style={styles.commentHeading}>Nhận xét về Gara:</Text>
                        <Text style={styles.commentBody}>"{r.comment}"</Text>
                      </View>
                    ) : (
                      <Text style={styles.noCommentText}>
                        Khách hàng chấm {r.stars} sao và không để lại lời nhận xét chữ.
                      </Text>
                    )}
                  </>
                ) : scope === 'STAFF' ? (
                  // 2. Chế độ xem riêng Thợ cứu hộ
                  <>
                    <View style={[styles.starsContainer, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd', borderWidth: 1 }]}>
                      <View style={styles.starBadgeGroup}>
                        <Wrench size={13} color="#0284c7" strokeWidth={2.4} />
                        <Text style={[styles.starGroupLabel, { color: '#0369a1' }]}>
                          Thợ phụ trách ({r.staffName || 'Kỹ thuật viên'}):
                        </Text>
                        <View style={styles.starIconsRow}>
                          {[1, 2, 3, 4, 5].map((s) => {
                            const stStars = r.staffStars || r.stars;
                            return (
                              <Star
                                key={s}
                                size={13}
                                color={s <= stStars ? '#0284c7' : '#e2e8f0'}
                                fill={s <= stStars ? '#0284c7' : 'none'}
                              />
                            );
                          })}
                        </View>
                        <Text style={[styles.starScorePill, styles.starScorePillStaff]}>
                          {(r.staffStars || r.stars)}.0
                        </Text>
                      </View>
                    </View>
                    {r.staffComment ? (
                      <View style={[styles.commentBox, styles.commentBoxStaff]}>
                        <Text style={[styles.commentHeading, { color: '#0369a1' }]}>
                          Nhận xét về thợ ({r.staffName}):
                        </Text>
                        <Text style={[styles.commentBody, { color: '#0c4a6e' }]}>"{r.staffComment}"</Text>
                      </View>
                    ) : (
                      <Text style={[styles.noCommentText, { color: '#0369a1' }]}>
                        Khách hàng chấm {(r.staffStars || r.stars)} sao cho thợ phụ trách và không để lại lời nhận xét chữ.
                      </Text>
                    )}
                  </>
                ) : (
                  // 3. Chế độ xem Tất cả hoặc Có nhận xét (Hiển thị đầy đủ Gara + Thợ)
                  <>
                    <View style={styles.starsContainer}>
                      {/* Sao Gara */}
                      <View style={styles.starBadgeGroup}>
                        <Text style={styles.starGroupLabel}>Gara:</Text>
                        <View style={styles.starIconsRow}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={13}
                              color={s <= r.stars ? '#f59e0b' : '#e2e8f0'}
                              fill={s <= r.stars ? '#f59e0b' : 'none'}
                            />
                          ))}
                        </View>
                        <Text style={styles.starScorePill}>{r.stars}.0</Text>
                      </View>

                      {/* Sao Thợ (nếu có) */}
                      {(r.staffName || r.staffStars != null) && (
                        <View style={styles.starBadgeGroup}>
                          <Text style={[styles.starGroupLabel, { color: '#0369a1' }]}>
                            Thợ ({r.staffName || 'KTV'}):
                          </Text>
                          <View style={styles.starIconsRow}>
                            {[1, 2, 3, 4, 5].map((s) => {
                              const st = r.staffStars || r.stars;
                              return (
                                <Star
                                  key={s}
                                  size={13}
                                  color={s <= st ? '#0284c7' : '#e2e8f0'}
                                  fill={s <= st ? '#0284c7' : 'none'}
                                />
                              );
                            })}
                          </View>
                          <Text style={[styles.starScorePill, styles.starScorePillStaff]}>
                            {(r.staffStars || r.stars)}.0
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Nhận xét Gara */}
                    {r.comment ? (
                      <View style={styles.commentBox}>
                        <Text style={styles.commentHeading}>Đánh giá Gara & Dịch vụ:</Text>
                        <Text style={styles.commentBody}>"{r.comment}"</Text>
                      </View>
                    ) : null}

                    {/* Nhận xét Thợ */}
                    {r.staffComment && r.staffName ? (
                      <View style={[styles.commentBox, styles.commentBoxStaff]}>
                        <Text style={[styles.commentHeading, { color: '#0369a1' }]}>
                          Đánh giá thợ ({r.staffName}):
                        </Text>
                        <Text style={[styles.commentBody, { color: '#0c4a6e' }]}>"{r.staffComment}"</Text>
                      </View>
                    ) : null}
                  </>
                )}

                {/* Nút xem chi tiết đơn cứu hộ (Bỏ gọi khách hàng theo yêu cầu) */}
                {r.requestId ? (
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.actionBtnFull}
                      onPress={() => handleViewOrder(r.requestId)}
                      activeOpacity={0.7}
                    >
                      <FileText size={13.5} color="#ea580c" strokeWidth={2.2} />
                      <Text style={styles.actionBtnFullText}>Xem chi tiết đơn</Text>
                      <ChevronRight size={14} color="#ea580c" strokeWidth={2.2} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <AlertCircle size={40} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>
              {ratings.length === 0
                ? 'Chưa có lượt đánh giá nào'
                : 'Không tìm thấy đánh giá phù hợp'}
            </Text>
            <Text style={styles.emptyDesc}>
              {ratings.length === 0
                ? 'Khách hàng sau khi hoàn tất cứu hộ sẽ để lại nhận xét và số sao đánh giá tại đây.'
                : 'Thử tìm với từ khóa khác hoặc xóa bộ lọc đang chọn.'}
            </Text>
            {ratings.length > 0 && (
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters} activeOpacity={0.8}>
                <Text style={styles.resetBtnText}>Đặt lại bộ lọc</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 1,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  overviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
    }),
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  scoreCol: {
    alignItems: 'center',
    flex: 1,
  },
  scoreHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
  },
  scoreColTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#c2410c',
  },
  scoreBigNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ea580c',
    lineHeight: 38,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  scoreSubText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 4,
  },
  scoreDivider: {
    width: 1,
    height: 70,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 8,
  },
  distributionBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  distTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3.5,
    paddingHorizontal: 6,
    borderRadius: 6,
    gap: 8,
  },
  distRowActive: {
    backgroundColor: '#fff7ed',
  },
  distLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 28,
    gap: 2,
  },
  distStarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  progressTrack: {
    flex: 1,
    height: 7,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 4,
  },
  distCountText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    width: 55,
    textAlign: 'right',
  },
  searchBarContainer: {
    marginBottom: 10,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0f172a',
    padding: 0,
  },
  clearSearchBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeTabsScrollWrap: {
    marginBottom: 10,
  },
  scopeTabsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  scopeTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
  },
  scopeTabPillActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  scopeTabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  scopeTabPillTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },

  // Hộp bộ lọc gọn: Thời gian & Số sao
  compactFilterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      default: {
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
      },
    }),
  },
  compactFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterRowLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 76,
  },
  filterRowLeadText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  compactSegmentTrack: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2.5,
  },
  compactSegmentBtn: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  compactSegmentBtnActive: {
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1.5,
      },
      default: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  compactSegmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  compactSegmentTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  compactDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  starChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniStarChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  miniStarChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  miniStarChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  miniStarChipTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },

  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  listCountHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  resetFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  resetFiltersText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },
  reviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      default: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  customerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '800',
    color: '#c2410c',
  },
  customerInfoCol: {
    flex: 1,
  },
  customerName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  cardTimeText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  requestCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  requestCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c2410c',
  },
  starsContainer: {
    flexDirection: 'column',
    gap: 6,
    backgroundColor: '#fafaf9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  starBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starBadgeGroupStaff: {},
  starGroupLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#854d0e',
  },
  starIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
  },
  starScorePill: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  starScorePillStaff: {
    color: '#0369a1',
    backgroundColor: '#e0f2fe',
  },
  commentBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ea580c',
  },
  commentBoxStaff: {
    backgroundColor: '#f0f9ff',
    borderLeftColor: '#0284c7',
  },
  commentHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9a3412',
    marginBottom: 2,
  },
  commentBody: {
    fontSize: 12.5,
    color: '#7c2d12',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  noCommentText: {
    fontSize: 11.5,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  cardActionsRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  actionBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  actionBtnFullText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c2410c',
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 10,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c2410c',
  },
});
