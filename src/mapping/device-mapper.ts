import { OverkizDevice, MappedDevice, DeviceCategory } from '../somfy/types';

export class DeviceMapper {
  public static categorizeDevice(device: OverkizDevice): DeviceCategory {
    const widget = (device.widget || '').toLowerCase();
    const uiClass = (device.uiClass || '').toLowerCase();
    const controllable = (device.controllableName || '').toLowerCase();

    if (
      widget.includes('window') ||
      uiClass.includes('window') ||
      controllable.includes('window')
    ) {
      return 'window';
    }

    if (
      widget.includes('awning') ||
      widget.includes('pergola') ||
      widget.includes('screen') ||
      uiClass.includes('awning') ||
      controllable.includes('awning')
    ) {
      return 'awning';
    }

    if (
      widget.includes('shutter') ||
      widget.includes('blind') ||
      widget.includes('curtain') ||
      uiClass.includes('rollershutter') ||
      controllable.includes('rollershutter')
    ) {
      return 'shutter';
    }

    return 'unknown';
  }

  public static parseDeviceState(device: OverkizDevice): MappedDevice {
    const category = this.categorizeDevice(device);
    let position: number | undefined = undefined;
    let openState: 'open' | 'closed' | 'tilted' | 'unknown' = 'unknown';

    for (const state of device.states || []) {
      const name = state.name;
      const value = state.value;

      // Extract closure / position state
      if (name === 'core:ClosureState' || name === 'core:TargetClosureState') {
        position = typeof value === 'number' ? Math.round(value) : undefined;
      } else if (name === 'core:DeploymentState') {
        position = typeof value === 'number' ? Math.round(100 - value) : undefined;
      } else if (name === 'core:OpenClosedState') {
        if (value === 'open') openState = 'open';
        else if (value === 'closed') openState = 'closed';
        else if (value === 'tilted') openState = 'tilted';
      } else if (name === 'core:OpenClosedPedestrianState') {
        if (value === 'open') openState = 'open';
        else if (value === 'closed') openState = 'closed';
      }
    }

    // Infer openState from position if available
    if (position !== undefined && openState === 'unknown') {
      if (position === 0) openState = 'open';
      else if (position === 100) openState = 'closed';
      else openState = 'open';
    }

    return {
      deviceURL: device.deviceURL,
      label: device.label || 'Somfy Device',
      category,
      widget: device.widget || 'UnknownWidget',
      position,
      openState
    };
  }
}
