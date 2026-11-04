import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, CreditCard, Activity, MessageCircle, User } from 'lucide-react-native';
import axiosClient from '../../api/axiosClient';
import { chatSocket } from '../../realtime/chatSocket';

type TabConf = {
  label: string;
  icon: (props: { color: string; size: number }) => React.ReactNode;
  badge?: number;
};

// Custom Tab Bar
function CustomTabBar({ state, descriptors, navigation, emitter, navigateToTab }: any) {
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

  const tabConfig: Record<string, TabConf> = {
    index: {
      label: 'Trang chủ',
      icon: ({ color, size }) => <Home size={size} color={color} strokeWidth={2.3} />,
    },
    payment: {
      label: 'Thanh toán',
      icon: ({ color, size }) => <CreditCard size={size} color={color} strokeWidth={2.2} />,
    },
    activity: {
      label: 'Hoạt động',
      icon: ({ color, size }) => <Activity size={size} color={color} strokeWidth={2.3} />,
    },
    messages: {
      label: 'Tin nhắn',
      icon: ({ color, size }) => <MessageCircle size={size} color={color} strokeWidth={2.2} />,
      badge: convoCount > 0 ? convoCount : undefined,
    },
    profile: {
      label: 'Tài khoản',
      icon: ({ color, size }) => <User size={size} color={color} strokeWidth={2.3} />,
    },
  };

  // Render 5 tab chính trong thanh dưới
  const mainTabNames = ['index', 'payment', 'activity', 'messages', 'profile'];
  const currentRoute = state.routes[state.index];
  const currentOptions = descriptors[currentRoute?.key]?.options;
  if ((currentOptions?.tabBarStyle as any)?.display === 'none') {
    return null;
  }

  const visibleRoutes = state.routes.filter((r: any) => mainTabNames.includes(r.name));

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBarContainer}>
        {visibleRoutes.map((route: any) => {
          const routeIndex = state.routes.findIndex((r: any) => r.key === route.key);
          const { options } = descriptors[route.key];
          const isFocused = state.index === routeIndex;
          const config = tabConfig[route.name];
          if (!config) return null;

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

          const iconColor = isFocused ? '#ffffff' : '#334155';
          const iconSize = 20;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.85}
              style={styles.tabItemWrapper}
            >
              {isFocused ? (
                <View style={styles.activePill}>
                  <View style={styles.iconWrap}>
                    {config.icon({ color: iconColor, size: iconSize })}
                    {config.badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{config.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.activeLabel}>{config.label}</Text>
                </View>
              ) : (
                <View style={styles.inactiveTab}>
                  <View style={styles.iconWrap}>
                    {config.icon({ color: iconColor, size: iconSize })}
                    {config.badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{config.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.inactiveLabel}>{config.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function CustomerTabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* 5 Tab chính */}
      <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="payment" options={{ title: 'Thanh toán' }} />
      <Tabs.Screen name="activity" options={{ title: 'Hoạt động' }} />
      <Tabs.Screen name="messages" options={{ title: 'Tin nhắn' }} />
      <Tabs.Screen name="profile" options={{ title: 'Tài khoản' }} />

      {/* Route ẩn (không hiện trên thanh tab nhưng vẫn điều hướng được) */}
      <Tabs.Screen name="requests" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="map" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="rescue-options" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="rescue-emergency" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="rescue-describe" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="rescue-tracking" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="edit-profile" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="change-password" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="wallet" options={{ title: 'Ví SRAS Pay', tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="ai-chat" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="rescue-garage-select" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="garage-detail" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="rescue-quote" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="register-partner" options={{ tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  tabBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 8,
  },
  tabItemWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
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
  activePill: {
    backgroundColor: '#ea580c',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 62,
    minHeight: 46,
    ...Platform.select({
      ios: {
        shadowColor: '#ea580c',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  activeLabel: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2,
  },
  inactiveTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  inactiveLabel: {
    color: '#334155',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
  },
});
