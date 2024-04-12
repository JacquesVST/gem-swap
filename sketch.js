let gridInputX = document.getElementById('gridX');
let gridInputY = document.getElementById('gridY');
let resetButton = document.getElementById('resetBtn');
let scoreCounter = document.getElementById('scoreCounter');
let bestScoreCounter = document.getElementById('bestScoreCounter');
let comboCounter = document.getElementById('comboCounter');
let bestComboCounter = document.getElementById('bestComboCounter');
let moveCounter = document.getElementById('moveCounter');

let score = 0;
let bestScore = 0;
let combo = 0;
let bestCombo = 0;
let moves = 100;

let stackCombo = false;
let initialShuffle = true;

let globalGrid;
let globalCanvas;

let possibleColors = [
  [231, 76, 60],  //red
  [46, 204, 113], //green
  [46, 134, 193], //blue
  [244, 208, 63], //yellow
  [243, 156, 18], //orange
  [240, 98, 146], //pink
]

class CanvasInfo {
  constructor(margin, padding, radius) {
    this.margin = margin
    this.padding = padding
    this.radius = radius

    this.playfieldBackground = 20
    this.calculateCanvasAndPlayfield();
  }

  calculateCanvasAndPlayfield = function () {
    let screenWidth = document.body.clientWidth;
    let screenHeight = (screenWidth / 16) * 9;

    this.canvasSize = new Position(screenWidth, screenHeight)
    this.playfield = new Position(this.canvasSize.x - 2 * this.margin, this.canvasSize.y - 2 * this.margin)
    createCanvas(this.canvasSize.x, this.canvasSize.y);

  }

  drawPlayfield = function () {
    background(0);
    noStroke()
    fill(this.playfieldBackground);
    rect(
      this.margin,
      this.margin,
      this.playfield.x,
      this.playfield.y,
      this.radius + this.padding
    );
  }
}

class Shape {
  constructor(sides, color) {
    this.sides = sides;
    this.color = color;
  }
}

class Position {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.checksum = 'X' + x + 'Y' + y;
  }
}

class Item {
  constructor(shape, position, sideSize) {
    this.shape = shape;
    this.position = position;
    this.sideSize = sideSize
    this.id = generateId();
  }

  static generateRandomItem = function (position, gridSideSize, possibleShapes = possibleColors) {
    let randomShape = Math.floor(Math.random() * possibleShapes.length);
    let shape = new Shape(randomShape + 3, possibleShapes[randomShape])
    return new Item(shape, position, gridSideSize / 3);
  }

  renewPosition = function (position) {
    this.position = position;
    return { ...this }
  }
}

class Cell {
  constructor(position) {
    this.position = position
    this.canvasPosition = new Position(0, 0)
    this.item = undefined
    this.id = generateId();
  }
}

class Grid {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.sideSize = 0;
    this.horizontalCenterPadding = 0;
    this.verticalCenterPadding = 0;

    this.selectedCellPos = undefined;

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

  calculateSpacing = function (canvas) {
    do {
      this.sideSize++;
      this.horizontalCenterPadding = canvas.playfield.x - (this.width * this.sideSize) - (this.width * canvas.padding) - canvas.padding
      this.verticalCenterPadding = canvas.playfield.y - (this.height * this.sideSize) - (this.height * canvas.padding) - canvas.padding
    } while (this.horizontalCenterPadding - this.width >= 0 && this.verticalCenterPadding - this.height >= 0)

    this.iterateXtoY((x, y) => {
      let currentXMargin = (this.horizontalCenterPadding / 2) + (x * this.sideSize) + (x * canvas.padding) + canvas.padding + canvas.margin;
      let currentYMargin = (this.verticalCenterPadding / 2) + (y * this.sideSize) + (y * canvas.padding) + canvas.padding + canvas.margin;

      this.cells[x][y].canvasPosition = new Position(currentXMargin, currentYMargin);
    });
  }

  isFull = function () {
    return [...this.cells.flat()].every(cell => cell.item);
  }

