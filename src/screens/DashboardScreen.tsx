import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Bluetooth,
  BluetoothOff,
  Navigation,
  Compass,
  CheckCircle,
} from 'lucide-react-native';
import { useBle } from '../bluetooth/BleContext';
import { Colors } from '../theme/colors';
import { ScooterCard } from '../components/ScooterCard';
import { PacketLogView } from '../components/PacketLogView';
import { ManeuverIconCode } from '../protocol/types';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    connectionState,
    connectedDeviceName,
    sendNavigation,
    sendIncomingCall,
    sendSmsAlert,
    sendCallEnded,
    clearNavigation,
    logs,
  } = useBle();

  const [feedback, setFeedback] = useState<string | null>(null);
  const isConnected = connectionState === 'connected';

  const triggerFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleOpenMaps = async () => {
    // Attempt to open the Google Maps native app on iOS (comgooglemaps://)
    const googleMapsAppUrl = Platform.select({
      ios: 'comgooglemaps://',
      android: 'google.navigation:q=',
      default: 'https://www.google.com/maps',
    });

    const googleMapsWebUrl = 'https://www.google.com/maps';

    try {
      const canOpen = await Linking.canOpenURL(googleMapsAppUrl);
      if (canOpen) {
        await Linking.openURL(googleMapsAppUrl);
        return;
      }
    } catch {
      // Fall through to direct open or web URL
    }

    try {
      await Linking.openURL(googleMapsAppUrl);
    } catch {
      // If Google Maps app is not installed on iPhone, open Google Maps in web browser
      await Linking.openURL(googleMapsWebUrl);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* App Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>HeroRide</Text>
          <Text style={styles.brandSubtitle}>Hero Xoom 125 XTEC Companion</Text>
        </View>

        {/* Connection Badge */}
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isConnected ? Colors.accentGreenMuted : Colors.heroRedMuted,
              borderColor: isConnected ? Colors.accentGreen : Colors.heroRed,
            },
          ]}
        >
          {isConnected ? (
            <Bluetooth size={14} color={Colors.accentGreen} />
          ) : (
            <BluetoothOff size={14} color={Colors.heroRed} />
          )}
          <Text
            style={[
              styles.badgeText,
              { color: isConnected ? Colors.accentGreen : Colors.heroRed },
            ]}
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Main Scooter Status Card */}
      <ScooterCard
        connectedName={connectedDeviceName}
        isConnected={isConnected}
        onConnectPress={() => navigation.navigate('Bluetooth')}
      />

      {/* Quick Navigation Action Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Turn-By-Turn Navigation</Text>
        <Text style={styles.cardDesc}>
          Mirror direction arrows, countdown distance, and street names to your scooter screen in real time.
        </Text>

        <View style={styles.navButtonsRow}>
          <TouchableOpacity
            style={[styles.primaryButton, { flex: 1.2 }]}
            activeOpacity={0.8}
            onPress={handleOpenMaps}
          >
            <Navigation size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Open Maps App</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineButton, { flex: 1 }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Navigation')}
          >
            <Compass size={16} color={Colors.textPrimary} />
            <Text style={styles.outlineButtonText}>In-App View</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Test Cluster Mirroring (Verifies real transmission) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Test Cluster Mirroring</Text>
        <Text style={styles.cardDesc}>
          Send test frames to your scooter cluster to verify that LCD segments display correctly:
        </Text>

        <View style={styles.testGrid}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => {
              sendNavigation(ManeuverIconCode.TURN_RIGHT, 350, 'Main Road');
              triggerFeedback('Sent Turn Right (350m on Main Road) to cluster');
            }}
          >
            <Text style={styles.testButtonText}>Test Nav Arrow</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={() => {
              sendIncomingCall('John Doe');
              triggerFeedback("Sent Incoming Call 'John Doe' to cluster");
            }}
          >
            <Text style={styles.testButtonText}>Test Caller ID</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.testGrid}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => {
              sendSmsAlert('Mom');
              triggerFeedback("Sent SMS Alert from 'Mom' to cluster");
            }}
          >
            <Text style={styles.testButtonText}>Test SMS Alert</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.clearButton]}
            onPress={() => {
              sendCallEnded();
              clearNavigation();
              triggerFeedback('Cluster display cleared');
            }}
          >
            <Text style={[styles.testButtonText, { color: Colors.accentYellow }]}>
              Clear Cluster
            </Text>
          </TouchableOpacity>
        </View>

        {feedback && (
          <View style={styles.feedbackBanner}>
            <CheckCircle size={14} color={Colors.accentGreen} />
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>
        )}
      </View>

      {/* Live BLE Activity Log */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live BLE Packet Stream</Text>
        <PacketLogView logs={logs} maxHeight={180} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.heroRed,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  navButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: Colors.heroRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  outlineButton: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  outlineButtonText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  testGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  testButton: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    borderColor: 'rgba(255, 214, 0, 0.3)',
  },
  testButtonText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accentGreenMuted,
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  feedbackText: {
    color: Colors.accentGreen,
    fontSize: 12,
    fontWeight: '600',
  },
});
