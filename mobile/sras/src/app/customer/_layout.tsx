import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Home, 
  MapPin, 
  Compass, 
  User,
  Activity
} from 'lucide-react-native';

// Custom icon for Requests tab (Pin with signal arcs matching design)
function RequestsTabIcon({ color, size }: { color: string; size: number }) {
  return (
    <View style={styles.requestsIconContainer}>
      {/* Top signal wave */}
      <View style={styles.signalWaves}>
        <View style={[styles.signalArcOuter, { borderColor: color }]} />
        <View style={[styles.signalArcInner, { borderColor: color }]} />
      </View>
      {/* Map pin */}
      <MapPin size={size * 0.78} color={color} strokeWidth={2.2} style={{ marginTop: -2 }} />
    </View>
  );
}

// Custom Tab Bar matching the design in user image
function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  
  // Tab configurations
  const tabConfig: Record<string, { label: string; icon: (props: { color: string; size: number }) => React.ReactNode }> = {
    index: {
      label: 'Home',
      icon: ({ color, size }) => <Home size={size} color={color} strokeWidth={2.3} />
    },
    requests: {
      label: 'Requests',
      icon: ({ color, size }) => <RequestsTabIcon color={color} size={size} />
    },
    map: {
      label: 'Map',
      icon: ({ color, size }) => <Compass size={size} color={color} strokeWidth={2.2} />
    },
    profile: {
      label: 'Profile',
      icon: ({ color, size }) => <User size={size} color={color} strokeWidth={2.2} />
    }
  };

  // Only render main 4 tabs in bottom bar
  const mainTabNames = ['index', 'requests', 'map', 'profile'];
  const visibleRoutes = state.routes.filter((r: any) => mainTabNames.includes(r.name));

  // If current route is not in main tabs (e.g. edit-profile), we can hide the tab bar or keep it
  const currentRouteName = state.routes[state.index]?.name;
  if (currentRouteName === 'edit-profile') {
    return null; // Hide tab bar on edit profile screen
  }

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBarContainer}>
        {visibleRoutes.map((route: any) => {
          const routeIndex = state.routes.findIndex((r: any) => r.key === route.key);
          const { options } = descriptors[route.key];
          const isFocused = state.index === routeIndex;
          const config = tabConfig[route.name] || {
            label: options.tabBarLabel || route.name,
            icon: ({ color, size }: any) => <Activity size={size} color={color} />
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

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
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
                // Active Tab: Orange capsule pill with white icon & text
                <View style={styles.activePill}>
                  {config.icon({ color: iconColor, size: iconSize })}
                  <Text style={styles.activeLabel}>
                    {config.label}
                  </Text>
                </View>
              ) : (
                // Inactive Tab: Icon & Label in slate grey
                <View style={styles.inactiveTab}>
                  {config.icon({ color: iconColor, size: iconSize })}
                  <Text style={styles.inactiveLabel}>
                    {config.label}
                  </Text>
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
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
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
  activePill: {
    backgroundColor: '#ea580c',
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
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
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  inactiveTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  inactiveLabel: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  requestsIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
  },
  signalWaves: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -1,
  },
  signalArcOuter: {
    width: 14,
    height: 7,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    marginBottom: 1,
  },
  signalArcInner: {
    width: 8,
    height: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 1.2,
    borderBottomWidth: 0,
  }
});
