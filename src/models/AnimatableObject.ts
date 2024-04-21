import { Position } from "./Position";

export class AnimatableObject {
    relativeEndPosition: Position = new Position(0, 0);
    frames: number = 0;
    velocityX: number = 0;
    velocityY: number = 0;
    velocityFade: number = 0;
    additiveFade: number = 0;
    relativeFade: number = 0;

    animationEndCallback: () => void = undefined;

    setupNewAnimation(frames: number, relativeEndPosition: Position = new Position(0, 0), relativeFade: number = 0): void {
        if (this.frames === 0) {
            this.frames = frames;
            this.relativeEndPosition = relativeEndPosition;
            this.relativeFade = relativeFade;
            this.calculateVelocity();
        }
    }

    calculateVelocity(): void {
        this.velocityX = this.relativeEndPosition.x / this.frames;
        this.velocityY = this.relativeEndPosition.y / this.frames;
        this.velocityFade = this.relativeFade / this.frames;
    }

    updatePosition(): void {
        if (this.relativeEndPosition && this.frames) {

            this.relativeEndPosition.x -= this.velocityX;
            this.relativeEndPosition.y -= this.velocityY;
            this.additiveFade += this.velocityFade;

            this.frames--
            if (this.frames === 0) {
                this.resetAnimationDeltas()
            }
        }
    }

    resetAnimationDeltas() {
        this.relativeEndPosition = new Position(0, 0);
        this.frames = 0
        this.relativeFade = 0
        this.additiveFade = 0
        this.velocityX = 0
        this.velocityY = 0
        if (this.animationEndCallback) {
            this.animationEndCallback()
        }
        this.animationEndCallback = undefined;
    }
}