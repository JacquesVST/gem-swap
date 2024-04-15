let gridInputX = document.getElementById('gridX');
let gridInputY = document.getElementById('gridY');
let resetButton = document.getElementById('resetBtn');
let scoreCounter = document.getElementById('scoreCounter');
let bestScoreCounter = document.getElementById('bestScoreCounter');
let comboCounter = document.getElementById('comboCounter');
let bestComboCounter = document.getElementById('bestComboCounter');
let moveCounter = document.getElementById('moveCounter');

let bestScore = 0;
let bestCombo = 0;
let uiBarCount = 6

let stackCombo = false;
let initialShuffle = true;

let globalRun;
let globalGrid;
let globalCanvas;
let globalAnimations;

class ProgressBar {
  constructor(maxValue, value, title, color) {
    this.maxValue = maxValue,
      this.value = value,
      this.title = title,
      this.color = color
  }
}

class Character {
  constructor(health) {
    this.health = health
    this.currentHealth = health;
  }

  damage = function (damage) {
    this.currentHealth -= damage;
    if (this.currentHealth <= 0) {
      alert('YOU LOST!')
      setupGame()
    }
  }
}

class Run {
  constructor(character, totalFloors, stagesPerFloor, enemyPerStage, movesPerStage) {
    this.character = character;
    this.totalFloors = totalFloors;
    this.stagesPerFloor = stagesPerFloor;
    this.enemyPerStage = enemyPerStage;
    this.movesPerStage = movesPerStage

    this.moves = movesPerStage
    this.score = 0
    this.combo = 0
    this.currentFloorIndex = 0;
    this.defeatedEnemies = 0;
    this.winState = false;

    this.targetedEnemies = undefined;
    this.possibleColors = [
      [231, 76, 60],  //red
      [46, 204, 113], //green
      [46, 134, 193], //blue
      [244, 208, 63], //yellow
      [243, 156, 18], //orange
      [240, 98, 146], //pink
    ]

    this.floors = [...Array(this.totalFloors)].map(
      (floor, index) => {
        return new Floor(index + 1, { ...this })
      }
    )
  }

  findFloor = function () {
    return this.floors[this.currentFloorIndex]
  }

  findStage = function () {
    let stageIndex = this.findFloor().currentStageIndex;
    return this.floors[this.currentFloorIndex].stages[stageIndex]
  }

  findEnemy = function () {
    let stageIndex = this.findFloor().currentStageIndex;
    let enemyIndex = this.findStage().currentEnemyIndex;
    return this.floors[this.currentFloorIndex].stages[stageIndex].enemies[enemyIndex];
  }

  checkUpdateProgress = function () {
    let enemy = this.findEnemy();
    let stage = this.findStage();
    let floor = this.findFloor();

    if (enemy.currentHealth <= 0) {

      if (floor.number < this.totalFloors) {
        if (stage.number < this.stagesPerFloor) {
          if (enemy.number < this.enemyPerStage) {
            stage.currentEnemyIndex++
            this.defeatedEnemies++
          } else {
            floor.currentStageIndex++
          }
        } else {
          this.currentFloorIndex++
        }
      } else {
        this.winState = true
      }
    }
  }

  drawRunInfo = function (canvas) {
    let floor = this.findFloor()
    let stage = this.findStage();
    let enemy = this.findEnemy();

    let totalEnemies = this.totalFloors * this.stagesPerFloor * this.enemyPerStage

    let runInfo = [
      new ProgressBar(
        totalEnemies,
        this.defeatedEnemies,
        'Progress',
        [227, 227, 227]
      ),
      new ProgressBar(
        this.totalFloors,
        floor.number,
        'Floor',
        [236, 200, 19]
      ),
      new ProgressBar(
        this.stagesPerFloor,
        stage.number,
        'Stage',
        [49, 102, 214]
      ),
      new ProgressBar(
        this.enemyPerStage,
        enemy.number,
        'Enemies',
        [122, 214, 49]
      ),
      new ProgressBar(
        enemy.health,
        enemy.currentHealth,
        enemy.name + ' Health',
        [87, 49, 214]
      ),
      new ProgressBar(
        this.character.health,
        this.character.currentHealth,
        'Your Health',
        [214, 87, 49]
      ),
    ]

    runInfo.forEach((element, index) => {
      drawBar(element, index, canvas)
    })
  }
}

