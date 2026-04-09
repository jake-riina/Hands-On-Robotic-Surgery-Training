import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { smoothBlePsi } from '../lib/blePressureSmooth';
import { fsrToPsi } from '../lib/fsrToPsi';

type BleUuid = number | string;

/** Force-sensor peripheral primary service (128-bit UUID). */
const BLE_FORCE_SENSOR_SERVICE_UUID = '5202e1a0-d2ac-b548-e166-94962a931eed';

/** Standard Environmental Sensing (pressure / sensor data on many gloves). */
const BLE_ENVIRONMENTAL_SENSING_SERVICE = 0x181a;

/** Standard Environmental Sensing pressure characteristic when present on the device. */
const BLE_PRESSURE_CHARACTERISTIC_UUID = 0x2a6e;

/** Services we access after pairing; must be listed when the scan filter is by name only. */
const BLE_OPTIONAL_SERVICES: BleUuid[] = [
  BLE_FORCE_SENSOR_SERVICE_UUID,
  BLE_ENVIRONMENTAL_SENSING_SERVICE,
];

/** Device chooser: BLE peripherals whose advertised name starts with ESP32 (case variants). */
const BLE_DEVICE_NAME_FILTERS: Array<{ namePrefix: string }> = [
  { namePrefix: 'ESP32' },
  { namePrefix: 'esp32' },
  { namePrefix: 'Esp32' },
];

async function resolveForceSensorService(
  server: BluetoothRemoteGATTServer
): Promise<BluetoothRemoteGATTService> {
  for (const uuid of [BLE_FORCE_SENSOR_SERVICE_UUID, BLE_ENVIRONMENTAL_SENSING_SERVICE]) {
    try {
      return await server.getPrimaryService(uuid);
    } catch {
      /* try next */
    }
  }
  throw new Error(
    'No supported force/pressure service on this device. Use your glove peripheral or check GATT services.'
  );
}

async function pickForceSensorCharacteristic(
  service: BluetoothRemoteGATTService
): Promise<BluetoothRemoteGATTCharacteristic> {
  try {
    return await service.getCharacteristic(BLE_PRESSURE_CHARACTERISTIC_UUID);
  } catch {
    const all = await service.getCharacteristics();
    const withNotify = all.find((c) => c.properties.notify || c.properties.indicate);
    if (withNotify) return withNotify;
    const readable = all.find((c) => c.properties.read);
    if (readable) return readable;
    throw new Error('No readable or notify characteristic on force sensor service');
  }
}

// Web Bluetooth API types
declare global {
  interface Navigator {
    bluetooth?: Bluetooth;
  }
}

interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
}

interface RequestDeviceOptions {
  filters?: Array<{ services?: BleUuid[]; name?: string; namePrefix?: string }>;
  optionalServices?: BleUuid[];
  acceptAllDevices?: boolean;
}

interface BluetoothDevice extends EventTarget {
  gatt?: BluetoothRemoteGATTServer;
  name?: string;
  id?: string;
  addEventListener(type: 'gattserverdisconnected', listener: () => void): void;
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>;
  getPrimaryService(service: BleUuid): Promise<BluetoothRemoteGATTService>;
  connected: boolean;
  disconnect(): void;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: BleUuid): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  readValue(): Promise<DataView>;
  value?: DataView;
  service?: BluetoothRemoteGATTService;
  addEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void;
}

interface BLEContextType {
  device: BluetoothDevice | null;
  characteristic: BluetoothRemoteGATTCharacteristic | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  pressure: number;
  setPressure: (value: number) => void;
}

const BLEContext = createContext<BLEContextType | undefined>(undefined);

export const useBLE = () => {
  const context = useContext(BLEContext);
  if (!context) {
    throw new Error('useBLE must be used within a BLEProvider');
  }
  return context;
};

interface BLEProviderProps {
  children: ReactNode;
}

