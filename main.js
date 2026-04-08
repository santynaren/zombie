console.log("Hello, world");

const grid = 4;

for (let x = 0; x < grid; x++) {
  for (let y = 0; y < grid; y++) {
    process.stdout.write(`(${x}, ${y}) `);
  }
  console.log();
}

const zombie = { x: 3, y: 1 };
