import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme, LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { AuthProvider } from '../contexts/AuthContext';

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
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="customer" />
            <Stack.Screen name="garage-owner" />
            <Stack.Screen name="garage-staff" />
          </Stack>
        </AuthProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
