import { Vector2 } from "core/math";
import { SpriteRenderer } from "./Renderer";
import { Texture, TextureKind } from "./Texture";
import { Friend } from "core/utils";

/**
 * Available animations
 */
export type Animations =
    | "Idle_Down"
    | "Idle_DownLeft"
    | "Idle_DownRight"
    | "Idle_Left"
    | "Idle_Right"
    | "Idle_Up"
    | "Idle_UpLeft"
    | "Idle_UpRight"
    | "Walk_Down"
    | "Walk_DownLeft"
    | "Walk_DownRight"
    | "Walk_Left"
    | "Walk_Right"
    | "Walk_Up"
    | "Walk_UpLeft"
    | "Walk_UpRight"

/*
TO ADD A NEW ANIMATION:

1. Add its name to `type Animations` for auto-suggestion
2. Add its transitions from/to other animations (if applicable)
3. Add a trigger for it somewhere (sprite.state = <ANIMATION_NAME>) 

Please note that "Animation" and "State" are treated as the same thing
So it's valid to check if an animation has finished.

TODO(?): add callbacks for animation start/end
*/

interface Size {
    w: number, h: number;
}

interface UV {
    x: number, y: number, w: number, h: number
}

interface Frame {
    uv: UV;
    size: Size;
    delay: number;
}

interface Animation {
    frames: Frame[];
    direction: string;
}

interface Layer {
    [name: string]: Animation
}

interface FrameDesc {
    delay: number;
}

interface AnimationDesc {
    frames: FrameDesc[];
    duration: number;
}

// Transitions are hardcoded.
const transitions: { [nodeA: string]: { [nodeB: string]: /* edge */ string } } = {
    /* "Idle": {
        "Jump": "JumpStart"
    }, */
    /* "Jump": {
        "Idle": "JumpEnd",
        "Move": "JumpEnd"
    }, */
    /* "Move": {
        "Jump": "JumpStart"
    } */
};

class AnimationState<T extends string> {

    lastState: T;
    state: T;
    transitionStart = Date.now();
    transitioned = true;

    constructor(
        public animations: { [name: string]: AnimationDesc },
        public defaultState: T,
        public sprite: Sprite_Friend
    ) {
        this.lastState = defaultState;
        this.state = defaultState;
        this.sprite.setAnimation(defaultState);
    }

