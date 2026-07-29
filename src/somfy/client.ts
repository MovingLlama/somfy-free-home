import axios, { AxiosInstance } from 'axios';
import { OverkizCredentials, OverkizDevice, MappedDevice, DeviceCategory } from './types';

export class SomfyOverkizClient {
  private client: AxiosInstance;
  private credentials: OverkizCredentials;
  private jsessionid: string | null = null;
  private baseUrl: string;

  constructor(credentials: OverkizCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.serverUrl || 'https://ha101-1.overkiz.com/enduser-mobile-web/enduser/integration';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'freeathome-somfy-addon/1.0.0'
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
  }

  public async login(): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      params.append('userId', this.credentials.username);
      params.append('userPassword', this.credentials.password);

      const response = await this.client.post('/login', params.toString());
      
      if (response.data && response.data.sessionID) {
        this.jsessionid = response.data.sessionID;
      } else if (response.headers['set-cookie']) {
        const cookies = response.headers['set-cookie'];
        for (const cookie of cookies) {
          if (cookie.includes('JSESSIONID=')) {
            this.jsessionid = cookie.split('JSESSIONID=')[1].split(';')[0];
            break;
          }
        }
      }

      if (this.jsessionid) {
        this.client.defaults.headers.common['Cookie'] = `JSESSIONID=${this.jsessionid}`;
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Somfy Overkiz login error:', error?.message || error);
      return false;
    }
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
      const response = await this.client.get('/setup/devices');
      return response.data as OverkizDevice[];
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        // Session expired, retry login
        this.jsessionid = null;
        if (await this.login()) {
          const response = await this.client.get('/setup/devices');
          return response.data as OverkizDevice[];
        }
      }
      console.error('Error fetching Somfy devices:', error?.message || error);
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

    try {
      const response = await this.client.post('/exec/apply', payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data?.execId || 'success';
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        this.jsessionid = null;
        if (await this.login()) {
          const response = await this.client.post('/exec/apply', payload, {
            headers: { 'Content-Type': 'application/json' }
          });
          return response.data?.execId || 'success';
        }
      }
      console.error(`Error executing Somfy command ${commandName} on ${deviceURL}:`, error?.message || error);
      throw error;
    }
  }

  public async openDevice(deviceURL: string, category: DeviceCategory): Promise<void> {
    if (category === 'window') {
      await this.executeCommand(deviceURL, 'open');
    } else {
      // Shutter or Awning -> open command or setClosure(0) / setPosition(0) / setDeployment(100)
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
    // closurePercent: 0 = fully open, 100 = fully closed
    try {
      await this.executeCommand(deviceURL, 'setClosure', [closurePercent]);
    } catch {
      try {
        await this.executeCommand(deviceURL, 'setPosition', [100 - closurePercent]);
      } catch {
        // Fallback for awnings (deployment: 0 = retracted, 100 = fully extended)
        await this.executeCommand(deviceURL, 'setDeployment', [100 - closurePercent]);
      }
    }
  }
}
