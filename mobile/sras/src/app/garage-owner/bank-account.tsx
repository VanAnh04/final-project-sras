import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  StatusBar,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useIsFocused, type Href } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ChevronDown, Lock } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  withdrawalApi,
  apiErrorMessage,
  isNetworkError,
  type Bank,
  type BankAccount,
  type BankAccountInput,
  type WithdrawalLimits,
} from '../../api/withdrawalApi';
import {
  HOLDER_PATTERN,
  bankInitials,
  formatDateTime,
  maskPhone,
  normalizeHolderName,
  otpErrorKind,
  parseCooldownSeconds,
} from '../../utils/withdraw';
import BankPickerModal from '../../components/withdraw/BankPickerModal';
import OtpCodeInput, { type OtpCodeInputHandle } from '../../components/withdraw/OtpCodeInput';
import { ScreenHeader, PrimaryButton, Notice, useCountdown } from '../../components/withdraw/ui';
import { C, R, NUM } from '../../components/withdraw/theme';

type Step = 'form' | 'otp';

// typed routes chưa sinh lại cho màn này
const WITHDRAW_BANK = { pathname: '/garage-owner/withdraw', params: { target: 'bank' } } as unknown as Href;
const DEFAULT_COOLDOWN = 60;

const groupDigits = (n: string) => n.replace(/(\d{4})(?=\d)/g, '$1 ');

export default function BankAccountScreen() {
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ next?: string }>();
  // Chỉ nhận đúng 'withdraw', giá trị khác bỏ qua [R12].
  const next = params.next === 'withdraw' ? 'withdraw' : null;

  // Không giữ STK vừa nhập trong bộ nhớ khi đã rời màn (màn trong Tabs không tự unmount).
  if (!isFocused) return <View style={styles.blank} />;
  return <BankAccountFlow key={next ?? 'settings'} next={next} />;
}

