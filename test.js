const { describe, it } = require("node:test");
const assert = require("node:assert");

const {
  virtualWorld,
  gridCircularity,
  moveZombie,
  getMoveDetails,
  validatePremise,
} = require("./main");

const testPremise = {
  grid: 4,
  zombie: { x: 3, y: 1 },
  creatures: [
    { x: 0, y: 1 },
    { x: 1, y: 2 },
    { x: 1, y: 1 },
  ],
  moves: "RDRU",
};

// Helper: run all moves for a zombie synchronously (no delay)
const runMoves = (sim, zombie) => {
  for (const move of sim.moves) {
    switch (move) {
      case "R":
        moveZombie(sim, zombie, "x", "+");
        break;
      case "L":
        moveZombie(sim, zombie, "x", "-");
        break;
      case "D":
        moveZombie(sim, zombie, "y", "+");
        break;
      case "U":
        moveZombie(sim, zombie, "y", "-");
        break;
    }
  }
  sim.finalPositions.push({ x: zombie.x, y: zombie.y });
};

describe("Zombie Apocalypse", () => {
  describe("gridCircularity", () => {
    it("should wrap forward (0 -> 1)", () => {
      assert.strictEqual(gridCircularity(0, "+", 4), 1);
    });

    it("should wrap forward at boundary (3 -> 0)", () => {
      assert.strictEqual(gridCircularity(3, "+", 4), 0);
    });

    it("should wrap backward (0 -> 3)", () => {
      assert.strictEqual(gridCircularity(0, "-", 4), 3);
    });

    it("should wrap backward normally (2 -> 1)", () => {
      assert.strictEqual(gridCircularity(2, "-", 4), 1);
    });
  });

  describe("virtualWorld", () => {
    it("should initialise with correct gridSize", () => {
      const sim = virtualWorld(testPremise);
      assert.strictEqual(sim.gridSize, 4);
    });

    it("should place zombie in queue", () => {
      const sim = virtualWorld(testPremise);
      assert.strictEqual(sim.zombieQueue.length, 1);
      assert.deepStrictEqual(sim.zombieQueue[0], { x: 3, y: 1 });
    });

    it("should place 3 creatures as keys in Set", () => {
      const sim = virtualWorld(testPremise);
      assert.strictEqual(sim.creatures.size, 3);
      assert.ok(sim.creatures.has("0,1"));
      assert.ok(sim.creatures.has("1,2"));
      assert.ok(sim.creatures.has("1,1"));
    });

    it("should start with empty finalPositions and infectedSet", () => {
      const sim = virtualWorld(testPremise);
      assert.strictEqual(sim.finalPositions.length, 0);
      assert.strictEqual(sim.infectedSet.size, 0);
    });
  });

  describe("moveZombie", () => {
    it("Move R: zombie at (3,1) wraps to (0,1) and infects creature", () => {
      const sim = virtualWorld(testPremise);
      const zombie = sim.zombieQueue[0];
      moveZombie(sim, zombie, "x", "+");

      assert.strictEqual(zombie.x, 0);
      assert.strictEqual(zombie.y, 1);
      assert.ok(
        sim.infectedSet.has("0,1"),
        "Creature at (0,1) should be infected",
      );
      assert.ok(
        !sim.creatures.has("0,1"),
        "Creature at (0,1) should be removed",
      );
    });

    it("Move D: zombie at (0,1) moves to (0,2)", () => {
      const sim = virtualWorld(testPremise);
      const zombie = sim.zombieQueue[0];
      // R first
      moveZombie(sim, zombie, "x", "+");
      // D
      moveZombie(sim, zombie, "y", "+");

      assert.strictEqual(zombie.x, 0);
      assert.strictEqual(zombie.y, 2);
    });
  });

  describe("Full simulation with moves RDRU", () => {
    it("first zombie should end at (1,1) infecting all 3 creatures", () => {
      const sim = virtualWorld(testPremise);
      const zombie = sim.zombieQueue.shift();
      runMoves(sim, zombie);

      assert.deepStrictEqual(
        { x: zombie.x, y: zombie.y },
        { x: 1, y: 1 },
        "Zombie should end at (1,1)",
      );
      assert.strictEqual(sim.infectedSet.size, 3, "All 3 creatures infected");
      assert.ok(sim.infectedSet.has("0,1"));
      assert.ok(sim.infectedSet.has("1,2"));
      assert.ok(sim.infectedSet.has("1,1"));
      assert.strictEqual(sim.zombieQueue.length, 3, "3 zombies queued");
    });

    it("should drain queue and produce 4 final positions", () => {
      const sim = virtualWorld(testPremise);

      // First zombie
      const first = sim.zombieQueue.shift();
      runMoves(sim, first);

      // Process queue
      while (sim.zombieQueue.length > 0) {
        const z = sim.zombieQueue.shift();
        runMoves(sim, z);
      }

      assert.strictEqual(sim.zombieQueue.length, 0, "Queue should be empty");
      assert.strictEqual(sim.finalPositions.length, 4, "4 final zombies");

      // First zombie ends at (1,1)
      assert.deepStrictEqual(sim.finalPositions[0], { x: 1, y: 1 });

      const positions = sim.finalPositions.map((p) => `(${p.x},${p.y})`);
      console.log("Final positions:", positions.join(", "));

      const remaining = [...sim.creatures];
      console.log(
        "Remaining creatures:",
        remaining.length > 0
          ? remaining.map((k) => `(${k})`).join(", ")
          : "None",
      );
    });
  });
});

