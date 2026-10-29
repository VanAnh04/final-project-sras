import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { C, R, NUM } from './theme';

const LENGTH = 6;

export type OtpCodeInputHandle = {
  /** Xoá mã và mở bàn phím để nhập lại. */
  reset: () => void;
  focus: () => void;
  /** Rung ngang nhẹ — gọi mỗi lần nhập sai (kể cả sai liên tiếp). */
  shake: () => void;
};

type Props = {
  onComplete: (code: string) => void;
  /** Viền đỏ cho 6 ô. */
  error?: boolean;
  disabled?: boolean;
  /** Đang gửi mã: 6 ô hiện chấm, mã đã được xoá khỏi state. */
  busy?: boolean;
  autoFocus?: boolean;
  ref?: Ref<OtpCodeInputHandle>;
};

/**
 * 1 TextInput ẩn phủ lên 6 ô hiển thị — để autofill SMS (iOS oneTimeCode, Android sms-otp)
 * và dán mã hoạt động ổn định. Đủ 6 số thì gọi onComplete rồi xoá mã khỏi state ngay.
 */
export default function OtpCodeInput({
  onComplete,
  error = false,
  disabled = false,
  busy = false,
  autoFocus = true,
  ref,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const shakeX = useSharedValue(0);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        setCode('');
        inputRef.current?.focus();
      },
      focus: () => inputRef.current?.focus(),
      shake: () => {
        shakeX.set(
          withSequence(
            withTiming(-6, { duration: 50 }),
            withRepeat(withTiming(6, { duration: 80 }), 3, true),
            withTiming(0, { duration: 50 })
          )
        );
      },
    }),
    [shakeX]
  );

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.get() }] }));

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, LENGTH);
    if (digits.length === LENGTH) {
      setCode('');
      onComplete(digits);
      return;
    }
    setCode(digits);
  };

  const locked = disabled || busy;
  const activeIndex = focused && !locked ? Math.min(code.length, LENGTH - 1) : -1;

  return (
    <Pressable onPress={() => !locked && inputRef.current?.focus()} accessible={false}>
      <Animated.View style={[styles.row, shakeStyle]}>
        {Array.from({ length: LENGTH }).map((_, i) => {
          const char = busy ? '•' : code[i] ?? '';
          return (
            <View
              key={i}
              style={[
                styles.cell,
                char !== '' && styles.cellFilled,
                i === activeIndex && styles.cellActive,
                error && styles.cellError,
                locked && styles.cellLocked,
              ]}
            >
              <Text style={[styles.cellText, NUM]}>{char}</Text>
            </View>
          );
        })}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!locked}
          autoFocus={autoFocus}
          maxLength={LENGTH}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          importantForAutofill="yes"
          caretHidden
          selectionColor="transparent"
          accessibilityLabel="Mã OTP 6 số"
          style={styles.hiddenInput}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cell: {
    flex: 1,
    height: 56,
    maxWidth: 52,
    borderRadius: R.control,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    borderColor: '#cbd5e1',
  },
  cellActive: {
    borderColor: C.ink,
    borderWidth: 1.5,
  },
  cellError: {
    borderColor: C.negative,
    borderWidth: 1.5,
  },
  cellLocked: {
    backgroundColor: C.well,
  },
  cellText: {
    fontSize: 24,
    fontWeight: '600',
    color: C.ink,
  },
  // Phủ lên 6 ô để nhấn giữ có menu "Dán"; gần như trong suốt để chữ không hiện chồng.
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    color: 'transparent',
    opacity: 0.02,
    fontSize: 1,
  },
});
