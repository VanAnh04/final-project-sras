import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme, LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { AuthProvider } from '../contexts/AuthContext';
import PushNotificationManager from '../components/PushNotificationManager';
import CallOverlay from '../components/call/CallOverlay';

// Ẩn bảng console / LogBox popup trên màn hình điện thoại
LogBox.ignoreAllLogs(true);

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout() {
  const colorScheme = useColorScheme();

  if (!clerkPublishableKey) {
    throw new Error(
      'Thiếu EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY trong .env — cần cho login Google (Clerk).',
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <PushNotificationManager />
          <Stack
            screenOptions={{
              headerShown: false,
              gestureEnabled: false,
              animation: 'none',
            }}
          >
            <Stack.Screen name="index" options={{ gestureEnabled: false }} />
            <Stack.Screen name="auth" options={{ gestureEnabled: false }} />
            <Stack.Screen name="customer" options={{ gestureEnabled: false }} />
            <Stack.Screen name="garage-owner" options={{ gestureEnabled: false }} />
            <Stack.Screen name="garage-staff" options={{ gestureEnabled: false }} />
            {/* Màn chat dùng chung cho mọi role — ngoài nhóm tab để không kéo theo giao diện của khách. */}
            <Stack.Screen name="chat" options={{ gestureEnabled: true, animation: 'default' }} />
          </Stack>
          {/* Giao diện gọi thoại nổi trên mọi màn (đổ chuông, đang gọi, thanh thu nhỏ, engine WebRTC ẩn). */}
          <CallOverlay />
        </AuthProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
