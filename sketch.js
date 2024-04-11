let padding = 4;
let radius = 4;
let margin = 16;
let canvasSize = { x: 800, y: 600 };

let playField = { x: canvasSize.x - 2 * margin, y: canvasSize.y - 2 * margin };

let gridInputX = document.getElementById('gridX');
let gridInputY = document.getElementById('gridY');
let resetButton = document.getElementById('resetBtn');
let scoreCounter = document.getElementById('scoreCounter');

let score;
let initialShuffle = true;

let possibleColors = [
  [231, 76, 60], //red
  [46, 204, 113], //green
  [46, 134, 193], //blue
  [244, 208, 63], //yellow
]

class Item {
  constructor(shape, color, position, matrixPosition, empty = false) {
    this.position = position;
    this.shape = shape;
    this.color = color;
    this.matrixPosition = matrixPosition;
    this.empty = empty
    this.matched = false;
  }
}

class Position {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.checksum = 'X' + x + 'Y' + y;
  }
}

function setup() {
  gridInputX.value = 20
  gridInputY.value = 15

  resetButton.onclick = () => {
    setupPlayfield();
  }

  setupPlayfield();
}

function draw() {
  removeMatches(findMatches());

  applyGravity();

  background(0);
  drawPlayField();
  drawGrid();
  drawGridItems();
  drawCursorTrail();
}

function setupPlayfield() {
  createCanvas(canvasSize.x, canvasSize.y);
  noCursor();
  defineGrid();
}

let lastClick = new Position(0, 0)
let lastItem;

function mouseClicked(event) {
  if (event.isTrusted) {
    initialShuffle = false;
    lastClick = new Position(event.x, event.y)

    for (let x = 0; x < grid.size.x; x++) {
      for (let y = 0; y < grid.size.y; y++) {
        let item = grid.items[x][y];
        let limits = [item.position.x, item.position.x + grid.sideSize, item.position.y, item.position.y + grid.sideSize]
        if (checkLPositionInLimit(...[...limits, lastClick])) {

          if (!lastItem) {
            lastItem = item
          } else {
            swap(item, lastItem, true);

            lastItem = undefined
            lastClick = new Position(0, 0)
          }
        }
      }
    }
  }
}

function swap(item1, item2, shoudCheckRange = false) {
  if (item1.matrixPosition.checksum === item2.matrixPosition.checksum) {
    return
  }

  if (shoudCheckRange && checkItemRange(item1.matrixPosition, item2.matrixPosition)) {
    return
  }

  let pivot = { ...item2 }

  item2.position = item1.position;
  item2.matrixPosition = item1.matrixPosition;
  grid.items[item1.matrixPosition.x][item1.matrixPosition.y] = item2;

  item1.position = pivot.position;
  item1.matrixPosition = pivot.matrixPosition;
  grid.items[pivot.matrixPosition.x][pivot.matrixPosition.y] = item1;
}

function checkItemRange(pos1, pos2) {
  let xRange = [pos2.x + 1, pos2.x - 1].includes(pos1.x)
  let yRange = [pos2.y + 1, pos2.y - 1].includes(pos1.y)
  return !(!xRange ^ !yRange);
}

function drawPlayField() {
  noStroke()
  fill(20);
  rect(
    margin,
    margin,
    playField.x,
    playField.y,
    radius + padding
  );
}

let trail = []
let trailLength = 0
function drawCursorTrail() {

  trail.push([mouseX, mouseY]);

  for (let i = 0; i < trail.length; i++) {
    noStroke()
    fill(163, 228, 215, trailLength)
    let trailSize = map(i, 0, trail.length, 1, 16);
    ellipse(trail[i][0], trail[i][1], trailSize);
    if (trailLength > 255) {
      trail.shift();
      trailLength = 0;
    }
    trailLength += 20;
  }
}

let grid = {
  size: new Position(0, 0),
  sideSize: 0,
  halfSideSize: 0,
  centeringPaddingX: 0,
  centeringPaddingY: 0,
  items: [],
  iterate: (callback, breakCondition, yTox = true) => {
    for (let y = 0; y < (yTox ? grid.size.y : grid.size.x); y++) {
      if (breakCondition && breakCondition()) {
        break;
      }
      for (let x = 0; x < (yTox ? grid.size.x : grid.size.y); x++) {
        if (breakCondition && breakCondition()) {
          break;
        }
        if (callback) {
          callback(yTox ? x : y, yTox ? y : x);
        }
      }
    }
  }
}

function gridHasEmptyCells() {
  return !grid.items.flat().every(item => !item.empty);
}

