/**
 * نقاش‌باشی (Naghash Bashi) - P2P Multiplayer Networking Engine
 * Uses PeerJS (WebRTC) for serverless cross-device play on GitHub Pages,
 * local WebSocket relay when running via server.js,
 * and BroadcastChannel fallback for multi-tab offline testing.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NetworkEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const PEER_PREFIX = 'naghash-room-';

  // Comprehensive STUN and TURN server list to ensure connectivity across Iranian ISPs & mobile data NATs
  const RTC_CONFIG = {
    iceServers: [
      { urls: 'stun:turn1.spacsvc.co.in:3478' },
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      {
        urls: 'turn:turn1.spacsvc.co.in:3478?transport=udp',
        username: 'username1',
        credential: 'password1'
      },
      {
        urls: 'turn:turn1.spacsvc.co.in:3478?transport=tcp',
        username: 'username1',
        credential: 'password1'
      },
      {
        urls: 'turns:turn1.spacsvc.co.in:443?transport=tcp',
        username: 'username1',
        credential: 'password1'
      }
    ],
    iceCandidatePoolSize: 10
  };

  function formatRoomPeerId(code) {
    const clean = (code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${PEER_PREFIX}${clean}`;
  }

  class NetworkManager {
    constructor(callbacks = {}) {
      this.callbacks = callbacks;
      // callbacks:
      // onConnected(peerId)
      // onConnecting(status)
      // onPlayerJoined(player)
      // onPlayerLeft(playerId)
      // onPlayerTemporarilyDisconnected(playerId)
      // onPlayerDisconnected(playerId)
      // onRoomState(state)
      // onGameStarted(data)
      // onDrawAction(action)
      // onCanvasFullSync(packet)
      // onPlayAgain(packet)
      // onChatMessage(msg)
      // onWordChoices(choices)
      // onRoundStart(data)
      // onDrawerSecretWord(data)
      // onRoundEnd(data)
      // onGameOver(data)
      // onTick(seconds, masked)
      // onError(err)
      // onHostReceivedPacket({ fromPeerId, packet })

      this.isHost = false;
      this.roomCode = null;
      this.myPlayerId = null;
      this.peer = null;
      this.connections = new Map();         // peerId -> DataConnection
      this.peerToPlayerId = new Map();      // peerId -> playerId
      this.playerIdToPeer = new Map();      // playerId -> peerId
      this.disconnectTimers = new Map();    // playerId -> setTimeout ID
      this.peerLastActivity = new Map();    // peerId/playerId -> timestamp
      this.lastHostActivity = Date.now();   // For guest: timestamp of last packet from host
      this.hostConn = null;                 // For guest: DataConnection to host
      this.broadcastChannel = null;         // Local BroadcastChannel
      this.ws = null;                       // Local WebSocket connection if server.js is active
      this.isDestroyed = false;
      this.joinHandshakeInterval = null;
      this.keepaliveInterval = null;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 12;
      this.gracePeriodMs = 28000;           // 28s generous grace period
      this.reconnectTimer = null;
      this.discoveryInterval = null;
      this.discoveryBc = null;
      this.guestPlayerInfo = null;
      this.hostPlayerInfo = null;
      this.roomAnnounceData = null;
      this.onlineListener = null;
      this.visibilityListener = null;
    }

    static generateRoomCode() {
      // 4-digit random room number e.g. NB-4821 (10,000 possibilities)
      const num = Math.floor(1000 + Math.random() * 9000);
      return `NB-${num}`;
    }

    registerPlayerPeer(playerId, peerId) {
      if (!playerId) return;
      if (peerId) {
        this.peerToPlayerId.set(peerId, playerId);
        this.playerIdToPeer.set(playerId, peerId);
      }
    }

    /**
     * Start hosting a room
     */
    initHost(roomCode, hostPlayer) {
      this.isHost = true;
      this.roomCode = roomCode;
      this.myPlayerId = hostPlayer.id;
      this.hostPlayerInfo = hostPlayer;

      const targetId = formatRoomPeerId(roomCode);
      this.setupBroadcastChannel(roomCode);
      this.setupWebSocket(roomCode);
      this.setupKeepalive();
      this.startDiscoveryBroadcast({
        roomCode,
        hostName: hostPlayer.name,
        hostAvatar: hostPlayer.avatar || '🎨',
        playerCount: 1,
        maxPlayers: 6,
        status: 'LOBBY'
      });

      return new Promise((resolve) => {
        if (typeof Peer === 'undefined') {
          console.warn('PeerJS not loaded. Operating in Local/BroadcastChannel mode.');
          this.emit('onConnected', 'local-host');
          return resolve('local-host');
        }

        try {
          this.peer = new Peer(targetId, {
            debug: 1,
            config: RTC_CONFIG
          });

          this.peer.on('open', (id) => {
            console.log('Host PeerJS connected with ID:', id);
            this.emit('onConnected', id);
            resolve(id);
          });

          this.peer.on('disconnected', () => {
            console.warn('Host PeerJS disconnected from signaling server. Reconnecting...');
            if (!this.isDestroyed && this.peer && !this.peer.destroyed) {
              try { this.peer.reconnect(); } catch (_) {}
            }
          });

          this.peer.on('connection', (conn) => {
            this.handleIncomingConnection(conn);
          });

          this.peer.on('error', (err) => {
            console.warn('PeerJS Host Error:', err);
            if (err.type === 'unavailable-id') {
              this.emit('onError', 'شناسه این اتاق در حال حاضر مشغول است. لطفاً چند لحظه بعد مجدداً تلاش کنید یا اتاق جدیدی بسازید.');
            } else if (err.type === 'network' || err.type === 'server-error') {
              this.emit('onError', 'خطای ارتباط با سرور سیگنالینگ. در حال بررسی...');
            }
            resolve('fallback-host');
          });
        } catch (e) {
          console.warn('Peer init failed:', e);
          resolve('local-host');
        }
      });
    }

    /**
     * Join an existing room as guest with automatic retry and reconnection
     */
    initGuest(roomCode, guestPlayer) {
      this.isHost = false;
      this.roomCode = roomCode;
      this.myPlayerId = guestPlayer.id;
      this.guestPlayerInfo = guestPlayer;
      this.lastHostActivity = Date.now();

      const hostPeerId = formatRoomPeerId(roomCode);
      this.setupBroadcastChannel(roomCode);
      this.setupWebSocket(roomCode);
      this.setupKeepalive();

      return new Promise((resolve) => {
        if (typeof Peer === 'undefined') {
          console.warn('PeerJS not loaded. Using BroadcastChannel for local join.');
          this.sendLocalBroadcast({ type: 'JOIN', player: guestPlayer });
          return resolve(true);
        }

        this.connectGuestToHost(hostPeerId, guestPlayer, resolve);
      });
    }

    reconnect() {
      if (this.isDestroyed || this.isHost || !this.roomCode || !this.guestPlayerInfo) return;
      if (this.hostConn && this.hostConn.open) return;

      const hostPeerId = formatRoomPeerId(this.roomCode);
      this.connectGuestToHost(hostPeerId, this.guestPlayerInfo, null);
    }

    connectGuestToHost(hostPeerId, guestPlayer, resolvePromise) {
      if (this.isDestroyed) return;

      try {
        if (!this.peer || this.peer.destroyed) {
          this.peer = new Peer({
            debug: 1,
            config: RTC_CONFIG
          });

          this.peer.on('open', (myId) => {
            console.log('Guest peer opened with ID:', myId);
            this.attemptDataConnection(hostPeerId, guestPlayer, resolvePromise);
          });

          this.peer.on('disconnected', () => {
            console.warn('Guest PeerJS disconnected from signaling server.');
            if (!this.isDestroyed && this.peer && !this.peer.destroyed) {
              try { this.peer.reconnect(); } catch (_) {}
            }
          });

          this.peer.on('error', (err) => {
            console.warn('Guest Peer error:', err.type, err);
            this.sendLocalBroadcast({ type: 'JOIN', player: guestPlayer });
            if (resolvePromise) resolvePromise(false);
          });
        } else if (this.peer.open) {
          this.attemptDataConnection(hostPeerId, guestPlayer, resolvePromise);
        } else if (this.peer.disconnected) {
          try { this.peer.reconnect(); } catch (_) {}
          this.peer.once('open', () => {
            this.attemptDataConnection(hostPeerId, guestPlayer, resolvePromise);
          });
        } else {
          this.peer.once('open', () => {
            this.attemptDataConnection(hostPeerId, guestPlayer, resolvePromise);
          });
        }
      } catch (e) {
        console.warn('Peer error, fallback to BC:', e);
        this.sendLocalBroadcast({ type: 'JOIN', player: guestPlayer });
        if (resolvePromise) resolvePromise(false);
      }
    }

    attemptDataConnection(hostPeerId, guestPlayer, resolvePromise) {
      if (this.isDestroyed) return;

      this.emit('onConnecting', {
        attempt: 1,
        max: 1,
        message: 'در حال اتصال به اتاق مسابقه...'
      });

      try {
        const conn = this.peer.connect(hostPeerId, {
          reliable: true
        });

        const connTimeout = setTimeout(() => {
          if (!this.hostConn) {
            console.log('Connection timeout, falling back to local channel if available');
            try { conn.close(); } catch (_) {}
            this.sendLocalBroadcast({ type: 'JOIN', player: guestPlayer });
            if (resolvePromise) resolvePromise(false);
          }
        }, 5000);

        conn.on('open', () => {
          clearTimeout(connTimeout);
          console.log('Connected to host peer:', hostPeerId);
          this.hostConn = conn;
          this.lastHostActivity = Date.now();

          // Send clean JOIN packet once
          this.sendToHost({
            type: 'JOIN',
            player: guestPlayer
          });

          if (resolvePromise) resolvePromise(true);
        });

        conn.on('data', (data) => {
          this.lastHostActivity = Date.now();
          this.handlePacket(data);
        });

        conn.on('close', () => {
          clearTimeout(connTimeout);
          console.log('Connection to host closed');
          this.hostConn = null;
          this.emit('onError', 'ارتباط با میزبان بازی قطع شد. لطفاً وضعیت اتاق را بررسی کنید.');
          this.emit('onPlayerLeft', 'host');
        });

        conn.on('error', (err) => {
          clearTimeout(connTimeout);
          console.warn('Guest conn error:', err);
          this.sendLocalBroadcast({ type: 'JOIN', player: guestPlayer });
          if (resolvePromise) resolvePromise(false);
        });
      } catch (e) {
        console.warn('attemptDataConnection exception:', e);
        this.sendLocalBroadcast({ type: 'JOIN', player: guestPlayer });
        if (resolvePromise) resolvePromise(false);
      }
    }

    scheduleGuestRetry(hostPeerId, guestPlayer, resolvePromise) {
      // Kept for interface backward-compatibility as safe no-op
    }

    setupKeepalive() {
      if (this.keepaliveInterval) clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = setInterval(() => {
        if (this.isDestroyed) return;
        try {
          if (this.isHost) {
            this.broadcast({ type: 'PING' });

            // Detect silent peers (unresponsive > 20s)
            const now = Date.now();
            this.peerLastActivity.forEach((lastSeen, id) => {
              if (now - lastSeen > 20000) {
                const conn = this.connections.get(id);
                const playerId = this.peerToPlayerId.get(id) || id;
                if (conn && (!conn.open || now - lastSeen > 26000)) {
                  console.log('Peer timed out (silent):', id);
                  try { conn.close(); } catch (_) {}
                  this.connections.delete(id);
                  this.handlePeerDisconnection(playerId);
                }
              }
            });
          } else if (this.hostConn && this.hostConn.open) {
            this.sendToHost({ type: 'PING' });
          }
        } catch (_) {}
      }, 5000);
    }

    /**
     * Connect to local WebSocket server if running via node server.js
     */
    setupWebSocket(roomCode) {
      if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
      if (!window.location || !window.location.host) return;

      const isLocal = (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        (window.location.port && window.location.hostname !== 'github.io')
      );
      if (!isLocal) return;

      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${window.location.host}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          this.ws = ws;
          ws.send(JSON.stringify({
            action: 'REGISTER_ROOM',
            roomCode,
            isHost: this.isHost,
            playerId: this.myPlayerId
          }));
        };

        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (!data) return;

            if (data.action === 'RELAY') {
              const packet = data.packet;
              if (!packet || packet.senderId === this.myPlayerId) return;
              if (packet.targetPlayerId && packet.targetPlayerId !== this.myPlayerId) return;

              if (this.isHost) {
                this.handleGuestMessage(packet.senderId, packet);
              } else {
                this.handlePacket(packet);
              }
            } else if (data.action === 'PLAYER_DISCONNECTED') {
              if (this.isHost && data.playerId) {
                this.handlePeerDisconnection(data.playerId);
              }
            }
          } catch (e) {}
        };

        ws.onclose = () => { this.ws = null; };
        ws.onerror = () => { this.ws = null; };
      } catch (e) {
        this.ws = null;
      }
    }

    /**
     * Setup BroadcastChannel for offline same-browser tab multiplayer
     */
    setupBroadcastChannel(roomCode) {
      if (typeof window === 'undefined' || !window.BroadcastChannel) return;

      try {
        this.broadcastChannel = new BroadcastChannel(`naghashbashi_${roomCode}`);
        this.broadcastChannel.onmessage = (event) => {
          const packet = event.data;
          if (!packet || packet.senderId === this.myPlayerId) return;

          // Target check
          if (packet.targetPlayerId && packet.targetPlayerId !== this.myPlayerId) {
            return;
          }

          if (this.isHost) {
            this.handleGuestMessage(packet.senderId, packet);
          } else {
            this.handlePacket(packet);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    sendLocalBroadcast(packet) {
      if (!this.broadcastChannel) return;
      try {
        packet.senderId = this.myPlayerId;
        this.broadcastChannel.postMessage(packet);
      } catch (e) {}
    }

    /**
     * Host: Handle incoming Peer connection
     */
    handleIncomingConnection(conn) {
      const peerId = conn.peer;

      // Immediately register connection in map so replies can be routed right away
      this.connections.set(peerId, conn);

      // Listen for ICE connection state changes
      if (conn.peerConnection) {
        conn.peerConnection.addEventListener('iceconnectionstatechange', () => {
          const iceState = conn.peerConnection?.iceConnectionState;
          if (iceState === 'disconnected' || iceState === 'failed') {
            console.log('Host detected peer ICE state change:', peerId, iceState);
            const playerId = this.peerToPlayerId.get(peerId);
            this.handlePeerDisconnection(playerId || peerId);
          }
        });
      }

      conn.on('open', () => {
        console.log('Host accepted peer connection from:', peerId);
        this.connections.set(peerId, conn);
      });

      conn.on('data', (data) => {
        this.handleGuestMessage(peerId, data);
      });

      conn.on('close', () => {
        console.log('Peer connection closed:', peerId);
        const playerId = this.peerToPlayerId.get(peerId);
        this.connections.delete(peerId);
        this.handlePeerDisconnection(playerId || peerId);
      });

      conn.on('error', (err) => {
        console.warn('Peer conn error:', err);
      });
    }

    handlePeerDisconnection(playerId) {
      if (!playerId || !this.isHost) return;

      // Cancel any existing timer for this player
      if (this.disconnectTimers.has(playerId)) {
        clearTimeout(this.disconnectTimers.get(playerId));
      }

      // Immediately notify host that player disconnected temporarily (grace period active)
      this.emit('onPlayerTemporarilyDisconnected', playerId);

      // Generous 28-second grace reconnection period to prevent instant kicks on spikes / tab sleeping
      const timer = setTimeout(() => {
        this.disconnectTimers.delete(playerId);
        const peerId = this.playerIdToPeer.get(playerId);
        if (peerId) {
          this.connections.delete(peerId);
          this.peerToPlayerId.delete(peerId);
        }
        this.playerIdToPeer.delete(playerId);
        this.emit('onPlayerDisconnected', playerId);
      }, this.gracePeriodMs);

      this.disconnectTimers.set(playerId, timer);
    }

    /**
     * Host receives message from a guest
     */
    handleGuestMessage(fromPeerId, packet) {
      if (!packet) return;

      const pId = packet.playerId || (packet.player && packet.player.id) || packet.senderId;

      // If reconnecting player had a disconnect grace timer, cancel it immediately on ANY packet (including PING)
      if (pId && this.disconnectTimers.has(pId)) {
        clearTimeout(this.disconnectTimers.get(pId));
        this.disconnectTimers.delete(pId);
      }

      if (packet.senderId) this.registerPlayerPeer(packet.senderId, fromPeerId);
      if (packet.player && packet.player.id) this.registerPlayerPeer(packet.player.id, fromPeerId);
      if (fromPeerId) this.peerLastActivity.set(fromPeerId, Date.now());
      if (pId) this.peerLastActivity.set(pId, Date.now());

      if (packet.type === 'PING') {
        this.sendToPeer(fromPeerId, { type: 'PONG' });
        return;
      }
      if (packet.type === 'PONG') return;

      // Explicit LEAVE requested by user
      if (packet.type === 'LEAVE') {
        if (pId && this.disconnectTimers.has(pId)) {
          clearTimeout(this.disconnectTimers.get(pId));
          this.disconnectTimers.delete(pId);
        }
        this.emit('onPlayerDisconnected', pId);
        return;
      }

      this.emit('onHostReceivedPacket', { fromPeerId, packet });
    }

    /**
     * Guest receives packet from host
     */
    handlePacket(packet) {
      if (!packet) return;

      if (packet.type === 'PING') {
        if (this.hostConn && this.hostConn.open) {
          this.sendToHost({ type: 'PONG' });
        }
        return;
      }
      if (packet.type === 'PONG') return;

      // If targeted to someone else, ignore
      if (packet.targetPlayerId && packet.targetPlayerId !== this.myPlayerId) {
        return;
      }

      switch (packet.type) {
        case 'ROOM_STATE':
          this.emit('onRoomState', packet.state);
          break;
        case 'GAME_STARTED':
          this.emit('onGameStarted', packet);
          break;
        case 'DRAW_ACTION':
          this.emit('onDrawAction', packet.action);
          break;
        case 'CHAT':
          this.emit('onChatMessage', packet);
          break;
        case 'WORD_CHOICES':
          this.emit('onWordChoices', packet.choices, packet);
          break;
        case 'ROUND_START':
          this.emit('onRoundStart', packet);
          break;
        case 'DRAWER_SECRET_WORD':
          this.emit('onDrawerSecretWord', packet);
          break;
        case 'TICK':
          this.emit('onTick', packet.seconds, packet.masked);
          break;
        case 'ROUND_END':
          this.emit('onRoundEnd', packet);
          break;
        case 'GAME_OVER':
          this.emit('onGameOver', packet);
          break;
        case 'PLAY_AGAIN':
          this.emit('onPlayAgain', packet);
          break;
        case 'CANVAS_FULL_SYNC':
          this.emit('onCanvasFullSync', packet);
          break;
        case 'PLAYER_LEFT':
          this.emit('onPlayerLeft', packet.playerId);
          break;
        case 'REJECT':
          this.emit('onError', packet.message || 'ورود به اتاق ناموفق بود.');
          break;
      }
    }

    /**
     * Send packet to host (from guest)
     */
    sendToHost(packet) {
      packet.senderId = this.myPlayerId;
      if (this.hostConn && this.hostConn.open) {
        try {
          this.hostConn.send(packet);
        } catch (e) {}
      }
      if (this.ws && this.ws.readyState === 1) {
        try {
          this.ws.send(JSON.stringify({ action: 'TO_HOST', roomCode: this.roomCode, packet }));
        } catch (e) {}
      }
      this.sendLocalBroadcast(packet);
    }

    /**
     * Broadcast packet to all connected guests (from host)
     */
    broadcast(packet) {
      if (!this.isHost) return;

      // 1. WebRTC connections
      this.connections.forEach((conn) => {
        if (conn && conn.open) {
          try {
            conn.send(packet);
          } catch (e) {}
        }
      });

      // 2. WebSocket
      if (this.ws && this.ws.readyState === 1) {
        try {
          this.ws.send(JSON.stringify({ action: 'BROADCAST', roomCode: this.roomCode, packet }));
        } catch (e) {}
      }

      // 3. BroadcastChannel
      this.sendLocalBroadcast(packet);
    }

    /**
     * Send packet to a specific peer / player (from host)
     */
    sendToPeer(targetId, packet) {
      const resolvedPlayerId = this.peerToPlayerId.get(targetId) || targetId;
      packet.targetPlayerId = resolvedPlayerId;

      // Resolve connection by peerId or playerId
      let conn = this.connections.get(targetId);
      if (!conn && this.playerIdToPeer.has(targetId)) {
        conn = this.connections.get(this.playerIdToPeer.get(targetId));
      }

      if (conn && conn.open) {
        try {
          conn.send(packet);
        } catch (e) {}
      }

      if (this.ws && this.ws.readyState === 1) {
        try {
          this.ws.send(JSON.stringify({ action: 'TO_PEER', targetPlayerId: resolvedPlayerId, roomCode: this.roomCode, packet }));
        } catch (e) {}
      }

      this.sendLocalBroadcast(packet);
    }

    startDiscoveryBroadcast(roomData) {
      this.roomAnnounceData = {
        roomCode: roomData.roomCode,
        hostName: roomData.hostName,
        hostAvatar: roomData.hostAvatar || '🎨',
        playerCount: roomData.playerCount || 1,
        maxPlayers: roomData.maxPlayers || 6,
        status: roomData.status || 'LOBBY',
        updatedAt: Date.now()
      };

      if (!this.discoveryBc && typeof BroadcastChannel !== 'undefined') {
        try {
          this.discoveryBc = new BroadcastChannel('naghashbashi_discovery');
        } catch (_) {}
      }

      const broadcastAnnounce = () => {
        if (this.isDestroyed || !this.isHost || !this.roomAnnounceData) return;
        this.roomAnnounceData.updatedAt = Date.now();

        // 1. BroadcastChannel (offline multi-tab)
        if (this.discoveryBc) {
          try {
            this.discoveryBc.postMessage({ action: 'ROOM_ANNOUNCE', room: this.roomAnnounceData });
          } catch (_) {}
        }

        // 2. localStorage (distributed storage for same origin)
        try {
          if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem('naghash_active_rooms');
            const rooms = raw ? JSON.parse(raw) : {};
            rooms[this.roomAnnounceData.roomCode] = this.roomAnnounceData;
            localStorage.setItem('naghash_active_rooms', JSON.stringify(rooms));
          }
        } catch (_) {}

        // 3. WebSocket relay
        if (this.ws && this.ws.readyState === 1) {
          try {
            this.ws.send(JSON.stringify({ action: 'ANNOUNCE_ROOM', room: this.roomAnnounceData }));
          } catch (_) {}
        }
      };

      broadcastAnnounce();
      if (this.discoveryInterval) clearInterval(this.discoveryInterval);
      this.discoveryInterval = setInterval(broadcastAnnounce, 3500);
    }

    updateDiscoveryStatus(status, playerCount) {
      if (!this.roomAnnounceData) return;
      if (status !== undefined) this.roomAnnounceData.status = status;
      if (playerCount !== undefined) this.roomAnnounceData.playerCount = playerCount;
      this.roomAnnounceData.updatedAt = Date.now();

      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem('naghash_active_rooms');
          const rooms = raw ? JSON.parse(raw) : {};
          rooms[this.roomAnnounceData.roomCode] = this.roomAnnounceData;
          localStorage.setItem('naghash_active_rooms', JSON.stringify(rooms));
        }
      } catch (_) {}

      if (this.discoveryBc) {
        try {
          this.discoveryBc.postMessage({ action: 'ROOM_ANNOUNCE', room: this.roomAnnounceData });
        } catch (_) {}
      }
    }

    stopDiscoveryBroadcast() {
      if (this.discoveryInterval) {
        clearInterval(this.discoveryInterval);
        this.discoveryInterval = null;
      }

      const roomCode = this.roomCode || (this.roomAnnounceData && this.roomAnnounceData.roomCode);
      if (roomCode) {
        if (this.discoveryBc) {
          try {
            this.discoveryBc.postMessage({ action: 'ROOM_CLOSED', roomCode });
          } catch (_) {}
        }
        try {
          if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem('naghash_active_rooms');
            if (raw) {
              const rooms = JSON.parse(raw);
              delete rooms[roomCode];
              localStorage.setItem('naghash_active_rooms', JSON.stringify(rooms));
            }
          }
        } catch (_) {}

        if (this.ws && this.ws.readyState === 1) {
          try {
            this.ws.send(JSON.stringify({ action: 'CLOSE_ROOM', roomCode }));
          } catch (_) {}
        }
      }

      if (this.discoveryBc) {
        try { this.discoveryBc.close(); } catch (_) {}
        this.discoveryBc = null;
      }
      this.roomAnnounceData = null;
    }

    static getActiveRooms() {
      if (typeof localStorage === 'undefined') return [];
      try {
        const raw = localStorage.getItem('naghash_active_rooms');
        if (!raw) return [];
        const roomsMap = JSON.parse(raw);
        const now = Date.now();
        const active = [];
        let changed = false;

        Object.keys(roomsMap).forEach((code) => {
          const r = roomsMap[code];
          // Consider alive if updated in last 16 seconds
          if (r && (now - (r.updatedAt || 0) < 16000)) {
            active.push(r);
          } else {
            delete roomsMap[code];
            changed = true;
          }
        });

        if (changed) {
          localStorage.setItem('naghash_active_rooms', JSON.stringify(roomsMap));
        }

        return active.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      } catch (e) {
        return [];
      }
    }

    static listenToActiveRooms(callback) {
      if (typeof callback !== 'function') return { unregister() {} };

      let bc = null;
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          bc = new BroadcastChannel('naghashbashi_discovery');
          bc.onmessage = () => {
            callback(NetworkManager.getActiveRooms());
          };
        } catch (_) {}
      }

      const storageListener = (e) => {
        if (e && e.key === 'naghash_active_rooms') {
          callback(NetworkManager.getActiveRooms());
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('storage', storageListener);
      }

      // WebSocket relay discovery when running via server.js
      let discoveryWs = null;
      if (typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || (window.location.port && window.location.hostname !== 'github.io'))) {
        try {
          const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsUrl = `${proto}//${window.location.host}`;
          discoveryWs = new WebSocket(wsUrl);
          discoveryWs.onopen = () => {
            discoveryWs.send(JSON.stringify({ action: 'GET_ROOMS' }));
          };
          discoveryWs.onmessage = (evt) => {
            try {
              const data = JSON.parse(evt.data);
              if (data.action === 'ROOMS_LIST' && Array.isArray(data.rooms)) {
                if (typeof localStorage !== 'undefined') {
                  const raw = localStorage.getItem('naghash_active_rooms');
                  const map = raw ? JSON.parse(raw) : {};
                  data.rooms.forEach(r => { if (r && r.roomCode) map[r.roomCode] = r; });
                  localStorage.setItem('naghash_active_rooms', JSON.stringify(map));
                }
                callback(NetworkManager.getActiveRooms());
              } else if (data.action === 'ROOM_ANNOUNCED' && data.room) {
                if (typeof localStorage !== 'undefined') {
                  const raw = localStorage.getItem('naghash_active_rooms');
                  const map = raw ? JSON.parse(raw) : {};
                  map[data.room.roomCode] = data.room;
                  localStorage.setItem('naghash_active_rooms', JSON.stringify(map));
                }
                callback(NetworkManager.getActiveRooms());
              } else if (data.action === 'ROOM_CLOSED' && data.roomCode) {
                if (typeof localStorage !== 'undefined') {
                  const raw = localStorage.getItem('naghash_active_rooms');
                  if (raw) {
                    const map = JSON.parse(raw);
                    delete map[data.roomCode];
                    localStorage.setItem('naghash_active_rooms', JSON.stringify(map));
                  }
                }
                callback(NetworkManager.getActiveRooms());
              }
            } catch (_) {}
          };
        } catch (_) {}
      }

      return {
        unregister() {
          if (bc) {
            try { bc.close(); } catch (_) {}
          }
          if (typeof window !== 'undefined') {
            window.removeEventListener('storage', storageListener);
          }
          if (discoveryWs) {
            try { discoveryWs.close(); } catch (_) {}
            discoveryWs = null;
          }
        }
      };
    }

    emit(event, ...args) {
      if (typeof this.callbacks[event] === 'function') {
        this.callbacks[event](...args);
      }
    }

    destroy() {
      this.isDestroyed = true;

      this.stopDiscoveryBroadcast();

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      if (typeof window !== 'undefined') {
        if (this.onlineListener) {
          window.removeEventListener('online', this.onlineListener);
          this.onlineListener = null;
        }
        if (this.visibilityListener) {
          document.removeEventListener('visibilitychange', this.visibilityListener);
          this.visibilityListener = null;
        }
      }

      if (this.joinHandshakeInterval) {
        clearInterval(this.joinHandshakeInterval);
        this.joinHandshakeInterval = null;
      }
      if (this.keepaliveInterval) {
        clearInterval(this.keepaliveInterval);
        this.keepaliveInterval = null;
      }
      this.disconnectTimers.forEach(t => clearTimeout(t));
      this.disconnectTimers.clear();
      this.peerLastActivity.clear();

      // Send explicit leave signal before closing
      try {
        const leavePacket = { type: 'LEAVE', playerId: this.myPlayerId };
        if (!this.isHost) {
          this.sendToHost(leavePacket);
        } else {
          this.broadcast(leavePacket);
        }
      } catch (e) {}

      if (this.ws) {
        try { this.ws.close(); } catch (e) {}
        this.ws = null;
      }

      if (this.broadcastChannel) {
        try { this.broadcastChannel.close(); } catch (e) {}
        this.broadcastChannel = null;
      }

      if (this.hostConn) {
        try { this.hostConn.close(); } catch (e) {}
        this.hostConn = null;
      }

      this.connections.forEach((conn) => {
        try { conn.close(); } catch (e) {}
      });
      this.connections.clear();
      this.peerToPlayerId.clear();
      this.playerIdToPeer.clear();

      if (this.peer) {
        try { this.peer.destroy(); } catch (e) {}
        this.peer = null;
      }
    }
  }

  return {
    PEER_PREFIX,
    RTC_CONFIG,
    formatRoomPeerId,
    NetworkManager
  };
});