class Floor {
  constructor(number, run) {
    this.number = number;
    this.run = run
    this.currentStageIndex = 0;

    this.stages = [...Array(this.run.stagesPerFloor)].map(
      (stage, index) => {
        return new Stage(index + 1, { ...this })
      }
    )
  }
}

class Stage {
  constructor(number, floor) {
    this.number = number
    this.floor = floor
    this.currentEnemyIndex = 0;

    this.enemies = [...Array(this.floor.run.enemyPerStage)].map(
      (enemy, index) => {

        let isBoss = index === this.floor.run.enemyPerStage - 1

        return new Enemy(index + 1, isBoss, this.floor.number - 1, this.number - 1);
      }
    )
  }
}

class Enemy {
  constructor(number, isBoss, currentFloorIndex, currentStageIndex) {
    this.number = number
    this.isBoss = isBoss

    this.name = isBoss ? 'Boss' : 'Enemy';

    this.health = 0
    this.currentHealth = 0;
    this.attack = 0

    this.calculateStats(currentFloorIndex, currentStageIndex)
  }

  calculateStats = function (currentFloorIndex, currentStageIndex) {
    let bossMultiplier = 1

    if (this.isBoss) {
      bossMultiplier = 2 * (currentFloorIndex + 1);
    }

    let maxHealth = 1500 * bossMultiplier * (1 + (currentFloorIndex / 2));
    let minHealth = 500 * bossMultiplier * (1 + (currentFloorIndex / 2));

    let enemyBaseAttack = 10 * bossMultiplier;
    let enemyBaseHealth = Math.floor(Math.random() * (maxHealth - minHealth + 1) + minHealth);

    this.attack = enemyBaseAttack * (1 + (currentFloorIndex / 10)) * (1 + (currentStageIndex / 100))
    this.health = enemyBaseHealth * (1 + (currentFloorIndex / 10)) * (1 + (currentStageIndex / 100))
    this.currentHealth = this.health;
  }

  damage = function (damage, run) {
    this.currentHealth -= damage;
    run.checkUpdateProgress()
  }
}

class CanvasInfo {
  constructor(margin, padding, radius, uiBarSize) {
    this.margin = margin
    this.padding = padding
    this.radius = radius
    this.uiBarSize = uiBarSize
    this.totalUiSize = 0

    this.playfieldBackground = 20
    this.calculatrTotalUiSize();
    this.calculateCanvasAndPlayfield();
  }

  calculateCanvasAndPlayfield = function () {
    let screenWidth = document.body.clientWidth;
    let screenHeight = ((screenWidth / 16) * 9) + this.totalUiSize;

    this.canvasSize = new Position(screenWidth, screenHeight)
    this.playfield = new Position(this.canvasSize.x - 2 * this.margin, (this.canvasSize.y - 2 * this.margin))
    createCanvas(this.canvasSize.x, this.canvasSize.y);
  }

  calculatrTotalUiSize = function () {
    this.totalUiSize = ((uiBarCount + 1) * this.margin) + (uiBarCount * this.uiBarSize);
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

  static generateRandomItem = function (position, gridSideSize, possibleShapes) {
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
      this.verticalCenterPadding = canvas.playfield.y - canvas.totalUiSize - (this.height * this.sideSize) - (this.height * canvas.padding) - canvas.padding
    } while (this.horizontalCenterPadding - this.width >= 0 && this.verticalCenterPadding - this.height >= 0)

    this.iterateXtoY((x, y) => {

      let currentXMargin = (this.horizontalCenterPadding / 2) + (x * this.sideSize) + (x * canvas.padding) + canvas.padding + canvas.margin;
      let currentYMargin = canvas.totalUiSize + (this.verticalCenterPadding / 2) + (y * this.sideSize) + (y * canvas.padding) + canvas.padding + canvas.margin;

      this.cells[x][y].canvasPosition = new Position(currentXMargin, currentYMargin);
    });
  }

