import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { smoothBlePsi } from '../lib/blePressureSmooth';
import { fsrToPsi } from '../lib/fsrToPsi';

type BleUuid = number | string;
type ControlMode = 'styluses' | 'gloves';
type GloveSide = 'left' | 'right';

/** Force-sensor peripheral primary service (128-bit UUID). */
const BLE_FORCE_SENSOR_SERVICE_UUID = '5202e1a0-d2ac-b548-e166-94962a931eed';
/** Standard Environmental Sensing (pressure / sensor data on many gloves). */
const BLE_ENVIRONMENTAL_SENSING_SERVICE = 0x181a;
/** Standard Environmental Sensing pressure characteristic when present on the device. */
const BLE_PRESSURE_CHARACTERISTIC_UUID = 0x2a6e;
const CONTROL_MODE_STORAGE_KEY = 'control_mode';

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
      // try next
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
  removeEventListener(type: 'gattserverdisconnected', listener: () => void): void;
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
  properties: {
    notify: boolean;
    indicate: boolean;
    read: boolean;
  };
  addEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void;
  removeEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void;
}

type BleChannelState = {
  device: BluetoothDevice | null;
  characteristic: BluetoothRemoteGATTCharacteristic | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: string;
  pressure: number;
};

interface BLEContextType {
  leftGlove: BleChannelState;
  rightGlove: BleChannelState;
  connectLeftGlove: () => Promise<void>;
  disconnectLeftGlove: () => Promise<void>;
  connectRightGlove: () => Promise<void>;
  disconnectRightGlove: () => Promise<void>;
  controlMode: ControlMode;
  setControlMode: (mode: ControlMode) => void;
  // Backward-compatible aliases (legacy single-glove callers).
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
  if (!context) throw new Error('useBLE must be used within a BLEProvider');
  return context;
};

interface BLEProviderProps {
  children: ReactNode;
}

const createDefaultChannel = (): BleChannelState => ({
  device: null,
  characteristic: null,
  isConnected: false,
  isConnecting: false,
  connectionStatus: 'Not connected',
  pressure: 0,
});