  generateItems = function () {
    this.iterateYtoX((x, y) => {
      let cell = this.getCellbyPosition(new Position(x, y));
      if (!cell.item && cell.position.y === 0) {
        this.cells[x][y].item = Item.generateRandomItem(this.cells[x][y].position, this.sideSize)
      }
    })
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

  swap = function (position1, position2, humanSwap = false) {

    if (position1.checksum === position2.checksum) {
      return
    }

    if (humanSwap && !canReach(position1, position2)) {
      return
    }

    let item1 = this.getItembyPosition(position1);
    let item2 = this.getItembyPosition(position2);

    if (humanSwap && item1 && item2 && item1.shape.sides === item2.shape.sides) {
      return
    }

    this.getCellbyPosition(position1).item = item2 ? item2.renewPosition(position1) : undefined
    this.getCellbyPosition(position2).item = item1 ? item1.renewPosition(position2) : undefined;

    if (humanSwap) {
      updateMoves(moves - 1);
    }
  }

  draw = function (canvas) { //ok
    this.cells.flat().forEach(cell => {
      noStroke()
      let limits = [
        cell.canvasPosition.x,
        cell.canvasPosition.x + this.sideSize,
        cell.canvasPosition.y,
        cell.canvasPosition.y + this.sideSize
      ]

      let isSelectedCell = this.selectedCellPos ? cell.position.checksum === this.selectedCellPos.checksum : false;
      if (checkMouseOver(...limits) || isSelectedCell) {
        fill(175, 122, 197);
      } else {
        fill(136, 78, 160);
      }

      rect(
        cell.canvasPosition.x,
        cell.canvasPosition.y,
        this.sideSize,
        this.sideSize,
        canvas.radius
      );
    })
  }

  drawItems = function () { //ok
    this.cells.flat().map(cell => cell.item).forEach(item => {
      if (item) {
        let cellRef = this.getCellbyPosition(item.position);
        strokeWeight(2);
        stroke(0)
        fill(...item.shape.color, 255);
        polygon(
          cellRef.canvasPosition.x + this.sideSize / 2,
          cellRef.canvasPosition.y + this.sideSize / 2,
          item.sideSize,
          item.shape.sides
        );
      }
    })
  }

  getCellbyPosition = function (position) {
    return this.cells[position.x][position.y];
  }


  getItembyPosition = function (position) {
    return this.cells[position.x][position.y].item;
  }

  getNeighbourCell = function (cell, xOffset = 0, yOffset = 0) {
    let absoluteX = cell.position.x + xOffset
    let absoluteY = cell.position.y + yOffset

    if (absoluteX >= 0 && absoluteX < this.width && absoluteY >= 0 && absoluteY < this.height) {
      return this.cells[absoluteX][absoluteY];
    }

    return undefined;
  }

}

function canReach(pos1, pos2) {
  if (pos1.x === pos2.x) {
    return [pos1.y - 1, pos1.y + 1].includes(pos2.y);
  } else if (pos1.y === pos2.y) {
    return [pos1.x - 1, pos1.x + 1].includes(pos2.x);
  }
  return false

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

function setup() {
  gridInputX.value = 7
  gridInputY.value = 5

  resetButton.onclick = () => {
    setupGame();
  }

  setupGame();
}

function setupGame() {
  setTimeout(() => {
    globalCanvas = new CanvasInfo(16, 4, 4);
    globalGrid = new Grid(parseInt(gridInputX.value, 10), parseInt(gridInputY.value, 10));
    globalGrid.calculateSpacing(globalCanvas);

    updateScore([], true)
    updateCombo([], true)
    updateMoves(15)

    if (!isLooping()) {
      loop()
    }
  }, 0);

}

function draw() {

  removeMatches(findMatches(globalGrid));

  if (!globalGrid.isFull()) {
    applyGravity(globalGrid);
    globalGrid.generateItems();
  } else {
    if (moves === 0) {

      if (confirm('YOU LOST! RESET ?')) {
        setupGame();
      } else {
        noLoop();
      }
    }
  }

  globalCanvas.drawPlayfield();
  globalGrid.draw(globalCanvas);
  globalGrid.drawItems();
}

function mouseClicked(event) {
  if (event.isTrusted) {
    let lastClick = new Position(event.x, event.y)
    let clickFound = false
    globalGrid.iterateXtoY((x, y) => {
      let cell = globalGrid.cells[x][y];

      let limits = [
        cell.canvasPosition.x,
        cell.canvasPosition.x + globalGrid.sideSize,
        cell.canvasPosition.y,
        cell.canvasPosition.y + globalGrid.sideSize
      ]

      if (checkPositionInLimit(...[...limits, lastClick])) {
        clickFound = true
        initialShuffle = false;

        if (!globalGrid.selectedCellPos) {
          globalGrid.selectedCellPos = cell.position
          stackCombo = false;
          combo = 0
        } else {
          stackCombo = true;
          globalGrid.swap(cell.position, globalGrid.selectedCellPos, true);
          globalGrid.selectedCellPos = undefined
          lastClick = new Position(0, 0)
        }
      }
    }, () => clickFound)
  }
}


function findMatches(grid) {
  let matches = [];
  grid.iterateYtoX((x, y) => {
    let cell = grid.getCellbyPosition(new Position(x, y));

    if (cell.item) {
      let item = cell.item
      let horizontalMatch = [item]

      // horizontal match
      let sameShape = true
      let increment = 1;
      while (sameShape && (increment + x) < grid.width) {
        let nextItem = grid.getNeighbourCell(cell, increment, 0).item
        sameShape = nextItem && item.shape.sides === nextItem.shape.sides;
        if (sameShape) {
          horizontalMatch.push(nextItem);
          increment++;
        }
      }

      // vertical match
      sameShape = true
      increment = 1;
      let verticalMatch = [item]
      while (sameShape && increment + y < grid.height) {
        let nextItem = grid.cells[x][y + increment].item
        sameShape = nextItem && item.shape.sides === nextItem.shape.sides;
        if (sameShape) {
          verticalMatch.push(nextItem);
          increment++;
        }
      }

      let omniMatch = [...(horizontalMatch.length > 2 ? horizontalMatch : []), ...(verticalMatch.length > 2 ? verticalMatch : [])]

      if (omniMatch.length) {
        matches.push(omniMatch)
      }
    }
  });
  return matches
}

function removeMatches(matches) {
  if (stackCombo) {
    updateCombo(matches)
  }

  matches.forEach(match => {
    if (!initialShuffle) {
      updateScore(match);
    }
    match.forEach(item => {
      globalGrid.getCellbyPosition(item.position).item = undefined

    });
  })
}

function applyGravity(grid) {
  grid.iterateYtoX((x, y) => {
    if (y < grid.height - 1 && !grid.cells[x][y + 1].item) {
      sleep(5).then(() => {
        grid.swap(grid.cells[x][y].position, grid.cells[x][y + 1].position)
      })
    }
  });
}

function sleep(millisecondsDuration) {
  return new Promise((resolve) => {
    setTimeout(resolve, millisecondsDuration);
  })
}

function updateScore(match, resetCounter = false) {
  if (resetCounter) {
    score = 0
    initialShuffle = true;
  }

  score += 100 * match.length * combo;
  scoreCounter.innerHTML = score

  bestScore = bestScore > score ? bestScore : score;
  bestScoreCounter.innerHTML = bestScore
}

function updateCombo(matches, resetCounter = false) {
  if (resetCounter) {
    combo = 0
    initialShuffle = true;
    stackCombo = false;
    comboCounter.style = 'font-size: 1em'
  }

  combo += [...matches].length;
  comboCounter.innerHTML = combo

  bestCombo = bestCombo > combo ? bestCombo : combo;
  bestComboCounter.innerHTML = bestCombo

  let fontSize = combo > 0 ? combo : 1;
  comboCounter.style = 'font-size: ' + fontSize + 'em'
}

function updateMoves(value) {
  moves = value

  moveCounter.innerHTML = moves
  moveCounter.style = value > 10 ? 'color: white' : 'color: red';
}


function checkMouseOver(minX, maxX, minY, maxY) {
  return mouseX > minX && mouseX < maxX && mouseY > minY && mouseY < maxY;
}

function checkPositionInLimit(minX, maxX, minY, maxY, pos) {
  return pos.x > minX && pos.x < maxX && pos.y > minY && pos.y < maxY;
}

function generateId() {
  return "id" + Math.random().toString(16).slice(2)
}