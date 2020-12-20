import OverlayContainer from "app/Overlay";
import * as Core from "core";
import { v2, Vector2, Matrix3, m3 } from "core";
import { LineRenderer, PointRenderer } from "core/gfx";
import { AABB, aabb_aabb, v3, v4, Vector3, Vector4 } from "core/math";
import { Socket } from "core/net";

/*
high priority:
TODO: refactoring!
    * cache spritesheet, texture, tilemap loads
        - ctrl+f "fetch" and cache it!
    * everything from the main loop:
        - entity
            local player holds input, animation, sprite, position
            remote entities hold any combination of:
                animation,
                sprite,
                position,
                and other components....
            world holds local player and remote entities
            -> input_update(world)
                - turn raw inputs into actions (move_left, move_right, skill#12, etc)
                - store it in world.action_buffer
            -> network_update(world)
                - (?) handle_all(world.socket.packets)
            -> physics_update(world)
                - reconciliation:
                    - check for errors in previous prediction
                    - resimulate if necessary
                - update entities' position/velocity
            -> animation_update(world)
                - update player animation based on input
                - update entity animation based on physics state
TODO: swept AABB
TODO: (game server) collisions
TODO: resource loading callbacks
TODO(?): node.js auth server
TODO: (game server) DB access
TODO: (auth + game servers) authentication with DB
TODO: (both) basic gameplay
     - move, attack (slash), attack (dash), attack (spell)
TODO: client-side prediction
TODO: playtest deployment

low priority:
TODO: unify renderer architecture 
    Renderer base class, subclass to create new renderers
*/

class Position extends Core.State<Vector2> {
    constructor(initial: Vector2) {
        super(initial, v2.lerp);
    }
}

const enum Direction {
    Up = 1 << 0,
    Down = 1 << 1,
    Left = 1 << 2,
    Right = 1 << 3
};

// TEMP
function drawBorderAABB(lr: LineRenderer, offset: Vector2, aabb: AABB, color: Vector4) {
    const top = offset[1] + aabb.top;
    const bottom = offset[1] + aabb.bottom;
    const left = offset[0] + aabb.left;
    const right = offset[0] + aabb.right;
    lr.draw(
        v2(left, top),
        v2(right, top),
        color
    );
    lr.draw(
        v2(right, top),
        v2(right, bottom),
        color
    );
    lr.draw(
        v2(right, bottom),
        v2(left, bottom),
        color
    );
    lr.draw(
        v2(left, bottom),
        v2(left, top),
        color
    );
}

export class Game {
    overlay: OverlayContainer;
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;

    viewport: Core.Viewport;
    camera: Core.Camera;
    spriteRenderer: Core.SpriteRenderer;
    tileRenderer: Core.TileRenderer;
    lineRenderer: Core.LineRenderer;
    pointRenderer: Core.PointRenderer;

    state!: {
        tilemap: Core.TileMap,
        spritesheet: Core.Spritesheet,
        sprite: Core.Sprite,

        speed: number,
        pAABB: AABB,
        pos: Position,
        vel: Vector2,
        lastDirection: number,
        lastAnim: string,
        keys: { [key: string]: boolean },
    }

    socket: Socket;

    constructor(
        canvas: HTMLCanvasElement,
        overlay: OverlayContainer
    ) {
        this.overlay = overlay;
        this.canvas = canvas;
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
        this.lineRenderer = new Core.LineRenderer(this.gl);
        this.pointRenderer = new Core.PointRenderer(this.gl);

        this.socket = new Core.Socket("127.0.0.1:8000", "test");

        //@ts-ignore temporary
        this.state = {};

        // input state
        this.state.keys = {};
        window.addEventListener("keydown", e => this.state.keys[e.code] = true);
        window.addEventListener("keyup", e => this.state.keys[e.code] = false);


        //@ts-ignore
        window.Game = this;
    }

