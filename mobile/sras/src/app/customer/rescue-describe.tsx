import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { rescueApi } from '../../api/rescueApi';
import { customerVehicleApi, CustomerVehicleDto } from '../../api/customerVehicleApi';
import { aiApi, AiDiagnosisResponse } from '../../api/aiApi';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChevronLeft,
  ChevronRight,
  Car,
  Bike,
  Fuel,
  Disc3,
  BatteryWarning,
  Wrench,
  AlertTriangle,
  MoreHorizontal,
  PhoneCall,
  Phone,
  Check,
  Camera,
  X,
  Siren,
  Sparkles,
  Bot,
  ShieldAlert,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Mic,
  MicOff,
  Plus,
} from 'lucide-react-native';
import AddVehicleModal from '../../components/vehicle/AddVehicleModal';

// Design tokens — 1 accent thương hiệu (cam-đỏ), nền trung tính ấm, đỏ = nguy hiểm (ngữ nghĩa).
const BRAND = '#ea580c';
const INK = '#1c1917';
const SUB = '#78716c';
const LINE = '#e7e5e4';
const CARD = '#ffffff';
const BG = '#f7f7f5';
const FIELD = '#f7f7f5';
const DANGER = '#dc2626';
const DANGER_BG = '#fef2f2';
const DANGER_INK = '#991b1b';

// Design tokens cho Trợ lý AI (Đồng bộ cam thương hiệu)
const AI_COLOR = BRAND;
const AI_BG = '#fffaf5';
const AI_BORDER = '#fed7aa';

const CURRENT_STEP = 2;
const TOTAL_STEPS = 3;
const NOTE_MAX = 200;
const MAX_PHOTOS = 3;

type VehicleKey = 'CAR' | 'MOTORBIKE';
type IssueKey = 'OUT_OF_FUEL' | 'FLAT_TIRE' | 'DEAD_BATTERY' | 'ENGINE_FAILURE' | 'ACCIDENT' | 'OTHER';
type PhotoStatus = 'idle' | 'uploading' | 'done' | 'error';

const VEHICLES: { key: VehicleKey; label: string; Icon: any }[] = [
  { key: 'MOTORBIKE', label: 'Xe máy', Icon: Bike },
  { key: 'CAR', label: 'Ô tô', Icon: Car },
];

const ISSUES: { key: IssueKey; label: string; Icon: any; danger?: boolean }[] = [
  { key: 'OUT_OF_FUEL', label: 'Hết xăng', Icon: Fuel },
  { key: 'FLAT_TIRE', label: 'Thủng lốp', Icon: Disc3 },
  { key: 'DEAD_BATTERY', label: 'Hết ắc-quy', Icon: BatteryWarning },
  { key: 'ENGINE_FAILURE', label: 'Chết máy', Icon: Wrench },
  { key: 'ACCIDENT', label: 'Tai nạn', Icon: AlertTriangle, danger: true },
  { key: 'OTHER', label: 'Sự cố khác', Icon: MoreHorizontal },
];