    set(name: T) {
        this.lastState = this.state;
        this.state = name;
        this.transitioned = transitions[this.lastState]?.[name] === undefined;
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
                // magic constant - skip about one update, otherwise animation repeats which we don't want
                // TODO: do this in a more robust way by setting a flag to prevent this animation from repeating
                if (Date.now() + 16 - this.transitionStart >= (transitionInfo!.duration)) {
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

export class Sprite {
    private spritesheet: Spritesheet_Friend;

    private animation_: string;
    private frameIndex: number;
    private lastAnimationStep: number;
    private animationState: AnimationState<Animations> | null;

    constructor(
        spritesheet: Spritesheet,
    ) {
        this.spritesheet = spritesheet as unknown as Spritesheet_Friend;
        this.animation_ = "";
        this.frameIndex = 0;
        this.lastAnimationStep = Date.now();
        this.animationState = null;
    }

    get animations(): { [name: string]: AnimationDesc } | null {
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

    animate(name: Animations) {
        this.animationState?.set(name);
    }

    set animation(value: Animations | undefined) {
        this.animationState?.set(value ?? "Idle_Down");
    }

    get animation() {
        return this.animationState?.get();
    }

    get width() {
        return (this.spritesheet.maxSize?.w ?? 0) / 2;
    }

    get height() {
        return (this.spritesheet.maxSize?.h ?? 0) / 2;
    }

    draw(renderer: SpriteRenderer, layer: number, pos: Vector2 = [0, 0], rot: number = 0, scale: Vector2 = [1, 1]) {
        if (!this.spritesheet.loaded_) return;

        if (!this.animationState) {
            this.animationState = new AnimationState(this.spritesheet.animations!, "Idle_Down", this as unknown as Sprite_Friend);
        }
        this.animationState.update();

        const anim = this.spritesheet.animations![this.animation_];
        if (!anim) return;

        const now = Date.now();
        if (now - this.lastAnimationStep > anim.frames[this.frameIndex].delay) {
            this.lastAnimationStep = now;
            this.frameIndex = (this.frameIndex + 1) % anim.frames.length;
        }

        for (const spriteLayer of Object.keys(this.spritesheet.layers!)) {
            const anim = this.spritesheet.layers![spriteLayer][this.animation_];
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
    animations: { [name: string]: AnimationDesc } | null;
    layers: { [name: string]: Layer } | null;
    texture: Texture | null;
    maxSize: Size | null;
    readonly ready: boolean;
    load(json: any): void;
}

export class Spritesheet {
    public readonly gl: WebGL2RenderingContext;
    public readonly path: string
    private loaded_: boolean;

    private animations: { [name: string]: AnimationDesc } | null = null;
    private layers: { [name: string]: Layer } | null = null;
    private texture: Texture | null = null;
    private maxSize: Size | null = null;

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

    private load(json: any) {
        const transformed = transform_sprite_data(json, this.path.substr(0, this.path.lastIndexOf("/")));
        this.animations = transformed.animations;
        this.layers = transformed.layers;
        this.texture = Texture.create(this.gl, TextureKind.Image2D, { path: transformed.spritesheet, mipmap: false });
        this.maxSize = transformed.maxSize;

        console.log(this);

        this.loaded_ = true;
    }
}

function transform_sprite_data(json: any, dir: string): any {
    let animations: { [name: string]: any } = {};
    let layers: { [name: string]: any } = {};
    let maxSize = { w: 0, h: 0 };

    const jmeta = json["meta"]
    const jmeta_w = jmeta["size"]["w"];
    const jmeta_h = jmeta["size"]["h"];
    const frameTags = jmeta["frameTags"];

    for (const layer of jmeta["layers"]) {
        layers[layer["name"]] = {};
        let n = 0;
        nextAnimation: while (n < frameTags.length) {
            const animation = frameTags[n];
            const animationName = animation["name"];
            const length = parseInt(animation["to"]) - parseInt(animation["from"]) + 1;
            let totalDuration = 0.0;
            let frames: any[] = [];
            for (let i = 0; i < length; ++i) {
                const frameName = `${layer["name"]} ${animationName} ${i}`;
                if (!json["frames"][frameName]) continue nextAnimation;

                const raw_frame = json["frames"][frameName];
                const info = raw_frame["frame"];
                const fx = parseFloat(info["x"]);
                const fy = parseFloat(info["y"]);
                const fw = parseFloat(info["w"]);
                const fh = parseFloat(info["h"]);

                const duration = parseFloat(raw_frame["duration"]);
                totalDuration += duration;
                if (maxSize.w < fw * 2) maxSize.w = fw * 2;
                if (maxSize.h < fh * 2) maxSize.h = fh * 2;

                const uv = {
                    x: fx / jmeta_w,
                    y: fy / jmeta_h,
                    w: fw / jmeta_w,
                    h: fh / jmeta_h
                };
                const size = { w: fw, h: fh };
                frames.push({
                    uv: uv,
                    size: size,
                    delay: duration
                });
            }
            animations[animationName] = {
                frames: frames.map((f: any): any => ({ delay: f.delay })),
                duration: totalDuration
            };
            layers[layer["name"]][animationName] = {
                frames: frames,
                duration: totalDuration
            };
            n += 1;
        }
    }

    let spritesheet = dir + "/" + jmeta["image"];
    return {
        animations: animations,
        layers: layers,
        spritesheet: spritesheet,
        maxSize: maxSize
    };
}