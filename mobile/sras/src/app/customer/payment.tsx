import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard } from 'lucide-react-native';

// Placeholder — màn "Thanh toán" sẽ được thiết kế sau.
export default function PaymentScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thanh toán</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <CreditCard size={30} color="#ea580c" strokeWidth={2.2} />
        </View>
        <Text style={styles.title}>Ví & Thanh toán</Text>
        <Text style={styles.subtitle}>Quản lý phương thức thanh toán, hóa đơn và lịch sử giao dịch — sẽ được thiết kế ở bước tiếp theo.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff7ed',
    borderWidth: 1, borderColor: '#ffedd5', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  title: { fontSize: 19, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13.5, color: '#64748b', textAlign: 'center', lineHeight: 20, marginTop: 8 },
});
