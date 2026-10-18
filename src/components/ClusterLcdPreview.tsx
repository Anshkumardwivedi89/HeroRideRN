import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import {
  ArrowUp,
  ArrowUpRight,
  CornerUpRight,
  MoveDownRight,
  RotateCw,
  RotateCcw,
  MoveDownLeft,
  CornerUpLeft,
  ArrowUpLeft,
  RefreshCw,
  Flag,
  Compass,
  Battery,
  Signal,
  Bluetooth,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { ManeuverIconCode, MANEUVER_LIST } from '../protocol/types';

interface ClusterLcdPreviewProps {
  maneuver: ManeuverIconCode;
  distanceMeters: number;
  streetName: string;
  speedKmh?: number;
  batteryPercent?: number;
  signalBars?: number;
}

export const ClusterLcdPreview: React.FC<ClusterLcdPreviewProps> = ({
  maneuver,
  distanceMeters,
  streetName,
  speedKmh = 0,
  batteryPercent = 88,
  signalBars = 3,
}) => {
  const maneuverItem = MANEUVER_LIST.find((m) => m.code === maneuver) || MANEUVER_LIST[0];

  const renderIcon = () => {
    const size = 44;
    const color = Colors.lcdActive;

    switch (maneuver) {
      case ManeuverIconCode.STRAIGHT:
        return <ArrowUp size={size} color={color} strokeWidth={2.5} />;
      case ManeuverIconCode.SLIGHT_RIGHT:
        return <ArrowUpRight size={size} color={color} strokeWidth={2.5} />;
      case ManeuverIconCode.TURN_RIGHT:
        return <CornerUpRight size={size} color={color} strokeWidth={2.5} />;
      case ManeuverIconCode.SHARP_RIGHT:
        return <MoveDownRight size={size} color={color} strokeWidth={2.5} />;
      case ManeuverIconCode.U_TURN_RIGHT:
        return <RotateCw size={size} color={color} strokeWidth={2.5} />;
      case ManeuverIconCode.U_TURN_LEFT:
        return <RotateCcw size={size} color={color} strokeWidth={2.5} />;
      case ManeuverIconCode.SHARP_LEFT:
        return <MoveDownLeft size={size} color={color} strokeWidth={2.5} />;
      case ManeuverIconCode.TURN_LEFT:
        return <CornerUpLeft size={size} color={color} strokeWidth={2.5} />;
      case ManeuverIconCode.SLIGHT_LEFT:
        return <ArrowUpLeft size={size} color={color} strokeWidth={2.5} />;
      case ManeuverIconCode.ROUNDABOUT_EXIT_1:
      case ManeuverIconCode.ROUNDABOUT_EXIT_2:
      case ManeuverIconCode.ROUNDABOUT_EXIT_3:
      case ManeuverIconCode.ROUNDABOUT_EXIT_4:
      case ManeuverIconCode.ROUNDABOUT_EXIT_5:
      case ManeuverIconCode.ROUNDABOUT_EXIT_6:
        return <RefreshCw size={size} color={color} strokeWidth={2.5} />;
      case ManeuverIconCode.DESTINATION_REACHED:
        return <Flag size={size} color={color} strokeWidth={2.5} />;
      case ManeuverIconCode.RECALCULATING:
        return <Compass size={size} color={color} strokeWidth={2.5} />;
      default:
        return <ArrowUp size={size} color={color} strokeWidth={2.5} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SCOOTER CLUSTER LCD PREVIEW</Text>
        <Text style={styles.headerSub}>HERO XOOM 125 XTEC</Text>
      </View>

      <View style={styles.screen}>
        {/* Top Status Bar: Bluetooth, Signal, Battery */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Bluetooth size={14} color={Colors.lcdActive} />
            <Text style={styles.topBarText}>CONNECTED</Text>
          </View>
          <View style={styles.topBarRight}>
            <Signal size={14} color={Colors.lcdActive} />
            <Text style={styles.topBarText}>{signalBars}/4</Text>
            <Battery size={14} color={Colors.lcdActive} style={{ marginLeft: 6 }} />
            <Text style={styles.topBarText}>{batteryPercent}%</Text>
          </View>
        </View>

        {/* Center Cluster Layout */}
        <View style={styles.mainContent}>
          {/* Left: Speedometer Reading */}
          <View style={styles.speedSection}>
            <Text style={styles.speedValue}>{Math.round(speedKmh)}</Text>
            <Text style={styles.speedUnit}>KM/H</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Center: Turn Arrow & Distance */}
          <View style={styles.navSection}>
            <View style={styles.iconWrapper}>{renderIcon()}</View>
            <View style={styles.distanceWrapper}>
              <Text style={styles.distanceValue}>
                {distanceMeters >= 1000
                  ? `${(distanceMeters / 1000).toFixed(1)}`
                  : `${distanceMeters}`}
              </Text>
              <Text style={styles.distanceUnit}>{distanceMeters >= 1000 ? 'KM' : 'M'}</Text>
            </View>
            <Text style={styles.maneuverLabel}>{maneuverItem.label}</Text>
          </View>
        </View>

        {/* Bottom: 18-Character Street Banner (Exact LCD Matrix Line) */}
        <View style={styles.streetBanner}>
          <Text style={styles.streetText} numberOfLines={1}>
            {streetName.toUpperCase() || 'CONTINUE ON ROUTE'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#070C10',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#182430',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accentGreen,
    letterSpacing: 1.2,
  },
  headerSub: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  screen: {
    backgroundColor: Colors.lcdBackground,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.lcdBorder,
    padding: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.lcdBorder,
    paddingBottom: 6,
    marginBottom: 10,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topBarText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.lcdActive,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  speedSection: {
    alignItems: 'center',
    minWidth: 70,
  },
  speedValue: {
    fontSize: 38,
    fontWeight: 'bold',
    color: Colors.lcdActive,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 42,
  },
  speedUnit: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.lcdSubtext,
    letterSpacing: 1,
  },
  divider: {
    width: 1.5,
    height: 50,
    backgroundColor: Colors.lcdBorder,
  },
  navSection: {
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    marginBottom: 4,
  },
  distanceWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  distanceValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.lcdActive,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  distanceUnit: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.lcdSubtext,
  },
  maneuverLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.lcdActive,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  streetBanner: {
    backgroundColor: 'rgba(0, 255, 102, 0.08)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.lcdBorder,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  streetText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.lcdActive,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1.5,
  },
});
