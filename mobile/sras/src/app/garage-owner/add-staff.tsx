import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Camera, Eye, EyeOff, Check } from 'lucide-react-native';
import { garageApi } from '../../api/garageApi';
import { rescueApi } from '../../api/rescueApi';

const BRAND = '#ea580c';
const INK = '#0f172a';
const SUB = '#64748b';
const MUTE = '#94a3b8';
const LINE = '#e2e8f0';

export default function AddStaffScreen() {
  const router = useRouter();
  const [avatar, setAvatar] = useState<string | null>(null); // local uri
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickFrom = async (from: 'camera' | 'library') => {
    if (from === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Cần quyền camera', 'Hãy cấp quyền camera để chụp ảnh.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [1, 1] });
      if (!res.canceled) setAvatar(res.assets[0].uri);
    } else {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [1, 1] });
      if (!res.canceled) setAvatar(res.assets[0].uri);
    }
  };

  const pickAvatar = () =>
    Alert.alert('Ảnh nhân viên', 'Chọn nguồn ảnh', [
      { text: 'Chụp ảnh', onPress: () => pickFrom('camera') },
      { text: 'Chọn từ thư viện', onPress: () => pickFrom('library') },
      { text: 'Huỷ', style: 'cancel' },
    ]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async () => {
    if (!avatar) return Alert.alert('Thiếu ảnh', 'Vui lòng thêm ảnh mặt nhân viên.');
    if (!name.trim()) return Alert.alert('Thiếu tên', 'Vui lòng nhập tên nhân viên.');
    if (!phone.trim()) return Alert.alert('Thiếu số điện thoại', 'Vui lòng nhập số điện thoại.');
    if (!emailOk) return Alert.alert('Email không hợp lệ', 'Vui lòng nhập email đúng định dạng.');
    if (password.length < 6) return Alert.alert('Mật khẩu quá ngắn', 'Mật khẩu tối thiểu 6 ký tự.');

    try {
      setSaving(true);
      const avatarUrl = await rescueApi.uploadPhoto(avatar);
      await garageApi.createStaff({
        fullName: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
        avatarUrl,
      });
      Alert.alert('Đã thêm nhân viên', `${name.trim()} có thể đăng nhập bằng email và mật khẩu vừa tạo.`, [
        { text: 'Xong', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Không thêm được nhân viên', e?.response?.data?.message || e?.message || 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={INK} strokeWidth={2.6} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm nhân viên</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Ảnh mặt */}
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.85}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarEmpty]}>
                <Camera size={26} color={MUTE} strokeWidth={2} />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Camera size={13} color="#ffffff" strokeWidth={2.6} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>{avatar ? 'Chạm để đổi ảnh' : 'Thêm ảnh mặt nhân viên'}</Text>

          {/* Thông tin */}
          <Text style={styles.label}>Họ và tên</Text>
          <TextInput style={styles.input} placeholder="VD: Nguyễn Văn A" placeholderTextColor={MUTE} value={name} onChangeText={setName} />

          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput style={styles.input} placeholder="VD: 0988 123 456" placeholderTextColor={MUTE} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

          <View style={styles.sectionLine}>
            <Text style={styles.sectionText}>Tài khoản đăng nhập</Text>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="nhanvien@email.com"
            placeholderTextColor={MUTE}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <View style={styles.passRow}>
            <TextInput
              style={styles.passInput}
              placeholder="Tối thiểu 6 ký tự"
              placeholderTextColor={MUTE}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPass((p) => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {showPass ? <EyeOff size={18} color={SUB} strokeWidth={2.2} /> : <Eye size={18} color={SUB} strokeWidth={2.2} />}
            </TouchableOpacity>
          </View>
          <Text style={styles.note}>Nhân viên dùng email và mật khẩu này để đăng nhập ứng dụng (không cần OTP).</Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.primary, saving && styles.primaryOff]} onPress={submit} disabled={saving} activeOpacity={0.9}>
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Check size={18} color="#ffffff" strokeWidth={2.6} />
                <Text style={styles.primaryText}>Lưu nhân viên</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: INK },

  body: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },

  avatarWrap: { alignSelf: 'center' },
  avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#f1f5f9' },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: LINE, borderStyle: 'dashed' },
  avatarBadge: {
    position: 'absolute', right: 2, bottom: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#ffffff',
  },
  avatarHint: { alignSelf: 'center', fontSize: 12.5, fontWeight: '700', color: SUB, marginTop: 10, marginBottom: 22 },

  label: { fontSize: 12.5, fontWeight: '800', color: SUB, marginBottom: 7, marginTop: 14 },
  input: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: LINE, borderRadius: 12,
    paddingHorizontal: 14, height: 50, fontSize: 15, color: INK, fontWeight: '600',
  },
  passRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingHorizontal: 14, height: 50,
  },
  passInput: { flex: 1, fontSize: 15, color: INK, fontWeight: '600' },
  note: { fontSize: 12, color: MUTE, fontWeight: '600', lineHeight: 17, marginTop: 8 },

  sectionLine: { borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 26, paddingTop: 4 },
  sectionText: { fontSize: 11.5, fontWeight: '900', color: MUTE, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 8 },

  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BRAND, borderRadius: 14, height: 54 },
  primaryOff: { opacity: 0.6 },
  primaryText: { fontSize: 15.5, fontWeight: '900', color: '#ffffff', letterSpacing: 0.2 },
});
