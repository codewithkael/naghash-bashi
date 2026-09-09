/**
 * Behsazan 256 - Storage & Leaderboard Manager
 * Manages game persistence, high scores, and realistic corporate leaderboard presets.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GameStorage = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const STORAGE_KEY = 'behsazan_256_leaderboard';
  const CURRENT_PLAYER_KEY = 'behsazan_256_player';

  const memStore = {};
  const safeStorage = {
    getItem(k) {
      if (typeof localStorage !== 'undefined') {
        try { return localStorage.getItem(k); } catch (e) {}
      }
      return Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null;
    },
    setItem(k, v) {
      memStore[k] = String(v);
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(k, v); } catch (e) {}
      }
    }
  };

  // Realistic company leaderboard presets
  const DEFAULT_LEADERBOARD = [
    {
      id: 'pre-1',
      name: 'سارا حسینی',
      department: 'امنیت و زیرساخت شبکه',
      timeSeconds: 98,
      timeFormatted: '01:38',
      score: 8040,
      date: '۱۴۰۵/۰۶/۱۵',
      isCurrentUser: false
    },
    {
      id: 'pre-2',
      name: 'علیرضا رضایی',
      department: 'توسعه Core Banking',
      timeSeconds: 124,
      timeFormatted: '02:04',
      score: 7520,
      date: '۱۴۰۵/۰۶/۱۶',
      isCurrentUser: false
    },
    {
      id: 'pre-3',
      name: 'فاطمه کریمی',
      department: 'پشتیبانی سوئیچ پرداخت',
      timeSeconds: 145,
      timeFormatted: '02:25',
      score: 7100,
      date: '۱۴۰۵/۰۶/۱۷',
      isCurrentUser: false
    },
    {
      id: 'pre-4',
      name: 'مجید مرادی',
      department: 'خدمات، رفاهی و پذیرایی',
      timeSeconds: 172,
      timeFormatted: '02:52',
      score: 6560,
      date: '۱۴۰۵/۰۶/۱۷',
      isCurrentUser: false
    },
    {
      id: 'pre-5',
      name: 'نیما قنبری',
      department: 'تیم همراه‌بانک ملت',
      timeSeconds: 195,
      timeFormatted: '03:15',
      score: 6100,
      date: '۱۴۰۵/۰۶/۱۸',
      isCurrentUser: false
    },
    {
      id: 'pre-6',
      name: 'مریم سپهری',
      department: 'تحلیل داده و هوش مصنوعی',
      timeSeconds: 230,
      timeFormatted: '03:50',
      score: 5400,
      date: '۱۴۰۵/۰۶/۱۸',
      isCurrentUser: false
    }
  ];

  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function calculateScore(timeSeconds, bonusPoints = 0, coreStability = null, directScore = 0) {
    const stabBonus = (coreStability !== null && coreStability !== undefined)
      ? Math.round((Math.max(0, Math.min(100, coreStability)) / 100) * 1000)
      : 0;
    if (directScore && directScore > 0) {
      return directScore + bonusPoints + stabBonus;
    }
    // Fallback formula based on time
    const base = Math.max(1000, 10000 - timeSeconds * 20);
    return base + bonusPoints + stabBonus;
  }

  function getLeaderboard() {
    try {
      const stored = safeStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => b.score - a.score);
        }
      }
    } catch (e) {
      console.warn('Could not read leaderboard from storage:', e);
    }
    // Return default seed
    return [...DEFAULT_LEADERBOARD].sort((a, b) => b.score - a.score);
  }

  function saveScore(playerName, department, timeSeconds, bonusPoints = 0, coreStability = null, directScore = 0) {
    const currentList = getLeaderboard();
    const score = calculateScore(timeSeconds, bonusPoints, coreStability, directScore);
    
    // Format Persian date
    const today = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const newEntry = {
      id: 'entry-' + Date.now(),
      name: playerName.trim(),
      department: department || 'کارشناس مأموریت ۲۵۶',
      timeSeconds: timeSeconds,
      timeFormatted: formatTime(timeSeconds),
      score: score,
      date: today,
      isCurrentUser: true
    };

    // Remove isCurrentUser flag from others
    currentList.forEach(item => item.isCurrentUser = false);
    currentList.push(newEntry);

    // Sort by score desc, then time asc
    currentList.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeSeconds - b.timeSeconds;
    });

    // Keep top 20
    const trimmed = currentList.slice(0, 20);

    try {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Could not save leaderboard:', e);
    }

    return {
      entry: newEntry,
      rank: trimmed.findIndex(e => e.id === newEntry.id) + 1,
      totalEntries: trimmed.length,
      leaderboard: trimmed
    };
  }

  function addBonusToCurrent(entryId, extraScore) {
    const currentList = getLeaderboard();
    const target = currentList.find(e => e.id === entryId);
    if (target) {
      target.score += extraScore;
      currentList.sort((a, b) => b.score - a.score);
      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
      } catch (e) {}
    }
    return currentList;
  }

  function getCurrentPlayer() {
    try {
      const p = safeStorage.getItem(CURRENT_PLAYER_KEY);
      return p ? JSON.parse(p) : null;
    } catch (e) {
      return null;
    }
  }

  function setCurrentPlayer(name, department) {
    try {
      safeStorage.setItem(CURRENT_PLAYER_KEY, JSON.stringify({ name, department }));
    } catch (e) {}
  }

  function resetToDefaults() {
    try {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LEADERBOARD));
    } catch (e) {}
    return [...DEFAULT_LEADERBOARD];
  }

  return {
    formatTime,
    calculateScore,
    getLeaderboard,
    saveScore,
    addBonusToCurrent,
    getCurrentPlayer,
    setCurrentPlayer,
    resetToDefaults
  };
});
