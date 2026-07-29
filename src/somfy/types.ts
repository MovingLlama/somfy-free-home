export interface OverkizCredentials {
  username: string;
  password: string;
  serverUrl?: string; // default: https://ha101-1.overkiz.com/enduser-mobile-web/enduser/integration/
}

export interface OverkizState {
  name: string;
  type: number;
  value: any;
}

export interface OverkizCommand {
  name: string;
  parameters?: any[];
}

export interface OverkizDevice {
  deviceURL: string;
  label: string;
  type: number;
  widget: string;
  uiClass: string;
  controllableName: string;
  states: OverkizState[];
  definition: {
    commands: Array<{
      commandName: string;
      nillable: boolean;
      numParams: number;
    }>;
    states: Array<{
      name: string;
      type: string;
      values?: string[];
    }>;
    widgetName: string;
    uiClass: string;
  };
}

export type DeviceCategory = 'shutter' | 'awning' | 'window' | 'unknown';

export interface MappedDevice {
  deviceURL: string;
  label: string;
  category: DeviceCategory;
  widget: string;
  position?: number; // 0-100% (0 = fully open, 100 = fully closed in free@home)
  openState?: 'open' | 'closed' | 'tilted' | 'unknown';
}
