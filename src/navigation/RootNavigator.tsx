import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { useNotifications } from '../hooks/useNotifications';
import { QuickCallLogModal } from '../components/modals/QuickCallLogModal';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { TelecallerHomeScreen } from '../screens/telecaller/TelecallerHomeScreen';
import { TelecallerCallingScreen } from '../screens/telecaller/TelecallerCallingScreen';
import { TelecallerAttendanceScreen } from '../screens/telecaller/TelecallerAttendanceScreen';
import { TeamLeaderHomeScreen } from '../screens/teamLeader/TeamLeaderHomeScreen';
import { TeamLeaderCallingScreen } from '../screens/teamLeader/TeamLeaderCallingScreen';
import { AdminHomeScreen } from '../screens/admin/AdminHomeScreen';
import { AdminEmployeesScreen } from '../screens/admin/AdminEmployeesScreen';
import { AdminLedgerScreen } from '../screens/admin/AdminLedgerScreen';
import { HrHomeScreen } from '../screens/hr/HrHomeScreen';

// Icons
import {
  Home,
  PhoneCall,
  Clock,
  Award,
  Users,
  Shield,
} from 'lucide-react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export const RootNavigator: React.FC = () => {
  const { currentUser, authLoading, toastMessage } = useApp();
  const navigationRef = React.useRef<any>(null);

  // Hook for deep linking & external push notification routing
  useNotifications({
    currentUser,
    onNavigateToScreen: (screenName) => {
      if (navigationRef.current?.isReady()) {
        navigationRef.current?.navigate(screenName);
      }
    },
  });

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('../../assets/logo-icon.png')}
          style={{ width: 72, height: 72, resizeMode: 'contain', marginBottom: 16 }}
        />
        <Text style={styles.loadingTitle}>TRADE NEXUS</Text>
        <Text style={styles.loadingSubtitle}>INITIALIZING MOBILE OPERATING SYSTEM</Text>
        <ActivityIndicator size="small" color={Colors.secondary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        {!currentUser ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
          </Stack.Navigator>
        ) : currentUser.role === 'admin' ? (
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: Colors.secondary,
              tabBarInactiveTintColor: Colors.textSecondary,
              tabBarStyle: styles.tabBar,
              tabBarLabelStyle: styles.tabLabel,
            }}
          >
            <Tab.Screen
              name="Overview"
              component={AdminHomeScreen}
              options={{
                tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
              }}
            />
            <Tab.Screen
              name="Employees"
              component={AdminEmployeesScreen}
              options={{
                tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
              }}
            />
            <Tab.Screen
              name="Ledger"
              component={AdminLedgerScreen}
              options={{
                tabBarIcon: ({ color, size }) => <Award size={size} color={color} />,
              }}
            />
          </Tab.Navigator>
        ) : currentUser.role === 'team_leader' ? (
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: Colors.secondary,
              tabBarInactiveTintColor: Colors.textSecondary,
              tabBarStyle: styles.tabBar,
              tabBarLabelStyle: styles.tabLabel,
            }}
          >
            <Tab.Screen
              name="Home"
              component={TeamLeaderHomeScreen}
              options={{
                tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
              }}
            />
            <Tab.Screen
              name="Calling"
              component={TeamLeaderCallingScreen}
              options={{
                tabBarLabel: 'Closer Desk',
                tabBarIcon: ({ color, size }) => <PhoneCall size={size} color={color} />,
              }}
            />
          </Tab.Navigator>
        ) : currentUser.role === 'hr' ? (
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: Colors.secondary,
              tabBarInactiveTintColor: Colors.textSecondary,
              tabBarStyle: styles.tabBar,
              tabBarLabelStyle: styles.tabLabel,
            }}
          >
            <Tab.Screen
              name="People"
              component={HrHomeScreen}
              options={{
                tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
              }}
            />
            <Tab.Screen
              name="Audits"
              component={AdminLedgerScreen}
              options={{
                tabBarIcon: ({ color, size }) => <Award size={size} color={color} />,
              }}
            />
          </Tab.Navigator>
        ) : (
          // Telecaller & Calling Employees
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: Colors.secondary,
              tabBarInactiveTintColor: Colors.textSecondary,
              tabBarStyle: styles.tabBar,
              tabBarLabelStyle: styles.tabLabel,
            }}
          >
            <Tab.Screen
              name="Home"
              component={TelecallerHomeScreen}
              options={{
                tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
              }}
            />
            <Tab.Screen
              name="Calling"
              component={TelecallerCallingScreen}
              options={{
                tabBarLabel: 'Calling Desk',
                tabBarIcon: ({ color, size }) => <PhoneCall size={size} color={color} />,
              }}
            />
            <Tab.Screen
              name="Attendance"
              component={TelecallerAttendanceScreen}
              options={{
                tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
              }}
            />
          </Tab.Navigator>
        )}

        {/* Global Quick Call Log Modal */}
        <QuickCallLogModal />

        {/* Floating Notification Toast */}
        {toastMessage && (
          <View style={styles.floatingToast}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brandBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 201, 167, 0.15)',
    borderWidth: 2,
    borderColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  loadingSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  tabBar: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  floatingToast: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
  },
  toastText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

