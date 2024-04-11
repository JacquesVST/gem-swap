let padding = 4;
let radius = 4;
let margin = 16;
let canvasSize = { x: 900, y: 600 };

let playField = { x: canvasSize.x - 2 * margin, y: canvasSize.y - 2 * margin };

let gridInputX = document.getElementById('gridX');
let gridInputY = document.getElementById('gridY');
let resetButton = document.getElementById('resetBtn');
let scoreCounter = document.getElementById('scoreCounter');
let comboCounter = document.getElementById('comboCounter');

let score;
let combo;
let stackCombo = false;
let initialShuffle = true;

let possibleColors = [
  [231, 76, 60],  //red
  [46, 204, 113], //green
  [46, 134, 193], //blue
  [244, 208, 63], //yellow
  [243, 156, 18], //orange
  [240, 98, 146], //pink
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

class Shape {
  constructor(id, color) {
    this.id = id;
    this.color = color;
  }
}

class Grid {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.sideSize = 0;
    this.centeringPaddingX = 0;
    this.centeringPaddingY = 0;

    this.generateEmptyCells();
  }

  generateEmptyCells = function () {
    this.cells = [...Array(this.width)].map(
      (row, x) => [...Array(this.height)].map(
        (cell, y) => {
          return new Cell(new Position(x, y))
        }
      )

    )
  }

  calculateSpacing = function (playfield) {

  }

  iterateXtoY = function (callback, breakX, breakY) {
    for (let x = 0; x < this.width; x++) {
      if (breakX && breakX(x)) {
        break
      }
      for (let y = 0; y < this.height; y++) {
        if (breakY && breakY(x, y)) {
          break
        }
        callback(x, y);
      }
    }

    iterateYtoX = function (callback, breakX, breakY) {
      for (let y = 0; y < this.height; y++) {
        if (breakY && breakY(y)) {
          break
        }
        for (let x = 0; x < this.width; x++) {
          if (breakX && breakX(x, y)) {
            break
          }
          callback(x, y);
        }
      }
    }
  }


}

class Cell {
  constructor(position) {
    this.position = position
  }

  setCanvasPosition = function (canvasPosition) {
    this.canvasPosition = canvasPosition
  }

  setItem = function (item) {
    this.item = item
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

function setup() {
  gridInputX.value = 12
  gridInputY.value = 8
  new Grid(parseInt(gridInputX.value, 10), parseInt(gridInputY.value, 10));

  resetButton.onclick = () => {
    initialShuffle = true;
    updateScore([], 0)
    updateCombo([], 0)
    lastItem = undefined
    lastClick = new Position(0, 0)
    stackCombo = false;
    comboCounter.style = 'font-size: 1em'
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
  //noCursor();
  defineGrid();
}

let lastClick = new Position(0, 0)
let lastItem;

function mouseClicked(event) {
  if (event.isTrusted) {
    lastClick = new Position(event.x, event.y)

    for (let x = 0; x < grid.size.x; x++) {
      for (let y = 0; y < grid.size.y; y++) {
        let item = grid.items[x][y];
        let limits = [item.position.x, item.position.x + grid.sideSize, item.position.y, item.position.y + grid.sideSize]
        if (checkLPositionInLimit(...[...limits, lastClick])) {
          initialShuffle = false;

          if (!lastItem) {
            lastItem = item
            stackCombo = false;
            combo = 0
          } else {
            stackCombo = true;
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

  trail.push([mouseX + 5, mouseY + 10]);

  for (let i = 0; i < trail.length; i++) {
    noStroke()
    fill(255,255,255, trailLength > 220 ? 0 : trailLength)
    let trailSize = map(i, 0, trail.length, 1, 16);
    ellipse(trail[i][0], trail[i][1], trailSize);
    if (trailLength > 255) {
      trail.shift();
      trailLength = 0;
    }
    trailLength += 20;
  }
}



function gridHasEmptyCells() {
  return !grid.items.flat().every(item => !item.empty);
}

function defineGrid() {
  score = 0;
  combo = 0;
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
        strokeWeight(2);
        stroke(0)
        fill(...item.color, item.matched ? 255 : 255);
        polygon(
          item.position.x + grid.halfSideSize,
          item.position.y + grid.halfSideSize,
          grid.halfSideSize/1.5,
          item.shape + 3
        );
      }
    }
  }
}

function polygon(x, y, radius, npoints) {
  let angle = TWO_PI / npoints;
  beginShape();
  for (let a = HALF_PI * 3; a < HALF_PI * 7; a += angle) {
    let sx = x + cos(a) * radius;
    let sy = y + sin(a) * radius;
    vertex(sx, sy);
  }
  endShape(CLOSE);
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
  if (stackCombo)  {
    updateCombo(matches)
  }
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

function updateScore(match, zero = 1) {
  score += 100 * match.length * (match.length - 1) * 0.5;
  scoreCounter.innerHTML = ' ' + (score * zero)
}

function updateCombo(matches, zero = 1) {
  combo += [...matches].length;
  comboCounter.innerHTML = ' ' + (combo * zero)
  
  let fontSize =  combo > 0 ? combo : 1;
  comboCounter.style = 'font-size: ' + fontSize + 'em'
}

function checkMouseOver(minX, maxX, minY, maxY) {
  return mouseX > minX && mouseX < maxX && mouseY > minY && mouseY < maxY;
}

function checkLPositionInLimit(minX, maxX, minY, maxY, pos) {
  return pos.x > minX && pos.x < maxX && pos.y > minY && pos.y < maxY;
}