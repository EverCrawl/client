import * as Core from "core";
import { v2, Vector2, Matrix3, m3 } from "core";

// high priority:
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

class Position extends Core.State<Vector2> {
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

    state!: {
        tilemap: Core.TileMap,
        spritesheet: Core.Spritesheet,
        sprite: Core.Sprite,

        speed: number,
        pos: Position,
        vel: Vector2,
        lastDirection: number,
        lastAnim: string,
        keys: { [key: string]: boolean },

    }

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

        //@ts-ignore temporary
        this.state = {};

        //@ts-ignore
        window.Game = this;
    }

    run() {
        const gl = this.gl;
        const spritesheet = new Core.Spritesheet(gl, "assets/sprites/character.json");
        const sprite = new Core.Sprite(spritesheet);

        const speed = 2;
        this.state.pos = new Position(v2(0, 0));
        this.state.vel = v2();
        this.state.lastDirection = 0;
        this.state.lastAnim = "";

        this.state.keys = {};
        window.addEventListener("keydown", e => this.state.keys[e.code] = true);
        window.addEventListener("keyup", e => this.state.keys[e.code] = false)

        this.state.tilemap = new Core.TileMap(this.gl, "assets/maps/grass.json");

        Core.Runtime.start(
            () => {
                this.state.vel[0] = 0;
                this.state.vel[1] = 0;

                let walk = false;
                let direction = 0;
                if (this.state.keys["KeyW"]) { this.state.vel[1] += speed; direction |= Direction.Up; walk = true; }
                if (this.state.keys["KeyS"]) { this.state.vel[1] -= speed; direction |= Direction.Down; walk = true; }
                if (this.state.keys["KeyA"]) { this.state.vel[0] -= speed; direction |= Direction.Left; walk = true; }
                if (this.state.keys["KeyD"]) { this.state.vel[0] += speed; direction |= Direction.Right; walk = true; }

                if (walk && (this.state.lastDirection != direction)) {
                    this.state.lastDirection = direction;
                }

                let anim = `${walk ? "Walk_" : "Idle_"}`;
                if (this.state.lastDirection & Direction.Up) anim += "Up";
                else if (this.state.lastDirection & Direction.Down) anim += "Down";
                if (this.state.lastDirection & Direction.Left) anim += "Left";
                else if (this.state.lastDirection & Direction.Right) anim += "Right";

                if (anim != this.state.lastAnim) {
                    sprite.animate(anim as any);
                }
                this.state.lastAnim = anim;

                if (Math.abs(this.state.vel[0]) === Math.abs(this.state.vel[1])) {
                    this.state.vel[0] /= Math.SQRT2;
                    this.state.vel[1] /= Math.SQRT2;
                }
                this.state.pos.update(v2.add(this.state.pos.current, this.state.vel));
            },
            (t) => {
                this.gl.clear(this.gl.COLOR_BUFFER_BIT);

                this.tileRenderer.begin(this.camera);
                this.state.tilemap.draw(this.tileRenderer, v2.negate(this.state.pos.get(t)));
                this.tileRenderer.end();

                this.spriteRenderer.begin(this.camera);
                sprite.draw(this.spriteRenderer, 0/* , [this.viewport.width / 2, this.viewport.height / 2] */);
                this.spriteRenderer.end();
            },
            1000 / 60
        );
    }
}
