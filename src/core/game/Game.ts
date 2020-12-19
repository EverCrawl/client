import OverlayContainer from "app/Overlay";
import * as Core from "core";
import { v2, Vector2, Matrix3, m3 } from "core";
import { AABB, v3, v4, Vector4 } from "core/math";
import { Socket } from "core/net";

// high priority:
// TODO: (game server) collisions
// TODO: resource loading callbacks
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
    Up = 1 << 0,
    Down = 1 << 1,
    Left = 1 << 2,
    Right = 1 << 3
};

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

                if (!v2.equals(this.state.pos.current, nextPos)) {
                    const tileX = Math.floor((this.state.pos.current[0] + 16) / 32);
                    const tileY = Math.floor((this.state.pos.current[1] + 16) / 32);
                    const mapPos = v2(this.state.pos.current[0] + tileX * 32, this.state.pos.current[1] + tileY * 32);
                    const currentTile = {
                        top: mapPos[1],
                        bottom: mapPos[1],
                        left: mapPos[0],
                        right: mapPos[0]
                    }

                    for (const layer of this.state.tilemap.layers) {
                        const collisionData = layer.collision;

                        let collided = false;
                        if (nextPos[1] < currentTile.top && (collisionData[tileX]?.[tileY - 1] ?? false)) {
                            console.log("top");
                            nextPos[1] -= this.state.vel[1];
                            collided = true;
                        }
                        if (nextPos[1] > currentTile.bottom && (collisionData[tileX]?.[tileY + 1] ?? false)) {
                            console.log("bottom");
                            nextPos[1] -= this.state.vel[1];
                            collided = true;
                        }
                        if (nextPos[0] < currentTile.left && (collisionData[tileX - 1]?.[tileY] ?? false)) {
                            console.log("left");
                            nextPos[0] -= this.state.vel[0];
                            collided = true;
                        }
                        if (nextPos[0] > currentTile.right && (collisionData[tileX + 1]?.[tileY] ?? false)) {
                            nextPos[0] -= this.state.vel[0];
                            console.log("right");
                            collided = true;
                        }
                        /* if (collided)
                            debugger; */
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
                    const tileX = Math.floor((this.state.pos.current[0] + 16) / 32);
                    const tileY = Math.floor((this.state.pos.current[1] + 16) / 32);

                    let colliding = this.state.tilemap.layers[0]?.collision[tileX]?.[tileY] ?? false;
                    let color = colliding ? v4(0.9, 0.2, 0.3, 1.0) : v4(0.4, 0.2, 0.9, 1.0);

                    const mapPos = v2(tilemapOffset[0] + tileX * 32, tilemapOffset[1] + tileY * 32);
                    const currentTile = {
                        top: mapPos[1] + 16,
                        bottom: mapPos[1] - 16,
                        left: mapPos[0] - 16,
                        right: mapPos[0] + 16
                    }
                    this.lineRenderer.begin(this.camera);
                    this.lineRenderer.draw(
                        v2(currentTile.left, currentTile.top),
                        v2(currentTile.right, currentTile.top),
                        color
                    );
                    this.lineRenderer.draw(
                        v2(currentTile.right, currentTile.top),
                        v2(currentTile.right, currentTile.bottom),
                        color
                    );
                    this.lineRenderer.draw(
                        v2(currentTile.right, currentTile.bottom),
                        v2(currentTile.left, currentTile.bottom),
                        color
                    );
                    this.lineRenderer.draw(
                        v2(currentTile.left, currentTile.bottom),
                        v2(currentTile.left, currentTile.top),
                        color
                    );
                    this.lineRenderer.end();

                    this.pointRenderer.begin(this.camera);
                    this.pointRenderer.draw(mapPos, v3(0.8, 0.3, 0.2));
                    for (const layer of this.state.tilemap.layers) {
                        for (const x of Core.keysOf(layer.collision)) {
                            for (const y of Core.keysOf(layer.collision[x])) {
                                if (layer.collision[x][y]) {
                                    if (tileX === x && tileY === y) {
                                        this.pointRenderer.draw(v2(
                                            tilemapOffset[0] + (x * 32),
                                            tilemapOffset[1] + (y * 32)
                                        ), v3(0.8, 0, 0.2));
                                    } else {
                                        this.pointRenderer.draw(v2(
                                            tilemapOffset[0] + (x * 32),
                                            tilemapOffset[1] + (y * 32)
                                        ), v3(0.8, 0.1, 0.8));
                                    }
                                }
                            }
                        }
                    }
                    this.pointRenderer.end();
                }

                this.spriteRenderer.begin(this.camera);
                sprite.draw(this.spriteRenderer, 0);
                this.spriteRenderer.end();
            },
            1000 / 60
        );
    }
}
