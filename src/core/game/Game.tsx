import * as Core from "core";
import { v2, Vector2, Matrix3, m3 } from "core";

// high priority:
// TODO: (client) render tilemap
// TODO: (client) net connection
// TODO: (game server) collisions
// TODO(?): node.js auth server
// TODO: (game server) DB access
// TODO: (auth + game servers) authentication with DB
// TODO: (both) basic gameplay
//      - move, attack (slash), attack (dash), attack (spell)
// TODO: client-side prediction
// TODO: playtest deployment
// low priority:
// TODO: change shader naming convention from all-caps to CamelCase
// TODO: unify renderer architecture
// TODO: unify texture sampling

/**
 * Lightweight state wrapper. Provides an abstraction
 * for interpolating between states.
 */
class State<T> {
    private current_: T;
    private previous_: T;

    constructor(
        initial: T,
        private lerp: (a: T, b: T, weight: number) => T
    ) {
        this.current_ = initial;
        this.previous_ = initial;
    }

    public get current(): T { return this.current_; }
    public get previous(): T { return this.previous_; }

    public update(value: T): void {
        this.previous_ = this.current_;
        this.current_ = value;
    }

    public get(weight: number): T {
        return this.lerp(this.previous_, this.current_, weight);
    }
}

class Position extends State<Vector2> {
    constructor(initial: Vector2) {
        super(initial, v2.lerp);
    }
}

const enum Direction {
    Up = 1 << 1,
    Down = 1 << 2,
    Left = 1 << 3,
    Right = 1 << 4
};

export class Game {
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;

    viewport: Core.Viewport;
    camera: Core.Camera;
    spriteRenderer: Core.SpriteRenderer;
    tileRenderer: Core.TileRenderer;

    constructor(
        canvas: HTMLCanvasElement
    ) {
        this.canvas = canvas;
        if (!this.canvas) throw new Error(`Failed to initialize Game`);
        this.gl = Core.getContext(this.canvas, "webgl2", {
            alpha: false,
            depth: false,
            stencil: false,
            premultipliedAlpha: true,
        });
        this.viewport = new Core.Viewport(this.gl);
        this.camera = new Core.Camera(this.viewport);
        this.spriteRenderer = new Core.SpriteRenderer(this.gl);
        this.tileRenderer = new Core.TileRenderer(this.gl);
    }

    run() {
        const gl = this.gl;
        const spritesheet = new Core.Spritesheet(gl, "assets/sprites/character.json");
        const sprite = new Core.Sprite(spritesheet);

        const speed = 2;
        let rot = 0;
        let pos = new Position(v2(16, 16));
        //let lastPos = [16, 16] as Vector2;
        //let pos = [16, 16] as Vector2;

        let keys: { [x: string]: boolean } = {};

        window.addEventListener("keydown", (evt) => {
            keys[evt.code] = true;
        });
        window.addEventListener("keyup", (evt) => {
            keys[evt.code] = false;
        })

        let vel = v2();
        let lastDirection = 0;
        let lastAnim = "";

        // tilemap state
        const tilemap = new Core.TileMap(this.gl, "assets/maps/grass.json");

        Core.Runtime.start(
            () => {
                vel[0] = 0;
                vel[1] = 0;

                let walk = false;
                let direction = 0;
                if (keys["KeyW"]) { vel[1] += speed; direction |= Direction.Up; walk = true; }
                if (keys["KeyS"]) { vel[1] -= speed; direction |= Direction.Down; walk = true; }
                if (keys["KeyA"]) { vel[0] -= speed; direction |= Direction.Left; walk = true; }
                if (keys["KeyD"]) { vel[0] += speed; direction |= Direction.Right; walk = true; }

                if (walk && (lastDirection != direction)) {
                    lastDirection = direction;
                }

                let anim = `${walk ? "Walk_" : "Idle_"}`;
                if (lastDirection & Direction.Up) anim += "Up";
                else if (lastDirection & Direction.Down) anim += "Down";
                if (lastDirection & Direction.Left) anim += "Left";
                else if (lastDirection & Direction.Right) anim += "Right";

                if (anim != lastAnim) {
                    sprite.animate(anim as any);
                }
                lastAnim = anim;

                pos.update(v2.sub(pos.current, vel));
            },
            (t) => {
                // interpolate positions
                /* let actualPos = v2.clone(pos);
                if (!v2.exactEquals(pos, lastPos)) {
                    actualPos[0] += vel[0] * t;
                    actualPos[1] += vel[1] * t;
                } */

                this.gl.clear(this.gl.COLOR_BUFFER_BIT);

                this.tileRenderer.begin(this.camera);
                tilemap.draw(this.tileRenderer, pos.get(t));
                this.tileRenderer.end();

                this.spriteRenderer.begin(this.camera);
                sprite.draw(this.spriteRenderer, 0, [this.viewport.width / 2, this.viewport.height / 2], Math.rad(rot), [1, 1]);
                this.spriteRenderer.end();
            },
            1000 / 60
        );
    }
}