function BankAccountFlow({ next }: { next: 'withdraw' | null }) {
  const router = useRouter();
  const { user } = useAuth();

  const [current, setCurrent] = useState<BankAccount | null>(null);
  const [limits, setLimits] = useState<WithdrawalLimits | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [step, setStep] = useState<Step>('form');
  const [bank, setBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [holder, setHolder] = useState('');
  const [touched, setTouched] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [codeDiscarded, setCodeDiscarded] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const cooldown = useCountdown();

  // Object đã chuẩn hoá dùng để xin OTP — PUT phải gửi đúng object này [R6].
  const [pendingInput, setPendingInput] = useState<BankAccountInput | null>(null);
  const otpRef = useRef<OtpCodeInputHandle>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [needNewCode, setNeedNewCode] = useState(false);
  const [resending, setResending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const aliveRef = useRef(true);
  useEffect(
    () => () => {
      aliveRef.current = false;
    },
    []
  );

  useEffect(() => {
    let alive = true;
    // Hạn mức chỉ để lấy thời gian OTP — lỗi thì dùng mặc định, không chặn màn.
    Promise.all([withdrawalApi.getBankAccount(), withdrawalApi.getLimits().catch(() => null)])
      .then(([a, l]) => {
        if (!alive) return;
        setCurrent(a);
        setLimits(l);
      })
      .catch(() => {
        if (alive) setLoadFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const cooldownSeconds = limits?.otpResendCooldownSeconds ?? DEFAULT_COOLDOWN;
  const goParent = () => router.replace(next === 'withdraw' ? '/garage-owner/wallet' : '/garage-owner/settings');

  // ── Bước form ──

  const holderTrimmed = holder.trim();
  const errors = {
    bank: bank ? null : 'Chọn ngân hàng nhận tiền',
    number: /^\d{6,19}$/.test(accountNumber) ? null : 'Số tài khoản gồm 6–19 chữ số',
    holder: HOLDER_PATTERN.test(holderTrimmed) ? null : 'Nhập tên chủ tài khoản không dấu, đúng như trên thẻ',
  };
  const formValid = !errors.bank && !errors.number && !errors.holder;

  // Câu "Vui lòng đợi N giây…" hết hiệu lực khi đếm ngược về 0.
  const fresh = (msg: string | null) => (msg && parseCooldownSeconds(msg) != null && cooldown.left === 0 ? null : msg);

  const editField = (apply: () => void) => {
    apply();
    setFormError(null);
  };

  const requestOtp = async () => {
    setTouched(true);
    if (!formValid || !bank) return;
    const input: BankAccountInput = {
      bankCode: bank.bin,
      bankAccountNumber: accountNumber,
      bankAccountHolder: holderTrimmed,
    };
    setRequesting(true);
    setFormError(null);
    try {
      await withdrawalApi.requestBankAccountOtp(input);
      if (!aliveRef.current) return;
      cooldown.start(cooldownSeconds);
      setPendingInput(input);
      setOtpError(null);
      setNeedNewCode(false);
      setCodeDiscarded(false);
      setStep('otp');
    } catch (e) {
      if (!aliveRef.current) return;
      const msg = apiErrorMessage(e, 'Không gửi được mã xác thực. Vui lòng thử lại');
      const wait = parseCooldownSeconds(msg);
      if (wait) cooldown.start(wait);
      setFormError(msg);
    } finally {
      if (aliveRef.current) setRequesting(false);
    }
  };

  /** Sửa thông tin: mã gắn với bộ 3 thông tin ngân hàng nên phải nhận mã mới [R6]. */
  const backToForm = () => {
    setPendingInput(null);
    setOtpError(null);
    setCodeDiscarded(true);
    setStep('form');
  };

  // ── Bước OTP ──

  const finish = (saved: BankAccount) => {
    // Xoá STK vừa nhập khỏi state trước khi rời màn.
    setPendingInput(null);
    setAccountNumber('');
    setHolder('');
    if (saved.withdrawLockedUntil) {
      // Đổi STK đã có ⇒ khoá rút 24h: về ví, không sang trang rút [R7].
      Alert.alert(
        'Đã lưu tài khoản nhận tiền',
        `Để bảo vệ bạn, rút tiền tạm khoá đến ${formatDateTime(saved.withdrawLockedUntil)}.`
      );
      router.replace('/garage-owner/wallet');
    } else if (next === 'withdraw') {
      router.replace(WITHDRAW_BANK);
    } else {
      Alert.alert('Đã lưu tài khoản nhận tiền', 'Tiền rút sẽ được chuyển về tài khoản này.');
      router.replace('/garage-owner/settings');
    }
  };

  const submitOtp = async (code: string) => {
    if (submittingRef.current || !pendingInput || needNewCode) return;
    submittingRef.current = true;
    setSubmitting(true);
    setOtpError(null);
    try {
      // `code` chỉ là tham số, không nằm trong state nào [R10].
      const saved = await withdrawalApi.updateBankAccount(pendingInput, code);
      if (aliveRef.current) finish(saved);
    } catch (e) {
      if (!aliveRef.current) return;
      if (isNetworkError(e)) {
        setOtpError('Mất kết nối. Vui lòng kiểm tra lại tài khoản nhận tiền trước khi thử lại');
        otpRef.current?.reset();
      } else {
        const msg = apiErrorMessage(e, 'Không lưu được tài khoản. Vui lòng thử lại');
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
      }
    } finally {
      submittingRef.current = false;
      if (aliveRef.current) setSubmitting(false);
    }
  };

  const resendOtp = async () => {
    if (!pendingInput || resending || submitting || cooldown.left > 0) return;
    setResending(true);
    try {
      await withdrawalApi.requestBankAccountOtp(pendingInput);
      if (!aliveRef.current) return;
      cooldown.start(cooldownSeconds);
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

  // ── Quay lại (nút header + nút back Android) ──

  const handleBack = () => {
    if (submitting) return;
    if (step === 'otp') return backToForm();
    goParent();
  };

  const onHardwareBack = useEffectEvent(() => {
    if (pickerVisible) return false; // Modal tự xử lý nút back
    handleBack();
    return true;
  });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => onHardwareBack());
    return () => sub.remove();
  }, []);

  // ── Hiển thị ──

  let body: ReactNode;
  let footer: ReactNode = null;

  if (loadFailed) {
    body = (
      <View style={styles.stateBox}>
        <Text style={styles.stateTitle}>Không tải được tài khoản nhận tiền</Text>
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
  } else if (!current) {
    body = <LoadingSkeleton />;
  } else if (step === 'form') {
    const waiting = cooldown.left > 0;
    body = (
      <>
        {current.complete && (
          <>
            <Text style={styles.sectionLabel}>Tài khoản hiện tại</Text>
            <View style={styles.currentCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{bankInitials(current.bankName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.currentTitle} numberOfLines={1}>
                  {current.bankName}
                </Text>
                <Text style={[styles.currentSub, NUM]} numberOfLines={1}>
                  {(current.accountNumberMasked ?? '').replace(/\*/g, '•')} · {current.bankAccountHolder}
                </Text>
              </View>
            </View>
            {current.withdrawLockedUntil && (
              <View style={styles.gap12}>
                <Notice tone="warning">
                  <View style={styles.lockRow}>
                    <Lock size={14} color={C.warningInk} />
                    <Text style={styles.lockText}>
                      Rút tiền tạm khoá đến {formatDateTime(current.withdrawLockedUntil)}
                    </Text>
                  </View>
                </Notice>
              </View>
            )}
            <Text style={[styles.formHeading, styles.gap32]}>Đổi tài khoản nhận tiền</Text>
          </>
        )}
        {!current.complete && (
          <>
            <Text style={styles.formHeading}>Khai báo tài khoản nhận tiền</Text>
            <Text style={styles.formIntro}>Tiền rút từ ví tiền mặt sẽ được chuyển về tài khoản này.</Text>
          </>
        )}

        <Field label="Ngân hàng" error={touched ? errors.bank : null}>
          <Pressable
            onPress={() => setPickerVisible(true)}
            style={({ pressed }) => [
              styles.input,
              styles.selectRow,
              touched && errors.bank ? styles.inputError : null,
              pressed && styles.inputPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Chọn ngân hàng"
          >
            {bank ? (
              <>
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarSmallText}>{bankInitials(bank.shortName)}</Text>
                </View>
                <Text style={styles.selectText} numberOfLines={1}>
                  {bank.shortName} <Text style={styles.selectSub}>· {bank.name}</Text>
                </Text>
              </>
            ) : (
              <Text style={[styles.selectText, styles.placeholder]}>Chọn ngân hàng</Text>
            )}
            <ChevronDown size={18} color={C.faint} />
          </Pressable>
        </Field>

        <Field label="Số tài khoản" error={touched ? errors.number : null}>
          <TextInput
            value={accountNumber}
            onChangeText={(t) => editField(() => setAccountNumber(t.replace(/\D/g, '').slice(0, 19)))}
            keyboardType="number-pad"
            maxLength={19}
            placeholder="Nhập số tài khoản"
            placeholderTextColor={C.muted}
            autoCorrect={false}
            autoComplete="off"
            importantForAutofill="no"
            style={[styles.input, styles.inputText, NUM, touched && errors.number ? styles.inputError : null]}
          />
        </Field>

        <Field
          label="Tên chủ tài khoản"
          hint="Viết không dấu, đúng như tên in trên thẻ"
          error={touched ? errors.holder : null}
        >
          <TextInput
            value={holder}
            onChangeText={(t) => editField(() => setHolder(normalizeHolderName(t)))}
            maxLength={100}
            placeholder="VD: NGUYEN VAN A"
            placeholderTextColor={C.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            style={[styles.input, styles.inputText, touched && errors.holder ? styles.inputError : null]}
          />
        </Field>

        {codeDiscarded && (
          <View style={styles.gap16}>
            <Notice tone="neutral">Mã trước sẽ không dùng được, bạn cần nhận mã mới.</Notice>
          </View>
        )}
        {current.complete && (
          <View style={styles.gap16}>
            <Notice tone="warning">Đổi tài khoản sẽ tạm khoá rút tiền 24 giờ để bảo vệ bạn.</Notice>
          </View>
        )}
        {fresh(formError) && <Text style={styles.inlineError}>{formError}</Text>}
      </>
    );
    footer = (
      <PrimaryButton
        label={waiting ? `Tiếp tục (${cooldown.left}s)` : 'Tiếp tục'}
        onPress={requestOtp}
        disabled={waiting}
        busy={requesting}
      />
    );
  } else if (step === 'otp' && pendingInput) {
    const inputLocked = submitting || needNewCode || resending;
    body = (
      <>
        <View style={styles.otpSummary}>
          <View style={styles.otpSummaryHead}>
            <Text style={styles.sectionLabelFlat}>Tài khoản mới</Text>
            {!submitting && (
              <TouchableOpacity onPress={backToForm} hitSlop={8}>
                <Text style={styles.textLinkLabel}>Sửa thông tin</Text>
              </TouchableOpacity>
            )}
          </View>
          <SummaryRow label="Ngân hàng" value={bank?.shortName ?? pendingInput.bankCode} />
          <SummaryRow label="Số tài khoản" value={groupDigits(pendingInput.bankAccountNumber)} />
          <SummaryRow label="Chủ tài khoản" value={pendingInput.bankAccountHolder} />
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
            <Text style={styles.statusLineText}>Đang lưu tài khoản…</Text>
          </View>
        ) : fresh(otpError) ? (
          <Text style={styles.inlineError}>{otpError}</Text>
        ) : null}

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

        <Text style={styles.footNote}>
          Mã hết hạn sau {limits?.otpTtlMinutes ?? 5} phút · Không cung cấp mã cho bất kỳ ai, kể cả nhân viên SRAS
        </Text>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.ground} />
      <ScreenHeader title="Tài khoản nhận tiền" onBack={submitting ? undefined : handleBack} />
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

      <BankPickerModal
        visible={pickerVisible}
        selectedBin={bank?.bin}
        onSelect={(b) => {
          editField(() => setBank(b));
          setPickerVisible(false);
        }}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, NUM]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function LoadingSkeleton() {
  return (
    <View>
      <View style={[styles.skeleton, { width: 120, height: 13 }]} />
      <View style={[styles.skeleton, { height: 72, borderRadius: R.card, marginTop: 8 }]} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ marginTop: 24 }}>
          <View style={[styles.skeleton, { width: 100, height: 13 }]} />
          <View style={[styles.skeleton, { height: 48, borderRadius: R.control, marginTop: 8 }]} />
        </View>
      ))}
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
  gap12: { marginTop: 12 },
  gap16: { marginTop: 16 },
  gap32: { marginTop: 32 },
  sectionLabel: { fontSize: 13, color: C.muted, marginBottom: 8 },
  sectionLabelFlat: { fontSize: 13, color: C.muted },

  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.rule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '700', color: C.ink },
  currentTitle: { fontSize: 15, fontWeight: '600', color: C.ink },
  currentSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockText: { flex: 1, fontSize: 13, lineHeight: 19, color: C.warningInk },

  formHeading: { fontSize: 17, fontWeight: '700', color: C.ink },
  formIntro: { fontSize: 14, lineHeight: 21, color: C.muted, marginTop: 4 },
  field: { marginTop: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: C.ink, marginBottom: 8 },
  fieldHint: { marginTop: 6, fontSize: 13, lineHeight: 18, color: C.muted },
  fieldError: { marginTop: 6, fontSize: 13, lineHeight: 18, color: C.negative, fontWeight: '500' },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.control,
    paddingHorizontal: 14,
    backgroundColor: C.ground,
  },
  inputText: { fontSize: 16, color: C.ink },
  inputError: { borderColor: C.negative },
  inputPressed: { backgroundColor: C.well },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectText: { flex: 1, fontSize: 16, fontWeight: '500', color: C.ink },
  selectSub: { fontSize: 14, fontWeight: '400', color: C.muted },
  placeholder: { color: C.muted, fontWeight: '400' },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.rule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallText: { fontSize: 10, fontWeight: '700', color: C.ink },
  inlineError: { marginTop: 12, fontSize: 13, lineHeight: 18, color: C.negative, fontWeight: '500' },

  otpSummary: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: R.card, backgroundColor: C.well },
  otpSummaryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 6 },
  summaryLabel: { fontSize: 13, color: C.muted },
  summaryValue: { fontSize: 14, fontWeight: '600', color: C.ink, textAlign: 'right', flexShrink: 1 },
  textLinkLabel: { fontSize: 14, fontWeight: '600', color: C.accent },
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

  stateBox: { alignItems: 'flex-start', gap: 8, paddingTop: 8 },
  stateTitle: { fontSize: 17, fontWeight: '700', color: C.ink },
  stateText: { fontSize: 14, lineHeight: 21, color: C.muted },
  skeleton: { backgroundColor: C.skeleton, borderRadius: 6 },
});
