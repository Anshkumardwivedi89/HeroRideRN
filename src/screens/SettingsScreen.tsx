import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Settings,
  Activity,
  Cpu,
  Info,
  Smartphone,
  ShieldCheck,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { TelemetryService } from '../telemetry/TelemetryService';
import { HeroClusterProtocol } from '../protocol/HeroClusterProtocol';

export const SettingsScreen: React.FC = () => {
  const [telemetryEnabled, setTelemetryEnabled] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [heartbeatInterval, setHeartbeatInterval] = useState(30);

  const toggleTelemetry = (val: boolean) => {
    setTelemetryEnabled(val);
    if (val) {
      TelemetryService.start(heartbeatInterval * 1000);
    } else {
      TelemetryService.stop();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Telemetry, Bluetooth & Cluster Diagnostics</Text>
      </View>

      {/* Telemetry Settings */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Activity size={18} color={Colors.heroRed} />
          <Text style={styles.cardTitle}>Live Phone Telemetry</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Sync Battery & Signal</Text>
            <Text style={styles.rowSub}>
              Mirrors phone battery % and cellular signal to cluster LCD
            </Text>
          </View>
          <Switch
            value={telemetryEnabled}
            onValueChange={toggleTelemetry}
            thumbColor="#FFFFFF"
            trackColor={{ false: Colors.surfaceElevated, true: Colors.heroRed }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Auto-Reconnect</Text>
            <Text style={styles.rowSub}>
              Automatically reconnects when your scooter key is turned ON
            </Text>
          </View>
          <Switch
            value={autoReconnect}
            onValueChange={setAutoReconnect}
            thumbColor="#FFFFFF"
            trackColor={{ false: Colors.surfaceElevated, true: Colors.heroRed }}
          />
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionHeader}>Heartbeat Frequency:</Text>
        <View style={styles.pillRow}>
          {[15, 30, 60].map((sec) => (
            <TouchableOpacity
              key={sec}
              style={[
                styles.pill,
                heartbeatInterval === sec && styles.pillActive,
              ]}
              onPress={() => {
                setHeartbeatInterval(sec);
                if (telemetryEnabled) {
                  TelemetryService.stop();
                  TelemetryService.start(sec * 1000);
                }
              }}
            >
              <Text
                style={[
                  styles.pillText,
                  heartbeatInterval === sec && styles.pillTextActive,
                ]}
              >
                Every {sec}s
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Hardware & Protocol Specifications */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Cpu size={18} color={Colors.heroRed} />
          <Text style={styles.cardTitle}>Cluster Protocol Profile</Text>
        </View>

        <View style={styles.specItem}>
          <Text style={styles.specKey}>Service UUID (Telit TIO):</Text>
          <Text style={styles.specValue}>{HeroClusterProtocol.TELIT_SERVICE_UUID}</Text>
        </View>

        <View style={styles.specItem}>
          <Text style={styles.specKey}>Write RX Char UUID:</Text>
          <Text style={styles.specValue}>{HeroClusterProtocol.TELIT_RX_CHAR_UUID}</Text>
        </View>

        <View style={styles.specItem}>
          <Text style={styles.specKey}>Notify TX Char UUID:</Text>
          <Text style={styles.specValue}>{HeroClusterProtocol.TELIT_TX_CHAR_UUID}</Text>
        </View>

        <View style={styles.specItem}>
          <Text style={styles.specKey}>Supported Scooters:</Text>
          <Text style={styles.specDesc}>
            Hero Xoom 125 XTEC, Maestro Edge 125, Pleasure+ XTEC, Destini 125
          </Text>
        </View>
      </View>

      {/* iPhone Real Device & EAS Build Guide */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Smartphone size={18} color={Colors.accentGreen} />
          <Text style={styles.cardTitle}>Real iPhone BLE Testing</Text>
        </View>

        <Text style={styles.guideText}>
          Because the standard App Store Expo Go sandbox cannot access native Bluetooth hardware, this app is configured for an <Text style={{ fontWeight: 'bold', color: Colors.textPrimary }}>Expo Development Client</Text>.
        </Text>

        <View style={styles.stepBox}>
          <Text style={styles.stepTitle}>To run on your physical iPhone from Windows:</Text>
          <Text style={styles.stepItem}>1. Run: <Text style={styles.codeText}>eas build --profile development --platform ios</Text></Text>
          <Text style={styles.stepItem}>2. Scan the generated QR code on your iPhone to install the app.</Text>
          <Text style={styles.stepItem}>3. Run: <Text style={styles.codeText}>npx expo start</Text> on Windows to develop with live reload and real BLE hardware!</Text>
        </View>
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
    paddingBottom: 40,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  rowSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  pillActive: {
    backgroundColor: Colors.heroRedMuted,
    borderColor: Colors.heroRed,
  },
  pillText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  pillTextActive: {
    color: Colors.heroRed,
    fontWeight: '700',
  },
  specItem: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  specKey: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  specValue: {
    fontSize: 11,
    color: Colors.accentGreen,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  specDesc: {
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 16,
  },
  guideText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  stepBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 6,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  stepItem: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  codeText: {
    color: Colors.accentGreen,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
  },
});
