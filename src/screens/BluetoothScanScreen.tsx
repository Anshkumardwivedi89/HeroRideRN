import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Bluetooth,
  BluetoothSearching,
  Plus,
  Signal,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react-native';
import { useBle } from '../bluetooth/BleContext';
import { Colors } from '../theme/colors';
import { DiscoveredClusterDevice } from '../protocol/types';

export const BluetoothScanScreen: React.FC = () => {
  const {
    connectionState,
    connectedDeviceName,
    discoveredDevices,
    startScan,
    stopScan,
    connectToDevice,
    disconnect,
  } = useBle();

  const isScanning = connectionState === 'scanning';
  const isConnecting = connectionState === 'connecting' || connectionState === 'discovering';
  const isConnected = connectionState === 'connected';

  const [manualId, setManualId] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);

  const handleConnect = async (id: string) => {
    setConnectingDeviceId(id);
    try {
      await connectToDevice(id);
    } finally {
      setConnectingDeviceId(null);
    }
  };

  const handleManualConnect = async () => {
    if (!manualId.trim()) return;
    const id = manualId.trim();
    setShowManualModal(false);
    await handleConnect(id);
  };

  const renderDeviceItem = ({ item }: { item: DiscoveredClusterDevice }) => {
    const isThisConnected =
      isConnected &&
      Boolean(connectedDeviceName && (connectedDeviceName === item.name || connectedDeviceName.includes(item.id)));
    const isThisDeviceConnecting = isConnecting && connectingDeviceId === item.id;

    return (
      <View style={[styles.deviceItem, item.isHeroCluster && styles.heroDeviceItem]}>
        <View style={styles.deviceInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.deviceName}>{item.name || 'Unnamed Device'}</Text>
            {item.isHeroCluster && (
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>HERO CLUSTER</Text>
              </View>
            )}
          </View>

          <Text style={styles.deviceId} numberOfLines={1}>
            {item.id}
          </Text>

          <View style={styles.rssiRow}>
            <Signal size={12} color={Colors.textMuted} />
            <Text style={styles.rssiText}>{item.rssi ? `${item.rssi} dBm` : 'Unknown RSSI'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.connectBtn,
            isThisConnected && styles.connectedBtn,
            item.isHeroCluster && !isThisConnected && styles.heroConnectBtn,
            isConnecting && !isThisDeviceConnecting && { opacity: 0.5 },
          ]}
          disabled={isConnecting}
          onPress={() => {
            if (isThisConnected) {
              disconnect();
            } else {
              handleConnect(item.id);
            }
          }}
        >
          {isThisDeviceConnecting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.connectBtnText}>
              {isThisConnected ? 'Disconnect' : 'Connect'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bluetooth Pairing</Text>
          <Text style={styles.subtitle}>Connect to your Hero digital cluster</Text>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowManualModal(true)}
        >
          <Plus size={20} color={Colors.heroRed} />
        </TouchableOpacity>
      </View>

      {/* Scan Control Card */}
      <View style={styles.scanCard}>
        <View style={styles.scanTextWrapper}>
          <Text style={styles.scanTitle}>
            {isScanning
              ? 'Searching for clusters...'
              : isConnected
              ? 'Connected to cluster'
              : 'Ready to scan'}
          </Text>
          <Text style={styles.scanDesc}>
            Turn your scooter key ON into pairing mode
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.scanButton,
            isScanning && styles.scanButtonActive,
            isConnected && styles.scanButtonConnected,
          ]}
          onPress={() => {
            if (isScanning) {
              stopScan();
            } else if (isConnected) {
              disconnect();
            } else {
              startScan();
            }
          }}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : isConnected ? (
            <CheckCircle2 size={18} color="#FFFFFF" />
          ) : (
            <BluetoothSearching size={18} color="#FFFFFF" />
          )}
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Stop' : isConnected ? 'Disconnect' : 'Scan'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Discovered Devices List */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          Discovered Devices ({discoveredDevices.length})
        </Text>
        {isScanning && (
          <Text style={styles.scanningNotice}>Scanning active...</Text>
        )}
      </View>

      {discoveredDevices.length === 0 ? (
        <View style={styles.emptyState}>
          <Bluetooth size={48} color={Colors.surfaceBorder} />
          <Text style={styles.emptyTitle}>No devices found yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap "Scan" above to search for nearby Bluetooth clusters
          </Text>
        </View>
      ) : (
        <FlatList
          data={discoveredDevices}
          keyExtractor={(item) => item.id}
          renderItem={renderDeviceItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Manual UUID / MAC Input Modal */}
      <Modal
        visible={showManualModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManualModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connect by UUID / MAC</Text>
              <TouchableOpacity onPress={() => setShowManualModal(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Enter your scooter cluster's Bluetooth Identifier:
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. AA:BB:CC:DD:EE:FF or iOS UUID"
              placeholderTextColor={Colors.textMuted}
              value={manualId}
              onChangeText={setManualId}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowManualModal(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleManualConnect}
              >
                <Text style={styles.submitModalText}>Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scanTextWrapper: {
    flex: 1,
    marginRight: 10,
  },
  scanTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scanDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scanButton: {
    backgroundColor: Colors.heroRed,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  scanButtonActive: {
    backgroundColor: '#37474F',
  },
  scanButtonConnected: {
    backgroundColor: Colors.accentGreen,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  scanningNotice: {
    fontSize: 11,
    color: Colors.accentGreen,
    fontWeight: '600',
  },
  listContent: {
    gap: 10,
    paddingBottom: 30,
  },
  deviceItem: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroDeviceItem: {
    borderColor: Colors.heroRed,
    backgroundColor: 'rgba(225, 25, 36, 0.05)',
  },
  deviceInfo: {
    flex: 1,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  heroBadge: {
    backgroundColor: Colors.heroRed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  deviceId: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 3,
  },
  rssiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  rssiText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  connectBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  heroConnectBtn: {
    backgroundColor: Colors.heroRed,
    borderColor: Colors.heroRed,
  },
  connectedBtn: {
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    borderColor: Colors.accentYellow,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  cancelModalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelModalText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  submitModalBtn: {
    backgroundColor: Colors.heroRed,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitModalText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