export default function RescueDescribeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    address?: string;
    mode?: string;
    resetKey?: string;
    prefilledVehicle?: string;
    prefilledIssue?: string;
    prefilledNote?: string;
    garageId?: string;
    garageName?: string;
  }>();
  const isPickGarageMode = params.mode === 'PICK_GARAGE';

  const [vehicle, setVehicle] = useState<VehicleKey | null>(null);
  const [savedVehicles, setSavedVehicles] = useState<CustomerVehicleDto[]>([]);
  const [vehLoading, setVehLoading] = useState(true);
  const [vehError, setVehError] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [plate, setPlate] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoStatus, setPhotoStatus] = useState<Record<string, PhotoStatus>>({});
  const [issue, setIssue] = useState<IssueKey | null>(null);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  // Trợ lý AI chẩn đoán sự cố
  const [aiSymptom, setAiSymptom] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiDiagnosisResponse | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [aiAppliedModal, setAiAppliedModal] = useState<{ visible: boolean; label: string }>({ visible: false, label: '' });

  const recorderRef = useRef<any>(null);
  const isGoingNextStepRef = useRef(false);
  const lastResetKeyRef = useRef<string | null>(null);

  // Hàm dọn sạch toàn bộ form về trạng thái trống ban đầu
  const resetAll = useCallback(() => {
    setVehicle(null);
    setSelectedVehicleId(null);
    setPlate('');
    setCustomModel('');
    setPhotos([]);
    setPhotoStatus({});
    setIssue(null);
    setNote('');
    setAiSymptom('');
    setAiResult(null);
    setIsRecordingVoice(false);
    setIsTranscribingVoice(false);
    setAiAppliedModal({ visible: false, label: '' });
  }, []);

  // Khi có resetKey mới từ luồng đặt cứu hộ -> tự động dọn sạch form hoặc điền dữ liệu từ AI
  useEffect(() => {
    if (params.resetKey && params.resetKey !== lastResetKeyRef.current) {
      lastResetKeyRef.current = params.resetKey;
      resetAll();

      if (params.prefilledVehicle === 'CAR' || params.prefilledVehicle === 'MOTORBIKE') {
        setVehicle(params.prefilledVehicle);
      }
      if (params.prefilledIssue) {
        setIssue(params.prefilledIssue as IssueKey);
      }
      if (params.prefilledNote) {
        setNote(params.prefilledNote);
        setAiSymptom(params.prefilledNote);
      }
    }
  }, [params.resetKey, params.prefilledVehicle, params.prefilledIssue, params.prefilledNote, resetAll]);

  // Khi người dùng thoát ra trang chủ hoặc rời khỏi màn hình này -> tự động làm sạch form
  useFocusEffect(
    useCallback(() => {
      isGoingNextStepRef.current = false;
      return () => {
        // Chỉ dọn dẹp nếu người dùng KHÔNG chuyển tiếp sang bước 3 (chọn gara)
        if (!isGoingNextStepRef.current) {
          resetAll();
        }
      };
    }, [resetAll])
  );

  const handleBack = () => {
    resetAll();
    router.back();
  };

  const toggleVoiceRecording = async () => {
    if (isTranscribingVoice) return;
    if (isRecordingVoice) {
      try {
        setIsTranscribingVoice(true);
        setIsRecordingVoice(false);
        const rec = recorderRef.current;
        if (rec) {
          await rec.stop();
          const uri = rec.uri;
          recorderRef.current = null;

          // Khôi phục audio mode sau khi ghi âm
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const expoAudio = require('expo-audio');
            const setAudioModeFn = expoAudio?.setAudioModeAsync || expoAudio?.AudioModule?.setAudioModeAsync;
            if (setAudioModeFn) {
              await setAudioModeFn({ allowsRecording: false });
            }
          } catch (modeErr) {}

          if (uri) {
            const text = await aiApi.transcribeVoice(uri);
            if (text && text.trim()) {
              setAiSymptom((prev) => (prev.trim() ? `${prev.trim()} ${text.trim()}` : text.trim()));
              setAiResult(null);
            } else {
              Alert.alert('Không nhận diện được', 'Chưa nghe rõ giọng nói. Vui lòng nói to và rõ hơn.');
            }
          }
        }
      } catch (e: any) {
        console.error('Lỗi nhận diện giọng nói:', e);
        Alert.alert(
          'Lỗi nhận diện giọng nói',
          e?.response?.data?.message || e?.message || 'Không thể chuyển giọng nói thành văn bản. Vui lòng thử lại.'
        );
      } finally {
        setIsTranscribingVoice(false);
      }
    } else {
      try {
        // Tải động expo-audio an toàn
        let expoAudio: any = null;
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          expoAudio = require('expo-audio');
        } catch (loadErr) {
          console.warn('Không tải được expo-audio:', loadErr);
        }

        const requestPermFn =
          expoAudio?.requestRecordingPermissionsAsync ||
          expoAudio?.AudioModule?.requestRecordingPermissionsAsync;

        if (requestPermFn) {
          const perm = await requestPermFn();
          if (perm && !perm.granted) {
            Alert.alert('Cần quyền Micro', 'Vui lòng cho phép quyền truy cập Micro trong Cài đặt để nói sự cố xe.');
            return;
          }
        }

        // BẮT BUỘC TRÊN iOS: Kích hoạt allowsRecording trước khi gọi record()
        const setAudioModeFn = expoAudio?.setAudioModeAsync || expoAudio?.AudioModule?.setAudioModeAsync;
        if (setAudioModeFn) {
          await setAudioModeFn({
            allowsRecording: true,
            playsInSilentMode: true,
          });
        }

        const preset = expoAudio?.RecordingPresets?.HIGH_QUALITY || {};
        const AudioRecorderCls =
          expoAudio?.AudioModule?.AudioRecorder ||
          expoAudio?.AudioRecorder ||
          expoAudio?.default?.AudioModule?.AudioRecorder;

        if (!AudioRecorderCls) {
          Alert.alert(
            'Chức năng Voice',
            'Không tìm thấy mô-đun ghi âm trên thiết bị này. Bạn có thể chọn nhanh các mẫu câu gợi ý hoặc nhập văn bản.'
          );
          return;
        }

        const rec = new AudioRecorderCls(preset);
        if (rec.prepareToRecordAsync) {
          await rec.prepareToRecordAsync();
        }
        rec.record();
        recorderRef.current = rec;
        setIsRecordingVoice(true);
      } catch (e: any) {
        console.error('Lỗi khởi động ghi âm:', e);
        Alert.alert('Không thể ghi âm', e?.message || 'Vui lòng kiểm tra quyền micro trên thiết bị hoặc thử lại.');
      }
    }
  };

  // Nạp xe đã lưu của khách (kèm ảnh thật). Chưa có → chỉ hiện ô nhập nhanh.
  const loadVehicles = async () => {
    try {
      setVehLoading(true);
      setVehError(false);
      const list = await customerVehicleApi.mine();
      console.log('[customer-vehicles] loaded', list.length, list);
      setSavedVehicles(list);
    } catch (e: any) {
      console.warn('[customer-vehicles] load failed', e?.response?.status, e?.message);
      setVehError(true);
    } finally {
      setVehLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  const savedList = vehicle ? savedVehicles.filter((v) => v.vehicleType === vehicle) : [];

  const pickVehicleType = (key: VehicleKey) => {
    setVehicle(key);
    // Tự động chọn xe mặc định của loại đó nếu có
    const matching = savedVehicles.filter((v) => v.vehicleType === key);
    const defaultVeh = matching.find((v) => v.isDefault);
    setSelectedVehicleId(defaultVeh ? defaultVeh.id : null);
    setCustomModel('');
    setAiResult(null);
  };

  const pickSavedVehicle = (id: number) => {
    setSelectedVehicleId((cur) => (cur === id ? null : id));
    setPlate('');
    setCustomModel('');
    setAiResult(null);
  };

  const handleVehicleAdded = (newV: CustomerVehicleDto) => {
    setSavedVehicles((prev) => [newV, ...prev]);
    if (vehicle === newV.vehicleType) {
      setSelectedVehicleId(newV.id);
    } else {
      setVehicle(newV.vehicleType);
      setSelectedVehicleId(newV.id);
    }
    setCustomModel('');
    setAiResult(null);
  };

  // Kích hoạt AI phân tích sự cố
  const runAiDiagnosis = async () => {
    if (!vehicle) {
      Alert.alert('Chưa chọn loại xe', 'Vui lòng chọn loại xe (Xe máy hoặc Ô tô) trước khi chẩn đoán.');
      return;
    }
    const promptSymptom = aiSymptom.trim() || note.trim();
    if (!promptSymptom && photos.length === 0) {
      Alert.alert('Cần thêm thông tin', 'Vui lòng nhập mô tả triệu chứng hoặc thêm ít nhất 1 ảnh xe / đèn taplo để AI phân tích.');
      return;
    }

    const selectedVeh = savedList.find((v) => v.id === selectedVehicleId);
    const modelName = selectedVeh
      ? [selectedVeh.brand, selectedVeh.model].filter(Boolean).join(' ')
      : customModel.trim() || (vehicle === 'CAR' ? 'Ô tô' : 'Xe máy');

    try {
      setAiLoading(true);

      // Đảm bảo ảnh được tải lên máy chủ trước để Backend nạp dữ liệu ảnh thật cho Gemini phân tích
      const uploadedUrls: string[] = [];
      for (const uri of photos) {
        if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('/uploads/') || uri.startsWith('/api/upload/')) {
          uploadedUrls.push(uri);
        } else {
          try {
            setPhotoStatus((s) => ({ ...s, [uri]: 'uploading' }));
            const uploadedUrl = await rescueApi.uploadPhoto(uri);
            if (uploadedUrl) {
              uploadedUrls.push(uploadedUrl);
              setPhotoStatus((s) => ({ ...s, [uri]: 'done' }));
            }
          } catch (uploadErr) {
            console.warn('[AI Diagnosis] Lỗi upload ảnh:', uploadErr);
            setPhotoStatus((s) => ({ ...s, [uri]: 'error' }));
          }
        }
      }

      const res = await aiApi.diagnose({
        vehicleType: vehicle,
        vehicleModel: modelName,
        customerVehicleId: selectedVehicleId || undefined,
        lat: params?.lat ? parseFloat(params.lat) : undefined,
        lng: params?.lng ? parseFloat(params.lng) : undefined,
        address: params?.address,
        symptomDescription: promptSymptom,
        photoUrls: uploadedUrls,
      });
      setAiResult(res);
    } catch (e: any) {
      Alert.alert('Chẩn đoán AI', e?.response?.data?.message || 'Không thể kết nối AI. Vui lòng thử lại.');
    } finally {
      setAiLoading(false);
    }
  };

  // Áp dụng kết quả chẩn đoán vào đơn cứu hộ
  const applyAiDiagnosis = () => {
    if (!aiResult) return;
    if (aiResult.suggestedIssueType) {
      setIssue(aiResult.suggestedIssueType as IssueKey);
    }
    if (aiResult.autoFilledNote) {
      setNote(aiResult.autoFilledNote);
    }
    const matchedLabel = ISSUES.find((i) => i.key === aiResult.suggestedIssueType)?.label || aiResult.diagnosedIssue;
    setAiAppliedModal({ visible: true, label: matchedLabel });
  };

  const isAccident = issue === 'ACCIDENT';
  const phoneOk = phone.trim().replace(/\D/g, '').length >= 9;
  const canSend = vehicle !== null && issue !== null && phoneOk;

  const summary = useMemo(() => {
    if (!vehicle || !issue) return 'Chọn loại xe và sự cố để gửi yêu cầu';
    const v = VEHICLES.find((x) => x.key === vehicle)?.label;
    const i = ISSUES.find((x) => x.key === issue)?.label;
    return `${v} · ${i}`;
  }, [vehicle, issue]);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Cần quyền camera', 'Hãy cấp quyền camera để chụp ảnh xe.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled) {
      setPhotos((p) => [...p, res.assets[0].uri].slice(0, MAX_PHOTOS));
      setAiResult(null);
    }
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (!res.canceled) {
      setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
      setAiResult(null);
    }
  };

  const addPhoto = () => {
    if (photos.length >= MAX_PHOTOS) return;
    Alert.alert('Thêm ảnh xe', 'Chọn nguồn ảnh', [
      { text: 'Chụp ảnh', onPress: takePhoto },
      { text: 'Chọn từ thư viện', onPress: pickPhoto },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  };

  const removePhoto = (uri: string) => {
    if (sending) return;
    setPhotos((p) => p.filter((x) => x !== uri));
    setAiResult(null);
  };

  const submit = async () => {
    const lat = params.lat ? parseFloat(params.lat) : NaN;
    const lng = params.lng ? parseFloat(params.lng) : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      Alert.alert('Thiếu vị trí', 'Chưa xác định được vị trí cứu hộ. Vui lòng quay lại bước chọn vị trí.', [
        { text: 'Quay lại', onPress: () => router.back() },
      ]);
      return;
    }
    const urls: string[] = [];
    try {
      setSending(true);

      // Upload từng ảnh, cập nhật trạng thái để hiện tiến trình trên từng ảnh.
      for (const uri of photos) {
        setPhotoStatus((s) => ({ ...s, [uri]: 'uploading' }));
        try {
          urls.push(await rescueApi.uploadPhoto(uri));
          setPhotoStatus((s) => ({ ...s, [uri]: 'done' }));
        } catch {
          setPhotoStatus((s) => ({ ...s, [uri]: 'error' }));
        }
      }

      const issueLabel = ISSUES.find((x) => x.key === issue)?.label ?? '';
      const customVehPart = !selectedVehicleId && customModel.trim() ? ` · Hãng xe: ${customModel.trim()}` : '';
      const notePart = note.trim() ? ` - ${note.trim()}` : '';
      const symptom = `${issueLabel}${customVehPart}${notePart}`.trim();

      if (isPickGarageMode) {
        isGoingNextStepRef.current = true;
        router.push({
          pathname: '/customer/rescue-garage-select',
          params: {
            lat: String(lat),
            lng: String(lng),
            address: params.address || '',
            vehicleType: vehicle!,
            symptom,
            issueType: issue!,
            contactPhone: phone.trim(),
            customerVehicleId: selectedVehicleId ? String(selectedVehicleId) : '',
            photoUrls: JSON.stringify(urls),
          },
        } as any);
        return;
      }

      const chosenGarageId = params.garageId ? parseInt(String(params.garageId), 10) : undefined;
      const res = await rescueApi.create({
        vehicleType: vehicle!,
        symptom,
        pickupLat: lat,
        pickupLng: lng,
        pickupAddress: params.address || undefined,
        issueType: issue!,
        contactPhone: phone.trim(),
        customerVehicleId: selectedVehicleId ?? undefined,
        photoUrls: urls,
        garageId: chosenGarageId,
      });

      resetAll();
      router.replace({ pathname: '/customer/rescue-tracking', params: { id: String(res.id) } } as any);
    } catch (e: any) {
      // Rollback: Xóa các file đã upload nếu lưu đơn thất bại để tránh ảnh mồ côi
      for (const u of urls) {
        rescueApi.deletePhoto(u).catch(() => {});
      }
      // Giữ nguyên nội dung đã nhập, cho thử lại.
      Alert.alert('Không gửi được yêu cầu', e?.response?.data?.message || e?.message || 'Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  const onSend = () => {
    if (!canSend || sending) return;
    if (isPickGarageMode) {
      submit();
      return;
    }
    if (params.garageName) {
      Alert.alert(
        'Gửi yêu cầu cứu hộ?',
        `Yêu cầu sẽ được gửi trực tiếp đến "${params.garageName}". Gara sẽ nhận thông báo và điều thợ tới hỗ trợ bạn ngay.`,
        [
          { text: 'Kiểm tra lại', style: 'cancel' },
          { text: 'Gửi cho gara', onPress: submit },
        ]
      );
      return;
    }
    Alert.alert('Gửi yêu cầu cứu hộ?', 'Hệ thống sẽ tìm gara gần nhất và điều tới vị trí của bạn.', [
      { text: 'Kiểm tra lại', style: 'cancel' },
      { text: 'Gửi ngay', onPress: submit },
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header + Modern Progress Bar */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.roundBtn}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.8}
          >
            <ChevronLeft size={22} color={INK} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Mô tả sự cố</Text>
            <Text style={styles.headerSubtitle}>Bước 2/3 • Chi tiết xe & triệu chứng</Text>
          </View>
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>2/3</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '66.6%' }]} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Gara chỉ định tiếp nhận */}
          {params.garageName && (
            <View style={styles.chosenGarageCard}>
              <View style={styles.chosenGarageIconBox}>
                <Wrench size={20} color="#ffffff" strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.chosenGarageBadgeRow}>
                  <Text style={styles.chosenGarageBadge}>GARA TIẾP NHẬN ĐÃ CHỌN</Text>
                  <View style={styles.chosenGarageOnlineDot} />
                </View>
                <Text style={styles.chosenGarageTitle} numberOfLines={1}>
                  {params.garageName}
                </Text>
                <Text style={styles.chosenGarageSub}>
                  Đơn cứu hộ sẽ được gửi thẳng đến gara này, không qua điều phối ngẫu nhiên.
                </Text>
              </View>
            </View>
          )}

          {/* 1 — Loại phương tiện */}
          <View style={styles.sectionHead}>
            <Text style={styles.qTitle}>Loại phương tiện</Text>
            <View style={styles.reqBadge}>
              <Text style={styles.reqBadgeText}>Bắt buộc</Text>
            </View>
          </View>
          <View style={styles.vehicleRow}>
            {VEHICLES.map(({ key, label, Icon }) => {
              const active = vehicle === key;
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.85}
                  onPress={() => pickVehicleType(key)}
                  style={[styles.vehicleCard, active && styles.vehicleCardActive]}
                >
                  <View style={[styles.vehicleIcon, active && styles.vehicleIconActive]}>
                    <Icon size={24} color={active ? '#ffffff' : BRAND} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.vehicleLabel, active && styles.vehicleLabelActive]}>{label}</Text>
                    <Text style={styles.vehicleSub}>{key === 'MOTORBIKE' ? 'Xe máy, tay ga, PKL' : '4-7 chỗ, bán tải'}</Text>
                  </View>
                  {active && (
                    <View style={styles.vehicleCheckBadge}>
                      <Check size={11} color="#ffffff" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 2 — Phương tiện đã lưu / Thêm xe */}
          <View style={styles.sectionHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.qTitle}>Xe cứu hộ</Text>
              {vehicle && (
                <View style={{ backgroundColor: '#ffedd5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, color: BRAND, fontWeight: '800' }}>
                    {vehicle === 'MOTORBIKE' ? 'XE MÁY' : 'Ô TÔ'}
                  </Text>
                </View>
              )}
            </View>
            {vehicle && (
              <TouchableOpacity
                style={styles.addVehInlineBtn}
                onPress={() => setShowAddVehicleModal(true)}
                activeOpacity={0.8}
              >
                <Plus size={13} color={BRAND} strokeWidth={2.8} />
                <Text style={styles.addVehInlineBtnText}>Thêm xe mới</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Trạng thái tải xe đã lưu (chỉ khi đã chọn loại xe) */}
          {vehicle && vehLoading && (
            <View style={styles.vehStateRow}>
              <ActivityIndicator size="small" color={BRAND} />
              <Text style={styles.vehStateText}>Đang tải xe đã lưu...</Text>
            </View>
          )}
          {vehicle && !vehLoading && vehError && (
            <TouchableOpacity style={styles.vehStateRow} onPress={loadVehicles} activeOpacity={0.8}>
              <Text style={styles.vehStateText}>Không tải được xe đã lưu.</Text>
              <Text style={styles.vehRetry}>Thử lại</Text>
            </TouchableOpacity>
          )}
          {vehicle && !vehLoading && !vehError && savedList.length === 0 && (
            <View style={styles.emptyVehCard}>
              <View style={styles.emptyVehIconBox}>
                {vehicle === 'CAR' ? <Car size={24} color="#ea580c" strokeWidth={2.2} /> : <Bike size={24} color="#ea580c" strokeWidth={2.2} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyVehCardTitle}>
                  Chưa có {vehicle === 'CAR' ? 'ô tô' : 'xe máy'} đã lưu
                </Text>
                <Text style={styles.emptyVehCardSub}>
                  Thêm xe vào hồ sơ để hệ thống tự động lưu biển số và dòng xe cho các lần cứu hộ.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.emptyVehAddAction}
                onPress={() => setShowAddVehicleModal(true)}
                activeOpacity={0.85}
              >
                <Plus size={14} color="#ffffff" strokeWidth={2.6} />
                <Text style={styles.emptyVehAddActionText}>Thêm xe</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Xe đã lưu đúng loại đang chọn */}
          {vehicle &&
            savedList.map((v) => {
              const active = selectedVehicleId === v.id;
              const name = [v.brand, v.model].filter(Boolean).join(' ') || 'Xe của tôi';
              const VIcon = v.vehicleType === 'CAR' ? Car : Bike;
              return (
                <TouchableOpacity
                  key={v.id}
                  activeOpacity={0.85}
                  onPress={() => pickSavedVehicle(v.id)}
                  style={[styles.savedItem, active && styles.savedItemActive]}
                >
                  <View style={[
                    styles.plateBox,
                    active && styles.plateBoxActive,
                    !v.licensePlate && { minWidth: 38, paddingHorizontal: 6 },
                  ]}>
                    <VIcon size={12} color={active ? BRAND : SUB} strokeWidth={2.4} style={v.licensePlate ? { marginBottom: 2 } : undefined} />
                    {v.licensePlate ? (
                      <Text style={[styles.plateBoxText, active && styles.plateBoxTextActive]}>
                        {v.licensePlate}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.savedName, active && { color: BRAND }]} numberOfLines={1}>
                        {name}
                      </Text>
                      {v.isDefault && (
                        <View style={styles.defaultPill}>
                          <Text style={styles.defaultPillText}>Mặc định</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.savedMeta} numberOfLines={1}>
                      {[v.color ? `Màu ${v.color}` : null, v.year ? `Đời ${v.year}` : null].filter(Boolean).join(' · ') || 'Đã lưu trong gara cá nhân'}
                    </Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <Check size={13} color="#ffffff" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}

          {/* Nhập dòng xe tạm thời (khi không chọn xe đã lưu) */}
          {selectedVehicleId === null && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 12, color: SUB, marginBottom: 5, fontWeight: '500' }}>
                {savedList.length > 0 ? 'Hoặc nhập dòng xe khác cho chuyến này:' : 'Hoặc nhập dòng xe tạm thời:'}
              </Text>
              <TextInput
                placeholder={
                  vehicle === 'CAR'
                    ? 'Ví dụ: Toyota Vios, Mazda 3, Kia, Hyundai...'
                    : 'Ví dụ: Honda Vision, Wave, Yamaha Exciter, SH...'
                }
                placeholderTextColor={SUB}
                value={customModel}
                onChangeText={(text) => {
                  setCustomModel(text);
                  if (aiResult) setAiResult(null);
                }}
                style={styles.input}
              />
            </View>
          )}

          {/* 🌟 AI CHẨN ĐOÁN SỰ CỐ THÔNG MINH 🌟 */}
          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <View style={styles.aiBadgeRow}>
                <View style={styles.aiBadge}>
                  <Sparkles size={13} color="#ffffff" strokeWidth={2.4} />
                  <Text style={styles.aiBadgeText}>AI ASSISTANT</Text>
                </View>
              </View>
              <Text style={styles.aiTitle}>AI chẩn đoán sự cố</Text>
              <Text style={styles.aiSub}>
                Không rõ xe hỏng gì? Hãy nói qua giọng nói (Voice), nhập chữ hoặc chụp ảnh để AI chẩn đoán nguyên nhân và chọn dịch vụ phù hợp.
              </Text>
            </View>

            <View style={styles.aiInputWrap}>
              {/* Toolbar chức năng: Voice và Ảnh */}
              <View style={styles.aiToolbar}>
                {/* Nút Voice chuyển thành Text */}
                <TouchableOpacity
                  style={[styles.aiToolBtn, isRecordingVoice && styles.aiToolBtnActive]}
                  onPress={toggleVoiceRecording}
                  disabled={isTranscribingVoice}
                  activeOpacity={0.8}
                >
                  {isTranscribingVoice ? (
                    <>
                      <ActivityIndicator size="small" color={AI_COLOR} />
                      <Text style={styles.aiToolBtnText}>AI đang dịch lời nói...</Text>
                    </>
                  ) : isRecordingVoice ? (
                    <>
                      <View style={styles.aiPulseDot} />
                      <MicOff size={15} color="#ffffff" strokeWidth={2.4} />
                      <Text style={[styles.aiToolBtnText, { color: '#ffffff' }]}>Đang ghi âm... (Bấm dừng)</Text>
                    </>
                  ) : (
                    <>
                      <Mic size={15} color={AI_COLOR} strokeWidth={2.2} />
                      <Text style={styles.aiToolBtnText}>Nói sự cố (Voice)</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Nút Thêm ảnh sự cố */}
                <TouchableOpacity
                  style={[styles.aiToolBtn, photos.length > 0 && styles.aiToolBtnHasPhoto]}
                  onPress={addPhoto}
                  activeOpacity={0.8}
                  disabled={photos.length >= MAX_PHOTOS}
                >
                  <Camera size={15} color={photos.length > 0 ? '#16a34a' : AI_COLOR} strokeWidth={2.2} />
                  <Text style={[styles.aiToolBtnText, photos.length > 0 && { color: '#16a34a' }]}>
                    {photos.length > 0 ? `Đã đính kèm (${photos.length}/${MAX_PHOTOS} ảnh)` : 'Chụp / Thêm ảnh'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Ô nhập Text mô tả triệu chứng */}
              <TextInput
                placeholder="Nhập mô tả triệu chứng hoặc bấm micro để nói (ví dụ: xe bấm đề tạch tạch rồi lịm dần, còi yếu, đang đi bị giật khựng...)"
                placeholderTextColor="#94a3b8"
                value={aiSymptom}
                onChangeText={(text) => {
                  setAiSymptom(text);
                  if (aiResult) setAiResult(null);
                }}
                style={styles.aiInput}
                multiline
              />

              {/* Gợi ý nói nhanh (Voice sample chips) */}
              <View style={styles.voiceSampleRow}>
                <Text style={styles.voiceSampleLabel}>Mẫu nói nhanh:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {[
                    'Xe chết máy bấm đề tạch tạch',
                    'Bánh xe cán đinh xì hết hơi',
                    'Xe đang chạy bốc khói mùi khét',
                    'Kim xăng cạn xe khựng tắt máy',
                  ].map((phrase, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.voiceSampleChip}
                      onPress={() => {
                        setAiSymptom(phrase);
                        if (aiResult) setAiResult(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Mic size={11} color="#ea580c" strokeWidth={2.4} />
                      <Text style={styles.voiceSampleText}>{phrase}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Thumbnail ảnh đính kèm (DUY NHẤT ở đây) */}
              {photos.length > 0 && (
                <View style={styles.aiPhotosSection}>
                  <Text style={styles.aiPhotosLabel}>Ảnh chụp sự cố gửi kèm ({photos.length}/{MAX_PHOTOS}):</Text>
                  <View style={styles.aiPhotosRow}>
                    {photos.map((uri) => (
                      <View key={uri} style={styles.aiThumbWrap}>
                        <Image source={{ uri }} style={styles.aiThumb} />
                        <TouchableOpacity
                          style={styles.aiThumbRemove}
                          onPress={() => removePhoto(uri)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X size={11} color="#ffffff" strokeWidth={3} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {photos.length < MAX_PHOTOS && (
                      <TouchableOpacity style={styles.aiAddMiniPhoto} onPress={addPhoto} activeOpacity={0.8}>
                        <Camera size={16} color={AI_COLOR} strokeWidth={2.2} />
                        <Text style={styles.aiAddMiniText}>+ Thêm ảnh</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Nút bấm AI Chẩn đoán */}
              <TouchableOpacity
                style={[styles.aiDiagnoseBtn, aiLoading && styles.aiDiagnoseBtnLoading]}
                onPress={runAiDiagnosis}
                disabled={aiLoading || isRecordingVoice}
                activeOpacity={0.85}
              >
                {aiLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.aiDiagnoseBtnText}>AI đang phân tích triệu chứng & ảnh...</Text>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} color="#ffffff" strokeWidth={2.4} />
                    <Text style={styles.aiDiagnoseBtnText}>Chẩn đoán bệnh với AI</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Khối hiển thị kết quả chẩn đoán */}
            {aiResult && (
              <View style={styles.aiResultBox}>
                <View style={styles.aiResultHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.aiResultLabel}>DỰ ĐOÁN SỰ CỐ TỪ AI</Text>
                    <Text style={styles.aiResultTitle}>{aiResult.diagnosedIssue}</Text>
                  </View>
                  <View
                    style={[
                      styles.aiSeverityBadge,
                      aiResult.severity === 'NGUY_HIEM'
                        ? styles.severityDanger
                        : aiResult.severity === 'CANH_BAO'
                        ? styles.severityWarn
                        : styles.severityOk,
                    ]}
                  >
                    <Text
                      style={[
                        styles.aiSeverityText,
                        aiResult.severity === 'NGUY_HIEM'
                          ? { color: DANGER_INK }
                          : aiResult.severity === 'CANH_BAO'
                          ? { color: '#9a3412' }
                          : { color: '#166534' },
                      ]}
                    >
                      {aiResult.severity === 'NGUY_HIEM'
                        ? 'Nguy hiểm'
                        : aiResult.severity === 'CANH_BAO'
                        ? 'Cảnh báo'
                        : 'Sự cố nhẹ'}
                    </Text>
                  </View>
                </View>

                {/* Thanh tiến trình độ tin cậy */}
                <View style={styles.aiConfidenceWrap}>
                  <View style={styles.aiScoreRow}>
                    <Text style={styles.aiScoreText}>🎯 Độ tin cậy: {aiResult.confidenceScore || 85}%</Text>
                    <Text style={styles.aiServiceText}>Gợi ý: {aiResult.suggestedService}</Text>
                  </View>
                  <View style={styles.aiConfBarTrack}>
                    <View
                      style={[
                        styles.aiConfBarFill,
                        { width: `${Math.min(100, Math.max(10, aiResult.confidenceScore || 85))}%` },
                      ]}
                    />
                  </View>
                </View>

                {/* Cảnh báo khi hình ảnh hoặc mô tả không liên quan */}
                {((aiResult.confidenceScore && aiResult.confidenceScore < 40) ||
                  (aiResult.diagnosedIssue && aiResult.diagnosedIssue.toLowerCase().includes('không liên quan'))) && (
                  <View style={styles.aiIrrelevantBox}>
                    <AlertTriangle size={18} color="#c2410c" strokeWidth={2.4} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aiIrrelevantTitle}>Ảnh hoặc triệu chứng chưa rõ ràng</Text>
                      <Text style={styles.aiIrrelevantSub}>
                        AI nhận thấy ảnh bạn gửi có thể không thể hiện sự cố xe hoặc chưa đủ thông tin. Bạn có thể chụp lại ảnh cận cảnh xe bị hỏng hoặc tự chọn nhanh sự cố bên dưới.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Thẻ Cá nhân hoá hồ sơ xe & Cảnh báo cung đường sự cố >= 2 lần */}
                {aiResult.personalizationNote ? (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    backgroundColor: '#fff7ed',
                    borderWidth: 1,
                    borderColor: '#fdba74',
                    borderRadius: 10,
                    padding: 10,
                    marginBottom: 10,
                    gap: 8,
                  }}>
                    <Sparkles size={16} color="#ea580c" strokeWidth={2.2} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#c2410c', marginBottom: 2 }}>
                        {aiResult.isFrequentBreakdownLocation ? `⚠️ ĐIỂM ĐEN SỰ CỐ CÁ NHÂN (${aiResult.locationIncidentCount || 2} LẦN)` : 'GHI CHÚ CÁ NHÂN HÓA'}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#9a3412', lineHeight: 17 }}>
                        {aiResult.personalizationNote}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {aiResult.emergencyAdvice ? (
                  <View style={styles.aiAdviceBox}>
                    <ShieldAlert
                      size={16}
                      color={aiResult.severity === 'NGUY_HIEM' ? DANGER : BRAND}
                      strokeWidth={2.2}
                    />
                    <Text style={styles.aiAdviceText}>{aiResult.emergencyAdvice}</Text>
                  </View>
                ) : null}

                {aiResult.troubleshootingSteps && aiResult.troubleshootingSteps.length > 0 ? (
                  <View style={styles.aiStepsBox}>
                    <Text style={styles.aiStepsTitle}>Kiểm tra nhanh tại chỗ:</Text>
                    {aiResult.troubleshootingSteps.map((step, idx) => (
                      <View key={idx} style={styles.aiStepItemRow}>
                        <CheckCircle2 size={13} color="#64748b" strokeWidth={2.4} />
                        <Text style={styles.aiStepItem}>{step}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <TouchableOpacity style={styles.aiApplyBtn} onPress={applyAiDiagnosis} activeOpacity={0.85}>
                  <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.4} />
                  <Text style={styles.aiApplyBtnText}>Áp dụng vào yêu cầu cứu hộ</Text>
                  <ArrowRight size={16} color="#ffffff" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 3 — Sự cố (có cấu trúc) */}
          <View style={styles.sectionHead}>
            <Text style={styles.qTitle}>Xe của bạn gặp vấn đề gì?</Text>
            <View style={styles.reqBadge}>
              <Text style={styles.reqBadgeText}>Bắt buộc</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>
            Chọn nhanh sự cố hoặc để AI phía trên chẩn đoán và chọn giúp bạn
          </Text>
          <View style={styles.issueGrid}>
            {ISSUES.map(({ key, label, Icon, danger }) => {
              const active = issue === key;
              const activeStyle = danger ? styles.issueActiveDanger : styles.issueActive;
              const iconColor = active ? (danger ? DANGER : BRAND) : SUB;
              const textStyle = active ? (danger ? { color: DANGER_INK } : { color: BRAND }) : null;
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.85}
                  onPress={() => setIssue(key)}
                  style={[styles.issueChip, active && activeStyle]}
                >
                  <View style={[styles.issueIconWrap, active && (danger ? styles.issueIconWrapDanger : styles.issueIconWrapActive)]}>
                    <Icon size={20} color={iconColor} strokeWidth={2.2} />
                  </View>
                  <Text style={[styles.issueText, textStyle]}>{label}</Text>
                  {active && (
                    <View style={[styles.issueCheckWrap, danger && { backgroundColor: DANGER }]}>
                      <Check size={11} color="#ffffff" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {isAccident && (
            <View style={styles.accidentBanner}>
              <View style={styles.accidentIcon}>
                <PhoneCall size={16} color="#ffffff" strokeWidth={2.4} />
              </View>
              <Text style={styles.accidentText}>
                Nếu có người bị thương, hãy gọi cấp cứu 115 ngay trước khi chờ cứu hộ.
              </Text>
            </View>
          )}

          {/* 4 — Số điện thoại liên hệ */}
          <View style={styles.sectionHead}>
            <Text style={styles.qTitle}>Số điện thoại liên hệ</Text>
            <View style={styles.reqBadge}>
              <Text style={styles.reqBadgeText}>Bắt buộc</Text>
            </View>
          </View>
          <View style={styles.phoneField}>
            <View style={styles.inputIconWrap}>
              <Phone size={17} color={BRAND} strokeWidth={2.2} />
            </View>
            <TextInput
              placeholder="Nhập số điện thoại liên hệ cứu hộ..."
              placeholderTextColor={SUB}
              value={phone}
              onChangeText={setPhone}
              style={styles.phoneInput}
              keyboardType="phone-pad"
            />
          </View>

          {/* 5 — Ghi chú thêm */}
          <View style={styles.sectionHead}>
            <Text style={styles.qTitle}>Ghi chú thêm</Text>
            <Text style={styles.optional}>Không bắt buộc</Text>
          </View>
          <View style={styles.noteBox}>
            <TextInput
              placeholder="Ví dụ: xe chết máy giữa ngã tư, có thể dắt vào lề đường, cần thợ mang theo kích nâng..."
              placeholderTextColor="#94a3b8"
              value={note}
              onChangeText={(t) => t.length <= NOTE_MAX && setNote(t)}
              style={styles.noteInput}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.noteFoot}>
              <Text style={styles.noteHint}>Càng chi tiết, thợ cứu hộ chuẩn bị càng nhanh</Text>
              <Text style={styles.noteCount}>
                {note.length}/{NOTE_MAX}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky bottom */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Text style={[styles.summary, canSend && styles.summaryReady]} numberOfLines={1}>
          {summary}
        </Text>
        <TouchableOpacity
          style={[styles.sendBtn, (!canSend || sending) && styles.sendBtnDisabled]}
          onPress={onSend}
          activeOpacity={canSend && !sending ? 0.9 : 1}
          disabled={!canSend || sending}
        >
          {sending ? (
            <ActivityIndicator color="#ffffff" />
          ) : isPickGarageMode ? (
            <ChevronRight size={20} color={canSend ? '#ffffff' : SUB} strokeWidth={2.4} />
          ) : (
            <Siren size={20} color={canSend ? '#ffffff' : SUB} strokeWidth={2.4} />
          )}
          <Text style={[styles.sendText, !canSend && !sending && styles.sendTextDisabled]}>
            {sending
              ? isPickGarageMode
                ? 'Đang chuẩn bị...'
                : 'Đang gửi...'
              : isPickGarageMode
              ? 'Tiếp theo — Chọn gara'
              : params.garageName
              ? `Gửi yêu cầu cho ${params.garageName}`
              : 'Gửi yêu cầu cứu hộ'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Modal popup thông báo áp dụng chẩn đoán AI tông màu cam sang trọng */}
      <Modal
        visible={aiAppliedModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAiAppliedModal({ visible: false, label: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Sparkles size={28} color="#ffffff" strokeWidth={2.4} />
            </View>
            <Text style={styles.modalTitle}>Đã áp dụng chẩn đoán AI</Text>
            <Text style={styles.modalMessage}>
              Hệ thống đã tự động chọn sự cố:{'\n'}
              <Text style={styles.modalHighlight}>"{aiAppliedModal.label}"</Text>
              {'\n'}và cập nhật ghi chú sự cố cho thợ cứu hộ.
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setAiAppliedModal({ visible: false, label: '' })}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Thêm phương tiện mới trực tiếp khi tạo đơn */}
      <AddVehicleModal
        visible={showAddVehicleModal}
        onClose={() => setShowAddVehicleModal(false)}
        onSuccess={handleVehicleAdded}
        initialVehicleType={vehicle || 'MOTORBIKE'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  /* Header */
  headerSafe: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: LINE },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: FIELD,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: INK, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, fontWeight: '500', color: SUB, marginTop: 1 },
  stepPill: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  stepPillText: { fontSize: 12, fontWeight: '800', color: BRAND },
  progressTrack: { height: 3, backgroundColor: '#f1f5f9', width: '100%' },
  progressFill: { height: '100%', backgroundColor: BRAND, borderRadius: 2 },

  /* Body */
  body: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 36 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  qTitle: { fontSize: 15, fontWeight: '800', color: INK, letterSpacing: -0.2 },
  sectionSubtitle: { fontSize: 12, fontWeight: '500', color: SUB, marginTop: -4, marginBottom: 12, lineHeight: 17 },
  reqBadge: { backgroundColor: '#ffedd5', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  reqBadgeText: { fontSize: 10, fontWeight: '800', color: BRAND },
  optional: { fontSize: 12, fontWeight: '600', color: SUB },

  /* Vehicle Selection Cards */
  vehicleRow: { flexDirection: 'row', gap: 12 },
  vehicleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: LINE,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  vehicleCardActive: {
    borderColor: BRAND,
    backgroundColor: '#fffaf5',
    shadowColor: BRAND,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  vehicleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconActive: { backgroundColor: BRAND },
  vehicleLabel: { fontSize: 15, fontWeight: '800', color: INK },
  vehicleLabelActive: { color: BRAND },
  vehicleSub: { fontSize: 11, fontWeight: '500', color: SUB, marginTop: 2 },
  vehicleCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Add Vehicle Inline Button & Empty State */
  addVehInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addVehInlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND,
  },
  emptyVehCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fffaf5',
    borderWidth: 1.2,
    borderColor: '#fed7aa',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
  },
  emptyVehIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyVehCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: INK,
  },
  emptyVehCardSub: {
    fontSize: 11,
    color: SUB,
    marginTop: 2,
  },
  emptyVehAddAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyVehAddActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  plateBox: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateBoxActive: {
    backgroundColor: '#ffedd5',
    borderColor: '#fdba74',
  },
  plateBoxText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
  },
  plateBoxTextActive: {
    color: BRAND,
  },
  defaultPill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },

  /* Saved Vehicles */
  vehStateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  vehStateText: { fontSize: 12, fontWeight: '500', color: SUB },
  vehRetry: { fontSize: 12, fontWeight: '800', color: BRAND },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: LINE,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  savedItemActive: { borderColor: BRAND, backgroundColor: '#fffaf5' },
  savedThumb: { width: 46, height: 46, borderRadius: 10, backgroundColor: FIELD },
  savedThumbFallback: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: FIELD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedName: { fontSize: 14, fontWeight: '800', color: INK },
  savedMeta: { fontSize: 12, fontWeight: '500', color: SUB, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: BRAND, backgroundColor: BRAND },

  /* Custom input */
  input: {
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: LINE,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 13,
    fontWeight: '600',
    color: INK,
    marginTop: 4,
  },

  /* AI Card Section */
  aiCard: {
    backgroundColor: '#fffaf5',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 20,
    padding: 16,
    marginTop: 22,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  aiHeader: { marginBottom: 12 },
  aiBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 8 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: BRAND,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  aiTitle: { fontSize: 16, fontWeight: '800', color: INK, letterSpacing: -0.2 },
  aiSub: { fontSize: 12, fontWeight: '500', color: '#9a3412', marginTop: 4, lineHeight: 18 },

  aiInputWrap: { gap: 12 },
  aiToolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  aiToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  aiToolBtnActive: { backgroundColor: DANGER, borderColor: DANGER },
  aiToolBtnHasPhoto: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  aiToolBtnText: { fontSize: 12, fontWeight: '700', color: BRAND },
  aiPulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff' },

  aiInput: {
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '500',
    color: INK,
    minHeight: 70,
    lineHeight: 18,
    textAlignVertical: 'top',
  },

  voiceSampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  voiceSampleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  voiceSampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  voiceSampleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#c2410c',
  },

  aiPhotosSection: { marginTop: 2, gap: 8 },
  aiPhotosLabel: { fontSize: 12, fontWeight: '700', color: BRAND },
  aiPhotosRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  aiThumbWrap: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    backgroundColor: CARD,
  },
  aiThumb: { width: '100%', height: '100%', borderRadius: 10 },
  aiThumbRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAddMiniPhoto: {
    width: 68,
    height: 68,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#fb923c',
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  aiAddMiniText: { fontSize: 10, fontWeight: '700', color: BRAND },

  aiDiagnoseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND,
    borderRadius: 14,
    height: 46,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  aiDiagnoseBtnLoading: { backgroundColor: '#fdba74' },
  aiDiagnoseBtnText: { fontSize: 14, fontWeight: '800', color: '#ffffff' },

  /* AI Result Box */
  aiResultBox: {
    marginTop: 12,
    padding: 16,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    gap: 12,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  aiResultHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  aiResultLabel: { fontSize: 10, fontWeight: '800', color: BRAND, letterSpacing: 0.5 },
  aiResultTitle: { fontSize: 16, fontWeight: '800', color: INK, marginTop: 3, lineHeight: 22 },
  aiSeverityBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  severityDanger: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5' },
  severityWarn: { backgroundColor: '#ffedd5', borderWidth: 1, borderColor: '#fdba74' },
  severityOk: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac' },
  aiSeverityText: { fontSize: 11, fontWeight: '800' },

  aiConfidenceWrap: { backgroundColor: '#fff7ed', padding: 10, borderRadius: 10, gap: 6 },
  aiScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  aiScoreText: { fontSize: 12, fontWeight: '800', color: '#c2410c' },
  aiServiceText: { fontSize: 12, fontWeight: '600', color: SUB },
  aiConfBarTrack: { height: 6, borderRadius: 3, backgroundColor: '#fed7aa', width: '100%', overflow: 'hidden' },
  aiConfBarFill: { height: '100%', backgroundColor: BRAND, borderRadius: 3 },

  aiAdviceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  aiAdviceText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#991b1b', lineHeight: 18 },

  aiIrrelevantBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fdba74',
    borderRadius: 12,
    padding: 12,
  },
  aiIrrelevantTitle: { fontSize: 13, fontWeight: '800', color: '#9a3412', marginBottom: 2 },
  aiIrrelevantSub: { fontSize: 12, fontWeight: '500', color: '#c2410c', lineHeight: 17 },

  aiStepsBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, gap: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  aiStepsTitle: { fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 2 },
  aiStepItemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  aiStepItem: { flex: 1, fontSize: 12, fontWeight: '500', color: '#475569', lineHeight: 17 },

  aiApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND,
    borderRadius: 14,
    height: 46,
    marginTop: 6,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  aiApplyBtnText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },

  /* Issues Grid */
  issueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  issueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: LINE,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '48%',
    flexGrow: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  issueActive: {
    borderColor: BRAND,
    backgroundColor: '#fffaf5',
    shadowColor: BRAND,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  issueActiveDanger: {
    borderColor: DANGER,
    backgroundColor: '#fff5f5',
    shadowColor: DANGER,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  issueIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: FIELD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  issueIconWrapActive: { backgroundColor: '#ffedd5' },
  issueIconWrapDanger: { backgroundColor: '#fee2e2' },
  issueText: { flex: 1, fontSize: 13, fontWeight: '700', color: INK },
  issueCheckWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Accident Banner */
  accidentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  accidentIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: DANGER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accidentText: { flex: 1, fontSize: 13, fontWeight: '600', color: DANGER_INK, lineHeight: 18 },

  /* Phone input */
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: LINE,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneInput: { flex: 1, fontSize: 14, fontWeight: '600', color: INK, padding: 0 },

  /* Note box */
  noteBox: {
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: LINE,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  noteInput: { fontSize: 13, fontWeight: '500', color: INK, minHeight: 76, lineHeight: 19 },
  noteFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 6,
  },
  noteHint: { fontSize: 11, fontWeight: '500', color: '#94a3b8' },
  noteCount: { fontSize: 11, fontWeight: '700', color: SUB },

  /* Sticky bottom */
  bottomBar: {
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 12,
  },
  summary: { fontSize: 12, fontWeight: '600', color: SUB, marginBottom: 10, textAlign: 'center' },
  summaryReady: { color: INK, fontWeight: '700' },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND,
    borderRadius: 16,
    height: 52,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  sendBtnDisabled: { backgroundColor: '#e2e8f0', shadowOpacity: 0, elevation: 0 },
  sendText: { fontSize: 15, fontWeight: '800', color: '#ffffff', letterSpacing: -0.2 },
  sendTextDisabled: { color: '#94a3b8' },

  /* Modal Popup Thông báo áp dụng AI (Màu cam) */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: CARD,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: INK,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  modalMessage: {
    fontSize: 13.5,
    fontWeight: '500',
    color: SUB,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  modalHighlight: {
    fontWeight: '800',
    color: BRAND,
  },
  modalBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  chosenGarageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  chosenGarageIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chosenGarageBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  chosenGarageBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: BRAND,
    letterSpacing: 0.5,
  },
  chosenGarageOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  chosenGarageTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: INK,
  },
  chosenGarageSub: {
    fontSize: 12,
    color: SUB,
    marginTop: 2,
  },
});
