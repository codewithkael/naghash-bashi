/**
 * نقاشباشی (Naghash Bashi) - Authoritative Room & Game State Machine
 * Handles room capacity (2-6 players), turn rotation, scoring,
 * word selection phase, drawing phase, hint schedule, and game over.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const WordBank = require('./words.js');
    const ProfanityFilter = require('./profanity.js');
    module.exports = factory(WordBank, ProfanityFilter);
  } else {
    root.RoomLogic = factory(root.WordBank, root.ProfanityFilter);
  }
})(typeof self !== 'undefined' ? self : this, function (WordBank, ProfanityFilter) {

  const MAX_PLAYERS = 6;
  const MIN_PLAYERS = 2;
  const WORD_SELECT_TIME = 15; // seconds
  const DRAWING_TIME = 60;     // seconds
  const ROUND_END_PAUSE = 5;   // seconds

  class GameRoom {
    constructor(roomCode, hostPlayerInfo, options = {}) {
      this.roomCode = roomCode;
      this.maxPlayers = MAX_PLAYERS;
      this.totalRounds = options.totalRounds || 3;
      this.currentRound = 1;
      this.status = 'LOBBY'; // LOBBY, CHOOSING, DRAWING, ROUND_END, GAME_OVER

      this.players = [];
      this.drawerIndex = 0;
      this.currentWord = null;
      this.wordChoices = [];
      this.revealedIndices = new Set();
      this.usedWords = [];

      this.timerSeconds = 0;
      this.turnGuessesCount = 0;
      this.canvasHistory = [];

      // Add host player
      if (hostPlayerInfo) {
        this.addPlayer({
          id: hostPlayerInfo.id,
          name: hostPlayerInfo.name,
          avatar: hostPlayerInfo.avatar || '🎨',
          isHost: true
        });
      }
    }

    /**
     * Add player to room.
     * Enforces profanity filter and max 6 player capacity.
     */
    addPlayer(playerInfo) {
      if (this.players.length >= this.maxPlayers) {
        return { success: false, error: 'ROOM_FULL', message: 'ظرفیت اتاق تکمیل است (حداکثر ۶ نفر).' };
      }

      // Profanity check on name
      if (ProfanityFilter && typeof ProfanityFilter.validateName === 'function') {
        const check = ProfanityFilter.validateName(playerInfo.name);
        if (!check.isValid) {
          return { success: false, error: 'PROFANITY_DETECTED', message: check.reason };
        }
      }

      // Check if already in room
      const existing = this.players.find(p => p.id === playerInfo.id);
      if (existing) {
        existing.connected = true;
        return { success: true, player: existing };
      }

      const isFirst = this.players.length === 0;
      const player = {
        id: playerInfo.id,
        name: playerInfo.name.trim(),
        avatar: playerInfo.avatar || '🎨',
        isHost: playerInfo.isHost || isFirst,
        score: 0,
        roundScore: 0,
        guessedThisRound: false,
        isReady: true,
        connected: true,
        isBot: !!playerInfo.isBot
      };

      this.players.push(player);
      return { success: true, player };
    }

    removePlayer(playerId) {
      const idx = this.players.findIndex(p => p.id === playerId);
      if (idx === -1) return null;

      const removed = this.players.splice(idx, 1)[0];

      // If removed was host, pass host to next connected player
      if (removed.isHost && this.players.length > 0) {
        this.players[0].isHost = true;
      }

      let drawerLeft = false;
      let turnData = null;

      // If currently in game and current drawer left, advance turn
      if (this.status !== 'LOBBY' && this.status !== 'GAME_OVER') {
        if (this.players.length < MIN_PLAYERS) {
          this.status = 'LOBBY';
        } else if (idx === this.drawerIndex) {
          drawerLeft = true;
          if (this.drawerIndex >= this.players.length) {
            this.drawerIndex = 0;
            this.currentRound++;
            if (this.currentRound > this.totalRounds) {
              this.status = 'GAME_OVER';
              removed.isGameOver = true;
              removed.podium = this.getPodium();
              return removed;
            }
          }
          turnData = this.startWordSelection();
        } else if (idx < this.drawerIndex) {
          this.drawerIndex--;
        }
      }

      removed.drawerLeft = drawerLeft;
      removed.turnData = turnData;
      removed.roomStatus = this.status;
      return removed;
    }

    getDrawer() {
      if (this.players.length === 0) return null;
      return this.players[this.drawerIndex % this.players.length];
    }

    canStartGame() {
      return this.players.length >= MIN_PLAYERS && this.status === 'LOBBY';
    }

    startGame() {
      if (!this.canStartGame()) {
        return { success: false, message: `برای شروع مسابقه حداقل ${MIN_PLAYERS} بازیکن نیاز است.` };
      }

      this.currentRound = 1;
      this.drawerIndex = 0;
      this.usedWords = [];
      this.players.forEach(p => {
        p.score = 0;
        p.roundScore = 0;
        p.guessedThisRound = false;
      });

      this.startWordSelection();
      return { success: true };
    }

    startWordSelection() {
      this.status = 'CHOOSING';
      this.canvasHistory = [];
      this.revealedIndices = new Set();
      this.turnGuessesCount = 0;
      this.players.forEach(p => {
        p.roundScore = 0;
        p.guessedThisRound = false;
      });

      this.timerSeconds = WORD_SELECT_TIME;
      this.wordChoices = WordBank.pickWordChoices(this.usedWords);
      this.currentWord = null;

      return {
        drawer: this.getDrawer(),
        wordChoices: this.wordChoices,
        timerSeconds: this.timerSeconds
      };
    }

    selectWord(wordObj) {
      if (this.status !== 'CHOOSING') return false;

      this.currentWord = wordObj || this.wordChoices[0];
      this.usedWords.push(this.currentWord.word);
      this.status = 'DRAWING';
      this.timerSeconds = DRAWING_TIME;
      this.revealedIndices = new Set();
      this.canvasHistory = [];

      return {
        word: this.currentWord,
        timerSeconds: this.timerSeconds,
        masked: WordBank.getMaskedDisplay(this.currentWord.word, this.revealedIndices)
      };
    }

    /**
     * Called every second by the host timer tick
     */
    tick() {
      if (this.status !== 'CHOOSING' && this.status !== 'DRAWING') {
        return null;
      }

      this.timerSeconds--;

      if (this.status === 'CHOOSING') {
        if (this.timerSeconds <= 0) {
          // Auto select first word on timeout
          return { event: 'WORD_AUTO_SELECTED', data: this.selectWord(this.wordChoices[0]) };
        }
        return { event: 'TICK', seconds: this.timerSeconds };
      }

      if (this.status === 'DRAWING') {
        // Hint reveal schedule:
        // 1st hint at 38 seconds remaining
        // 2nd hint at 18 seconds remaining
        let hintRevealed = false;
        if (this.timerSeconds === 38 || this.timerSeconds === 18) {
          const nextHint = WordBank.getNextHintIndex(this.currentWord.word, this.revealedIndices);
          if (nextHint !== null) {
            this.revealedIndices.add(nextHint);
            hintRevealed = true;
          }
        }

        if (this.timerSeconds <= 0) {
          return { event: 'TIME_UP', data: this.endTurn() };
        }

        return {
          event: 'TICK',
          seconds: this.timerSeconds,
          hintRevealed,
          masked: hintRevealed ? WordBank.getMaskedDisplay(this.currentWord.word, this.revealedIndices) : null
        };
      }

      return null;
    }

    /**
     * Submit guess from a player
     */
    submitGuess(playerId, guessText) {
      if (this.status !== 'DRAWING' || !this.currentWord) {
        return { type: 'CHAT', text: guessText };
      }

      const player = this.players.find(p => p.id === playerId);
      if (!player) return { type: 'ERROR' };

      const drawer = this.getDrawer();
      const normGuess = WordBank.normalizeCompact(guessText);
      const normTarget = WordBank.normalizeCompact(this.currentWord.word);

      // Drawer cannot guess and cannot leak the secret word!
      if (drawer && drawer.id === playerId) {
        if (normTarget.length >= 2 && normGuess.includes(normTarget)) {
          return { type: 'DRAWER_SPOILER_BLOCKED', player, text: guessText };
        }
        return { type: 'CHAT', player, text: guessText };
      }

      // If player already guessed correctly this round
      if (player.guessedThisRound) {
        if (normTarget.length >= 2 && normGuess.includes(normTarget)) {
          return { type: 'ALREADY_GUESSED_SPOILER', player, text: guessText };
        }
        return { type: 'ALREADY_GUESSED', player, text: guessText };
      }

      const evalResult = WordBank.checkGuess(guessText, this.currentWord.word);
      const isWordMatch = evalResult.isCorrect || (normTarget.length >= 3 && normGuess.includes(normTarget));

      if (isWordMatch) {
        player.guessedThisRound = true;
        this.turnGuessesCount++;

        // Score calculation:
        // Base 100 + time bonus (up to 400 proportional to remaining time)
        // Faster guess = higher score! Max 500 pts.
        const timeFraction = Math.max(0, this.timerSeconds / DRAWING_TIME);
        const guesserPoints = Math.round(100 + 400 * timeFraction);
        player.roundScore = guesserPoints;
        player.score += guesserPoints;

        // Drawer bonus: gets +60 points per successful guesser!
        if (drawer) {
          const drawerBonus = 60;
          drawer.roundScore = (drawer.roundScore || 0) + drawerBonus;
          drawer.score += drawerBonus;
        }

        // Check if all non-drawer connected players have guessed
        const eligibleGuessers = this.players.filter(p => p.id !== drawer.id && p.connected);
        const allGuessed = eligibleGuessers.every(p => p.guessedThisRound);

        return {
          type: 'CORRECT',
          player,
          points: guesserPoints,
          allGuessed,
          turnEndData: allGuessed ? this.endTurn() : null
        };
      }

      if (evalResult.isClose) {
        return {
          type: 'CLOSE',
          player,
          text: guessText
        };
      }

      return {
        type: 'CHAT',
        player,
        text: guessText
      };
    }

    endTurn() {
      this.status = 'ROUND_END';
      const wordRevealed = this.currentWord ? this.currentWord.word : '';

      return {
        word: wordRevealed,
        drawer: this.getDrawer(),
        scores: this.getLeaderboard()
      };
    }

    nextTurn() {
      this.drawerIndex++;

      // Check if round completed (all players have drawn once)
      if (this.drawerIndex >= this.players.length) {
        this.drawerIndex = 0;
        this.currentRound++;

        if (this.currentRound > this.totalRounds) {
          this.status = 'GAME_OVER';
          return {
            status: 'GAME_OVER',
            podium: this.getPodium()
          };
        }
      }

      return {
        status: 'CHOOSING',
        data: this.startWordSelection()
      };
    }

    getLeaderboard() {
      return [...this.players].sort((a, b) => b.score - a.score);
    }

    getPodium() {
      const sorted = this.getLeaderboard();
      return {
        first: sorted[0] || null,
        second: sorted[1] || null,
        third: sorted[2] || null,
        all: sorted
      };
    }

    restartGame() {
      this.status = 'LOBBY';
      this.currentRound = 1;
      this.drawerIndex = 0;
      this.usedWords = [];
      this.players.forEach(p => {
        p.score = 0;
        p.roundScore = 0;
        p.guessedThisRound = false;
      });
      return { status: 'LOBBY' };
    }

    getStateSnapshot() {
      const drawer = this.getDrawer();
      return {
        roomCode: this.roomCode,
        status: this.status,
        currentRound: this.currentRound,
        totalRounds: this.totalRounds,
        timerSeconds: this.timerSeconds,
        drawer: drawer ? { id: drawer.id, name: drawer.name, avatar: drawer.avatar } : null,
        players: this.players.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          score: p.score,
          roundScore: p.roundScore,
          isHost: p.isHost,
          isReady: p.isReady,
          guessedThisRound: p.guessedThisRound,
          connected: p.connected,
          isBot: p.isBot
        })),
        maskedWord: this.currentWord ? WordBank.getMaskedDisplay(this.currentWord.word, this.revealedIndices) : null,
        wordCategory: this.currentWord ? this.currentWord.category : null,
        wordDifficulty: this.currentWord ? this.currentWord.difficulty : null
      };
    }
  }

  return {
    MAX_PLAYERS,
    MIN_PLAYERS,
    WORD_SELECT_TIME,
    DRAWING_TIME,
    GameRoom
  };
});
