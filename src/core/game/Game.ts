import OverlayContainer from "app/Overlay";
import * as Core from "core";
import { v2, Vector2, Matrix3, m3, World } from "core";
import { LineRenderer, PointRenderer } from "core/gfx";
import { AABB, aabb_aabb, v3, v4, Vector3, Vector4 } from "core/math";
import { Socket } from "core/net";

/*
high priority:
TODO: global GL
TODO: join renderers into just one
    - they all share the same GL state
    - rendering passes are already hardcoded,
      this will just make the renderer easier
      to use
TODO: swept AABB
TODO: (game server) collisions
TODO: loading screen
TODO(?): node.js auth/social server
TODO: (game server) DB access
TODO: (auth + game servers) authentication with DB
TODO: (both) basic gameplay
     - move, attack (slash), attack (dash), attack (spell)
TODO: client-side (player-only) prediction + reconciliation
TODO: playtest deployment
*/

export class Game {
    overlay: OverlayContainer;
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;

    viewport: Core.Viewport;
    camera: Core.Camera;
    renderer: {
        sprite: Core.SpriteRenderer
        tile: Core.TileRenderer
        line: Core.LineRenderer
        point: Core.PointRenderer
    }

    world: World;

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
        this.renderer = {
            sprite: new Core.SpriteRenderer(this.gl),
            tile: new Core.TileRenderer(this.gl),
            line: new Core.LineRenderer(this.gl),
            point: new Core.PointRenderer(this.gl)
        };

        this.world = new World(this.gl);
        // TEMP
        this.world.tilemap = new Core.TileMap(this.gl, "maps/template.tmx");

        //@ts-ignore
        window.Game = this;
    }

    run() {
        Core.Runtime.start(
            () => this.world.update(),
            (frameTime) => this.world.draw(this.renderer, this.camera, frameTime),
            1000 / 60
        );
    }
}