  isFull = function () {
    return [...this.cells.flat()].every(cell => cell.item);
  }

  generateItems = function (run) {
    this.iterateYtoX((x, y) => {
      let cell = this.getCellbyPosition(new Position(x, y));
      if (!cell.item && cell.position.y === 0) {
        this.cells[x][y].item = Item.generateRandomItem(this.cells[x][y].position, this.sideSize, run.possibleColors)
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
      updateMoves(globalRun.moves - 1);
    }
  }

  draw = function (canvas) {
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

  drawItems = function (canvas) { //ok
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

class TextAnimation {
  constructor(text, size, color, stroke, align, initialPosition, relativeEndPosition, frames) {
    this.text = text;
    this.size = size;
    this.color = color;
    this.stroke = stroke;
    this.align = align;
    this.initialPosition = initialPosition;
    this.relativeEndPosition = relativeEndPosition;
    this.frames = frames;
    this.id = generateId();

    this.fade = 200;
    this.velocityX = 0;
    this.velocityY = 0;
    this.velocityFade = 0;
    this.calculateVelocity();
  }

  calculateVelocity = function () {
    this.velocityX = this.relativeEndPosition.x / this.frames;
    this.velocityY = this.relativeEndPosition.y / this.frames;
    this.velocityFade = this.fade / this.frames;
  }

  draw = function () {
    fill(...this.color, this.fade)
    if (this.stroke > 0) {
      stroke(0,0,0, this.fade)
      strokeWeight(this.stroke)
    } else {
      noStroke();
    }

    textSize(this.size)
    textAlign(this.align)
    text(
      this.text,
      this.initialPosition.x,
      this.initialPosition.y,
    );
    noStroke();
    this.updatePosition();
  }

  updatePosition() {
    this.initialPosition.x += this.velocityX;
    this.initialPosition.y += this.velocityY;
    this.fade -= this.velocityFade;

    if (this.frames-- === 0) {
      globalAnimations = globalAnimations.filter(animation => animation.id !== this.id);
    }
  }
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
    let character = new Character(100)
    globalRun = new Run(character, 3, 3, 3, 5);
    globalCanvas = new CanvasInfo(16, 4, 4, 20);
    globalGrid = new Grid(parseInt(gridInputX.value, 10), parseInt(gridInputY.value, 10));
    globalGrid.calculateSpacing(globalCanvas);

    globalAnimations = [];

    updateScore([], true)
    updateCombo([], true)
    updateMoves(globalRun.movesPerStage)
  }, 0);

}

function draw() {
  removeMatches(findMatches(globalGrid));

  if (!globalGrid.isFull()) {
    applyGravity(globalGrid);
    globalGrid.generateItems(globalRun);
  } else {
    if (globalRun.moves === 0) {
      reload()
    }
  }

  globalCanvas.drawPlayfield();
  globalRun.drawRunInfo(globalCanvas)
  globalGrid.draw(globalCanvas);
  globalGrid.drawItems(globalCanvas);

  globalAnimations.forEach(animation => {
    animation.draw();
    animation.updatePosition(globalAnimations)
  });

  if (globalRun.winState) {
    alert('YOU WON!')
    setupGame();
  }
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
          globalRun.combo = 0
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

function canReach(pos1, pos2) {
  if (pos1.x === pos2.x) {
    return [pos1.y - 1, pos1.y + 1].includes(pos2.y);
  } else if (pos1.y === pos2.y) {
    return [pos1.x - 1, pos1.x + 1].includes(pos2.x);
  }
  return false

}

function damagePlayerAnimation(damage) {
  let textAnimation = new TextAnimation(
    `-${damage} HP`,
    20,
    [214, 87, 49],
    4,
    CENTER,
    new Position(globalCanvas.canvasSize.x / 2, globalCanvas.totalUiSize),
    new Position(0, 200),
    180
  );

  globalAnimations.push(textAnimation);
}

function reload() {
  updateMoves(globalRun.movesPerStage);
  let damage = globalRun.findEnemy().attack;
  globalRun.character.damage(damage)
  damagePlayerAnimation(Math.floor(damage))
}

function damageAnimation(damage, overkill) {
  let varianceX = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1)
  let varianceY = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1)

  let textAnimation = new TextAnimation(
    `${damage} DMG`,
    20,
    overkill ? [255, 0, 0] : [255, 255, 255],
    4,
    CENTER,
    new Position(mouseX + varianceX, mouseY + varianceY),
    new Position(0, -200),
    180
  );

  globalAnimations.push(textAnimation);
}

function damageEnemy(run, damage) {
  let enemy = run.findEnemy()
  let finalDamage = damage
  let overkill = enemy.currentHealth < damage;

  if (overkill) {
    finalDamage = enemy.currentHealth;
  }

  enemy.damage(finalDamage, run)
  damageAnimation(damage, overkill, globalCanvas);
}

function updateScore(match, resetCounter = false) {
  if (resetCounter) {
    globalRun.score = 0
    initialShuffle = true;
  }

  let additiveScore = 100 * match.length * globalRun.combo;

  globalRun.score += additiveScore
  scoreCounter.innerHTML = globalRun.score

  bestScore = bestScore > globalRun.score ? bestScore : globalRun.score;
  bestScoreCounter.innerHTML = bestScore

  if (!resetCounter) {
    damageEnemy(globalRun, additiveScore);
  }
}

function updateCombo(matches, resetCounter = false) {
  if (resetCounter) {
    globalRun.combo = 0
    initialShuffle = true;
    stackCombo = false;
    comboCounter.style = 'font-size: 1em'
  }

  globalRun.combo += [...matches].length;
  comboCounter.innerHTML = globalRun.combo

  bestCombo = bestCombo > globalRun.combo ? bestCombo : globalRun.combo;
  bestComboCounter.innerHTML = bestCombo

  let fontSize = globalRun.combo > 0 ? globalRun.combo : 1;
  comboCounter.style = 'font-size: ' + fontSize + 'em'
}

function updateMoves(value) {
  globalRun.moves = value

  moveCounter.innerHTML = globalRun.moves
  moveCounter.style = value > 10 ? 'color: white' : 'color: red';
}

function checkMouseOver(minX, maxX, minY, maxY) {
  return mouseX > minX && mouseX < maxX && mouseY > minY && mouseY < maxY;
}

function checkPositionInLimit(minX, maxX, minY, maxY, pos) {
  return pos.x > minX && pos.x < maxX && pos.y > minY && pos.y < maxY;
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

function drawBar(element, index, canvas) {
  let percentageOfBar = element.value / element.maxValue

  let commonMargin = (canvas.margin * (index + 2)) + (canvas.uiBarSize * index)
  let baseElementSize = (canvas.playfield.x - (2 * canvas.padding))

  fill(percentageOfBar ? element.color : [20, 20, 20]);
  noStroke()
  rect(
    canvas.margin + canvas.padding,
    commonMargin,
    baseElementSize * percentageOfBar,
    canvas.uiBarSize,
    canvas.radius + canvas.padding
  );

  fill(element.color)
  stroke(0)
  strokeWeight(4)
  textSize(20)

  textAlign(LEFT)
  text(
    element.title,
    canvas.margin + canvas.padding * 4,
    commonMargin + canvas.padding,
  );

  textAlign(RIGHT)
  text(
    `${Math.floor(element.value)}/${Math.floor(element.maxValue)}`,
    canvas.margin + baseElementSize - (canvas.padding * 4),
    commonMargin + canvas.padding,
  );
}

function sleep(millisecondsDuration) {
  return new Promise((resolve) => {
    setTimeout(resolve, millisecondsDuration);
  })
}

function generateId() {
  return "id" + Math.random().toString(16).slice(2)
}