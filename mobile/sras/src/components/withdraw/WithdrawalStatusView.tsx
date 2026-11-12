import { useEffect, useEffectEvent, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { withdrawalApi, type Withdrawal } from '../../api/withdrawalApi';
import { formatVnd } from '../../utils/rescueFee';
import { formatDateTime } from '../../utils/withdraw';
import { C, R, NUM } from './theme';

const POLL_MS = 3000;
const POLL_LIMIT_MS = 2 * 60 * 1000;

type Props = {
  withdrawal: Withdrawal;
  /** Gọi 1 lần khi lệnh chuyển từ PROCESSING sang SUCCESS / FAILED. */
  onSettled?: (w: Withdrawal) => void;
};

/**
 * Trạng thái một lệnh rút. Lệnh đang xử lý thì hỏi lại server mỗi 3 giây, tối đa 2 phút.
 * Đổi sang lệnh khác thì đổi `key` để làm mới state.
 */
export default function WithdrawalStatusView({ withdrawal, onSettled }: Props) {
  const [current, setCurrent] = useState(withdrawal);
  const [gaveUp, setGaveUp] = useState(false);
  const processing = current.displayStatus === 'PROCESSING';

  const settle = useEffectEvent((w: Withdrawal) => {
    setCurrent(w);
    if (w.displayStatus !== 'PROCESSING') onSettled?.(w);
  });

  useEffect(() => {
    if (!processing) return;
    const startedAt = Date.now();
    let stopped = false;
    const timer = setInterval(async () => {
      if (Date.now() - startedAt > POLL_LIMIT_MS) {
        clearInterval(timer);
        setGaveUp(true);
        return;
      }
      try {
        const fresh = await withdrawalApi.getWithdrawal(current.id);
        if (!stopped) settle(fresh);
      } catch {
        // Lỗi mạng tạm thời: lần hỏi sau thử lại.
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [processing, current.id]);

  return (
    <View>
      <View style={styles.statusRow}>
        {processing ? (
          <ActivityIndicator size="small" color={C.accent} />
        ) : current.displayStatus === 'SUCCESS' ? (
          <CheckCircle2 size={22} color={C.positive} />
        ) : (
          <XCircle size={22} color={C.negative} />
        )}
        <Text style={styles.statusTitle}>
          {processing
            ? 'Đang chuyển tiền tới ngân hàng'
            : current.displayStatus === 'SUCCESS'
              ? 'Đã chuyển tới ngân hàng'
              : 'Rút tiền không thành công'}
        </Text>
      </View>
      {processing && <Text style={styles.statusSub}>Số tiền đã được tạm giữ từ ví</Text>}

      <Text style={[styles.amount, NUM]}>{formatVnd(current.amount)}</Text>

      {current.displayStatus === 'FAILED' && !!current.failureMessage && (
        <View style={styles.failBox}>
          <Text style={styles.failText}>{current.failureMessage}</Text>
        </View>
      )}

      <View style={styles.well}>
        <Row label="Mã lệnh" value={current.transferCode} />
        <Row label="Tới" value={current.bankSnapshot || '—'} />
        <Row label="Tạo lúc" value={formatDateTime(current.createdAt)} />
        {!processing && <Row label="Hoàn tất lúc" value={formatDateTime(current.payoutSettledAt)} />}
      </View>

      {processing && gaveUp && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Ngân hàng đang xử lý lâu hơn thường lệ. Bạn có thể rời màn này, SRAS sẽ thông báo khi có kết quả.
          </Text>
        </View>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, NUM]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusTitle: { fontSize: 16, fontWeight: '600', color: C.ink, flexShrink: 1 },
  statusSub: { fontSize: 13, color: C.muted, marginTop: 4, marginLeft: 32 },
  amount: { fontSize: 32, fontWeight: '700', color: C.ink, marginTop: 16, letterSpacing: -0.5 },
  failBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: R.control,
    backgroundColor: C.negativeBg,
  },
  failText: { fontSize: 13, lineHeight: 19, color: C.negativeInk },
  well: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: R.control,
    backgroundColor: C.well,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 8 },
  rowLabel: { fontSize: 13, color: C.muted },
  rowValue: { fontSize: 13, fontWeight: '500', color: C.ink, flexShrink: 1, textAlign: 'right' },
  notice: {
    marginTop: 12,
    padding: 12,
    borderRadius: R.control,
    backgroundColor: C.warningBg,
    borderWidth: 1,
    borderColor: C.warningBorder,
  },
  noticeText: { fontSize: 13, lineHeight: 19, color: C.warningInk },
});
