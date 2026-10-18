import { ManeuverIconCode } from './types';

/**
 * Reverse-engineered Bluetooth Low Energy (BLE) communication protocol
 * for Hero MotoCorp smart instrument clusters (Hero Xoom 125 XTEC, Maestro Edge, Pleasure+ XTEC).
 *
 * Packets are UTF-8 / US-ASCII strings, fields separated and padded with '~', terminated by '\n'.
 */
export class HeroClusterProtocol {
  // Official Hero MotoCorp 128-bit GATT specifications (verified from official APK)
  public static readonly HERO_PRIMARY_SERVICE_UUID = 'E837D9A2-9C49-4493-9547-8E6918A59CA8';
  public static readonly HERO_WRITE_CHAR_UUID = '64AECB40-849A-44F1-934F-ADDC4B316423'; // UART RX (Write to cluster)
  public static readonly HERO_NOTIFY_CHAR_UUID = 'B792A4BB-DB87-436A-9066-DB63C5FB3F00'; // UART TX (Notify from cluster)
  public static readonly HERO_CREDITS_RX_CHAR_UUID = 'F535DD6E-7975-4ABD-9719-491E38A81179'; // Flow credits write to cluster
  public static readonly HERO_CREDITS_TX_CHAR_UUID = '36E8614B-2DED-45C1-9AD3-C9F59A01F21E'; // Flow credits indication from cluster

  // Legacy Telit Terminal I/O (TIO) 16-bit GATT fallback specifications
  public static readonly TELIT_SERVICE_UUID = '0000FEFB-0000-1000-8000-00805F9B34FB';
  public static readonly TELIT_RX_CHAR_UUID = '00000001-0000-1000-8000-008025000000'; // Write to cluster
  public static readonly TELIT_TX_CHAR_UUID = '00000002-0000-1000-8000-008025000000'; // Notify from cluster
  public static readonly TELIT_CREDITS_RX_CHAR_UUID = '00000003-0000-1000-8000-008025000000';
  public static readonly TELIT_CREDITS_TX_CHAR_UUID = '00000004-0000-1000-8000-008025000000';

  // Standard Client Characteristic Configuration Descriptor (CCCD)
  public static readonly CCCD_UUID = '00002902-0000-1000-8000-00805F9B34FB';

  // Initial credits granted to cluster to initialize UART write buffer
  public static readonly INITIAL_FLOW_CREDITS = 10;

  // Alternative cluster UUIDs discovered in Hero cluster firmwares
  public static readonly SECONDARY_SERVICE_UUIDS = [
    '36E8614B-2DED-45C1-9AD3-C9F59A01F21E',
    '64AECB40-849A-44F1-934F-ADDC4B316423',
    'B792A4BB-DB87-436A-9066-DB63C5FB3F00',
    'E837D9A2-9C49-4493-9547-8E6918A59CA8',
    'F535DD6E-7975-4ABD-9719-491E38A81179',
    '0010676E-6972-6565-6E69-676E4543544F', // OTC Engineering
  ];

  public static readonly MAX_NAME_LENGTH = 14;
  public static readonly MAX_STREET_LENGTH = 18;
  private static readonly PAD_CHAR = '~';

  /**
   * Pads or truncates a string with '~' up to the exact display length for LCD segment alignment.
   */
  public static padString(str: string, targetLength: IntNumber): string {
    const sanitized = (str || '').replace(/~/g, ' ').trim();
    if (sanitized.length >= targetLength) {
      return sanitized.substring(0, targetLength);
    }
    return sanitized + this.PAD_CHAR.repeat(targetLength - sanitized.length);
  }

  // ──────────────────────────────────────────────────────────────────
  // Turn-By-Turn Navigation Packets
  // Format: M<IconCode>~<DistanceMeters>~<StreetNamePadded>~\n
  // ──────────────────────────────────────────────────────────────────

  /**
   * Encodes turn-by-turn navigation data into byte string for Hero cluster LCD.
   */
  public static buildNavigationPacket(
    icon: ManeuverIconCode,
    distanceMeters: number,
    streetName: string
  ): string {
    const paddedStreet = this.padString(streetName, this.MAX_STREET_LENGTH);
    const clampedDist = Math.min(Math.max(Math.round(distanceMeters), 0), 99999);
    return `M${icon}~${clampedDist}~${paddedStreet}~\n`;
  }

  /**
   * Encodes route cleared / navigation stopped packet.
   */
  public static buildClearNavigationPacket(): string {
    const emptyStreet = this.padString('', this.MAX_STREET_LENGTH);
    return `M00~0~${emptyStreet}~\n`;
  }

  // ──────────────────────────────────────────────────────────────────
  // Phone Call Alert Packets
  // ──────────────────────────────────────────────────────────────────

  /**
   * Incoming ringing call with caller name or number. Opcode '1'
   */
  public static buildIncomingCallPacket(callerNameOrNumber: string): string {
    const paddedName = this.padString(callerNameOrNumber || 'Unknown', this.MAX_NAME_LENGTH);
    return `1${paddedName}~\n`;
  }

  /**
   * Active ongoing call with caller name and duration in seconds. Opcode '2'
   */
  public static buildActiveCallPacket(callerNameOrNumber: string, durationSeconds: number): string {
    const paddedName = this.padString(callerNameOrNumber || 'Unknown', this.MAX_NAME_LENGTH);
    const sec = Math.max(Math.round(durationSeconds), 0);
    return `2${paddedName}~${sec}~\n`;
  }

  /**
   * Outgoing call initiated from phone. Opcode '3'
   */
  public static buildOutgoingCallPacket(calleeNameOrNumber: string): string {
    const paddedName = this.padString(calleeNameOrNumber || 'Unknown', this.MAX_NAME_LENGTH);
    return `3${paddedName}~\n`;
  }

