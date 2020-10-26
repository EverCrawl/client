import { Vector2 } from "core/math";
import { Renderer } from "./Renderer";
import { Texture } from "./Texture";

interface SpriteData {
    [layer: string]: {
        [animation: string]: {
            frames: Array<{
                uv: { x: number, y: number, w: number, h: number };
                delay: number;
            }>;
            direction: string;
        }
    }
}

interface SpriteJSON {
    sprites: SpriteData;
    spritesheet: string;
    meta: {
        app: string;
        origin: string;
        version: string;
    }
}

export class Sprite {
    private spritesheet: Spritesheet_Friend;

    private animation_: string | null;
    private frameIndex: number = 0;
    private lastAnimationStep: number = Date.now();

    constructor(
        spritesheet: Spritesheet
    ) {
        this.spritesheet = spritesheet as unknown as Spritesheet_Friend;
        this.animation_ = null;
    }

    get animation() { return this.animation_ ?? ""; }

    draw(renderer: Renderer, layer: number, pos: Vector2, rot: number, scale: Vector2) {
        if (!this.spritesheet.loaded_) return;

        // TODO: expose sprite width, height

        let checkedAnimStep = false;
        for (const spriteLayer of Object.keys(this.spritesheet.sprites!)) {
            // if animation is null, it means we just loaded
            if (this.animation_ === null) {
                this.animation_ = Object.keys(this.spritesheet.sprites![spriteLayer])[0] ?? "";
            }

            const anim = this.spritesheet.sprites![spriteLayer][this.animation];
            if (!anim) continue;

            // check it on the first iteration
            // because theres no other robust way to access animations without accessing a layer first
            // TODO: expose animations without UVs
            if (!checkedAnimStep) {
                const now = Date.now();
                if (now - this.lastAnimationStep > anim.frames[this.frameIndex].delay) {
                    this.lastAnimationStep = now;
                    this.frameIndex = (this.frameIndex + 1) % anim.frames.length;
                }
                checkedAnimStep = true;
            }

            const uv = anim.frames[this.frameIndex].uv;
            renderer.draw(this.spritesheet.texture!, layer,
                [uv.x, uv.y], [uv.w, uv.h],
                pos, rot, [(this.spritesheet.texture!.width / anim.frames.length) * scale[0], this.spritesheet.texture!.height * scale[1]]);
        }
    }
}

interface Spritesheet_Friend {
    readonly gl: WebGL2RenderingContext;
    readonly path: string
    loaded_: boolean;
    sprites: SpriteData | null;
    texture: Texture | null;
    readonly ready: boolean;
    load(json: SpriteJSON): void;
}

export class Spritesheet {
    public readonly gl: WebGL2RenderingContext;
    public readonly path: string
    private loaded_: boolean;

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
        this.sprites = json.sprites;
        this.texture = new Texture(this.gl, json.spritesheet);

        console.log(this);

        this.loaded_ = true;
    }
}