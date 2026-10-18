import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import {
  LayoutDashboard,
  Navigation,
  BluetoothSearching,
  Code,
  Settings,
} from 'lucide-react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { NavigationScreen } from '../screens/NavigationScreen';
import { BluetoothScanScreen } from '../screens/BluetoothScanScreen';
import { GattExplorerScreen } from '../screens/GattExplorerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.surfaceBorder,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor: Colors.heroRed,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <LayoutDashboard size={size || 20} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="Navigation"
          component={NavigationScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Navigation size={size || 20} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="Bluetooth"
          component={BluetoothScanScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <BluetoothSearching size={size || 20} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="GATT"
          component={GattExplorerScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Code size={size || 20} color={color} />,
          }}
        />

        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Settings size={size || 20} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