function defineGrid() {
  score = 0;
  initialShuffle = true;
  updateGridValue();

  do {
    grid.sideSize++;
    grid.centeringPaddingX = playField.x - (grid.size.x * grid.sideSize) - (grid.size.x * padding) - padding
    grid.centeringPaddingY = playField.y - (grid.size.y * grid.sideSize) - (grid.size.y * padding) - padding
  } while (grid.centeringPaddingX - grid.size.x >= 0 && grid.centeringPaddingY - grid.size.y >= 0)

  grid.halfSideSize = grid.sideSize / 2;

  for (let x = 0; x < grid.size.x; x++) {
    let currentXMargin = grid.centeringPaddingX / 2 + margin + padding + (x * grid.sideSize) + (x * padding);
    grid.items[x] = []
    for (let y = 0; y < grid.size.y; y++) {
      let currentYMargin = grid.centeringPaddingY / 2 + margin + padding + (y * grid.sideSize) + (y * padding);


      let rgn = Math.floor(Math.random() * possibleColors.length);
      grid.items[x][y] = y === 1 ?
        new Item(rgn, possibleColors[rgn], new Position(currentXMargin, currentYMargin), new Position(x, y)) :
        new Item(undefined, undefined, new Position(currentXMargin, currentYMargin), new Position(x, y), true);

    }
  }
}

function drawGrid() {
  for (let x = 0; x < grid.size.x; x++) {
    let currentXMargin = grid.centeringPaddingX / 2 + margin + padding + (x * grid.sideSize) + (x * padding);
    for (let y = 0; y < grid.size.y; y++) {
      let currentYMargin = grid.centeringPaddingY / 2 + margin + padding + (y * grid.sideSize) + (y * padding);

      noStroke()
      let limits = [currentXMargin, currentXMargin + grid.sideSize, currentYMargin, currentYMargin + grid.sideSize]

      if (checkMouseOver(...limits) || checkLPositionInLimit(...[...limits, lastClick])) {
        fill(175, 122, 197);
      } else {
        fill(136, 78, 160);
      }

      rect(
        currentXMargin,
        currentYMargin,
        grid.sideSize,
        grid.sideSize,
        radius
      );
    }
  }
}

function drawGridItems() {
  for (let x = 0; x < grid.items.length; x++) {
    for (let y = 0; y < grid.items[x].length; y++) {
      let item = grid.items[x][y];
      if (!item.empty) {
        noStroke()
        fill(...item.color, item.matched ? 255 : 255);
        ellipse(
          item.position.x + grid.halfSideSize,
          item.position.y + grid.halfSideSize,
          grid.halfSideSize
        );
      }
    }
  }
}

function findMatches() {
  let matches = []
  grid.iterate((x, y) => {
    let item = grid.items[x][y];

    if (!item.empty) {

      let horizontalMatch = [item]

      // horizontal match
      let sameShape = true
      let increment = 1;
      while (sameShape && increment + x < grid.size.x) {
        let currentItem = grid.items[x + increment][y]
        sameShape = currentItem.shape === item.shape;
        if (sameShape) {
          horizontalMatch.push(currentItem);
          increment++;
        }
      }

      // vertical match
      sameShape = true
      increment = 1;
      let verticalMatch = [item]
      while (sameShape && increment + y < grid.size.y) {
        let currentItem = grid.items[x][y + increment]
        sameShape = currentItem.shape === item.shape;
        if (sameShape) {
          verticalMatch.push(currentItem);
          increment++;
        }
      }

      let omniMatch = [...(horizontalMatch.length > 2 ? horizontalMatch : []), ...(verticalMatch.length > 2 ? verticalMatch : [])]

      if (omniMatch.length) {
        omniMatch.forEach(item => {
          item.matched = true
        })
        matches.push(omniMatch)
      }
    }
  }, (x, y) => {
    return matches.length > 0;
  });
  return matches
}

function removeMatches(matches) {
  matches.forEach(match => {
    match.forEach(item => {
      grid.items[item.matrixPosition.x][item.matrixPosition.y] = new Item(undefined, undefined, item.position, item.matrixPosition, true)
      if (!initialShuffle) {
        updateScore(match);
      }
    })
  })
}

function applyGravity() {
  grid.iterate((x, y) => {
    if (y === 0 && grid.items[x][y].empty) {
      let rgn = Math.floor(Math.random() * possibleColors.length);
      grid.items[x][0] = new Item(rgn, possibleColors[rgn], grid.items[x][0].position, grid.items[x][0].matrixPosition);
    }
    if (y < grid.size.y - 1 && grid.items[x][y + 1].empty) {
      sleep(5).then(() => swap(grid.items[x][y], grid.items[x][y + 1]))
    }
  });
}

function sleep(millisecondsDuration) {
  return new Promise((resolve) => {
    setTimeout(resolve, millisecondsDuration);
  })
}


function updateGridValue() {
  grid.sideSize = 0
  grid.size.x = gridInputX.value;
  grid.size.y = gridInputY.value;
}

function updateScore(match) {
  score += 100 * match.length * (match.length - 1) * 0.5;
  scoreCounter.innerHTML = "SCORE: " + score
}

function checkMouseOver(minX, maxX, minY, maxY) {
  return mouseX > minX && mouseX < maxX && mouseY > minY && mouseY < maxY;
}

function checkLPositionInLimit(minX, maxX, minY, maxY, pos) {
  return pos.x > minX && pos.x < maxX && pos.y > minY && pos.y < maxY;
}