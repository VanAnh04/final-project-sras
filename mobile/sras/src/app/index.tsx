import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function RootIndex() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.text}>Đang tải SRAS...</Text>
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/auth/login" />;
  }

  const role = user.role?.toUpperCase();
  if (role === 'GARAGE_OWNER') return <Redirect href="/garage-owner" />;
  if (role === 'GARAGE_STAFF') return <Redirect href="/garage-staff/home" />;

  // Khách hàng → tab layout (có app bar)
  return <Redirect href="/customer" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  text: { marginTop: 12, color: '#6b7280', fontSize: 14, fontWeight: '500' },
});
