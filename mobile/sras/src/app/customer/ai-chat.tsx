import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Send,
  Mic,
  Sparkles,
  Bot,
  PhoneCall,
  RotateCcw,
  MapPin,
  Car,
  Bike,
  ArrowRight,
  Camera,
  Trash2,
  X,
  Volume2,
} from 'lucide-react-native';
import { aiApi, ChatMessage, ProposedRescueOrder } from '../../api/aiApi';
import { rescueApi } from '../../api/rescueApi';
import { resolveFileUrl } from '../../api/axiosClient';

const BRAND = '#ea580c';
const INK = '#1c1917';
const SUB = '#78716c';
const LINE = '#e7e5e4';
const BG = '#f8fafc';
const CARD = '#ffffff';
const MASCOT_IMG = require('../../../assets/images/ai-rescue-bot-bubble.png');

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  imageUrl?: string;
  isVoice?: boolean;
  isRescueProposal?: boolean;
  proposedOrder?: ProposedRescueOrder;
}

const INITIAL_SUGGESTIONS = [
  '⭐ Gara nào đánh giá cao nhất?',
  '⚡ Gara nào đang rảnh / đến nhanh nhất?',
  '🟢 Gara nào đang online?',
  '📍 Gara nào gần tôi nhất?',
  '🚗 Phí di chuyển đến chỗ tôi là bao nhiêu?',
  '🛠️ Bảng giá dịch vụ của gara',
  '🛵 Xe máy không đề được',
  '🔧 Xe bị thủng lốp cần vá',
];

