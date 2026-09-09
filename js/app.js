/**
 * نقاش‌باشی (Naghash Bashi) - Main Application Controller
 * Coordinates UI views, Canvas interactions, Web Audio sound effects,
 * P2P WebRTC networking, Game Room state transitions, and Bot companions.
 */

(function () {
  'use strict';

  // Available avatars
  const AVATARS = ['🎨', '🦁', '🐱', '🚀', '☕', '🤖', '🦊', '👑'];

  // Retrieve or generate stable persistent player ID
  let storedPlayerId = null;
  try {
    if (typeof localStorage !== 'undefined') {
      storedPlayerId = localStorage.getItem('naghash_player_id');
      if (!storedPlayerId) {
        storedPlayerId = 'p_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('naghash_player_id', storedPlayerId);
      }
    }
  } catch (_) {}

  // Global app state
  const state = {
    myPlayerId: storedPlayerId || ('p_' + Math.random().toString(36).substr(2, 9)),
    myName: '',
    myAvatar: '🎨',
    isHost: false,
    roomCode: null,
    totalRounds: 3,

    gameRoom: null,       // If host, holds GameRoom instance
    network: null,        // NetworkManager instance
    canvas: null,         // DrawingCanvas instance
    activeBots: [],       // Bot companions

    currentView: 'lobby', // 'lobby', 'waiting', 'game', 'gameover'
    isDrawer: false,
    currentWord: null,
    turnTimerInterval: null,
    wordSelectionTimeout: null,
    roomsRefreshInterval: null,
    roomDiscoverySub: null,
    deferredPrompt: null,
    unreadChatCount: 0
  };

  // DOM Elements
  const els = {};

  function initElements() {
    // Views
    els.screenLobby = document.getElementById('screen-lobby');
    els.screenWaiting = document.getElementById('screen-waiting');
    els.screenGame = document.getElementById('screen-game');
    els.screenGameOver = document.getElementById('screen-gameover');

    // Lobby
    els.playerNameInput = document.getElementById('player-name-input');
    els.nameError = document.getElementById('name-error');
    els.avatarGrid = document.getElementById('avatar-grid');
    els.appContainer = document.getElementById('app-container');
    els.btnCreateRoom = document.getElementById('btn-create-room');
    els.roomCodeInput = document.getElementById('room-code-input');
    els.joinRoomForm = document.getElementById('join-room-form');
    els.btnJoinRoom = document.getElementById('btn-join-room');
    els.btnPracticeBots = document.getElementById('btn-practice-bots');
    els.installBtn = document.getElementById('btn-install-pwa');

    // Active Rooms Discovery
    els.activeRoomsSection = document.getElementById('active-rooms-section');
    els.activeRoomsList = document.getElementById('active-rooms-list');
    els.activeRoomsEmpty = document.getElementById('active-rooms-empty');
    els.btnRefreshRooms = document.getElementById('btn-refresh-rooms');

    // Waiting Room
    els.displayRoomCode = document.getElementById('display-room-code');
    els.btnCopyCode = document.getElementById('btn-copy-code');
    els.btnCopyLink = document.getElementById('btn-copy-link');
    els.waitingPlayerSlots = document.getElementById('waiting-player-slots');
    els.waitingCount = document.getElementById('waiting-count');
    els.hostControls = document.getElementById('host-controls');
    els.roundsSelect = document.getElementById('rounds-select');
    els.btnAddBot = document.getElementById('btn-add-bot');
    els.btnStartGame = document.getElementById('btn-start-game');
    els.btnLeaveWaiting = document.getElementById('btn-leave-waiting');

    // Game Screen
    els.roundIndicator = document.getElementById('round-indicator');
    els.turnTimer = document.getElementById('turn-timer');
    els.timerText = document.getElementById('timer-text');
    els.wordDisplay = document.getElementById('word-display');
    els.wordCategoryBadge = document.getElementById('word-category-badge');
    els.btnMute = document.getElementById('btn-mute');
    els.btnGameMute = document.getElementById('btn-game-mute');
    els.btnLeaveGame = document.getElementById('btn-leave-game');
    els.scoreboardList = document.getElementById('scoreboard-list');

    // Mobile Top Bar & Drawer Controls
    els.btnToggleScores = document.getElementById('btn-toggle-scores');
    els.btnToggleChat = document.getElementById('btn-toggle-chat');
    els.btnCloseScores = document.getElementById('btn-close-scoreboard');
    els.btnCloseChat = document.getElementById('btn-close-chat');
    els.drawerBackdrop = document.getElementById('drawer-backdrop');
    els.sidebarScoreboard = document.getElementById('sidebar-scoreboard');
    els.sidebarChat = document.getElementById('sidebar-chat');
    els.mobilePlayerRibbon = document.getElementById('mobile-player-ribbon');
    els.mobileMyRank = document.getElementById('mobile-my-rank');
    els.chatUnreadBadge = document.getElementById('chat-unread-badge');

    // Canvas & Tools
    els.drawingCanvas = document.getElementById('drawing-canvas');
    els.drawingToolbar = document.getElementById('drawing-toolbar');
    els.paletteColors = document.querySelectorAll('.palette-color');
    els.brushSizes = document.querySelectorAll('.brush-size-btn');
    els.toolButtons = document.querySelectorAll('.tool-btn');
    els.btnClear = document.getElementById('tool-clear');
    els.btnUndo = document.getElementById('tool-undo');

    // Guesser Toolbar & Live Ticker
    els.guesserToolbar = document.getElementById('guesser-toolbar');
    els.recentChatTicker = document.getElementById('recent-chat-ticker');
    els.quickGuessForm = document.getElementById('quick-guess-form');
    els.quickGuessInput = document.getElementById('quick-guess-input');
    els.quickGuessSendBtn = document.getElementById('quick-guess-send-btn');

    // Chat
    els.chatMessages = document.getElementById('chat-messages');
    els.chatForm = document.getElementById('chat-form');
    els.chatInput = document.getElementById('chat-input');
    els.chatSendBtn = document.getElementById('chat-send-btn');

    // Overlays
    els.overlayWordChoice = document.getElementById('overlay-word-choice');
    els.wordChoicesContainer = document.getElementById('word-choices-container');
    els.wordChoiceTimer = document.getElementById('word-choice-timer');
    els.overlayWaitingChoice = document.getElementById('overlay-waiting-choice');
    els.overlayRoundEnd = document.getElementById('overlay-round-end');
    els.roundEndWord = document.getElementById('round-end-word');
    els.roundEndScores = document.getElementById('round-end-scores');

    // Game Over
    els.podiumContainer = document.getElementById('podium-container');
    els.gameOverScores = document.getElementById('game-over-scores');
    els.btnPlayAgain = document.getElementById('btn-play-again');
    els.btnBackLobby = document.getElementById('btn-back-lobby');
  }

  function closeAllDrawers() {
    if (els.sidebarScoreboard) els.sidebarScoreboard.classList.remove('open');
    if (els.sidebarChat) els.sidebarChat.classList.remove('open');
    if (els.drawerBackdrop) els.drawerBackdrop.classList.remove('active');
  }

  function toggleScoreboardDrawer() {
    const isOpen = els.sidebarScoreboard && els.sidebarScoreboard.classList.contains('open');
    closeAllDrawers();
    if (!isOpen && els.sidebarScoreboard) {
      els.sidebarScoreboard.classList.add('open');
      if (els.drawerBackdrop) els.drawerBackdrop.classList.add('active');
      if (navigator.vibrate) navigator.vibrate([20]);
    }
  }

  function toggleChatDrawer() {
    const isOpen = els.sidebarChat && els.sidebarChat.classList.contains('open');
    closeAllDrawers();
    if (!isOpen && els.sidebarChat) {
      els.sidebarChat.classList.add('open');
      if (els.drawerBackdrop) els.drawerBackdrop.classList.add('active');
      state.unreadChatCount = 0;
      if (els.chatUnreadBadge) els.chatUnreadBadge.style.display = 'none';
      if (navigator.vibrate) navigator.vibrate([20]);
    }
  }

  function updateToolbarsState() {
    if (els.drawingToolbar) {
      els.drawingToolbar.style.display = state.isDrawer ? 'flex' : 'none';
    }
    if (els.guesserToolbar) {
      // For guessers: clear inline style so CSS media queries control visibility (mobile=flex, desktop=none)
      els.guesserToolbar.style.display = state.isDrawer ? 'none' : '';
    }
  }

  function updateInputState() {
    const isDrawing = state.isDrawer;
    if (els.chatInput) {
      els.chatInput.disabled = isDrawing;
      els.chatInput.placeholder = isDrawing ? 'شما در حال نقاشی هستید 🎨' : 'حدس خود را اینجا بنویسید...';
    }
    if (els.chatSendBtn) {
      els.chatSendBtn.disabled = isDrawing;
    }
    if (els.quickGuessInput) {
      els.quickGuessInput.disabled = isDrawing;
      els.quickGuessInput.placeholder = isDrawing ? 'شما در حال نقاشی هستید 🎨' : 'حدس خود را اینجا بنویسید...';
    }
    if (els.quickGuessSendBtn) {
      els.quickGuessSendBtn.disabled = isDrawing;
    }
  }

  function showView(viewName) {
    if (state.currentView === viewName && els[`screen${capitalize(viewName)}`]?.classList.contains('active')) {
      return;
    }
    state.currentView = viewName;
    els.screenLobby.classList.toggle('active', viewName === 'lobby');
    els.screenWaiting.classList.toggle('active', viewName === 'waiting');
    els.screenGame.classList.toggle('active', viewName === 'game');
    els.screenGameOver.classList.toggle('active', viewName === 'gameover');

    if (els.appContainer) {
      els.appContainer.classList.toggle('in-game', viewName === 'game');
    }

    closeAllDrawers();

    if (viewName === 'game') {
      updateToolbarsState();
      updateInputState();
      if (state.canvas) {
        setTimeout(() => {
          state.canvas.setupCanvas();
        }, 60);
      }
    }
  }

  function capitalize(s) {
    if (!s) return '';
    if (s === 'gameover') return 'GameOver';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Profile & Avatars ---
  function initProfile() {
    const savedName = localStorage.getItem('naghash_player_name');
    const savedAvatar = localStorage.getItem('naghash_player_avatar');

    if (savedName) {
      state.myName = savedName;
      els.playerNameInput.value = savedName;
    } else {
      const defaultNames = ['نقاش ماهر', 'استاد قلم‌مو', 'هنرمند خلاق', 'پیکاسوی کوچک'];
      state.myName = defaultNames[Math.floor(Math.random() * defaultNames.length)];
      els.playerNameInput.value = state.myName;
    }

    if (savedAvatar && AVATARS.includes(savedAvatar)) {
      state.myAvatar = savedAvatar;
    }

    renderAvatarPicker();

    // Check URL query param: ?room=NB-1234
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
      els.roomCodeInput.value = roomFromUrl.toUpperCase();
      notify('کد اتاق از لینک دریافت شد! نام خود را انتخاب کرده و دکمه ورود به اتاق را لمس کنید.', 'info');
    }
  }

  function renderAvatarPicker() {
    els.avatarGrid.innerHTML = '';
    AVATARS.forEach((av) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'avatar-opt avatar-choice-btn' + (av === state.myAvatar ? ' selected' : '');
      btn.textContent = av;
      btn.setAttribute('aria-label', `انتخاب آواتار ${av}`);
      btn.addEventListener('click', () => {
        state.myAvatar = av;
        localStorage.setItem('naghash_player_avatar', av);
        if (navigator.vibrate) navigator.vibrate([15]);
        renderAvatarPicker();
      });
      els.avatarGrid.appendChild(btn);
    });
  }

  function validatePlayerName() {
    const raw = els.playerNameInput.value.trim();
    if (!raw) {
      els.nameError.textContent = 'لطفاً نام خود را وارد کنید.';
      els.nameError.style.display = 'block';
      return false;
    }

    if (typeof ProfanityFilter !== 'undefined' && typeof ProfanityFilter.validateName === 'function') {
      const check = ProfanityFilter.validateName(raw);
      if (!check.isValid) {
        els.nameError.textContent = check.reason || 'نام وارد شده غیرمجاز است.';
        els.nameError.style.display = 'block';
        return false;
      }
    }

    els.nameError.style.display = 'none';
    state.myName = raw;
    localStorage.setItem('naghash_player_name', raw);
    saveSession({ name: raw });
    return true;
  }

  // --- Persian Number Helper ---
  function toPersianDigits(n) {
    if (n === null || n === undefined) return '';
    return String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  }

  // --- Session Management & Persistence ---
  function saveSession(data = {}) {
    try {
      const current = getSession() || {};
      const updated = {
        ...current,
        playerId: state.myPlayerId,
        name: state.myName,
        avatar: state.myAvatar,
        roomCode: state.roomCode,
        isHost: state.isHost,
        view: state.currentView,
        roomSnapshot: state.isHost && state.gameRoom ? state.gameRoom.getStateSnapshot() : (current.roomSnapshot || null),
        timestamp: Date.now(),
        ...data
      };
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('naghash_active_session', JSON.stringify(updated));
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('naghash_active_session', JSON.stringify(updated));
      }
    } catch (_) {}
  }

  function getSession() {
    try {
      let raw = null;
      if (typeof sessionStorage !== 'undefined') {
        raw = sessionStorage.getItem('naghash_active_session');
      }
      if (!raw && typeof localStorage !== 'undefined') {
        raw = localStorage.getItem('naghash_active_session');
      }
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && (Date.now() - (parsed.timestamp || 0) < 2 * 3600 * 1000)) {
        return parsed;
      }
    } catch (_) {}
    return null;
  }

  function clearSession() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('naghash_active_session');
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('naghash_active_session');
      }
    } catch (_) {}
  }

  // --- Live Active Rooms Discovery ---
  function initRoomDiscovery() {
    renderActiveRoomsList(NetworkEngine.NetworkManager.getActiveRooms());

    if (state.roomDiscoverySub) {
      state.roomDiscoverySub.unregister();
    }
    state.roomDiscoverySub = NetworkEngine.NetworkManager.listenToActiveRooms((rooms) => {
      if (state.currentView === 'lobby') {
        renderActiveRoomsList(rooms);
      }
    });

    if (state.roomsRefreshInterval) clearInterval(state.roomsRefreshInterval);
    state.roomsRefreshInterval = setInterval(() => {
      if (state.currentView === 'lobby') {
        renderActiveRoomsList(NetworkEngine.NetworkManager.getActiveRooms());
      }
    }, 3500);
  }

  function renderActiveRoomsList(rooms = []) {
    if (!els.activeRoomsList || !els.activeRoomsEmpty) return;

    if (!rooms || rooms.length === 0) {
      els.activeRoomsList.innerHTML = '';
      els.activeRoomsEmpty.style.display = 'flex';
      return;
    }

    els.activeRoomsEmpty.style.display = 'none';
    els.activeRoomsList.innerHTML = '';

    rooms.forEach((r) => {
      const item = document.createElement('div');
      item.className = 'active-room-item';

      const isLobby = r.status === 'LOBBY';
      const statusText = isLobby ? 'در انتظار بازیکن ⏳' : 'در حال مسابقه 🎨';
      const statusClass = isLobby ? 'status-lobby' : 'status-ingame';
      const pCount = r.playerCount || 1;
      const maxP = r.maxPlayers || 6;
      const isFull = pCount >= maxP;

      item.innerHTML = `
        <div class="room-item-info">
          <span class="room-item-code">${escapeHtml(r.roomCode)}</span>
          <span class="room-item-host">${escapeHtml(r.hostAvatar || '🎨')} ${escapeHtml(r.hostName || 'میزبان')}</span>
          <div class="room-item-meta">
            <span class="room-players-badge">${toPersianDigits(pCount)} از ${toPersianDigits(maxP)} نفر</span>
            <span class="room-status-badge ${statusClass}">${statusText}</span>
          </div>
        </div>
        <button type="button" class="btn btn-secondary btn-quick-join" data-code="${escapeHtml(r.roomCode)}" ${isFull ? 'disabled' : ''}>
          ${isFull ? 'ظرفیت تکمیل 🔒' : 'ورود سریع 🚀'}
        </button>
      `;

      const btnJoin = item.querySelector('.btn-quick-join');
      if (btnJoin && !isFull) {
        btnJoin.addEventListener('click', () => {
          if (els.roomCodeInput) {
            els.roomCodeInput.value = r.roomCode;
          }
          joinRoom(r.roomCode);
        });
      }

      els.activeRoomsList.appendChild(item);
    });
  }

  // --- Audio Mute Button ---
  function updateMuteButton() {
    const isMuted = SoundEngine.getMuted();
    const icon = isMuted ? '🔇' : '🔊';
    const tip = isMuted ? 'صدای بازی قطع است' : 'صدای بازی وصل است';
    if (els.btnMute) {
      els.btnMute.textContent = icon;
      els.btnMute.setAttribute('title', tip);
    }
    if (els.btnGameMute) {
      els.btnGameMute.textContent = icon;
      els.btnGameMute.setAttribute('title', tip);
    }
  }

  // --- Network Initialization ---
  function setupNetwork(isHost) {
    if (state.network) {
      state.network.destroy();
    }

    state.network = new NetworkEngine.NetworkManager({
      onConnected: (peerId) => {
        console.log('Network connected:', peerId);
      },
      onConnecting: (status) => {
        notify(status.message, 'info');
      },
      onPlayerJoined: (player) => {
        SoundEngine.playTurnStart();
        notify(`👋 ${player.name} به اتاق پیوست!`, 'info');
        updateWaitingRoomUI();
      },
      onPlayerLeft: (playerId) => {
        handlePlayerLeft(playerId);
      },
      onPlayerTemporarilyDisconnected: (playerId) => {
        handlePlayerTemporarilyDisconnected(playerId);
      },
      onPlayerDisconnected: (playerId) => {
        handlePlayerLeft(playerId);
      },
      onCanvasFullSync: (packet) => {
        if (state.canvas && Array.isArray(packet.history)) {
          state.canvas.applyRemoteAction({ type: 'FULL_SYNC', history: packet.history });
        }
      },
      onPlayAgain: (packet) => {
        handlePlayAgainGuest(packet);
      },
      onRoomState: (roomState) => {
        handleSyncRoomState(roomState);
      },
      onGameStarted: (data) => {
        showView('game');
        SoundEngine.playTurnStart();
        notify('🎮 مسابقه آغاز شد!', 'info');
      },
      onDrawAction: (action) => {
        if (!state.isDrawer && state.canvas) {
          state.canvas.applyRemoteAction(action);
          SoundEngine.playDrawSwoosh();
        }
      },
      onChatMessage: (msg) => {
        renderChatMessage(msg);
      },
      onWordChoices: (choices) => {
        showWordChoiceModal(choices);
      },
      onRoundStart: (data) => {
        handleRoundStart(data);
      },
      onDrawerSecretWord: (data) => {
        handleDrawerSecretWord(data);
      },
      onTick: (seconds, masked) => {
        handleTick(seconds, masked);
      },
      onRoundEnd: (data) => {
        handleRoundEnd(data);
      },
      onGameOver: (data) => {
        handleGameOver(data);
      },
      onError: (err) => {
        if (state.isHost && typeof err === 'string' && err.includes('مشغول است')) {
          state.roomCode = NetworkEngine.NetworkManager.generateRoomCode();
          if (state.gameRoom) state.gameRoom.roomCode = state.roomCode;
          els.displayRoomCode.textContent = state.roomCode;
          notify(`شناسه قبلی مشغول بود. کد جدید اتاق: ${state.roomCode}`, 'info');
          const hostPlayer = { id: state.myPlayerId, name: state.myName, avatar: state.myAvatar, isHost: true };
          state.network.initHost(state.roomCode, hostPlayer);
        } else {
          notify(err, 'error');
        }
      },
      onHostReceivedPacket: ({ fromPeerId, packet }) => {
        handleHostPacket(fromPeerId, packet);
      }
    });
  }

  // --- Host Packet Handling ---
  function handleHostPacket(fromPeerId, packet) {
    if (!state.isHost || !state.gameRoom) return;

    switch (packet.type) {
      case 'JOIN': {
        const res = state.gameRoom.addPlayer({
          id: packet.player.id,
          name: packet.player.name,
          avatar: packet.player.avatar
        });

        if (!res.success) {
          state.network.sendToPeer(fromPeerId, {
            type: 'REJECT',
            message: res.message
          });
          return;
        }

        // Send direct state snapshot to joining/reconnecting peer
        state.network.sendToPeer(fromPeerId, {
          type: 'ROOM_STATE',
          state: state.gameRoom.getStateSnapshot()
        });

        // Broadcast full state to all peers
        broadcastRoomState();
        updateWaitingRoomUI();

        if (state.network && state.isHost) {
          state.network.updateDiscoveryStatus(state.gameRoom.status, state.gameRoom.players.length);
        }

        if (res.isReconnect) {
          SoundEngine.playTurnStart();
          notify(`🔄 ${packet.player.name} مجدداً به مسابقه متصل شد!`, 'success');
          const rejoinNotice = {
            sender: 'سیستم',
            avatar: '🔄',
            text: `${packet.player.name} مجدداً به بازی متصل شد.`,
            isSystem: true
          };
          state.network.broadcast({ type: 'CHAT', ...rejoinNotice });
          renderChatMessage(rejoinNotice);

          // Catch up reconnecting player if in CHOOSING phase and player is drawer
          if (state.gameRoom.status === 'CHOOSING') {
            const drawer = state.gameRoom.getDrawer();
            if (drawer && drawer.id === packet.player.id && state.gameRoom.wordChoices && state.gameRoom.wordChoices.length > 0) {
              state.network.sendToPeer(fromPeerId, {
                type: 'WORD_CHOICES',
                choices: state.gameRoom.wordChoices
              });
            }
          }

          // Catch up reconnecting player if in active drawing/guessing phase
          if (state.gameRoom.status === 'DRAWING' || state.gameRoom.status === 'ROUND_END') {
            const drawer = state.gameRoom.getDrawer();
            if (drawer && drawer.id === packet.player.id) {
              state.network.sendToPeer(fromPeerId, {
                type: 'DRAWER_SECRET_WORD',
                drawerId: drawer.id,
                wordObj: state.gameRoom.currentWord,
                timerSeconds: state.gameRoom.timerSeconds,
                isReconnect: true
              });
            }

            // Immediately send complete canvas history playback
            const history = (state.canvas && state.canvas.history && state.canvas.history.length > 0)
              ? state.canvas.history
              : state.gameRoom.getCanvasHistory();
            if (history && history.length > 0) {
              state.network.sendToPeer(fromPeerId, {
                type: 'CANVAS_FULL_SYNC',
                history
              });
            }
          }
        } else {
          SoundEngine.playTurnStart();
          notify(`👋 ${packet.player.name} وارد اتاق شد!`, 'info');
        }
        break;
      }
      case 'REQUEST_PLAY_AGAIN': {
        handleRestartGameHost();
        break;
      }
      case 'LEAVE': {
        handlePlayerLeft(packet.playerId || packet.senderId);
        updateWaitingRoomUI();
        break;
      }
      case 'DRAW_ACTION': {
        if (state.gameRoom) {
          state.gameRoom.recordDrawingAction(packet.action);
        }
        // Broadcast drawing action to all other peers
        state.network.broadcast({
          type: 'DRAW_ACTION',
          action: packet.action
        });
        if (!state.isDrawer && state.canvas) {
          state.canvas.applyRemoteAction(packet.action);
          SoundEngine.playDrawSwoosh();
        }
        break;
      }
      case 'WORD_SELECTED': {
        const result = state.gameRoom.selectWord(packet.word);
        startDrawingPhaseHost(result);
        break;
      }
      case 'GUESS': {
        const res = state.gameRoom.submitGuess(packet.senderId, packet.text);
        if (res.type === 'CORRECT') {
          SoundEngine.playCorrectGuess();
          const chatMsg = {
            sender: 'سیستم',
            avatar: '🎉',
            text: `${res.player.name} کلمه را درست حدس زد! (+${res.points} امتیاز)`,
            isSystem: true,
            isCorrect: true
          };
          state.network.broadcast({ type: 'CHAT', ...chatMsg });
          renderChatMessage(chatMsg);
          broadcastRoomState();

          if (res.allGuessed) {
            handleRoundEndHost(res.turnEndData);
          }
        } else if (res.type === 'CLOSE') {
          // Send hint only to sender
          state.network.sendToPeer(fromPeerId, {
            type: 'CHAT',
            sender: 'سیستم',
            avatar: '💡',
            text: 'نزدیک بود! چند حرف بیشتر دقت کن...',
            isSystem: true
          });
        } else if (res.type === 'DRAWER_SPOILER_BLOCKED') {
          state.network.sendToPeer(fromPeerId, {
            type: 'CHAT',
            sender: 'سیستم',
            avatar: '⚠️',
            text: 'نقاش نمی‌تواند کلمه را در چت فاش کند!',
            isSystem: true
          });
        } else if (res.type === 'ALREADY_GUESSED_SPOILER') {
          state.network.sendToPeer(fromPeerId, {
            type: 'CHAT',
            sender: 'سیستم',
            avatar: '🤫',
            text: 'شما قبلاً حدس زده‌اید، لطفاً پاسخ را لو ندهید!',
            isSystem: true
          });
        } else if (res.type === 'ALREADY_GUESSED') {
          const chatMsg = {
            sender: res.player.name,
            avatar: res.player.avatar,
            text: `[حدس زده] ${res.text}`
          };
          state.network.broadcast({ type: 'CHAT', ...chatMsg });
          renderChatMessage(chatMsg);
        } else if (res.type === 'CHAT') {
          const chatMsg = {
            sender: res.player.name,
            avatar: res.player.avatar,
            text: res.text
          };
          state.network.broadcast({ type: 'CHAT', ...chatMsg });
          renderChatMessage(chatMsg);
        }
        break;
      }
    }
  }

  function handlePlayerLeft(playerId) {
    if (!playerId) return;

    if (state.isHost && state.gameRoom) {
      const removed = state.gameRoom.removePlayer(playerId);
      if (!removed) return;

      notify(`👋 ${removed.name} از اتاق خارج شد.`, 'info');
      const leaveNotice = {
        sender: 'سیستم',
        avatar: '👋',
        text: `${removed.name} از بازی خارج شد.`,
        isSystem: true
      };
      state.network.broadcast({ type: 'CHAT', ...leaveNotice });
      renderChatMessage(leaveNotice);

      if (removed.roomStatus === 'LOBBY' || state.gameRoom.players.length < RoomLogic.MIN_PLAYERS) {
        state.activeBots.forEach(b => b.cancelActions());
        clearInterval(state.turnTimerInterval);
        notify('تعداد بازیکنان کافی نیست. بازی به اتاق انتظار منتقل شد.', 'info');
        showView('waiting');
        updateWaitingRoomUI();
        broadcastRoomState();
        return;
      }

      if (removed.drawerLeft) {
        state.activeBots.forEach(b => b.cancelActions());
        clearInterval(state.turnTimerInterval);
        notify('نقاش از بازی خارج شد. نوبت به بازیکن بعدی منتقل می‌شود...', 'info');
        if (removed.isGameOver) {
          state.network.broadcast({ type: 'GAME_OVER', podium: removed.podium });
          handleGameOver({ podium: removed.podium });
        } else {
          startWordSelectionPhaseHost();
        }
        return;
      }

      updateWaitingRoomUI();
      broadcastRoomState();
    } else {
      notify('یک بازیکن از اتاق خارج شد.', 'info');
    }
  }

  function handlePlayerTemporarilyDisconnected(playerId) {
    if (!playerId) return;
    if (state.isHost && state.gameRoom) {
      const res = state.gameRoom.markPlayerDisconnected(playerId);
      if (!res || !res.player) return;

      const notice = {
        sender: 'سیستم',
        avatar: '⏳',
        text: `ارتباط ${res.player.name} موقتاً قطع شد. مهلت اتصال مجدد: ۲۸ ثانیه.`,
        isSystem: true
      };
      state.network.broadcast({ type: 'CHAT', ...notice });
      renderChatMessage(notice);
      notify(`⚠️ ارتباط ${res.player.name} موقتاً قطع شد. در حال انتظار برای اتصال مجدد...`, 'warning');

      broadcastRoomState();
      updateWaitingRoomUI();
    }
  }

  function handleRestartGameHost() {
    if (!state.isHost || !state.gameRoom) return;

    if (typeof ConfettiEngine !== 'undefined') {
      ConfettiEngine.stop();
    }
    state.isDrawer = false;
    state.currentWord = null;
    els.overlayWordChoice.classList.remove('active');
    els.overlayWaitingChoice.classList.remove('active');
    els.overlayRoundEnd.classList.remove('active');
    if (state.canvas) {
      state.canvas.clear(false);
      state.canvas.setInteractive(false);
    }
    closeAllDrawers();

    state.gameRoom.restartGame();
    const snap = state.gameRoom.getStateSnapshot();

    state.network.broadcast({
      type: 'PLAY_AGAIN',
      state: snap
    });

    if (state.network && state.isHost) {
      state.network.updateDiscoveryStatus('LOBBY', state.gameRoom.players.length);
    }

    showView('waiting');
    updateWaitingRoomUI();
    saveSession({ currentView: 'waiting' });
    notify('🔄 بازی مجدد آغاز شد! همه بازیکنان به اتاق انتظار بازگشتند.', 'success');
  }

  function handlePlayAgainGuest(packet) {
    if (typeof ConfettiEngine !== 'undefined') {
      ConfettiEngine.stop();
    }
    state.isDrawer = false;
    state.currentWord = null;
    els.overlayWordChoice.classList.remove('active');
    els.overlayWaitingChoice.classList.remove('active');
    els.overlayRoundEnd.classList.remove('active');
    if (state.canvas) {
      state.canvas.clear(false);
      state.canvas.setInteractive(false);
    }
    closeAllDrawers();

    showView('waiting');
    if (packet && packet.state) {
      handleSyncRoomState(packet.state);
    }
    saveSession({ currentView: 'waiting' });
    notify('🔄 بازی مجدد آغاز شد! به اتاق انتظار بازگشتید.', 'info');
  }

  function broadcastRoomState() {
    if (!state.isHost || !state.gameRoom) return;
    const snap = state.gameRoom.getStateSnapshot();
    state.network.broadcast({ type: 'ROOM_STATE', state: snap });
    handleSyncRoomState(snap);
  }

  // --- Waiting Room / Lobby Operations ---
  function createRoom() {
    if (!validatePlayerName()) return;

    state.isHost = true;
    state.roomCode = NetworkEngine.NetworkManager.generateRoomCode();
    state.activeBots = [];

    const hostPlayer = {
      id: state.myPlayerId,
      name: state.myName,
      avatar: state.myAvatar,
      isHost: true
    };

    state.gameRoom = new RoomLogic.GameRoom(state.roomCode, hostPlayer, {
      totalRounds: parseInt(els.roundsSelect.value, 10) || 3
    });

    setupNetwork(true);
    state.network.initHost(state.roomCode, hostPlayer);

    saveSession({ roomCode: state.roomCode, isHost: true, currentView: 'waiting' });

    updateWaitingRoomUI();
    showView('waiting');
    SoundEngine.playTurnStart();
    notify(`اتاق با کد ${state.roomCode} ایجاد شد!`, 'success');
  }

  function joinRoom(code) {
    if (!validatePlayerName()) return;
    const cleanCode = (code || els.roomCodeInput.value).trim().toUpperCase();

    if (!cleanCode) {
      notify('لطفاً کد اتاق را وارد کنید.', 'error');
      return;
    }

    state.isHost = false;
    state.roomCode = cleanCode;

    const guestPlayer = {
      id: state.myPlayerId,
      name: state.myName,
      avatar: state.myAvatar,
      isHost: false
    };

    setupNetwork(false);
    state.network.initGuest(cleanCode, guestPlayer);

    saveSession({ roomCode: cleanCode, isHost: false, currentView: 'waiting' });

    els.displayRoomCode.textContent = cleanCode;
    els.hostControls.style.display = 'none';
    showView('waiting');
    notify('در حال جستجو و اتصال به اتاق...', 'info');
  }

  function startPracticeWithBots() {
    if (!validatePlayerName()) return;
    createRoom();

    // Add 3 friendly bots
    for (let i = 0; i < 3; i++) {
      addBotPlayer();
    }
  }

  function addBotPlayer() {
    if (!state.isHost || !state.gameRoom) return;

    if (state.gameRoom.players.length >= RoomLogic.MAX_PLAYERS) {
      notify('ظرفیت اتاق تکمیل است (حداکثر ۶ نفر).', 'error');
      return;
    }

    const existingNames = state.gameRoom.players.map(p => p.name);
    const profile = BotEngine.getAvailableBotProfile(existingNames);
    const botId = 'bot_' + Math.random().toString(36).substr(2, 7);

    const bot = new BotEngine.BotPlayer(botId, profile);
    state.activeBots.push(bot);

    state.gameRoom.addPlayer({
      id: bot.id,
      name: bot.name,
      avatar: bot.avatar,
      isBot: true
    });

    broadcastRoomState();
    updateWaitingRoomUI();
    SoundEngine.playTurnStart();
    notify(`🤖 ${bot.name} به اتاق افزوده شد!`, 'info');
  }

  function updateWaitingRoomUI() {
    els.displayRoomCode.textContent = state.roomCode || '---';
    els.hostControls.style.display = state.isHost ? 'block' : 'none';

    const players = state.gameRoom ? state.gameRoom.players : [];
    els.waitingCount.textContent = `${players.length} از ۶ نفر`;

    // Render 6 slots
    els.waitingPlayerSlots.innerHTML = '';
    for (let i = 0; i < RoomLogic.MAX_PLAYERS; i++) {
      const p = players[i];
      const slot = document.createElement('div');
      slot.className = 'player-slot' + (p ? ' filled' : ' empty');

      if (p) {
        const isDisc = p.connected === false;
        const badgeText = isDisc ? 'قطع ارتباط ⏳' : (p.isHost ? 'میزبان' : (p.isBot ? 'ربات' : 'آماده'));
        const badgeStyle = isDisc ? 'style="background: rgba(239, 68, 68, 0.2); color: #f87171;"' : '';
        slot.innerHTML = `
          <div class="slot-avatar">${escapeHtml(p.avatar)}</div>
          <div class="slot-name">${escapeHtml(p.name)} ${p.isHost ? '👑' : ''}</div>
          <div class="slot-badge" ${badgeStyle}>${badgeText}</div>
        `;
      } else {
        slot.innerHTML = `
          <div class="slot-empty-icon">➕</div>
          <div class="slot-name">خالی</div>
        `;
      }
      els.waitingPlayerSlots.appendChild(slot);
    }

    if (state.isHost) {
      const canStart = players.length >= RoomLogic.MIN_PLAYERS;
      els.btnStartGame.disabled = !canStart;
      els.btnStartGame.title = canStart ? 'شروع بازی' : 'حداقل ۲ بازیکن نیاز است';
      els.btnAddBot.disabled = players.length >= RoomLogic.MAX_PLAYERS;
    }
  }

  function handleSyncRoomState(roomState) {
    if (!roomState) return;

    // View auto-transition based on authoritative room state:
    const inActiveGame = (roomState.status === 'CHOOSING' || roomState.status === 'DRAWING' || roomState.status === 'ROUND_END');
    if (inActiveGame && state.currentView !== 'game') {
      showView('game');
    } else if (roomState.status === 'LOBBY' && state.currentView !== 'waiting' && state.currentView !== 'lobby') {
      if (typeof ConfettiEngine !== 'undefined') ConfettiEngine.stop();
      showView('waiting');
    }

    if (roomState.drawer) {
      state.isDrawer = (roomState.drawer.id === state.myPlayerId);
    }

    saveSession({ roomCode: roomState.roomCode, currentView: state.currentView });

    // Catch up canvas history for guest or reconnecting player
    if (inActiveGame && state.canvas && Array.isArray(roomState.canvasHistory) && roomState.canvasHistory.length > 0) {
      if (!state.canvas.history || state.canvas.history.length !== roomState.canvasHistory.length) {
        state.canvas.applyRemoteAction({ type: 'FULL_SYNC', history: roomState.canvasHistory });
      }
    }

    if (state.currentView === 'waiting') {
      els.waitingCount.textContent = `${toPersianDigits(roomState.players.length)} از ${toPersianDigits(RoomLogic.MAX_PLAYERS)} نفر`;
      els.waitingPlayerSlots.innerHTML = '';
      for (let i = 0; i < RoomLogic.MAX_PLAYERS; i++) {
        const p = roomState.players[i];
        const slot = document.createElement('div');
        slot.className = 'player-slot' + (p ? ' filled' : ' empty');

        if (p) {
          const isDisc = p.connected === false;
          const badgeText = isDisc ? 'قطع ارتباط ⏳' : (p.isHost ? 'میزبان' : (p.isBot ? 'ربات' : 'آماده'));
          const badgeStyle = isDisc ? 'style="background: rgba(239, 68, 68, 0.2); color: #f87171;"' : '';
          slot.innerHTML = `
            <div class="slot-avatar">${escapeHtml(p.avatar)}</div>
            <div class="slot-name">${escapeHtml(p.name)} ${p.isHost ? '👑' : ''}</div>
            <div class="slot-badge" ${badgeStyle}>${badgeText}</div>
          `;
        } else {
          slot.innerHTML = `
            <div class="slot-empty-icon">➕</div>
            <div class="slot-name">خالی</div>
          `;
        }
        els.waitingPlayerSlots.appendChild(slot);
      }

      // CRITICAL: Update Host Start Button in real-time when guests join
      if (state.isHost) {
        const canStart = roomState.players.length >= RoomLogic.MIN_PLAYERS;
        els.btnStartGame.disabled = !canStart;
        els.btnStartGame.title = canStart ? 'شروع بازی' : 'حداقل ۲ بازیکن نیاز است';
        els.btnAddBot.disabled = roomState.players.length >= RoomLogic.MAX_PLAYERS;
      }
    }

    if (state.currentView === 'game') {
      renderScoreboard(roomState.players, roomState.drawer);
      els.roundIndicator.textContent = `دور ${toPersianDigits(roomState.currentRound)} از ${toPersianDigits(roomState.totalRounds)}`;

      if (typeof roomState.timerSeconds === 'number') {
        handleTick(roomState.timerSeconds, roomState.maskedWord);
      }

      if (state.canvas) {
        state.canvas.setInteractive(state.isDrawer);
      }
      updateToolbarsState();
      updateInputState();

      if (roomState.status === 'CHOOSING') {
        const drawerId = roomState.drawer ? roomState.drawer.id : null;
        if (drawerId !== state.myPlayerId) {
          els.overlayWaitingChoice.classList.add('active');
          const drawerName = roomState.drawer ? roomState.drawer.name : 'نقاش';
          const titleEl = els.overlayWaitingChoice.querySelector('h3');
          if (titleEl) titleEl.textContent = `${drawerName} در حال انتخاب کلمه است...`;
        }
      }

      if (!state.isDrawer && roomState.maskedWord) {
        els.wordDisplay.textContent = roomState.maskedWord;
        if (roomState.wordCategory) {
          els.wordCategoryBadge.textContent = `دسته‌بندی: ${roomState.wordCategory}`;
          els.wordCategoryBadge.style.display = 'inline-block';
        }
      }
    }
  }

  // --- Game State Flow ---
  function startGame() {
    if (!state.isHost || !state.gameRoom) return;

    const res = state.gameRoom.startGame();
    if (!res.success) {
      notify(res.message, 'error');
      return;
    }

    showView('game');
    state.network.broadcast({ type: 'GAME_STARTED' });
    startWordSelectionPhaseHost();
  }

  function startWordSelectionPhaseHost() {
    state.activeBots.forEach(b => b.cancelActions());
    clearInterval(state.turnTimerInterval);

    const data = state.gameRoom.startWordSelection();
    const drawer = data.drawer;
    state.isDrawer = (drawer.id === state.myPlayerId);

    // Broadcast GAME_STARTED and full ROOM_STATE so all players transition to game screen
    state.network.broadcast({
      type: 'GAME_STARTED',
      drawerId: drawer.id,
      drawerName: drawer.name,
      round: state.gameRoom.currentRound,
      totalRounds: state.gameRoom.totalRounds
    });
    broadcastRoomState();

    if (state.canvas) {
      state.canvas.clear(false);
      state.canvas.setInteractive(state.isDrawer);
    }
    updateToolbarsState();
    updateInputState();

    if (drawer.isBot) {
      // Bot drawer: auto selects random word after 1.5s
      setTimeout(() => {
        const choice = data.wordChoices[Math.floor(Math.random() * data.wordChoices.length)];
        const result = state.gameRoom.selectWord(choice);
        startDrawingPhaseHost(result);
      }, 1500);
      return;
    }

    if (state.isDrawer) {
      showWordChoiceModal(data.wordChoices);
    } else {
      els.overlayWaitingChoice.classList.add('active');
      const titleEl = els.overlayWaitingChoice.querySelector('h3');
      if (titleEl) titleEl.textContent = `${drawer.name} در حال انتخاب کلمه است...`;

      state.network.sendToPeer(drawer.id, {
        type: 'WORD_CHOICES',
        choices: data.wordChoices
      });
    }

    // Start 15s countdown on Host
    clearInterval(state.turnTimerInterval);
    state.turnTimerInterval = setInterval(() => {
      const tickRes = state.gameRoom.tick();
      if (tickRes && tickRes.event === 'WORD_AUTO_SELECTED') {
        clearInterval(state.turnTimerInterval);
        startDrawingPhaseHost(tickRes.data);
      } else if (tickRes && tickRes.event === 'TICK') {
        state.network.broadcast({ type: 'TICK', seconds: tickRes.seconds });
        handleTick(tickRes.seconds);
      }
    }, 1000);
  }

  function showWordChoiceModal(choices) {
    showView('game');
    els.overlayWaitingChoice.classList.remove('active');
    els.overlayWordChoice.classList.add('active');
    if (els.wordChoiceTimer) {
      els.wordChoiceTimer.textContent = '۱۵';
    }
    els.wordChoicesContainer.innerHTML = '';

    SoundEngine.playTurnStart();

    choices.forEach((c) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `word-choice-card difficulty-${c.difficulty}`;

      const diffLabel = c.difficulty === 'easy' ? 'آسان (۱۰۰ امتیاز)' : (c.difficulty === 'medium' ? 'متوسط (۲۵۰ امتیاز)' : 'سخت (۴۰۰ امتیاز)');
      card.innerHTML = `
        <div class="card-word">${c.word}</div>
        <div class="card-category">${c.category}</div>
        <div class="card-diff">${diffLabel}</div>
      `;

      card.addEventListener('click', () => {
        els.overlayWordChoice.classList.remove('active');
        state.currentWord = c;
        state.isDrawer = true;

        if (state.canvas) {
          state.canvas.clear(false);
          state.canvas.setInteractive(true);
        }
        updateToolbarsState();
        els.wordDisplay.textContent = `کلمه شما برای نقاشی: ${c.word} ✏️`;
        els.wordCategoryBadge.textContent = `دسته‌بندی: ${c.category}`;
        els.wordCategoryBadge.style.display = 'inline-block';
        updateInputState();

        if (state.isHost) {
          const result = state.gameRoom.selectWord(c);
          startDrawingPhaseHost(result);
        } else {
          state.network.sendToHost({ type: 'WORD_SELECTED', word: c });
        }
      });

      els.wordChoicesContainer.appendChild(card);
    });
  }

  function startDrawingPhaseHost(result) {
    clearInterval(state.turnTimerInterval);
    state.activeBots.forEach(b => b.cancelActions());

    const drawer = state.gameRoom.getDrawer();

    // 1. Broadcast to ALL GUESSERS (MASKED ONLY, NO SECRET WORD!)
    state.network.broadcast({
      type: 'ROUND_START',
      drawerId: drawer.id,
      drawerName: drawer.name,
      masked: result.masked,
      category: result.word.category,
      difficulty: result.word.difficulty,
      timerSeconds: result.timerSeconds
    });

    // 2. Send secret word to remote DRAWER only
    if (drawer.id !== state.myPlayerId && !drawer.isBot) {
      state.network.sendToPeer(drawer.id, {
        type: 'DRAWER_SECRET_WORD',
        drawerId: drawer.id,
        wordObj: result.word,
        timerSeconds: result.timerSeconds
      });
    }

    // 3. Host handles round start locally
    handleRoundStart({
      drawerId: drawer.id,
      drawerName: drawer.name,
      wordObj: result.word,
      masked: result.masked,
      category: result.word.category,
      difficulty: result.word.difficulty,
      timerSeconds: result.timerSeconds
    });

    // If drawer is bot, schedule bot drawing actions
    if (drawer && drawer.isBot) {
      const bot = state.activeBots.find(b => b.id === drawer.id);
      if (bot) {
        bot.startDrawing(state.canvas, (action) => {
          state.network.broadcast({ type: 'DRAW_ACTION', action });
        });
      }
    }

    // Schedule bot guesses for non-drawer bots
    state.activeBots.forEach((bot) => {
      if (bot.id !== drawer.id) {
        bot.scheduleGuess(result.word.word, (botId, guessWord) => {
          const res = state.gameRoom.submitGuess(botId, guessWord);
          if (res.type === 'CORRECT') {
            SoundEngine.playCorrectGuess();
            const chatMsg = {
              sender: 'سیستم',
              avatar: '🎉',
              text: `${res.player.name} کلمه را درست حدس زد! (+${res.points} امتیاز)`,
              isSystem: true,
              isCorrect: true
            };
            state.network.broadcast({ type: 'CHAT', ...chatMsg });
            renderChatMessage(chatMsg);
            broadcastRoomState();

            if (res.allGuessed) {
              handleRoundEndHost(res.turnEndData);
            }
          }
        });
      }
    });

    // 60s Host timer tick
    state.turnTimerInterval = setInterval(() => {
      const tickRes = state.gameRoom.tick();
      if (!tickRes) return;

      if (tickRes.event === 'TIME_UP') {
        clearInterval(state.turnTimerInterval);
        handleRoundEndHost(tickRes.data);
      } else if (tickRes.event === 'TICK') {
        state.network.broadcast({
          type: 'TICK',
          seconds: tickRes.seconds,
          masked: tickRes.masked
        });
        handleTick(tickRes.seconds, tickRes.masked);
      }
    }, 1000);
  }

  function handleRoundStart(data) {
    showView('game');
    els.overlayWordChoice.classList.remove('active');
    els.overlayWaitingChoice.classList.remove('active');
    els.overlayRoundEnd.classList.remove('active');

    state.isDrawer = (data.drawerId === state.myPlayerId);

    if (state.canvas) {
      state.canvas.clear(false);
      state.canvas.setInteractive(state.isDrawer);
    }

    updateToolbarsState();

    if (state.isDrawer) {
      if (data.wordObj) {
        state.currentWord = data.wordObj;
      }
      if (state.currentWord) {
        els.wordDisplay.textContent = `کلمه شما برای نقاشی: ${state.currentWord.word} ✏️`;
        els.wordCategoryBadge.textContent = `دسته‌بندی: ${state.currentWord.category}`;
        els.wordCategoryBadge.style.display = 'inline-block';
      }
    } else {
      state.currentWord = null;
      els.wordDisplay.textContent = data.masked || '---';
      els.wordCategoryBadge.textContent = `دسته‌بندی: ${data.category || ''}`;
      els.wordCategoryBadge.style.display = 'inline-block';
    }

    updateInputState();

    SoundEngine.playTurnStart();
    renderScoreboard(state.gameRoom ? state.gameRoom.players : [], { id: data.drawerId, name: data.drawerName });
  }

  function handleDrawerSecretWord(data) {
    showView('game');
    state.isDrawer = true;
    state.currentWord = data.wordObj;

    els.overlayWordChoice.classList.remove('active');
    els.overlayWaitingChoice.classList.remove('active');

    if (state.canvas) {
      if (!data.isReconnect) {
        state.canvas.clear(false);
      }
      state.canvas.setInteractive(true);
    }

    updateToolbarsState();
    els.wordDisplay.textContent = `کلمه شما برای نقاشی: ${data.wordObj.word} ✏️`;
    els.wordCategoryBadge.textContent = `دسته‌بندی: ${data.wordObj.category}`;
    els.wordCategoryBadge.style.display = 'inline-block';
    updateInputState();
  }

  function handleTick(seconds, masked) {
    els.timerText.textContent = seconds;
    if (els.wordChoiceTimer) {
      els.wordChoiceTimer.textContent = seconds;
    }
    const isUrgent = seconds <= 15;
    els.turnTimer.classList.toggle('urgent', isUrgent);

    if (seconds <= 10 && seconds > 0) {
      SoundEngine.playTimerTick(true);
    }

    if (!state.isDrawer && masked) {
      els.wordDisplay.textContent = masked;
    }
  }

  function handleRoundEndHost(roundEndData) {
    clearInterval(state.turnTimerInterval);
    state.activeBots.forEach(b => b.cancelActions());

    state.network.broadcast({
      type: 'ROUND_END',
      ...roundEndData
    });

    handleRoundEnd(roundEndData);

    // After 4.5 seconds, advance to next turn or game over
    setTimeout(() => {
      const next = state.gameRoom.nextTurn();
      if (next.status === 'GAME_OVER') {
        state.network.broadcast({ type: 'GAME_OVER', podium: next.podium });
        handleGameOver({ podium: next.podium });
      } else {
        startWordSelectionPhaseHost();
      }
    }, 4500);
  }

  function handleRoundEnd(data) {
    els.overlayRoundEnd.classList.add('active');
    els.roundEndWord.textContent = data.word || '';

    // Render scoreboard delta
    els.roundEndScores.innerHTML = '';
    const scores = data.scores || [];
    scores.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'round-score-row';
      row.innerHTML = `
        <span class="p-name">${escapeHtml(p.avatar)} ${escapeHtml(p.name)}</span>
        <span class="p-delta">+${p.roundScore || 0}</span>
        <span class="p-total">${p.score} امتیاز</span>
      `;
      els.roundEndScores.appendChild(row);
    });

    SoundEngine.playCorrectGuess();
  }

  function handleGameOver(data) {
    clearInterval(state.turnTimerInterval);
    els.overlayRoundEnd.classList.remove('active');

    showView('gameover');
    SoundEngine.playVictoryFanfare();

    // Start confetti
    if (typeof ConfettiEngine !== 'undefined') {
      ConfettiEngine.start(200, 8000);
    }

    // Render podium: 1st, 2nd, 3rd
    const { first, second, third, all } = data.podium;
    els.podiumContainer.innerHTML = `
      <div class="podium-step step-second">
        <div class="podium-avatar">${second ? escapeHtml(second.avatar) : '🥈'}</div>
        <div class="podium-name">${second ? escapeHtml(second.name) : '---'}</div>
        <div class="podium-score">${second ? second.score + ' امتیاز' : ''}</div>
        <div class="podium-box">۲ 🥈</div>
      </div>
      <div class="podium-step step-first">
        <div class="podium-crown">👑</div>
        <div class="podium-avatar">${first ? escapeHtml(first.avatar) : '🥇'}</div>
        <div class="podium-name">${first ? escapeHtml(first.name) : '---'}</div>
        <div class="podium-score">${first ? first.score + ' امتیاز' : ''}</div>
        <div class="podium-box">۱ 🥇</div>
      </div>
      <div class="podium-step step-third">
        <div class="podium-avatar">${third ? escapeHtml(third.avatar) : '🥉'}</div>
        <div class="podium-name">${third ? escapeHtml(third.name) : '---'}</div>
        <div class="podium-score">${third ? third.score + ' امتیاز' : ''}</div>
        <div class="podium-box">۳ 🥉</div>
      </div>
    `;

    // Render remaining rankings
    els.gameOverScores.innerHTML = '';
    (all || []).forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = 'game-over-row';
      row.innerHTML = `
        <span class="rank-num">#${idx + 1}</span>
        <span class="rank-avatar">${escapeHtml(p.avatar)}</span>
        <span class="rank-name">${escapeHtml(p.name)}</span>
        <span class="rank-score">${p.score} امتیاز</span>
      `;
      els.gameOverScores.appendChild(row);
    });
  }

  // --- Scoreboard & Chat Rendering ---
  function renderScoreboard(players, drawer) {
    const sorted = [...(players || [])].sort((a, b) => b.score - a.score);

    // 1. Desktop / Full Sidebar Scoreboard
    if (els.scoreboardList) {
      els.scoreboardList.innerHTML = '';
      sorted.forEach((p, idx) => {
        const isDrawer = drawer && drawer.id === p.id;
        const isMe = p.id === state.myPlayerId;
        const isDisc = p.connected === false;
        const item = document.createElement('div');
        item.className = 'score-item' + (isMe ? ' is-me' : '') + (p.guessedThisRound ? ' guessed' : '') + (isDisc ? ' disconnected' : '');

        const statusTag = isDisc
          ? '<span style="color: #f87171; font-size: 0.75rem;">(قطع ارتباط ⏳)</span>'
          : (isDrawer ? '✏️' : (p.guessedThisRound ? '✅' : ''));

        item.innerHTML = `
          <div class="score-rank">#${idx + 1}</div>
          <div class="score-avatar">${escapeHtml(p.avatar)}</div>
          <div class="score-details">
            <div class="score-name">${escapeHtml(p.name)} ${statusTag}</div>
            <div class="score-pts">${p.score} امتیاز</div>
          </div>
        `;
        els.scoreboardList.appendChild(item);

        if (isMe && els.mobileMyRank) {
          els.mobileMyRank.textContent = `#${idx + 1}`;
        }
      });
    }

    // 2. Mobile Mini Player Ribbon
    if (els.mobilePlayerRibbon) {
      els.mobilePlayerRibbon.innerHTML = '';
      (players || []).forEach(p => {
        const isDrawer = drawer && drawer.id === p.id;
        const isMe = p.id === state.myPlayerId;
        const isDisc = p.connected === false;
        const chip = document.createElement('div');
        chip.className = 'ribbon-chip' + (isMe ? ' is-me' : '') + (isDrawer ? ' is-drawer' : '') + (p.guessedThisRound ? ' guessed' : '') + (isDisc ? ' disconnected' : '');
        const statusIcon = isDisc
          ? '<span style="color: #f87171;" title="در انتظار اتصال مجدد">⏳</span>'
          : (isDrawer ? '<span>✏️</span>' : (p.guessedThisRound ? '<span>✅</span>' : ''));
        chip.innerHTML = `
          <span class="ribbon-avatar">${escapeHtml(p.avatar)}</span>
          <span class="ribbon-name">${escapeHtml(p.name)}</span>
          <span class="ribbon-score">${p.score}</span>
          ${statusIcon}
        `;
        els.mobilePlayerRibbon.appendChild(chip);
      });
    }
  }

  function renderChatMessage(msg) {
    // 1. Append to Full Chat Stream
    if (els.chatMessages) {
      const div = document.createElement('div');
      div.className = 'chat-message' + (msg.isSystem ? ' system-msg' : '') + (msg.isCorrect ? ' correct-msg' : '');

      if (msg.isSystem) {
        div.innerHTML = `<span class="msg-icon">${escapeHtml(msg.avatar || '📢')}</span> <span class="msg-text">${escapeHtml(msg.text)}</span>`;
      } else {
        div.innerHTML = `<span class="msg-sender">${escapeHtml(msg.avatar || '')} ${escapeHtml(msg.sender)}:</span> <span class="msg-text">${escapeHtml(msg.text)}</span>`;
        SoundEngine.playChatPop();
      }

      els.chatMessages.appendChild(div);
      els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
    }

    // 2. Floating Live Ticker above Guesser Input
    if (els.recentChatTicker) {
      const tickerItem = document.createElement('div');
      tickerItem.className = 'ticker-item' + (msg.isCorrect ? ' correct' : '');
      if (msg.isSystem) {
        tickerItem.innerHTML = `<span>${escapeHtml(msg.avatar || '📢')}</span> <span>${escapeHtml(msg.text)}</span>`;
      } else {
        tickerItem.innerHTML = `<strong>${escapeHtml(msg.avatar || '')} ${escapeHtml(msg.sender)}:</strong> <span>${escapeHtml(msg.text)}</span>`;
      }
      els.recentChatTicker.appendChild(tickerItem);

      // Keep max 2 items in ticker
      while (els.recentChatTicker.children.length > 2) {
        els.recentChatTicker.removeChild(els.recentChatTicker.firstChild);
      }

      setTimeout(() => {
        if (tickerItem.parentNode) {
          tickerItem.style.opacity = '0';
          tickerItem.style.transform = 'translateY(-6px)';
          tickerItem.style.transition = 'all 0.3s ease';
          setTimeout(() => {
            if (tickerItem.parentNode) {
              tickerItem.parentNode.removeChild(tickerItem);
            }
          }, 300);
        }
      }, 4000);
    }

    // 3. Unread badge for mobile chat button if chat sheet is closed
    if (els.sidebarChat && !els.sidebarChat.classList.contains('open')) {
      state.unreadChatCount = (state.unreadChatCount || 0) + 1;
      if (els.chatUnreadBadge) {
        els.chatUnreadBadge.textContent = state.unreadChatCount > 9 ? '+۹' : state.unreadChatCount;
        els.chatUnreadBadge.style.display = 'inline-block';
      }
    }
  }

  function submitGuess(rawText) {
    const text = (rawText !== undefined ? rawText : (els.chatInput ? els.chatInput.value : '')).trim();
    if (!text) return;

    if (els.chatInput) els.chatInput.value = '';
    if (els.quickGuessInput) els.quickGuessInput.value = '';

    if (state.isDrawer) return;

    if (state.isHost) {
      const res = state.gameRoom.submitGuess(state.myPlayerId, text);
      if (res.type === 'CORRECT') {
        SoundEngine.playCorrectGuess();
        if (navigator.vibrate) navigator.vibrate([50, 40, 90]);
        const chatMsg = {
          sender: 'سیستم',
          avatar: '🎉',
          text: `${state.myName} کلمه را درست حدس زد! (+${res.points} امتیاز)`,
          isSystem: true,
          isCorrect: true
        };
        state.network.broadcast({ type: 'CHAT', ...chatMsg });
        renderChatMessage(chatMsg);
        broadcastRoomState();

        if (res.allGuessed) {
          handleRoundEndHost(res.turnEndData);
        }
      } else if (res.type === 'CLOSE') {
        SoundEngine.playCloseGuess();
        if (navigator.vibrate) navigator.vibrate([40]);
        renderChatMessage({
          sender: 'سیستم',
          avatar: '💡',
          text: 'نزدیک بود! چند حرف بیشتر دقت کن...',
          isSystem: true
        });
      } else if (res.type === 'DRAWER_SPOILER_BLOCKED') {
        renderChatMessage({
          sender: 'سیستم',
          avatar: '⚠️',
          text: 'نقاش نمی‌تواند کلمه را در چت فاش کند!',
          isSystem: true
        });
      } else if (res.type === 'ALREADY_GUESSED_SPOILER') {
        renderChatMessage({
          sender: 'سیستم',
          avatar: '🤫',
          text: 'شما قبلاً حدس زده‌اید، لطفاً پاسخ را لو ندهید!',
          isSystem: true
        });
      } else if (res.type === 'ALREADY_GUESSED') {
        const chatMsg = {
          sender: state.myName,
          avatar: state.myAvatar,
          text: `[حدس زده] ${text}`
        };
        state.network.broadcast({ type: 'CHAT', ...chatMsg });
        renderChatMessage(chatMsg);
      } else if (res.type === 'CHAT') {
        const chatMsg = {
          sender: state.myName,
          avatar: state.myAvatar,
          text
        };
        state.network.broadcast({ type: 'CHAT', ...chatMsg });
        renderChatMessage(chatMsg);
      }
    } else {
      state.network.sendToHost({ type: 'GUESS', text });
    }
  }

  // --- Notification Toast ---
  function notify(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `app-toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  // --- Setup Canvas and Tools ---
  function initCanvas() {
    state.canvas = new DrawingCanvas.DrawingCanvas(els.drawingCanvas, {
      isInteractive: false,
      initialColor: '#1e293b',
      onAction: (action) => {
        if (state.isDrawer) {
          SoundEngine.playDrawSwoosh();
          if (state.isHost) {
            if (state.gameRoom) {
              state.gameRoom.recordDrawingAction(action);
            }
            state.network.broadcast({ type: 'DRAW_ACTION', action });
          } else {
            state.network.sendToHost({ type: 'DRAW_ACTION', action });
          }
        }
      }
    });

    // Color palette selection
    els.paletteColors.forEach((el) => {
      el.addEventListener('click', () => {
        els.paletteColors.forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        const color = el.getAttribute('data-color');
        if (state.canvas) state.canvas.setColor(color);
        if (navigator.vibrate) navigator.vibrate([12]);
      });
    });

    // Brush sizes
    els.brushSizes.forEach((el) => {
      el.addEventListener('click', () => {
        els.brushSizes.forEach(s => s.classList.remove('active'));
        el.classList.add('active');
        const sizeName = el.getAttribute('data-size');
        if (state.canvas) {
          state.canvas.setSize(sizeName);
        }
        if (navigator.vibrate) navigator.vibrate([12]);
      });
    });

    // Tool selection (pencil, eraser, bucket)
    els.toolButtons.forEach((el) => {
      el.addEventListener('click', () => {
        const tool = el.getAttribute('data-tool');
        if (!tool) return;
        els.toolButtons.forEach(b => b.classList.remove('active'));
        el.classList.add('active');
        if (state.canvas) state.canvas.setTool(tool);
        if (navigator.vibrate) navigator.vibrate([15]);
      });
    });

    // Clear canvas
    els.btnClear.addEventListener('click', () => {
      if (state.isDrawer && state.canvas) {
        state.canvas.clear(true);
        if (navigator.vibrate) navigator.vibrate([25]);
      }
    });

    // Undo last stroke
    els.btnUndo.addEventListener('click', () => {
      if (state.isDrawer && state.canvas) {
        state.canvas.undo(true);
        if (navigator.vibrate) navigator.vibrate([15]);
      }
    });
  }

  // --- Event Bindings ---
  function bindEvents() {
    // Lobby
    els.btnCreateRoom.addEventListener('click', createRoom);
    els.btnJoinRoom.addEventListener('click', () => joinRoom());
    els.btnPracticeBots.addEventListener('click', startPracticeWithBots);

    els.playerNameInput.addEventListener('input', () => {
      els.nameError.style.display = 'none';
    });

    els.playerNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (els.roomCodeInput) els.roomCodeInput.focus();
      }
    });

    els.roomCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        joinRoom();
      }
    });

    if (els.joinRoomForm) {
      els.joinRoomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        joinRoom();
      });
    }

    // Waiting Room Actions
    els.btnCopyCode.addEventListener('click', () => {
      if (state.roomCode) {
        navigator.clipboard.writeText(state.roomCode).then(() => {
          notify('کد اتاق در حافظه کپی شد! 📋', 'success');
          if (navigator.vibrate) navigator.vibrate([20]);
          const oldText = els.btnCopyCode.textContent;
          els.btnCopyCode.textContent = 'کپی شد! ✅';
          setTimeout(() => { els.btnCopyCode.textContent = oldText; }, 2000);
        }).catch(() => {
          notify(`کد اتاق: ${state.roomCode}`, 'info');
        });
      }
    });

    els.btnCopyLink.addEventListener('click', () => {
      if (state.roomCode) {
        const base = window.location.origin + window.location.pathname;
        const link = `${base}?room=${state.roomCode}`;
        navigator.clipboard.writeText(link).then(() => {
          notify('لینک ورود به بازی کپی شد! 🔗 برای دوستانتان بفرستید.', 'success');
          if (navigator.vibrate) navigator.vibrate([20]);
          const oldText = els.btnCopyLink.textContent;
          els.btnCopyLink.textContent = 'کپی شد! ✅';
          setTimeout(() => { els.btnCopyLink.textContent = oldText; }, 2000);
        }).catch(() => {
          notify(link, 'info');
        });
      }
    });

    els.btnAddBot.addEventListener('click', addBotPlayer);
    els.btnStartGame.addEventListener('click', startGame);

    if (els.btnRefreshRooms) {
      els.btnRefreshRooms.addEventListener('click', () => {
        renderActiveRoomsList(NetworkEngine.NetworkManager.getActiveRooms());
        notify('لیست اتاق‌های فعال به‌روزرسانی شد.', 'info');
      });
    }

    els.btnLeaveWaiting.addEventListener('click', () => {
      clearSession();
      if (state.network) state.network.destroy();
      showView('lobby');
    });

    // Game Mobile Drawers & Action Toggles
    if (els.btnToggleScores) {
      els.btnToggleScores.addEventListener('click', toggleScoreboardDrawer);
    }
    if (els.btnToggleChat) {
      els.btnToggleChat.addEventListener('click', toggleChatDrawer);
    }
    if (els.btnCloseScores) {
      els.btnCloseScores.addEventListener('click', closeAllDrawers);
    }
    if (els.btnCloseChat) {
      els.btnCloseChat.addEventListener('click', closeAllDrawers);
    }
    if (els.drawerBackdrop) {
      els.drawerBackdrop.addEventListener('click', closeAllDrawers);
    }

    // Quick Guess Form (Mobile / Tablet)
    if (els.quickGuessForm) {
      els.quickGuessForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitGuess(els.quickGuessInput ? els.quickGuessInput.value : '');
      });
    }

    // Game Controls
    els.btnMute.addEventListener('click', () => {
      SoundEngine.toggleMute();
      updateMuteButton();
    });

    if (els.btnGameMute) {
      els.btnGameMute.addEventListener('click', () => {
        SoundEngine.toggleMute();
        updateMuteButton();
      });
    }

    els.btnLeaveGame.addEventListener('click', () => {
      if (confirm('آیا مطمئن هستید که می‌خواهید از بازی خارج شوید؟')) {
        clearSession();
        closeAllDrawers();
        if (state.network) state.network.destroy();
        showView('lobby');
      }
    });

    els.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitGuess();
    });

    // Game Over
    els.btnPlayAgain.addEventListener('click', () => {
      closeAllDrawers();
      if (state.isHost) {
        handleRestartGameHost();
      } else {
        if (state.network) {
          state.network.sendToHost({ type: 'REQUEST_PLAY_AGAIN', playerId: state.myPlayerId });
          notify('درخواست بازی مجدد برای میزبان ارسال شد...', 'info');
        }
      }
    });

    els.btnBackLobby.addEventListener('click', () => {
      clearSession();
      closeAllDrawers();
      if (state.network) state.network.destroy();
      showView('lobby');
    });

    // Window resize & orientation change
    window.addEventListener('resize', () => {
      if (state.canvas && state.currentView === 'game') {
        state.canvas.setupCanvas();
      }
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        if (state.canvas && state.currentView === 'game') {
          state.canvas.setupCanvas();
        }
      }, 200);
    });

    // Visual Viewport API for dynamic virtual keyboard adaptation on mobile
    if (typeof window !== 'undefined' && window.visualViewport) {
      const handleVisualViewport = () => {
        const vh = window.visualViewport.height;
        document.documentElement.style.setProperty('--vvh', `${vh}px`);
        if (state.canvas && state.currentView === 'game') {
          state.canvas.setupCanvas();
        }
      };
      window.visualViewport.addEventListener('resize', handleVisualViewport);
      window.visualViewport.addEventListener('scroll', handleVisualViewport);
      handleVisualViewport();
    }

    // PWA Install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      state.deferredPrompt = e;
      if (els.installBtn) {
        els.installBtn.style.display = 'inline-flex';
        els.installBtn.addEventListener('click', () => {
          state.deferredPrompt.prompt();
          state.deferredPrompt.userChoice.then(() => {
            state.deferredPrompt = null;
            els.installBtn.style.display = 'none';
          });
        });
      }
    });
  }

  function checkSessionResume() {
    const sess = getSession();
    if (sess && sess.roomCode && sess.playerId === state.myPlayerId) {
      console.log('Resuming session for room:', sess.roomCode);
      if (sess.name) {
        state.myName = sess.name;
        if (els.playerNameInput) els.playerNameInput.value = sess.name;
      }
      if (sess.avatar) state.myAvatar = sess.avatar;

      if (sess.isHost) {
        state.isHost = true;
        state.roomCode = sess.roomCode;
        const hostPlayer = { id: state.myPlayerId, name: state.myName, avatar: state.myAvatar, isHost: true };
        state.gameRoom = new RoomLogic.GameRoom(sess.roomCode, hostPlayer);
        if (sess.roomSnapshot) {
          state.gameRoom.restoreFromSnapshot(sess.roomSnapshot);
        }
        setupNetwork(true);
        state.network.initHost(sess.roomCode, hostPlayer);
        if (sess.roomSnapshot && (sess.roomSnapshot.status === 'CHOOSING' || sess.roomSnapshot.status === 'DRAWING' || sess.roomSnapshot.status === 'ROUND_END')) {
          handleSyncRoomState(sess.roomSnapshot);
          showView('game');
        } else {
          updateWaitingRoomUI();
          showView('waiting');
        }
        notify(`نشست میزبانی در اتاق ${sess.roomCode} بازیابی شد.`, 'success');
      } else {
        joinRoom(sess.roomCode);
      }
      return true;
    }
    return false;
  }

  // --- App Initialization ---
  function init() {
    initElements();
    initProfile();
    initRoomDiscovery();
    updateMuteButton();
    initCanvas();
    bindEvents();

    const resumed = checkSessionResume();
    if (!resumed) {
      showView('lobby');
    }

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }

    console.log('نقاش‌باشی با موفقیت راه‌اندازی شد! 🎨');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
