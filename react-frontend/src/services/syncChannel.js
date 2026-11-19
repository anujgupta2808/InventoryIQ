/**
 * Multi-Tab Synchronization Service
 * Utilizes the HTML5 BroadcastChannel API to synchronize sales, inventory changes,
 * backups, and logout events across multiple open tabs in real-time.
 */

const CHANNEL_NAME = 'inventoryiq_sync';

class SyncChannelService {
  constructor() {
    this.channel = null;
    this.listeners = new Set();
    this._initChannel();
  }

  _initChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          this._notifyListeners(event.data);
        };
      } catch (err) {
        console.warn('[SyncChannel] BroadcastChannel initialization failed:', err);
      }
    }
  }

  /**
   * Broadcast an event to all other open tabs
   */
  broadcast(type, payload = {}) {
    if (!this.channel) return;
    try {
      this.channel.postMessage({
        type,
        payload,
        sourceTabId: typeof window !== 'undefined' ? window.name || 'tab_' + Math.random().toString(36).slice(2, 7) : 'server',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.warn('[SyncChannel] Failed to broadcast message:', err);
    }
  }

  /**
   * Subscribe to messages from other tabs
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  _notifyListeners(data) {
    if (!data) return;
    this.listeners.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error('[SyncChannel] Listener error:', err);
      }
    });
  }

  close() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

export const syncChannel = new SyncChannelService();
