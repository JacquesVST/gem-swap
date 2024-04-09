let padding = 4;
let radius = 4;
let margin = 16;
let canvasSize = { x: 800, y: 600 };

let playField = { x: canvasSize.x - 2 * margin, y: canvasSize.y - 2 * margin };

let gridInputX = document.getElementById('gridX');
let gridInputY = document.getElementById('gridY');
let resetButton = document.getElementById('resetBtn');

let possibleColors = [
  [231, 76, 60], //red
  [46, 204, 113], //green
  [46, 134, 193], //blue
  [244, 208, 63], //yellow
]



class Item {
  constructor(shape, color, position, matrixPosition) {
    this.shape = shape;
    this.color = color;
    this.position = position;
    this.matrixPosition = matrixPosition;
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
  gridInputX.value = 8
  gridInputY.value = 5

  resetButton.onclick = () => {
    console.log(grid)
    setupPlayfield();
  }

  setupPlayfield();
}

function draw() {
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
    lastClick = new Position(event.x, event.y)
    
    for (let x = 0; x < grid.items.length; x++) {
      for (let y = 0; y < grid.items[x].length; y++) {
        let item = grid.items[x][y];
        let limits = [item.position.x, item.position.x + grid.sideSize, item.position.y, item.position.y + grid.sideSize]
        if (checkLPositionInLimit(...[...limits, lastClick])) {

          if (!lastItem) {
            lastItem = item
          } else {
            let pivot = {...lastItem};

            lastItem.position = item.position;
            lastItem.matrixPosition = item.matrixPosition;
            grid.items[item.matrixPosition.x][item.matrixPosition.y] = lastItem;

            item.position = pivot.position;
            item.matrixPosition = pivot.matrixPosition;
            grid.items[pivot.matrixPosition.x][pivot.matrixPosition.y] = item
            
            lastItem = undefined
            lastClick = new Position(0, 0)
          }
        }
      }
    }
  }
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
}

function defineGrid() {
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
      grid.items[x][y] = new Item(rgn, possibleColors[rgn], new Position(currentXMargin, currentYMargin), new Position(x,y));
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
      noStroke()
      fill(...item.color);
      ellipse(
        item.position.x + grid.halfSideSize,
        item.position.y + grid.halfSideSize,
        grid.halfSideSize
      );
    }
  }
}


function updateGridValue() {
  grid.sideSize = 0
  grid.size.x = gridInputX.value;
  grid.size.y = gridInputY.value;
}

function checkMouseOver(minX, maxX, minY, maxY) {
  return mouseX > minX && mouseX < maxX && mouseY > minY && mouseY < maxY;
}

function checkLPositionInLimit(minX, maxX, minY, maxY, pos) {
  return pos.x > minX && pos.x < maxX && pos.y > minY && pos.y < maxY;
}