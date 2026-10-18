import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import {
  Send,
  Trash2,
  MapPin,
  Compass,
} from 'lucide-react-native';
import { useBle } from '../bluetooth/BleContext';
import { Colors } from '../theme/colors';
import { ClusterLcdPreview } from '../components/ClusterLcdPreview';
import { ManeuverIconCode, MANEUVER_LIST } from '../protocol/types';

export const NavigationScreen: React.FC = () => {
  const { sendNavigation, clearNavigation, connectionState } = useBle();

  const [activeManeuver, setActiveManeuver] = useState<ManeuverIconCode>(ManeuverIconCode.TURN_RIGHT);
  const [distanceMeters, setDistanceMeters] = useState<number>(350);
  const [streetName, setStreetName] = useState<string>('MG Road');
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);

  // Live GPS speed tracking
  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null;

    const startGps = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setIsGpsActive(true);
          locationSub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 1000,
              distanceInterval: 1,
            },
            (loc) => {
              if (loc.coords.speed && loc.coords.speed > 0) {
                // Convert m/s to km/h
                setSpeedKmh(loc.coords.speed * 3.6);
              } else {
                setSpeedKmh(0);
              }
            }
          );
        }
      } catch (err) {
        setIsGpsActive(false);
      }
    };

    startGps();

    return () => {
      if (locationSub) {
        locationSub.remove();
      }
    };
  }, []);

  const handleTransmit = () => {
    sendNavigation(activeManeuver, distanceMeters, streetName);
  };

  const handleClear = () => {
    clearNavigation();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Navigation</Text>
          <Text style={styles.pageSubtitle}>Cluster LCD Mirroring & Route Simulation</Text>
        </View>

        <View style={styles.gpsIndicator}>
          <MapPin size={12} color={isGpsActive ? Colors.accentGreen : Colors.textMuted} />
          <Text
            style={[
              styles.gpsText,
              { color: isGpsActive ? Colors.accentGreen : Colors.textMuted },
            ]}
          >
            {isGpsActive ? 'GPS ACTIVE' : 'GPS IDLE'}
          </Text>
        </View>
      </View>

      {/* Cluster LCD Preview */}
      <ClusterLcdPreview
        maneuver={activeManeuver}
        distanceMeters={distanceMeters}
        streetName={streetName}
        speedKmh={speedKmh}
      />

      {/* Action Buttons */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={[styles.transmitButton, { flex: 1.5 }]}
          activeOpacity={0.8}
          onPress={handleTransmit}
        >
          <Send size={16} color="#FFFFFF" />
          <Text style={styles.transmitButtonText}>Push to Scooter Screen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.clearButton, { flex: 1 }]}
          activeOpacity={0.8}
          onPress={handleClear}
        >
          <Trash2 size={16} color={Colors.accentYellow} />
          <Text style={styles.clearButtonText}>Clear Screen</Text>
        </TouchableOpacity>
      </View>

      {/* Distance & Street Controls */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Maneuver Distance & Street Name</Text>

        <View style={styles.inputsRow}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Distance (meters)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={String(distanceMeters)}
              onChangeText={(txt) => setDistanceMeters(parseInt(txt, 10) || 0)}
            />
          </View>

          <View style={[styles.inputWrapper, { flex: 1.6 }]}>
            <Text style={styles.inputLabel}>Street (Max 18 chars)</Text>
            <TextInput
              style={styles.textInput}
              maxLength={18}
              value={streetName}
              onChangeText={setStreetName}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Quick Distance Presets */}
        <View style={styles.presetsRow}>
          {[50, 100, 350, 500, 1000].map((dist) => (
            <TouchableOpacity
              key={dist}
              style={[
                styles.presetPill,
                distanceMeters === dist && styles.presetPillActive,
              ]}
              onPress={() => setDistanceMeters(dist)}
            >
              <Text
                style={[
                  styles.presetText,
                  distanceMeters === dist && styles.presetTextActive,
                ]}
              >
                {dist >= 1000 ? `${dist / 1000}km` : `${dist}m`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Maneuver Selector */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Select Maneuver Icon</Text>
        <Text style={styles.sectionDesc}>
          Tap any direction arrow below to update the preview and cluster display:
        </Text>

        <View style={styles.maneuverGrid}>
          {MANEUVER_LIST.map((item) => {
            const isSelected = activeManeuver === item.code;
            return (
              <TouchableOpacity
                key={item.code}
                style={[
                  styles.maneuverCard,
                  isSelected && styles.maneuverCardActive,
                ]}
                onPress={() => {
                  setActiveManeuver(item.code);
                  sendNavigation(item.code, distanceMeters, streetName);
                }}
              >
                <Compass
                  size={20}
                  color={isSelected ? Colors.heroRed : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.maneuverCardLabel,
                    isSelected && styles.maneuverCardLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <Text style={styles.maneuverCardCode}>Code {item.code}</Text>
              </TouchableOpacity>
            );
          })}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  pageSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gpsText: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  transmitButton: {
    backgroundColor: Colors.heroRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  transmitButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  clearButton: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  clearButtonText: {
    color: Colors.accentYellow,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  presetPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  presetPillActive: {
    backgroundColor: Colors.heroRedMuted,
    borderColor: Colors.heroRed,
  },
  presetText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  presetTextActive: {
    color: Colors.heroRed,
    fontWeight: '700',
  },
  maneuverGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  maneuverCard: {
    width: '31%',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  maneuverCardActive: {
    borderColor: Colors.heroRed,
    backgroundColor: Colors.heroRedMuted,
  },
  maneuverCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  maneuverCardLabelActive: {
    color: Colors.heroRed,
  },
  maneuverCardCode: {
    fontSize: 9,
    color: Colors.textMuted,
  },
});
