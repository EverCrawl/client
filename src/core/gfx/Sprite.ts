import { Vector2 } from "core/math";
import { Renderer } from "./Renderer";
import { Texture } from "./Texture";
import { Friend } from "core/utils";

interface AnimationData {
    [name: string]: {
        frames: Array<{
            delay: number;
        }>;
        duration: number;
    }
}

interface SpriteData {
    [layer: string]: {
        [name: string]: {
            frames: Array<{
                uv: { x: number, y: number, w: number, h: number };
                size: { w: number, h: number };
                delay: number;
            }>;
            direction: string;
        }
    }
}

interface SpriteJSON {
    animations: AnimationData;
    sprites: SpriteData;
    spritesheet: string;
    meta: {
        app: string;
        origin: string;
        version: string;
    }
}

// Transitions are hardcoded.
const transitions: { [nodeA: string]: { [nodeB: string]: /* edge */ string } } = {
    "Idle": {
        "Jump": "JumpStart"
    },
    "Jump": {
        "Idle": "JumpEnd"
    }
};

class AnimationState<T extends string> {

    lastState: T;
    state: T;
    transitionStart = Date.now();
    transitioned = true;

    constructor(
        public animations: AnimationData,
        public defaultState: T,
        public sprite: Sprite_Friend
    ) {
        this.lastState = defaultState;
        this.state = defaultState;
        this.sprite.setAnimation(defaultState);
    }

    set(name: T, transition: boolean) {
        this.lastState = this.state;
        this.state = name;
        this.transitioned = transition;
    }

    get() {
        return this.state;
    }

    update() {
        if (this.lastState !== this.state) {
            const transition = transitions[this.lastState]?.[this.state];
            const transitionInfo = this.animations[transition];
            if (transition && !this.transitioned) {
                if (this.sprite.getAnimation() !== transition) {
                    this.sprite.setAnimation(transition);
                    this.transitionStart = Date.now();
                }
                if (Date.now() + 50 - this.transitionStart >= (transitionInfo!.duration)) {
                    // transition ended, next frame we will switch to idle anim
                    this.transitioned = true;
                }
            } else {
                this.sprite.setAnimation(this.state);
                this.lastState = this.state;
            }
        }
    }
}

type Sprite_Friend = Friend<Sprite, {
    getAnimation(): string | null;
    setAnimation(value: string): void;
}>;

export type Animations = "Jump" | "Move" | "Idle";

export class Sprite {
    private spritesheet: Spritesheet_Friend;

    private animation_: string;
    private frameIndex: number;
    private lastAnimationStep: number;
    private animationState: AnimationState<"Jump" | "Move" | "Idle"> | null;

    constructor(
        spritesheet: Spritesheet,
    ) {
        this.spritesheet = spritesheet as unknown as Spritesheet_Friend;
        this.animation_ = "";
        this.frameIndex = 0;
        this.lastAnimationStep = Date.now();
        this.animationState = null;
    }

    get animations(): AnimationData | null {
        return this.spritesheet.animations;
    }

    private getAnimation() {
        return this.animation_;
    }

    private setAnimation(value: string) {
        this.animation_ = value;
        this.frameIndex = 0;
        this.lastAnimationStep = Date.now();
    }

    animate(name: Animations, transition: boolean) {
        this.animationState?.set(name, transition);
    }

    get animation() {
        return this.animationState?.get();
    }

    draw(renderer: Renderer, layer: number, pos: Vector2, rot: number, scale: Vector2) {
        if (!this.spritesheet.loaded_) return;

        if (!this.animationState) {
            this.animationState = new AnimationState(this.spritesheet.animations!, "Idle", this as unknown as Sprite_Friend);
        }
        this.animationState.update();

        const anim = this.spritesheet.animations![this.animation_];
        if (!anim) return;

        const now = Date.now();
        if (now - this.lastAnimationStep > anim.frames[this.frameIndex].delay) {
            this.lastAnimationStep = now;
            this.frameIndex = (this.frameIndex + 1) % anim.frames.length;
        }

        for (const spriteLayer of Object.keys(this.spritesheet.sprites!)) {
            const anim = this.spritesheet.sprites![spriteLayer][this.animation_];
            if (!anim) continue;

            const uv = anim.frames[this.frameIndex].uv;
            const size = anim.frames[this.frameIndex].size;
            renderer.draw(this.spritesheet.texture!, layer,
                [uv.x, uv.y], [uv.w, uv.h],
                pos, rot, [size.w * scale[0], size.h * scale[1]]);
        }
    }
}

interface Spritesheet_Friend {
    readonly gl: WebGL2RenderingContext;
    readonly path: string
    loaded_: boolean;
    animations: AnimationData | null;
    sprites: SpriteData | null;
    texture: Texture | null;
    readonly ready: boolean;
    load(json: SpriteJSON): void;
}

export class Spritesheet {
    public readonly gl: WebGL2RenderingContext;
    public readonly path: string
    private loaded_: boolean;

    private animations: AnimationData | null = null;
    private sprites: SpriteData | null = null;
    private texture: Texture | null = null;

    constructor(
        gl: WebGL2RenderingContext,
        path: string
    ) {
        this.gl = gl;
        this.path = path;
        this.loaded_ = false;

        fetch(path)
            .then(response => response.json())
            .then(json => this.load(json));
    }

    get ready() {
        return this.loaded_;
    }

    private load(json: SpriteJSON) {
        this.animations = json.animations;
        this.sprites = json.sprites;
        this.texture = new Texture(this.gl, json.spritesheet);

        console.log(this);

        this.loaded_ = true;
    }
}