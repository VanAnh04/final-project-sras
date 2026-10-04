import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Check, Truck, Bike, Camera } from 'lucide-react-native';
import { garageApi } from '../../api/garageApi';
import { rescueApi } from '../../api/rescueApi';

const BRAND = '#ea580c';
const INK = '#0f172a';
const SUB = '#64748b';
const MUTE = '#94a3b8';
const LINE = '#e2e8f0';
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const KINDS = [
  { key: 'TOW_TRUCK', label: 'Xe kéo', Icon: Truck },
  { key: 'MOTORBIKE', label: 'Xe máy', Icon: Bike },
  { key: 'VAN', label: 'Xe tải nhỏ', Icon: Truck },
];

export default function AddVehicleScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null); // local uri
  const [plate, setPlate] = useState('');
  const [kind, setKind] = useState('TOW_TRUCK');
  const [saving, setSaving] = useState(false);

  const pickFrom = async (from: 'camera' | 'library') => {
    if (from === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Cần quyền camera', 'Hãy cấp quyền camera để chụp ảnh.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [4, 3] });
      if (!res.canceled) setImage(res.assets[0].uri);
    } else {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [4, 3] });
      if (!res.canceled) setImage(res.assets[0].uri);
    }
  };

  const pickImage = () =>
    Alert.alert('Ảnh xe cứu hộ', 'Chọn nguồn ảnh', [
      { text: 'Chụp ảnh', onPress: () => pickFrom('camera') },
      { text: 'Chọn từ thư viện', onPress: () => pickFrom('library') },
      { text: 'Huỷ', style: 'cancel' },
    ]);

  const submit = async () => {
    if (!image) return Alert.alert('Thiếu ảnh', 'Vui lòng thêm ảnh xe cứu hộ.');
    if (!plate.trim()) return Alert.alert('Thiếu biển số', 'Vui lòng nhập biển số xe.');
    let uploadedUrl: string | null = null;
    try {
      setSaving(true);
      uploadedUrl = await rescueApi.uploadPhoto(image);
      await garageApi.createVehicle(plate.trim().toUpperCase(), kind, uploadedUrl);
      Alert.alert('Đã thêm xe cứu hộ', `${plate.trim().toUpperCase()} đã sẵn sàng để điều phối.`, [
        { text: 'Xong', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      // Rollback nếu lưu DB thất bại để tránh để lại ảnh mồ côi
      if (uploadedUrl) {
        await rescueApi.deletePhoto(uploadedUrl);
      }
      Alert.alert('Không thêm được xe', e?.response?.data?.message || e?.message || 'Vui lòng thử lại.');
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
        <Text style={styles.headerTitle}>Thêm xe cứu hộ</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Ảnh xe */}
          <TouchableOpacity style={styles.imageWrap} onPress={pickImage} activeOpacity={0.85}>
            {image ? (
              <Image source={{ uri: image }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imageEmpty]}>
                <Camera size={28} color={MUTE} strokeWidth={2} />
                <Text style={styles.imageHint}>Thêm ảnh xe cứu hộ</Text>
              </View>
            )}
            {!!image && (
              <View style={styles.imageBadge}>
                <Camera size={13} color="#ffffff" strokeWidth={2.6} />
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Biển số xe</Text>
          <TextInput
            style={styles.plateInput}
            placeholder="51C-042.18"
            placeholderTextColor={MUTE}
            autoCapitalize="characters"
            autoCorrect={false}
            value={plate}
            onChangeText={setPlate}
          />

          <Text style={[styles.label, { marginTop: 24 }]}>Loại xe</Text>
          <View style={styles.kindGrid}>
            {KINDS.map((k) => {
              const on = kind === k.key;
              return (
                <TouchableOpacity key={k.key} style={[styles.kind, on && styles.kindOn]} onPress={() => setKind(k.key)} activeOpacity={0.8}>
                  <k.Icon size={22} color={on ? BRAND : SUB} strokeWidth={2} />
                  <Text style={[styles.kindText, on && styles.kindTextOn]}>{k.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.primary, saving && styles.primaryOff]} onPress={submit} disabled={saving} activeOpacity={0.9}>
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Check size={18} color="#ffffff" strokeWidth={2.6} />
                <Text style={styles.primaryText}>Lưu xe cứu hộ</Text>
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

  body: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 30 },

  imageWrap: { marginBottom: 22 },
  image: { width: '100%', height: 180, borderRadius: 16, backgroundColor: '#f1f5f9' },
  imageEmpty: { alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: LINE, borderStyle: 'dashed' },
  imageHint: { fontSize: 12.5, fontWeight: '700', color: MUTE },
  imageBadge: {
    position: 'absolute', right: 10, bottom: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#ffffff',
  },

  label: { fontSize: 12.5, fontWeight: '800', color: SUB, marginBottom: 8 },
  plateInput: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: LINE, borderRadius: 12,
    paddingHorizontal: 14, height: 54, fontSize: 20, color: INK, fontFamily: MONO, letterSpacing: 1.5, textAlign: 'center', fontWeight: '700',
  },

  kindGrid: { flexDirection: 'row', gap: 10 },
  kind: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18,
    borderWidth: 1.5, borderColor: LINE, borderRadius: 14, backgroundColor: '#ffffff',
  },
  kindOn: { borderColor: BRAND, backgroundColor: '#fff7ed' },
  kindText: { fontSize: 12.5, fontWeight: '800', color: SUB },
  kindTextOn: { color: '#c2410c' },

  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BRAND, borderRadius: 14, height: 54 },
  primaryOff: { opacity: 0.6 },
  primaryText: { fontSize: 15.5, fontWeight: '900', color: '#ffffff', letterSpacing: 0.2 },
});
