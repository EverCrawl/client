import { Vector2 } from "core/math";
import { SpriteRenderer } from "./Renderer";
import { Texture, TextureKind } from "./Texture";
import { Friend } from "core/utils";

/*
TO ADD A NEW ANIMATION:

1. Add its name to `type Animations` for auto-suggestion
2. Add its transitions from/to other animations (if applicable)
3. Add a trigger for it somewhere (sprite.state = <ANIMATION_NAME>) 

Please note that "Animation" and "State" are treated as the same thing
So it's valid to check if an animation has finished.

TODO(?): add callbacks for animation start/end
*/

type Sprite_Friend = Friend<Sprite, {
    getAnimation(): string | null;
    setAnimation(value: string): void;
}>;

export class State {
    moving: boolean = false;
    direction: number = 0;
    lastDirection: number = 0;
    lastAnimation: string = "";
}

export const enum Direction {
    Up = 1 << 0,
    Down = 1 << 1,
    Left = 1 << 2,
    Right = 1 << 3
};

export class Sprite {
    private spritesheet: Spritesheet_Friend;

    // current animation
    animation: string;
    private frameIndex: number;
    private lastAnimationStep: number;

    // determines next animation
    private lastAnimation: string;
    direction: Direction;
    private lastDirection: Direction;
    moving: boolean;

    constructor(
        spritesheet: Spritesheet,
    ) {
        this.spritesheet = spritesheet as unknown as Spritesheet_Friend;
        this.animation = "Idle_Down";
        this.lastAnimation = "Idle_Down";
        this.direction = 0;
        this.lastDirection = Direction.Down;
        this.moving = false;

        this.frameIndex = 0;
        this.lastAnimationStep = Date.now();
    }

    get animations(): { [name: string]: AnimationDesc } | null {
        return this.spritesheet.animations;
    }

    get width() {
        return (this.spritesheet.maxSize?.w ?? 0) / 2;
    }

    get height() {
        return (this.spritesheet.maxSize?.h ?? 0) / 2;
    }

    update() {
        if (this.moving && (this.lastDirection != this.direction)) {
            this.lastDirection = this.direction;
        }

        let animation = `${this.moving ? "Walk_" : "Idle_"}`;
        if (this.lastDirection & Direction.Up) animation += "Up";
        else if (this.lastDirection & Direction.Down) animation += "Down";
        if (this.lastDirection & Direction.Left) animation += "Left";
        else if (this.lastDirection & Direction.Right) animation += "Right";

        if (animation != this.lastAnimation) {
            this.animation = animation;
            this.frameIndex = 0;
            this.lastAnimationStep = Date.now();
        }
        this.lastAnimation = animation;
    }

    draw(renderer: SpriteRenderer, layer: number, pos: Vector2 = [0, 0], rot: number = 0, scale: Vector2 = [1, 1]) {
        if (!this.spritesheet.loaded_) return;

        const anim = this.spritesheet.animations![this.animation];
        if (!anim) return;

        const now = Date.now();
        if (now - this.lastAnimationStep > anim.frames[this.frameIndex].delay) {
            this.lastAnimationStep = now;
            this.frameIndex = (this.frameIndex + 1) % anim.frames.length;
        }

        for (const spriteLayer of Object.keys(this.spritesheet.layers!)) {
            const anim = this.spritesheet.layers![spriteLayer][this.animation];
            if (!anim) continue;

            const uv = anim.frames[this.frameIndex].uv;
            const size = anim.frames[this.frameIndex].size;
            renderer.draw(this.spritesheet.texture!, layer,
                [uv.x, uv.y], [uv.w, uv.h],
                [pos[0], pos[1] - size.h / 2], rot, [size.w * scale[0], size.h * scale[1]]);
        }
    }
}


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

interface Spritesheet_Friend {
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
    private static cache: Map<string, Spritesheet> = new Map();

    public readonly path: string
    private loaded_: boolean;

    private animations: { [name: string]: AnimationDesc } | null = null;
    private layers: { [name: string]: Layer } | null = null;
    private texture: Texture | null = null;
    private maxSize: Size | null = null;

    constructor(
        path: string
    ) {
        this.path = path;
        this.loaded_ = false;

        if (Spritesheet.cache.has(path)) return Spritesheet.cache.get(path)!;
        else {
            fetch(path)
                .then(it => it.json())
                .then(it => this.load(it));
            Spritesheet.cache.set(path, this)
        }
    }

    get ready() {
        return this.loaded_;
    }

    private load(json: any) {
        const transformed = parseSpriteData(json, this.path.substr(0, this.path.lastIndexOf("/")));
        this.animations = transformed.animations;
        this.layers = transformed.layers;
        this.texture = Texture.create(TextureKind.Image2D, { path: transformed.spritesheet, mipmap: false });
        this.maxSize = transformed.maxSize;
        this.loaded_ = true;
        console.log(`finished loading ${this.path}`, this);
    }
}

function parseSpriteData(json: any, dir: string): any {
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