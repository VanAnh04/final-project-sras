import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
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
  );
}
