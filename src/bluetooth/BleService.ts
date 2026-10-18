import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { Buffer } from 'buffer';
import { HeroClusterProtocol } from '../protocol/HeroClusterProtocol';
import {
  BleConnectionState,
  DiscoveredClusterDevice,
  BlePacketLog,
  GattServiceInfo,
  ManeuverIconCode,
} from '../protocol/types';

type Listener<T> = (data: T) => void;

class BleServiceImpl {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private connectionState: BleConnectionState = 'disconnected';
  private discoveredDevices = new Map<string, DiscoveredClusterDevice>();
  private logs: BlePacketLog[] = [];
  private gattTree: GattServiceInfo[] = [];

  // Write queue to guarantee ordered, throttled transmission to cluster
  private writeQueue: { payload: string; description: string }[] = [];
  private isWriting = false;

  // Listeners
  private stateListeners = new Set<Listener<BleConnectionState>>();
  private devicesListeners = new Set<Listener<DiscoveredClusterDevice[]>>();
  private logListeners = new Set<Listener<BlePacketLog[]>>();
  private gattTreeListeners = new Set<Listener<GattServiceInfo[]>>();

  constructor() {
    this.manager = new BleManager();
  }

  // ──────────────────────────────────────────────────────────────────
  // Permission Check / Request
  // ──────────────────────────────────────────────────────────────────

  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version;
      if (apiLevel >= 31) {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          grants[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === 'granted' &&
          grants[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === 'granted'
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === 'granted';
      }
    }
    // On iOS, CoreBluetooth prompts on initial scan or connection using app.json permissions
    return true;
  }

  // ──────────────────────────────────────────────────────────────────
  // Scanning
  // ──────────────────────────────────────────────────────────────────

  public async startScan() {
    const hasPerm = await this.requestPermissions();
    if (!hasPerm) {
      this.addLog('ERROR', '', 'Bluetooth permissions not granted');
      return;
    }

    this.discoveredDevices.clear();
    this.notifyDevices();
    this.setConnectionState('scanning');
    this.addLog('INFO', '', 'Started BLE scan for Hero smart clusters...');

    this.manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        this.addLog('ERROR', '', `Scan error: ${error.message}`);
        this.setConnectionState(this.connectedDevice ? 'connected' : 'disconnected');
        return;
      }

