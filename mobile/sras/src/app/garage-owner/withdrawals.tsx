import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  BackHandler,
  Modal,
  Pressable,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useIsFocused } from 'expo-router';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { X, Landmark } from 'lucide-react-native';
import { withdrawalApi, type Withdrawal, type WithdrawalDisplayStatus, type WithdrawalPage } from '../../api/withdrawalApi';
import { formatVnd } from '../../utils/rescueFee';
import { formatDateTime } from '../../utils/withdraw';
import WithdrawalStatusView from '../../components/withdraw/WithdrawalStatusView';
import { ScreenHeader, PrimaryButton, Notice } from '../../components/withdraw/ui';
import { C, R, NUM } from '../../components/withdraw/theme';

const PAGE_SIZE = 10;

const STATUS: Record<WithdrawalDisplayStatus, { label: string; bg: string; ink: string }> = {
  PROCESSING: { label: 'Đang xử lý', bg: C.warningBg, ink: C.warningInk },
  SUCCESS: { label: 'Thành công', bg: C.positiveBg, ink: C.positiveInk },
  FAILED: { label: 'Thất bại', bg: C.negativeBg, ink: C.negativeInk },
};

/** id lấy từ push / deep link: chỉ nhận số nguyên dương [R12]. */
function parseId(raw?: string | string[]): number | null {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s || !/^\d{1,15}$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}

/** Gộp trang mới vào danh sách, bỏ trùng (lệnh mới tạo giữa 2 lần tải làm lệch trang). */
function mergeUnique(prev: Withdrawal[], more: Withdrawal[]): Withdrawal[] {
  const seen = new Set(prev.map((w) => w.id));
  return [...prev, ...more.filter((w) => !seen.has(w.id))];
}

export default function WithdrawalsScreen() {
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ id?: string }>();
  if (!isFocused) return <View style={styles.blank} />;
  return <WithdrawalsList openId={parseId(params.id)} />;
}

function WithdrawalsList({ openId }: { openId: number | null }) {
  const router = useRouter();

  const [items, setItems] = useState<Withdrawal[]>([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false); // chống tải trùng trang

  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const aliveRef = useRef(true);
  useEffect(
    () => () => {
      aliveRef.current = false;
    },
    []
  );

  const applyPage = (p: number, res: WithdrawalPage) => {
    setItems((prev) => (p === 0 ? res.content : mergeUnique(prev, res.content)));
    setPage(res.number);
    setLast(res.last);
    setLoadFailed(false);
  };

  const loadPage = async (p: number, mode: 'initial' | 'refresh' | 'more') => {
    if (loadingRef.current) {
      if (mode === 'refresh') setRefreshing(false);
      return;
    }
    loadingRef.current = true;
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'more') setLoadingMore(true);
    try {
      const res = await withdrawalApi.listWithdrawals(p, PAGE_SIZE);
      if (aliveRef.current) applyPage(p, res);
    } catch {
      if (aliveRef.current && p === 0) setLoadFailed(true);
    } finally {
      loadingRef.current = false;
      if (aliveRef.current) {
        setLoaded(true);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  };

  // Lần tải đầu: chỉ cập nhật state trong callback của request.
  const onFirstPage = useEffectEvent((res: WithdrawalPage | null) => {
    loadingRef.current = false;
    if (!aliveRef.current) return;
    if (res) applyPage(0, res);
    else setLoadFailed(true);
    setLoaded(true);
  });
  useEffect(() => {
    loadingRef.current = true;
    withdrawalApi.listWithdrawals(0, PAGE_SIZE).then(onFirstPage, () => onFirstPage(null));
  }, []);

  // Mở đúng lệnh khi vào từ push "Rút tiền thành công / thất bại".
  useEffect(() => {
    if (openId == null) return;
    withdrawalApi
      .getWithdrawal(openId)
      .then((w) => {
        if (!aliveRef.current) return;
        setLookupError(null);
        setSelected(w);
      })
      .catch((e) => {
        if (!aliveRef.current) return;
        setLookupError(
          e?.response?.status === 404 ? 'Không tìm thấy lệnh rút tiền' : 'Không tải được lệnh rút tiền. Vui lòng thử lại'
        );
      });
    // Xoá id khỏi params để bấm lại cùng push vẫn mở được sheet (không huỷ request đang chạy).
    router.setParams({ id: '' });
  }, [openId, router]);

  const goWallet = () => router.replace('/garage-owner/wallet');

  const onHardwareBack = useEffectEvent(() => {
    if (selected) return false; // Modal tự đóng qua onRequestClose
    goWallet();
    return true;
  });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => onHardwareBack());
    return () => sub.remove();
  }, []);

  const onSettled = (w: Withdrawal) => {
    setItems((prev) => prev.map((x) => (x.id === w.id ? w : x)));
  };

  const onEndReached = () => {
    if (!loaded || last || loadFailed) return;
    loadPage(page + 1, 'more');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.ground} />
      <ScreenHeader title="Lịch sử rút tiền" onBack={goWallet} />

      {!loaded ? (
        <View style={styles.list}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.row}>
              <View style={{ flex: 1, gap: 8 }}>
                <View style={[styles.skeleton, { width: 110, height: 16 }]} />
                <View style={[styles.skeleton, { width: '70%', height: 12 }]} />
              </View>
              <View style={[styles.skeleton, { width: 72, height: 22, borderRadius: R.pill }]} />
            </View>
          ))}
        </View>
      ) : loadFailed && items.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Không tải được lịch sử rút tiền</Text>
          <Text style={styles.stateText}>Kiểm tra kết nối mạng rồi thử lại.</Text>
          <View style={styles.stateAction}>
            <PrimaryButton label="Thử lại" onPress={() => loadPage(0, 'initial')} />
          </View>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(w) => String(w.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadPage(0, 'refresh')} tintColor={C.accent} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            lookupError ? (
              <View style={styles.headerNotice}>
                <Notice tone="negative">{lookupError}</Notice>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Landmark size={28} color={C.faint} strokeWidth={1.6} />
              <Text style={styles.emptyText}>Chưa có lệnh rút tiền nào</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={styles.more} size="small" color={C.accent} /> : null
          }
          renderItem={({ item }) => <WithdrawalRow item={item} onPress={() => setSelected(item)} />}
        />
      )}

      <DetailSheet withdrawal={selected} onClose={() => setSelected(null)} onSettled={onSettled} />
    </SafeAreaView>
  );
}