export default function AiChatScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Xin chào! Tôi là Trợ lý Cứu hộ Giao thông SRAS 24/7.\n\nTôi được kết nối trực tiếp với cơ sở dữ liệu hệ thống SRAS để hỗ trợ bạn:\n• Tra cứu các gara nào đang trực Online sẵn sàng nhận đơn.\n• Tìm gara gần vị trí bạn nhất & tính phí di chuyển theo km.\n• Tra cứu bảng giá chi tiết từng dịch vụ (vá lốp, kích bình, kéo xe, tiếp xăng).\n• Hướng dẫn an toàn & tạo đơn cứu hộ 1 chạm.\n\nBạn có thể gửi hình ảnh sự cố hoặc bấm nút Voice để nói ngay nhé!',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat?: number; lng?: number; address?: string }>({});

  const recorderRef = useRef<any>(null);
  const recordingTimerRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // Dọn dẹp timer khi component unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // Lấy vị trí GPS hiện tại của khách hàng trong nền để hỗ trợ báo giá và điều xe
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc?.coords) {
            setUserLocation({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              address: 'Vị trí GPS hiện tại',
            });
            // Reverse geocode nếu có thể
            try {
              const [rev] = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              });
              if (rev) {
                const parts = [rev.streetNumber, rev.street, rev.subregion, rev.region].filter(Boolean);
                if (parts.length > 0) {
                  setUserLocation((prev) => ({ ...prev, address: parts.join(', ') }));
                }
              }
            } catch (err) {}
          }
        }
      } catch (err) {
        console.log('[AiChat] Location fetch error:', err);
      }
    })();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const renderFormattedText = (content: string, isUser: boolean) => {
    if (!content) return null;

    // Tách các đoạn in đậm **...** hoặc __...__ hoặc ***...***
    const regex = /(\*{3}[^*]+\*{3}|\*{2}[^*]+\*{2}|__[^_]+__)/g;
    const parts = content.split(regex);

    return (
      <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.botMessageText]}>
        {parts.map((part, index) => {
          if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
            return (
              <Text
                key={index}
                style={[
                  styles.boldText,
                  styles.italicText,
                  isUser ? styles.userBoldText : styles.botBoldText,
                ]}
              >
                {part.slice(3, -3)}
              </Text>
            );
          }
          if (
            (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
            (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
          ) {
            return (
              <Text
                key={index}
                style={[
                  styles.boldText,
                  isUser ? styles.userBoldText : styles.botBoldText,
                ]}
              >
                {part.slice(2, -2)}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  const handleSend = async (customText?: string, customImageUri?: string, isVoiceMsg?: boolean) => {
    const textToSend = (customText !== undefined ? customText : inputText).trim();
    const imageUriToSend = customImageUri !== undefined ? customImageUri : selectedImage;

    if ((!textToSend && !imageUriToSend) || loading || uploadingImage) return;

    let serverPhotoUrl: string | undefined = undefined;

    // Tải ảnh lên server trước nếu có ảnh đính kèm
    if (imageUriToSend) {
      try {
        setUploadingImage(true);
        serverPhotoUrl = await rescueApi.uploadPhoto(imageUriToSend);
      } catch (err) {
        console.warn('[AiChat] Upload image failed:', err);
        Alert.alert('Lỗi tải ảnh', 'Không thể tải ảnh lên máy chủ. Bạn có thể gửi câu hỏi dạng văn bản.');
        setUploadingImage(false);
        return;
      } finally {
        setUploadingImage(false);
      }
    }

    const displayContent = textToSend || (imageUriToSend ? 'Kiểm tra và chuẩn đoán sự cố từ hình ảnh này giúp tôi.' : '');

    const userMsg: MessageItem = {
      id: String(Date.now()),
      role: 'user',
      content: displayContent,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      imageUrl: serverPhotoUrl || imageUriToSend || undefined,
      isVoice: isVoiceMsg,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputText('');
    setSelectedImage(null);
    setLoading(true);
    scrollToBottom();

    try {
      const historyPayload: ChatMessage[] = nextMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role,
          content: m.content,
          imageUrl: m.imageUrl,
          isVoice: m.isVoice,
        }));

      if (historyPayload.length === 0) {
        historyPayload.push({
          role: 'user',
          content: displayContent,
          imageUrl: serverPhotoUrl,
          isVoice: isVoiceMsg,
        });
      }

      const res = await aiApi.chat({
        messages: historyPayload,
        userLocation: userLocation.address,
        lat: userLocation.lat,
        lng: userLocation.lng,
        photoUrls: serverPhotoUrl ? [serverPhotoUrl] : undefined,
      });

      const botMsg: MessageItem = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: res.reply || 'Tôi đã tiếp nhận thông tin của bạn.',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRescueProposal: res.isRescueProposal,
        proposedOrder: res.proposedOrder,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      console.error('[AiChat] send error:', e);
      const errMsg: MessageItem = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: 'Hệ thống đang bận hoặc gián đoạn kết nối. Bạn có thể gọi trực tiếp Tổng đài 1900 6868 để được điều phối cứu hộ ngay lập tức.',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  // Khởi động thu âm giọng nói
  const startRecording = async () => {
    if (isTranscribing || isRecording) return;

    try {
      let expoAudio: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        expoAudio = require('expo-audio');
      } catch (loadErr) {}

      const requestPermFn =
        expoAudio?.requestRecordingPermissionsAsync ||
        expoAudio?.AudioModule?.requestRecordingPermissionsAsync;

      if (requestPermFn) {
        const perm = await requestPermFn();
        if (perm && !perm.granted) {
          Alert.alert('Cần quyền Micro', 'Vui lòng cấp quyền Micro trong Cài đặt thiết bị để nói chuyện cùng AI.');
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
        Alert.alert('Chức năng Voice', 'Mô-đun thu âm chưa khả dụng trên thiết bị này. Bạn có thể gõ văn bản nhé.');
        return;
      }

      const rec = new AudioRecorderCls(preset);
      if (rec.prepareToRecordAsync) {
        await rec.prepareToRecordAsync();
      }
      rec.record();
      recorderRef.current = rec;
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      setRecordingSeconds(0);

      // Bộ đếm thời gian ghi âm
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('[AiChat] Start record error:', err);
      Alert.alert('Lỗi ghi âm', 'Không thể bắt đầu ghi âm giọng nói.');
    }
  };

  // Huỷ bỏ ghi âm (không gửi, không transcribe để tránh text rác khi bấm nhầm)
  const cancelRecording = async () => {
    if (!isRecording) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    try {
      const rec = recorderRef.current;
      if (rec) {
        await rec.stop();
        recorderRef.current = null;
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const expoAudio = require('expo-audio');
      const setAudioModeFn = expoAudio?.setAudioModeAsync || expoAudio?.AudioModule?.setAudioModeAsync;
      if (setAudioModeFn) {
        await setAudioModeFn({ allowsRecording: false });
      }
    } catch (err) {}

    setIsRecording(false);
    setRecordingSeconds(0);
  };

  // Kết thúc ghi âm và TỰ ĐỘNG GỬI TIN NHẮN THOẠI LUÔN
  const stopAndSendRecording = async () => {
    if (!isRecording) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const duration = Date.now() - recordingStartTimeRef.current;
    setIsRecording(false);

    try {
      const rec = recorderRef.current;
      if (!rec) return;

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

      // Nếu bấm quá nhanh (< 1 giây), không gửi để tránh Whisper tạo text rác
      if (duration < 1000) {
        Alert.alert('Giọng nói quá ngắn', 'Vui lòng giữ mic và nói dài hơn một chút để AI nghe rõ nhé.');
        return;
      }

      if (uri) {
        setIsTranscribing(true);
        const transcribed = await aiApi.transcribeVoice(uri);
        setIsTranscribing(false);

        if (transcribed && transcribed.trim()) {
          // GỬI LUÔN tin nhắn thoại tới AI (không cần người dùng bấm send thêm lần nữa)
          handleSend(transcribed.trim(), undefined, true);
        } else {
          Alert.alert('Không nhận diện được', 'Chưa nghe rõ giọng nói. Vui lòng thử lại.');
        }
      }
    } catch (err: any) {
      console.error('[AiChat] Transcribe error:', err);
      Alert.alert('Lỗi nhận diện', 'Không thể chuyển giọng nói thành văn bản. Vui lòng thử lại.');
    } finally {
      setIsTranscribing(false);
      setRecordingSeconds(0);
    }
  };

  // Chọn ảnh từ camera hoặc thư viện
  const handlePickImage = () => {
    Alert.alert('Đính kèm ảnh sự cố', 'Chọn nguồn ảnh xe để AI chẩn đoán chi tiết:', [
      {
        text: 'Chụp ảnh ngay',
        onPress: async () => {
          try {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Cần quyền Camera', 'Vui lòng cho phép ứng dụng truy cập camera để chụp ảnh xe.');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.7,
            });
            if (!res.canceled && res.assets?.[0]?.uri) {
              setSelectedImage(res.assets[0].uri);
            }
          } catch (e) {
            console.warn('[AiChat] Camera error:', e);
          }
        },
      },
      {
        text: 'Chọn từ Thư viện',
        onPress: async () => {
          try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Cần quyền Thư viện', 'Vui lòng cho phép truy cập thư viện ảnh.');
              return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.7,
              allowsMultipleSelection: false,
            });
            if (!res.canceled && res.assets?.[0]?.uri) {
              setSelectedImage(res.assets[0].uri);
            }
          } catch (e) {
            console.warn('[AiChat] Library picker error:', e);
          }
        },
      },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  };

  const handleClearHistory = () => {
    Alert.alert('Làm mới hội thoại', 'Bạn có muốn xoá lịch sử trò chuyện hiện tại để bắt đầu cuộc trò chuyện mới?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Làm mới',
        style: 'destructive',
        onPress: () => {
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content:
                'Xin chào! Tôi là Trợ lý Cứu hộ Giao thông SRAS 24/7.\n\nXe của bạn đang gặp vấn đề gì? Hãy mô tả hiện tượng, gửi ảnh sự cố hoặc địa chỉ để tôi hỗ trợ bạn ngay nhé!',
              createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        },
      },
    ]);
  };

  const handleConfirmRescueProposal = (order: ProposedRescueOrder) => {
    router.push({
      pathname: '/customer/rescue-emergency',
      params: {
        lat: order.lat ? String(order.lat) : userLocation.lat ? String(userLocation.lat) : undefined,
        lng: order.lng ? String(order.lng) : userLocation.lng ? String(userLocation.lng) : undefined,
        address: order.address || userLocation.address,
        prefilledVehicle: order.vehicleType,
        prefilledIssue: order.issueType,
        prefilledNote: order.description || order.title,
        garageId: order.garageId ? String(order.garageId) : undefined,
        garageName: order.garageName,
      },
    } as any);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft size={24} color={INK} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={styles.botAvatar}>
            <Image source={MASCOT_IMG} style={{ width: 34, height: 34 }} resizeMode="contain" />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>Trợ lý SRAS</Text>
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>24/7</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>Tư vấn sự cố & Đề xuất cứu hộ</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => Linking.openURL('tel:19006868').catch(() => {})}
            activeOpacity={0.7}
          >
            <PhoneCall size={18} color="#dc2626" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleClearHistory} activeOpacity={0.7}>
            <RotateCcw size={18} color={SUB} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* MESSAGES LIST */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageScroll}
          contentContainerStyle={styles.messageScrollContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        >
          {messages.map((item) => {
            const isUser = item.role === 'user';
            return (
              <View
                key={item.id}
                style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowBot]}
              >
                {!isUser && (
                  <View style={styles.botIconBubble}>
                    <Image source={MASCOT_IMG} style={{ width: 28, height: 28 }} resizeMode="contain" />
                  </View>
                )}

                <View style={{ maxWidth: '82%' }}>
                  <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
                    {/* HUY HIỆU TIN NHẮN THOẠI NẾU LÀ VOICE */}
                    {item.isVoice && (
                      <View style={[styles.voiceTag, isUser ? styles.voiceTagUser : styles.voiceTagBot]}>
                        <Volume2 size={13} color={isUser ? '#ffffff' : BRAND} strokeWidth={2.4} />
                        <Text style={[styles.voiceTagText, isUser ? styles.voiceTagTextUser : styles.voiceTagTextBot]}>
                          Tin nhắn thoại
                        </Text>
                      </View>
                    )}

                    {/* HÌNH ẢNH ĐÍNH KÈM NẾU CÓ */}
                    {item.imageUrl && (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setPreviewModalImage(resolveFileUrl(item.imageUrl!) || null)}
                        style={styles.attachedImageContainer}
                      >
                        <Image
                          source={{ uri: resolveFileUrl(item.imageUrl) }}
                          style={styles.attachedImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    )}

                    {/* VĂN BẢN TIN NHẮN */}
                    {item.content ? renderFormattedText(item.content, isUser) : null}
                  </View>

                  {/* THẺ ĐỀ XUẤT CỨU HỘ 1 CHẠM NẾU AI NHẬN DIỆN SỰ CỐ */}
                  {item.isRescueProposal && item.proposedOrder && (
                    <View style={styles.proposalCard}>
                      <View style={styles.proposalCardHeader}>
                        <View style={styles.proposalBadge}>
                          {item.proposedOrder.vehicleType === 'CAR' ? (
                            <Car size={13} color="#ea580c" strokeWidth={2.4} />
                          ) : (
                            <Bike size={13} color="#ea580c" strokeWidth={2.4} />
                          )}
                          <Text style={styles.proposalBadgeText}>
                            {item.proposedOrder.vehicleType === 'CAR' ? 'Cứu hộ Ô tô' : 'Cứu hộ Xe máy'}
                          </Text>
                        </View>
                        {item.proposedOrder.estimatedPrice ? (
                          <View style={styles.priceTag}>
                            <Text style={styles.priceTagText}>{item.proposedOrder.estimatedPrice}</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.proposalTitle}>
                        {item.proposedOrder.title || 'Đề xuất yêu cầu cứu hộ'}
                      </Text>

                      {/* GARA TIẾP NHẬN & PHÍ DI CHUYỂN NẾU CÓ */}
                      {item.proposedOrder.garageName ? (
                        <View style={styles.proposalGarageRow}>
                          <Text style={styles.proposalGarageLabel}>Gara đề xuất:</Text>
                          <Text style={styles.proposalGarageName}>{item.proposedOrder.garageName}</Text>
                        </View>
                      ) : null}

                      {item.proposedOrder.estimatedTravelFee ? (
                        <View style={styles.proposalFeeRow}>
                          <Text style={styles.proposalFeeLabel}>Phí di chuyển:</Text>
                          <Text style={styles.proposalFeeVal}>{item.proposedOrder.estimatedTravelFee}</Text>
                          {item.proposedOrder.distanceKm ? (
                            <Text style={styles.proposalDistText}>({item.proposedOrder.distanceKm} km)</Text>
                          ) : null}
                        </View>
                      ) : null}

                      {item.proposedOrder.description ? (
                        <Text style={styles.proposalDesc}>{item.proposedOrder.description}</Text>
                      ) : null}

                      {item.proposedOrder.address ? (
                        <View style={styles.proposalAddressRow}>
                          <MapPin size={13} color="#64748b" />
                          <Text style={styles.proposalAddressText} numberOfLines={1}>
                            {item.proposedOrder.address}
                          </Text>
                        </View>
                      ) : null}

                      <TouchableOpacity
                        style={styles.confirmProposalBtn}
                        onPress={() => handleConfirmRescueProposal(item.proposedOrder!)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.confirmProposalText}>Gửi yêu cầu cứu hộ ngay</Text>
                        <ArrowRight size={16} color="#ffffff" strokeWidth={2.4} />
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={[styles.timeText, isUser ? styles.timeUser : styles.timeBot]}>
                    {item.createdAt}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* LOADING HOẶC ĐANG TRANSCRIBE / TẢI ẢNH */}
          {(loading || uploadingImage || isTranscribing) && (
            <View style={[styles.messageRow, styles.messageRowBot]}>
              <View style={styles.botIconBubble}>
                <Bot size={16} color={BRAND} strokeWidth={2.2} />
              </View>
              <View style={[styles.bubble, styles.botBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color={BRAND} />
                <Text style={styles.loadingText}>
                  {uploadingImage
                    ? 'Đang tải ảnh lên hệ thống...'
                    : isTranscribing
                    ? 'Đang nhận diện giọng nói & gửi...'
                    : 'Trợ lý SRAS đang suy nghĩ...'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* GỢI Ý NHANH (SUGGESTION CHIPS) */}
        {!isRecording && (
          <View style={styles.suggestionContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionScroll}>
              {INITIAL_SUGGESTIONS.map((sug, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.suggestionChip}
                  onPress={() => handleSend(sug)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionChipText}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* PREVIEW ẢNH ĐƯỢC CHỌN (NẾU CÓ) */}
        {selectedImage && !isRecording && (
          <View style={styles.imagePreviewBar}>
            <View style={styles.imagePreviewWrapper}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreviewThumb} />
              <TouchableOpacity
                style={styles.imagePreviewRemoveBtn}
                onPress={() => setSelectedImage(null)}
                activeOpacity={0.8}
              >
                <X size={14} color="#ffffff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <View style={styles.imagePreviewInfo}>
              <Text style={styles.imagePreviewTitle}>Đã đính kèm ảnh xe</Text>
              <Text style={styles.imagePreviewSubtitle}>Bấm Gửi để AI phân tích hoặc nhập thêm ghi chú</Text>
            </View>
          </View>
        )}

        {/* INPUT TOOLBAR */}
        <View style={styles.inputBar}>
          {isRecording ? (
            /* THANH GHI ÂM CHUYÊN NGHIỆP: CÓ ĐẾM GIÂY, NÚT HUỶ VÀ NÚT GỬI LUÔN */
            <View style={styles.recordingContainer}>
              <TouchableOpacity
                style={styles.recordingCancelBtn}
                onPress={cancelRecording}
                activeOpacity={0.8}
              >
                <Trash2 size={20} color="#dc2626" strokeWidth={2.2} />
              </TouchableOpacity>

              <View style={styles.recordingStatusBox}>
                <View style={styles.recordingPulseDot} />
                <Text style={styles.recordingTimerText}>{formatTimer(recordingSeconds)}</Text>
                <Text style={styles.recordingPromptText}>Đang nghe... bấm gửi khi xong</Text>
              </View>

              <TouchableOpacity
                style={styles.recordingSendBtn}
                onPress={stopAndSendRecording}
                activeOpacity={0.8}
              >
                <Send size={18} color="#ffffff" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          ) : (
            /* GIAO DIỆN NHẬP BÌNH THƯỜNG */
            <>
              {/* NÚT CHỌN ẢNH SỰ CỐ */}
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={handlePickImage}
                activeOpacity={0.8}
                disabled={loading || uploadingImage}
              >
                <Camera size={20} color={selectedImage ? BRAND : '#64748b'} strokeWidth={2.2} />
              </TouchableOpacity>

              {/* NÚT BẬT MIC NÓI VOICE */}
              <TouchableOpacity
                style={styles.micBtn}
                onPress={startRecording}
                activeOpacity={0.8}
                disabled={isTranscribing || loading}
              >
                {isTranscribing ? (
                  <ActivityIndicator size="small" color={BRAND} />
                ) : (
                  <Mic size={20} color="#64748b" strokeWidth={2.2} />
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.textInput}
                placeholder={selectedImage ? 'Nhập thêm câu hỏi hoặc bấm Gửi...' : 'Mô tả sự cố hoặc hỏi gara gần bạn...'}
                placeholderTextColor="#9ca3af"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />

              {/* NÚT GỬI */}
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!inputText.trim() && !selectedImage) || loading || uploadingImage ? styles.sendBtnDisabled : null,
                ]}
                onPress={() => handleSend()}
                disabled={(!inputText.trim() && !selectedImage) || loading || uploadingImage}
                activeOpacity={0.8}
              >
                {loading || uploadingImage ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Send size={18} color="#ffffff" strokeWidth={2.4} />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* MODAL XEM ẢNH FULLSCREEN */}
      {previewModalImage && (
        <Modal
          visible={!!previewModalImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPreviewModalImage(null)}
        >
          <View style={styles.modalBg}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setPreviewModalImage(null)}
              activeOpacity={0.8}
            >
              <X size={26} color="#ffffff" />
            </TouchableOpacity>
            <Image
              source={{ uri: previewModalImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  botAvatar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: INK,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: SUB,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chatArea: {
    flex: 1,
    backgroundColor: BG,
  },
  messageScroll: {
    flex: 1,
  },
  messageScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowBot: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  botIconBubble: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubble: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: BRAND,
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 3,
  },
  botBubble: {
    backgroundColor: CARD,
    borderBottomLeftRadius: 4,
    borderWidth: 1.2,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  voiceTagUser: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  voiceTagBot: {
    backgroundColor: '#ffedd5',
  },
  voiceTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  voiceTagTextUser: {
    color: '#ffffff',
  },
  voiceTagTextBot: {
    color: BRAND,
  },
  attachedImageContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachedImage: {
    width: 200,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
  },
  italicText: {
    fontStyle: 'italic',
  },
  userBoldText: {
    fontWeight: '700',
    color: '#ffffff',
  },
  botBoldText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  userMessageText: {
    color: '#ffffff',
  },
  botMessageText: {
    color: INK,
  },
  timeText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
  },
  timeUser: {
    textAlign: 'right',
    marginRight: 4,
  },
  timeBot: {
    textAlign: 'left',
    marginLeft: 4,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: SUB,
    fontStyle: 'italic',
  },
  proposalCard: {
    backgroundColor: '#fffaf5',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  proposalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proposalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  proposalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c2410c',
  },
  priceTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priceTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  proposalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: INK,
  },
  proposalGarageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  proposalGarageLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  proposalGarageName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1d4ed8',
    flex: 1,
  },
  proposalFeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  proposalFeeLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  proposalFeeVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#15803d',
  },
  proposalDistText: {
    fontSize: 11,
    color: '#64748b',
  },
  proposalDesc: {
    fontSize: 12,
    color: SUB,
    lineHeight: 17,
  },
  proposalAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  proposalAddressText: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  },
  confirmProposalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmProposalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  suggestionContainer: {
    backgroundColor: BG,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  suggestionScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionChipText: {
    fontSize: 12,
    color: INK,
    fontWeight: '500',
  },
  imagePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  imagePreviewWrapper: {
    position: 'relative',
  },
  imagePreviewThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: BRAND,
  },
  imagePreviewRemoveBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#dc2626',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  imagePreviewInfo: {
    flex: 1,
  },
  imagePreviewTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: INK,
  },
  imagePreviewSubtitle: {
    fontSize: 11,
    color: SUB,
    marginTop: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: LINE,
    gap: 8,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: INK,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  /* THANH GHI ÂM (RECORDING MODE) */
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  recordingCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingStatusBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  recordingPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc2626',
  },
  recordingTimerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
    fontVariant: ['tabular-nums'],
  },
  recordingPromptText: {
    fontSize: 11,
    color: '#991b1b',
  },
  recordingSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  /* MODAL */
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  modalImage: {
    width: '94%',
    height: '80%',
  },
});
