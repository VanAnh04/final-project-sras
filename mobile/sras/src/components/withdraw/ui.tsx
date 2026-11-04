import { useEffect, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { C, R } from './theme';

// Mảnh giao diện dùng chung cho các màn rút tiền.

export function ScreenHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.headerBtn} accessibilityLabel="Quay lại" hitSlop={6}>
          <ChevronLeft size={24} color={C.ink} />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerBtn} />
      )}
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerBtn} />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      style={({ pressed }) => [
        styles.primary,
        disabled && !busy && styles.primaryDisabled,
        pressed && !off && styles.primaryPressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text style={[styles.primaryText, disabled && styles.primaryTextDisabled]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.secondary, pressed && !disabled && styles.secondaryPressed]}
    >
      <Text style={[styles.secondaryText, disabled && styles.secondaryTextDisabled]}>{label}</Text>
    </Pressable>
  );
}

export function Notice({ tone = 'warning', children }: { tone?: 'warning' | 'negative' | 'neutral'; children: ReactNode }) {
  return (
    <View
      style={[
        styles.notice,
        tone === 'warning' && styles.noticeWarning,
        tone === 'negative' && styles.noticeNegative,
        tone === 'neutral' && styles.noticeNeutral,
      ]}
    >
      {typeof children === 'string' ? (
        <Text
          style={[
            styles.noticeText,
            tone === 'warning' && { color: C.warningInk },
            tone === 'negative' && { color: C.negativeInk },
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

/** Đếm ngược theo mốc thời gian thật (không lệch khi app vào nền). */
export function useCountdown() {
  const [deadline, setDeadline] = useState(0);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(next);
      if (next === 0) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [deadline]);

  const start = (seconds: number) => {
    setDeadline(Date.now() + seconds * 1000);
    setLeft(seconds);
  };

  return { left, start };
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: C.rule,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: C.ink },
  primary: {
    height: 52,
    borderRadius: R.pill,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryPressed: { backgroundColor: C.accentPressed },
  primaryDisabled: { backgroundColor: C.rule },
  primaryText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  primaryTextDisabled: { color: C.muted },
  secondary: {
    height: 48,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: C.ground,
  },
  secondaryPressed: { backgroundColor: C.well },
  secondaryText: { fontSize: 15, fontWeight: '600', color: C.ink },
  secondaryTextDisabled: { color: C.muted },
  notice: { padding: 12, borderRadius: R.control },
  noticeWarning: { backgroundColor: C.warningBg, borderWidth: 1, borderColor: C.warningBorder },
  noticeNegative: { backgroundColor: C.negativeBg },
  noticeNeutral: { backgroundColor: C.well },
  noticeText: { fontSize: 13, lineHeight: 19, color: C.ink },
});
