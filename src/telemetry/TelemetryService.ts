import * as Battery from 'expo-battery';
import { BleService } from '../bluetooth/BleService';

class TelemetryServiceImpl {
  private timer: any = null;
  private isRunning = false;

  public start(intervalMs = 30000) {
    if (this.isRunning) return;
    this.isRunning = true;

    // Send immediately
    this.syncTelemetry();

    // Setup periodic heartbeat
    this.timer = setInterval(() => {
      this.syncTelemetry();
    }, intervalMs);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  public async syncTelemetry() {
    if (BleService.getConnectionState() !== 'connected') return;

    try {
      const batteryLevel = await Battery.getBatteryLevelAsync();
      const batteryPercent = batteryLevel >= 0 ? Math.round(batteryLevel * 100) : 85;

      // Estimate cellular signal bars (3 bars nominal on device)
      const signalBars = 3;

      BleService.sendBatteryAndSignal(batteryPercent, signalBars, '4G');

      if (batteryPercent <= 15) {
        BleService.sendLowBatteryWarning();
      }
    } catch (e) {
      // Battery API fallback
      BleService.sendBatteryAndSignal(85, 3, '4G');
    }
  }
}

export const TelemetryService = new TelemetryServiceImpl();
