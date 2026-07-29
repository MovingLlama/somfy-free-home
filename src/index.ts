import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { SomfyOverkizClient } from './somfy/client';
import { FreeAtHomeManager } from './freeathome/manager';
import { DeviceMapper } from './mapping/device-mapper';
import { WebServer } from './web/server';
import { OverkizCredentials, MappedDevice } from './somfy/types';

dotenv.config();

const CONFIG_FILE = path.join(__dirname, '../config.json');

class AddonApp {
  private somfyClient: SomfyOverkizClient | null = null;
  private fahManager: FreeAtHomeManager;
  private webServer: WebServer;
  private credentials: OverkizCredentials = { username: '', password: '' };
  private mappedDevices: Map<string, MappedDevice> = new Map();
  private pollIntervalMs: number = 30000;
  private isConnected: boolean = false;

  constructor() {
    this.loadConfig();
    this.fahManager = new FreeAtHomeManager();

    this.webServer = new WebServer({
      onSaveCredentials: async (creds) => this.handleSaveCredentials(creds),
      onForceSync: async () => this.syncDevices(),
      getStatus: () => this.getStatus()
    });
  }

  public async start(): Promise<void> {
    console.log('Starting Somfy 1870755 free@home SysAP 2 Addon...');
    
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
    }

    // Start continuous polling loop
    setInterval(() => this.pollSomfyStates(), this.pollIntervalMs);
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data.username && data.password) {
          this.credentials = data;
        }
      } else if (process.env.SOMFY_USERNAME && process.env.SOMFY_PASSWORD) {
        this.credentials = {
          username: process.env.SOMFY_USERNAME,
          password: process.env.SOMFY_PASSWORD
        };
      }
    } catch (err) {
      console.error('Error loading config:', err);
    }
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.credentials, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving config:', err);
    }
  }

  private async handleSaveCredentials(creds: OverkizCredentials): Promise<boolean> {
    this.credentials = creds;
    this.saveConfig();
    return await this.initSomfyClient();
  }

  private async initSomfyClient(): Promise<boolean> {
    if (!this.credentials.username || !this.credentials.password) {
      return false;
    }

    this.somfyClient = new SomfyOverkizClient(this.credentials);
    const loginOk = await this.somfyClient.login();
    this.isConnected = loginOk;

    if (loginOk) {
      console.log('Somfy Connectivity Kit login successful.');
      await this.syncDevices();
    } else {
      console.error('Somfy Connectivity Kit login failed.');
    }
    return loginOk;
  }

  private async syncDevices(): Promise<void> {
    if (!this.somfyClient || !this.isConnected) return;

    try {
      const rawDevices = await this.somfyClient.getDevices();
      console.log(`Discovered ${rawDevices.length} raw devices from Somfy Connectivity Kit.`);

      for (const dev of rawDevices) {
        const category = DeviceMapper.categorizeDevice(dev);
        if (category === 'unknown') continue; // Skip unsupported widgets

        const mapped = DeviceMapper.parseDeviceState(dev);
        this.mappedDevices.set(mapped.deviceURL, mapped);

        // Sanitize deviceURL to create a valid free@home nativeId
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
    } catch (err) {
      console.error('Error during device sync:', err);
    }
  }

  private async pollSomfyStates(): Promise<void> {
    if (!this.somfyClient || !this.isConnected) return;

    try {
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
      console.error('Error polling Somfy states:', err);
    }
  }

  private async handleFreeAtHomeCommand(event: { nativeId: string; channel: string; datapoint: string; value: string }): Promise<void> {
    if (!this.somfyClient) return;

    // Find mapped device by nativeId
    let targetDevice: MappedDevice | undefined = undefined;
    for (const dev of this.mappedDevices.values()) {
      const nId = 'somfy_' + dev.deviceURL.replace(/[^a-zA-Z0-9]/g, '_');
      if (nId === event.nativeId) {
        targetDevice = dev;
        break;
      }
    }

    if (!targetDevice) {
      console.warn(`Received command for unknown nativeId: ${event.nativeId}`);
      return;
    }

    console.log(`Executing free@home command on Somfy device ${targetDevice.label}: ${event.datapoint} = ${event.value}`);

    try {
      if (event.datapoint === 'idp0000') {
        // Move Up / Down (0 = Move Up / Open, 1 = Move Down / Close)
        if (event.value === '0') {
          await this.somfyClient.openDevice(targetDevice.deviceURL, targetDevice.category);
        } else {
          await this.somfyClient.closeDevice(targetDevice.deviceURL, targetDevice.category);
        }
      } else if (event.datapoint === 'idp0001') {
        // Stop command
        await this.somfyClient.stopDevice(targetDevice.deviceURL);
      } else if (event.datapoint === 'idp0002') {
        // Set Position (0-100%)
        const closure = parseInt(event.value, 10);
        if (!isNaN(closure)) {
          await this.somfyClient.setDevicePosition(targetDevice.deviceURL, closure);
        }
      }
    } catch (err) {
      console.error(`Failed to execute command on Somfy device ${targetDevice.label}:`, err);
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
  console.error('Fatal error starting Somfy Addon:', err);
});