    run() {
        const gl = this.gl;

        // player state
        // TODO: move this into components
        // sprite
        const spritesheet = new Core.Spritesheet(gl, "sprites/character.json");
        const sprite = new Core.Sprite(spritesheet);
        // "physics"
        const speed = 2;
        this.state.pos = new Position(v2(0, 2 * 32));
        this.state.pAABB = new AABB(v2.clone(this.state.pos.current), v2(8, 8));
        this.state.vel = v2();
        // animation
        this.state.lastDirection = 0;
        this.state.lastAnim = "";

        // tilemap state
        this.state.tilemap = new Core.TileMap(this.gl, "maps/template.tmx");

        Core.Runtime.start(
            () => {
                // state reset
                let deltaV = speed;
                this.state.vel[0] = 0;
                this.state.vel[1] = 0;

                // input check
                if (this.state.keys["ShiftLeft"]) deltaV *= 10;
                if (this.state.keys["KeyW"]) this.state.vel[1] -= deltaV;
                if (this.state.keys["KeyS"]) this.state.vel[1] += deltaV;
                if (this.state.keys["KeyA"]) this.state.vel[0] -= deltaV;
                if (this.state.keys["KeyD"]) this.state.vel[0] += deltaV;

                // server packets
                // TODO: send inputs here
                if (!this.socket.empty) {
                    for (const packet of this.socket.readAll()) {
                        console.log(packet);
                    }
                }

                // physics update
                if (Math.abs(this.state.vel[0]) === Math.abs(this.state.vel[1])) {
                    this.state.vel[0] /= Math.SQRT2;
                    this.state.vel[1] /= Math.SQRT2;
                }

                const nextPos = v2(
                    this.state.pos.current[0] + this.state.vel[0],
                    this.state.pos.current[1] + this.state.vel[1]
                );
                this.state.pAABB.moveTo(nextPos);
                for (const layer of this.state.tilemap.layers) {
                    for (const aabb of layer.collidables) {
                        const result = aabb_aabb(this.state.pAABB, aabb);
                        if (result) {
                            nextPos[0] += result[0];
                            nextPos[1] += result[1];
                            this.state.pAABB.moveTo(nextPos);
                        }
                    }
                }
                this.state.pos.update(nextPos);

                // animation update
                let direction = 0;
                if (this.state.vel[1] < 0) direction |= Direction.Up;
                if (this.state.vel[1] > 0) direction |= Direction.Down;
                if (this.state.vel[0] < 0) direction |= Direction.Left;
                if (this.state.vel[0] > 0) direction |= Direction.Right;
                let walk = this.state.vel[0] !== 0 || this.state.vel[1] !== 0;
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
            },
            (t) => {
                this.gl.clear(this.gl.COLOR_BUFFER_BIT);

                const tilemapOffset = v2.negate(this.state.pos.get(t));

                this.tileRenderer.begin(this.camera);
                this.state.tilemap.draw(this.tileRenderer, tilemapOffset);
                this.tileRenderer.end();

                if (DEBUG) {
                    this.lineRenderer.begin(this.camera);
                    for (const layer of this.state.tilemap.layers) {
                        for (const aabb of layer.collidables) {
                            drawBorderAABB(this.lineRenderer,
                                tilemapOffset,
                                aabb,
                                v4(0.9, 0.7, 0.4, 1.0));
                        }
                    }
                    this.state.pAABB.moveTo(this.state.pos.current);
                    let collision = false;
                    for (const layer of this.state.tilemap.layers) {
                        for (const aabb of layer.collidables) {
                            const result = aabb_aabb(this.state.pAABB, aabb);
                            if (result) {
                                collision = true;
                                break;
                            }
                        }
                        if (collision) break;
                    }
                    if (collision) {
                        drawBorderAABB(this.lineRenderer,
                            v2(0, 0),
                            new AABB(v2(), v2(8, 8)),
                            v4(0.9, 0.1, 0.6, 1.0));
                    } else {
                        drawBorderAABB(this.lineRenderer,
                            v2(0, 0),
                            new AABB(v2(), v2(8, 8)),
                            v4(0.9, 0.5, 0.6, 1.0));
                    }
                    this.lineRenderer.end();
                }

                this.spriteRenderer.begin(this.camera);
                sprite.draw(this.spriteRenderer, 0);
                this.spriteRenderer.end();
            },
            1000 / 60
        );
    }
}
