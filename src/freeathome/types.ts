export interface VirtualDeviceConfig {
  nativeId: string;
  displayName: string;
  type: 'BlindActuator' | 'WindowSensor';
}

export interface CommandEvent {
  nativeId: string;
  channel: string;
  datapoint: string;
  value: string;
}

export type CommandCallback = (event: CommandEvent) => void | Promise<void>;
