import React, { useState, useEffect } from 'react';
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
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import axiosClient from '../../api/axiosClient';
import { rescueApi } from '../../api/rescueApi';
import LocationPickerModal, { PickedLocation } from '../../components/LocationPickerModal';
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
  RotateCcw
} from 'lucide-react-native';

export default function RegisterPartnerScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  // Form Fields
  const [garageName, setGarageName] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('');

  // Vị trí gara (lat/lng thật, chọn trên bản đồ Goong).
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Documents URIs / URLs
  const [idCardFront, setIdCardFront] = useState('');
  const [idCardBack, setIdCardBack] = useState('');
  const [businessLicense, setBusinessLicense] = useState('');
  const [facadePhoto, setFacadePhoto] = useState('');

  // Agreement
  const [agreed, setAgreed] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [fetchingExisting, setFetchingExisting] = useState(true);
  const [existingGarage, setExistingGarage] = useState<any>(null);
  const [isEditingRejected, setIsEditingRejected] = useState(false);

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

  const handlePickImage = (setter: (uri: string) => void, title = 'Ảnh tài liệu') => {
    Alert.alert(
      title,
      'Chọn phương thức chụp hoặc tải ảnh',
      [
        {
          text: 'Chụp ảnh trực tiếp',
          onPress: async () => {
            try {
              const perm = await ImagePicker.requestCameraPermissionsAsync();
              if (!perm.granted) {
                Alert.alert('Cần quyền máy ảnh', 'Vui lòng cấp quyền truy cập máy ảnh để chụp ảnh hồ sơ.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.7,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                setter(result.assets[0].uri);
              }
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể khởi động máy ảnh');
            }
          },
        },
        {
          text: 'Chọn từ thư viện ảnh',
          onPress: async () => {
            try {
              const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!perm.granted) {
                Alert.alert('Cần quyền thư viện', 'Vui lòng cấp quyền truy cập thư viện để chọn ảnh.');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.7,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                setter(result.assets[0].uri);
              }
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể chọn ảnh từ thư viện');
            }
          },
        },
        {
          text: 'Hủy',
          style: 'cancel',
        },
      ]
    );
  };

  const handleStartAppeal = () => {
    if (!existingGarage) return;
    setGarageName(existingGarage.name || "");
    setPhone(existingGarage.phone || user?.phone || "");
    setEmail(existingGarage.email || user?.email || "");
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

  const handleSubmit = async () => {
    if (!garageName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên Gara / Trung tâm cứu hộ');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại liên hệ');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ cơ sở kinh doanh');
      return;
    }
    if (!location) {
      Alert.alert('Thiếu vị trí', 'Vui lòng chọn vị trí gara trên bản đồ để hệ thống điều phối cứu hộ chính xác.');
      return;
    }
    if (!agreed) {
      Alert.alert('Chưa xác nhận', 'Vui lòng đồng ý với cam kết vận hành của đối tác');
      return;
    }

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
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        lat: location.lat,
        lng: location.lng,
        capability: 'BOTH',
        idCardFrontUrl: frontUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60',
        idCardBackUrl: backUrl || 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&auto=format&fit=crop&q=60',
        businessLicenseUrl: licenseUrl || 'https://images.unsplash.com/photo-1618042164219-62c820f10723?w=800&auto=format&fit=crop&q=60',
        facadePhotoUrl: facadeUrl || 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?w=800&auto=format&fit=crop&q=60',
      };

      const res: any = await axiosClient.post('/garages/register', payload);
      const successTitle = isEditingRejected ? 'Nộp lại thành công!' : 'Đăng ký thành công!';
      const successMsg = isEditingRejected
        ? 'Hồ sơ kháng cáo của bạn đã được gửi lại thành công! Ban quản trị sẽ tiến hành thẩm định lại.'
        : 'Hồ sơ đối tác của bạn đã được tiếp nhận và đang chờ Ban quản trị phê duyệt trong 24h.';
      Alert.alert(
        successTitle,
        successMsg,
        [
          {
            text: 'Xem trạng thái',
            onPress: () => {
              setIsEditingRejected(false);
              checkExistingGarage();
            }
          }
        ]
      );
      setIsEditingRejected(false);
      if (res?.data) {
        setExistingGarage(res.data);
      } else {
        checkExistingGarage();
      }
    } catch (error: any) {
      // Rollback: Xóa các file vừa upload nếu gửi hồ sơ thất bại để tránh ảnh mồ côi
      for (const u of newlyUploaded) {
        rescueApi.deletePhoto(u).catch(() => {});
      }
      const msg = error?.response?.data?.message || error?.message || 'Có lỗi xảy ra khi gửi hồ sơ. Vui lòng thử lại.';
      Alert.alert('Thông báo', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToAdmin = async () => {
    try {
      setLoading(true);
      // Call sync-role to upgrade token and session
      const res: any = await axiosClient.post('/auth/sync-role');
      if (res?.data?.user) {
        await updateUser(res.data.user);
      } else {
        await updateUser({ role: 'GARAGE_OWNER' });
      }
      Alert.alert('Thành công', 'Chào mừng bạn đến với bảng điều khiển Admin Gara!', [
        { text: 'Bắt đầu ngay', onPress: () => router.replace('/garage-owner') }
      ]);
    } catch (e) {
      // Direct update role fallback
      await updateUser({ role: 'GARAGE_OWNER' });
      router.replace('/garage-owner');
    } finally {
      setLoading(false);
    }
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
          >
            <RefreshCw size={18} color="#ea580c" />
            <Text style={styles.refreshBtnText}>Kiểm tra lại trạng thái duyệt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/customer/profile')}
          >
            <Text style={styles.secondaryBtnText}>Quay lại trang cá nhân</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // REJECTED state (When not in editing/appeal mode)
  if (existingGarage?.status === 'REJECTED' && !isEditingRejected) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.replace('/customer/profile')} style={styles.backBtn} activeOpacity={0.7}>
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
            <TouchableOpacity style={styles.appealPrimaryBtn} onPress={handleStartAppeal} activeOpacity={0.85}>
              <RotateCcw size={18} color="#ffffff" />
              <Text style={styles.appealPrimaryBtnText}>KHÁNG CÁO / NỘP LẠI HỒ SƠ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/customer/profile')}>
              <Text style={styles.secondaryBtnText}>Quay lại trang cá nhân</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Registration Form (Matching Image 1)
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity 
          onPress={() => router.replace('/customer/profile')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{isEditingRejected ? 'Kháng cáo / Nộp lại hồ sơ' : 'Đăng ký Đối tác Cứu hộ'}</Text>
        <View style={{ width: 40 }} />
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
            <Text style={styles.label}>Số điện thoại liên hệ (Hotline) *</Text>
            <View style={styles.inputWrap}>
              <Phone size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="VD: 0988 111 222"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email nhận thông báo hệ thống</Text>
            <View style={styles.inputWrap}>
              <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="VD: autocare.thuduc@gmail.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
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
              />
            </View>
          </View>

          {/* Chọn vị trí gara trên bản đồ (lat/lng thật để điều phối cứu hộ) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Vị trí gara trên bản đồ *</Text>
            <TouchableOpacity
              style={[styles.mapPickBtn, location && styles.mapPickBtnDone]}
              onPress={() => setShowMapPicker(true)}
              activeOpacity={0.85}
            >
              <View style={[styles.mapPickIcon, location && styles.mapPickIconDone]}>
                {location ? <CheckCircle2 size={20} color="#059669" /> : <MapPin size={20} color="#ea580c" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mapPickTitle}>
                  {location ? 'Đã ghim vị trí gara' : 'Chọn vị trí gara trên bản đồ'}
                </Text>
                <Text style={styles.mapPickSub} numberOfLines={1}>
                  {location
                    ? `Toạ độ: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                    : 'Bắt buộc — giúp hệ thống điều phối đơn cứu hộ gần bạn'}
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

          {/* CCCD 2 mặt */}
          <Text style={[styles.label, { marginTop: 8 }]}>Căn cước công dân (CCCD) chủ gara *</Text>
          <View style={styles.twoColumnGrid}>
            {/* Front */}
            <TouchableOpacity 
              style={styles.idCardBox}
              onPress={() => handlePickImage(setIdCardFront, 'Mặt trước CCCD')}
              activeOpacity={0.8}
            >
              {idCardFront ? (
                <Image source={{ uri: idCardFront }} style={styles.uploadedImg} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Camera size={26} color="#ea580c" />
                  <Text style={styles.uploadBoxLabel}>Mặt trước CCCD</Text>
                  <Text style={styles.uploadHint}>Chụp hoặc tải ảnh</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Back */}
            <TouchableOpacity 
              style={styles.idCardBox}
              onPress={() => handlePickImage(setIdCardBack, 'Mặt sau CCCD')}
              activeOpacity={0.8}
            >
              {idCardBack ? (
                <Image source={{ uri: idCardBack }} style={styles.uploadedImg} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Camera size={26} color="#ea580c" />
                  <Text style={styles.uploadBoxLabel}>Mặt sau CCCD</Text>
                  <Text style={styles.uploadHint}>Chụp hoặc tải ảnh</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Business License */}
          <Text style={[styles.label, { marginTop: 14 }]}>Giấy phép đăng ký kinh doanh *</Text>
          <TouchableOpacity 
            style={styles.largeDocBox}
            onPress={() => handlePickImage(setBusinessLicense, 'Giấy phép ĐKKD')}
            activeOpacity={0.8}
          >
            {businessLicense ? (
              <Image source={{ uri: businessLicense }} style={styles.uploadedImgLarge} />
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
        </View>

        {/* Section 3: HÌNH ẢNH MẶT TIỀN GARA */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>3. HÌNH ẢNH MẶT TIỀN GARA</Text>
          <Text style={styles.sectionDesc}>
            Hình ảnh mặt tiền rõ biển hiệu giúp kỹ thuật viên và khách hàng dễ nhận diện.
          </Text>

          <TouchableOpacity 
            style={styles.largeDocBox}
            onPress={() => handlePickImage(setFacadePhoto, 'Ảnh mặt tiền Gara')}
            activeOpacity={0.8}
          >
            {facadePhoto ? (
              <Image source={{ uri: facadePhoto }} style={styles.uploadedImgLarge} />
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
  },
  idCardBox: {
    flex: 1,
    height: 120,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 16,
    overflow: 'hidden',
  },
  largeDocBox: {
    height: 140,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 16,
    overflow: 'hidden',
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
});