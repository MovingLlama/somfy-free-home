import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { SomfyOverkizClient } from './somfy/client';
import { FreeAtHomeManager } from './freeathome/manager';
import { DeviceMapper } from './mapping/device-mapper';
import { WebServer } from './web/server';
import { OverkizCredentials, MappedDevice } from './somfy/types';
import { logger } from './utils/logger';

dotenv.config();

const CONFIG_FILE = path.join(__dirname, '../config.json');

class AddonApp {
  private somfyClient: SomfyOverkizClient | null = null;
  private fahManager: FreeAtHomeManager;
  private webServer: WebServer;
  private credentials: OverkizCredentials = { username: '', password: '' };
  private mappedDevices: Map<string, MappedDevice> = new Map();
  private pollIntervalMs: number = 30000;
  private pollTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.loadConfig();
    this.fahManager = new FreeAtHomeManager();

    this.webServer = new WebServer({
      onSaveCredentials: async (creds) => this.handleSaveCredentials(creds),
      onForceSync: async () => this.syncDevices(),
      getStatus: () => this.getStatus()
    });

    // Listen for SysAP Addon Settings UI parameter changes
    this.fahManager.onConfigurationChange(async (config) => {
      await this.handleSysapConfigurationChange(config);
    });
  }

  public async start(): Promise<void> {
    logger.info('====================================================');
    logger.info('Starting Somfy 1870755 free@home SysAP Addon v1.0.1');
    logger.info('====================================================');

    // Start Web Server
    this.webServer.start();

    // Connect to free@home SysAP local interface
    await this.fahManager.connect();

    // Listen for free@home user commands
    this.fahManager.onCommand(async (event) => {
      await this.handleFreeAtHomeCommand(event);
    });

    // If credentials exist, initialize Somfy client and sync
    if (this.credentials.username && this.credentials.password) {
      await this.initSomfyClient();
    } else {
      logger.warn('No Somfy credentials provided yet. Configure credentials in SysAP Addon Settings or via Web UI on port 8080.');
    }

    // Start continuous polling loop
    this.startPollingTimer();
  }

  private startPollingTimer(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    this.pollTimer = setInterval(() => this.pollSomfyStates(), this.pollIntervalMs);
    logger.info(`Polling loop active with interval: ${this.pollIntervalMs / 1000}s`);
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data.username && data.password) {
          this.credentials = data;
          logger.info(`Loaded stored credentials for user: ${data.username}`);
        }
      } else if (process.env.SOMFY_USERNAME && process.env.SOMFY_PASSWORD) {
        this.credentials = {
          username: process.env.SOMFY_USERNAME,
          password: process.env.SOMFY_PASSWORD
        };
        logger.info(`Loaded environment credentials for user: ${this.credentials.username}`);
      }
    } catch (err) {
      logger.error('Error loading config file:', err);
    }
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.credentials, null, 2), 'utf-8');
      logger.info('Saved configuration to local file config.json');
    } catch (err) {
      logger.error('Error saving config file:', err);
    }
  }

  private async handleSysapConfigurationChange(config: Record<string, any>): Promise<void> {
    logger.info('Processing SysAP Addon Configuration change...');
    let updated = false;

    if (config.somfyUsername && config.somfyUsername !== this.credentials.username) {
      this.credentials.username = String(config.somfyUsername);
      updated = true;
    }

    if (config.somfyPassword && config.somfyPassword !== this.credentials.password) {
      this.credentials.password = String(config.somfyPassword);
      updated = true;
    }

    if (config.pollingInterval && !isNaN(Number(config.pollingInterval))) {
      const intervalSec = Math.max(10, Number(config.pollingInterval));
      this.pollIntervalMs = intervalSec * 1000;
      this.startPollingTimer();
      logger.info(`Updated polling interval to ${intervalSec} seconds`);
    }

    if (updated) {
      this.saveConfig();
      await this.initSomfyClient();
    }
  }

  private async handleSaveCredentials(creds: OverkizCredentials): Promise<boolean> {
    logger.info('Saving credentials from Web UI...');
    this.credentials = creds;
    this.saveConfig();
    return await this.initSomfyClient();
  }

  private async initSomfyClient(): Promise<boolean> {
    if (!this.credentials.username || !this.credentials.password) {
      logger.warn('Skipping Somfy client init: credentials missing.');
      return false;
    }

    logger.info(`Initializing Somfy Overkiz Client for ${this.credentials.username}...`);
    this.somfyClient = new SomfyOverkizClient(this.credentials);
    const loginOk = await this.somfyClient.login();
    this.isConnected = loginOk;

    if (loginOk) {
      logger.success(`Successfully authenticated with Somfy Overkiz API for ${this.credentials.username}`);
      await this.syncDevices();
    } else {
      logger.error(`Failed to authenticate with Somfy Overkiz API for ${this.credentials.username}`);
    }
    return loginOk;
  }

  private async syncDevices(): Promise<void> {
    if (!this.somfyClient || !this.isConnected) {
      logger.warn('Cannot sync devices: Somfy client not connected.');
      return;
    }

    try {
      logger.info('Syncing device setup from Somfy Cloud...');
      const rawDevices = await this.somfyClient.getDevices();
      logger.info(`Discovered ${rawDevices.length} total raw devices from Somfy Connectivity Kit.`);

      for (const dev of rawDevices) {
        const category = DeviceMapper.categorizeDevice(dev);
        if (category === 'unknown') continue;

        const mapped = DeviceMapper.parseDeviceState(dev);
        this.mappedDevices.set(mapped.deviceURL, mapped);

        const nativeId = 'somfy_' + mapped.deviceURL.replace(/[^a-zA-Z0-9]/g, '_');

        if (category === 'shutter' || category === 'awning') {
          await this.fahManager.registerDevice({
            nativeId,
            displayName: `${mapped.label} (${category === 'shutter' ? 'Rollladen' : 'Markise'})`,
            type: 'BlindActuator'
          });
          if (mapped.position !== undefined) {
            this.fahManager.updateBlindState(nativeId, mapped.position);
          }
        } else if (category === 'window') {
          await this.fahManager.registerDevice({
            nativeId,
            displayName: `${mapped.label} (Fenster)`,
            type: 'WindowSensor'
          });
          if (mapped.openState) {
            this.fahManager.updateWindowState(nativeId, mapped.openState === 'unknown' ? 'closed' : mapped.openState);
          }
        }
      }
      logger.success(`Device sync completed. Registered ${this.mappedDevices.size} Somfy widgets.`);
    } catch (err) {
      logger.error('Error during Somfy device sync:', err);
    }
  }

  private async pollSomfyStates(): Promise<void> {
    if (!this.somfyClient || !this.isConnected) return;

    try {
      logger.debug('Polling Somfy state updates...');
      const rawDevices = await this.somfyClient.getDevices();
      for (const dev of rawDevices) {
        if (!this.mappedDevices.has(dev.deviceURL)) continue;

        const mapped = DeviceMapper.parseDeviceState(dev);
        this.mappedDevices.set(dev.deviceURL, mapped);
        const nativeId = 'somfy_' + mapped.deviceURL.replace(/[^a-zA-Z0-9]/g, '_');

        if (mapped.category === 'shutter' || mapped.category === 'awning') {
          if (mapped.position !== undefined) {
            this.fahManager.updateBlindState(nativeId, mapped.position);
          }
        } else if (mapped.category === 'window') {
          if (mapped.openState) {
            this.fahManager.updateWindowState(nativeId, mapped.openState === 'unknown' ? 'closed' : mapped.openState);
          }
        }
      }
    } catch (err) {
      logger.error('Error polling Somfy states:', err);
    }
  }

  private async handleFreeAtHomeCommand(event: { nativeId: string; channel: string; datapoint: string; value: string }): Promise<void> {
    if (!this.somfyClient) {
      logger.warn('Cannot handle command: Somfy client is not initialized.');
      return;
    }

    let targetDevice: MappedDevice | undefined = undefined;
    for (const dev of this.mappedDevices.values()) {
      const nId = 'somfy_' + dev.deviceURL.replace(/[^a-zA-Z0-9]/g, '_');
      if (nId === event.nativeId) {
        targetDevice = dev;
        break;
      }
    }

    if (!targetDevice) {
      logger.warn(`Received command for unknown nativeId: ${event.nativeId}`);
      return;
    }

    logger.info(`Received free@home command for Somfy device '${targetDevice.label}': ${event.datapoint} = ${event.value}`);

    try {
      if (event.datapoint === 'idp0000') {
        if (event.value === '0') {
          await this.somfyClient.openDevice(targetDevice.deviceURL, targetDevice.category);
        } else {
          await this.somfyClient.closeDevice(targetDevice.deviceURL, targetDevice.category);
        }
      } else if (event.datapoint === 'idp0001') {
        await this.somfyClient.stopDevice(targetDevice.deviceURL);
      } else if (event.datapoint === 'idp0002') {
        const closure = parseInt(event.value, 10);
        if (!isNaN(closure)) {
          await this.somfyClient.setDevicePosition(targetDevice.deviceURL, closure);
        }
      }
    } catch (err) {
      logger.error(`Failed to execute command on Somfy device ${targetDevice.label}:`, err);
    }
  }

  private getStatus(): any {
    return {
      connected: this.isConnected,
      credentials: {
        username: this.credentials.username
      },
      devices: Array.from(this.mappedDevices.values())
    };
  }
}

const app = new AddonApp();
app.start().catch((err) => {
  logger.error('Fatal error starting Somfy Addon:', err);
});
