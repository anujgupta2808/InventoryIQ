/**
 * Multi-Tab Synchronization Service
 * Utilizes the HTML5 BroadcastChannel API to synchronize sales, inventory changes,
 * backups, and logout events across multiple open tabs in real-time.
 * Includes cryptographic event deduplication, echo suppression, and offline queue recovery.
 */

const CHANNEL_NAME = 'inventoryiq_sync';
const MAX_SEEN_EVENTS = 500;

class SyncChannelService {
  constructor() {
    this.channel = null;
    this.listeners = new Set();
    this.seenEventIds = new Set();
    this.offlineQueue = [];
    this.tabId = typeof window !== 'undefined' 
      ? (window.name || 'tab_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now()) 
      : 'server';
    
    this._initChannel();
    this._initNetworkListeners();
  }

  _initChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          this._handleIncomingMessage(event.data);
        };
      } catch (err) {
        console.warn('[SyncChannel] BroadcastChannel initialization failed:', err);
      }
    }
  }

  _initNetworkListeners() {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('online', () => {
        this.flushOfflineQueue();
      });
    }
  }

  /**
   * Broadcast an event to all other open tabs with deduplication headers
   */
  broadcast(type, payload = {}) {
    const eventId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : 'evt_' + Math.random().toString(36).slice(2) + '_' + Date.now();

    const message = {
      eventId,
      type,
      payload,
      sourceTabId: this.tabId,
      timestamp: new Date().toISOString()
    };

    // Record in seen events to ignore echo if received
    this._markEventSeen(eventId);

    // If offline, queue for dispatch upon network reconnect
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.offlineQueue.push(message);
      return message;
    }

    if (!this.channel) return message;

    try {
      this.channel.postMessage(message);
    } catch (err) {
      console.warn('[SyncChannel] Failed to broadcast message:', err);
      this.offlineQueue.push(message);
    }

    return message;
  }

  /**
   * Flush pending offline events when reconnecting online
   */
  flushOfflineQueue() {
    if (!this.offlineQueue.length || !this.channel) return;

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    queue.forEach(msg => {
      try {
        this.channel.postMessage(msg);
      } catch (err) {
        console.warn('[SyncChannel] Error replaying queued sync event:', err);
      }
    });
  }

  /**
   * Internal message handler enforcing echo suppression and deduplication
   */
  _handleIncomingMessage(data) {
    if (!data || typeof data !== 'object') return;

    // 1. Echo suppression: Ignore events originating from this exact tab
    if (data.sourceTabId && data.sourceTabId === this.tabId) {
      return;
    }

    // 2. Deduplication: Ignore events that have already been processed
    if (data.eventId) {
      if (this.seenEventIds.has(data.eventId)) {
        return;
      }
      this._markEventSeen(data.eventId);
    }

    this._notifyListeners(data);
  }

  _markEventSeen(eventId) {
    if (!eventId) return;
    this.seenEventIds.add(eventId);
    // Bounded set to prevent memory growth
    if (this.seenEventIds.size > MAX_SEEN_EVENTS) {
      const first = this.seenEventIds.values().next().value;
      this.seenEventIds.delete(first);
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
    this.offlineQueue = [];
  }
}

export const syncChannel = new SyncChannelService();
