import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
  BackHandler
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import axiosClient, { resolveFileUrl } from '../../api/axiosClient';
import { rescueApi } from '../../api/rescueApi';
import { aiVerifyApi, DocumentPhotoAnalysisResult } from '../../api/aiVerifyApi';
import { goongApi } from '../../api/goongApi';
import LocationPickerModal, { PickedLocation } from '../../components/LocationPickerModal';
import WithdrawRegistrationModal from '../../components/WithdrawRegistrationModal';
import DocumentReviewConfirmModal, { FlaggedDocItem } from '../../components/DocumentReviewConfirmModal';
import CustomAlertModal, { AlertType } from '../../components/CustomAlertModal';
import ImagePickerChoiceModal from '../../components/ImagePickerChoiceModal';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Camera,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Check,
  ChevronRight,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Trash2,
  Sparkles,
  Navigation
} from 'lucide-react-native';

export default function RegisterPartnerScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  // Form Fields
  const [garageName, setGarageName] = useState('');
  const accountPhone = user?.phone?.trim() || '';
  const accountEmail = user?.email?.trim() || '';
  const [address, setAddress] = useState('');

  // Vị trí gara (lat/lng thật, chọn trên bản đồ Goong).
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Documents URIs / URLs
  const [idCardFront, setIdCardFront] = useState('');
  const [idCardBack, setIdCardBack] = useState('');
  const [businessLicense, setBusinessLicense] = useState('');
  const [facadePhoto, setFacadePhoto] = useState('');

  // Local URIs for instant & reliable preview (tránh phụ thuộc vào relative path)
  const [localPreviews, setLocalPreviews] = useState<{
    front?: string;
    back?: string;
    license?: string;
    facade?: string;
  }>({});

  // AI Verification states for documents
  const [aiCheckingFront, setAiCheckingFront] = useState(false);
  const [aiFrontResult, setAiFrontResult] = useState<DocumentPhotoAnalysisResult | null>(null);

  const [aiCheckingBack, setAiCheckingBack] = useState(false);
  const [aiBackResult, setAiBackResult] = useState<DocumentPhotoAnalysisResult | null>(null);

  const [aiCheckingLicense, setAiCheckingLicense] = useState(false);
  const [aiLicenseResult, setAiLicenseResult] = useState<DocumentPhotoAnalysisResult | null>(null);

  const [aiCheckingFacade, setAiCheckingFacade] = useState(false);
  const [aiFacadeResult, setAiFacadeResult] = useState<DocumentPhotoAnalysisResult | null>(null);

  // Agreement
  const [agreed, setAgreed] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [fetchingExisting, setFetchingExisting] = useState(true);
  const [existingGarage, setExistingGarage] = useState<any>(null);
  const [isEditingRejected, setIsEditingRejected] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [showReviewConfirmModal, setShowReviewConfirmModal] = useState(false);

  // Custom Alert & Photo Picker Modal states
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type?: AlertType;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = (options: {
    type?: AlertType;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => {
    setAlertModal({
      visible: true,
      type: options.type ?? 'warning',
      title: options.title,
      message: options.message,
      confirmText: options.confirmText ?? 'Đã hiểu',
      cancelText: options.cancelText,
      onConfirm: () => {
        setAlertModal(p => ({ ...p, visible: false }));
        options.onConfirm?.();
      },
      onCancel: options.onCancel ? () => {
        setAlertModal(p => ({ ...p, visible: false }));
        options.onCancel?.();
      } : undefined,
    });
  };

  const isPickerModalOpenRef = useRef(false);
  const isNativePickerOpenRef = useRef(false);
  const pickerTransitionUntilRef = useRef(0);

  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    title: string;
    onCamera: () => void;
    onLibrary: () => void;
  }>({
    visible: false,
    title: '',
    onCamera: () => {},
    onLibrary: () => {},
  });

  const isDocFlaggedInAppeal = (docType: string): { flagged: boolean; reason?: string } => {
    if (!isEditingRejected || !existingGarage) return { flagged: false };

    // 1. Kiểm tra tài liệu trong documents của gara
    const doc = existingGarage.documents?.find((d: any) => d.docType === docType);
    if (doc) {
      if (doc.aiVerified === false || (doc.aiWarning && doc.aiWarning.trim())) {
        return { flagged: true, reason: doc.aiWarning || 'Chưa đạt chuẩn chất lượng' };
      }
    }

    // 2. Kiểm tra từ khóa trong lý do từ chối của Admin
    const reason = (existingGarage.rejectionReason || '').toLowerCase();
    if (docType === 'OWNER_ID_CARD_FRONT' && (reason.includes('mặt trước') || (reason.includes('cccd') && !reason.includes('mặt sau')))) {
      return { flagged: true, reason: 'Admin lưu ý: CCCD mặt trước cần chụp lại' };
    }
    if (docType === 'OWNER_ID_CARD_BACK' && (reason.includes('mặt sau') || reason.includes('cccd sau'))) {
      return { flagged: true, reason: 'Admin lưu ý: CCCD mặt sau cần chụp lại' };
    }
    if (docType === 'BUSINESS_LICENSE' && (reason.includes('gpkd') || reason.includes('giấy phép') || reason.includes('đkkd') || reason.includes('kinh doanh'))) {
      return { flagged: true, reason: 'Admin lưu ý: Giấy phép ĐKKD cần chụp lại rõ nét' };
    }
    if (docType === 'GARAGE_PHOTO' && (reason.includes('mặt tiền') || reason.includes('biển hiệu') || reason.includes('ảnh gara'))) {
      return { flagged: true, reason: 'Admin lưu ý: Ảnh mặt tiền cần chụp rõ biển hiệu' };
    }

    return { flagged: false };
  };

  const renderAlertModal = () => (
    <CustomAlertModal
      visible={alertModal.visible}
      type={alertModal.type}
      title={alertModal.title}
      message={alertModal.message}
      confirmText={alertModal.confirmText}
      cancelText={alertModal.cancelText}
      onConfirm={alertModal.onConfirm || (() => setAlertModal(p => ({ ...p, visible: false })))}
      onCancel={alertModal.onCancel}
    />
  );

  // Check existing garage status on mount
  const checkExistingGarage = async () => {
    try {
      setFetchingExisting(true);
      const res: any = await axiosClient.get('/garages/me');
      if (res?.data) {
        setExistingGarage(res.data);
      }
    } catch (e) {
      // 400/404 means no garage registered yet, which is expected for first-time registrants
      setExistingGarage(null);
    } finally {
      setFetchingExisting(false);
    }
  };

  useEffect(() => {
    checkExistingGarage();
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const last = await Location.getLastKnownPositionAsync();
          if (last) {
            setLocation(prev => prev ?? { lat: last.coords.latitude, lng: last.coords.longitude });
          }
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (pos) {
            setLocation(prev => prev ?? { lat: pos.coords.latitude, lng: pos.coords.longitude });
          }
        }
      } catch (e) {
        console.log('GPS prefetch error in register-partner:', e);
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkExistingGarage();
    }, [])
  );

  // Xử lý nút Back phần cứng Android khi đang ở chế độ kháng cáo / nộp lại hồ sơ
  useEffect(() => {
    if (!isEditingRejected) return;
    const backAction = () => {
      setIsEditingRejected(false);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isEditingRejected]);

  const autoGeocodeAddress = async (addrText: string, force = false) => {
    if (!addrText || !addrText.trim()) return;
    if (location && !force) return;
    setIsGeocoding(true);
    try {
      try {
        // 1. Thử qua Goong Geocode API
        const goongResult = await goongApi.geocode(addrText);
        if (goongResult && goongResult.lat && goongResult.lng) {
          setLocation({ lat: goongResult.lat, lng: goongResult.lng });
          return;
        }
      } catch (e) {
        console.log('Goong geocode failed:', e);
      }

      try {
        // 2. Dự phòng qua Expo Location geocodeAsync
        const expoGeo = await Location.geocodeAsync(addrText);
        if (expoGeo && expoGeo.length > 0) {
          setLocation({ lat: expoGeo[0].latitude, lng: expoGeo[0].longitude });
        }
      } catch (e) {
        console.log('Expo geocode fallback failed:', e);
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const analyzeDocWithAi = async (
    localUri: string,
    docType: 'OWNER_ID_CARD_FRONT' | 'OWNER_ID_CARD_BACK' | 'BUSINESS_LICENSE' | 'GARAGE_PHOTO',
    setter: (uri: string) => void
  ) => {
    setter(localUri);

    if (docType === 'OWNER_ID_CARD_FRONT') { setAiCheckingFront(true); setAiFrontResult(null); }
    else if (docType === 'OWNER_ID_CARD_BACK') { setAiCheckingBack(true); setAiBackResult(null); }
    else if (docType === 'BUSINESS_LICENSE') { setAiCheckingLicense(true); setAiLicenseResult(null); }
    else if (docType === 'GARAGE_PHOTO') { setAiCheckingFacade(true); setAiFacadeResult(null); }

    try {
      const uploadedUrl = await rescueApi.uploadPhoto(localUri);
      setter(uploadedUrl); // Dùng luôn URL upload thành công

      const res = await aiVerifyApi.verifyDocumentPhoto(uploadedUrl, docType, garageName.trim(), address.trim());

      if (docType === 'OWNER_ID_CARD_FRONT') {
        setAiFrontResult(res);
      } else if (docType === 'OWNER_ID_CARD_BACK') {
        setAiBackResult(res);
      } else if (docType === 'BUSINESS_LICENSE') {
        setAiLicenseResult(res);
        if (res.extractedData?.businessName && !garageName.trim()) {
          setGarageName(res.extractedData.businessName);
        }
        if (res.extractedData?.registeredAddress) {
          if (!address.trim()) {
            setAddress(res.extractedData.registeredAddress);
          }
          // Tự động chọn và ghim toạ độ gara trên bản đồ theo địa chỉ GPKD
          autoGeocodeAddress(res.extractedData.registeredAddress, true);
        }
      } else if (docType === 'GARAGE_PHOTO') {
        setAiFacadeResult(res);
        if (res.extractedData?.signboardName && !garageName.trim()) {
          setGarageName(res.extractedData.signboardName);
        }
        if (res.extractedData?.signAddress && !address.trim()) {
          setAddress(res.extractedData.signAddress);
          autoGeocodeAddress(res.extractedData.signAddress, true);
        }
      }

      if (
        (!res.validDocument || res.status === 'REJECTED' || res.isScreenCapture) &&
        !isPickerModalOpenRef.current &&
        !isNativePickerOpenRef.current &&
        Date.now() > pickerTransitionUntilRef.current
      ) {
        showAlert({
          type: res.isScreenCapture || res.status === 'REJECTED' ? 'error' : 'warning',
          title: 'Lưu ý chất lượng ảnh',
          message: res.isScreenCapture
            ? 'Phát hiện tài liệu chụp lại từ màn hình máy tính/thiết bị khác (nguy cơ giả mạo hồ sơ). Vui lòng chụp trực tiếp giấy tờ gốc.'
            : res.message || 'Tài liệu không đúng định dạng hoặc không rõ nét. Vui lòng chụp lại bản gốc.'
        });
      }
    } catch (err: any) {
      console.warn('Lỗi phân tích AI tài liệu:', err);
    } finally {
      if (docType === 'OWNER_ID_CARD_FRONT') setAiCheckingFront(false);
      else if (docType === 'OWNER_ID_CARD_BACK') setAiCheckingBack(false);
      else if (docType === 'BUSINESS_LICENSE') setAiCheckingLicense(false);
      else if (docType === 'GARAGE_PHOTO') setAiCheckingFacade(false);
    }
  };

  const handlePickImage = (
    setter: (uri: string) => void,
    title = 'Ảnh tài liệu',
    docType?: 'OWNER_ID_CARD_FRONT' | 'OWNER_ID_CARD_BACK' | 'BUSINESS_LICENSE' | 'GARAGE_PHOTO'
  ) => {
    const onPicked = (uri: string) => {
      if (docType === 'OWNER_ID_CARD_FRONT') setLocalPreviews(p => ({ ...p, front: uri }));
      else if (docType === 'OWNER_ID_CARD_BACK') setLocalPreviews(p => ({ ...p, back: uri }));
      else if (docType === 'BUSINESS_LICENSE') setLocalPreviews(p => ({ ...p, license: uri }));
      else if (docType === 'GARAGE_PHOTO') setLocalPreviews(p => ({ ...p, facade: uri }));

      if (docType) {
        analyzeDocWithAi(uri, docType, setter);
      } else {
        setter(uri);
      }
    };

    isPickerModalOpenRef.current = true;
    setPickerModal({
      visible: true,
      title: `Tải lên ${title}`,
      onCamera: async () => {
        let pickedUri: string | null = null;
        isNativePickerOpenRef.current = true;
        try {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            showAlert({
              type: 'error',
              title: 'Cần quyền máy ảnh',
              message: 'Vui lòng cấp quyền truy cập máy ảnh để chụp ảnh hồ sơ.'
            });
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            pickedUri = result.assets[0].uri;
          }
        } catch (error) {
          showAlert({ type: 'error', title: 'Lỗi máy ảnh', message: 'Không thể khởi động máy ảnh.' });
        } finally {
          isNativePickerOpenRef.current = false;
        }
        if (pickedUri) {
          onPicked(pickedUri);
        }
      },
      onLibrary: async () => {
        let pickedUri: string | null = null;
        isNativePickerOpenRef.current = true;
        try {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            showAlert({
              type: 'error',
              title: 'Cần quyền thư viện ảnh',
              message: 'Vui lòng cấp quyền truy cập thư viện để chọn ảnh.'
            });
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            pickedUri = result.assets[0].uri;
          }
        } catch (error) {
          showAlert({ type: 'error', title: 'Lỗi thư viện ảnh', message: 'Không thể chọn ảnh từ thư viện.' });
        } finally {
          isNativePickerOpenRef.current = false;
        }
        if (pickedUri) {
          onPicked(pickedUri);
        }
      },
    });
  };

  const handleStartAppeal = () => {
    if (!existingGarage) return;
    setGarageName(existingGarage.name || "");
    setAddress(existingGarage.address || "");
    if (existingGarage.lat != null && existingGarage.lng != null) {
      setLocation({ lat: existingGarage.lat, lng: existingGarage.lng });
    }
    if (existingGarage.documents && Array.isArray(existingGarage.documents)) {
      const frontDoc = existingGarage.documents.find((d: any) => d.docType === "OWNER_ID_CARD_FRONT");
      const backDoc = existingGarage.documents.find((d: any) => d.docType === "OWNER_ID_CARD_BACK");
      const licenseDoc = existingGarage.documents.find((d: any) => d.docType === "BUSINESS_LICENSE");
      const photoDoc = existingGarage.documents.find((d: any) => d.docType === "GARAGE_PHOTO");
      if (frontDoc?.fileUrl) setIdCardFront(frontDoc.fileUrl);
      if (backDoc?.fileUrl) setIdCardBack(backDoc.fileUrl);
      if (licenseDoc?.fileUrl) setBusinessLicense(licenseDoc.fileUrl);
      if (photoDoc?.fileUrl) setFacadePhoto(photoDoc.fileUrl);
    }
    setAgreed(true);
    setIsEditingRejected(true);
  };


  const handlePickedLocation = (loc: PickedLocation) => {
    setLocation({ lat: loc.lat, lng: loc.lng });
    if (loc.address && !address.trim()) setAddress(loc.address);
    setShowMapPicker(false);
  };

  const doSubmit = async () => {
    const uploadIfLocal = async (uri: string, newlyUploaded: string[]): Promise<string> => {
      if (!uri) return '';
      if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('data:')) {
        const url = await rescueApi.uploadPhoto(uri);
        newlyUploaded.push(url);
        return url;
      }
      return uri;
    };

    setLoading(true);
    const newlyUploaded: string[] = [];
    try {
      const [frontUrl, backUrl, licenseUrl, facadeUrl] = await Promise.all([
        uploadIfLocal(idCardFront, newlyUploaded),
        uploadIfLocal(idCardBack, newlyUploaded),
        uploadIfLocal(businessLicense, newlyUploaded),
        uploadIfLocal(facadePhoto, newlyUploaded),
      ]);

      const payload = {
        name: garageName.trim(),
        phone: accountPhone,
        email: accountEmail,
        address: address.trim(),
        lat: location!.lat,
        lng: location!.lng,
        capability: 'BOTH',
        idCardFrontUrl: frontUrl,
        idCardBackUrl: backUrl,
        businessLicenseUrl: licenseUrl,
        facadePhotoUrl: facadeUrl,
      };

      const res: any = await axiosClient.post('/garages/register', payload, { timeout: 60000 });
      const successTitle = isEditingRejected ? 'Nộp lại thành công!' : 'Đăng ký thành công!';
      const successMsg = isEditingRejected
        ? 'Hồ sơ kháng cáo của bạn đã được gửi lại thành công! Ban quản trị sẽ tiến hành thẩm định lại.'
        : 'Hồ sơ đối tác của bạn đã được tiếp nhận và đang chờ Ban quản trị phê duyệt trong 24h.';
      showAlert({
        type: 'success',
        title: successTitle,
        message: successMsg,
        confirmText: 'Xem trạng thái',
        onConfirm: () => {
          setIsEditingRejected(false);
          checkExistingGarage();
        }
      });
      setIsEditingRejected(false);
      if (res?.data) {
        setExistingGarage(res.data);
      } else {
        checkExistingGarage();
      }
    } catch (error: any) {
      // Rollback: Xóa các file vừa upload nếu gửi hồ sơ thất bại để tránh ảnh mồ côi
      for (const u of newlyUploaded) {
        rescueApi.deletePhoto(u).catch(() => { });
      }
      const msg = error?.response?.data?.message || error?.message || 'Có lỗi xảy ra khi gửi hồ sơ. Vui lòng thử lại.';
      showAlert({ type: 'error', title: 'Thông báo', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!garageName.trim()) {
      showAlert({
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập tên Gara / Trung tâm cứu hộ'
      });
      return;
    }
    if (!accountPhone) {
      showAlert({
        type: 'warning',
        title: 'Thiếu số điện thoại',
        message: 'Tài khoản chưa có số điện thoại hợp lệ. Vui lòng cập nhật trong Cài đặt tài khoản trước khi đăng ký đối tác.',
        confirmText: 'Mở Cài đặt',
        cancelText: 'Đóng',
        onConfirm: () => router.push('/customer/edit-profile'),
      });
      return;
    }

    if (!accountEmail) {
      showAlert({
        type: 'warning',
        title: 'Chưa liên kết Email',
        message: 'Vui lòng thêm và xác thực Email qua OTP trong Cài đặt tài khoản trước khi gửi hồ sơ đối tác.',
        confirmText: 'Xác thực ngay',
        cancelText: 'Để sau',
        onConfirm: () => router.push('/customer/edit-profile'),
      });
      return;
    }
    if (!address.trim()) {
      showAlert({
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập địa chỉ cơ sở kinh doanh'
      });
      return;
    }
    if (!location) {
      showAlert({
        type: 'warning',
        title: 'Thiếu vị trí bản đồ',
        message: 'Vui lòng chọn hoặc tự định vị vị trí gara trên bản đồ để hệ thống điều phối cứu hộ chính xác.'
      });
      return;
    }
    if (!agreed) {
      showAlert({
        type: 'warning',
        title: 'Chưa xác nhận cam kết',
        message: 'Vui lòng đồng ý với cam kết vận hành và tiêu chuẩn chất lượng của đối tác.'
      });
      return;
    }
    if (!idCardFront || !idCardBack || !businessLicense || !facadePhoto) {
      showAlert({
        type: 'warning',
        title: 'Thiếu ảnh hồ sơ',
        message: 'Vui lòng tải đủ 4 ảnh: CCCD (mặt trước & sau), Giấy phép ĐKKD và Ảnh mặt tiền Gara để Ban quản trị thẩm định.'
      });
      return;
    }
    // 1. KIỂM TRA CHẶN CỨNG (HARD BLOCK): Nếu phát hiện ảnh tào lao, sai form tài liệu hoặc chụp từ màn hình
    const hardBlocked = getHardBlockedDocs();
    if (hardBlocked.length > 0) {
      showAlert({
        type: 'error',
        title: 'Tài liệu không hợp lệ',
        message: `Hệ thống phát hiện ${hardBlocked.length} tài liệu không đúng định dạng hoặc vi phạm quy định:\n\n` +
          hardBlocked.map(b => `• ${b.title}: ${b.reason}`).join('\n\n') +
          '\n\nBạn bắt buộc phải chụp lại tài liệu gốc thật mới có thể gửi hồ sơ.',
        confirmText: 'Chụp lại ngay'
      });
      return;
    }

    // 2. KIỂM TRA CẢNH BÁO MỀM (SOFT WARNING): Ảnh đúng loại nhưng bị mờ nhẹ / chói sáng
    const flagged = getFlaggedDocs();
    if (flagged.length > 0) {
      setShowReviewConfirmModal(true);
      return;
    }

    doSubmit();
  };

  // Danh sách các tài liệu bị CHẶN CỨNG (Ảnh tào lao, không đúng loại, hoặc chụp lại từ màn hình)
  const getHardBlockedDocs = (): { title: string; reason: string }[] => {
    const blocked: { title: string; reason: string }[] = [];

    if (aiFrontResult && (!aiFrontResult.validDocument || aiFrontResult.isScreenCapture || aiFrontResult.status === 'REJECTED')) {
      blocked.push({
        title: 'CCCD Mặt trước',
        reason: aiFrontResult.isScreenCapture
          ? 'Phát hiện chụp qua màn hình thiết bị khác (nghi vấn gian lận)'
          : (!aiFrontResult.validDocument
            ? 'Không phải tài liệu CCCD (ảnh không đúng định dạng)'
            : (aiFrontResult.message || 'Tài liệu không hợp lệ'))
      });
    }

    if (aiBackResult && (!aiBackResult.validDocument || aiBackResult.isScreenCapture || aiBackResult.status === 'REJECTED')) {
      blocked.push({
        title: 'CCCD Mặt sau',
        reason: aiBackResult.isScreenCapture
          ? 'Phát hiện chụp qua màn hình thiết bị khác (nghi vấn gian lận)'
          : (!aiBackResult.validDocument
            ? 'Không phải tài liệu CCCD (ảnh không đúng định dạng)'
            : (aiBackResult.message || 'Tài liệu không hợp lệ'))
      });
    }

    if (aiLicenseResult && (!aiLicenseResult.validDocument || aiLicenseResult.isScreenCapture || aiLicenseResult.status === 'REJECTED')) {
      blocked.push({
        title: 'Giấy phép ĐKKD',
        reason: aiLicenseResult.isScreenCapture
          ? 'Phát hiện chụp qua màn hình thiết bị khác (nghi vấn gian lận)'
          : (!aiLicenseResult.validDocument
            ? 'Không phải Giấy phép đăng ký kinh doanh hợp lệ'
            : (aiLicenseResult.message || 'Tài liệu không hợp lệ'))
      });
    }

    if (aiFacadeResult && (!aiFacadeResult.validDocument || aiFacadeResult.isScreenCapture || aiFacadeResult.status === 'REJECTED')) {
      blocked.push({
        title: 'Ảnh mặt tiền Gara',
        reason: aiFacadeResult.isScreenCapture
          ? 'Phát hiện chụp qua màn hình thiết bị khác (nghi vấn gian lận)'
          : (!aiFacadeResult.validDocument
            ? 'Không nhận diện được mặt tiền hoặc biển hiệu gara'
            : (aiFacadeResult.message || 'Ảnh không hợp lệ'))
      });
    }

    return blocked;
  };

  // Danh sách các tài liệu CẢNH BÁO MỀM (Đúng loại tài liệu nhưng mờ nhẹ / chói sáng)
  const getFlaggedDocs = (): FlaggedDocItem[] => {
    const list: FlaggedDocItem[] = [];

    if (aiFrontResult && aiFrontResult.validDocument && !aiFrontResult.isScreenCapture && aiFrontResult.status === 'WARNING') {
      list.push({
        title: 'CCCD Mặt trước',
        reason: aiFrontResult.message || 'Ảnh có dấu hiệu bị mờ hoặc chói sáng'
      });
    }

    if (aiBackResult && aiBackResult.validDocument && !aiBackResult.isScreenCapture && aiBackResult.status === 'WARNING') {
      list.push({
        title: 'CCCD Mặt sau',
        reason: aiBackResult.message || 'Ảnh có dấu hiệu bị mờ hoặc chói sáng'
      });
    }

    if (aiLicenseResult && aiLicenseResult.validDocument && !aiLicenseResult.isScreenCapture && aiLicenseResult.status === 'WARNING') {
      list.push({
        title: 'Giấy phép ĐKKD',
        reason: aiLicenseResult.message || 'Ảnh có dấu hiệu bị mờ hoặc chói sáng'
      });
    }

    if (aiFacadeResult && aiFacadeResult.validDocument && !aiFacadeResult.isScreenCapture && aiFacadeResult.status === 'WARNING') {
      list.push({
        title: 'Ảnh mặt tiền Gara',
        reason: aiFacadeResult.message || 'Ảnh có dấu hiệu chưa rõ biển hiệu'
      });
    }

    return list;
  };

  const handleConfirmReviewSubmit = () => {
    setShowReviewConfirmModal(false);
    doSubmit();
  };

  const handleUpgradeToAdmin = async () => {
    try {
      setLoading(true);
      // Call sync-role to upgrade token and session
      const res: any = await axiosClient.post('/auth/sync-role');
      if (res?.data?.user?.role === 'GARAGE_OWNER') {
        await updateUser(res.data.user);
        showAlert({
          type: 'success',
          title: 'Thành công',
          message: 'Chào mừng bạn đến với bảng điều khiển Quản trị Gara!',
          confirmText: 'Bắt đầu ngay',
          onConfirm: () => router.replace('/garage-owner')
        });
      } else {
        showAlert({
          type: 'info',
          title: 'Chưa hoàn tất xét duyệt',
          message: 'Tài khoản chưa được hệ thống nâng cấp quyền Admin Gara. Vui lòng thử lại sau.'
        });
      }
    } catch (e: any) {
      showAlert({
        type: 'error',
        title: 'Lỗi đồng bộ',
        message: e?.response?.data?.message || 'Không thể đồng bộ quyền. Vui lòng thử lại sau.'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setGarageName('');
    setAddress('');
    setLocation(null);
    setIdCardFront('');
    setIdCardBack('');
    setBusinessLicense('');
    setFacadePhoto('');
    setLocalPreviews({});
    setAiFrontResult(null);
    setAiBackResult(null);
    setAiLicenseResult(null);
    setAiFacadeResult(null);
    setAgreed(false);
    setIsEditingRejected(false);
  };

  const handleCancelRegistration = () => {
    setShowWithdrawModal(true);
  };

  const handleConfirmWithdraw = async () => {
    try {
      setCancelling(true);
      await axiosClient.delete('/garages/me/registration');
      // Làm sạch toàn bộ dữ liệu form ngay khi rút hồ sơ thành công
      resetForm();
      setExistingGarage(null);
      setWithdrawSuccess(true);
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể rút hồ sơ lúc này. Vui lòng thử lại.';
      showAlert({ type: 'error', title: 'Lỗi', message: msg });
      return false;
    } finally {
      setCancelling(false);
    }
  };

  const handleNewRegistration = () => {
    setShowWithdrawModal(false);
    resetForm();
    setExistingGarage(null);
    setIsEditingRejected(false);
  };

  const handleGoProfile = () => {
    setShowWithdrawModal(false);
    resetForm();
    setExistingGarage(null);
    router.replace('/customer/profile');
  };

  const handleCloseWithdrawModal = () => {
    setShowWithdrawModal(false);
    if (withdrawSuccess) {
      resetForm();
      setExistingGarage(null);
      router.replace('/customer/profile');
    }
  };

  const handlePromptResetForm = () => {
    showAlert({
      type: 'warning',
      title: 'Làm mới biểu mẫu',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ thông tin và hình ảnh đã nhập để bắt đầu lại từ đầu?',
      cancelText: 'Hủy',
      confirmText: 'Xác nhận xóa',
      onConfirm: resetForm,
    });
  };
  if (fetchingExisting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Đang kiểm tra trạng thái hồ sơ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Already APPROVED -> prompt to access Garage Dashboard
  if (existingGarage?.status === 'APPROVED') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.statusScreenContainer}>
          <View style={[styles.statusIconWrap, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
            <CheckCircle2 size={48} color="#059669" />
          </View>
          <Text style={styles.statusTitle}>Hồ sơ Gara đã được duyệt!</Text>
          <Text style={styles.statusDesc}>
            Chúc mừng bạn! Gara "{existingGarage?.name}" đã được Ban quản trị SRAS phê duyệt thành công.
            Tài khoản của bạn đã sẵn sàng hoạt động với quyền Admin Gara.
          </Text>

          <View style={styles.garageDetailCard}>
            <Text style={styles.cardTitle}>Thông tin đối tác</Text>
            <Text style={styles.cardRow}><Text style={styles.bold}>Tên Gara:</Text> {existingGarage?.name}</Text>
            <Text style={styles.cardRow}><Text style={styles.bold}>Hotline:</Text> {existingGarage?.phone}</Text>
            <Text style={styles.cardRow}><Text style={styles.bold}>Địa chỉ:</Text> {existingGarage?.address}</Text>
            <Text style={styles.cardRow}><Text style={styles.bold}>Chiết khấu:</Text> {existingGarage?.commissionRate || 15}%</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleUpgradeToAdmin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.btnContent}>
                <Building2 size={20} color="#ffffff" />
                <Text style={styles.primaryBtnText}>VÀO BẢNG ĐIỀU KHIỂN GARA</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {renderAlertModal()}
      </SafeAreaView>
    );
  }

  // PENDING state
  if (existingGarage?.status === 'PENDING') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.statusScreenContainer}>
          <View style={[styles.statusIconWrap, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
            <Clock size={48} color="#d97706" />
          </View>
          <Text style={styles.statusTitle}>Hồ sơ đang chờ xét duyệt</Text>
          <Text style={styles.statusDesc}>
            Hồ sơ đăng ký Gara "{existingGarage?.name}" của bạn đã được gửi thành công.
            Ban quản trị SRAS đang tiến hành thẩm định và phản hồi trong 24h - 48h.
          </Text>

          <View style={styles.garageDetailCard}>
            <Text style={styles.cardTitle}>Thông tin đăng ký</Text>
            <Text style={styles.cardRow}><Text style={styles.bold}>Gara:</Text> {existingGarage?.name}</Text>
            <Text style={styles.cardRow}><Text style={styles.bold}>Điện thoại:</Text> {existingGarage?.phone}</Text>
            <Text style={styles.cardRow}><Text style={styles.bold}>Địa chỉ:</Text> {existingGarage?.address}</Text>
            <View style={styles.pendingBadgeRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.pendingText}>Trạng thái: Đang thẩm định</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={checkExistingGarage}
            disabled={cancelling}
          >
            <RefreshCw size={18} color="#ea580c" />
            <Text style={styles.refreshBtnText}>Kiểm tra lại trạng thái duyệt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelRegistrationBtn}
            onPress={handleCancelRegistration}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <>
                <Trash2 size={18} color="#dc2626" />
                <Text style={styles.cancelRegistrationBtnText}>Rút lại hồ sơ đăng ký Gara</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/customer/profile')}
            disabled={cancelling}
          >
            <Text style={styles.secondaryBtnText}>Quay lại trang cá nhân</Text>
          </TouchableOpacity>
        </View>

        <WithdrawRegistrationModal
          visible={showWithdrawModal}
          garageName={existingGarage?.name}
          garagePhone={existingGarage?.phone}
          garageAddress={existingGarage?.address}
          loading={cancelling}
          onClose={handleCloseWithdrawModal}
          onConfirm={handleConfirmWithdraw}
          onNewRegistration={handleNewRegistration}
          onGoProfile={handleGoProfile}
        />

        {renderAlertModal()}
      </SafeAreaView>
    );
  }

  // REJECTED state (When not in editing/appeal mode)
  if (existingGarage?.status === 'REJECTED' && !isEditingRejected) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/customer'); }} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Kết quả xét duyệt hồ sơ</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollStatusContent} showsVerticalScrollIndicator={false}>
          <View style={styles.statusScreenContainer}>
            <View style={[styles.statusIconWrap, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
              <XCircle size={48} color="#dc2626" />
            </View>
            <Text style={styles.statusTitle}>Hồ sơ chưa được phê duyệt</Text>
            <Text style={styles.statusDesc}>
              Ban quản trị SRAS đã kiểm tra hồ sơ của bạn nhưng hiện chưa thể phê duyệt do thông tin chưa đạt tiêu chuẩn.
            </Text>
            <View style={styles.rejectionCard}>
              <View style={styles.rejectionHeaderRow}>
                <AlertTriangle size={18} color="#dc2626" />
                <Text style={styles.rejectionHeaderTitle}>LÝ DO TỪ CHỐI TỪ BAN QUẢN TRỊ</Text>
              </View>
              <Text style={styles.rejectionReasonText}>
                {existingGarage?.rejectionReason || "Hồ sơ chưa đạt yêu cầu hoặc tài liệu đính kèm bị mờ, không rõ nét."}
              </Text>
              <View style={styles.rejectionTipBox}>
                <Text style={styles.rejectionTipText}>
                  💡 Bạn có thể bấm nút <Text style={{ fontWeight: "800" }}>"KHÁNG CÁO / NỘP LẠI HỒ SƠ"</Text> bên dưới để cập nhật lại thông tin hoặc chụp lại ảnh giấy tờ rõ nét hơn.
                </Text>
              </View>
            </View>
            <View style={styles.garageDetailCard}>
              <Text style={styles.cardTitle}>Thông tin đã đăng ký</Text>
              <Text style={styles.cardRow}><Text style={styles.bold}>Gara:</Text> {existingGarage?.name}</Text>
              <Text style={styles.cardRow}><Text style={styles.bold}>Hotline:</Text> {existingGarage?.phone}</Text>
              <Text style={styles.cardRow}><Text style={styles.bold}>Địa chỉ:</Text> {existingGarage?.address}</Text>
              <View style={styles.rejectedBadgeRow}>
                <View style={[styles.pulseDot, { backgroundColor: "#dc2626" }]} />
                <Text style={styles.rejectedBadgeText}>Trạng thái: Bị từ chối</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.appealPrimaryBtn} onPress={handleStartAppeal} activeOpacity={0.85} disabled={cancelling}>
              <RotateCcw size={18} color="#ffffff" />
              <Text style={styles.appealPrimaryBtnText}>KHÁNG CÁO / NỘP LẠI HỒ SƠ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelRegistrationBtn, { marginTop: 4 }]}
              onPress={handleCancelRegistration}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#dc2626" />
              ) : (
                <>
                  <Trash2 size={18} color="#dc2626" />
                  <Text style={styles.cancelRegistrationBtnText}>Huỷ bỏ hồ sơ đăng ký này</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/customer/profile')} disabled={cancelling}>
              <Text style={styles.secondaryBtnText}>Quay lại trang cá nhân</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <WithdrawRegistrationModal
          visible={showWithdrawModal}
          garageName={existingGarage?.name}
          garagePhone={existingGarage?.phone}
          garageAddress={existingGarage?.address}
          loading={cancelling}
          onClose={handleCloseWithdrawModal}
          onConfirm={handleConfirmWithdraw}
          onNewRegistration={handleNewRegistration}
          onGoProfile={handleGoProfile}
        />

        {renderAlertModal()}
      </SafeAreaView>
    );
  }

  // Trạng thái các tài liệu bị gắn cờ cần chụp lại trong chế độ Kháng cáo
  const frontFlag = isDocFlaggedInAppeal('OWNER_ID_CARD_FRONT');
  const backFlag = isDocFlaggedInAppeal('OWNER_ID_CARD_BACK');
  const licenseFlag = isDocFlaggedInAppeal('BUSINESS_LICENSE');
  const facadeFlag = isDocFlaggedInAppeal('GARAGE_PHOTO');

  // Registration Form (Matching Image 1)
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => {
            if (isEditingRejected) {
              setIsEditingRejected(false);
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/customer');
            }
          }}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{isEditingRejected ? 'Kháng cáo / Nộp lại hồ sơ' : 'Đăng ký Đối tác Cứu hộ'}</Text>
        {!isEditingRejected ? (
          <TouchableOpacity
            onPress={handlePromptResetForm}
            style={styles.resetHeaderBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <RotateCcw size={15} color="#ea580c" />
            <Text style={styles.resetHeaderBtnText}>Làm mới</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Appeal Mode Banner (When re-submitting rejected application) */}
        {isEditingRejected && (
          <View style={styles.appealModeBanner}>
            <View style={styles.appealModelHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <AlertTriangle size={18} color="#b45309" />
                <Text style={styles.appealModeBannerTitle}>CHẾ ĐỘ NỘP LẠI / KHÁNG CÁO</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditingRejected(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.cancelAppealText}>Hủy chỉnh sửa</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.appealModeBannerDesc}>
              <Text style={{ fontWeight: "800" }}>Lý do từ chối: </Text>
              {existingGarage?.rejectionReason || "Cần bổ sung thông tin hoặc chụp lại tài liệu"}
            </Text>
            <Text style={styles.appealModeBannerHint}>
              * Vui lòng thay thế các ảnh giấy tờ bị mờ hoặc sửa thông tin chưa chuẩn xác rồi bấm nộp lại bên dưới.
            </Text>
          </View>
        )}

        {/* Hero Banner (Matching Image 1) */}
        <View style={styles.heroBanner}>
          <View style={styles.heroIconBox}>
            <Building2 size={24} color="#ea580c" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Gia nhập mạng lưới SRAS Partner</Text>
            <Text style={styles.heroSubtitle}>
              Tiếp cận hàng nghìn khách hàng cứu hộ mỗi ngày, tối ưu doanh thu và quản trị gara chuyên nghiệp.
            </Text>
          </View>
        </View>


        {/* Section 1: THÔNG TIN CƠ BẢN */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>1. THÔNG TIN CƠ BẢN</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Tên Gara / Trung tâm cứu hộ *</Text>
            <View style={styles.inputWrap}>
              <Building2 size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="VD: Gara AutoCare Thủ Đức"
                placeholderTextColor="#94a3b8"
                value={garageName}
                onChangeText={setGarageName}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Số điện thoại tài khoản *</Text>
            <View style={[styles.inputWrap, styles.inputWrapLocked]}>
              <Phone size={18} color="#64748b" style={styles.inputIcon} />
              <Text style={styles.lockedText} numberOfLines={1}>
                {accountPhone || 'Chưa cập nhật số điện thoại'}
              </Text>
              {!!accountPhone && (
                <View style={styles.verifiedPill}>
                  <Text style={styles.verifiedPillText}>✓ Đã xác thực</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email tài khoản *</Text>
            {accountEmail ? (
              <View style={[styles.inputWrap, styles.inputWrapLocked]}>
                <Mail size={18} color="#64748b" style={styles.inputIcon} />
                <Text style={styles.lockedText} numberOfLines={1}>
                  {accountEmail}
                </Text>
                <View style={styles.verifiedPill}>
                  <Text style={styles.verifiedPillText}>✓ Đã xác thực</Text>
                </View>
              </View>
            ) : (
              <View style={styles.missingEmailCard}>
                <Text style={styles.missingEmailText}>
                  Tài khoản chưa liên kết Email. Cần xác thực Email qua OTP trong Cài đặt tài khoản trước khi đăng ký.
                </Text>
                <TouchableOpacity
                  style={styles.missingEmailBtn}
                  onPress={() => router.push('/customer/edit-profile')}
                  activeOpacity={0.85}
                >
                  <Mail size={14} color="#ffffff" />
                  <Text style={styles.missingEmailBtnText}>Thêm & xác thực Email ngay</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Địa chỉ cơ sở kinh doanh *</Text>
            <View style={styles.inputWrap}>
              <MapPin size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="VD: 123 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức"
                placeholderTextColor="#94a3b8"
                value={address}
                onChangeText={setAddress}
                onBlur={() => {
                  if (address.trim() && address.trim().length >= 8) {
                    autoGeocodeAddress(address.trim(), true);
                  }
                }}
              />
            </View>
          </View>

          {/* Chọn vị trí gara trên bản đồ (lat/lng thật để điều phối cứu hộ) */}
          <View style={styles.fieldGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.label}>Vị trí gara trên bản đồ *</Text>
              {address.trim() ? (
                <TouchableOpacity
                  onPress={() => autoGeocodeAddress(address.trim(), true)}
                  disabled={isGeocoding}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  {isGeocoding ? (
                    <ActivityIndicator size="small" color="#ea580c" />
                  ) : (
                    <>
                      <Navigation size={13} color="#ea580c" />
                      <Text style={{ fontSize: 12, color: '#ea580c', fontWeight: '600' }}>Tự định vị theo địa chỉ</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.mapPickBtn, location && styles.mapPickBtnDone]}
              onPress={() => setShowMapPicker(true)}
              activeOpacity={0.85}
            >
              <View style={[styles.mapPickIcon, location && styles.mapPickIconDone]}>
                {isGeocoding ? (
                  <ActivityIndicator size="small" color="#ea580c" />
                ) : location ? (
                  <CheckCircle2 size={20} color="#059669" />
                ) : (
                  <MapPin size={20} color="#ea580c" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mapPickTitle}>
                  {location ? 'Đã ghim vị trí gara' : 'Chọn vị trí gara trên bản đồ'}
                </Text>
                <Text style={styles.mapPickSub} numberOfLines={1}>
                  {isGeocoding
                    ? 'Đang tự động định vị theo địa chỉ...'
                    : location
                    ? `Toạ độ: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)} (Bấm để chỉnh sửa)`
                    : 'Bắt buộc — tự động ghim khi nhập địa chỉ hoặc GPKD'}
                </Text>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: HỒ SƠ PHÁP LÝ & XÁC MINH */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>2. HỒ SƠ PHÁP LÝ & XÁC MINH</Text>
          <Text style={styles.sectionDesc}>
            Chụp ảnh hoặc tải lên tài liệu rõ nét, không bị lóa sáng hay mất góc.
          </Text>

          {/* Auto-Fill Card (nếu phát hiện thông tin từ CCCD hoặc GPKD) */}
          {(aiLicenseResult?.extractedData?.businessName || aiFrontResult?.extractedData?.fullName || aiLicenseResult?.extractedData?.email || aiLicenseResult?.extractedData?.registeredAddress) && (
            <View style={styles.autoFillCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FileText size={16} color="#ea580c" />
                <Text style={styles.autoFillTitle}>Tự động nhận diện thông tin hồ sơ</Text>
              </View>
              <Text style={styles.autoFillSubtitle}>
                {aiLicenseResult?.extractedData?.businessName ? `• Cơ sở: ${aiLicenseResult.extractedData.businessName}\n` : ''}
                {aiLicenseResult?.extractedData?.taxCode ? `• Mã số thuế: ${aiLicenseResult.extractedData.taxCode}\n` : ''}
                {aiLicenseResult?.extractedData?.email ? `• Email: ${aiLicenseResult.extractedData.email}\n` : ''}
                {aiLicenseResult?.extractedData?.phone ? `• SĐT: ${aiLicenseResult.extractedData.phone}\n` : ''}
                {aiLicenseResult?.extractedData?.registeredAddress ? `• Địa chỉ: ${aiLicenseResult.extractedData.registeredAddress}\n` : ''}
                {location ? `• Toạ độ: Đã ghim (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})\n` : ''}
                {aiFrontResult?.extractedData?.fullName ? `• Đại diện: ${aiFrontResult.extractedData.fullName}` : ''}
              </Text>
              <TouchableOpacity
                style={styles.autoFillBtn}
                onPress={() => {
                  if (aiLicenseResult?.extractedData?.businessName) setGarageName(aiLicenseResult.extractedData.businessName);
                  if (aiLicenseResult?.extractedData?.registeredAddress) {
                    setAddress(aiLicenseResult.extractedData.registeredAddress);
                    autoGeocodeAddress(aiLicenseResult.extractedData.registeredAddress, true);
                  }
                  showAlert({
                    type: 'success',
                    title: 'Thành công',
                    message: 'Đã tự động cập nhật tên cơ sở, địa chỉ và định vị toạ độ gara trên bản đồ.'
                  });
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.autoFillBtnText}>Tự động điền vào form</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* CCCD 2 mặt */}
          <Text style={[styles.label, { marginTop: 8 }]}>Căn cước công dân (CCCD) chủ gara *</Text>
          <View style={styles.twoColumnGrid}>
            {/* Front */}
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={[
                  styles.idCardBox,
                  !!(localPreviews.front || idCardFront) && styles.docBoxFilled,
                  (frontFlag.flagged || (aiFrontResult?.status === 'REJECTED' && !aiCheckingFront)) && styles.docBoxFlagged,
                ]}
                onPress={() => handlePickImage(setIdCardFront, 'Mặt trước CCCD', 'OWNER_ID_CARD_FRONT')}
                activeOpacity={0.8}
              >
                {(localPreviews.front || idCardFront) ? (
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: localPreviews.front || resolveFileUrl(idCardFront) }}
                      style={styles.uploadedImg}
                      resizeMode="cover"
                    />
                    {frontFlag.flagged ? (
                      <View style={styles.appealFlaggedBadge}>
                        <AlertTriangle size={11} color="#ffffff" />
                        <Text style={styles.appealFlaggedText}>CẦN CHỤP LẠI</Text>
                      </View>
                    ) : (
                      <View style={styles.repickBadge}>
                        <RotateCcw size={11} color="#ffffff" />
                        <Text style={styles.repickText}>Đổi</Text>
                      </View>
                    )}
                    {aiCheckingFront && (
                      <View style={styles.aiBadgeLoading}>
                        <ActivityIndicator size="small" color="#ffffff" />
                      </View>
                    )}
                    {aiFrontResult && !aiCheckingFront && (
                      <View style={[styles.aiBadgeTag, aiFrontResult.status === 'VERIFIED' ? styles.aiTagSuccess : (aiFrontResult.status === 'WARNING' ? styles.aiTagWarning : styles.aiTagDanger)]}>
                        <Text style={styles.aiTagText} numberOfLines={1} ellipsizeMode="tail">
                          {aiFrontResult.isScreenCapture
                            ? '✕ Chụp từ màn hình'
                            : !aiFrontResult.validDocument
                            ? '✕ Sai loại tài liệu'
                            : aiFrontResult.status === 'VERIFIED'
                            ? '✓ Hợp lệ'
                            : '⚠ Cần kiểm tra'}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Camera size={26} color="#ea580c" />
                    <Text style={styles.uploadBoxLabel}>Mặt trước CCCD</Text>
                    <Text style={styles.uploadHint}>Chụp hoặc tải ảnh</Text>
                  </View>
                )}
              </TouchableOpacity>
              {frontFlag.flagged && (
                <Text style={styles.docFlaggedReason} numberOfLines={2}>
                  ⚠ {frontFlag.reason}
                </Text>
              )}
              {aiFrontResult?.message && !aiCheckingFront && aiFrontResult.status === 'REJECTED' && !frontFlag.flagged && (
                <Text style={styles.docErrorReason} numberOfLines={2}>
                  {aiFrontResult.message}
                </Text>
              )}
            </View>

            {/* Back */}
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={[
                  styles.idCardBox,
                  !!(localPreviews.back || idCardBack) && styles.docBoxFilled,
                  (backFlag.flagged || (aiBackResult?.status === 'REJECTED' && !aiCheckingBack)) && styles.docBoxFlagged,
                ]}
                onPress={() => handlePickImage(setIdCardBack, 'Mặt sau CCCD', 'OWNER_ID_CARD_BACK')}
                activeOpacity={0.8}
              >
                {(localPreviews.back || idCardBack) ? (
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: localPreviews.back || resolveFileUrl(idCardBack) }}
                      style={styles.uploadedImg}
                      resizeMode="cover"
                    />
                    {backFlag.flagged ? (
                      <View style={styles.appealFlaggedBadge}>
                        <AlertTriangle size={11} color="#ffffff" />
                        <Text style={styles.appealFlaggedText}>CẦN CHỤP LẠI</Text>
                      </View>
                    ) : (
                      <View style={styles.repickBadge}>
                        <RotateCcw size={11} color="#ffffff" />
                        <Text style={styles.repickText}>Đổi</Text>
                      </View>
                    )}
                    {aiCheckingBack && (
                      <View style={styles.aiBadgeLoading}>
                        <ActivityIndicator size="small" color="#ffffff" />
                      </View>
                    )}
                    {aiBackResult && !aiCheckingBack && (
                      <View style={[styles.aiBadgeTag, aiBackResult.status === 'VERIFIED' ? styles.aiTagSuccess : (aiBackResult.status === 'WARNING' ? styles.aiTagWarning : styles.aiTagDanger)]}>
                        <Text style={styles.aiTagText} numberOfLines={1} ellipsizeMode="tail">
                          {aiBackResult.isScreenCapture
                            ? '✕ Chụp từ màn hình'
                            : !aiBackResult.validDocument
                            ? '✕ Sai loại tài liệu'
                            : aiBackResult.status === 'VERIFIED'
                            ? '✓ Hợp lệ'
                            : '⚠ Cần kiểm tra'}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Camera size={26} color="#ea580c" />
                    <Text style={styles.uploadBoxLabel}>Mặt sau CCCD</Text>
                    <Text style={styles.uploadHint}>Chụp hoặc tải ảnh</Text>
                  </View>
                )}
              </TouchableOpacity>
              {backFlag.flagged && (
                <Text style={styles.docFlaggedReason} numberOfLines={2}>
                  ⚠ {backFlag.reason}
                </Text>
              )}
              {aiBackResult?.message && !aiCheckingBack && aiBackResult.status === 'REJECTED' && !backFlag.flagged && (
                <Text style={styles.docErrorReason} numberOfLines={2}>
                  {aiBackResult.message}
                </Text>
              )}
            </View>
          </View>

          {/* Business License */}
          <Text style={[styles.label, { marginTop: 14 }]}>Giấy phép đăng ký kinh doanh *</Text>
          <TouchableOpacity
            style={[
              styles.largeDocBox,
              !!(localPreviews.license || businessLicense) && styles.docBoxFilled,
              (licenseFlag.flagged || (aiLicenseResult?.status === 'REJECTED' && !aiCheckingLicense)) && styles.docBoxFlagged,
            ]}
            onPress={() => handlePickImage(setBusinessLicense, 'Giấy phép ĐKKD', 'BUSINESS_LICENSE')}
            activeOpacity={0.8}
          >
            {(localPreviews.license || businessLicense) ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: localPreviews.license || resolveFileUrl(businessLicense) }}
                  style={styles.uploadedImgLarge}
                  resizeMode="cover"
                />
                {licenseFlag.flagged ? (
                  <View style={styles.appealFlaggedBadge}>
                    <AlertTriangle size={12} color="#ffffff" />
                    <Text style={styles.appealFlaggedText}>CẦN CHỤP LẠI</Text>
                  </View>
                ) : (
                  <View style={styles.repickBadge}>
                    <RotateCcw size={12} color="#ffffff" />
                    <Text style={styles.repickText}>Đổi ảnh</Text>
                  </View>
                )}
                {aiCheckingLicense && (
                  <View style={styles.aiBadgeLoading}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700', marginLeft: 6 }}>Đang kiểm tra...</Text>
                  </View>
                )}
                {aiLicenseResult && !aiCheckingLicense && (
                  <View style={[styles.aiBadgeTag, aiLicenseResult.status === 'VERIFIED' ? styles.aiTagSuccess : (aiLicenseResult.status === 'WARNING' ? styles.aiTagWarning : styles.aiTagDanger)]}>
                    <Text style={styles.aiTagText} numberOfLines={1} ellipsizeMode="tail">
                      {aiLicenseResult.isScreenCapture
                        ? '✕ Chụp từ màn hình'
                        : !aiLicenseResult.validDocument
                        ? '✕ Sai loại tài liệu'
                        : aiLicenseResult.status === 'VERIFIED'
                        ? '✓ Giấy phép hợp lệ'
                        : '⚠ Cần kiểm tra'}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <View style={styles.docIconWrap}>
                  <FileText size={28} color="#ea580c" />
                </View>
                <Text style={styles.uploadBoxLabel}>Chụp hoặc tải lên Giấy phép ĐKKD</Text>
                <Text style={styles.uploadHint}>Hỗ trợ chụp trực tiếp hoặc tải từ thư viện</Text>
              </View>
            )}
          </TouchableOpacity>
          {licenseFlag.flagged && (
            <Text style={styles.docFlaggedReason} numberOfLines={2}>
              ⚠ {licenseFlag.reason}
            </Text>
          )}
          {aiLicenseResult?.message && !aiCheckingLicense && aiLicenseResult.status === 'REJECTED' && !licenseFlag.flagged && (
            <Text style={styles.docErrorReason} numberOfLines={2}>
              {aiLicenseResult.message}
            </Text>
          )}
        </View>

        {/* Section 3: HÌNH ẢNH MẶT TIỀN GARA */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>3. HÌNH ẢNH MẶT TIỀN GARA</Text>
          <Text style={styles.sectionDesc}>
            Hình ảnh mặt tiền rõ biển hiệu giúp kỹ thuật viên và khách hàng dễ nhận diện.
          </Text>

          <TouchableOpacity
            style={[
              styles.largeDocBox,
              !!(localPreviews.facade || facadePhoto) && styles.docBoxFilled,
              (facadeFlag.flagged || (aiFacadeResult?.status === 'REJECTED' && !aiCheckingFacade)) && styles.docBoxFlagged,
            ]}
            onPress={() => handlePickImage(setFacadePhoto, 'Ảnh mặt tiền Gara', 'GARAGE_PHOTO')}
            activeOpacity={0.8}
          >
            {(localPreviews.facade || facadePhoto) ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: localPreviews.facade || resolveFileUrl(facadePhoto) }}
                  style={styles.uploadedImgLarge}
                  resizeMode="cover"
                />
                {facadeFlag.flagged ? (
                  <View style={styles.appealFlaggedBadge}>
                    <AlertTriangle size={12} color="#ffffff" />
                    <Text style={styles.appealFlaggedText}>CẦN CHỤP LẠI</Text>
                  </View>
                ) : (
                  <View style={styles.repickBadge}>
                    <RotateCcw size={12} color="#ffffff" />
                    <Text style={styles.repickText}>Đổi ảnh</Text>
                  </View>
                )}
                {aiCheckingFacade && (
                  <View style={styles.aiBadgeLoading}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700', marginLeft: 6 }}>Đang kiểm tra...</Text>
                  </View>
                )}
                {aiFacadeResult && !aiCheckingFacade && (
                  <View style={[styles.aiBadgeTag, aiFacadeResult.status === 'VERIFIED' ? styles.aiTagSuccess : (aiFacadeResult.status === 'WARNING' ? styles.aiTagWarning : styles.aiTagDanger)]}>
                    <Text style={styles.aiTagText} numberOfLines={1} ellipsizeMode="tail">
                      {aiFacadeResult.isScreenCapture
                        ? '✕ Chụp từ màn hình'
                        : !aiFacadeResult.validDocument
                        ? '✕ Sai loại tài liệu'
                        : aiFacadeResult.status === 'VERIFIED'
                        ? '✓ Mặt tiền hợp lệ'
                        : '⚠ Cần kiểm tra'}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <View style={styles.docIconWrap}>
                  <Camera size={28} color="#ea580c" />
                </View>
                <Text style={styles.uploadBoxLabel}>Ảnh chụp rõ biển hiệu và mặt tiền</Text>
                <Text style={styles.uploadHint}>Nhấn để chụp hoặc chọn ảnh từ thư viện</Text>
              </View>
            )}
          </TouchableOpacity>
          {facadeFlag.flagged && (
            <Text style={styles.docFlaggedReason} numberOfLines={2}>
              ⚠ {facadeFlag.reason}
            </Text>
          )}
          {aiFacadeResult?.message && !aiCheckingFacade && aiFacadeResult.status === 'REJECTED' && !facadeFlag.flagged && (
            <Text style={styles.docErrorReason} numberOfLines={2}>
              {aiFacadeResult.message}
            </Text>
          )}
        </View>

        {/* Terms & Agreement Checkbox */}
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setAgreed(!agreed)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
            {agreed && <Check size={14} color="#ffffff" strokeWidth={3} />}
          </View>
          <Text style={styles.termsText}>
            Tôi cam kết các thông tin và hồ sơ pháp lý cung cấp là hoàn toàn chính xác, tuân thủ mọi quy định vận hành và an toàn cứu hộ của hệ thống SRAS Partner.
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.primaryBtn, (!agreed || loading) && styles.primaryBtnDisabled]}
          onPress={handleSubmit}
          disabled={!agreed || loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <View style={styles.btnContent}>
              <Text style={styles.primaryBtnText}>{isEditingRejected ? 'NỘP LẠI HỒ SƠ XÉT DUYỆT' : 'GỬI HỒ SƠ ĐĂNG KÝ'}</Text>
              <ChevronRight size={20} color="#ffffff" />
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      <LocationPickerModal
        visible={showMapPicker}
        title="Chọn vị trí gara"
        initial={location}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handlePickedLocation}
      />

      <DocumentReviewConfirmModal
        visible={showReviewConfirmModal}
        flaggedDocs={getFlaggedDocs()}
        loading={loading}
        onClose={() => setShowReviewConfirmModal(false)}
        onConfirm={handleConfirmReviewSubmit}
      />

      {renderAlertModal()}

      <ImagePickerChoiceModal
        visible={pickerModal.visible}
        title={pickerModal.title}
        onCamera={pickerModal.onCamera}
        onLibrary={pickerModal.onLibrary}
        onClose={() => {
          isPickerModalOpenRef.current = false;
          pickerTransitionUntilRef.current = Date.now() + 550;
          setPickerModal(p => ({ ...p, visible: false }));
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    padding: 16,
    borderRadius: 20,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ea580c',
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#7c2d12',
    lineHeight: 18,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: -8,
    lineHeight: 18,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  inputWrapLocked: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  lockedText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  verifiedPill: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginLeft: 8,
  },
  verifiedPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#059669',
  },
  missingEmailCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  missingEmailText: {
    fontSize: 12.5,
    color: '#92400e',
    fontWeight: '600',
    lineHeight: 18,
  },
  missingEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  missingEmailBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  mapPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  mapPickBtnDone: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  mapPickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPickIconDone: {
    backgroundColor: '#d1fae5',
  },
  mapPickTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  mapPickSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  idCardBox: {
    width: '100%',
    height: 135,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 16,
    overflow: 'hidden',
  },
  largeDocBox: {
    height: 185,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 16,
    overflow: 'hidden',
  },
  docBoxFilled: {
    borderStyle: 'solid',
    borderColor: '#cbd5e1',
    backgroundColor: '#0f172a',
  },
  docBoxFlagged: {
    borderColor: '#ef4444',
    borderWidth: 2.2,
    borderStyle: 'solid',
    backgroundColor: '#fff1f2',
  },
  appealFlaggedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    elevation: 3,
  },
  appealFlaggedText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  docFlaggedReason: {
    fontSize: 11,
    color: '#b91c1c',
    marginTop: 5,
    fontWeight: '700',
    paddingHorizontal: 4,
    lineHeight: 15,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  repickBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  repickText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '700',
  },
  docErrorReason: {
    fontSize: 11,
    color: '#b91c1c',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 6,
    fontWeight: '600',
    lineHeight: 15,
  },
  uploadPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 4,
  },
  docIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadBoxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  uploadHint: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },
  uploadedImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadedImgLarge: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusScreenContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  garageDetailCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 24,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  cardRow: {
    fontSize: 13,
    color: '#475569',
  },
  bold: {
    fontWeight: '700',
    color: '#1e293b',
  },
  pendingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d97706',
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    width: '100%',
    marginBottom: 12,
  },
  refreshBtnText: {
    color: '#ea580c',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelRegistrationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    width: '100%',
    marginBottom: 12,
  },
  cancelRegistrationBtnText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  scrollStatusContent: {
    padding: 20,
    paddingBottom: 40,
  },
  rejectionCard: {
    width: '100%',
    backgroundColor: '#fef2f2',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    padding: 16,
    marginBottom: 20,
    gap: 8,
  },
  rejectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rejectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#b91c1c',
    letterSpacing: 0.5,
  },
  rejectionReasonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    lineHeight: 20,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  rejectionTipBox: {
    marginTop: 4,
  },
  rejectionTipText: {
    fontSize: 12,
    color: '#7f1d1d',
    lineHeight: 18,
  },
  rejectedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  rejectedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  appealPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ea580c',
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 10,
  },
  appealPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  appealModeBanner: {
    backgroundColor: '#fffbeb',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#fde68a',
    padding: 16,
    gap: 8,
  },
  appealModelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appealModeBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#b45309',
    letterSpacing: 0.5,
  },
  cancelAppealText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  appealModeBannerDesc: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 19,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  appealModeBannerHint: {
    fontSize: 11,
    color: '#b45309',
    fontStyle: 'italic',
  },
  secondaryBtnText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
  },

  // AI Verification Styles
  autoFillCard: {
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  autoFillTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
  },
  autoFillSubtitle: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    fontWeight: '500',
  },
  autoFillBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  autoFillBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  aiBadgeLoading: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiBadgeTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    maxWidth: '92%',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  aiTagSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  aiTagWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  aiTagDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  aiTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1e293b',
  },
  resetHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  resetHeaderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
});