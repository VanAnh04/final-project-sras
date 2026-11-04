import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Landmark, CreditCard, ChevronRight, Lock, History, X } from 'lucide-react-native';
import { withdrawalApi, type BankAccount, type WithdrawalLimits } from '../../api/withdrawalApi';
import { formatVnd } from '../../utils/rescueFee';
import { C, R, NUM } from './theme';

export type WithdrawDestination = 'bank' | 'bank-setup' | 'credit' | 'history';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (dest: WithdrawDestination) => void;
};

/** Bottom sheet "Rút tiền": số dư rút được + chọn nơi nhận (ngân hàng / ví tín dụng). */
export default function WithdrawDestinationSheet({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng" />
        {visible && (
          <Animated.View entering={SlideInDown.duration(240)} style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Rút tiền</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeBtn} accessibilityLabel="Đóng">
                <X size={22} color={C.ink} />
              </TouchableOpacity>
            </View>
            <SheetBody onSelect={onSelect} />
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

function SheetBody({ onSelect }: { onSelect: Props['onSelect'] }) {
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [limits, setLimits] = useState<WithdrawalLimits | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([withdrawalApi.getBankAccount(), withdrawalApi.getLimits()])
      .then(([a, l]) => {
        if (!alive) return;
        setAccount(a);
        setLimits(l);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  if (failed) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>Không tải được thông tin rút tiền.</Text>
        <TouchableOpacity onPress={retry} hitSlop={8}>
          <Text style={styles.retry}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!account || !limits) {
    return (
      <View>
        <Text style={styles.balanceLabel}>Số dư rút được</Text>
        <View style={[styles.skeleton, { width: 180, height: 32, marginTop: 6 }]} />
        <View style={[styles.skeleton, { width: 220, height: 13, marginTop: 10 }]} />
        <View style={[styles.skeleton, styles.cardSkeleton, { marginTop: 24 }]} />
        <View style={[styles.skeleton, styles.cardSkeleton, { marginTop: 12 }]} />
      </View>
    );
  }

  const bankLocked = !!limits.blockedReason && account.complete;
  const bankLine = account.complete
    ? `${account.bankName ?? ''} ${(account.accountNumberMasked ?? '').replace(/\*/g, '•')} · ${account.bankAccountHolder ?? ''}`
    : 'Chưa liên kết tài khoản nhận tiền';

  return (
    <View>
      <Text style={styles.balanceLabel}>Số dư rút được</Text>
      <Text style={[styles.balance, NUM]}>{formatVnd(limits.withdrawableBalance)}</Text>
      <Text style={[styles.limitLine, NUM]}>
        Hôm nay còn rút về ngân hàng được {formatVnd(limits.remainingAmountToday)} · {limits.remainingRequestsToday} lệnh
      </Text>

      <View style={styles.options}>
        <Pressable
          disabled={bankLocked}
          onPress={() => onSelect(account.complete ? 'bank' : 'bank-setup')}
          style={({ pressed }) => [styles.option, bankLocked && styles.optionLocked, pressed && styles.optionPressed]}
          accessibilityRole="button"
          accessibilityState={{ disabled: bankLocked }}
        >
          <Landmark size={20} color={C.ink} strokeWidth={1.8} />
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Chuyển tới tài khoản ngân hàng</Text>
            <Text style={styles.optionSub} numberOfLines={1}>
              {bankLine}
            </Text>
            {bankLocked && (
              <View style={styles.lockRow}>
                <Lock size={13} color={C.warningInk} />
                <Text style={styles.lockText}>{limits.blockedReason}</Text>
              </View>
            )}
          </View>
          {!bankLocked && <ChevronRight size={18} color={C.faint} />}
        </Pressable>

        <Pressable
          onPress={() => onSelect('credit')}
          style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          accessibilityRole="button"
        >
          <CreditCard size={20} color={C.ink} strokeWidth={1.8} />
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Chuyển vào ví tín dụng</Text>
            <Text style={styles.optionSub}>Dùng để trừ hoa hồng · Không rút lại về ngân hàng được</Text>
          </View>
          <ChevronRight size={18} color={C.faint} />
        </Pressable>
      </View>

      <TouchableOpacity onPress={() => onSelect('history')} style={styles.historyLink} hitSlop={6}>
        <History size={16} color={C.ink} strokeWidth={1.8} />
        <Text style={styles.historyText}>Lịch sử rút tiền</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: {
    backgroundColor: C.ground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: C.ink },
  closeBtn: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  balanceLabel: { fontSize: 13, color: C.muted },
  balance: { fontSize: 32, fontWeight: '700', color: C.ink, marginTop: 2, letterSpacing: -0.5 },
  limitLine: { fontSize: 13, color: C.muted, marginTop: 4 },
  options: { gap: 12, marginTop: 24 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.ground,
  },
  optionLocked: { backgroundColor: C.well },
  optionPressed: { backgroundColor: C.well },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: C.ink },
  optionSub: { fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 18 },
  lockRow: { flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'flex-start' },
  lockText: { flex: 1, fontSize: 13, lineHeight: 18, color: C.warningInk },
  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 20, paddingVertical: 8 },
  historyText: { fontSize: 14, fontWeight: '600', color: C.ink },
  skeleton: { backgroundColor: C.skeleton, borderRadius: 6 },
  cardSkeleton: { height: 76, borderRadius: R.card },
  errorBox: { alignItems: 'flex-start', gap: 6, paddingVertical: 16 },
  errorText: { fontSize: 14, color: C.ink },
  retry: { fontSize: 14, fontWeight: '600', color: C.accent, paddingVertical: 6 },
});
