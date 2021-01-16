import OverlayContainer from "app/Overlay";
import { Runtime } from "core";
import { World } from "core/game";
import { TileMap } from "core/map";
import { InitGL, Viewport, Camera, Renderer } from "core/gfx";

/*
high priority:
TODO: swept AABB
TODO: particle system
TODO: soft shadow under entities
TODO: animated tiles
TODO: UI
TODO: loading screen
TODO: (game server) DB access
TODO: (game server) collisions
TODO(?): node.js auth/social server
TODO: (auth + game servers) authentication with DB
TODO: (both) basic gameplay
     - move, attack (slash), attack (dash), attack (spell)
TODO: client-side (player-only) prediction + reconciliation
TODO: playtest deployment
*/

export class Game {
    overlay: OverlayContainer;
    canvas: HTMLCanvasElement;

    camera: Camera;
    renderer: Renderer;

    world: World;

    constructor(
        canvas: HTMLCanvasElement,
        overlay: OverlayContainer
    ) {
        this.overlay = overlay;
        this.canvas = canvas;
        InitGL(this.canvas, {
            alpha: false,
            depth: false,
            stencil: false,
            premultipliedAlpha: true,
        });
        this.camera = new Camera(new Viewport());
        this.renderer = new Renderer();

        this.world = new World();
        // TEMP
        this.world.tilemap = new TileMap("assets/maps/template.tmx");

        //@ts-ignore
        window.Game = this;
    }

    run() {
        Runtime.start(
            () => this.world.update(),
            (frameTime) => this.world.draw(this.renderer, this.camera, frameTime),
            1000 / 60
        );
    }
}