      if (device) {
        const name = device.name || device.localName;
        const isHero = this.isHeroClusterDevice(name, device.id);

        this.discoveredDevices.set(device.id, {
          id: device.id,
          name: name || 'Unknown Device',
          rssi: device.rssi,
          isHeroCluster: isHero,
        });
        this.notifyDevices();
      }
    });

    // Auto-stop scan after 15 seconds to conserve device battery
    setTimeout(() => {
      if (this.connectionState === 'scanning') {
        this.stopScan();
      }
    }, 15000);
  }

  public stopScan() {
    this.manager.stopDeviceScan();
    this.addLog('INFO', '', 'BLE scan stopped');
    this.setConnectionState(this.connectedDevice ? 'connected' : 'disconnected');
  }

  private isHeroClusterDevice(name: string | null, id: string): boolean {
    if (!name) return false;
    const n = name.toUpperCase();
    return (
      n.startsWith('HERO') ||
      n.startsWith('HMCL') ||
      n.startsWith('XOOM') ||
      n.startsWith('MAESTRO') ||
      n.startsWith('PLEASURE') ||
      n.startsWith('DESTINI') ||
      n.includes('CLUSTER') ||
      n.includes('TIO')
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // Connection & Discovery
  // ──────────────────────────────────────────────────────────────────

  public async connectToDevice(deviceId: string) {
    try {
      this.stopScan();
      this.setConnectionState('connecting');
      this.addLog('INFO', '', `Connecting to ${deviceId}...`);

      const device = await this.manager.connectToDevice(deviceId, {
        autoConnect: false,
        timeout: 10000,
      });

      this.connectedDevice = device;
      this.setConnectionState('discovering');
      this.addLog('INFO', '', 'Discovering services and characteristics...');

      await device.discoverAllServicesAndCharacteristics();
      this.setConnectionState('connected');
      this.addLog('INFO', '', `Connected to ${device.name || device.id}`);

      // Inspect GATT tree
      await this.inspectGattTree(device);

      // Subscribe to TX characteristic notifications if present
      this.setupNotifications(device);

      // Listen for unexpected disconnect
      device.onDisconnected((error, disconnectedDevice) => {
        this.connectedDevice = null;
        this.setConnectionState('disconnected');
        this.addLog(
          'ERROR',
          '',
          `Device disconnected: ${error?.message || disconnectedDevice.id}`
        );
      });
    } catch (err: any) {
      this.connectedDevice = null;
      this.setConnectionState('error');
      this.addLog('ERROR', '', `Connection failed: ${err.message || err}`);
    }
  }

  public async disconnect() {
    if (this.connectedDevice) {
      try {
        await this.connectedDevice.cancelConnection();
      } catch (err) {
        // ignore
      }
      this.connectedDevice = null;
    }
    this.setConnectionState('disconnected');
    this.addLog('INFO', '', 'Disconnected from scooter');
  }

  // ──────────────────────────────────────────────────────────────────
  // GATT Inspection & Notifications
  // ──────────────────────────────────────────────────────────────────

  private async inspectGattTree(device: Device) {
    try {
      const services = await device.services();
      const tree: GattServiceInfo[] = [];

      for (const svc of services) {
        const characteristics = await svc.characteristics();
        tree.push({
          uuid: svc.uuid,
          characteristics: characteristics.map((char) => ({
            uuid: char.uuid,
            isReadable: char.isReadable,
            isWritableWithResponse: char.isWritableWithResponse,
            isWritableWithoutResponse: char.isWritableWithoutResponse,
            isNotifiable: char.isNotifiable,
            isIndicatable: char.isIndicatable,
          })),
        });
      }
      this.gattTree = tree;
      this.notifyGattTree();
    } catch (err: any) {
      this.addLog('ERROR', '', `GATT inspection failed: ${err.message}`);
    }
  }

  private setupNotifications(device: Device) {
    try {
      device.monitorCharacteristicForService(
        HeroClusterProtocol.TELIT_SERVICE_UUID,
        HeroClusterProtocol.TELIT_TX_CHAR_UUID,
        (error, characteristic) => {
          if (error) {
            return;
          }
          if (characteristic?.value) {
            const raw = Buffer.from(characteristic.value, 'base64').toString('utf-8');
            this.addLog('RX', raw, 'Cluster Telemetry');
          }
        }
      );
    } catch (e) {
      // Service may differ on older firmware revisions
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Queued Transmission Engine
  // ──────────────────────────────────────────────────────────────────

  public sendNavigation(icon: ManeuverIconCode, distanceMeters: number, streetName: string) {
    const packet = HeroClusterProtocol.buildNavigationPacket(icon, distanceMeters, streetName);
    this.enqueueWrite(packet, `Nav: ${icon} | ${distanceMeters}m | ${streetName}`);
  }

  public clearNavigation() {
    const packet = HeroClusterProtocol.buildClearNavigationPacket();
    this.enqueueWrite(packet, 'Clear Navigation');
  }

  public sendIncomingCall(callerNameOrNumber: string) {
    const packet = HeroClusterProtocol.buildIncomingCallPacket(callerNameOrNumber);
    this.enqueueWrite(packet, `Incoming Call: ${callerNameOrNumber}`);
  }

  public sendActiveCall(callerNameOrNumber: string, seconds: number) {
    const packet = HeroClusterProtocol.buildActiveCallPacket(callerNameOrNumber, seconds);
    this.enqueueWrite(packet, `Active Call: ${callerNameOrNumber} (${seconds}s)`);
  }

  public sendMissedCall(count = 1) {
    const packet = HeroClusterProtocol.buildMissedCallPacket(count);
    this.enqueueWrite(packet, `Missed Calls: ${count}`);
  }

  public sendCallEnded() {
    const packet = HeroClusterProtocol.buildCallEndedPacket();
    this.enqueueWrite(packet, 'Call Ended / Clear Call');
  }

  public sendSmsAlert(senderNameOrNumber: string) {
    const packet = HeroClusterProtocol.buildSmsAlertPacket(senderNameOrNumber);
    this.enqueueWrite(packet, `SMS Alert: ${senderNameOrNumber}`);
  }

  public sendBatteryAndSignal(battery: number, bars: number, netType = '4G') {
    const packet = HeroClusterProtocol.buildBatteryAndSignalPacket(battery, bars, netType);
    this.enqueueWrite(packet, `Battery ${battery}% | Signal ${bars}/4`);
  }

  public sendLowBatteryWarning() {
    const packet = HeroClusterProtocol.buildLowBatteryWarningPacket();
    this.enqueueWrite(packet, 'Low Battery Warning');
  }

  public sendRawData(payload: string) {
    this.enqueueWrite(payload, 'Raw Payload');
  }

  private enqueueWrite(payload: string, description: string) {
    this.writeQueue.push({ payload, description });
    this.processWriteQueue();
  }

  private async processWriteQueue() {
    if (this.isWriting || this.writeQueue.length === 0) return;
    this.isWriting = true;

    const item = this.writeQueue.shift();
    if (item) {
      await this.performWrite(item.payload, item.description);
      // Wait 120ms between packets to prevent cluster MCU buffer overruns
      setTimeout(() => {
        this.isWriting = false;
        this.processWriteQueue();
      }, 120);
    } else {
      this.isWriting = false;
    }
  }

  private async performWrite(payload: string, description: string) {
    if (!this.connectedDevice) {
      this.addLog('TX', payload, `[Simulation / Offline] ${description}`);
      return;
    }

    try {
      const base64Payload = Buffer.from(payload, 'utf-8').toString('base64');
      await this.connectedDevice.writeCharacteristicWithoutResponseForService(
        HeroClusterProtocol.TELIT_SERVICE_UUID,
        HeroClusterProtocol.TELIT_RX_CHAR_UUID,
        base64Payload
      );
      this.addLog('TX', payload, description);
    } catch (err: any) {
      // Fall back to write with response if without-response fails
      try {
        const base64Payload = Buffer.from(payload, 'utf-8').toString('base64');
        await this.connectedDevice.writeCharacteristicWithResponseForService(
          HeroClusterProtocol.TELIT_SERVICE_UUID,
          HeroClusterProtocol.TELIT_RX_CHAR_UUID,
          base64Payload
        );
        this.addLog('TX', payload, description);
      } catch (fallbackErr: any) {
        this.addLog('ERROR', payload, `Write failed: ${fallbackErr.message || fallbackErr}`);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // State & Subscriber Management
  // ──────────────────────────────────────────────────────────────────

  private setConnectionState(state: BleConnectionState) {
    this.connectionState = state;
    this.stateListeners.forEach((listener) => listener(state));
  }

  private notifyDevices() {
    const list = Array.from(this.discoveredDevices.values()).sort((a, b) => {
      // Prioritize recognized Hero clusters at top
      if (a.isHeroCluster && !b.isHeroCluster) return -1;
      if (!a.isHeroCluster && b.isHeroCluster) return 1;
      return (b.rssi || -999) - (a.rssi || -999);
    });
    this.devicesListeners.forEach((listener) => listener(list));
  }

  private notifyGattTree() {
    this.gattTreeListeners.forEach((listener) => listener(this.gattTree));
  }

  private addLog(
    direction: 'TX' | 'RX' | 'INFO' | 'ERROR',
    rawPayload: string,
    description: string
  ) {
    const log: BlePacketLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      direction,
      rawPayload,
      description,
    };
    this.logs = [log, ...this.logs.slice(0, 49)];
    this.logListeners.forEach((listener) => listener(this.logs));
  }

  // Subscription hooks for React Context
  public subscribeState(listener: Listener<BleConnectionState>): () => void {
    this.stateListeners.add(listener);
    listener(this.connectionState);
    return () => this.stateListeners.delete(listener);
  }

  public subscribeDevices(listener: Listener<DiscoveredClusterDevice[]>): () => void {
    this.devicesListeners.add(listener);
    this.notifyDevices();
    return () => this.devicesListeners.delete(listener);
  }

  public subscribeLogs(listener: Listener<BlePacketLog[]>): () => void {
    this.logListeners.add(listener);
    listener(this.logs);
    return () => this.logListeners.delete(listener);
  }

  public subscribeGattTree(listener: Listener<GattServiceInfo[]>): () => void {
    this.gattTreeListeners.add(listener);
    listener(this.gattTree);
    return () => this.gattTreeListeners.delete(listener);
  }

  public getConnectionState(): BleConnectionState {
    return this.connectionState;
  }

  public getConnectedDevice(): Device | null {
    return this.connectedDevice;
  }

  public getDiscoveredDevices(): DiscoveredClusterDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  public getLogs(): BlePacketLog[] {
    return this.logs;
  }

  public getGattTree(): GattServiceInfo[] {
    return this.gattTree;
  }
}

export const BleService = new BleServiceImpl();
