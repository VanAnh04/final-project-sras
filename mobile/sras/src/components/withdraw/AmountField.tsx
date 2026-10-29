import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { formatVnd } from '../../utils/rescueFee';
import { C, R, NUM } from './theme';

const MAX_DIGITS = 11; // < 100 tỷ — luôn nằm trong vùng an toàn của Number
const QUICK_AMOUNTS = [100_000, 500_000, 1_000_000];

const withDots = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

type Props = {
  value: number | null;
  onChange: (amount: number | null) => void;
  /** Giá trị của chip "Tất cả"; chip nhanh lớn hơn số này bị ẩn. */
  maxAll: number;
  label?: string;
  hint?: string;
  error?: string | null;
  editable?: boolean;
};

/** Ô nhập số tiền cỡ lớn: chỉ nhận số nguyên, tự chèn dấu chấm, tối đa 11 chữ số. */
export default function AmountField({
  value,
  onChange,
  maxAll,
  label = 'Số tiền',
  hint,
  error,
  editable = true,
}: Props) {
  const handleText = (text: string) => {
    const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS);
    onChange(digits ? Number(digits) : null);
  };

  const chips = QUICK_AMOUNTS.filter((a) => a <= maxAll);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, !!error && styles.inputRowError, !editable && styles.inputRowLocked]}>
        <TextInput
          value={value != null ? withDots(value) : ''}
          onChangeText={handleText}
          editable={editable}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={C.muted}
          maxLength={MAX_DIGITS + 4}
          accessibilityLabel={label}
          style={[styles.input, NUM]}
        />
        <Text style={styles.suffix}>đ</Text>
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}

      {editable && maxAll > 0 && (
        <View style={styles.chips}>
          {chips.map((a) => (
            <Chip key={a} label={withDots(a)} active={value === a} onPress={() => onChange(a)} />
          ))}
          <Chip
            label={`Tất cả · ${formatVnd(maxAll)}`}
            active={value === maxAll && !chips.includes(maxAll)}
            onPress={() => onChange(maxAll)}
          />
        </View>
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}
      accessibilityRole="button"
    >
      <Text style={[styles.chipText, active && styles.chipTextActive, NUM]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: C.ink,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.control,
    paddingHorizontal: 16,
    height: 64,
    backgroundColor: C.ground,
  },
  inputRowError: {
    borderColor: C.negative,
  },
  inputRowLocked: {
    backgroundColor: C.well,
  },
  input: {
    flex: 1,
    fontSize: 30,
    fontWeight: '700',
    color: C.ink,
    paddingVertical: 0,
  },
  suffix: {
    fontSize: 20,
    fontWeight: '500',
    color: C.muted,
    marginLeft: 6,
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: C.muted,
  },
  error: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: C.negative,
    fontWeight: '500',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: R.pill,
    backgroundColor: C.well,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.ink,
  },
  chipTextActive: {
    color: '#ffffff',
  },
});
