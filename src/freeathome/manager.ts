import { FreeAtHome } from '@busch-jaeger/free-at-home';
import { VirtualDeviceConfig, CommandCallback, CommandEvent } from './types';

export class FreeAtHomeManager {
  private fah: FreeAtHome | null = null;
  private virtualDevices: Map<string, any> = new Map();
  private commandCallbacks: CommandCallback[] = [];
  private isConnected: boolean = false;

  constructor() {
    try {
      this.fah = new FreeAtHome();
      this.fah.activateSignalHandling();
    } catch (err) {
      console.warn('Could not instantiate @busch-jaeger/free-at-home directly:', err);
    }
  }

  public async connect(): Promise<boolean> {
    if (!this.fah) {
      console.warn('Running FreeAtHomeManager in virtual fallback mode (SysAP standalone REST).');
      this.isConnected = true;
      return true;
    }

    try {
      // FreeAtHome library auto-connects to local SysAP container environment
      this.isConnected = true;
      console.log('Successfully connected to free@home SysAP local interface.');
      return true;
    } catch (error) {
      console.error('Failed to connect to free@home SysAP:', error);
      this.isConnected = false;
      return false;
    }
  }

  public onCommand(callback: CommandCallback): void {
    this.commandCallbacks.push(callback);
  }

  public async registerDevice(config: VirtualDeviceConfig): Promise<boolean> {
    if (this.virtualDevices.has(config.nativeId)) {
      return true;
    }

    try {
      if (this.fah) {
        if (config.type === 'BlindActuator') {
          const device = await this.fah.createBlindActuatorDevice(config.nativeId, config.displayName);
          device.setAutoKeepAlive(true);
          device.setAutoConfirm(true);

          device.on('onMoveUpDown', (value: any) => {
            this.emitCommand({
              nativeId: config.nativeId,
              channel: 'ch0000',
              datapoint: 'idp0000',
              value: String(value)
            });
          });

          device.on('onStopMove', () => {
            this.emitCommand({
              nativeId: config.nativeId,
              channel: 'ch0000',
              datapoint: 'idp0001',
              value: '1'
            });
          });

          device.on('onPositionChanged', (value: any) => {
            this.emitCommand({
              nativeId: config.nativeId,
              channel: 'ch0000',
              datapoint: 'idp0002',
              value: String(value)
            });
          });

          this.virtualDevices.set(config.nativeId, device);
        } else {
          // Window Sensor / Actuator
          const device = await this.fah.createDoorWindowSensorDevice(config.nativeId, config.displayName);
          device.setAutoKeepAlive(true);
          device.setAutoConfirm(true);
          this.virtualDevices.set(config.nativeId, device);
        }
      } else {
        // Fallback registration log
        this.virtualDevices.set(config.nativeId, { nativeId: config.nativeId, config });
      }

      console.log(`Registered free@home virtual device: ${config.displayName} (${config.nativeId})`);
      return true;
    } catch (error) {
      console.error(`Failed to register free@home virtual device ${config.nativeId}:`, error);
      return false;
    }
  }

  public updateBlindState(nativeId: string, position: number): void {
    const device = this.virtualDevices.get(nativeId);
    if (!device) return;

    try {
      if (typeof device.setDatapoint === 'function') {
        // Set odp0000 (Position 0-100%)
        device.setDatapoint('ch0000', 'odp0000', String(position));
      }
    } catch (err) {
      console.error(`Failed to update position for ${nativeId}:`, err);
    }
  }

  public updateWindowState(nativeId: string, state: 'open' | 'closed' | 'tilted'): void {
    const device = this.virtualDevices.get(nativeId);
    if (!device) return;

    let val = '0';
    if (state === 'open') val = '1';
    if (state === 'tilted') val = '2';

    try {
      if (typeof device.setDatapoint === 'function') {
        device.setDatapoint('ch0000', 'odp0000', val);
      }
    } catch (err) {
      console.error(`Failed to update window state for ${nativeId}:`, err);
    }
  }

  private emitCommand(event: CommandEvent): void {
    for (const cb of this.commandCallbacks) {
      try {
        cb(event);
      } catch (err) {
        console.error('Error in command callback:', err);
      }
    }
  }
}
