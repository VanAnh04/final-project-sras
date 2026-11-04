import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useIsFocused, type Href } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Landmark, CreditCard, CheckCircle2, AlertTriangle, ArrowDown } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  withdrawalApi,
  apiErrorMessage,
  isNetworkError,
  type BankAccount,
  type Withdrawal,
  type WithdrawalLimits,
} from '../../api/withdrawalApi';
import { garageWalletApi, type GarageWalletData } from '../../api/garageWalletApi';
import { formatVnd } from '../../utils/rescueFee';
import { maskPhone, otpErrorKind, parseCooldownSeconds } from '../../utils/withdraw';
import AmountField from '../../components/withdraw/AmountField';
import OtpCodeInput, { type OtpCodeInputHandle } from '../../components/withdraw/OtpCodeInput';
import WithdrawalStatusView from '../../components/withdraw/WithdrawalStatusView';
import SlideToConfirm from '../../components/SlideToConfirm';
import { ScreenHeader, PrimaryButton, SecondaryButton, Notice, useCountdown } from '../../components/withdraw/ui';
import { C, R, NUM } from '../../components/withdraw/theme';

type Target = 'bank' | 'credit';
type Step = 'amount' | 'confirmCredit' | 'otp' | 'result';
/** Sau lỗi mạng / 5xx: không biết server đã tạo lệnh hay chưa ⇒ khoá thao tác, dò lệnh. */
type Recovery = 'idle' | 'checking' | 'unknown';

const CREDIT_MIN = 10_000;
const RECOVERY_RETRIES = 3;
const RECOVERY_GAP_MS = 5000;

// typed routes chưa sinh lại cho các màn mới
const HISTORY = '/garage-owner/withdrawals' as unknown as Href;
const BANK_SETUP = { pathname: '/garage-owner/bank-account', params: { next: 'withdraw' } } as unknown as Href;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const maskedNumber = (a: BankAccount | null) => (a?.accountNumberMasked ?? '').replace(/\*/g, '•');
/** Không có response, hoặc 5xx ⇒ kết quả chưa xác định. */
const isUncertain = (e: any) => isNetworkError(e) || (e?.response?.status ?? 0) >= 500;

/** id lệnh rút mới nhất của gara (0 nếu chưa có lệnh nào) — mốc để nhận ra lệnh vừa gửi sau timeout. */
async function latestWithdrawalId(): Promise<number> {
  const page = await withdrawalApi.listWithdrawals(0, 1);
  return page.content.reduce((max, w) => Math.max(max, w.id), 0);
}

export default function WithdrawScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ target?: string }>();
  const target: Target | null = params.target === 'bank' || params.target === 'credit' ? params.target : null;

  useEffect(() => {
    if (isFocused && !target) router.replace('/garage-owner/wallet');
  }, [isFocused, target, router]);

  // Màn trong Tabs không tự unmount: chỉ dựng luồng khi đang hiển thị để mỗi lần vào là một luồng mới.
  if (!isFocused || !target) return <View style={styles.blank} />;
  return <WithdrawFlow key={target} target={target} />;
}

