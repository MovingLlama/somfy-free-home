import axios, { AxiosInstance } from 'axios';
import { OverkizCredentials, OverkizDevice, DeviceCategory } from './types';
import { logger } from '../utils/logger';

const OVERKIZ_ENDPOINTS = [
  'https://ha101-1.overkiz.com/enduser-mobile-web/enduser/integration',
  'https://ha201-1.overkiz.com/enduser-mobile-web/enduser/integration',
  'https://ha101-1.overkiz.com/enduser-mobile-web/external/login'
];

export class SomfyOverkizClient {
  private client: AxiosInstance;
  private credentials: OverkizCredentials;
  private jsessionid: string | null = null;
  private baseUrl: string;

  constructor(credentials: OverkizCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.serverUrl || OVERKIZ_ENDPOINTS[0];
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'freeathome-somfy-addon/1.0.1'
      }
    });
  }

  public updateCredentials(credentials: OverkizCredentials): void {
    this.credentials = credentials;
    if (credentials.serverUrl) {
      this.baseUrl = credentials.serverUrl;
      this.client.defaults.baseURL = this.baseUrl;
    }
    this.jsessionid = null;
    logger.info(`Updated Somfy Overkiz credentials for user: ${credentials.username || '(empty)'}`);
  }

  public async login(): Promise<boolean> {
    if (!this.credentials.username || !this.credentials.password) {
      logger.warn('Somfy Overkiz login skipped: Username or password missing. Please configure credentials in SysAP Addon Settings or Web UI.');
      return false;
    }

    logger.info(`Attempting Somfy Overkiz Cloud login for user: ${this.credentials.username}...`);

    for (const endpoint of OVERKIZ_ENDPOINTS) {
      try {
        const client = axios.create({
          baseURL: endpoint,
          timeout: 15000,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'freeathome-somfy-addon/1.0.1'
          }
        });

        const params = new URLSearchParams();
        params.append('userId', this.credentials.username);
        params.append('userPassword', this.credentials.password);

        const response = await client.post('/login', params.toString());
        
        let sessionID: string | null = null;
        if (response.data && response.data.sessionID) {
          sessionID = response.data.sessionID;
        } else if (response.headers['set-cookie']) {
          const cookies = response.headers['set-cookie'];
          for (const cookie of cookies) {
            if (cookie.includes('JSESSIONID=')) {
              sessionID = cookie.split('JSESSIONID=')[1].split(';')[0];
              break;
            }
          }
        }

        if (sessionID) {
          this.jsessionid = sessionID;
          this.baseUrl = endpoint;
          this.client.defaults.baseURL = this.baseUrl;
          this.client.defaults.headers.common['Cookie'] = `JSESSIONID=${this.jsessionid}`;
          logger.success(`Somfy Overkiz login successful via endpoint: ${endpoint}`);
          return true;
        }
      } catch (error: any) {
        logger.warn(`Login attempt failed on endpoint ${endpoint}: ${error?.message || error}`);
      }
    }

    logger.error('All Somfy Overkiz login endpoints failed. Please verify credentials.');
    return false;
  }

  private async ensureAuthenticated(): Promise<boolean> {
    if (!this.jsessionid) {
      return await this.login();
    }
    return true;
  }

  public async getDevices(): Promise<OverkizDevice[]> {
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      throw new Error('Failed to authenticate with Somfy Overkiz API');
    }

    try {
      logger.debug('Fetching device setup from Somfy Overkiz API...');
      const response = await this.client.get('/setup/devices');
      const devices = response.data as OverkizDevice[];
      logger.info(`Successfully retrieved ${devices.length} devices from Somfy Cloud`);
      return devices;
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        logger.warn('Somfy Overkiz session expired. Re-authenticating...');
        this.jsessionid = null;
        if (await this.login()) {
          const response = await this.client.get('/setup/devices');
          return response.data as OverkizDevice[];
        }
      }
      logger.error('Error fetching Somfy devices:', error?.message || error);
      throw error;
    }
  }

  public async executeCommand(deviceURL: string, commandName: string, parameters: any[] = []): Promise<string> {
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      throw new Error('Not authenticated with Somfy API');
    }

    const payload = {
      label: `freeathome-cmd-${Date.now()}`,
      actions: [
        {
          deviceURL,
          commands: [
            {
              name: commandName,
              parameters
            }
          ]
        }
      ]
    };

    logger.info(`Sending Somfy command '${commandName}' to device: ${deviceURL}`, parameters);

    try {
      const response = await this.client.post('/exec/apply', payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      const execId = response.data?.execId || 'success';
      logger.success(`Command '${commandName}' executed successfully (execId: ${execId})`);
      return execId;
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        logger.warn('Session expired during command execution. Re-authenticating...');
        this.jsessionid = null;
        if (await this.login()) {
          const response = await this.client.post('/exec/apply', payload, {
            headers: { 'Content-Type': 'application/json' }
          });
          return response.data?.execId || 'success';
        }
      }
      logger.error(`Failed to execute Somfy command ${commandName} on ${deviceURL}:`, error?.message || error);
      throw error;
    }
  }

  public async openDevice(deviceURL: string, category: DeviceCategory): Promise<void> {
    if (category === 'window') {
      await this.executeCommand(deviceURL, 'open');
    } else {
      try {
        await this.executeCommand(deviceURL, 'open');
      } catch {
        await this.executeCommand(deviceURL, 'setClosure', [0]);
      }
    }
  }

  public async closeDevice(deviceURL: string, category: DeviceCategory): Promise<void> {
    if (category === 'window') {
      await this.executeCommand(deviceURL, 'close');
    } else {
      try {
        await this.executeCommand(deviceURL, 'close');
      } catch {
        await this.executeCommand(deviceURL, 'setClosure', [100]);
      }
    }
  }

  public async stopDevice(deviceURL: string): Promise<void> {
    try {
      await this.executeCommand(deviceURL, 'stop');
    } catch {
      await this.executeCommand(deviceURL, 'my');
    }
  }

  public async setDevicePosition(deviceURL: string, closurePercent: number): Promise<void> {
    try {
      await this.executeCommand(deviceURL, 'setClosure', [closurePercent]);
    } catch {
      try {
        await this.executeCommand(deviceURL, 'setPosition', [100 - closurePercent]);
      } catch {
        await this.executeCommand(deviceURL, 'setDeployment', [100 - closurePercent]);
      }
    }
  }
}
