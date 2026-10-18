import React from 'react';
import { View, Text, StyleSheet, FlatList, Platform } from 'react-native';
import { Colors } from '../theme/colors';
import { BlePacketLog } from '../protocol/types';

interface PacketLogViewProps {
  logs: BlePacketLog[];
  maxHeight?: number;
}

export const PacketLogView: React.FC<PacketLogViewProps> = ({ logs, maxHeight = 220 }) => {
  const renderItem = ({ item }: { item: BlePacketLog }) => {
    let tagColor = Colors.textMuted;
    let tagBg = 'rgba(255, 255, 255, 0.05)';

    if (item.direction === 'TX') {
      tagColor = Colors.accentGreen;
      tagBg = Colors.accentGreenMuted;
    } else if (item.direction === 'RX') {
      tagColor = Colors.accentBlue;
      tagBg = 'rgba(41, 182, 246, 0.15)';
    } else if (item.direction === 'ERROR') {
      tagColor = Colors.heroRed;
      tagBg = Colors.heroRedMuted;
    }

    return (
      <View style={styles.logRow}>
        <View style={styles.timeAndTag}>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
          <View style={[styles.badge, { backgroundColor: tagBg }]}>
            <Text style={[styles.badgeText, { color: tagColor }]}>{item.direction}</Text>
          </View>
        </View>

        <Text style={styles.description}>{item.description}</Text>

        {Boolean(item.rawPayload) && (
          <Text style={styles.rawPayload} numberOfLines={2}>
            {item.rawPayload.replace(/\n/g, '\\n')}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { maxHeight }]}>
      <View style={styles.terminalHeader}>
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: '#FF5F56' }]} />
          <View style={[styles.dot, { backgroundColor: '#FFBD2E' }]} />
          <View style={[styles.dot, { backgroundColor: '#27C93F' }]} />
        </View>
        <Text style={styles.terminalTitle}>BLE ACTIVITY LOG</Text>
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No packets transmitted yet</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#090D12',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1D2A3A',
    overflow: 'hidden',
  },
  terminalHeader: {
    backgroundColor: '#111822',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1D2A3A',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  terminalTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginRight: 24,
  },
  listContent: {
    padding: 10,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  logRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  timeAndTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestamp: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 12,
    color: Colors.textPrimary,
    marginTop: 2,
    fontWeight: '500',
  },
  rawPayload: {
    fontSize: 11,
    color: Colors.accentGreen,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
    backgroundColor: 'rgba(0, 230, 118, 0.04)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
});
