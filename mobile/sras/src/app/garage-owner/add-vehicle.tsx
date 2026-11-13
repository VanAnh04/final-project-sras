import { useState, useEffect, useCallback } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Check, Truck, Bike, Camera } from 'lucide-react-native';
import { garageApi } from '../../api/garageApi';
import { rescueApi } from '../../api/rescueApi';

const BRAND = '#ea580c';
const INK = '#0f172a';
const SUB = '#64748b';
const MUTE = '#94a3b8';
const LINE = '#e2e8f0';
const DANGER = '#ef4444';
const SUCCESS = '#16a34a';
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const PLATE_REGEX = /^[1-9][0-9]\s*[- ]?\s*([A-Za-z]{1,2}|[A-Za-z][0-9])\s*[- ]?\s*([0-9]{3}\.[0-9]{2}|[0-9]{5}|[0-9]{2}\.[0-9]{2}|[0-9]{4})$/;

const formatPlate = (text: string) => {
  const trimmed = text.trim();
  const match = trimmed.match(/^([1-9][0-9])\s*[- ]?\s*([A-Za-z]{1,2}|[A-Za-z][0-9])\s*[- ]?\s*([0-9]{3}\.[0-9]{2}|[0-9]{5}|[0-9]{2}\.[0-9]{2}|[0-9]{4})$/i);
  if (!match) return trimmed.replace(/\./g, '').toUpperCase();
  const province = match[1];
  const series = match[2].toUpperCase();
  const numbers = match[3].replace(/\./g, '');
  return `${province}${series}-${numbers}`;
};

const KINDS = [
  { key: 'TOW_TRUCK', label: 'Xe kéo', Icon: Truck },
  { key: 'MOTORBIKE', label: 'Xe máy', Icon: Bike },
  { key: 'VAN', label: 'Xe tải nhỏ', Icon: Truck },
];

export default function AddVehicleScreen() {
  const router = useRouter();
  const { t } = useLocalSearchParams<{ t?: string }>();
  const [image, setImage] = useState<string | null>(null); // local uri
  const [plate, setPlate] = useState('');
  const [kind, setKind] = useState('TOW_TRUCK');
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setImage(null);
    setPlate('');
    setKind('TOW_TRUCK');
    setSaving(false);
  }, []);

  useEffect(() => {
    return () => {
      resetForm();
    };
  }, [resetForm]);

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
    const trimmedPlate = plate.trim();
    if (!trimmedPlate) return Alert.alert('Thiếu biển số', 'Vui lòng nhập biển số xe.');
    if (!PLATE_REGEX.test(trimmedPlate)) {
      return Alert.alert(
        'Biển số không hợp lệ',
        'Vui lòng nhập đúng định dạng biển số xe Việt Nam.\nVí dụ: 51C-04218, 29A-12345, 59P1-23456'
      );
    }

    let uploadedUrl: string | null = null;
    try {
      setSaving(true);
      uploadedUrl = await rescueApi.uploadPhoto(image);
      const createdPlate = formatPlate(trimmedPlate);
      await garageApi.createVehicle(createdPlate, kind, uploadedUrl);
      resetForm();
      Alert.alert('Đã thêm xe cứu hộ', `${createdPlate} đã sẵn sàng để điều phối.`, [
        {
          text: 'Xong',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/garage-owner/staff');
            }
          },
        },
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

  const trimmedPlate = plate.trim();
  const isPlateTouched = plate.length > 0;
  const isPlateValid = isPlateTouched && PLATE_REGEX.test(trimmedPlate);
  const isPlateInvalid = isPlateTouched && !isPlateValid;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => {
            resetForm();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/garage-owner/staff');
            }
          }} 
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
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

          <View style={styles.labelRow}>
            <Text style={styles.label}>Biển số xe</Text>
            {isPlateValid && <Text style={styles.validBadge}>Đúng định dạng ✓</Text>}
          </View>
          <TextInput
            style={[
              styles.plateInput,
              isPlateInvalid && styles.plateInputError,
              isPlateValid && styles.plateInputSuccess,
            ]}
            placeholder="51C-04218"
            placeholderTextColor={MUTE}
            autoCapitalize="characters"
            autoCorrect={false}
            value={plate}
            onChangeText={(txt) => setPlate(txt.toUpperCase())}
          />
          {isPlateInvalid ? (
            <Text style={styles.errorHint}>Biển số không hợp lệ. VD đúng: 51C-04218, 29A-12345, 59P1-23456</Text>
          ) : (
            <Text style={styles.plateHint}>Định dạng chuẩn: 51C-04218, 29A-12345, 59P1-23456</Text>
          )}

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

  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 12.5, fontWeight: '800', color: SUB },
  validBadge: { fontSize: 11.5, fontWeight: '700', color: SUCCESS },
  plateInput: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: LINE, borderRadius: 12,
    paddingHorizontal: 14, height: 54, fontSize: 20, color: INK, fontFamily: MONO, letterSpacing: 1.5, textAlign: 'center', fontWeight: '700',
  },
  plateInputError: { borderColor: DANGER, backgroundColor: '#fef2f2' },
  plateInputSuccess: { borderColor: SUCCESS, backgroundColor: '#f0fdf4' },
  errorHint: { fontSize: 11.5, fontWeight: '600', color: DANGER, marginTop: 6, lineHeight: 16 },
  plateHint: { fontSize: 11.5, fontWeight: '600', color: MUTE, marginTop: 6, lineHeight: 16 },

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
