import { FreeAtHome } from '@busch-jaeger/free-at-home';
import { VirtualDeviceConfig, CommandCallback, CommandEvent } from './types';
import { logger } from '../utils/logger';

export type ConfigurationCallback = (config: Record<string, any>) => void;

export class FreeAtHomeManager {
  private fah: FreeAtHome | null = null;
  private virtualDevices: Map<string, any> = new Map();
  private commandCallbacks: CommandCallback[] = [];
  private configCallbacks: ConfigurationCallback[] = [];
  private isConnected: boolean = false;

  constructor() {
    try {
      this.fah = new FreeAtHome();
      this.fah.activateSignalHandling();
      this.setupListeners();
    } catch (err) {
      logger.warn('Could not instantiate @busch-jaeger/free-at-home directly (running in fallback/standalone mode):', err);
    }
  }

  private setupListeners(): void {
    if (!this.fah) return;

    const fahAny = this.fah as any;
    
    // Listen for SysAP native configuration parameter updates
    if (typeof fahAny.on === 'function') {
      fahAny.on('configurationChanged', (newConfig: any) => {
        logger.info('Received configuration update from free@home SysAP UI:', newConfig);
        this.emitConfigurationChange(newConfig);
      });

      fahAny.on('parameterChanged', (parameterName: string, value: any) => {
        logger.info(`SysAP parameter changed: ${parameterName} =`, value);
        this.emitConfigurationChange({ [parameterName]: value });
      });
    }
  }

  public onConfigurationChange(callback: ConfigurationCallback): void {
    this.configCallbacks.push(callback);
  }

  private emitConfigurationChange(config: Record<string, any>): void {
    for (const cb of this.configCallbacks) {
      try {
        cb(config);
      } catch (err) {
        logger.error('Error in configuration callback:', err);
      }
    }
  }

  public async connect(): Promise<boolean> {
    if (!this.fah) {
      logger.info('FreeAtHomeManager running in standalone mode.');
      this.isConnected = true;
      return true;
    }

    try {
      this.isConnected = true;
      logger.success('Connected to free@home SysAP local interface.');
      return true;
    } catch (error) {
      logger.error('Failed to connect to free@home SysAP interface:', error);
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
        const fahAny = this.fah as any;
        if (config.type === 'BlindActuator') {
          let device: any = null;
          if (typeof fahAny.createBlindActuatorDevice === 'function') {
            device = await fahAny.createBlindActuatorDevice(config.nativeId, config.displayName);
          } else if (typeof fahAny.createBlindDevice === 'function') {
            device = await fahAny.createBlindDevice(config.nativeId, config.displayName);
          } else if (typeof fahAny.createSwitchingActuatorDevice === 'function') {
            device = await fahAny.createSwitchingActuatorDevice(config.nativeId, config.displayName);
          }

          if (device) {
            if (typeof device.setAutoKeepAlive === 'function') device.setAutoKeepAlive(true);
            if (typeof device.setAutoConfirm === 'function') device.setAutoConfirm(true);

            if (typeof device.on === 'function') {
              device.on('onMoveUpDown', (value: any) => {
                logger.info(`SysAP command onMoveUpDown received for ${config.displayName} (${config.nativeId}):`, value);
                this.emitCommand({
                  nativeId: config.nativeId,
                  channel: 'ch0000',
                  datapoint: 'idp0000',
                  value: String(value)
                });
              });

              device.on('onStopMove', () => {
                logger.info(`SysAP command onStopMove received for ${config.displayName} (${config.nativeId})`);
                this.emitCommand({
                  nativeId: config.nativeId,
                  channel: 'ch0000',
                  datapoint: 'idp0001',
                  value: '1'
                });
              });

              device.on('onPositionChanged', (value: any) => {
                logger.info(`SysAP command onPositionChanged received for ${config.displayName} (${config.nativeId}):`, value);
                this.emitCommand({
                  nativeId: config.nativeId,
                  channel: 'ch0000',
                  datapoint: 'idp0002',
                  value: String(value)
                });
              });
            }

            this.virtualDevices.set(config.nativeId, device);
          }
        } else {
          // Window Sensor / Actuator
          let device: any = null;
          if (typeof fahAny.createWindowSensorDevice === 'function') {
            device = await fahAny.createWindowSensorDevice(config.nativeId, config.displayName);
          } else if (typeof fahAny.createDoorWindowSensorDevice === 'function') {
            device = await fahAny.createDoorWindowSensorDevice(config.nativeId, config.displayName);
          }

          if (device) {
            if (typeof device.setAutoKeepAlive === 'function') device.setAutoKeepAlive(true);
            if (typeof device.setAutoConfirm === 'function') device.setAutoConfirm(true);
            this.virtualDevices.set(config.nativeId, device);
          }
        }
      } else {
        this.virtualDevices.set(config.nativeId, { nativeId: config.nativeId, config });
      }

      logger.success(`Registered free@home virtual device: ${config.displayName} (${config.nativeId})`);
      return true;
    } catch (error) {
      logger.error(`Failed to register free@home virtual device ${config.nativeId}:`, error);
      return false;
    }
  }

  public updateBlindState(nativeId: string, position: number): void {
    const device = this.virtualDevices.get(nativeId);
    if (!device) return;

    try {
      if (typeof device.setDatapoint === 'function') {
        device.setDatapoint('ch0000', 'odp0000', String(position));
        logger.debug(`Updated datapoint odp0000 for ${nativeId} to ${position}%`);
      }
    } catch (err) {
      logger.error(`Failed to update position for ${nativeId}:`, err);
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
        logger.debug(`Updated window datapoint odp0000 for ${nativeId} to ${val}`);
      }
    } catch (err) {
      logger.error(`Failed to update window state for ${nativeId}:`, err);
    }
  }

  private emitCommand(event: CommandEvent): void {
    for (const cb of this.commandCallbacks) {
      try {
        cb(event);
      } catch (err) {
        logger.error('Error in command callback:', err);
      }
    }
  }
}
