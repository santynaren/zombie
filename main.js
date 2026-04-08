(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.ZombieSim = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // Supports the terminal and browser envs

  const defaultPremise = {
    grid: 4,
    zombie: { x: 3, y: 1 },
    creatures: [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
    ],
    moves: "RDRU",
  };

  // moved to this approach based to maintain global state
  const virtualWorld = (premise) => ({
    gridSize: premise.grid,
    zombieQueue: [{ x: premise.zombie.x, y: premise.zombie.y }],
    creatures: new Set(premise.creatures.map((c) => `${c.x},${c.y}`)),
    infectedSet: new Set(),
    finalPositions: [],
    moves: premise.moves,
  });

  // handling the ability to make the movements across
  const gridCircularity = (coordinate, direction, gridSize) => {
    if (direction === "+") {
      return (coordinate + 1) % gridSize;
    } else {
      return (coordinate - 1 + gridSize) % gridSize;
    }
  };

  // trigger actions
  const moveZombie = (sim, zombie, axis, direction) => {
    if (axis === "x") {
      zombie.x = gridCircularity(zombie.x, direction, sim.gridSize);
    } else {
      zombie.y = gridCircularity(zombie.y, direction, sim.gridSize);
    }

    const key = `${zombie.x},${zombie.y}`;
    if (sim.creatures.has(key)) {
      sim.creatures.delete(key);
      sim.infectedSet.add(key);
      sim.zombieQueue.push({ x: zombie.x, y: zombie.y });
      return { infected: true, x: zombie.x, y: zombie.y };
    }
    return { infected: false, x: zombie.x, y: zombie.y };
  };

  const moveDetails = {
    R: { axis: "x", direction: "+", label: "east" },
    L: { axis: "x", direction: "-", label: "west" },
    D: { axis: "y", direction: "+", label: "south" },
    U: { axis: "y", direction: "-", label: "north" },
  };

  const getMoveDetails = (move) => moveDetails[move] || null;

  const validatePremise = (premise) => {
    const errors = [];
    const { grid, zombie, creatures, moves } = premise;

    if (!Number.isInteger(grid) || grid < 2 || grid > 50) {
      errors.push("Grid size must be an integer between 2 and 50.");
    }

    const inBounds = (x, y) => x >= 0 && x < grid && y >= 0 && y < grid;

    if (
      !Number.isInteger(zombie.x) ||
      !Number.isInteger(zombie.y) ||
      !inBounds(zombie.x, zombie.y)
    ) {
      errors.push(
        `Zombie position (${zombie.x},${zombie.y}) is out of bounds.`,
      );
    }

    const occupied = new Set([`${zombie.x},${zombie.y}`]);
    for (const c of creatures) {
      if (
        !Number.isInteger(c.x) ||
        !Number.isInteger(c.y) ||
        !inBounds(c.x, c.y)
      ) {
        errors.push(`Creature position (${c.x},${c.y}) is out of bounds.`);
      }
      const key = `${c.x},${c.y}`;
      if (occupied.has(key)) {
        errors.push(`Duplicate position (${c.x},${c.y}).`);
      }
      occupied.add(key);
    }

    if (typeof moves !== "string" || !/^[RLUD]+$/.test(moves)) {
      errors.push("Moves must only contain R, L, U, D.");
    }

    return errors;
  };

  const isNode =
    typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null;

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const renderGrid = (sim, zombies) => {
    for (let y = 0; y < sim.gridSize; y++) {
      for (let x = 0; x < sim.gridSize; x++) {
        const key = `${x},${y}`;
        const zCount = zombies.filter((z) => z.x === x && z.y === y).length;
        if (zCount > 1) {
          process.stdout.write(`|${zCount}Z|`);
        } else if (zCount === 1) {
          process.stdout.write("|Z|");
        } else if (sim.creatures.has(key)) {
          process.stdout.write("|C|");
        } else {
          process.stdout.write("|_|");
        }
      }
      console.log();
    }
  };

  const ask = async (rl, question) => {
    const answer = await rl.question(question);
    return answer.trim();
  };

  const getPremiseFromUser = async () => {
    const readline = require("readline/promises");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      const gridSize = parseInt(
        await ask(rl, "Enter the world size (e.g. 4): "),
        10,
      );
      if (isNaN(gridSize) || gridSize < 2 || gridSize > 50) {
        console.log("Invalid world size. Must be 2-50.");
        return null;
      }

      const inBounds = (x, y) =>
        x >= 0 && x < gridSize && y >= 0 && y < gridSize;

      const zombieInput = await ask(rl, "Zombie position (x,y e.g. 3,1): ");
      const [zx, zy] = zombieInput.split(",").map(Number);
      if (isNaN(zx) || isNaN(zy) || !inBounds(zx, zy)) {
        console.log(
          `Invalid zombie position. Must be within 0-${gridSize - 1}.`,
        );
        return null;
      }

      const creaturesInput = await ask(
        rl,
        "Creature positions (x,y pairs separated by space, e.g. 0,1 1,2 1,1): ",
      );
      const occupied = new Set([`${zx},${zy}`]);
      const creatures = [];
      for (const pair of creaturesInput.split(/\s+/)) {
        const [cx, cy] = pair.split(",").map(Number);
        if (isNaN(cx) || isNaN(cy) || !inBounds(cx, cy)) {
          console.log(
            `Invalid creature position: ${pair}. Must be within 0-${gridSize - 1}.`,
          );
          return null;
        }
        const key = `${cx},${cy}`;
        if (occupied.has(key)) {
          console.log(`Position ${pair} is already occupied.`);
          return null;
        }
        occupied.add(key);
        creatures.push({ x: cx, y: cy });
      }

      const moves = (await ask(rl, "Moves (e.g. RDRU): ")).toUpperCase();
      if (!/^[RLUD]+$/.test(moves)) {
        console.log("Invalid moves. Use only R, L, U, D.");
        return null;
      }

      return { grid: gridSize, zombie: { x: zx, y: zy }, creatures, moves };
    } finally {
      rl.close();
    }
  };

  const runMovesForZombie = async (sim, zombie) => {
    for (const move of sim.moves) {
      const details = getMoveDetails(move);
      if (!details) {
        console.log("Invalid move:", move);
        continue;
      }
      console.log(
        "\n Oh noooo now Zombie is moving towards ...",
        details.label + "!",
      );

      const result = moveZombie(sim, zombie, details.axis, details.direction);
      if (result.infected) {
        console.log(`Zombie infected creature at (${result.x}, ${result.y})!`);
      }

      await delay(1500);
      renderGrid(sim, [zombie]);
    }

    sim.finalPositions.push({ x: zombie.x, y: zombie.y });
  };

  async function main() {
    const readline = require("readline/promises");
    console.log("Welcome to the Zombie Apocalypse!\n");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const mode = await rl.question(
      "Press ENTER for default premise, or type 'custom' for manual input: ",
    );
    rl.close();

    let premise;
    if (mode.trim().toLowerCase() === "custom") {
      premise = await getPremiseFromUser();
      if (!premise) {
        console.log("Invalid input. Exiting.");
        return;
      }
    } else {
      premise = defaultPremise;
    }

    console.log(
      "\nReporting from 9 News, our virtual world is under attack by zombies!!! Giving you live updates noww...",
    );
    await delay(1500);

    const sim = virtualWorld(premise);

    console.log(
      "We do see our CBD, we do have the eyes on zombie, stay tuned...",
    );
    renderGrid(sim, [sim.zombieQueue[0]]);

    const firstZombie = sim.zombieQueue.shift();
    await runMovesForZombie(sim, firstZombie);

    while (sim.zombieQueue.length > 0) {
      const infectedZombie = sim.zombieQueue.shift();
      await delay(1500);
      console.log(
        `\n--- Now we saw an active zombie moving from (${infectedZombie.x}, ${infectedZombie.y}) towards the next target`,
      );
      console.log(
        "\n Our lovely city is getting infected more and more, see the new zombie positions now...",
      );
      renderGrid(sim, [infectedZombie]);
      await runMovesForZombie(sim, infectedZombie);
    }

    console.log(
      "\n World is taken over by zombies, we are doomed!!! but its just virtual, make your world better with Ailo Tool managing your world at peace :)",
    );
    console.log(
      " Final Zombie Positions:",
      sim.finalPositions.map((pos) => `(${pos.x}, ${pos.y})`).join(", "),
    );
    const remaining = [...sim.creatures];
    console.log(
      " Remaining Creatures:",
      remaining.length > 0 ? remaining.map((creature) => `(${creature})`).join(", ") : "None",
    );
    console.log(
      "\n Narendra, reporting live from the virtual world, with Camera person Claudia, over and out!",
    );
  }

  // Auto-run in Node when executed directly
  if (isNode && require.main === module) {
    main();
  }

  return {
    defaultPremise,
    virtualWorld,
    gridCircularity,
    moveZombie,
    getMoveDetails,
    validatePremise,
    renderGrid,
    runMovesForZombie,
    getPremiseFromUser,
    main,
  };
});
