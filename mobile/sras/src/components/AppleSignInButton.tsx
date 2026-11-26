import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface AppleSignInButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Bo góc / padding / margin cho khớp nút Google của từng màn. */
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Nút đăng nhập Apple: nền đen, chữ trắng theo hướng dẫn giao diện của Apple.
 * lucide-react-native không có logo thương hiệu nên logo vẽ bằng react-native-svg.
 */
export default function AppleSignInButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
}: AppleSignInButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, style, disabled && !loading && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <View style={styles.content}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path
              fill="#ffffff"
              d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
            />
          </Svg>
          <Text style={[styles.text, textStyle]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  text: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