export const BLEProvider = ({ children }: BLEProviderProps) => {
  const [leftGlove, setLeftGlove] = useState<BleChannelState>(createDefaultChannel);
  const [rightGlove, setRightGlove] = useState<BleChannelState>(createDefaultChannel);
  const [controlMode, setControlModeState] = useState<ControlMode>(() => {
    try {
      const saved = window.localStorage.getItem(CONTROL_MODE_STORAGE_KEY);
      return saved === 'gloves' ? 'gloves' : 'styluses';
    } catch {
      return 'styluses';
    }
  });

  const stateRef = useRef<Record<GloveSide, BleChannelState>>({
    left: createDefaultChannel(),
    right: createDefaultChannel(),
  });
  const pressureSmoothRef = useRef<Record<GloveSide, number>>({ left: 0, right: 0 });
  const valueListenerRef = useRef<Record<GloveSide, ((event: Event) => void) | null>>({
    left: null,
    right: null,
  });
  const disconnectListenerRef = useRef<Record<GloveSide, (() => void) | null>>({
    left: null,
    right: null,
  });

  const setSideState = useCallback((side: GloveSide, updater: (prev: BleChannelState) => BleChannelState) => {
    const apply = (prev: BleChannelState) => {
      const next = updater(prev);
      stateRef.current[side] = next;
      return next;
    };
    if (side === 'left') {
      setLeftGlove(apply);
    } else {
      setRightGlove(apply);
    }
  }, []);

  const setControlMode = useCallback((mode: ControlMode) => {
    setControlModeState(mode);
    try {
      window.localStorage.setItem(CONTROL_MODE_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, []);

  const ingestRawPsi = useCallback((side: GloveSide, rawPsi: number) => {
    const next = smoothBlePsi(pressureSmoothRef.current[side], rawPsi);
    pressureSmoothRef.current[side] = next;
    setSideState(side, (prev) => ({ ...prev, pressure: next }));
  }, [setSideState]);

  const attachCharacteristicListener = useCallback((
    side: GloveSide,
    characteristic: BluetoothRemoteGATTCharacteristic
  ) => {
    if (valueListenerRef.current[side]) {
      try {
        characteristic.removeEventListener('characteristicvaluechanged', valueListenerRef.current[side]!);
      } catch {
        // ignore
      }
    }
    const handleValueChange = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      if (!target.value) return;
      const dataView = target.value;
      let jsonString = '';
      for (let i = 0; i < dataView.byteLength; i++) {
        jsonString += String.fromCharCode(dataView.getUint8(i));
      }
      try {
        const data = JSON.parse(jsonString);
        const adcValue = data.raw || 0;
        const pressurePSI = fsrToPsi(adcValue);
        ingestRawPsi(side, Math.max(0, pressurePSI));
      } catch (parseError) {
        console.error('Error parsing BLE JSON payload:', parseError);
      }
    };
    characteristic.addEventListener('characteristicvaluechanged', handleValueChange);
    valueListenerRef.current[side] = handleValueChange;
  }, [ingestRawPsi]);

  const connectSide = useCallback(async (side: GloveSide) => {
    if (!navigator.bluetooth) {
      setSideState(side, (prev) => ({ ...prev, connectionStatus: 'Bluetooth not supported' }));
      return;
    }

    const current = stateRef.current[side];
    if (current.device && current.device.gatt?.connected && current.characteristic) {
      setSideState(side, (prev) => ({ ...prev, isConnected: true, connectionStatus: 'Connected' }));
      attachCharacteristicListener(side, current.characteristic);
      try {
        await current.characteristic.startNotifications();
      } catch {
        // likely already started
      }
      return;
    }

    setSideState(side, (prev) => ({ ...prev, isConnecting: true, connectionStatus: 'Connecting...' }));
    try {
      const selectedDevice = await navigator.bluetooth.requestDevice({
        filters: BLE_DEVICE_NAME_FILTERS,
        optionalServices: BLE_OPTIONAL_SERVICES,
      });

      const server = await selectedDevice.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to device.');
      }

      const service = await resolveForceSensorService(server);
      const characteristic = await pickForceSensorCharacteristic(service);
      await characteristic.startNotifications();
      attachCharacteristicListener(side, characteristic);

      if (disconnectListenerRef.current[side]) {
        try {
          selectedDevice.removeEventListener('gattserverdisconnected', disconnectListenerRef.current[side]!);
        } catch {
          // ignore
        }
      }
      const onDisconnected = () => {
        pressureSmoothRef.current[side] = 0;
        setSideState(side, (prev) => ({
          ...prev,
          isConnected: false,
          connectionStatus: 'Disconnected',
          pressure: 0,
        }));
      };
      selectedDevice.addEventListener('gattserverdisconnected', onDisconnected);
      disconnectListenerRef.current[side] = onDisconnected;

      pressureSmoothRef.current[side] = 0;
      setSideState(side, (prev) => ({
        ...prev,
        device: selectedDevice,
        characteristic,
        isConnected: true,
        isConnecting: false,
        connectionStatus: 'Connected',
        pressure: 0,
      }));
    } catch (error: any) {
      const message =
        error?.name === 'NotFoundError'
          ? 'Error: Device not found'
          : error?.name === 'SecurityError'
            ? 'Error: Bluetooth permission denied'
            : `Error: ${error?.message || error?.name || 'Unknown'}`;
      setSideState(side, (prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        connectionStatus: message,
      }));
    } finally {
      setSideState(side, (prev) => ({ ...prev, isConnecting: false }));
    }
  }, [attachCharacteristicListener, setSideState]);

  const disconnectSide = useCallback(async (side: GloveSide) => {
    const current = stateRef.current[side];
    const { characteristic, device } = current;
    if (characteristic && valueListenerRef.current[side]) {
      try {
        await characteristic.stopNotifications();
      } catch {
        // ignore
      }
      try {
        characteristic.removeEventListener('characteristicvaluechanged', valueListenerRef.current[side]!);
      } catch {
        // ignore
      }
    }
    if (device && disconnectListenerRef.current[side]) {
      try {
        device.removeEventListener('gattserverdisconnected', disconnectListenerRef.current[side]!);
      } catch {
        // ignore
      }
    }
    if (device?.gatt?.connected) {
      try {
        device.gatt.disconnect();
      } catch {
        // ignore
      }
    }

    valueListenerRef.current[side] = null;
    disconnectListenerRef.current[side] = null;
    pressureSmoothRef.current[side] = 0;
    setSideState(side, () => ({
      ...createDefaultChannel(),
      connectionStatus: 'Disconnected',
    }));
  }, [setSideState]);

  useEffect(() => {
    return () => {
      void disconnectSide('left');
      void disconnectSide('right');
    };
  }, [disconnectSide]);

  const connectLeftGlove = useCallback(async () => connectSide('left'), [connectSide]);
  const connectRightGlove = useCallback(async () => connectSide('right'), [connectSide]);
  const disconnectLeftGlove = useCallback(async () => disconnectSide('left'), [disconnectSide]);
  const disconnectRightGlove = useCallback(async () => disconnectSide('right'), [disconnectSide]);

  const legacyDevice = leftGlove.device ?? rightGlove.device;
  const legacyCharacteristic = leftGlove.characteristic ?? rightGlove.characteristic;
  const legacyConnected = leftGlove.isConnected || rightGlove.isConnected;
  const legacyConnecting = leftGlove.isConnecting || rightGlove.isConnecting;
  const legacyStatus =
    leftGlove.connectionStatus !== 'Not connected'
      ? leftGlove.connectionStatus
      : rightGlove.connectionStatus;
  const legacyPressure = leftGlove.pressure;
  const setLegacyPressure = useCallback((value: number) => {
    pressureSmoothRef.current.left = value;
    setSideState('left', (prev) => ({ ...prev, pressure: value }));
  }, [setSideState]);

  return (
    <BLEContext.Provider
      value={{
        leftGlove,
        rightGlove,
        connectLeftGlove,
        disconnectLeftGlove,
        connectRightGlove,
        disconnectRightGlove,
        controlMode,
        setControlMode,
        device: legacyDevice,
        characteristic: legacyCharacteristic,
        isConnected: legacyConnected,
        isConnecting: legacyConnecting,
        connectionStatus: legacyStatus,
        connect: connectLeftGlove,
        disconnect: disconnectLeftGlove,
        pressure: legacyPressure,
        setPressure: setLegacyPressure,
      }}
    >
      {children}
    </BLEContext.Provider>
  );
};

export type { ControlMode };
