import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Send, Code, Layers, Sparkles } from 'lucide-react-native';
import { useBle } from '../bluetooth/BleContext';
import { Colors } from '../theme/colors';
import { PacketLogView } from '../components/PacketLogView';

export const GattExplorerScreen: React.FC = () => {
  const { gattTree, sendRawData, logs } = useBle();
  const [customPayload, setCustomPayload] = useState('M02~300~Station Road~~~~~~~\n');

  const presets = [
    { label: 'Nav Right', payload: 'M02~500~MG Road~~~~~~~~~~~\n' },
    { label: 'Incoming Call', payload: '1John Doe~~~~~~~\n' },
    { label: 'SMS Alert', payload: '6Alice~~~~~~~~~~\n' },
    { label: 'Battery/Signal', payload: '485~3~4G~\n' },
    { label: 'Clear Call', payload: '7~0~d\n' },
    { label: 'Clear Nav', payload: 'M00~0~~~~~~~~~~~~~~~~~~\n' },
  ];

  const handleSend = (text: string) => {
    // Unescape literal \n into newline character
    const formatted = text.replace(/\\n/g, '\n');
    sendRawData(formatted);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.title}>GATT Explorer</Text>
        <Text style={styles.subtitle}>Raw Protocol Testing & Cluster Services</Text>
      </View>

      {/* Raw Payload Sender */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Code size={18} color={Colors.heroRed} />
          <Text style={styles.cardTitle}>Send Custom ASCII Packet to Cluster RX</Text>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={customPayload}
            onChangeText={setCustomPayload}
            placeholder="e.g. M02~300~Station Road~~~~~~~\n"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => handleSend(customPayload)}
          >
            <Send size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Presets */}
        <Text style={styles.presetTitle}>Quick Packet Templates:</Text>
        <View style={styles.presetWrap}>
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset.label}
              style={styles.presetChip}
              onPress={() => {
                setCustomPayload(preset.payload);
                handleSend(preset.payload);
              }}
            >
              <Sparkles size={12} color={Colors.accentGreen} />
              <Text style={styles.presetChipText}>{preset.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Discovered GATT Services */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Layers size={18} color={Colors.heroRed} />
          <Text style={styles.cardTitle}>
            Discovered GATT Services ({gattTree.length})
          </Text>
        </View>

        {gattTree.length === 0 ? (
          <Text style={styles.emptyNotice}>
            No services discovered yet. Connect to your Hero cluster in the Bluetooth tab to inspect services.
          </Text>
        ) : (
          gattTree.map((svc, index) => (
            <View key={svc.uuid + index} style={styles.serviceItem}>
              <Text style={styles.serviceUuid}>SERVICE: {svc.uuid}</Text>
              <View style={styles.charList}>
                {svc.characteristics.map((char) => (
                  <View key={char.uuid} style={styles.charItem}>
                    <Text style={styles.charUuid}>CHAR: {char.uuid}</Text>
                    <View style={styles.propsRow}>
                      {char.isWritableWithoutResponse && (
                        <View style={styles.propTag}>
                          <Text style={styles.propTagText}>WRITE_NO_RESP</Text>
                        </View>
                      )}
                      {char.isWritableWithResponse && (
                        <View style={styles.propTag}>
                          <Text style={styles.propTagText}>WRITE</Text>
                        </View>
                      )}
                      {char.isReadable && (
                        <View style={styles.propTag}>
                          <Text style={styles.propTagText}>READ</Text>
                        </View>
                      )}
                      {char.isNotifiable && (
                        <View style={[styles.propTag, styles.notifyTag]}>
                          <Text style={styles.notifyTagText}>NOTIFY</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Packet Terminal */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Transmission Activity</Text>
        <PacketLogView logs={logs} maxHeight={220} />
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
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.accentGreen,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sendButton: {
    backgroundColor: Colors.heroRed,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  presetChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  emptyNotice: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  serviceItem: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  serviceUuid: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.heroRed,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 6,
  },
  charList: {
    paddingLeft: 8,
    gap: 6,
  },
  charItem: {
    borderLeftWidth: 1.5,
    borderLeftColor: Colors.surfaceBorder,
    paddingLeft: 8,
  },
  charUuid: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  propsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  propTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  propTagText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: 'bold',
  },
  notifyTag: {
    backgroundColor: Colors.accentGreenMuted,
  },
  notifyTagText: {
    fontSize: 9,
    color: Colors.accentGreen,
    fontWeight: 'bold',
  },
});