// --- Validation tests ---

describe("validatePremise", () => {
  it("should pass for a valid premise", () => {
    const errors = validatePremise(testPremise);
    assert.strictEqual(errors.length, 0);
  });

  it("should fail when grid size is too small", () => {
    const errors = validatePremise({ ...testPremise, grid: 1 });
    assert.ok(errors.some((e) => e.includes("Grid size")));
  });

  it("should fail when grid size is too large", () => {
    const errors = validatePremise({ ...testPremise, grid: 51 });
    assert.ok(errors.some((e) => e.includes("Grid size")));
  });

  it("should fail when zombie is out of bounds", () => {
    const errors = validatePremise({
      ...testPremise,
      zombie: { x: 5, y: 0 },
    });
    assert.ok(errors.some((e) => e.includes("Zombie position")));
  });

  it("should fail when a creature is out of bounds", () => {
    const errors = validatePremise({
      ...testPremise,
      creatures: [
        { x: 0, y: 1 },
        { x: 10, y: 10 },
      ],
    });
    assert.ok(errors.some((e) => e.includes("out of bounds")));
  });

  it("should fail when creature overlaps zombie", () => {
    const errors = validatePremise({
      ...testPremise,
      creatures: [{ x: 3, y: 1 }],
    });
    assert.ok(errors.some((e) => e.includes("Duplicate")));
  });

  it("should fail when two creatures share a position", () => {
    const errors = validatePremise({
      ...testPremise,
      creatures: [
        { x: 0, y: 1 },
        { x: 0, y: 1 },
      ],
    });
    assert.ok(errors.some((e) => e.includes("Duplicate")));
  });

  it("should fail for invalid moves", () => {
    const errors = validatePremise({ ...testPremise, moves: "RXDU" });
    assert.ok(errors.some((e) => e.includes("Moves")));
  });

  it("should fail for empty moves", () => {
    const errors = validatePremise({ ...testPremise, moves: "" });
    assert.ok(errors.some((e) => e.includes("Moves")));
  });
});

// --- 16x16 grid ---

describe("16x16 grid simulation", () => {
  const premise16 = {
    grid: 16,
    zombie: { x: 0, y: 0 },
    creatures: [
      { x: 1, y: 0 },
      { x: 15, y: 0 },
      { x: 8, y: 8 },
    ],
    moves: "RRDDLLUU",
  };

  it("should validate cleanly", () => {
    assert.strictEqual(validatePremise(premise16).length, 0);
  });

  it("should complete full simulation with queue drain", () => {
    const sim = virtualWorld(premise16);

    const first = sim.zombieQueue.shift();
    runMoves(sim, first);

    while (sim.zombieQueue.length > 0) {
      const z = sim.zombieQueue.shift();
      runMoves(sim, z);
    }

    assert.strictEqual(sim.zombieQueue.length, 0, "Queue should be empty");
    assert.ok(sim.finalPositions.length >= 1, "At least 1 final position");
    console.log(
      "16x16 final positions:",
      sim.finalPositions.map((p) => `(${p.x},${p.y})`).join(", "),
    );
    const remaining16 = [...sim.creatures];
    console.log(
      "16x16 remaining creatures:",
      remaining16.length > 0
        ? remaining16.map((k) => `(${k})`).join(", ")
        : "None",
    );
  });

  it("should wrap correctly at boundary 15", () => {
    assert.strictEqual(gridCircularity(15, "+", 16), 0);
    assert.strictEqual(gridCircularity(0, "-", 16), 15);
  });
});

// --- 32x32 grid ---

describe("32x32 grid simulation", () => {
  const premise32 = {
    grid: 32,
    zombie: { x: 16, y: 16 },
    creatures: [
      { x: 17, y: 16 },
      { x: 16, y: 17 },
      { x: 0, y: 0 },
      { x: 31, y: 31 },
    ],
    moves: "RRDDLLUU",
  };

  it("should validate cleanly", () => {
    assert.strictEqual(validatePremise(premise32).length, 0);
  });

  it("should complete full simulation with queue drain", () => {
    const sim = virtualWorld(premise32);

    const first = sim.zombieQueue.shift();
    runMoves(sim, first);

    while (sim.zombieQueue.length > 0) {
      const z = sim.zombieQueue.shift();
      runMoves(sim, z);
    }

    assert.strictEqual(sim.zombieQueue.length, 0, "Queue should be empty");
    assert.ok(sim.finalPositions.length >= 1, "At least 1 final position");
    console.log(
      "32x32 final positions:",
      sim.finalPositions.map((p) => `(${p.x},${p.y})`).join(", "),
    );
    const remaining32 = [...sim.creatures];
    console.log(
      "32x32 remaining creatures:",
      remaining32.length > 0
        ? remaining32.map((k) => `(${k})`).join(", ")
        : "None",
    );
  });

  it("should wrap correctly at boundary 31", () => {
    assert.strictEqual(gridCircularity(31, "+", 32), 0);
    assert.strictEqual(gridCircularity(0, "-", 32), 31);
  });
});
