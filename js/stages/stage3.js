/**
 * Stage 3: Multi-layer Optical Laser Vault & HSM Core
 * (گاوصندوق اپتیکال لیزری، منشورها و ماژول سخت‌افزاری امنیتی ۲۵۶)
 * 
 * Features:
 * - 5x5 Optical Laser Bench Matrix with interactive mirrors, splitters & obstacles
 * - Real-time Raytracing engine calculating beam reflections and split paths
 * - Dual photoelectric receptors (Sensor Alpha & Sensor Beta)
 * - 3 Mechanical Combination Dials [2, 5, 6] controlling lens focus & deadbolts
 * - Vault unlocks when both laser receptors are energized AND dials match 2-5-6!
 * - Unlocks glowing 256 Quantum Crystal Prism
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Stage3 = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const TARGET_CODE = [2, 5, 6];
  let dials = [7, 1, 4]; // Scrambled starting position

  // Directions: 0: Up, 1: Right, 2: Down, 3: Left
  const DIRS = [
    { dr: -1, dc: 0 }, // Up
    { dr: 0, dc: 1 },  // Right
    { dr: 1, dc: 0 },  // Down
    { dr: 0, dc: -1 }  // Left
  ];

  // 5x5 Optical Grid Layout
  // Cell types:
  // 'empty': empty space laser passes through
  // 'mirror': rotatable 45/135 deg mirror (rot 0: '/', rot 1: '\')
  // 'splitter': divides beam (one straight, one 90-deg turn)
  // 'block': absorbs laser
  // 'sensor_a': Photoelectric Receptor Alpha (Target 1)
  // 'sensor_b': Photoelectric Receptor Beta (Target 2)
  // 'emitter': High-energy Laser Emitter
  const DEFAULT_OPTICAL_GRID = [
    // Row 0
    [
      { type: 'emitter', rot: 1 },                       // (0,0) Emitter shooting Right
      { type: 'empty' },                                 // (0,1)
      { type: 'mirror', rot: 0, solutionRot: 1 },        // (0,2) Mirror: reflects Right to Down
      { type: 'block' },                                 // (0,3) Firewall block
      { type: 'empty' }                                  // (0,4)
    ],
    // Row 1
    [
      { type: 'empty' },                                 // (1,0)
      { type: 'empty' },                                 // (1,1)
      { type: 'splitter', rot: 0, solutionRot: 0 },      // (1,2) Splitter: sends beam Right & Down
      { type: 'empty' },                                 // (1,3)
      { type: 'sensor_a' }                               // (1,4) Target Sensor Alpha!
    ],
    // Row 2
    [
      { type: 'block' },                                 // (2,0) Firewall block
      { type: 'empty' },                                 // (2,1)
      { type: 'mirror', rot: 0, solutionRot: 1 },        // (2,2) Mirror: reflects Down to Right
      { type: 'empty' },                                 // (2,3)
      { type: 'mirror', rot: 0, solutionRot: 1 }         // (2,4) Mirror: reflects Right to Down
    ],
    // Row 3
    [
      { type: 'empty' },                                 // (3,0)
      { type: 'empty' },                                 // (3,1)
      { type: 'block' },                                 // (3,2) Firewall block
      { type: 'empty' },                                 // (3,3)
      { type: 'sensor_b' }                               // (3,4) Target Sensor Beta!
    ],
    // Row 4
    [
      { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }
    ]
  ];

  let opticalGrid = [];
  let laserPaths = [];
  let sensorAHit = false;
  let sensorBHit = false;
  let isUnlocked = false;
  let isCrystalCollected = false;

  function initOpticalGrid() {
    opticalGrid = DEFAULT_OPTICAL_GRID.map(row =>
      row.map(cell => ({
        type: cell.type,
        rot: cell.rot !== undefined ? cell.rot : 0,
        solutionRot: cell.solutionRot !== undefined ? cell.solutionRot : 0
      }))
    );
    traceLaser();
  }

  function rotateMirror(r, c) {
    if (isUnlocked) return getState();
    if (!opticalGrid[r] || !opticalGrid[r][c]) return getState();

    const cell = opticalGrid[r][c];
    if (cell.type === 'mirror' || cell.type === 'splitter') {
      cell.rot = (cell.rot + 1) % 2; // Toggles between 0 ('/') and 1 ('\')
      traceLaser();
      checkCombination();
    }
    return getState();
  }

  let laserCells = [];

  function traceLaser() {
    laserPaths = [];
    sensorAHit = false;
    sensorBHit = false;

    // Reset 5x5 laser cells grid
    laserCells = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => ({
        hasLaser: false,
        horiz: false,
        vert: false,
        color: '#ff2244'
      }))
    );

    // Laser begins at (0, 0) traveling Right (dir 1)
    const queue = [{ r: 0, c: 0, dir: 1, color: '#ff2244' }];
    const visited = new Set();

    while (queue.length > 0) {
      const beam = queue.shift();
      let { r, c, dir, color } = beam;

      const pathSeg = { r1: r, c1: c, points: [{ r, c }], color };

      // Mark origin cell as active
      if (laserCells[r] && laserCells[r][c]) {
        laserCells[r][c].hasLaser = true;
        if (dir === 1 || dir === 3) laserCells[r][c].horiz = true;
        if (dir === 0 || dir === 2) laserCells[r][c].vert = true;
        laserCells[r][c].color = color;
      }

      // Step along ray
      while (true) {
        const nr = r + DIRS[dir].dr;
        const nc = c + DIRS[dir].dc;

        // Check bounds
        if (nr < 0 || nr >= opticalGrid.length || nc < 0 || nc >= opticalGrid[0].length) {
          pathSeg.points.push({ r: nr, c: nc });
          break;
        }

        const stateKey = `${nr},${nc},${dir}`;
        if (visited.has(stateKey)) break;
        visited.add(stateKey);

        const targetCell = opticalGrid[nr][nc];
        pathSeg.points.push({ r: nr, c: nc });

        // Mark cell in laserCells
        if (laserCells[nr] && laserCells[nr][nc]) {
          laserCells[nr][nc].hasLaser = true;
          if (dir === 1 || dir === 3) laserCells[nr][nc].horiz = true;
          if (dir === 0 || dir === 2) laserCells[nr][nc].vert = true;
          laserCells[nr][nc].color = color;
        }

        if (targetCell.type === 'block') {
          // Beam absorbed
          break;
        } else if (targetCell.type === 'sensor_a') {
          sensorAHit = true;
          break;
        } else if (targetCell.type === 'sensor_b') {
          sensorBHit = true;
          break;
        } else if (targetCell.type === 'mirror') {
          // Accurate optical reflection
          let newDir = dir;
          if (targetCell.rot === 0) {
            // '/'
            if (dir === 1) newDir = 0;       // Right -> Up
            else if (dir === 2) newDir = 3;  // Down -> Left
            else if (dir === 3) newDir = 2;  // Left -> Down
            else if (dir === 0) newDir = 1;  // Up -> Right
          } else {
            // '\'
            if (dir === 1) newDir = 2;       // Right -> Down
            else if (dir === 2) newDir = 1;  // Down -> Right
            else if (dir === 3) newDir = 0;  // Left -> Up
            else if (dir === 0) newDir = 3;  // Up -> Left
          }
          queue.push({ r: nr, c: nc, dir: newDir, color });
          break;
        } else if (targetCell.type === 'splitter') {
          // Splits into 2 beams: one goes Right (dir 1, cyan), one continues Down (dir 2, red)
          queue.push({ r: nr, c: nc, dir: 1, color: '#00f2fe' });
          queue.push({ r: nr, c: nc, dir: 2, color: '#ff2244' });
          break;
        }

        // Empty space, continue ray
        r = nr;
        c = nc;
      }

      laserPaths.push(pathSeg);
    }
  }

  function autoSolveOptical() {
    opticalGrid.forEach(row => {
      row.forEach(cell => {
        if (cell.solutionRot !== undefined) {
          cell.rot = cell.solutionRot;
        }
      });
    });
    traceLaser();
    checkCombination();
    return getState();
  }

  function autoSolveAll() {
    autoSolveOptical();
    dials = [...TARGET_CODE];
    checkCombination();
    return getState();
  }

  function initStage(initialDials = [7, 1, 4]) {
    dials = [...initialDials];
    isUnlocked = false;
    isCrystalCollected = false;
    initOpticalGrid();
    checkCombination();
    return getState();
  }

  function rotateDial(dialIndex, delta) {
    if (isUnlocked) return getState();
    if (dialIndex < 0 || dialIndex >= 3) return getState();

    dials[dialIndex] = (dials[dialIndex] + delta + 10) % 10;
    checkCombination();
    return getState();
  }

  function setDial(dialIndex, value) {
    if (isUnlocked) return getState();
    if (dialIndex < 0 || dialIndex >= 3) return getState();
    dials[dialIndex] = (value % 10 + 10) % 10;
    checkCombination();
    return getState();
  }

  function checkCombination() {
    const isDialsCorrect =
      dials[0] === TARGET_CODE[0] &&
      dials[1] === TARGET_CODE[1] &&
      dials[2] === TARGET_CODE[2];

    // Vault strictly requires BOTH optical sensors to be energized AND combination dials 2-5-6!
    if (sensorAHit && sensorBHit && isDialsCorrect) {
      isUnlocked = true;
    } else {
      isUnlocked = false;
    }
  }

  function collectCrystal() {
    if (isUnlocked && !isCrystalCollected) {
      isCrystalCollected = true;
      return true;
    }
    return false;
  }

  function getState() {
    const isDialsCorrect =
      dials[0] === TARGET_CODE[0] &&
      dials[1] === TARGET_CODE[1] &&
      dials[2] === TARGET_CODE[2];

    return {
      dials: [...dials],
      targetCode: [...TARGET_CODE],
      isDialsCorrect,
      opticalGrid,
      laserPaths,
      laserCells,
      sensorAHit,
      sensorBHit,
      isOpticalAligned: sensorAHit && sensorBHit,
      isUnlocked,
      isCrystalCollected
    };
  }

  return {
    initStage,
    initOpticalGrid,
    rotateMirror,
    rotateDial,
    setDial,
    autoSolveOptical,
    autoSolveAll,
    collectCrystal,
    traceLaser,
    getState,
    TARGET_CODE
  };
});
