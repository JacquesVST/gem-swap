import './global.js';
import 'p5/lib/addons/p5.sound';
import * as p5 from 'p5';
import { CanvasInfo } from "./models/CanvasInfo";
import { Character } from "./models/Character";
import { DialogController } from "./models/Dialog";
import { Grid } from "./models/Grid";
import { Position } from "./models/Position";
import { BestNumbers, Run, RunConfig } from "./models/Run";
import { TextAnimationController } from "./models/TextAnimation";
import { getBestNumbers } from './utils/Functions.js';
/*
let resetButton: HTMLElement = document.getElementById('resetBtn');
let scoreCounter: HTMLElement = document.getElementById('scoreCounter');
let bestScoreCounter: HTMLElement = document.getElementById('bestScoreCounter');
let comboCounter: HTMLElement = document.getElementById('comboCounter');
let bestComboCounter: HTMLElement = document.getElementById('bestComboCounter');
let damageCounter: HTMLElement = document.getElementById('damageCounter');
let bestDamageCounter: HTMLElement = document.getElementById('bestDamageCounter');
let runInfo: HTMLElement = document.getElementById('runInfo');
let statsContainer: HTMLElement = document.getElementById('statsContainer');
let rewardsContainer: HTMLElement = document.getElementById('rewardsContainer');
*/
const sketch = (p5Instance: p5) => {
    let run: Run;
    let canvas: CanvasInfo;
    let textAnimationController: TextAnimationController;
    let dialogController: DialogController;
    /*
    let dialogs: Dialog[] = [];
    let currentDialog: Dialog | undefined;
*/
    let sounds: { [key: string]: p5.SoundFile };
    let controls: { [key: string]: HTMLElement };

    p5Instance.preload = () => {
        p5Instance.soundFormats('mp3');

        sounds = {
            bossDefeat: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/boss-defeat.mp3'),
            defeat: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/defeat.mp3'),
            enemyDefeat: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/enemy-defeat.mp3'),
            item: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/item.mp3'),
            match: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/match.mp3'),
            move: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/move.mp3'),
            newFloor: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/new-floor.mp3'),
            noMove: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/no-move.mp3'),
            select: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/generic.mp3')
        }

    }

    p5Instance.setup = () => {
        p5Instance.textFont('Open Sans');

        controls = {
            bestComboCounter: document.getElementById('bestComboCounter'),
            bestDamageCounter: document.getElementById('bestDamageCounter'),
            bestScoreCounter: document.getElementById('bestScoreCounter'),
            comboCounter: document.getElementById('comboCounter'),
            damageCounter: document.getElementById('damageCounter'),
            resetButton: document.getElementById('resetBtn'),
            rewardsContainer: document.getElementById('rewardsContainer'),
            runInfo: document.getElementById('runInfo'),
            scoreCounter: document.getElementById('scoreCounter'),
            statsContainer: document.getElementById('statsContainer'),
        }

        let bests: BestNumbers = getBestNumbers();

        controls.bestScoreCounter.innerHTML = bests.bestScore + '';
        controls.bestComboCounter.innerHTML = bests.bestCombo + '';
        controls.bestDamageCounter.innerHTML = bests.bestDamage + '';

        canvas = new CanvasInfo(p5Instance, 16, 4, 4, 20, 4, 2);
        textAnimationController = new TextAnimationController(canvas);
        dialogController = new DialogController(canvas);

        controls.resetButton.onclick = (() => {
            setupGame();
        }).bind(this)

        setupGame();
    }

    p5Instance.draw = () => {
        //logic



        /*
        if (!run.grid.isFull) {
            run.grid.applyGravity((pos1: Position, pos2: Position) => {
                swap(pos1, pos2, (() => {
                    run.grid.generateItems(run);
                }).bind(this));
            });
        } else {
            if (!run.inAnimation && !dialogController.currentDialog) {
                let matches: Item[][] = run.grid.findMatches()
                run.grid.removeMatches(matches, run, true);
            }
            if (run.character.moves === 0) {
                reload()
            }
        }

                
        if (run?.winState) {
            setTimeout(() => {
                let finalScore: number = run.score;
                dialogController.clear();
                alert('YOU WON!\nwith a score of: ' + formatNumber(finalScore))
                setupGame();
            }, 0);
        }
        */

        if (run?.grid?.isEmpty) {
            run?.grid.init(run, () => {
                run.grid.applyCriticalInBoard();
            });
        }
        
        canvas.drawPlayfield();

        run?.drawProgressBars()
        run?.grid.draw(canvas, p5Instance, !!dialogController.currentDialog);
        run?.grid.drawItems(p5Instance);

        dialogController.draw(run);
        textAnimationController.draw();
    }

    p5Instance.mouseClicked = () => {
        //p5Instance.userStartAudio();
        let click: Position = new Position(p5Instance.mouseX, p5Instance.mouseY)
        if (!dialogController.currentDialog) {
            if (run) {
                run.grid.mouseClickedGrid(click, run)
            }
        } else {
            dialogController.mouseClickedDialog(click, run);
        }
    }

    function setupGame(): void {
        if (run) {
            run = undefined;
        }

        Run.newGameDialog(canvas, dialogController, (config: RunConfig) => {
            run = new Run(p5Instance, Character.defaultCharacter(), config, textAnimationController, dialogController)
            run.grid = new Grid(config.gridX, config.gridY, canvas);
            run.canvas = canvas;
            run.sounds = sounds;
            run.controls = controls;
            run.setupGame = setupGame.bind(this);
            //run.inAnimation = false

            run.updateScore([]);
            run.updateCombo([]);
            run.updateDamage(0);
            run.updatePlayerStatsAndRewards();
            //clear board before drawing

            //run.grid.clearBoard(run);

            //run.grid.init(run);
        })
    }
    /*
       function animateSwap(animateSwapData: AnimateSwapData, callback: () => void): void {
           let { item1, item2, cell1, cell2, frames } = animateSwapData;
   
           if (item1) {
               item1.animationEndCallback = callback
               item1.setupNewAnimation(frames, cell2.canvasPosition.difference(cell1.canvasPosition))
           }
   
           if (item2) {
               item2.setupNewAnimation(frames, cell2.canvasPosition.minus(cell1.canvasPosition))
           }
       }
      
           function removeItem(item: Item, animate: boolean = true) {
               if (animate) {
                   sounds['match'].play();
                   run.inAnimation = true;
                   item.animationEndCallback = (() => {
                       run.grid.removeItem(item)
                       run.inAnimation = false
                   }).bind(this);
                   item.setupNewAnimation(run.stackCombo ? 10 : 3, new Position(0, 0), 255);
               } else {
                   run.grid.removeItem(item)
               }
       
           }
       */   /*
  function clearBoard(): void {
      let iterations: number = 50;
      let intervalWithCallback = (duration: number, callback: () => void) => {
          let count: number = 0;
          let interval = setInterval(() => {
              if (!run.grid.isFull()) {
                  applyGravity(false);
                  run.grid.generateItems(run);
              } else {
                  let matches: Item[][] = run.grid.findMatches(run.initialAnimation)
                  if (matches.length) {
                      run.grid.removeMatches(matches, run, false);
                  }
              }
              count++
              if (count === duration) {
                  clearInterval(interval)
                  callback();
              }
          }, 1);
      }
 
      intervalWithCallback(iterations, () => {
          run.initialAnimation = false;
      })
  }
 
  function removeMatches(matches: Item[][], run: Run, animate: boolean = true): void {
      if (run.stackCombo) {
          updateCombo(matches);
      }
 
      matches.forEach((match: Item[]) => {
          if (!run.initialShuffle) {
              if (run.character.hpRegenFromReward > 0) {
                  if (match.length >= 4) {
                      run.character.heal(run.character.health / 100 * run.character.hpRegenFromReward);
                  }
              }
 
              updateScore(match);
          }
          match.forEach((item: Item) => {
              removeItem(item, animate);
          });
      });
  }
 
      function findMatches(validate: boolean): Item[][] {
          let matches: Item[][] = [];
  
          run.grid.iterateYtoX((x: number, y: number) => {
              let cell = run.grid.getCellbyPosition(new Position(x, y));
  
              if (cell.item) {
                  let item: Item = cell.item
                  let horizontalMatch: Item[] = [item]
  
                  // horizontal match
                  let sameShape: boolean = true
                  let increment: number = 1;
                  while (sameShape && (increment + x) < run.grid.width) {
                      let nextItem: Item = run.grid.getNeighbourCell(cell, increment, 0).item
                      sameShape = nextItem && item.shape.sides === nextItem.shape.sides;
                      if (sameShape) {
                          horizontalMatch.push(nextItem);
                          increment++;
                      }
                  }
  
                  // vertical match
                  sameShape = true
                  increment = 1;
                  let verticalMatch: Item[] = [item]
                  while (sameShape && increment + y < run.grid.height) {
                      let nextItem: Item = run.grid.getNeighbourCell(cell, 0, increment).item
                      sameShape = nextItem && item.shape.sides === nextItem.shape.sides;
                      if (sameShape) {
                          verticalMatch.push(nextItem);
                          increment++;
                      }
                  }
  
                  let omniMatch: Item[] = [...(horizontalMatch.length > 2 ? horizontalMatch : []), ...(verticalMatch.length > 2 ? verticalMatch : [])]
  
                  if (omniMatch.length) {
                      matches.push(omniMatch)
                  }
              }
          });
  
          return validate ? matches : sanitizeMatches(matches);
      }
  
      function sanitizeMatches(matches: Item[][]): Item[][] {
          if (matches.length === 1) {
              return matches;
          }
  
          do {
              for (let i = 0; i < matches.length - 1; i++) {
                  let match1: Item[] = matches[i];
                  let match2: Item[] = matches[i + 1];
  
                  if (mergeMatches(match1, match2).length !== match1.concat(match2).length) {
                      matches.splice(i, 2)
                      matches.push(mergeMatches(match1, match2));
                  }
              }
          } while (!matches.flat().map((item: Item) => item.id).every((value: string, index: number, array: string[]) => array.indexOf(value) === array.lastIndexOf(value)))
  
          return matches;
      }
  
      function mergeMatches(match1: Item[], match2: Item[]): Item[] {
          return Array.from(new Set(match1.concat(match2)));
      }
  
     
 
  function applyGravity(animate: boolean = true): void {
      run.grid.applyGravity((pos1: Position, pos2: Position) => {
          swap(pos1, pos2, undefined, false, animate);
      });
  } 

 function reload(): void {
     run.character.moves = run.maxMoves;
     let damage: number = run.findEnemy().attack;
     run.character.takeDamage(damage, ((damage: number, shielded: boolean) => {
         sounds['defeat'].play();
         textAnimationController.damagePlayerAnimation(Math.floor(damage), shielded)
     }).bind(this), (() => {
         let finalScore: number = run.score;
         alert('YOU LOST!\nwith a score of: ' + formatNumber(finalScore));
         setupGame();
     }).bind(this))

 }
 
     function updateScore(match: Item[], resetCounter: boolean = false): void {
         if (resetCounter) {
             run.score = 0
             run.initialShuffle = true;
         }
         let bonusDmg: number = 0
         if (match[0]?.shape) {
             bonusDmg = match[0].shape.bonusDmg;
         }
 
         let additiveScore: number = (run.character.attack + bonusDmg) * match.length;
         additiveScore *= run.character.hasReward('Combos multiply DMG') ? run.combo : 1;
 
         run.score += additiveScore
         scoreCounter.innerHTML = formatNumber(run.score);
 
         let bests: BestNumbers = getBestNumbers();
         bests.bestScore = bests.bestScore > run.score ? bests.bestScore : run.score;
         bestScoreCounter.innerHTML = formatNumber(bests.bestScore);
         setBestNumbers(bests);
 
         if (!resetCounter) {
             let cell1: Cell = run.grid.getCellbyPosition(match[0].position);
             let cell2: Cell = run.grid.getCellbyPosition(match[match.length - 1].position);
             let position: Position = cell1.canvasPosition.average(cell2.canvasPosition);
             damageEnemy(additiveScore, position);
             run.updateDamage(additiveScore);
         }
     }
 
     function damageEnemy(damage: number, position: Position): void {
         damage = damage * run.character.damageMultiplier;
         let enemy: Enemy = run.findEnemy()
         let finalDamage: number = enemy.simulateDamage(damage);
         let overkill: boolean = enemy.currentHealth <= damage;
 
         damageAnimation(damage, overkill, position);
         enemy.damage(finalDamage, undefined,
             (() => {
                 run.character.gold += enemy.gold;
                 if (enemy.gold > 0) {
                     goldAnimation(enemy.gold);
                 }
                 enemy.gold = 0;
                 if (run.findEnemy()?.number === run.map.enemyCount - 1) {
                     bossFightAnimation();
                 }
                 sounds['enemyDefeat'].play()
                 run.checkUpdateProgress(() => {
                     run.stackCombo = false;
                     run.initialShuffle = true;
                     run.character.moves = run.maxMoves;
                     if (!run.winState) {
                         run.newPercDialog(dialogs, (() => {
                             updatePlayerStatsAndRewards();
                             sounds['item'].play();
                         }).bind(this))
                     }
                     sounds['bossDefeat'].play()
                 }, () => {
                     newFloorAnimation()
                     if (!run.winState) {
                         run.newShopDialog(dialogs, (() => {
                             updatePlayerStatsAndRewards()
                             sounds['item'].play();
                         }).bind(this), (() => {
                             currentDialog = undefined
                             dialogs.pop();
                         }).bind(this))
                         sounds['newFloor'].play()
                     }
                 });
             }).bind(this));
     }
     */



    /*
    function updateCombo(matches: Item[][], resetCounter: boolean = false): void {
        if (resetCounter) {
            run.combo = 0
            run.initialShuffle = true;
            run.stackCombo = false;
            comboCounter.setAttribute('style', 'font-size: 1em');
        }

        run.combo += [...matches].length;
        comboCounter.innerHTML = formatNumber(run.combo);

        let bests: BestNumbers = getBestNumbers();
        bests.bestCombo = bests.bestCombo > run.combo ? bests.bestCombo : run.combo;
        bestComboCounter.innerHTML = formatNumber(bests.bestCombo);
        setBestNumbers(bests);

        let fontSize: number = run.damage > 0 ? ((run.combo / bestCombo) * 2 >= 1 ? (run.combo / bestCombo) * 2 : 1) : 1;
        comboCounter.setAttribute('style', 'font-size: ' + fontSize + 'em; ' + (bestCombo === run.combo && run.combo !== 0 ? 'color: red' : 'color: white'));
    }

    function updateDamage(damageDealt: number, resetCounter: boolean = false): void {
        if (resetCounter) {
            run.damage = 0
            run.initialShuffle = true;
            run.stackCombo = false;
            damageCounter.setAttribute('style', 'font-size: 1em');
        }

        run.damage += damageDealt;
        damageCounter.innerHTML = formatNumber(run.damage);

        let bests: BestNumbers = getBestNumbers();
        bests.bestDamage = bests.bestDamage > run.damage ? bests.bestDamage : run.damage;
        bestDamageCounter.innerHTML = formatNumber(bests.bestDamage);
        setBestNumbers(bests);

        let fontSize: number = run.damage > 0 ? ((run.damage / bestDamage) * 2 >= 1 ? (run.damage / bestDamage) * 2 : 1) : 1;
        damageCounter.setAttribute('style', 'font-size: ' + fontSize + 'em; ' + (bestDamage === run.damage && run.damage !== 0 ? 'color: red' : 'color: white'));
    }


    function updatePlayerStatsAndRewards(): void {
        if (!runInfo.classList.contains('show')) {
            runInfo.classList.add('show');
        }

        let statsContent: string = '';
        if (run?.character) {
            statsContent += '<div class="stats-ui">'

            statsContent += '<div class="stat">'
            statsContent += `<strong>Attack:</strong>&nbsp;<span>${formatNumber(run.character.attack)}</span>`
            statsContent += '</div>';

            statsContent += '<div class="stat">'
            statsContent += `<strong>Multiplier:</strong>&nbsp;<span>x${run.character.damageMultiplier}</span>`
            statsContent += '</div>';

            statsContent += '<div class="stat">'
            statsContent += `<strong>Defense:</strong>&nbsp;<span>${run.character.defense}</span>`
            statsContent += '</div>';

            statsContent += '<div class="stat">'
            statsContent += `<strong>Gold:</strong>&nbsp;<span>${run.character.gold}</span>`
            statsContent += '</div>';

            statsContent += '</div>';
        }

        statsContainer.innerHTML = statsContent;

        let rewardsContent: string = '';

        if (run?.character?.rewards || run?.character?.activeItem) {
            let rewardsToShow = [...run.character.rewards];

            if (run?.character?.activeItem) {
                rewardsToShow.unshift(run.character.activeItem);
            }

            rewardsToShow.forEach((reward: Reward, index: number) => {
                if (index % 4 === 0 || index === 0) {
                    rewardsContent += '</div><div class="reward-ui">'
                }

                rewardsContent += `
                <div class="reward-wrap">
                <div class="centered reward rarity-${reward.rarity}">
                <span class="rarity">${reward.rarity}</span>`;

                rewardsContent += reward.price ? `<span class="price">$ ${reward.price}</span><br>` : '<br>';

                rewardsContent += `    
                <h3>${reward.name}</h3>
                <strong>${reward.description}</strong>`

                rewardsContent += reward.isActive ? '<br><input type="button" id="activeItem" value="Activate">' : '';

                rewardsContent +=
                    `</div>
                </div>
                <br>`
            })
            rewardsContent += '</div>';
        }

        rewardsContainer.innerHTML = rewardsContent;

        if (run?.character?.activeItem) {
            let activeItemButton: HTMLElement = document.getElementById('activeItem');
            activeItemButton.onclick = () => {
                run.character.activeItem.effect();
                sounds['item'].play();
                updatePlayerStatsAndRewards();
            }
        }
    }
        */
};

new p5(sketch);