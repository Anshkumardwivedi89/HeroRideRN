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

  // Active GATT configuration (resolved dynamically during discovery)
  private activeServiceUuid = HeroClusterProtocol.HERO_PRIMARY_SERVICE_UUID;
  private activeWriteCharUuid = HeroClusterProtocol.HERO_WRITE_CHAR_UUID;
  private activeNotifyCharUuid = HeroClusterProtocol.HERO_NOTIFY_CHAR_UUID;
  private activeCreditsRxCharUuid = HeroClusterProtocol.HERO_CREDITS_RX_CHAR_UUID;
  private activeCreditsTxCharUuid = HeroClusterProtocol.HERO_CREDITS_TX_CHAR_UUID;
  private isHandshakeComplete = false;

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

    this.manager.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
      if (error) {
        this.addLog('ERROR', '', `Scan error: ${error.message}`);
        this.setConnectionState(this.connectedDevice ? 'connected' : 'disconnected');
        return;
      }

      if (device) {
        const name = device.name || device.localName;
        const isHero = this.isHeroClusterDevice(name, device.id, device.serviceUUIDs);

        const existing = this.discoveredDevices.get(device.id);
        const resolvedName =
          name ||
          (isHero ? 'Hero Smart Cluster' : undefined) ||
          (existing && existing.name !== 'Unknown Device' ? existing.name : undefined) ||
          'Unknown Device';

        this.discoveredDevices.set(device.id, {
          id: device.id,
          name: resolvedName,
          rssi: device.rssi,
          isHeroCluster: isHero || (existing?.isHeroCluster ?? false),
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

  private isHeroClusterDevice(
    name: string | null,
    id: string,
    serviceUUIDs?: string[] | null
  ): boolean {
    // 1. Check if the device advertises Hero 128-bit or Telit TIO Service UUIDs
    if (serviceUUIDs && serviceUUIDs.length > 0) {
      const hasHeroOrTelit = serviceUUIDs.some((uuid) => {
        const u = uuid.toUpperCase();
        return (
          u.includes('E837') ||
          u === HeroClusterProtocol.HERO_PRIMARY_SERVICE_UUID.toUpperCase() ||
          u.includes('FEFB') ||
          u === HeroClusterProtocol.TELIT_SERVICE_UUID.toUpperCase()
        );
      });
      if (hasHeroOrTelit) return true;
    }

    // 2. Check device broadcast name
    if (!name) return false;
    const n = name.toUpperCase();
    return (
      n.includes('JFW') ||
      n.includes('JFW51') ||
      n.includes('HERO') ||
      n.includes('HMCL') ||
      n.includes('XOOM') ||
      n.includes('MAESTRO') ||
      n.includes('PLEASURE') ||
      n.includes('DESTINI') ||
      n.includes('CLUSTER') ||
      n.includes('TIO') ||
      n.includes('RIDE')
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
      this.addLog('INFO', '', `Discovered services for ${device.name || device.id}`);

      // Inspect GATT tree and dynamically resolve active service / characteristic UUIDs
      await this.inspectGattTree(device);

      // Perform Telit TIO / Hero Flow-Control Handshake
      this.addLog('INFO', '', 'Starting cluster flow-control handshake...');
      await this.performClusterHandshake(device);

      this.setConnectionState('connected');
      this.addLog('INFO', '', `Connected & Ready to transmit: ${device.name || device.id}`);

      // Listen for unexpected disconnect
      device.onDisconnected((error, disconnectedDevice) => {
        this.connectedDevice = null;
        this.isHandshakeComplete = false;
        this.setConnectionState('disconnected');
        this.addLog(
          'ERROR',
          '',
          `Device disconnected: ${error?.message || disconnectedDevice.id}`
        );
      });
    } catch (err: any) {
      this.connectedDevice = null;
      this.isHandshakeComplete = false;
      this.setConnectionState('error');
      this.addLog('ERROR', '', `Connection failed: ${err.message || err}`);
    }
  }

  public async disconnect() {
    this.isHandshakeComplete = false;
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
  // GATT Inspection & Handshake
  // ──────────────────────────────────────────────────────────────────

  private async inspectGattTree(device: Device) {
    try {
      const services = await device.services();
      const tree: GattServiceInfo[] = [];

      let foundHeroService = false;
      let foundTelitService = false;

      for (const svc of services) {
        const sUuid = svc.uuid.toUpperCase();
        if (
          sUuid === HeroClusterProtocol.HERO_PRIMARY_SERVICE_UUID.toUpperCase() ||
          sUuid.includes('E837D9A2')
        ) {
          foundHeroService = true;
        } else if (
          sUuid === HeroClusterProtocol.TELIT_SERVICE_UUID.toUpperCase() ||
          sUuid.includes('FEFB')
        ) {
          foundTelitService = true;
        }

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

      if (foundHeroService) {
        this.activeServiceUuid = HeroClusterProtocol.HERO_PRIMARY_SERVICE_UUID;
        this.activeWriteCharUuid = HeroClusterProtocol.HERO_WRITE_CHAR_UUID;
        this.activeNotifyCharUuid = HeroClusterProtocol.HERO_NOTIFY_CHAR_UUID;
        this.activeCreditsRxCharUuid = HeroClusterProtocol.HERO_CREDITS_RX_CHAR_UUID;
        this.activeCreditsTxCharUuid = HeroClusterProtocol.HERO_CREDITS_TX_CHAR_UUID;
        this.addLog('INFO', '', 'GATT Mode: Hero MotoCorp 128-bit TIO Profile active');
      } else if (foundTelitService) {
        this.activeServiceUuid = HeroClusterProtocol.TELIT_SERVICE_UUID;
        this.activeWriteCharUuid = HeroClusterProtocol.TELIT_RX_CHAR_UUID;
        this.activeNotifyCharUuid = HeroClusterProtocol.TELIT_TX_CHAR_UUID;
        this.activeCreditsRxCharUuid = HeroClusterProtocol.TELIT_CREDITS_RX_CHAR_UUID;
        this.activeCreditsTxCharUuid = HeroClusterProtocol.TELIT_CREDITS_TX_CHAR_UUID;
        this.addLog('INFO', '', 'GATT Mode: Legacy Telit 16-bit TIO Profile active');
      } else {
        this.activeServiceUuid = HeroClusterProtocol.HERO_PRIMARY_SERVICE_UUID;
        this.activeWriteCharUuid = HeroClusterProtocol.HERO_WRITE_CHAR_UUID;
        this.activeNotifyCharUuid = HeroClusterProtocol.HERO_NOTIFY_CHAR_UUID;
        this.activeCreditsRxCharUuid = HeroClusterProtocol.HERO_CREDITS_RX_CHAR_UUID;
        this.activeCreditsTxCharUuid = HeroClusterProtocol.HERO_CREDITS_TX_CHAR_UUID;
        this.addLog('INFO', '', 'GATT Mode: Defaulting to Hero 128-bit Profile');
      }

      this.gattTree = tree;
      this.notifyGattTree();
    } catch (err: any) {
      this.addLog('ERROR', '', `GATT inspection failed: ${err.message}`);
    }
  }

  private async performClusterHandshake(device: Device) {
    try {
      this.isHandshakeComplete = false;

      // Step 1: Monitor Credits TX for Indications (36E8614B-2DED-45C1-9AD3-C9F59A01F21E)
      try {
        device.monitorCharacteristicForService(
          this.activeServiceUuid,
          this.activeCreditsTxCharUuid,
          (error, characteristic) => {
            if (error) return;
            if (characteristic?.value) {
              const buf = Buffer.from(characteristic.value, 'base64');
              const credits = buf.length > 0 ? buf[0] : 0;
              this.addLog('RX', `Credits TX: ${credits}`, 'Flow Control Credit Indication');
            }
          }
        );
        this.addLog('INFO', '', 'Handshake (1/3): Subscribed to Credits TX indications');
      } catch (err: any) {
        this.addLog('WARN', '', `Handshake step 1 note: ${err.message || err}`);
      }

      // Small delay between subscriptions to allow CoreBluetooth / GATT stack to process descriptor write
      await new Promise((r) => setTimeout(r, 150));

      // Step 2: Monitor Data TX for Notifications (B792A4BB-DB87-436A-9066-DB63C5FB3F00)
      try {
        device.monitorCharacteristicForService(
          this.activeServiceUuid,
          this.activeNotifyCharUuid,
          (error, characteristic) => {
            if (error) return;
            if (characteristic?.value) {
              const raw = Buffer.from(characteristic.value, 'base64').toString('utf-8');
              this.addLog('RX', raw, 'Cluster Telemetry / Button Event');
            }
          }
        );
        this.addLog('INFO', '', 'Handshake (2/3): Subscribed to Data TX notifications');
      } catch (err: any) {
        this.addLog('WARN', '', `Handshake step 2 note: ${err.message || err}`);
      }

      await new Promise((r) => setTimeout(r, 150));

      // Step 3: Send Initial Credits (10 / 0x0A as UINT8) to Credits RX (F535DD6E-7975-4ABD-9719-491E38A81179)
      const creditBytes = Buffer.from([HeroClusterProtocol.INITIAL_FLOW_CREDITS]);
      const base64Credits = creditBytes.toString('base64');

      let creditWritten = false;
      try {
        await device.writeCharacteristicWithResponseForService(
          this.activeServiceUuid,
          this.activeCreditsRxCharUuid,
          base64Credits
        );
        creditWritten = true;
      } catch (e) {
        // Fall back without response if with-response is rejected
        try {
          await device.writeCharacteristicWithoutResponseForService(
            this.activeServiceUuid,
            this.activeCreditsRxCharUuid,
            base64Credits
          );
          creditWritten = true;
        } catch (e2: any) {
          this.addLog('WARN', '', `Credit write attempt: ${e2.message || e2}`);
        }
      }

      if (creditWritten) {
        this.addLog('TX', '0x0A (10 credits)', 'Handshake (3/3): Initial UART write credits granted');
      }

      this.isHandshakeComplete = true;
      this.addLog('INFO', '', 'Cluster Handshake COMPLETE! Buffer unlocked for transmission.');
    } catch (err: any) {
      this.addLog('ERROR', '', `Handshake error: ${err.message || err}`);
      this.isHandshakeComplete = true; // allow transmissions to attempt anyway
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Queued Transmission Engine
  // ──────────────────────────────────────────────────────────────────

  public sendNavigation(
    icon: ManeuverIconCode,
    distanceMeters: number,
    streetName: string,
    eta?: { hours?: number; minutes?: number; isPm?: boolean },
    remainingMinutes?: number
  ) {
    const packet = HeroClusterProtocol.buildNavigationPacket(
      icon,
      distanceMeters,
      streetName,
      eta,
      remainingMinutes
    );
    this.enqueueWrite(packet, `Nav: ${icon} | ${distanceMeters}m | ${streetName}`);
  }

  public clearNavigation() {
    const packet = HeroClusterProtocol.buildClearNavigationPacket();
    this.enqueueWrite(packet, 'Clear Navigation (Trip Completed)');
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
    const framed = HeroClusterProtocol.frameClusterPacket(payload);
    this.enqueueWrite(framed, 'Raw Payload');
  }

  private enqueueWrite(payload: string, description: string) {
    const framed = HeroClusterProtocol.frameClusterPacket(payload);
    this.writeQueue.push({ payload: framed, description });
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
      // Official Hero app encodes bytes with Charset.forName("CP-1252") (Windows-1252 / latin1)
      const base64Payload = Buffer.from(payload, 'latin1').toString('base64');
      await this.connectedDevice.writeCharacteristicWithoutResponseForService(
        this.activeServiceUuid,
        this.activeWriteCharUuid,
        base64Payload
      );
      this.addLog('TX', payload, description);
    } catch (err: any) {
      // Fall back to write with response if without-response fails
      try {
        const base64Payload = Buffer.from(payload, 'latin1').toString('base64');
        await this.connectedDevice.writeCharacteristicWithResponseForService(
          this.activeServiceUuid,
          this.activeWriteCharUuid,
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
    direction: BlePacketLog['direction'],
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
