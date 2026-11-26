import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShieldCheck,
  Server,
  Lock,
  UserCheck,
  AlertTriangle,
  FileText,
} from 'lucide-react-native';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chính sách quyền riêng tư</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.banner}>
          <ShieldCheck size={36} color="#ea580c" strokeWidth={2.2} />
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>Bảo mật thông tin người dùng</Text>
            <Text style={styles.bannerSubtitle}>
              Cập nhật lần cuối: Tháng 11/2026 • Tuân thủ Apple App Store & Google Play Policy
            </Text>
          </View>
        </View>

        {/* Section 1 */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <UserCheck size={18} color="#ea580c" />
            <Text style={styles.sectionTitle}>1. Giới thiệu & Phạm vi áp dụng</Text>
          </View>
          <Text style={styles.paragraph}>
            Hệ thống Cứu hộ Giao thông Thông minh Việt Nam (<Text style={styles.bold}>SRAS</Text>) cam kết tôn trọng và bảo vệ tuyệt đối quyền riêng tư, thông tin cá nhân của Quý khách hàng, đối tác Gara và kỹ thuật viên cứu hộ khi sử dụng nền tảng ứng dụng di động SRAS.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <FileText size={18} color="#ea580c" />
            <Text style={styles.sectionTitle}>2. Các dữ liệu được thu thập</Text>
          </View>
          <Text style={styles.paragraph}>
            Chúng tôi chỉ thu thập các thông tin tối thiểu cần thiết nhằm mục đích kết nối cứu hộ và đảm bảo an toàn giao thông:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bold}>Thông tin tài khoản:</Text> Họ và tên, số điện thoại, địa chỉ email, ảnh đại diện.
            </Text>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bold}>Thông tin phương tiện:</Text> Biển số xe, chủng loại phương tiện (xe máy, ô tô con, xe tải), hãng sản xuất và dòng xe.
            </Text>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bold}>Dữ liệu vị trí địa lý (GPS):</Text> Tọa độ hiện tại khi gửi yêu cầu cứu hộ nhằm định vị hiện trường và dẫn đường cho đội ngũ cứu hộ gần nhất.
            </Text>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bold}>Dữ liệu sự cố xe:</Text> Mô tả bằng văn bản, hình ảnh hiện trường hỏng hóc hoặc tệp ghi âm giọng nói do người dùng cung cấp.
            </Text>
          </View>
        </View>

        {/* Section 3 - KEY: THIRD PARTY AI SHARING */}
        <View style={[styles.card, styles.highlightCard]}>
          <View style={styles.sectionHeader}>
            <Server size={18} color="#2563eb" />
            <Text style={[styles.sectionTitle, { color: '#2563eb' }]}>
              3. Xử lý & Chia sẻ dữ liệu với Bên thứ ba (AI Diagnosis)
            </Text>
          </View>
          <Text style={styles.paragraph}>
            Nhằm hỗ trợ chẩn đoán chính xác tình trạng hỏng hóc, gợi ý phương án khắc phục kịp thời và tính toán chi phí cứu hộ hợp lý, SRAS tích hợp dịch vụ Trí tuệ nhân tạo (AI) do đối tác công nghệ <Text style={styles.bold}>Google Cloud (Google Gemini API)</Text> cung cấp.
          </Text>
          <View style={styles.highlightBox}>
            <Text style={styles.highlightBoxTitle}>Cam kết bảo mật dữ liệu AI:</Text>
            <Text style={styles.highlightBoxText}>
              • <Text style={styles.bold}>Hỏi ý kiến trước khi gửi (User Consent):</Text> Hệ thống luôn hiển thị thông báo xin phép rõ ràng và chỉ gửi dữ liệu khi nhận được sự đồng thuận của người dùng.
            </Text>
            <Text style={styles.highlightBoxText}>
              • <Text style={styles.bold}>Dữ liệu gửi đến AI:</Text> Chỉ bao gồm thông tin kỹ thuật sự cố, ảnh chụp vết hỏng xe, âm thanh mô tả sự cố và thông tin dòng xe. Tuyệt đối KHÔNG chia sẻ mật khẩu, thông tin thanh toán hay danh bạ.
            </Text>
            <Text style={styles.highlightBoxText}>
              • <Text style={styles.bold}>Bảo mật truyền tải:</Text> Dữ liệu được mã hóa đầu cuối theo chuẩn HTTPS/TLS 1.3 và lưu trữ an toàn.
            </Text>
            <Text style={styles.highlightBoxText}>
              • <Text style={styles.bold}>Không dùng để quảng cáo:</Text> Dữ liệu chỉ dùng để phân tích kỹ thuật trong phiên hiện tại, không sử dụng cho mục đích quảng cáo hoặc bán cho bất kỳ bên thứ tư nào.
            </Text>
          </View>
        </View>

        {/* Section 4 */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Lock size={18} color="#ea580c" />
            <Text style={styles.sectionTitle}>4. Quyền của người dùng & Xóa tài khoản</Text>
          </View>
          <Text style={styles.paragraph}>
            Người dùng luôn nắm quyền kiểm soát dữ liệu cá nhân của mình:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bold}>Quyền từ chối AI:</Text> Bạn có thể từ chối tính năng AI bất kỳ lúc nào mà vẫn sử dụng được đầy đủ chức năng tạo yêu cầu cứu hộ thủ công.
            </Text>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bold}>Quyền xóa dữ liệu vĩnh viễn:</Text> Bạn có thể tự thực hiện xóa vĩnh viễn tài khoản và toàn bộ lịch sử dữ liệu ngay trong ứng dụng tại màn hình <Text style={styles.bold}>Hồ sơ cá nhân &gt; Xóa tài khoản</Text>.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    gap: 12,
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9a3412',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#c2410c',
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  highlightCard: {
    borderColor: '#bfdbfe',
    backgroundColor: '#ffffff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  paragraph: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 8,
  },
  bold: {
    fontWeight: '700',
    color: '#0f172a',
  },
  bulletList: {
    gap: 6,
    marginTop: 4,
  },
  bulletItem: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  highlightBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
    gap: 6,
  },
  highlightBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 2,
  },
  highlightBoxText: {
    fontSize: 12,
    color: '#1e3a8a',
    lineHeight: 17,
  },
  contactText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
    lineHeight: 22,
  },
});
