import React, { createContext, useContext, useEffect, useState } from 'react';
import { BleService } from './BleService';
import {
  BleConnectionState,
  DiscoveredClusterDevice,
  BlePacketLog,
  GattServiceInfo,
  ManeuverIconCode,
} from '../protocol/types';

interface BleContextValue {
  connectionState: BleConnectionState;
  connectedDeviceName: string | null;
  discoveredDevices: DiscoveredClusterDevice[];
  logs: BlePacketLog[];
  gattTree: GattServiceInfo[];
  startScan: () => void;
  stopScan: () => void;
  connectToDevice: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  sendNavigation: (
    icon: ManeuverIconCode,
    distanceMeters: number,
    streetName: string,
    eta?: { hours?: number; minutes?: number; isPm?: boolean },
    remainingMinutes?: number
  ) => void;
  clearNavigation: () => void;
  sendIncomingCall: (callerNameOrNumber: string) => void;
  sendActiveCall: (callerNameOrNumber: string, seconds: number) => void;
  sendMissedCall: (count?: number) => void;
  sendCallEnded: () => void;
  sendSmsAlert: (sender: string) => void;
  sendBatteryAndSignal: (battery: number, bars: number, netType?: string) => void;
  sendLowBatteryWarning: () => void;
  sendRawData: (payload: string) => void;
}

const BleContext = createContext<BleContextValue | null>(null);

export const BleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectionState, setConnectionState] = useState<BleConnectionState>(
    BleService.getConnectionState()
  );
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredClusterDevice[]>(
    BleService.getDiscoveredDevices()
  );
  const [logs, setLogs] = useState<BlePacketLog[]>(BleService.getLogs());
  const [gattTree, setGattTree] = useState<GattServiceInfo[]>(BleService.getGattTree());

  useEffect(() => {
    const unsubState = BleService.subscribeState(setConnectionState);
    const unsubDevices = BleService.subscribeDevices(setDiscoveredDevices);
    const unsubLogs = BleService.subscribeLogs(setLogs);
    const unsubGatt = BleService.subscribeGattTree(setGattTree);

    return () => {
      unsubState();
      unsubDevices();
      unsubLogs();
      unsubGatt();
    };
  }, []);

  const connectedDevice = BleService.getConnectedDevice();
  const connectedDeviceName = connectedDevice?.name || connectedDevice?.id || null;

  const value: BleContextValue = {
    connectionState,
    connectedDeviceName,
    discoveredDevices,
    logs,
    gattTree,
    startScan: () => BleService.startScan(),
    stopScan: () => BleService.stopScan(),
    connectToDevice: (id) => BleService.connectToDevice(id),
    disconnect: () => BleService.disconnect(),
    sendNavigation: (icon, dist, street, eta, rem) =>
      BleService.sendNavigation(icon, dist, street, eta, rem),
    clearNavigation: () => BleService.clearNavigation(),
    sendIncomingCall: (caller) => BleService.sendIncomingCall(caller),
    sendActiveCall: (caller, sec) => BleService.sendActiveCall(caller, sec),
    sendMissedCall: (count) => BleService.sendMissedCall(count),
    sendCallEnded: () => BleService.sendCallEnded(),
    sendSmsAlert: (sender) => BleService.sendSmsAlert(sender),
    sendBatteryAndSignal: (batt, bars, net) => BleService.sendBatteryAndSignal(batt, bars, net),
    sendLowBatteryWarning: () => BleService.sendLowBatteryWarning(),
    sendRawData: (payload) => BleService.sendRawData(payload),
  };

  return <BleContext.Provider value={value}>{children}</BleContext.Provider>;
};

export const useBle = (): BleContextValue => {
  const context = useContext(BleContext);
  if (!context) {
    throw new Error('useBle must be used within a BleProvider');
  }
  return context;
};
