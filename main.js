console.log("Hello, world");

const grid = 4;

const initalPremise = {
  grid: 4,
  zombie: {
    x: 3,
    y: 1,
  },
  creatures: [
    { x: 0, y: 1 },
    { x: 1, y: 2 },
    { x: 1, y: 1 },
  ],
  moves: "RDRU",
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  //   console.log("Welcome to the Zombie Apocalypse!");
  //   await delay(1500);
  //   console.log("Your world is safe, but wait for the thrillllllll....");
  //   await delay(2000);
  //   console.log(
  //     "Reporting from 9 News, following world is under attack by zombies:",
  //   );
  //   await delay(1500);
  const gridSlots = premiseSetup(initalPremise);
  console.log("Initial state:");
  renderGrid(gridSlots);
  triggerActionMoves(initalPremise.moves, gridSlots);
}

const premiseSetup = (premise) => {
  const gridSlots = [];
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      if (x === premise.zombie.x && y === premise.zombie.y) {
        gridSlots.push({ x, y, type: "zombie" });
      } else if (
        premise.creatures.some(
          (creature) => creature.x === x && creature.y === y,
        )
      ) {
        gridSlots.push({ x, y, type: "creature" });
      } else {
        gridSlots.push({ x, y, type: "empty" });
      }
    }
  }
  return gridSlots;
};

const renderGrid = (gridSlots) => {
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const slot = gridSlots.find((s) => s.x === x && s.y === y);
      if (slot.type === "zombie") {
        process.stdout.write("|Z|");
      } else if (slot.type === "creature") {
        process.stdout.write("|C|");
      } else if (slot.type === "newZombie") {
        process.stdout.write("|NZ|");
      } else {
        process.stdout.write("|_|");
      }
    }
    console.log();
  }
};

const triggerActionMoves = async (moves, gridSlots) => {
  for (const move of moves) {
    const direction =
      move === "R"
        ? "east"
        : move === "L"
          ? "west"
          : move === "D"
            ? "south"
            : "north";
    console.log("\n Oh noooo now Zombie is moving towards ...", direction + "!");
    switch (move) {
      case "R":
        moveZombies(gridSlots, "x", "+");
        await delay(1500);
        break;
      case "L":
        moveZombies(gridSlots, "x", "-");
        await delay(1500);
        break;
      case "D":
        moveZombies(gridSlots, "y", "+");
        await delay(1500);
        break;
      case "U":
        moveZombies(gridSlots, "y", "-");
        await delay(1500);
        break;
      default:
        console.log("Invalid move:", move);
    }
    renderGrid(gridSlots);
  }
};

const moveZombies = (gridSlots, axis, direction) => {
  const zombies = gridSlots.filter((slot) => slot.type === "zombie");
  const newZombiePositions = [];

  for (const zombie of zombies) {
    const newCoord = gridCircularity(zombie[axis], direction);
    const newX = axis === "x" ? newCoord : zombie.x;
    const newY = axis === "y" ? newCoord : zombie.y;
    newZombiePositions.push({ oldSlot: zombie, newX, newY });
  }

  for (const { oldSlot, newX, newY } of newZombiePositions) {
    const targetSlot = gridSlots.find((s) => s.x === newX && s.y === newY);
    if (targetSlot.type === "creature") {
      console.log(`Zombie infected creature at (${newX}, ${newY})!`);
      oldSlot.type = "empty";
      targetSlot.type = "zombie";
    } else {
      oldSlot.type = "empty";
      targetSlot.type = "zombie";
    }
  }
};

const gridCircularity = (coordinate, direction) => {
  if (direction === "+") {
    return (coordinate + 1) % grid;
  } else {
    return (coordinate - 1 + grid) % grid;
  }
};

main();
