import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

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
  filters: Array<{ services: number[] }>;
}

interface BluetoothDevice extends EventTarget {
  gatt?: BluetoothRemoteGATTServer;
  name?: string;
  id?: string;
  addEventListener(type: 'gattserverdisconnected', listener: () => void): void;
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>;
  getPrimaryService(service: number): Promise<BluetoothRemoteGATTService>;
  connected: boolean;
  disconnect(): void;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: number): Promise<BluetoothRemoteGATTCharacteristic>;
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
  
  const pollIntervalRef = useRef<number | null>(null);
  const eventListenerRef = useRef<((event: Event) => void) | null>(null);

  // Convert ADC reading to PSI using FSR power-law model
  const fsrToPsi = (
    adc: number,
    rFixed: number = 56000,
    K: number = 2.058e6,
    n: number = 0.90,
    areaIn2: number = 0.266
  ): number => {
    if (adc <= 0) {
      return 0.0;
    }
    if (adc >= 4095) {
      adc = 4094.9; // avoid division-by-zero
    }

    const rFsr = rFixed * (4095 - adc) / adc;
    const forceG = K * Math.pow(rFsr, -n);
    const pounds = forceG * 0.00220462;
    const psi = pounds / areaIn2;

    return psi;
  };

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
            const clampedPressure = Math.max(0, Math.min(35, pressurePSI));
            setPressure(clampedPressure);
            console.log('BLE Reading - ADC:', adcValue, 'PSI:', clampedPressure.toFixed(2));
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
      
      // Ensure polling is active
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      
      console.log('Starting polling for existing connection...');
      pollIntervalRef.current = setInterval(async () => {
        try {
          if (characteristic && device.gatt?.connected) {
            const value = await characteristic.readValue();
            if (value && value.byteLength > 0) {
              let jsonString = '';
              for (let i = 0; i < value.byteLength; i++) {
                jsonString += String.fromCharCode(value.getUint8(i));
              }
              const data = JSON.parse(jsonString);
              const adcValue = data.raw || 0;
              const pressurePSI = fsrToPsi(adcValue);
              const clampedPressure = Math.max(0, Math.min(35, pressurePSI));
              setPressure(clampedPressure);
            }
          }
        } catch (pollError) {
          // Silently fail
        }
      }, 100);
      
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
            const service = await server.getPrimaryService(0x181A);
            const newCharacteristic = await service.getCharacteristic(0x2A6E);
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
                  const clampedPressure = Math.max(0, Math.min(35, pressurePSI));
                  setPressure(clampedPressure);
                  console.log('BLE Reading - ADC:', adcValue, 'PSI:', clampedPressure.toFixed(2));
                } catch (parseError) {
                  console.error('Error parsing JSON:', parseError);
                }
              }
            };
            newCharacteristic.addEventListener('characteristicvaluechanged', handleValueChange);
            eventListenerRef.current = handleValueChange;
            
            // Re-setup polling
            pollIntervalRef.current = setInterval(async () => {
              try {
                if (newCharacteristic && device.gatt?.connected) {
                  const value = await newCharacteristic.readValue();
                  if (value && value.byteLength > 0) {
                    let jsonString = '';
                    for (let i = 0; i < value.byteLength; i++) {
                      jsonString += String.fromCharCode(value.getUint8(i));
                    }
                    const data = JSON.parse(jsonString);
                    const adcValue = data.raw || 0;
                    const pressurePSI = fsrToPsi(adcValue);
                    const clampedPressure = Math.max(0, Math.min(35, pressurePSI));
                    setPressure(clampedPressure);
                  }
                }
              } catch (pollError) {
                // Silently fail
              }
            }, 100);
            
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

      console.log('Requesting BLE device...');
      const newDevice = await navigator.bluetooth.requestDevice({
        filters: [
          {
            services: [0x181A], // Environmental Sensing service
          },
        ],
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
      setDevice(newDevice);
      setIsConnected(true);
      setConnectionStatus('Connected');

      // Get the Environmental Sensing service
      const service = await server.getPrimaryService(0x181A);
      console.log('Service obtained');

      // Get the Pressure characteristic (0x2A6E)
      const newCharacteristic = await service.getCharacteristic(0x2A6E);
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
            const clampedPressure = Math.max(0, Math.min(35, pressurePSI));
            setPressure(clampedPressure);
            console.log('BLE Reading - ADC:', adcValue, 'PSI:', clampedPressure.toFixed(2));
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
          }
        }
      };

      newCharacteristic.addEventListener('characteristicvaluechanged', handleValueChange);
      eventListenerRef.current = handleValueChange;

      // Set up polling as fallback
      pollIntervalRef.current = setInterval(async () => {
        try {
          if (newCharacteristic && newDevice.gatt?.connected) {
            const value = await newCharacteristic.readValue();
            if (value && value.byteLength > 0) {
              let jsonString = '';
              for (let i = 0; i < value.byteLength; i++) {
                jsonString += String.fromCharCode(value.getUint8(i));
              }
              const data = JSON.parse(jsonString);
              const adcValue = data.raw || 0;
              const pressurePSI = fsrToPsi(adcValue);
              const clampedPressure = Math.max(0, Math.min(35, pressurePSI));
              setPressure(clampedPressure);
            }
          }
        } catch (pollError) {
          // Silently fail
        }
      }, 100);

      // Handle disconnection
      newDevice.addEventListener('gattserverdisconnected', () => {
        console.log('BLE device disconnected');
        setIsConnected(false);
        setConnectionStatus('Disconnected');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
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
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

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
            const clampedPressure = Math.max(0, Math.min(35, pressurePSI));
            setPressure(clampedPressure);
            console.log('📊 BLE Reading - ADC:', adcValue, 'PSI:', clampedPressure.toFixed(2));
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

      // Ensure polling is active
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(async () => {
        try {
          if (characteristic && device.gatt?.connected) {
            const value = await characteristic.readValue();
            if (value && value.byteLength > 0) {
              let jsonString = '';
              for (let i = 0; i < value.byteLength; i++) {
                jsonString += String.fromCharCode(value.getUint8(i));
              }
              const data = JSON.parse(jsonString);
              const adcValue = data.raw || 0;
              const pressurePSI = fsrToPsi(adcValue);
              const clampedPressure = Math.max(0, Math.min(35, pressurePSI));
              setPressure(clampedPressure);
            }
          }
        } catch (pollError) {
          // Silently fail
        }
      }, 100);

      console.log('✅ BLE listeners are now active');

      // Cleanup
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        if (eventListenerRef.current) {
          try {
            characteristic.removeEventListener('characteristicvaluechanged', eventListenerRef.current);
          } catch (e) {
            // Ignore
          }
        }
      };
    }
  }, [device, characteristic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
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

