import { useState, useEffect, useCallback, useRef } from 'react';
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
  BackHandler,
} from 'react-native';
import { Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Check, Truck, Bike, Camera, Sparkles, AlertTriangle, XCircle, CheckCircle2, RefreshCw } from 'lucide-react-native';
import { garageApi } from '../../api/garageApi';
import { rescueApi } from '../../api/rescueApi';
import { aiVerifyApi, VehiclePhotoAnalysisResult } from '../../api/aiVerifyApi';
import {
  VehicleSaveConfirmModal,
  VehicleNoticeModal,
} from '../../components/VehicleSaveModal';

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

const normalizePlateStr = (s: string) => s.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

const isPlateMatch = (inputPlate: string, detectedPlate?: string) => {
  if (!detectedPlate || !inputPlate) return true;
  const p1 = normalizePlateStr(inputPlate);
  const p2 = normalizePlateStr(detectedPlate);
  if (!p1 || !p2) return true;
  return p1 === p2 || p1.includes(p2) || p2.includes(p1);
};

const isKindMatch = (selectedKind: string | null, detectedKind?: string) => {
  if (!selectedKind || !detectedKind) return true;
  if (selectedKind === detectedKind) return true;
  if (
    (selectedKind === 'TOW_TRUCK' && detectedKind === 'VAN') ||
    (selectedKind === 'VAN' && detectedKind === 'TOW_TRUCK')
  ) {
    return true;
  }
  return false;
};

const KINDS = [
  { key: 'TOW_TRUCK', label: 'Xe kéo', Icon: Truck },
  { key: 'MOTORBIKE', label: 'Xe máy', Icon: Bike },
  { key: 'VAN', label: 'Xe tải nhỏ', Icon: Truck },
];