function WithdrawFlow({ target }: { target: Target }) {
  const router = useRouter();
  const { user } = useAuth();
  const isBank = target === 'bank';

  const [limits, setLimits] = useState<WithdrawalLimits | null>(null);
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [codeDiscarded, setCodeDiscarded] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const cooldown = useCountdown();

  // Bước OTP
  const otpRef = useRef<OtpCodeInputHandle>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [needNewCode, setNeedNewCode] = useState(false);
  const [resending, setResending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const latestIdRef = useRef<number | null>(null);
  const [recovery, setRecovery] = useState<Recovery>('idle');

  // Ví tín dụng
  const [creditError, setCreditError] = useState<string | null>(null);
  const [creditUncertain, setCreditUncertain] = useState(false);

  // Kết quả
  const [withdrawal, setWithdrawal] = useState<Withdrawal | null>(null);
  const [creditResult, setCreditResult] = useState<GarageWalletData | null>(null);

  const aliveRef = useRef(true);
  useEffect(
    () => () => {
      aliveRef.current = false;
    },
    []
  );

  useEffect(() => {
    let alive = true;
    const load = isBank
      ? Promise.all([withdrawalApi.getLimits(), withdrawalApi.getBankAccount()])
      : Promise.all([withdrawalApi.getLimits(), Promise.resolve(null)]);
    load
      .then(([l, a]) => {
        if (!alive) return;
        setLimits(l);
        setAccount(a);
      })
      .catch(() => {
        if (alive) setLoadFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [isBank, attempt]);

  const goWallet = () => router.replace('/garage-owner/wallet');
  const goHistory = () => router.replace(HISTORY);

  // locked: không cho gửi lại / sửa; busy: đang chờ server, không cho rời màn.
  const locked = submitting || recovery !== 'idle' || creditUncertain;
  const busy = submitting || recovery === 'checking';

  // ── Bước nhập số tiền ──

  const balance = limits?.withdrawableBalance ?? 0;
  const maxAll = !limits
    ? 0
    : isBank
      ? Math.max(0, Math.min(balance, limits.maxAmountPerRequest, limits.remainingAmountToday))
      : Math.max(0, balance);

  /** Kiểm tra trên máy cho phản hồi nhanh; server vẫn kiểm lại toàn bộ. `live` = hiện ngay khi gõ. */
  const validate = (a: number | null): { message: string; live: boolean } | null => {
    if (!limits) return null;
    if (a == null) return { message: isBank ? 'Nhập số tiền cần rút' : 'Nhập số tiền cần chuyển', live: false };
    if (isBank) {
      if (a < limits.minAmount) return { message: `Số tiền rút tối thiểu là ${formatVnd(limits.minAmount)}`, live: false };
      if (a > limits.maxAmountPerRequest)
        return { message: `Mỗi lệnh rút tối đa ${formatVnd(limits.maxAmountPerRequest)}`, live: true };
      if (a > limits.remainingAmountToday)
        return { message: `Hôm nay bạn còn rút được tối đa ${formatVnd(limits.remainingAmountToday)}`, live: true };
    } else if (a < CREDIT_MIN) {
      return { message: `Số tiền chuyển tối thiểu là ${formatVnd(CREDIT_MIN)}`, live: false };
    }
    if (a > balance) return { message: `Số dư có thể dùng (${formatVnd(balance)}) không đủ`, live: true };
    return null;
  };

  const invalid = validate(amount);
  // Câu "Vui lòng đợi N giây…" hết hiệu lực khi đếm ngược về 0.
  const fresh = (msg: string | null) => (msg && parseCooldownSeconds(msg) != null && cooldown.left === 0 ? null : msg);
  const amountError = fresh(serverError) ?? (invalid && (touched || invalid.live) ? invalid.message : null);

  const changeAmount = (a: number | null) => {
    setAmount(a);
    setServerError(null);
    setTouched(false);
  };

  const startOtpStep = () => {
    setOtpError(null);
    setNeedNewCode(false);
    setCodeDiscarded(false);
    setRecovery('idle');
    setStep('otp');
    // Chụp mốc trước khi gửi lệnh [R4]; lỗi thì để null, lúc gửi sẽ thử lại.
    latestIdRef.current = null;
    latestWithdrawalId()
      .then((id) => {
        // Không ghi đè mốc mà submitOtp đã tự chụp (response này có thể về muộn, sau khi lệnh đã tạo).
        if (latestIdRef.current === null) latestIdRef.current = id;
      })
      .catch(() => {});
  };

  const confirmAmount = async () => {
    setTouched(true);
    if (invalid || amount == null || !limits) return;
    if (!isBank) {
      setCreditError(null);
      setStep('confirmCredit');
      return;
    }
    setRequesting(true);
    setServerError(null);
    try {
      await withdrawalApi.requestWithdrawalOtp(amount);
      if (!aliveRef.current) return;
      cooldown.start(limits.otpResendCooldownSeconds);
      startOtpStep();
    } catch (e) {
      if (!aliveRef.current) return;
      const msg = apiErrorMessage(e, 'Không gửi được mã xác thực. Vui lòng thử lại');
      const wait = parseCooldownSeconds(msg);
      if (wait) cooldown.start(wait);
      setServerError(msg);
    } finally {
      if (aliveRef.current) setRequesting(false);
    }
  };

  /** Quay lại sửa số tiền. Từ bước OTP: mã cũ gắn với số tiền nên không dùng lại được [R6]. */
  const backToAmount = (fromOtp: boolean) => {
    setCodeDiscarded(fromOtp);
    setServerError(null);
    setOtpError(null);
    setStep('amount');
  };

  // ── Bước OTP ──

  const showResult = (w: Withdrawal) => {
    setWithdrawal(w);
    setStep('result');
  };

  const recover = async (sentAmount: number) => {
    setRecovery('checking');
    const baseline = latestIdRef.current;
    if (baseline !== null) {
      for (let i = 0; i <= RECOVERY_RETRIES; i++) {
        if (i > 0) await sleep(RECOVERY_GAP_MS);
        if (!aliveRef.current) return;
        try {
          const page = await withdrawalApi.listWithdrawals(0, 5);
          const found = page.content.find((w) => w.id > baseline && w.amount === sentAmount);
          if (found) {
            if (aliveRef.current) showResult(found);
            return;
          }
        } catch {
          // Chưa có mạng lại: thử lần sau.
        }
      }
    }
    // Không có mốc hoặc không tìm thấy: không đoán, chỉ cho mở lịch sử [R5].
    if (aliveRef.current) setRecovery('unknown');
  };

  const submitOtp = async (code: string) => {
    if (submittingRef.current || amount == null || needNewCode) return;
    submittingRef.current = true;
    setSubmitting(true);
    setOtpError(null);
    const sentAmount = amount;
    try {
      if (latestIdRef.current === null) {
        latestIdRef.current = await latestWithdrawalId().catch(() => null);
      }
      // `code` chỉ là tham số, không nằm trong state nào [R10].
      const w = await withdrawalApi.withdraw(sentAmount, code);
      if (aliveRef.current) showResult(w);
    } catch (e) {
      if (!aliveRef.current) return;
      if (isUncertain(e)) {
        // Giữ submittingRef = true: không cho gửi lại cho tới khi biết kết quả.
        setSubmitting(false);
        recover(sentAmount);
        return;
      }
      const msg = apiErrorMessage(e, 'Không gửi được lệnh rút tiền. Vui lòng thử lại');
      const kind = otpErrorKind(msg);
      setOtpError(msg);
      if (kind === 'wrong') {
        otpRef.current?.shake();
        otpRef.current?.reset();
      } else if (kind === 'renew') {
        setNeedNewCode(true);
      } else {
        otpRef.current?.reset();
      }
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const resendOtp = async () => {
    if (amount == null || !limits || resending || locked || cooldown.left > 0) return;
    setResending(true);
    try {
      await withdrawalApi.requestWithdrawalOtp(amount);
      if (!aliveRef.current) return;
      cooldown.start(limits.otpResendCooldownSeconds);
      setNeedNewCode(false);
      setOtpError(null);
      otpRef.current?.reset();
    } catch (e) {
      if (!aliveRef.current) return;
      const msg = apiErrorMessage(e, 'Không gửi được mã xác thực. Vui lòng thử lại');
      const wait = parseCooldownSeconds(msg);
      if (wait) cooldown.start(wait);
      setOtpError(msg);
    } finally {
      if (aliveRef.current) setResending(false);
    }
  };

  // ── Ví tín dụng ──

  const transferToCredit = async () => {
    if (submittingRef.current || amount == null) return;
    submittingRef.current = true;
    setSubmitting(true);
    setCreditError(null);
    try {
      const overview = await garageWalletApi.transferToCredit(amount);
      if (!aliveRef.current) return;
      setCreditResult(overview);
      setStep('result');
    } catch (e) {
      if (!aliveRef.current) return;
      if (isUncertain(e)) {
        // Endpoint không idempotent: không cho trượt lại khi chưa rõ tiền đã chuyển chưa.
        setCreditUncertain(true);
        return;
      }
      setCreditError(apiErrorMessage(e, 'Không chuyển được tiền. Vui lòng thử lại'));
      submittingRef.current = false;
    } finally {
      if (aliveRef.current) setSubmitting(false);
    }
  };

  // ── Quay lại (nút header + nút back Android) ──

  const handleBack = () => {
    if (step === 'result') return goWallet();
    if (busy) return;
    if (recovery === 'unknown') return goHistory();
    if (creditUncertain) return goWallet();
    if (step === 'otp' || step === 'confirmCredit') return backToAmount(step === 'otp');
    goWallet();
  };

  const onHardwareBack = useEffectEvent(() => {
    handleBack();
    return true;
  });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => onHardwareBack());
    return () => sub.remove();
  }, []);

  // ── Hiển thị ──

  const title =
    step === 'result'
      ? isBank
        ? 'Kết quả rút tiền'
        : 'Kết quả chuyển tiền'
      : isBank
        ? 'Rút về ngân hàng'
        : 'Chuyển vào ví tín dụng';
  const canGoBack = step === 'result' || !busy;

  const destination = isBank ? (
    <DestinationCard
      icon="bank"
      title={account?.bankName || 'Tài khoản ngân hàng'}
      lines={[`${maskedNumber(account)} · ${account?.bankAccountHolder ?? ''}`]}
    />
  ) : (
    <DestinationCard
      icon="credit"
      title="Ví tín dụng"
      lines={[`Số dư hiện tại ${formatVnd(limits?.creditBalance ?? 0)}`]}
    />
  );

  let body: ReactNode;
  let footer: ReactNode = null;

  if (loadFailed) {
    body = (
      <View style={styles.stateBox}>
        <Text style={styles.stateTitle}>Không tải được thông tin rút tiền</Text>
        <Text style={styles.stateText}>Kiểm tra kết nối mạng rồi thử lại.</Text>
      </View>
    );
    footer = (
      <PrimaryButton
        label="Thử lại"
        onPress={() => {
          setLoadFailed(false);
          setAttempt((n) => n + 1);
        }}
      />
    );
  } else if (!limits || (isBank && !account)) {
    body = <LoadingSkeleton />;
  } else if (isBank && (!account?.complete || limits.blockedReason) && step === 'amount') {
    body = (
      <View style={styles.stateBox}>
        <AlertTriangle size={28} color={C.warningInk} strokeWidth={1.8} />
        <Text style={styles.stateTitle}>Chưa thể rút tiền</Text>
        <Text style={styles.stateText}>
          {limits.blockedReason || 'Vui lòng khai báo tài khoản ngân hàng nhận tiền trước khi rút'}
        </Text>
      </View>
    );
    footer = !account?.complete ? (
      <View style={styles.footerStack}>
        <PrimaryButton
          label="Khai báo tài khoản nhận tiền"
          onPress={() => router.replace(BANK_SETUP)}
        />
        <SecondaryButton label="Về ví" onPress={goWallet} />
      </View>
    ) : (
      <PrimaryButton label="Về ví" onPress={goWallet} />
    );
  } else if (step === 'amount') {
    const hint = isBank
      ? `Tối thiểu ${formatVnd(limits.minAmount)} · Tối đa ${formatVnd(limits.maxAmountPerRequest)}/lệnh · Hôm nay còn ${formatVnd(
          limits.remainingAmountToday
        )} (${limits.remainingRequestsToday} lệnh)`
      : `Tối thiểu ${formatVnd(CREDIT_MIN)} · Ví tiền mặt hiện có ${formatVnd(balance)}`;
    const valid = amount != null && !invalid ? amount : null;
    body = (
      <>
        <Text style={styles.sectionLabel}>Tới</Text>
        {destination}
        <View style={styles.gap24} />
        <AmountField
          value={amount}
          onChange={changeAmount}
          maxAll={maxAll}
          label={isBank ? 'Số tiền rút' : 'Số tiền chuyển'}
          hint={hint}
          error={amountError}
        />
        {codeDiscarded && (
          <View style={styles.gap16}>
            <Notice tone="neutral">Mã hiện tại sẽ không dùng được, bạn cần nhận mã mới.</Notice>
          </View>
        )}
        {valid != null && (
          <View style={styles.summary}>
            <SummaryRow label="Ví tiền mặt còn lại" value={formatVnd(balance - valid)} />
            {isBank ? (
              <SummaryRow label="Thời gian nhận" value="Thường về trong vài phút" />
            ) : (
              <SummaryRow label="Ví tín dụng sau khi chuyển" value={formatVnd((limits.creditBalance ?? 0) + valid)} />
            )}
          </View>
        )}
      </>
    );
    const waiting = isBank && cooldown.left > 0;
    footer = (
      <PrimaryButton
        label={waiting ? `Xác nhận (${cooldown.left}s)` : 'Xác nhận'}
        onPress={confirmAmount}
        disabled={amount == null || waiting}
        busy={requesting}
      />
    );
  } else if (step === 'confirmCredit' && amount != null) {
    body = (
      <>
        <Text style={styles.sectionLabel}>Chuyển</Text>
        <Text style={[styles.bigAmount, NUM]}>{formatVnd(amount)}</Text>
        <View style={styles.flowCard}>
          <FlowRow label="Từ" title="Ví tiền mặt" value={`${formatVnd(balance)} → ${formatVnd(balance - amount)}`} />
          <View style={styles.flowArrow}>
            <ArrowDown size={16} color={C.faint} />
          </View>
          <FlowRow
            label="Tới"
            title="Ví tín dụng"
            value={`${formatVnd(limits.creditBalance ?? 0)} → ${formatVnd((limits.creditBalance ?? 0) + amount)}`}
          />
        </View>
        <View style={styles.gap16}>
          <Notice tone="warning">
            <Text style={styles.warnText}>
              Tiền chuyển vào ví tín dụng chỉ dùng để trừ hoa hồng,{' '}
              <Text style={styles.warnStrong}>không rút lại về ngân hàng được</Text>.
            </Text>
          </Notice>
        </View>
        {creditUncertain ? (
          <View style={styles.gap16}>
            <Notice tone="negative">
              Chưa xác định được kết quả do mất kết nối. Vui lòng kiểm tra số dư ví trước khi thử lại.
            </Notice>
          </View>
        ) : creditError ? (
          <Text style={styles.inlineError}>{creditError}</Text>
        ) : null}
        {!locked && (
          <TouchableOpacity onPress={() => backToAmount(false)} style={styles.textLink} hitSlop={6}>
            <Text style={styles.textLinkLabel}>Đổi số tiền</Text>
          </TouchableOpacity>
        )}
      </>
    );
    footer = creditUncertain ? (
      <PrimaryButton label="Về ví" onPress={goWallet} />
    ) : (
      <SlideToConfirm label={`Trượt để chuyển ${formatVnd(amount)}`} onConfirm={transferToCredit} busy={submitting} />
    );
  } else if (step === 'otp' && amount != null) {
    const inputLocked = locked || needNewCode || resending;
    body = (
      <>
        <View style={styles.otpSummary}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Rút về ngân hàng</Text>
            <Text style={[styles.otpAmount, NUM]}>{formatVnd(amount)}</Text>
            <Text style={[styles.otpDest, NUM]} numberOfLines={1}>
              {account?.bankName} {maskedNumber(account)}
            </Text>
          </View>
          {!locked && (
            <TouchableOpacity onPress={() => backToAmount(true)} hitSlop={8}>
              <Text style={styles.textLinkLabel}>Đổi số tiền</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.otpPrompt}>
          Nhập mã 6 số vừa gửi tới <Text style={[styles.otpPhone, NUM]}>{maskPhone(user?.phone)}</Text>
        </Text>
        <OtpCodeInput
          ref={otpRef}
          onComplete={submitOtp}
          error={!!fresh(otpError) && !needNewCode}
          disabled={inputLocked}
          busy={submitting}
        />

        {submitting ? (
          <View style={styles.statusLine}>
            <ActivityIndicator size="small" color={C.accent} />
            <Text style={styles.statusLineText}>Đang gửi lệnh tới ngân hàng, vui lòng không thoát ứng dụng…</Text>
          </View>
        ) : recovery === 'checking' ? (
          <View style={styles.statusLine}>
            <ActivityIndicator size="small" color={C.accent} />
            <Text style={styles.statusLineText}>Mất kết nối. Đang kiểm tra kết quả…</Text>
          </View>
        ) : recovery === 'unknown' ? (
          <View style={styles.gap16}>
            <Notice tone="negative">
              Chưa xác định được kết quả. Vui lòng kiểm tra Lịch sử rút tiền trước khi thử lại.
            </Notice>
          </View>
        ) : fresh(otpError) ? (
          <Text style={styles.inlineError}>{otpError}</Text>
        ) : null}

        {recovery === 'idle' && (
          <View style={styles.resendRow}>
            {cooldown.left > 0 ? (
              <Text style={[styles.resendWait, NUM]}>Gửi lại mã sau {cooldown.left}s</Text>
            ) : (
              <TouchableOpacity
                onPress={resendOtp}
                disabled={submitting || resending}
                hitSlop={8}
                style={[styles.resendBtn, needNewCode && styles.resendBtnStrong]}
              >
                {resending ? (
                  <ActivityIndicator size="small" color={needNewCode ? '#ffffff' : C.accent} />
                ) : (
                  <Text style={[styles.resendLabel, needNewCode && styles.resendLabelStrong]}>Gửi lại mã</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.footNote}>
          Mã hết hạn sau {limits.otpTtlMinutes} phút · Không cung cấp mã cho bất kỳ ai, kể cả nhân viên SRAS
        </Text>
      </>
    );
    if (recovery === 'unknown') footer = <PrimaryButton label="Mở Lịch sử rút tiền" onPress={goHistory} />;
  } else if (step === 'result') {
    if (isBank && withdrawal) {
      body = <WithdrawalStatusView withdrawal={withdrawal} />;
      footer = (
        <View style={styles.footerStack}>
          <PrimaryButton label="Về ví" onPress={goWallet} />
          <SecondaryButton label="Xem lịch sử rút tiền" onPress={goHistory} />
        </View>
      );
    } else if (creditResult && amount != null) {
      body = (
        <>
          <View style={styles.statusRow}>
            <CheckCircle2 size={22} color={C.positive} />
            <Text style={styles.statusTitle}>Đã chuyển vào ví tín dụng</Text>
          </View>
          <Text style={[styles.bigAmount, NUM]}>{formatVnd(amount)}</Text>
          <View style={styles.summary}>
            <SummaryRow label="Ví tiền mặt" value={formatVnd(creditResult.cashBalance ?? 0)} />
            <SummaryRow label="Ví tín dụng" value={formatVnd(creditResult.creditBalance ?? 0)} />
          </View>
        </>
      );
      footer = <PrimaryButton label="Về ví" onPress={goWallet} />;
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.ground} />
      <ScreenHeader title={title} onBack={canGoBack ? handleBack : undefined} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View key={step} entering={FadeIn.duration(180)}>
            {body}
          </Animated.View>
        </ScrollView>
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DestinationCard({ icon, title, lines }: { icon: 'bank' | 'credit'; title: string; lines: string[] }) {
  const Icon = icon === 'bank' ? Landmark : CreditCard;
  return (
    <View style={styles.destCard}>
      <View style={styles.destIcon}>
        <Icon size={20} color={C.ink} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.destTitle} numberOfLines={1}>
          {title}
        </Text>
        {lines.map((l) => (
          <Text key={l} style={[styles.destSub, NUM]} numberOfLines={1}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, NUM]}>{value}</Text>
    </View>
  );
}

function FlowRow({ label, title, value }: { label: string; title: string; value: string }) {
  return (
    <View style={styles.flowRow}>
      <Text style={styles.flowLabel}>{label}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.flowTitle}>{title}</Text>
        <Text style={[styles.flowValue, NUM]}>{value}</Text>
      </View>
    </View>
  );
}

function LoadingSkeleton() {
  return (
    <View>
      <View style={[styles.skeleton, { width: 40, height: 13 }]} />
      <View style={[styles.skeleton, { height: 72, borderRadius: R.card, marginTop: 8 }]} />
      <View style={[styles.skeleton, { width: 90, height: 14, marginTop: 24 }]} />
      <View style={[styles.skeleton, { height: 64, borderRadius: R.control, marginTop: 8 }]} />
      <View style={[styles.skeleton, { width: '80%', height: 13, marginTop: 10 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: C.ground },
  safe: { flex: 1, backgroundColor: C.ground },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: C.rule,
    backgroundColor: C.ground,
  },
  footerStack: { gap: 8 },
  gap16: { marginTop: 16 },
  gap24: { height: 24 },
  sectionLabel: { fontSize: 13, color: C.muted, marginBottom: 8 },

  destCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  destIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.well,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destTitle: { fontSize: 15, fontWeight: '600', color: C.ink },
  destSub: { fontSize: 13, color: C.muted, marginTop: 2 },

  summary: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: R.control,
    backgroundColor: C.well,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 8 },
  summaryLabel: { fontSize: 13, color: C.muted },
  summaryValue: { fontSize: 13, fontWeight: '600', color: C.ink, textAlign: 'right', flexShrink: 1 },

  bigAmount: { fontSize: 32, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginTop: 4 },
  flowCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  flowRow: { flexDirection: 'row', gap: 12 },
  flowLabel: { width: 28, fontSize: 13, color: C.muted, paddingTop: 1 },
  flowTitle: { fontSize: 15, fontWeight: '600', color: C.ink },
  flowValue: { fontSize: 13, color: C.muted, marginTop: 2 },
  flowArrow: { paddingLeft: 40, paddingVertical: 8 },
  warnText: { fontSize: 13, lineHeight: 19, color: C.warningInk },
  warnStrong: { fontWeight: '700' },

  textLink: { alignSelf: 'flex-start', marginTop: 16, paddingVertical: 6 },
  textLinkLabel: { fontSize: 14, fontWeight: '600', color: C.accent },
  inlineError: { marginTop: 12, fontSize: 13, lineHeight: 18, color: C.negative, fontWeight: '500' },

  otpSummary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: R.card,
    backgroundColor: C.well,
  },
  otpAmount: { fontSize: 24, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  otpDest: { fontSize: 13, color: C.muted, marginTop: 4 },
  otpPrompt: { fontSize: 15, lineHeight: 22, color: C.ink, marginTop: 28, marginBottom: 16 },
  otpPhone: { fontWeight: '600' },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  statusLineText: { flex: 1, fontSize: 13, lineHeight: 18, color: C.muted },
  resendRow: { flexDirection: 'row', marginTop: 20, minHeight: 36, alignItems: 'center' },
  resendWait: { fontSize: 14, color: C.muted },
  resendBtn: { height: 36, justifyContent: 'center', paddingHorizontal: 2 },
  resendBtnStrong: { backgroundColor: C.accent, borderRadius: R.pill, paddingHorizontal: 16 },
  resendLabel: { fontSize: 14, fontWeight: '600', color: C.accent },
  resendLabelStrong: { color: '#ffffff' },
  footNote: { marginTop: 24, fontSize: 12, lineHeight: 18, color: C.muted },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusTitle: { fontSize: 16, fontWeight: '600', color: C.ink },

  stateBox: { alignItems: 'flex-start', gap: 8, paddingTop: 8 },
  stateTitle: { fontSize: 17, fontWeight: '700', color: C.ink, marginTop: 4 },
  stateText: { fontSize: 14, lineHeight: 21, color: C.muted },
  skeleton: { backgroundColor: C.skeleton, borderRadius: 6 },
});