  /**
   * Missed call notification. Opcode '5'
   */
  public static buildMissedCallPacket(missedCount: number): string {
    const count = Math.max(Math.round(missedCount), 1);
    return `5${count}\n`;
  }

  /**
   * Call ended / idle state. Opcode '7'
   */
  public static buildCallEndedPacket(): string {
    return `7~0~d\n`;
  }

  // ──────────────────────────────────────────────────────────────────
  // SMS Notification Packets
  // ──────────────────────────────────────────────────────────────────

  /**
   * SMS alert with sender name or phone number. Opcode '6'
   */
  public static buildSmsAlertPacket(senderNameOrNumber: string): string {
    const paddedSender = this.padString(senderNameOrNumber || 'New SMS', this.MAX_NAME_LENGTH);
    return `6${paddedSender}~\n`;
  }

  // ──────────────────────────────────────────────────────────────────
  // Phone Telemetry (Battery & Cellular Signal)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Phone Battery & Signal status to display battery icon & bars on cluster LCD. Opcode '4'
   */
  public static buildBatteryAndSignalPacket(
    batteryPercent: number,
    signalBars: number,
    networkType = '4G'
  ): string {
    const clampedBatt = Math.min(Math.max(Math.round(batteryPercent), 0), 100);
    const clampedSignal = Math.min(Math.max(Math.round(signalBars), 0), 4);
    return `4${clampedBatt}~${clampedSignal}~${networkType}~\n`;
  }

  /**
   * Low phone battery warning packet.
   */
  public static buildLowBatteryWarningPacket(): string {
    return `30124\n`;
  }

  // ──────────────────────────────────────────────────────────────────
  // Music Player Control (Opcode '9')
  // ──────────────────────────────────────────────────────────────────

  /**
   * Music Track info displayed on cluster.
   */
  public static buildMusicTrackPacket(title: string, artist: string, isPlaying: boolean): string {
    const paddedTitle = this.padString(title, 12);
    const paddedArtist = this.padString(artist, 10);
    const state = isPlaying ? '1' : '0';
    return `9${paddedTitle}~${paddedArtist}~${state}~\n`;
  }

  // ──────────────────────────────────────────────────────────────────
  // Google Maps / Apple Maps Maneuver Parser -> Hero Cluster Icon Mapper
  // ──────────────────────────────────────────────────────────────────

  public static mapInstructionToIcon(instruction: string): ManeuverIconCode {
    const lower = (instruction || '').toLowerCase();

    if (lower.includes('u-turn') || lower.includes('uturn')) {
      return lower.includes('left') ? ManeuverIconCode.U_TURN_LEFT : ManeuverIconCode.U_TURN_RIGHT;
    }
    if (lower.includes('sharp right')) return ManeuverIconCode.SHARP_RIGHT;
    if (lower.includes('sharp left')) return ManeuverIconCode.SHARP_LEFT;
    if (
      lower.includes('slight right') ||
      lower.includes('bear right') ||
      lower.includes('keep right')
    ) {
      return ManeuverIconCode.SLIGHT_RIGHT;
    }
    if (
      lower.includes('slight left') ||
      lower.includes('bear left') ||
      lower.includes('keep left')
    ) {
      return ManeuverIconCode.SLIGHT_LEFT;
    }
    if (lower.includes('turn right') || lower.includes('right')) return ManeuverIconCode.TURN_RIGHT;
    if (lower.includes('turn left') || lower.includes('left')) return ManeuverIconCode.TURN_LEFT;
    if (
      lower.includes('roundabout') ||
      lower.includes('rotary') ||
      lower.includes('traffic circle')
    ) {
      if (lower.includes('1st') || lower.includes('first')) return ManeuverIconCode.ROUNDABOUT_EXIT_1;
      if (lower.includes('2nd') || lower.includes('second')) return ManeuverIconCode.ROUNDABOUT_EXIT_2;
      if (lower.includes('3rd') || lower.includes('third')) return ManeuverIconCode.ROUNDABOUT_EXIT_3;
      if (lower.includes('4th') || lower.includes('fourth')) return ManeuverIconCode.ROUNDABOUT_EXIT_4;
      if (lower.includes('5th') || lower.includes('fifth')) return ManeuverIconCode.ROUNDABOUT_EXIT_5;
      return ManeuverIconCode.ROUNDABOUT_EXIT_1;
    }
    if (lower.includes('arrive') || lower.includes('destination')) {
      return ManeuverIconCode.DESTINATION_REACHED;
    }
    if (
      lower.includes('re-centering') ||
      lower.includes('re-routing') ||
      lower.includes('recalculating')
    ) {
      return ManeuverIconCode.RECALCULATING;
    }
    return ManeuverIconCode.STRAIGHT;
  }

  /**
   * Parses human-readable distance strings like "300 m", "1.2 km", "500 ft", "2 mi" into integer meters.
   */
  public static parseDistanceToMeters(distanceText: string): number {
    const clean = (distanceText || '').trim().toLowerCase();
    const match = clean.match(/([\d.,]+)\s*([a-z]+)/);
    if (!match) return 0;

    const num = parseFloat(match[1].replace(/,/g, ''));
    if (isNaN(num)) return 0;
    const unit = match[2];

    if (unit.startsWith('k')) return Math.round(num * 1000); // km
    if (unit.startsWith('m') && !unit.startsWith('mi')) return Math.round(num); // meters
    if (unit.startsWith('mi')) return Math.round(num * 1609.34); // miles
    if (unit.startsWith('f')) return Math.round(num * 0.3048); // feet
    if (unit.startsWith('y')) return Math.round(num * 0.9144); // yards
    return Math.round(num);
  }
}

type IntNumber = number;