export default function AddVehicleScreen() {
  const router = useRouter();
  const { t, from } = useLocalSearchParams<{ t?: string; from?: string }>();
  const [image, setImage] = useState<string | null>(null); // local uri
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [plate, setPlate] = useState('');
  const [kind, setKind] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isSubmittingRef = useRef(false);
  const [aiChecking, setAiChecking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<VehiclePhotoAnalysisResult | null>(null);

  // Modal xác nhận trước khi lưu
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  // Modal cảnh báo / lỗi đồng bộ
  const [noticeModal, setNoticeModal] = useState<{
    visible: boolean;
    type?: 'WARNING' | 'DANGER' | 'INFO';
    title: string;
    message: string;
    primaryBtnText?: string;
    secondaryBtnText?: string;
    onPrimaryPress?: () => void;
    onSecondaryPress?: () => void;
  }>({
    visible: false,
    type: 'WARNING',
    title: '',
    message: '',
  });

  const resetForm = useCallback(() => {
    isSubmittingRef.current = false;
    setImage(null);
    setUploadedUrl(null);
    setPlate('');
    setKind(null);
    setSaving(false);
    setAiChecking(false);
    setAiError(null);
    setAiResult(null);
    setConfirmModalVisible(false);
    setNoticeModal((prev) => ({ ...prev, visible: false }));
  }, []);

  const goBackToStaff = useCallback(() => {
    resetForm();
    router.replace({
      pathname: '/garage-owner/staff',
      params: { from: from || 'settings', tab: 'vehicle' },
    });
  }, [from, resetForm, router]);

  useEffect(() => {
    const onBackPress = () => {
      goBackToStaff();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [goBackToStaff]);

  useEffect(() => {
    return () => {
      resetForm();
    };
  }, [resetForm]);

  const runAiVerification = async (localUri: string, isRetry: boolean = false) => {
    setImage(localUri);
    setAiResult(null);
    setAiError(null);
    setAiChecking(true);
    let uploaded: string | null = isRetry ? uploadedUrl : null;
    try {
      if (!uploaded) {
        uploaded = await rescueApi.uploadPhoto(localUri);
        setUploadedUrl(uploaded);
      }
      const res = await aiVerifyApi.verifyVehiclePhoto(uploaded);
      setAiResult(res);

      if (res.detectedPlate) {
        setPlate(formatPlate(res.detectedPlate));
      }
      if (res.detectedKind && ['TOW_TRUCK', 'MOTORBIKE', 'VAN'].includes(res.detectedKind)) {
        setKind(res.detectedKind);
      }

      if (!res.vehiclePresent || res.status === 'REJECTED' || res.isScreenCapture || res.isRescueVehicle === false) {
        setNoticeModal({
          visible: true,
          type: 'DANGER',
          title: 'Ảnh không hợp lệ',
          message: res.isScreenCapture
            ? 'AI phát hiện ảnh chụp lại từ màn hình thiết bị khác (nghi vấn giả mạo phương tiện). Vui lòng chụp trực tiếp xe cứu hộ thực tế tại gara.'
            : res.isRescueVehicle === false
            ? res.message || 'Phương tiện trong ảnh là xe ô tô cá nhân / không phải xe cứu hộ chuyên dụng của Gara.'
            : res.message || 'AI phát hiện ảnh không phải xe cứu hộ hợp lệ. Vui lòng chụp rõ phương tiện cứu hộ thực tế.',
          primaryBtnText: 'Chụp ảnh khác',
          onPrimaryPress: pickImage,
        });
      }
    } catch (err: any) {
      console.warn('Lỗi phân tích AI xe cứu hộ:', err);
      const isTimeout =
        err?.code === 'ECONNABORTED' ||
        (err?.message && (err.message.toLowerCase().includes('timeout') || err.message.includes('30000ms')));
      const errMsg = isTimeout
        ? 'Thời gian phân tích AI bị gián đoạn do mạng chậm hoặc máy chủ AI đang tải. Bạn có thể nhấn "Thử lại phân tích" hoặc nhập biển số và loại xe thủ công.'
        : err?.response?.data?.message || err?.message || 'Không thể kết nối máy chủ phân tích AI';
      setAiError(errMsg);
    } finally {
      setAiChecking(false);
    }
  };

  const pickFrom = async (from: 'camera' | 'library') => {
    if (from === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setNoticeModal({
          visible: true,
          type: 'WARNING',
          title: 'Cần quyền camera',
          message: 'Hãy cấp quyền camera trong cài đặt thiết bị để chụp ảnh trực tiếp.',
          primaryBtnText: 'Đã hiểu',
        });
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [4, 3] });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setUploadedUrl(null);
        runAiVerification(res.assets[0].uri);
      }
    } else {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [4, 3] });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setUploadedUrl(null);
        runAiVerification(res.assets[0].uri);
      }
    }
  };

  const pickImage = () =>
    Alert.alert('Ảnh xe cứu hộ', 'Chọn nguồn ảnh phương tiện', [
      { text: 'Chụp ảnh thực tế', onPress: () => pickFrom('camera') },
      { text: 'Chọn từ thư viện', onPress: () => pickFrom('library') },
      { text: 'Huỷ', style: 'cancel' },
    ]);

  // Thực hiện lưu phương tiện khi người dùng xác nhận trên Modal
  const executeSaveVehicle = async () => {
    if (saving || isSubmittingRef.current) return;
    const trimmedPlate = plate.trim();
    const createdPlate = formatPlate(trimmedPlate);
    let finalUploadedUrl: string | null = uploadedUrl;
    isSubmittingRef.current = true;
    try {
      setSaving(true);
      if (!finalUploadedUrl && image) {
        finalUploadedUrl = await rescueApi.uploadPhoto(image);
        setUploadedUrl(finalUploadedUrl);
      }
      await garageApi.createVehicle(createdPlate, kind!, finalUploadedUrl || undefined);
      setConfirmModalVisible(false);
      goBackToStaff();
    } catch (e: any) {
      if (finalUploadedUrl && finalUploadedUrl !== uploadedUrl) {
        await rescueApi.deletePhoto(finalUploadedUrl);
      }
      setConfirmModalVisible(false);
      setNoticeModal({
        visible: true,
        type: 'DANGER',
        title: 'Không thêm được xe',
        message: e?.response?.data?.message || e?.message || 'Có lỗi xảy ra khi lưu phương tiện, vui lòng thử lại.',
        primaryBtnText: 'Đã hiểu',
      });
    } finally {
      isSubmittingRef.current = false;
      setSaving(false);
    }
  };

  const submit = () => {
    if (saving || isSubmittingRef.current) return;

    if (!image) {
      return setNoticeModal({
        visible: true,
        type: 'WARNING',
        title: 'Thiếu ảnh xe cứu hộ',
        message: 'Vui lòng thêm ảnh phương tiện cứu hộ thực tế tại Gara.',
        primaryBtnText: 'Thêm ảnh ngay',
        onPrimaryPress: pickImage,
      });
    }

    if (aiChecking) {
      return setNoticeModal({
        visible: true,
        type: 'INFO',
        title: 'AI đang phân tích ảnh',
        message: 'Hệ thống đang kiểm tra ảnh xe cứu hộ, vui lòng chờ trong giây lát...',
        primaryBtnText: 'Đã hiểu',
      });
    }

    // Chặn nếu ảnh chưa được xác thực AI thành công
    if (!aiResult) {
      return setNoticeModal({
        visible: true,
        type: 'WARNING',
        title: 'Chưa xác thực AI',
        message: aiError
          ? `Ảnh xe chưa được AI xác minh thành công (${aiError}).\n\nVui lòng bấm "Phân tích lại" để AI kiểm tra trước khi lưu.`
          : 'Hệ thống cần AI phân tích ảnh xe cứu hộ trước khi lưu. Vui lòng bấm "Phân tích lại".',
        primaryBtnText: 'Phân tích lại',
        secondaryBtnText: 'Đóng',
        onPrimaryPress: () => runAiVerification(image),
      });
    }

    // 1. Chặn nếu ảnh không phải phương tiện giao thông hoặc bị AI từ chối (hoặc chụp lại từ màn hình hoặc không phải xe cứu hộ)
    if (!aiResult.vehiclePresent || aiResult.status === 'REJECTED' || aiResult.isScreenCapture || aiResult.isRescueVehicle === false) {
      return setNoticeModal({
        visible: true,
        type: 'DANGER',
        title: 'Ảnh không hợp lệ',
        message: aiResult.isScreenCapture
          ? 'AI phát hiện ảnh chụp lại từ màn hình thiết bị khác (nghi vấn giả mạo phương tiện). Vui lòng chụp trực tiếp xe cứu hộ thực tế tại gara để lưu.'
          : aiResult.isRescueVehicle === false
          ? aiResult.message || 'Phương tiện trong ảnh là xe ô tô cá nhân / không phải xe cứu hộ chuyên dụng của Gara.'
          : aiResult.message || 'AI phát hiện ảnh không phải xe cứu hộ hợp lệ. Vui lòng chụp rõ xe cứu hộ thực tế để lưu.',
        primaryBtnText: 'Chụp ảnh khác',
        secondaryBtnText: 'Đóng',
        onPrimaryPress: pickImage,
      });
    }

    const trimmedPlate = plate.trim();
    if (!trimmedPlate) {
      return setNoticeModal({
        visible: true,
        type: 'WARNING',
        title: 'Thiếu biển số xe',
        message: 'Vui lòng nhập biển số xe cứu hộ.',
        primaryBtnText: 'Đã hiểu',
      });
    }

    if (!PLATE_REGEX.test(trimmedPlate)) {
      return setNoticeModal({
        visible: true,
        type: 'WARNING',
        title: 'Biển số không hợp lệ',
        message: 'Vui lòng nhập đúng định dạng biển số xe Việt Nam.\nVí dụ: 51C-04218, 29A-12345, 59P1-23456',
        primaryBtnText: 'Đã hiểu',
      });
    }

    if (!kind) {
      return setNoticeModal({
        visible: true,
        type: 'WARNING',
        title: 'Thiếu loại xe',
        message: 'Vui lòng chọn loại phương tiện cứu hộ (Xe kéo, Xe máy, Xe tải nhỏ).',
        primaryBtnText: 'Đã hiểu',
      });
    }

    // 2. Chặn nếu loại xe chọn không khớp với ảnh (VD: Chọn xe kéo nhưng ảnh là xe máy)
    if (aiResult?.detectedKind && !isKindMatch(kind, aiResult.detectedKind)) {
      const kindLabel = KINDS.find((k) => k.key === kind)?.label || kind;
      const detectedLabel =
        KINDS.find((k) => k.key === aiResult.detectedKind)?.label ||
        aiResult.detectedKindDescription ||
        aiResult.detectedKind;
      return setNoticeModal({
        visible: true,
        type: 'WARNING',
        title: 'Loại xe không khớp',
        message: `Bạn đang chọn loại xe là "${kindLabel}" nhưng AI phát hiện ảnh chụp là "${detectedLabel}".\n\nVui lòng chọn đúng loại phương tiện để hệ thống điều phối cứu hộ chính xác.`,
        primaryBtnText: 'Đổi sang ' + detectedLabel,
        secondaryBtnText: 'Chọn lại',
        onPrimaryPress: () => setKind(aiResult.detectedKind!),
      });
    }

    // 3. Chặn nếu biển số nhập khác với biển số nhận diện trên ảnh
    if (aiResult?.detectedPlate && !isPlateMatch(trimmedPlate, aiResult.detectedPlate)) {
      return setNoticeModal({
        visible: true,
        type: 'WARNING',
        title: 'Biển số không khớp với ảnh',
        message: `Biển số bạn nhập (${trimmedPlate}) khác với biển số nhận diện được trên ảnh (${aiResult.detectedPlate}).\n\nVui lòng kiểm tra lại để tránh sai lệch thông tin khi điều phối cứu hộ.`,
        primaryBtnText: `Dùng số trên ảnh (${aiResult.detectedPlate})`,
        secondaryBtnText: 'Chụp lại ảnh',
        onPrimaryPress: () => setPlate(formatPlate(aiResult.detectedPlate!)),
        onSecondaryPress: pickImage,
      });
    }

    // Mở popup confirm modal đẹp mắt và đồng bộ
    setConfirmModalVisible(true);
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
          onPress={goBackToStaff} 
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

          {/* AI Verification Status Card */}
          {aiChecking && (
            <View style={styles.aiCheckingBox}>
              <ActivityIndicator size="small" color={BRAND} />
              <Text style={styles.aiCheckingText}>AI đang phân tích ảnh & nhận diện biển số xe...</Text>
            </View>
          )}

          {/* AI Error & Retry */}
          {!!aiError && !aiChecking && (
            <View style={styles.aiErrorCard}>
              <View style={styles.aiResultHeader}>
                <AlertTriangle size={16} color={DANGER} strokeWidth={2.5} />
                <Text style={[styles.aiResultTitle, { color: DANGER }]}>Chưa thể phân tích AI</Text>
              </View>
              <Text style={styles.aiResultMsg}>{aiError}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => image && runAiVerification(image, true)}
                activeOpacity={0.8}
              >
                <RefreshCw size={13} color="#ffffff" strokeWidth={2.4} />
                <Text style={styles.retryBtnText}>Thử lại phân tích</Text>
              </TouchableOpacity>
            </View>
          )}

          {aiResult && !aiChecking && (() => {
            const isRejected =
              aiResult.status === 'REJECTED' ||
              aiResult.isRescueVehicle === false ||
              !aiResult.vehiclePresent ||
              Boolean(aiResult.isScreenCapture);
            const isWarning = !isRejected && aiResult.status === 'WARNING';
            const isVerified = !isRejected && !isWarning && aiResult.status === 'VERIFIED';

            return (
              <View
                style={[
                  styles.aiResultCard,
                  isVerified && styles.aiResultCardSuccess,
                  isWarning && styles.aiResultCardWarning,
                  isRejected && styles.aiResultCardDanger,
                ]}
              >
                <View style={styles.aiResultHeader}>
                  {isVerified ? (
                    <CheckCircle2 size={16} color={SUCCESS} strokeWidth={2.5} />
                  ) : isWarning ? (
                    <AlertTriangle size={16} color="#d97706" strokeWidth={2.5} />
                  ) : (
                    <XCircle size={16} color={DANGER} strokeWidth={2.5} />
                  )}
                  <Text
                    style={[
                      styles.aiResultTitle,
                      isVerified && { color: SUCCESS },
                      isWarning && { color: '#b45309' },
                      isRejected && { color: DANGER },
                    ]}
                  >
                    {isVerified
                      ? 'AI Xác minh: Hợp lệ'
                      : isWarning
                      ? 'AI Cảnh báo kiểm tra'
                      : 'AI Phát hiện không hợp lệ'}
                  </Text>
                </View>
                <Text style={styles.aiResultMsg}>{aiResult.message}</Text>
                {!!aiResult.detectedPlate && (
                  <View style={styles.aiPlateRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.aiPlateLabel}>Biển số ảnh:</Text>
                      <Text style={styles.aiPlateValue}>{aiResult.detectedPlate}</Text>
                    </View>
                    {formatPlate(plate.trim()) !== formatPlate(aiResult.detectedPlate) && (
                      <TouchableOpacity
                        style={styles.aiFillBtn}
                        onPress={() => setPlate(formatPlate(aiResult.detectedPlate!))}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.aiFillBtnText}>Dùng số này</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })()}

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

          {/* Cảnh báo biển số nhập khác với biển số AI đọc trên ảnh */}
          {!!aiResult?.detectedPlate && !!plate.trim() && !isPlateMatch(plate.trim(), aiResult.detectedPlate) && (
            <View style={styles.dynamicWarnBox}>
              <AlertTriangle size={15} color="#d97706" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dynamicWarnText}>
                  Biển số nhập ({plate.trim()}) khác biển số trên ảnh ({aiResult.detectedPlate})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.aiFillBtn}
                onPress={() => setPlate(formatPlate(aiResult.detectedPlate!))}
                activeOpacity={0.8}
              >
                <Text style={styles.aiFillBtnText}>Dùng số ảnh</Text>
              </TouchableOpacity>
            </View>
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

          {/* Cảnh báo loại xe chọn khác với ảnh nhận diện */}
          {!!kind && !!aiResult?.detectedKind && !isKindMatch(kind, aiResult.detectedKind) && (
            <View style={[styles.dynamicWarnBox, { marginTop: 12 }]}>
              <AlertTriangle size={15} color="#d97706" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dynamicWarnText}>
                  Loại xe chọn ({KINDS.find((k) => k.key === kind)?.label}) khác với ảnh nhận diện ({KINDS.find((k) => k.key === aiResult.detectedKind)?.label || aiResult.detectedKindDescription || aiResult.detectedKind})
                </Text>
              </View>
              {KINDS.some((k) => k.key === aiResult.detectedKind) && (
                <TouchableOpacity
                  style={styles.aiFillBtn}
                  onPress={() => setKind(aiResult.detectedKind!)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.aiFillBtnText}>Đổi loại xe</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primary, (saving || aiChecking) && styles.primaryOff]}
            onPress={submit}
            disabled={saving || aiChecking}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : aiChecking ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.primaryText}>AI đang phân tích ảnh...</Text>
              </>
            ) : (
              <>
                <Check size={18} color="#ffffff" strokeWidth={2.6} />
                <Text style={styles.primaryText}>Lưu xe cứu hộ</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── MODAL 1: XÁC NHẬN THÊM XE CỨU HỘ (CONFIRM) ── */}
      <VehicleSaveConfirmModal
        visible={confirmModalVisible}
        imageUri={image}
        plate={formatPlate(plate.trim())}
        kind={kind}
        aiResult={aiResult}
        loading={saving}
        onClose={() => setConfirmModalVisible(false)}
        onConfirm={executeSaveVehicle}
      />

      {/* ── MODAL 2: CẢNH BÁO / LỖI ĐỒNG BỘ (NOTICE) ── */}
      <VehicleNoticeModal
        visible={noticeModal.visible}
        type={noticeModal.type}
        title={noticeModal.title}
        message={noticeModal.message}
        primaryBtnText={noticeModal.primaryBtnText}
        secondaryBtnText={noticeModal.secondaryBtnText}
        onPrimaryPress={noticeModal.onPrimaryPress}
        onSecondaryPress={noticeModal.onSecondaryPress}
        onClose={() => setNoticeModal((prev) => ({ ...prev, visible: false }))}
      />
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

  aiCheckingBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fff7ed', borderRadius: 12,
    borderWidth: 1, borderColor: '#fed7aa', marginBottom: 18,
  },
  aiCheckingText: { fontSize: 12.5, fontWeight: '700', color: '#c2410c' },

  aiErrorCard: {
    padding: 13, borderRadius: 14, borderWidth: 1.5, marginBottom: 18,
    backgroundColor: '#fef2f2', borderColor: '#fecaca',
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: BRAND, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12, marginTop: 10,
    alignSelf: 'flex-start',
  },
  retryBtnText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },

  aiResultCard: {
    padding: 13, borderRadius: 14, borderWidth: 1.5, marginBottom: 18,
    backgroundColor: '#f8fafc', borderColor: LINE,
  },
  aiResultCardSuccess: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  aiResultCardWarning: { backgroundColor: '#fffbeb', borderColor: '#fef3c7' },
  aiResultCardDanger: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  aiResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  aiResultTitle: { fontSize: 12.5, fontWeight: '800' },
  aiResultMsg: { fontSize: 11.5, color: SUB, lineHeight: 16, fontWeight: '500' },
  aiPlateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  aiPlateLabel: { fontSize: 11.5, fontWeight: '600', color: SUB },
  aiPlateValue: { fontSize: 13.5, fontWeight: '800', color: INK, letterSpacing: 0.8 },
  aiFillBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: BRAND, borderRadius: 8 },
  aiFillBtnText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },

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

  dynamicWarnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  dynamicWarnText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    lineHeight: 16,
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