export const BLEProvider = ({ children }: BLEProviderProps) => {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [characteristic, setCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Not connected');
  const [pressure, setPressure] = useState(0);

  const pressureSmoothRef = useRef(0);
  const ingestRawPsi = useCallback((rawPsi: number) => {
    const next = smoothBlePsi(pressureSmoothRef.current, rawPsi);
    pressureSmoothRef.current = next;
    setPressure(next);
  }, []);

  const eventListenerRef = useRef<((event: Event) => void) | null>(null);

  const connect = async () => {
    if (!navigator.bluetooth) {
      setConnectionStatus('Bluetooth not supported');
      return;
    }

    // If already connected, ensure event listener and polling are active
    if (device && device.gatt?.connected && characteristic) {
      console.log('BLE already connected - ensuring listeners are active...');
      setConnectionStatus('Connected');
      setIsConnected(true);
      
      // Always re-setup event listener (safe to call multiple times, will overwrite)
      console.log('Setting up event listener for existing connection...');
      const handleValueChange = (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        if (target.value) {
          const dataView = target.value;
          let jsonString = '';
          for (let i = 0; i < dataView.byteLength; i++) {
            jsonString += String.fromCharCode(dataView.getUint8(i));
          }
          try {
            const data = JSON.parse(jsonString);
            const adcValue = data.raw || 0;
            const pressurePSI = fsrToPsi(adcValue);
            const psi = Math.max(0, pressurePSI);
            ingestRawPsi(psi);
            console.log('BLE Reading - ADC:', adcValue, 'PSI:', psi.toFixed(2));
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
          }
        }
      };
      
      // Remove old listener if exists
      if (eventListenerRef.current) {
        try {
          characteristic.removeEventListener('characteristicvaluechanged', eventListenerRef.current);
        } catch (e) {
          // Ignore if listener doesn't exist
        }
      }
      
      // Add new listener
      characteristic.addEventListener('characteristicvaluechanged', handleValueChange);
      eventListenerRef.current = handleValueChange;
      
      // Ensure notifications are started
      try {
        await characteristic.startNotifications();
        console.log('Notifications confirmed active');
      } catch (notifError) {
        console.warn('Could not start notifications (might already be active):', notifError);
      }

      console.log('✅ Existing connection verified and listeners re-established');
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('Connecting...');

    try {
      // If we have a device but it's not connected, try to reconnect
      if (device && !device.gatt?.connected) {
        console.log('Reconnecting to existing device...');
        try {
          const server = await device.gatt?.connect();
          if (server && server.connected) {
            // Re-setup the service and characteristic
            const service = await resolveForceSensorService(server);
            const newCharacteristic = await pickForceSensorCharacteristic(service);
            await newCharacteristic.startNotifications();
            setCharacteristic(newCharacteristic);
            setIsConnected(true);
            setConnectionStatus('Connected');
            setIsConnecting(false);
            
            // Re-setup event listener
            const handleValueChange = (event: Event) => {
              const target = event.target as BluetoothRemoteGATTCharacteristic;
              if (target.value) {
                const dataView = target.value;
                let jsonString = '';
                for (let i = 0; i < dataView.byteLength; i++) {
                  jsonString += String.fromCharCode(dataView.getUint8(i));
                }
                try {
                  const data = JSON.parse(jsonString);
                  const adcValue = data.raw || 0;
                  const pressurePSI = fsrToPsi(adcValue);
                  const psi = Math.max(0, pressurePSI);
                  ingestRawPsi(psi);
                  console.log('BLE Reading - ADC:', adcValue, 'PSI:', psi.toFixed(2));
                } catch (parseError) {
                  console.error('Error parsing JSON:', parseError);
                }
              }
            };
            newCharacteristic.addEventListener('characteristicvaluechanged', handleValueChange);
            eventListenerRef.current = handleValueChange;

            return; // Successfully reconnected
          }
        } catch (reconnectError: any) {
          console.warn('Reconnection failed, will request new device:', reconnectError);
          // Fall through to request new device
        }
      }

      // Disconnect existing connection if any (but not connected)
      if (device) {
        await disconnect();
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      console.log('Requesting BLE device (name starts with ESP32)...');
      const newDevice = await navigator.bluetooth.requestDevice({
        filters: BLE_DEVICE_NAME_FILTERS,
        optionalServices: BLE_OPTIONAL_SERVICES,
      });

      console.log('Device selected:', newDevice.name || 'Unknown');

      // Check if device is already connected (might happen if connected in another tab)
      let server;
      try {
        server = await newDevice.gatt?.connect();
      } catch (connectError: any) {
        if (connectError?.name === 'NetworkError') {
          // Device is connected elsewhere - but we can still try to use it if it shows as connected
          if (newDevice.gatt?.connected) {
            server = newDevice.gatt;
            console.log('Device already connected elsewhere, but using existing connection');
          } else {
            throw new Error('Device is connected to another application. Please disconnect from the Dashboard first.');
          }
        } else {
          throw connectError;
        }
      }
      
      if (!server) {
        throw new Error('Failed to connect to device.');
      }

      console.log('Connected to GATT server');
      pressureSmoothRef.current = 0;
      setPressure(0);
      setDevice(newDevice);
      setIsConnected(true);
      setConnectionStatus('Connected');

      const service = await resolveForceSensorService(server);
      console.log('Service obtained');

      const newCharacteristic = await pickForceSensorCharacteristic(service);
      console.log('Characteristic obtained');
      setCharacteristic(newCharacteristic);

      // Enable notifications
      await newCharacteristic.startNotifications();
      console.log('Notifications started');

      // Set up event listener for pressure data
      const handleValueChange = (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        if (target.value) {
          const dataView = target.value;
          
          // Convert DataView to JSON string
          let jsonString = '';
          for (let i = 0; i < dataView.byteLength; i++) {
            jsonString += String.fromCharCode(dataView.getUint8(i));
          }
          
          try {
            const data = JSON.parse(jsonString);
            const adcValue = data.raw || 0;
            const pressurePSI = fsrToPsi(adcValue);
            const psi = Math.max(0, pressurePSI);
            ingestRawPsi(psi);
            console.log('BLE Reading - ADC:', adcValue, 'PSI:', psi.toFixed(2));
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
          }
        }
      };

      newCharacteristic.addEventListener('characteristicvaluechanged', handleValueChange);
      eventListenerRef.current = handleValueChange;

      // Handle disconnection
      newDevice.addEventListener('gattserverdisconnected', () => {
        console.log('BLE device disconnected');
        setIsConnected(false);
        setConnectionStatus('Disconnected');
        pressureSmoothRef.current = 0;
        setPressure(0);
      });

    } catch (error: any) {
      console.error('BLE connection error:', error);
      setIsConnected(false);
      setIsConnecting(false);
      
      if (error?.name === 'NetworkError' || error?.message?.includes('connected to another application')) {
        setConnectionStatus('Error: Device already connected elsewhere');
      } else if (error?.name === 'NotFoundError') {
        setConnectionStatus('Error: Device not found');
      } else if (error?.name === 'SecurityError') {
        setConnectionStatus('Error: Bluetooth permission denied');
      } else {
        setConnectionStatus(`Error: ${error?.message || error?.name || 'Unknown'}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    console.log('Disconnecting BLE device...');

    if (characteristic && eventListenerRef.current) {
      try {
        await characteristic.stopNotifications();
        characteristic.removeEventListener('characteristicvaluechanged', eventListenerRef.current);
      } catch (e) {
        console.warn('Error stopping notifications:', e);
      }
      setCharacteristic(null);
    }

    if (device) {
      try {
        if (device.gatt?.connected) {
          device.gatt.disconnect();
        }
        device.removeEventListener('gattserverdisconnected', () => {});
      } catch (e) {
        console.warn('Error disconnecting:', e);
      }
      setDevice(null);
    }

    setIsConnected(false);
    setConnectionStatus('Disconnected');
    pressureSmoothRef.current = 0;
    setPressure(0);
    console.log('BLE device disconnected');
  };

  // Ensure listeners are always active when connection exists
  useEffect(() => {
    if (device && device.gatt?.connected && characteristic) {
      console.log('🔧 Ensuring BLE listeners are active...');
      
      // Set up event listener
      const handleValueChange = (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        if (target.value) {
          const dataView = target.value;
          let jsonString = '';
          for (let i = 0; i < dataView.byteLength; i++) {
            jsonString += String.fromCharCode(dataView.getUint8(i));
          }
          try {
            const data = JSON.parse(jsonString);
            const adcValue = data.raw || 0;
            const pressurePSI = fsrToPsi(adcValue);
            const psi = Math.max(0, pressurePSI);
            ingestRawPsi(psi);
            console.log('📊 BLE Reading - ADC:', adcValue, 'PSI:', psi.toFixed(2));
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
          }
        }
      };

      // Remove old listener if exists
      if (eventListenerRef.current) {
        try {
          characteristic.removeEventListener('characteristicvaluechanged', eventListenerRef.current);
        } catch (e) {
          // Ignore
        }
      }

      // Add new listener
      characteristic.addEventListener('characteristicvaluechanged', handleValueChange);
      eventListenerRef.current = handleValueChange;

      // Ensure notifications are started
      characteristic.startNotifications().catch(err => {
        console.warn('Notifications might already be active:', err);
      });

      console.log('✅ BLE listeners are now active');

      // Cleanup
      return () => {
        if (eventListenerRef.current) {
          try {
            characteristic.removeEventListener('characteristicvaluechanged', eventListenerRef.current);
          } catch (e) {
            // Ignore
          }
        }
      };
    }
  }, [device, characteristic, ingestRawPsi]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (characteristic && eventListenerRef.current) {
        characteristic.removeEventListener('characteristicvaluechanged', eventListenerRef.current);
      }
      if (device && device.gatt?.connected) {
        device.gatt.disconnect();
      }
    };
  }, []);

  return (
    <BLEContext.Provider
      value={{
        device,
        characteristic,
        isConnected,
        isConnecting,
        connectionStatus,
        connect,
        disconnect,
        pressure,
        setPressure,
      }}
    >
      {children}
    </BLEContext.Provider>
  );
};

