import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bike, Map, PhoneCall, MessageSquare, Bluetooth } from 'lucide-react-native';
import { Colors } from '../theme/colors';

interface ScooterCardProps {
  connectedName: string | null;
  isConnected: boolean;
  onConnectPress: () => void;
}

export const ScooterCard: React.FC<ScooterCardProps> = ({
  connectedName,
  isConnected,
  onConnectPress,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.titleColumn}>
          <Text style={styles.modelName}>
            {connectedName || 'Hero Xoom 125 XTEC'}
          </Text>
          <Text style={styles.subtitle}>Smart Digital Instrument Cluster</Text>
        </View>
        <View style={styles.bikeIconBadge}>
          <Bike size={26} color={Colors.heroRed} />
        </View>
      </View>

      <View style={styles.divider} />

      {/* Quick Status Grid */}
      <View style={styles.statusGrid}>
        <View style={styles.statusItem}>
          <Map size={18} color={Colors.heroRed} />
          <Text style={styles.statusLabel}>TBT Nav</Text>
          <Text style={styles.statusValue}>Turn Mirror</Text>
        </View>

        <View style={styles.statusItem}>
          <PhoneCall size={18} color={Colors.heroRed} />
          <Text style={styles.statusLabel}>Caller ID</Text>
          <Text style={styles.statusValue}>Cluster Sync</Text>
        </View>

        <View style={styles.statusItem}>
          <MessageSquare size={18} color={Colors.heroRed} />
          <Text style={styles.statusLabel}>SMS Alerts</Text>
          <Text style={styles.statusValue}>Active</Text>
        </View>
      </View>

      {!isConnected && (
        <TouchableOpacity
          style={styles.connectButton}
          activeOpacity={0.8}
          onPress={onConnectPress}
        >
          <Bluetooth size={18} color="#FFFFFF" />
          <Text style={styles.connectButtonText}>Connect to Scooter</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleColumn: {
    flex: 1,
    marginRight: 12,
  },
  modelName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bikeIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.heroRedMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: 14,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  statusValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  connectButton: {
    backgroundColor: Colors.heroRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