function WithdrawalRow({ item, onPress }: { item: Withdrawal; onPress: () => void }) {
  const s = STATUS[item.displayStatus] ?? STATUS.PROCESSING;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.amount, NUM]}>{formatVnd(item.amount)}</Text>
        <Text style={[styles.meta, NUM]} numberOfLines={1}>
          {item.transferCode} · {formatDateTime(item.createdAt)}
        </Text>
        {!!item.bankSnapshot && (
          <Text style={styles.meta} numberOfLines={1}>
            {item.bankSnapshot}
          </Text>
        )}
      </View>
      <View style={[styles.pill, { backgroundColor: s.bg }]}>
        <Text style={[styles.pillText, { color: s.ink }]}>{s.label}</Text>
      </View>
    </Pressable>
  );
}

function DetailSheet({
  withdrawal,
  onClose,
  onSettled,
}: {
  withdrawal: Withdrawal | null;
  onClose: () => void;
  onSettled: (w: Withdrawal) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!withdrawal} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng" />
        {withdrawal && (
          <Animated.View
            entering={SlideInDown.duration(240)}
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
          >
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Chi tiết lệnh rút</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeBtn} accessibilityLabel="Đóng">
                <X size={22} color={C.ink} />
              </TouchableOpacity>
            </View>
            <WithdrawalStatusView key={withdrawal.id} withdrawal={withdrawal} onSettled={onSettled} />
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: C.ground },
  safe: { flex: 1, backgroundColor: C.ground },
  list: { paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.rule,
  },
  rowPressed: { backgroundColor: C.well },
  amount: { fontSize: 16, fontWeight: '700', color: C.ink },
  meta: { fontSize: 13, color: C.muted, marginTop: 3 },
  pill: { paddingHorizontal: 10, height: 24, borderRadius: R.pill, justifyContent: 'center' },
  pillText: { fontSize: 12, fontWeight: '600' },
  headerNotice: { paddingTop: 16 },
  more: { paddingVertical: 16 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 64 },
  emptyText: { fontSize: 14, color: C.muted },
  skeleton: { backgroundColor: C.skeleton, borderRadius: 6 },
  stateBox: { paddingHorizontal: 20, paddingTop: 28, gap: 8 },
  stateTitle: { fontSize: 17, fontWeight: '700', color: C.ink },
  stateText: { fontSize: 14, lineHeight: 21, color: C.muted },
  stateAction: { marginTop: 12 },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: {
    backgroundColor: C.ground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  closeBtn: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
});
