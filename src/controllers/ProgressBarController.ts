import { IEventParams, ProgressBarIndexes } from "../interfaces";
import { Color } from "../models/Color";
import { Icon } from "../models/Icon";
import { Position } from "../models/Position";
import { ProgressBar } from "../models/ProgressBar";
import { Run } from "../models/Run";
import { EnemyStage } from "../models/Stage";
import { EventEmitter } from "./EventEmitter";

export class ProgressBarController extends EventEmitter {
    private static instance: ProgressBarController;
    progressBars: ProgressBar[];

    private constructor() {
        super('ProgressBarController')
        this.progressBars = [];
    }

    static getInstance(): ProgressBarController {
        if (!ProgressBarController.instance) {
            ProgressBarController.instance = new ProgressBarController();
        }
        return ProgressBarController.instance;
    }

    configureListeners(): void {
        this.on('Run:UpdateProgressBar', (index: ProgressBarIndexes, newProgressBar: ProgressBar, params: IEventParams) => {
            let difference: number = this.progressBars[index].value - newProgressBar.value;
            if (difference !== 0) {
                this.progressBars[index] = newProgressBar;
                this.progressBars[index].animate(difference, params);
            } else {
                if (params) {
                    this.progressBars[index].emit('ProgressBarUpdated:' + params.useCase, params.data);
                }
            }
        })

        this.on('Main:MouseClicked:Click', (click: Position, run?: Run) => {
            if (run?.hasDialogOpen, run?.player.hasInventoryOpen) {
                return;
            }

            this.progressBars.forEach((progressBar: ProgressBar, index: number) => {
                if (progressBar?.limits?.contains(click) && index === 2) {
                    run.enemyDetailsOpen = !run.enemyDetailsOpen;
                }
            })
        });
    }

    initialize(run: Run): void {
        this.progressBars = [
            ProgressBarController.floorBar(run),
            ProgressBarController.stageBar(run),
            ProgressBarController.enemyHealthBar(run, run.map.enemy.health),
            ProgressBarController.yourMovesBar(run.player.maxMoves, run.player.moves),
            ProgressBarController.yourHealthBar(run.player.maxHealth, run.player.health)
        ];
    }

    draw(run?: Run): void {
        if (run) {
            this.progressBars.forEach((progressBars: ProgressBar) => {
                progressBars?.draw(run);
            });
        }
    }

    static floorBar(run: Run): ProgressBar {
        return new ProgressBar(
            run.map.floors.length,
            run.map.floor.number ?? run.runConfig.map.floors,
            'Floor',
            Color.YELLOW,
            true,
            ProgressBarIndexes.FLOOR,
            Icon.LAYER
        );
    }

    static stageBar(run: Run): ProgressBar {
        return new ProgressBar(
            run.map.floor.stages.length,
            run.map.stage.number ?? run.runConfig.map.stages,
            'Stage',
            Color.BLUE,
            true,
            ProgressBarIndexes.STAGE,
            Icon.STAGE
        );
    }

    static enemyHealthBar(run: Run, health: number): ProgressBar {
        if (run.map.stage instanceof EnemyStage) {
            return new ProgressBar(
                run.map.enemy.maxHealth,
                health,
                run.map.enemy.name + ' Health (' + run.map.enemy.number + '/' + run.map.stage.enemies.length + ')',
                run.map.enemy.color,
                true,
                ProgressBarIndexes.ENEMY,
                Icon.ENEMY
            );

        } else {
            return undefined;
        }
    }

    static yourMovesBar(maxMoves: number, moves: number): ProgressBar {
        return new ProgressBar(
            maxMoves,
            moves,
            'Your Moves',
            moves <= 3 ? Color.RED : Color.GREEN,
            false,
            ProgressBarIndexes.MOVES,
            Icon.SWAP
        );
    }

    static yourHealthBar(maxHealth: number, health: number): ProgressBar {
        return new ProgressBar(
            maxHealth,
            health,
            'Your Health',
            Color.RED,
            false,
            ProgressBarIndexes.HEALTH,
            Icon.HEART
        );
    }
}
