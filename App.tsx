import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BleProvider } from './src/bluetooth/BleContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { TelemetryService } from './src/telemetry/TelemetryService';
import { Colors } from './src/theme/colors';

export default function App() {
  useEffect(() => {
    // Start periodic background telemetry heartbeat to cluster
    TelemetryService.start(30000);

    return () => {
      TelemetryService.stop();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        <BleProvider>
          <RootNavigator />
        </BleProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
