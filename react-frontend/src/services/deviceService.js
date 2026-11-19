/**
 * Device Registry & Licensing Metadata Service
 * Identifies local device and monitors device authorization state.
 */

export class DeviceService {
  constructor() {
    this.deviceIdKey = 'iq_device_id';
  }

  getDeviceId() {
    if (typeof window === 'undefined') return 'server_device';
    let id = window.localStorage.getItem(this.deviceIdKey);
    if (!id) {
      id = 'DEV-' + crypto.randomUUID();
      window.localStorage.setItem(this.deviceIdKey, id);
    }
    return id;
  }

  getDeviceMetadata() {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    const isMobile = /Mobi|Android|iPhone/i.test(ua);
    const platform = typeof navigator !== 'undefined' ? navigator.platform : 'Unknown';

    return {
      deviceId: this.getDeviceId(),
      deviceName: isMobile ? 'Mobile POS Device' : 'Desktop Commercial Terminal',
      platform,
      userAgent: ua,
      screenResolution: typeof window !== 'undefined' ? `${window.screen?.width}x${window.screen?.height}` : 'N/A',
      registeredAt: new Date().toISOString()
    };
  }
}

export const deviceService = new DeviceService();
