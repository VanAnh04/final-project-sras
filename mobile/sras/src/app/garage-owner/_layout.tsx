import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass, FileText, Wallet, MessageCircle, User } from 'lucide-react-native';
import IncomingRescueModal from '../../components/IncomingRescueModal';
import { GarageSettingsProvider } from '../../contexts/GarageSettingsContext';
import { GarageOrdersProvider } from '../../contexts/GarageOrdersContext';

function CustomGarageTabBar({ state, descriptors, navigation, emitter, navigateToTab }: any) {
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
    wallet: {
      label: 'Ví tiền',
      icon: ({ color, size }) => <Wallet size={size} color={color} />,
    },
    messages: {
      label: 'Tin nhắn',
      icon: ({ color, size }) => <MessageCircle size={size} color={color} />,
    },
    settings: {
      label: 'Tài khoản',
      icon: ({ color, size }) => <User size={size} color={color} strokeWidth={2.3} />,
    },
  };

  // Only render main 5 tabs in bottom bar
  const mainTabNames = ['index', 'orders', 'wallet', 'messages', 'settings'];
  const currentRouteName = state.routes[state.index]?.name;
  if (!mainTabNames.includes(currentRouteName)) {
    return null; // Ẩn thanh tab ở tất cả các màn phụ (chỉnh sửa, đổi mật khẩu, thêm nhân viên/xe, chi tiết hồ sơ)
  }

  const visibleRoutes = state.routes.filter((r: any) => mainTabNames.includes(r.name));

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
            const event = emitter
              ? emitter.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })
              : navigation?.emit
                ? navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                })
                : { defaultPrevented: false };

            if (!isFocused && !event?.defaultPrevented) {
              if (navigateToTab) {
                navigateToTab(route.key);
              } else if (navigation?.navigate) {
                navigation.navigate(route.name);
              }
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
      <GarageOrdersProvider>
        {/* Popup "cuốc cứu hộ mới" kiểu Grab — hiện ở mọi tab của gara */}
        <IncomingRescueModal />
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
              title: 'Tài khoản',
            }}
          />
          <Tabs.Screen
            name="staff"
            options={{
              title: 'Nhân viên',
            }}
          />
          <Tabs.Screen
            name="garage-profile"
            options={{
              title: 'Hồ sơ Gara',
            }}
          />
          <Tabs.Screen
            name="service-pricing"
            options={{
              title: 'Thiết lập bảng giá',
            }}
          />
          <Tabs.Screen
            name="edit-profile"
            options={{
              title: 'Chỉnh sửa hồ sơ',
            }}
          />
          <Tabs.Screen
            name="change-password"
            options={{
              title: 'Đặt lại mật khẩu',
            }}
          />
          <Tabs.Screen
            name="order-detail"
            options={{
              title: 'Chi tiết cứu hộ',
            }}
          />
          <Tabs.Screen
            name="add-vehicle"
            options={{
              title: 'Thêm xe cứu hộ',
            }}
          />
          <Tabs.Screen
            name="reviews"
            options={{
              title: 'Quản lý đánh giá',
            }}
          />
        </Tabs>
      </GarageOrdersProvider>
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