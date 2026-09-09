/**
 * نقاشباشی (Naghash Bashi) - P2P Multiplayer Networking Engine
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

  function formatRoomPeerId(code) {
    const clean = (code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${PEER_PREFIX}${clean}`;
  }

  class NetworkManager {
    constructor(callbacks = {}) {
      this.callbacks = callbacks;
      // callbacks:
      // onConnected(peerId)
      // onPlayerJoined(player)
      // onPlayerLeft(playerId)
      // onPlayerDisconnected(playerId)
      // onRoomState(state)
      // onDrawAction(action)
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
      this.connections = new Map();     // peerId -> DataConnection
      this.peerToPlayerId = new Map();  // peerId -> playerId
      this.playerIdToPeer = new Map();  // playerId -> peerId
      this.hostConn = null;             // For guest: DataConnection to host
      this.broadcastChannel = null;     // Local BroadcastChannel
      this.ws = null;                   // Local WebSocket connection if server.js is active
      this.isDestroyed = false;
    }

    static generateRoomCode() {
      const num = Math.floor(100 + Math.random() * 900);
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

      const targetId = formatRoomPeerId(roomCode);
      this.setupBroadcastChannel(roomCode);
      this.setupWebSocket(roomCode);

      return new Promise((resolve) => {
        if (typeof Peer === 'undefined') {
          console.warn('PeerJS not loaded. Operating in Local/BroadcastChannel mode.');
          this.emit('onConnected', 'local-host');
          return resolve('local-host');
        }

        try {
          this.peer = new Peer(targetId, {
            debug: 1,
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
              ]
            }
          });

          this.peer.on('open', (id) => {
            console.log('Host PeerJS connected with ID:', id);
            this.emit('onConnected', id);
            resolve(id);
          });

          this.peer.on('connection', (conn) => {
            this.handleIncomingConnection(conn);
          });

          this.peer.on('error', (err) => {
            console.warn('PeerJS Host Error:', err);
            if (err.type === 'unavailable-id') {
              this.emit('onError', 'شناسه این اتاق در حال حاضر مشغول است. کد جدیدی انتخاب کنید.');
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
     * Join an existing room as guest
     */
    initGuest(roomCode, guestPlayer) {
      this.isHost = false;
      this.roomCode = roomCode;
      this.myPlayerId = guestPlayer.id;

      const hostPeerId = formatRoomPeerId(roomCode);
      this.setupBroadcastChannel(roomCode);
      this.setupWebSocket(roomCode);

      return new Promise((resolve) => {
        if (typeof Peer === 'undefined') {
          console.warn('PeerJS not loaded. Using BroadcastChannel for local join.');
          this.sendLocalBroadcast({ type: 'JOIN', player: guestPlayer });
          return resolve(true);
        }

        try {
          this.peer = new Peer({
            debug: 1,
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
              ]
            }
          });

          this.peer.on('open', (myId) => {
            console.log('Guest peer opened with ID:', myId);
            const conn = this.peer.connect(hostPeerId, { reliable: true });

            conn.on('open', () => {
              console.log('Connected to host peer:', hostPeerId);
              this.hostConn = conn;
              this.sendToHost({ type: 'JOIN', player: guestPlayer });
              resolve(true);
            });

            conn.on('data', (data) => {
              this.handlePacket(data);
            });

            conn.on('close', () => {
              console.log('Connection to host closed');
              this.emit('onError', 'ارتباط با میزبان بازی قطع شد.');
              this.emit('onPlayerLeft', 'host');
            });

            conn.on('error', (err) => {
              console.warn('Guest conn error:', err);
              this.sendLocalBroadcast({ type: 'JOIN', player: guestPlayer });
              resolve(false);
            });
          });

          this.peer.on('error', (err) => {
            console.warn('Guest Peer error:', err);
            this.sendLocalBroadcast({ type: 'JOIN', player: guestPlayer });
            resolve(false);
          });
        } catch (e) {
          console.warn('Peer error, fallback to BC:', e);
          this.sendLocalBroadcast({ type: 'JOIN', player: guestPlayer });
          resolve(false);
        }
      });
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
                this.emit('onPlayerDisconnected', data.playerId);
              }
            }
          } catch (e) {}
        };

        ws.onclose = () => {
          this.ws = null;
        };

        ws.onerror = () => {
          this.ws = null;
        };
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

      conn.on('open', () => {
        console.log('Host accepted peer connection from:', peerId);
        this.connections.set(peerId, conn);
      });

      conn.on('data', (data) => {
        this.handleGuestMessage(peerId, data);
      });

      conn.on('close', () => {
        console.log('Peer disconnected:', peerId);
        const playerId = this.peerToPlayerId.get(peerId);
        this.connections.delete(peerId);
        if (playerId) {
          this.playerIdToPeer.delete(playerId);
          this.peerToPlayerId.delete(peerId);
        }
        this.emit('onPlayerDisconnected', playerId || peerId);
      });

      conn.on('error', (err) => {
        console.warn('Peer conn error:', err);
      });
    }

    /**
     * Host receives message from a guest
     */
    handleGuestMessage(fromPeerId, packet) {
      if (packet) {
        if (packet.senderId) this.registerPlayerPeer(packet.senderId, fromPeerId);
        if (packet.player && packet.player.id) this.registerPlayerPeer(packet.player.id, fromPeerId);
        if (packet.type === 'LEAVE') {
          const pId = packet.playerId || packet.senderId;
          this.emit('onPlayerDisconnected', pId);
          return;
        }
      }
      this.emit('onHostReceivedPacket', { fromPeerId, packet });
    }

    /**
     * Guest receives packet from host
     */
    handlePacket(packet) {
      if (!packet) return;

      // If targeted to someone else, ignore
      if (packet.targetPlayerId && packet.targetPlayerId !== this.myPlayerId) {
        return;
      }

      switch (packet.type) {
        case 'ROOM_STATE':
          this.emit('onRoomState', packet.state);
          break;
        case 'DRAW_ACTION':
          this.emit('onDrawAction', packet.action);
          break;
        case 'CHAT':
          this.emit('onChatMessage', packet);
          break;
        case 'WORD_CHOICES':
          this.emit('onWordChoices', packet.choices);
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
      packet.targetPlayerId = targetId;

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
          this.ws.send(JSON.stringify({ action: 'TO_PEER', targetPlayerId: targetId, roomCode: this.roomCode, packet }));
        } catch (e) {}
      }

      this.sendLocalBroadcast(packet);
    }

    emit(event, ...args) {
      if (typeof this.callbacks[event] === 'function') {
        this.callbacks[event](...args);
      }
    }

    destroy() {
      this.isDestroyed = true;

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
        try {
          this.ws.close();
        } catch (e) {}
        this.ws = null;
      }

      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.close();
        } catch (e) {}
        this.broadcastChannel = null;
      }

      if (this.hostConn) {
        try {
          this.hostConn.close();
        } catch (e) {}
      }

      this.connections.forEach((conn) => {
        try {
          conn.close();
        } catch (e) {}
      });
      this.connections.clear();
      this.peerToPlayerId.clear();
      this.playerIdToPeer.clear();

      if (this.peer) {
        try {
          this.peer.destroy();
        } catch (e) {}
        this.peer = null;
      }
    }
  }

  return {
    PEER_PREFIX,
    formatRoomPeerId,
    NetworkManager
  };
});
