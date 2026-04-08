const { describe, it } = require("node:test");
const assert = require("node:assert");

const {
  grid,
  premiseSetup,
  moveZombies,
  gridCircularity,
  zombieQueue,
  infectedSet,
  finalZombiePositions,
} = require("./main");

// Test input from the initial premise
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

describe("Zombie Apocalypse - First case", () => {
  describe("gridCircularity", () => {
    it("should wrap forward (0 -> 1)", () => {
      assert.strictEqual(gridCircularity(0, "+"), 1);
    });

    it("should wrap forward at boundary (3 -> 0)", () => {
      assert.strictEqual(gridCircularity(3, "+"), 0);
    });

    it("should wrap backward (0 -> 3)", () => {
      assert.strictEqual(gridCircularity(0, "-"), 3);
    });

    it("should wrap backward normally (2 -> 1)", () => {
      assert.strictEqual(gridCircularity(2, "-"), 1);
    });
  });

  describe("premiseSetup", () => {
    it("should create 16 grid slots for a 4x4 grid", () => {
      const gridSlots = premiseSetup(testPremise);
      assert.strictEqual(gridSlots.length, 16);
    });

    it("should place zombie at (3, 1)", () => {
      const gridSlots = premiseSetup(testPremise);
      const zombie = gridSlots.find((s) => s.type === "zombie");
      assert.deepStrictEqual({ x: zombie.x, y: zombie.y }, { x: 3, y: 1 });
    });

    it("should place 3 creatures", () => {
      const gridSlots = premiseSetup(testPremise);
      const creatures = gridSlots.filter((s) => s.type === "creature");
      assert.strictEqual(creatures.length, 3);
    });

    it("should fill remaining slots as empty", () => {
      const gridSlots = premiseSetup(testPremise);
      const empty = gridSlots.filter((s) => s.type === "empty");
      assert.strictEqual(empty.length, 12); // 16 - 1 zombie - 3 creatures
    });
  });

  describe("moveZombies", () => {
    it("Move R: zombie at (3,1) should move to (0,1) and infect creature", () => {
      const gridSlots = premiseSetup(testPremise);
      moveZombies(gridSlots, "x", "+");

      const zombie = gridSlots.find(
        (s) => s.type === "zombie" && s.x === 0 && s.y === 1,
      );
      assert.ok(zombie, "Zombie should be at (0, 1) after moving right");
      assert.ok(
        infectedSet.has("0,1"),
        "Creature at (0,1) should be in infectedSet",
      );
    });

    it("Move D: zombie at (0,1) should move to (0,2)", () => {
      // Continue from previous state — gridSlots already has zombie at (0,1)
      const gridSlots = premiseSetup({
        ...testPremise,
        zombie: { x: 0, y: 1 },
        creatures: testPremise.creatures.filter(
          (c) => !infectedSet.has(`${c.x},${c.y}`),
        ),
      });
      moveZombies(gridSlots, "y", "+");

      const zombie = gridSlots.find(
        (s) => s.type === "zombie" && s.x === 0 && s.y === 2,
      );
      assert.ok(zombie, "Zombie should be at (0, 2) after moving down");
    });
  });

  describe("Full simulation with moves RDRU", () => {
    it("should produce correct final zombie positions after all moves", () => {
      // Reset shared state
      zombieQueue.length = 0;
      infectedSet.clear();
      finalZombiePositions.length = 0;

      const gridSlots = premiseSetup(testPremise);

      // Simulate RDRU synchronously
      const moves = testPremise.moves;
      for (const move of moves) {
        switch (move) {
          case "R":
            moveZombies(gridSlots, "x", "+");
            break;
          case "L":
            moveZombies(gridSlots, "x", "-");
            break;
          case "D":
            moveZombies(gridSlots, "y", "+");
            break;
          case "U":
            moveZombies(gridSlots, "y", "-");
            break;
        }
      }

      // After RDRU, zombie should end at (1,1) and all 3 creatures should be infected
      const zombies = gridSlots.filter((s) => s.type === "zombie");
      assert.strictEqual(zombies.length, 1, "Should have 1 zombie on grid");
      assert.deepStrictEqual(
        { x: zombies[0].x, y: zombies[0].y },
        { x: 1, y: 1 },
        "Zombie should end at (1, 1)",
      );

      assert.strictEqual(
        infectedSet.size,
        3,
        "All 3 creatures should be infected",
      );
      assert.ok(infectedSet.has("0,1"), "Creature at (0,1) infected");
      assert.ok(infectedSet.has("1,2"), "Creature at (1,2) infected");
      assert.ok(infectedSet.has("1,1"), "Creature at (1,1) infected");

      assert.strictEqual(
        zombieQueue.length,
        3,
        "3 newly infected zombies should be queued",
      );
    });

    it("should drain the queue after all infected zombies run moves", () => {
      // Reset shared state
      zombieQueue.length = 0;
      infectedSet.clear();
      finalZombiePositions.length = 0;

      const gridSlots = premiseSetup(testPremise);

      // First zombie runs RDRU
      for (const move of testPremise.moves) {
        switch (move) {
          case "R":
            moveZombies(gridSlots, "x", "+");
            break;
          case "L":
            moveZombies(gridSlots, "x", "-");
            break;
          case "D":
            moveZombies(gridSlots, "y", "+");
            break;
          case "U":
            moveZombies(gridSlots, "y", "-");
            break;
        }
      }
      const firstZombie = gridSlots.filter((s) => s.type === "zombie");
      finalZombiePositions.push({ x: firstZombie[0].x, y: firstZombie[0].y });

      // Process the queue
      while (zombieQueue.length > 0) {
        const infectedZombie = zombieQueue.shift();
        const updatedPremise = {
          ...testPremise,
          zombie: { x: infectedZombie.x, y: infectedZombie.y },
          creatures: testPremise.creatures.filter(
            (c) => !infectedSet.has(`${c.x},${c.y}`),
          ),
        };
        const newGridSlots = premiseSetup(updatedPremise);
        for (const move of testPremise.moves) {
          switch (move) {
            case "R":
              moveZombies(newGridSlots, "x", "+");
              break;
            case "L":
              moveZombies(newGridSlots, "x", "-");
              break;
            case "D":
              moveZombies(newGridSlots, "y", "+");
              break;
            case "U":
              moveZombies(newGridSlots, "y", "-");
              break;
          }
        }
        const endZombie = newGridSlots.filter((s) => s.type === "zombie");
        finalZombiePositions.push({ x: endZombie[0].x, y: endZombie[0].y });
      }

      assert.strictEqual(zombieQueue.length, 0, "Queue should be empty");
      assert.strictEqual(
        finalZombiePositions.length,
        4,
        "Should have 4 final zombies",
      );

      // Expected final positions: (1,1), (2,1), (2,2), (2,1)
      const positions = finalZombiePositions.map((p) => `(${p.x},${p.y})`);
      console.log("Final positions:", positions.join(", "));
    });
  });
});
