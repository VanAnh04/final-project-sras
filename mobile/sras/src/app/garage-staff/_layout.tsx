import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, User, MessageSquare } from 'lucide-react-native';
import axiosClient from '../../api/axiosClient';
import { chatSocket } from '../../realtime/chatSocket';

// Custom Checklist/Tasks icon matching the user image design
function TasksTabIcon({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.82,
          height: size,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 2,
        }}
      >
        {/* Top fold line */}
        <View style={{ width: '50%', height: 2, backgroundColor: color, position: 'absolute', top: 1, borderRadius: 1 }} />
        {/* Checkmark inside */}
        <Text style={{ color, fontSize: 13, fontWeight: '900', lineHeight: 14 }}>✓</Text>
      </View>
    </View>
  );
}

function CustomStaffTabBar({ state, descriptors, navigation, emitter, navigateToTab }: any) {
  const insets = useSafeAreaInsets();
  const [convoCount, setConvoCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const fetchCount = async () => {
      try {
        const res: any = await axiosClient.get('/rescue-requests/conversations');
        const list = res?.data || res || [];
        if (isMounted && Array.isArray(list)) {
          const totalUnreadMessages = list.reduce((sum: number, c: any) => sum + (c.unreadCount || (c.isUnread ? 1 : 0)), 0);
          setConvoCount(totalUnreadMessages);
        }
      } catch (e) {
        // silent fail
      }
    };

    fetchCount();
    const unsub = chatSocket.onAnyMessage(() => {
      fetchCount();
    });
    const interval = setInterval(fetchCount, 15000);

    return () => {
      isMounted = false;
      unsub();
      clearInterval(interval);
    };
  }, []);

  const tabConfig: Record<string, { label: string; icon: (props: { color: string; size: number }) => React.ReactNode; badge?: number }> = {
    home: {
      label: 'Home',
      icon: ({ color, size }) => <Home size={size} color={color} strokeWidth={2.4} />,
    },
    tasks: {
      label: 'Tasks',
      icon: ({ color, size }) => <TasksTabIcon color={color} size={size} />,
    },
    messages: {
      label: 'Tin nhắn',
      icon: ({ color, size }) => <MessageSquare size={size} color={color} strokeWidth={2.4} />,
      badge: convoCount > 0 ? convoCount : undefined,
    },
    profile: {
      label: 'Profile',
      icon: ({ color, size }) => <User size={size} color={color} strokeWidth={2.4} />,
    },
  };

  // Render main 4 tabs in bottom bar
  const mainTabNames = ['home', 'tasks', 'messages', 'profile'];
  const currentRouteName = state.routes[state.index]?.name;
  const currentOptions = descriptors[state.routes[state.index]?.key]?.options;
  if ((currentOptions?.tabBarStyle as any)?.display === 'none' || !mainTabNames.includes(currentRouteName)) {
    return null; // Hide tab bar on sub screens
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
            icon: ({ color, size }: any) => <Home size={size} color={color} />,
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

          const onLongPress = () => {
            if (emitter) {
              emitter.emit({ type: 'tabLongPress', target: route.key });
            } else if (navigation?.emit) {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            }
          };

          const currentColor = isFocused ? '#ea580c' : '#94a3b8';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              <View style={styles.iconWrapper}>
                {config.icon({ color: currentColor, size: 22 })}
                {!!config.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{config.badge}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: currentColor,
                    fontWeight: isFocused ? '800' : '600',
                  },
                ]}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

import StaffLocationPusher from '../../components/StaffLocationPusher';

export default function GarageStaffLayout() {
  return (
    <>
      <StaffLocationPusher />
      <Tabs
        tabBar={(props) => <CustomStaffTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
        <Tabs.Screen name="messages" options={{ title: 'Tin nhắn' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        {/* Màn phụ: không dùng `href: null` — từ expo-router SDK 58, tab ẩn khi được mở sẽ bị replace
            về tab đầu. CustomStaffTabBar đã tự lọc theo mainTabNames. */}
        <Tabs.Screen name="index" options={{ tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen
          name="create-quote"
          options={{
            title: 'Lập báo giá',
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="repair-progress"
          options={{
            title: 'Tiến độ sửa chữa',
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="edit-profile"
          options={{
            title: 'Chỉnh sửa hồ sơ',
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="change-password"
          options={{
            title: 'Đặt lại mật khẩu',
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: 'Lịch sử cứu hộ',
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="order-detail"
          options={{
            title: 'Chi tiết đơn',
            tabBarStyle: { display: 'none' },
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarContainer: {
    flexDirection: 'row',
    height: 56,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  iconWrapper: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 1,
  },
});
