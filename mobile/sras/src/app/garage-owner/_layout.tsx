import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass, FileText, Users, Wallet, MessageCircle } from 'lucide-react-native';
import IncomingRescueModal from '../../components/IncomingRescueModal';
import GarageLocationPusher from '../../components/GarageLocationPusher';
import { GarageSettingsProvider } from '../../contexts/GarageSettingsContext';

function CustomGarageTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  const tabConfig: Record<string, { label: string; icon: (props: { color: string; size: number }) => React.ReactNode }> = {
    index: {
      label: 'Tổng quan',
      icon: ({ color, size }) => <Compass size={size} color={color} />,
    },
    orders: {
      label: 'Đơn cứu hộ',
      icon: ({ color, size }) => <FileText size={size} color={color} />,
    },
    staff: {
      label: 'Nhân viên',
      icon: ({ color, size }) => <Users size={size} color={color} />,
    },
    wallet: {
      label: 'Ví tiền',
      icon: ({ color, size }) => <Wallet size={size} color={color} />,
    },
    messages: {
      label: 'Tin nhắn',
      icon: ({ color, size }) => <MessageCircle size={size} color={color} />,
    },
  };

  // Only render main 5 tabs in bottom bar
  const mainTabNames = ['index', 'orders', 'staff', 'wallet', 'messages'];
  const visibleRoutes = state.routes.filter((r: any) => mainTabNames.includes(r.name));

  const currentRouteName = state.routes[state.index]?.name;
  const hiddenTabBarRoutes = ['edit-profile', 'change-password', 'add-vehicle'];
  if (hiddenTabBarRoutes.includes(currentRouteName)) {
    return null; // Ẩn thanh tab ở các màn phụ (chỉnh sửa, đổi mật khẩu, thêm nhân viên/xe)
  }

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBarContainer}>
        {visibleRoutes.map((route: any) => {
          const routeIndex = state.routes.findIndex((r: any) => r.key === route.key);
          const { options } = descriptors[route.key];
          const isFocused = state.index === routeIndex;
          const config = tabConfig[route.name] || {
            label: options.title || route.name,
            icon: ({ color, size }: any) => <Compass size={size} color={color} />,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const color = isFocused ? '#ea580c' : '#94a3b8';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              {config.icon({ color, size: 20 })}
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function GarageOwnerTabsLayout() {
  return (
    <GarageSettingsProvider>
      {/* Popup "cuốc cứu hộ mới" kiểu Grab — hiện ở mọi tab của gara */}
      <IncomingRescueModal />
      {/* Đẩy vị trí xe cứu hộ chạy nền (tạm thời, chờ app nhân viên) */}
      <GarageLocationPusher />
      <Tabs
      tabBar={(props) => <CustomGarageTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tổng quan',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Đơn cứu hộ',
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: 'Nhân viên',
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Ví tiền',
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Tin nhắn',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Cài đặt',
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          title: 'Chỉnh sửa hồ sơ',
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="change-password"
        options={{
          title: 'Đặt lại mật khẩu',
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="order-detail"
        options={{
          title: 'Chi tiết cứu hộ',
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="add-vehicle"
        options={{
          title: 'Thêm xe cứu hộ',
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
    </GarageSettingsProvider>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tabBarContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabLabelActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
});