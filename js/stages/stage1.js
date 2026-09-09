/**
 * Stage 1: Active Power Grid & Surge Stabilization
 * (اتاق توان، چایساز و مدار تثبیت ولتاژ ۲۲۰ ولت دیتاسنتر)
 * 
 * Features:
 * - 4x4 Multi-Path High-Voltage Grid (16 dynamic tiles)
 * - Dual electrical endpoints: Main Substation -> Central Server & Tea Kettle
 * - Real-time electrical current flow & node excitation
 * - Voltage Regulation System: 220V Nominal target (216V - 224V safe window)
 * - Dynamic Power Surge & Grounding Breaker mechanics
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Stage1 = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // Directions: 0: Up (-1 row), 1: Right (+1 col), 2: Down (+1 row), 3: Left (-1 col)
  const DIRS = [
    { dr: -1, dc: 0, opposite: 2 }, // Up
    { dr: 0, dc: 1, opposite: 3 },  // Right
    { dr: 1, dc: 0, opposite: 0 },  // Down
    { dr: 0, dc: -1, opposite: 1 }  // Left
  ];

  // Base tile definitions at 0 degrees
  const TILE_DEFS = {
    straight: [1, 3],       // Left-Right
    corner: [0, 1],         // Up-Right
    tee: [0, 1, 3],         // Up-Right-Left
    cross: [0, 1, 2, 3]     // All 4 directions
  };

  // 4x4 Grid Configuration
  // Source enters (0,0) from Left (dir 3)
  // Exit 1 (Kettle / Auxiliary Capacitor): at (1,3) exiting Right (dir 1)
  // Exit 2 (Central Server Mainframe): at (3,3) exiting Right (dir 1)
  const DEFAULT_4X4_CONFIG = [
    // Row 0
    [
      { type: 'tee', solutionRot: 2, currentRot: 0 },       // (0,0) Source: enters Left(3), exits Right(1), Down(2)
      { type: 'straight', solutionRot: 0, currentRot: 1 },  // (0,1) Right-Left
      { type: 'corner', solutionRot: 2, currentRot: 3 },    // (0,2) Left-Down
      { type: 'straight', solutionRot: 1, currentRot: 0 }   // (0,3) Aux
    ],
    // Row 1
    [
      { type: 'straight', solutionRot: 1, currentRot: 0 },  // (1,0) Up-Down
      { type: 'cross', solutionRot: 0, currentRot: 0 },     // (1,1) Cross transformer
      { type: 'corner', solutionRot: 0, currentRot: 2 },    // (1,2) Up-Right
      { type: 'tee', solutionRot: 2, currentRot: 1 }        // (1,3) Exit 1 (Kettle): Left(3), Right(1), Down(2)
    ],
    // Row 2
    [
      { type: 'corner', solutionRot: 0, currentRot: 1 },    // (2,0) Up-Right
      { type: 'corner', solutionRot: 2, currentRot: 3 },    // (2,1) Left-Down
      { type: 'cross', solutionRot: 0, currentRot: 0 },     // (2,2) Transformer bridge
      { type: 'straight', solutionRot: 1, currentRot: 0 }   // (2,3) Up-Down
    ],
    // Row 3
    [
      { type: 'corner', solutionRot: 1, currentRot: 2 },    // (3,0) Aux
      { type: 'corner', solutionRot: 0, currentRot: 2 },    // (3,1) Up-Right
      { type: 'straight', solutionRot: 0, currentRot: 1 },  // (3,2) Left-Right
      { type: 'tee', solutionRot: 0, currentRot: 3 }        // (3,3) Exit 2 (Server): Left(3), Right(1), Up(0)
    ]
  ];

  let grid = [];
  let isCircuitConnected = false;
  let voltage = 246; // Starts over-volted (needs regulation to 220V)
  let activeSurgeNode = null;
  let isSurgeSuppressed = true;
  let isSolved = false;

  function getTileExits(tile) {
    const baseExits = TILE_DEFS[tile.type] || [];
    return baseExits.map(d => (d + tile.currentRot) % 4);
  }

  function initGrid(config = null) {
    const template = config || DEFAULT_4X4_CONFIG;
    grid = template.map(row =>
      row.map(cell => ({
        type: cell.type,
        solutionRot: cell.solutionRot !== undefined ? cell.solutionRot : 0,
        currentRot: cell.currentRot !== undefined ? cell.currentRot : 0,
        isPowered: false
      }))
    );
    voltage = 246; // Initial unstable voltage
    activeSurgeNode = null;
    isSurgeSuppressed = true;
    isCircuitConnected = false;
    isSolved = false;
    evaluatePowerFlow();
    return grid;
  }

  function rotateTile(r, c) {
    if (isSolved) return getGridState();
    if (!grid[r] || !grid[r][c]) return getGridState();

    grid[r][c].currentRot = (grid[r][c].currentRot + 1) % 4;
    evaluatePowerFlow();
    return getGridState();
  }

  function evaluatePowerFlow() {
    // Reset power state
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        grid[r][c].isPowered = false;
      }
    }

    if (!grid[0] || !grid[0][0]) {
      isCircuitConnected = false;
      isSolved = false;
      return;
    }

    // Source enters at (0,0) from Left (direction 3)
    const sourceCell = grid[0][0];
    const sourceExits = getTileExits(sourceCell);

    if (!sourceExits.includes(3)) {
      isCircuitConnected = false;
      checkSolvedState();
      return;
    }

    const queue = [{ r: 0, c: 0 }];
    sourceCell.isPowered = true;
    const visited = new Set(['0,0']);

    while (queue.length > 0) {
      const { r, c } = queue.shift();
      const currentCell = grid[r][c];
      const exits = getTileExits(currentCell);

      for (const dirIdx of exits) {
        const dir = DIRS[dirIdx];
        const nr = r + dir.dr;
        const nc = c + dir.dc;

        if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
          const neighborKey = `${nr},${nc}`;
          if (!visited.has(neighborKey)) {
            const neighborCell = grid[nr][nc];
            const neighborExits = getTileExits(neighborCell);

            // Must connect back in opposite direction
            if (neighborExits.includes(dir.opposite)) {
              neighborCell.isPowered = true;
              visited.add(neighborKey);
              queue.push({ r: nr, c: nc });
            }
          }
        }
      }
    }

    // Exit 1: Tea Maker & Auxiliary Capacitor at (1, 3) (or (grid.length-1, grid[0].length-1) if smaller grid)
    const exit1Row = Math.min(1, grid.length - 1);
    const exit1Col = grid[0].length - 1;
    const exit1Cell = grid[exit1Row][exit1Col];
    const exit1Ok = exit1Cell && exit1Cell.isPowered && getTileExits(exit1Cell).includes(1);

    // Exit 2: Central Mainframe Server at (3, 3) (last row, last col)
    const exit2Row = grid.length - 1;
    const exit2Col = grid[0].length - 1;
    const exit2Cell = grid[exit2Row][exit2Col];
    const exit2Ok = exit2Cell && exit2Cell.isPowered && getTileExits(exit2Cell).includes(1);

    // If grid is 3x3 (legacy/custom), 1 exit is sufficient; if 4x4, both exits must be energized!
    if (grid.length <= 3) {
      isCircuitConnected = exit2Ok;
    } else {
      isCircuitConnected = exit1Ok && exit2Ok;
    }

    checkSolvedState();
  }

  function setVoltage(newVoltage) {
    voltage = Math.max(160, Math.min(280, Math.round(newVoltage)));
    checkSolvedState();
    return getGridState();
  }

  function adjustVoltage(delta) {
    return setVoltage(voltage + delta);
  }

  function isVoltageStable() {
    // Nominal 220V ± 4V tolerance
    return voltage >= 216 && voltage <= 224;
  }

  function triggerSurge(r = 1, c = 1) {
    if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length) {
      activeSurgeNode = { r, c };
      isSurgeSuppressed = false;
      checkSolvedState();
    }
    return getGridState();
  }

  function divertSurge() {
    activeSurgeNode = null;
    isSurgeSuppressed = true;
    checkSolvedState();
    return getGridState();
  }

  function checkSolvedState() {
    // Stage 1 is fully solved when:
    // 1) Circuit connects power from main substation to both server and tea kettle
    // 2) Voltage is regulated into the nominal safe window (216V - 224V)
    // 3) Any active power surges are grounded/suppressed
    if (isCircuitConnected && isVoltageStable() && isSurgeSuppressed) {
      isSolved = true;
    } else {
      isSolved = false;
    }
  }

  function autoSolve() {
    if (!grid || grid.length < 3) initGrid();

    if (grid.length === 3) {
      // 3x3 fallback
      grid[0][0].currentRot = 2;
      grid[1][0].currentRot = 1;
      grid[2][0].currentRot = 0;
      grid[2][1].currentRot = 0;
      grid[2][2].currentRot = 0;
    } else {
      // 4x4 standard grid
      const solutionRotations = [
        [2, 0, 2, 0],
        [1, 0, 0, 2],
        [0, 2, 0, 1],
        [1, 0, 0, 0]
      ];
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (solutionRotations[r] && solutionRotations[r][c] !== undefined) {
            grid[r][c].currentRot = solutionRotations[r][c];
          }
        }
      }
    }

    voltage = 220;
    activeSurgeNode = null;
    isSurgeSuppressed = true;
    evaluatePowerFlow();
    isSolved = true;
    return getGridState();
  }

  function getGridState() {
    return {
      grid,
      isCircuitConnected,
      voltage,
      isVoltageStable: isVoltageStable(),
      activeSurgeNode,
      isSurgeSuppressed,
      isSolved
    };
  }

  return {
    initGrid,
    rotateTile,
    evaluatePowerFlow,
    setVoltage,
    adjustVoltage,
    isVoltageStable,
    triggerSurge,
    divertSurge,
    getGridState,
    getTileExits,
    autoSolve,
    DIRS,
    TILE_DEFS,
    DEFAULT_4X4_CONFIG
  };
});
