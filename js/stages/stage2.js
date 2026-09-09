/**
 * Stage 2: Real-time Transaction / Cyber Packet Defense
 * (مرکز عملیات امنیت شبکه، پایانه کارتخوان غول‌پیکر و سوئیچ تراکنش بهسازان ملت)
 * 
 * Features:
 * - Gold Access Badge card swipe authentication
 * - Real-time incoming banking transaction stream (Shaparak, Mobile Bank, Core Banking)
 * - Threat detection & packet filtering (Legitimate transactions vs DDoS / Botnet cyber threats)
 * - Cryptographic OTP security handshake verification
 * - Dynamic load balancing across 3 network switch channels
 * - Keypad & tactile DTMF memory sequence as dual-mode input
 * - Prints Thermal Mystery Receipt upon successful network defense!
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Stage2 = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const BUTTON_TYPES = [
    { id: 0, key: 'mellat', name: 'نشان ملت', icon: '🔴', color: '#e30613' },
    { id: 1, key: 'tea', name: 'فنجان چای', icon: '☕', color: '#f59e0b' },
    { id: 2, key: 'keys', name: 'کلید سرور', icon: '🔑', color: '#3b82f6' },
    { id: 3, key: 'mobile', name: 'همراه‌بانک', icon: '📱', color: '#10b981' }
  ];

  // Target 4-step sequence (compatible with keypad tests)
  const TARGET_SEQUENCE = [0, 1, 3, 2];

  // Simulated transaction stream templates
  const TRANSACTION_POOL = [
    { id: 'tx-1', type: 'LEGIT', title: 'خرید اینترنتی شاپرک', card: '۶۱۰۴-۳۳**-****-۱۲۴۵', amount: '۱,۲۵۰,۰۰۰ ریال', channel: 0, ip: '192.168.1.42' },
    { id: 'tx-2', type: 'THREAT', title: 'سیل بسته‌های مشکوک DDoS', card: '۹۹۹۹-۰۰**-****-۰۰۰۱', amount: '۹۹,۹۹۹,۹۹۹ ریال', channel: 1, ip: '10.0.88.99', threatType: 'DDoS Flood' },
    { id: 'tx-3', type: 'LEGIT', title: 'انتقال وجه همراه‌بانک ملت', card: '۶۱۰۴-۳۳**-****-۸۸۹۲', amount: '۵,۰۰۰,۰۰۰ ریال', channel: 1, ip: '172.16.4.12' },
    { id: 'tx-4', type: 'THREAT', title: 'حمله جعل کارت فیشینگ', card: '۵۰۲۲-۲۹**-****-۷۷۱۱', amount: '۴۸,۰۰۰,۰۰۰ ریال', channel: 0, ip: '45.12.33.201', threatType: 'Credential Stuffing' },
    { id: 'tx-5', type: 'LEGIT', title: 'پرداخت قبض سامانه پایا', card: '۶۱۰۴-۳۳**-****-۳۴۵۱', amount: '۸۹۰,۰۰۰ ریال', channel: 2, ip: '192.168.10.15' },
    { id: 'tx-6', type: 'CRYPTO', title: 'بسته کلید رمزنگاری ۲۵۶', token: '256-HSM', challenge: 'تأیید امضای دیجیتال سرور', channel: 0 },
    { id: 'tx-7', type: 'LEGIT', title: 'تسویه پایانه فروشگاهی', card: '۶۱۰۴-۳۳**-****-۵۵۲۱', amount: '۳,۴۰۰,۰۰۰ ریال', channel: 0, ip: '192.168.1.103' },
    { id: 'tx-8', type: 'THREAT', title: 'تلاش نفوذ Brute-Force به سوئیچ', card: '۰۱۱۱-۰۰**-****-۸۸۸۸', amount: '۰ ریال', channel: 2, ip: '185.220.101.5', threatType: 'SSH Brute-force' },
    { id: 'tx-9', type: 'LEGIT', title: 'تراکنش ساتنا بین‌بانکی', card: '۶۱۰۴-۳۳**-****-۹۰۱۲', amount: '۲۵۰,۰۰۰,۰۰۰ ریال', channel: 2, ip: '10.200.1.50' },
    { id: 'tx-10', type: 'THREAT', title: 'بسته مسموم تزریق SQL', card: '۸۸۸۸-****-****-۴۴۴۴', amount: '۱,۰۰۰,۰۰۰ ریال', channel: 1, ip: '91.240.118.6', threatType: 'SQL Injection' },
    { id: 'tx-11', type: 'LEGIT', title: 'سپرده‌گذاری آنلاین ملت', card: '۶۱۰۴-۳۳**-****-۶۶۳۳', amount: '۱۲,۰۰۰,۰۰۰ ریال', channel: 1, ip: '192.168.5.88' },
    { id: 'tx-12', type: 'CRYPTO', title: 'کلید احراز هویت نهایی سوئیچ', token: 'BEHSAZAN-256', challenge: 'همگام‌سازی کلید نشست', channel: 2 }
  ];

  let isCardSwiped = false;
  let playerSequence = [];
  let isDisplayingSequence = false;
  let isCompleted = false;

  // Stream state
  let currentQueueIndex = 0;
  let activePacket = null;
  let legitApprovedCount = 0;
  let threatsBlockedCount = 0;
  let cryptoTokensSolved = 0;
  let activeChannel = 0; // 0: POS/Shaparak, 1: Mobile Banking, 2: Core Paya
  let channelLoads = [30, 45, 20]; // Percentage load
  const TARGET_GOAL = {
    legit: 4,
    threats: 3,
    crypto: 1
  };

  function initStage() {
    isCardSwiped = false;
    playerSequence = [];
    isDisplayingSequence = false;
    isCompleted = false;
    currentQueueIndex = 0;
    activePacket = null;
    legitApprovedCount = 0;
    threatsBlockedCount = 0;
    cryptoTokensSolved = 0;
    activeChannel = 0;
    channelLoads = [30, 45, 20];
    return getState();
  }

  function swipeCard() {
    isCardSwiped = true;
    playerSequence = [];
    activePacket = getNextPacket();
    return {
      isCardSwiped: true,
      activePacket
    };
  }

  function getNextPacket() {
    if (currentQueueIndex >= TRANSACTION_POOL.length) {
      currentQueueIndex = 0; // Loop pool if needed
    }
    activePacket = { ...TRANSACTION_POOL[currentQueueIndex] };
    currentQueueIndex++;
    return activePacket;
  }

  function approvePacket(packetId) {
    if (!isCardSwiped || isCompleted) return { status: 'ignored' };
    const pkt = activePacket || TRANSACTION_POOL.find(p => p.id === packetId);
    if (!pkt) return { status: 'not_found' };

    if (pkt.type === 'LEGIT') {
      legitApprovedCount++;
      channelLoads[activeChannel] = Math.max(10, channelLoads[activeChannel] - 15);
      checkDefenseCompletion();
      const next = isCompleted ? null : getNextPacket();
      return {
        status: 'approved_legit',
        message: '✓ تراکنش معتبر با موفقیت به سوئیچ مرکزی ارسال شد.',
        nextPacket: next,
        stats: getDefenseStats(),
        isCompleted
      };
    } else if (pkt.type === 'THREAT') {
      // Security breach! Allowed a cyber attack
      channelLoads[activeChannel] = Math.min(100, channelLoads[activeChannel] + 25);
      const next = getNextPacket();
      return {
        status: 'security_breach',
        message: '⚠️ هشدار امنیتی: بسته آلوده سایبری وارد شبکه شد! (کاهش پایداری هسته)',
        threatType: pkt.threatType,
        penalty: 5,
        nextPacket: next,
        stats: getDefenseStats(),
        isCompleted: false
      };
    } else {
      // Crypto packet needs decoding
      return {
        status: 'requires_crypto',
        message: 'این بسته نیازمند اعتبارسنجی توکن رمزنگاری است.',
        packet: pkt
      };
    }
  }

  function blockPacket(packetId) {
    if (!isCardSwiped || isCompleted) return { status: 'ignored' };
    const pkt = activePacket || TRANSACTION_POOL.find(p => p.id === packetId);
    if (!pkt) return { status: 'not_found' };

    if (pkt.type === 'THREAT') {
      threatsBlockedCount++;
      channelLoads[activeChannel] = Math.max(10, channelLoads[activeChannel] - 20);
      checkDefenseCompletion();
      const next = isCompleted ? null : getNextPacket();
      return {
        status: 'threat_blocked',
        message: `🛡️ حمله سایبری (${pkt.threatType}) توسط دیوار آتش بهسازان خنثی شد!`,
        nextPacket: next,
        stats: getDefenseStats(),
        isCompleted
      };
    } else if (pkt.type === 'LEGIT') {
      // False positive penalty
      const next = getNextPacket();
      return {
        status: 'false_positive',
        message: '⚠️ خطای فیلترینگ: تراکنش مشتری معتبر به اشتباه مسدود شد!',
        penalty: 3,
        nextPacket: next,
        stats: getDefenseStats(),
        isCompleted: false
      };
    } else {
      const next = getNextPacket();
      return {
        status: 'crypto_bypassed',
        nextPacket: next
      };
    }
  }

  function solveCryptoToken(tokenInput) {
    if (!isCardSwiped || isCompleted) return { status: 'ignored' };
    cryptoTokensSolved++;
    checkDefenseCompletion();
    const next = isCompleted ? null : getNextPacket();
    return {
      status: 'crypto_verified',
      message: '✓ امضای دیجیتال و توکن ۲۵۶ تأیید شد!',
      nextPacket: next,
      stats: getDefenseStats(),
      isCompleted
    };
  }

  function switchChannel(channelId) {
    if (channelId >= 0 && channelId <= 2) {
      activeChannel = channelId;
      // Balancing load
      channelLoads[channelId] = Math.max(15, channelLoads[channelId] - 10);
    }
    return {
      activeChannel,
      channelLoads: [...channelLoads]
    };
  }

  function checkDefenseCompletion() {
    if (
      legitApprovedCount >= TARGET_GOAL.legit &&
      threatsBlockedCount >= TARGET_GOAL.threats &&
      cryptoTokensSolved >= TARGET_GOAL.crypto
    ) {
      isCompleted = true;
    }
    return isCompleted;
  }

  function getDefenseStats() {
    return {
      legitApprovedCount,
      threatsBlockedCount,
      cryptoTokensSolved,
      targetGoal: { ...TARGET_GOAL },
      percentComplete: Math.min(
        100,
        Math.round(
          ((legitApprovedCount / TARGET_GOAL.legit +
            threatsBlockedCount / TARGET_GOAL.threats +
            cryptoTokensSolved / TARGET_GOAL.crypto) /
            3) *
            100
        )
      )
    };
  }

  // Keypad button logic (Backward-compatible with Simon Says & manual sequence input)
  function handleButtonPress(buttonIndex) {
    if (!isCardSwiped || isDisplayingSequence || isCompleted) {
      return { status: 'ignored' };
    }

    const expectedIndex = TARGET_SEQUENCE[playerSequence.length];

    if (buttonIndex === expectedIndex) {
      playerSequence.push(buttonIndex);

      if (playerSequence.length === TARGET_SEQUENCE.length) {
        // Also satisfy the defense goals so completing either path completes the stage!
        legitApprovedCount = Math.max(legitApprovedCount, TARGET_GOAL.legit);
        threatsBlockedCount = Math.max(threatsBlockedCount, TARGET_GOAL.threats);
        cryptoTokensSolved = Math.max(cryptoTokensSolved, TARGET_GOAL.crypto);
        isCompleted = true;
        return {
          status: 'success',
          isCompleted: true,
          playerSequence: [...playerSequence]
        };
      }

      return {
        status: 'correct_step',
        step: playerSequence.length,
        total: TARGET_SEQUENCE.length
      };
    } else {
      playerSequence = [];
      return {
        status: 'fail',
        reason: 'اشتباه بود! لطفاً مجدداً الگوی دکمه‌ها را تکرار کنید.'
      };
    }
  }

  function setSequenceDisplaying(value) {
    isDisplayingSequence = !!value;
    return isDisplayingSequence;
  }

  function getTargetSequence() {
    return [...TARGET_SEQUENCE];
  }

  function getState() {
    return {
      isCardSwiped,
      isCompleted,
      isDisplayingSequence,
      playerSequence: [...playerSequence],
      targetSequence: [...TARGET_SEQUENCE],
      activePacket,
      activeChannel,
      channelLoads: [...channelLoads],
      stats: getDefenseStats()
    };
  }

  return {
    BUTTON_TYPES,
    TRANSACTION_POOL,
    initStage,
    swipeCard,
    getNextPacket,
    approvePacket,
    blockPacket,
    solveCryptoToken,
    switchChannel,
    handleButtonPress,
    setSequenceDisplaying,
    getTargetSequence,
    getDefenseStats,
    getState
  };
});
