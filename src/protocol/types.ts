export enum ManeuverIconCode {
  STRAIGHT = '00',
  SLIGHT_RIGHT = '01',
  TURN_RIGHT = '02',
  SHARP_RIGHT = '03',
  U_TURN_RIGHT = '04',
  U_TURN_LEFT = '05',
  SHARP_LEFT = '06',
  TURN_LEFT = '07',
  SLIGHT_LEFT = '08',
  ROUNDABOUT_EXIT_1 = '09',
  ROUNDABOUT_EXIT_2 = '10',
  ROUNDABOUT_EXIT_3 = '11',
  ROUNDABOUT_EXIT_4 = '12',
  ROUNDABOUT_EXIT_5 = '13',
  ROUNDABOUT_EXIT_6 = '14',
  DESTINATION_REACHED = '15',
  RECALCULATING = '16',
}

export interface ManeuverInfo {
  code: ManeuverIconCode;
  label: string;
  iconName: string; // lucide icon identifier
  description: string;
}

export const MANEUVER_LIST: ManeuverInfo[] = [
  { code: ManeuverIconCode.STRAIGHT, label: 'STRAIGHT', iconName: 'ArrowUp', description: 'Continue straight' },
  { code: ManeuverIconCode.SLIGHT_RIGHT, label: 'SLIGHT RIGHT', iconName: 'ArrowUpRight', description: 'Bear slight right' },
  { code: ManeuverIconCode.TURN_RIGHT, label: 'TURN RIGHT', iconName: 'CornerUpRight', description: 'Turn right 90°' },
  { code: ManeuverIconCode.SHARP_RIGHT, label: 'SHARP RIGHT', iconName: 'MoveDownRight', description: 'Sharp right turn' },
  { code: ManeuverIconCode.U_TURN_RIGHT, label: 'U-TURN RIGHT', iconName: 'RotateCw', description: 'U-turn rightwards' },
  { code: ManeuverIconCode.U_TURN_LEFT, label: 'U-TURN LEFT', iconName: 'RotateCcw', description: 'U-turn leftwards' },
  { code: ManeuverIconCode.SHARP_LEFT, label: 'SHARP LEFT', iconName: 'MoveDownLeft', description: 'Sharp left turn' },
  { code: ManeuverIconCode.TURN_LEFT, label: 'TURN LEFT', iconName: 'CornerUpLeft', description: 'Turn left 90°' },
  { code: ManeuverIconCode.SLIGHT_LEFT, label: 'SLIGHT LEFT', iconName: 'ArrowUpLeft', description: 'Bear slight left' },
  { code: ManeuverIconCode.ROUNDABOUT_EXIT_1, label: 'ROUNDABOUT 1', iconName: 'RefreshCw', description: 'Roundabout Exit 1' },
  { code: ManeuverIconCode.ROUNDABOUT_EXIT_2, label: 'ROUNDABOUT 2', iconName: 'RefreshCw', description: 'Roundabout Exit 2' },
  { code: ManeuverIconCode.ROUNDABOUT_EXIT_3, label: 'ROUNDABOUT 3', iconName: 'RefreshCw', description: 'Roundabout Exit 3' },
  { code: ManeuverIconCode.ROUNDABOUT_EXIT_4, label: 'ROUNDABOUT 4', iconName: 'RefreshCw', description: 'Roundabout Exit 4' },
  { code: ManeuverIconCode.ROUNDABOUT_EXIT_5, label: 'ROUNDABOUT 5', iconName: 'RefreshCw', description: 'Roundabout Exit 5' },
  { code: ManeuverIconCode.ROUNDABOUT_EXIT_6, label: 'ROUNDABOUT 6', iconName: 'RefreshCw', description: 'Roundabout Exit 6' },
  { code: ManeuverIconCode.DESTINATION_REACHED, label: 'ARRIVED', iconName: 'Flag', description: 'Destination reached' },
  { code: ManeuverIconCode.RECALCULATING, label: 'RECALCULATING', iconName: 'Compass', description: 'Re-routing navigation' },
];

export type BleConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'discovering'
  | 'connected'
  | 'error';

export interface DiscoveredClusterDevice {
  id: string; // MAC address on Android, UUID on iOS
  name: string | null;
  rssi: number | null;
  isHeroCluster: boolean;
}

export interface BlePacketLog {
  id: string;
  timestamp: string;
  direction: 'TX' | 'RX' | 'INFO' | 'ERROR';
  rawPayload: string;
  description: string;
}

export interface GattCharacteristicInfo {
  uuid: string;
  isReadable: boolean;
  isWritableWithResponse: boolean;
  isWritableWithoutResponse: boolean;
  isNotifiable: boolean;
  isIndicatable: boolean;
}

export interface GattServiceInfo {
  uuid: string;
  characteristics: GattCharacteristicInfo[];
}
