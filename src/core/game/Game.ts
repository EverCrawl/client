import OverlayContainer from "app/Overlay";
import { ECS, Runtime, Socket } from "core";
import { InitGL, Viewport, Camera, Renderer, Sprite } from "core/gfx";
import * as System from "./System";
import * as Entity from "./Entity";
import { AABB, v2, v4 } from "core/math";
import { Position, Velocity, Speed, Collider } from "./Component";
import { World } from "core/map/World";
import { drawBorderAABB } from "core/Debug";

/*
TODO: (client) memory usage/leak audit
    - caching should have some limit
    - when loading assets, ensure that only the required information is kept around
    - break references by cloning via JSON.stringify and JSON.parse, allow GC to drop
TODO: (client + server) swept AABB
TODO: (client) particle system
TODO: (client) soft shadow under entities
TODO: (client) animated tiles
    - turn tile layers into chunked images
TODO: (client) UI
TODO: (client) loading screen
TODO: (server) collisions
TODO: (server) authentication with DB
TODO: (client + server) TLS for transport
TODO: (client + server) basic gameplay
     - move, attack (slash), attack (dash), attack (spell)
TODO: (client) prediction + reconciliation
TODO: playtest deployment
*/

export class Game {
    overlay: OverlayContainer;
    canvas: HTMLCanvasElement;

    camera: Camera;
    renderer: Renderer;

    world?: World;
    registry: ECS.Registry;
    socket: Socket;
    player: ECS.Entity;

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
        this.registry = new ECS.Registry();
        this.socket = new Socket("127.0.0.1:9002", "test", 1000);

        // TEMP
        /* this.tilemap = new TileMap("assets/maps/template.tmx"); */
        this.world = new World("assets/lmaps/test.ldtk");

        // TEMP
        this.player = Entity.Player.create(this.registry,
            "assets/sprites/character.json",
            v2(16 * 32, 16 * 32));

        //@ts-ignore
        window.Game = this;
    }

    run() {
        Runtime.start(
            () => this.update(),
            (frameTime) => this.draw(this.renderer, this.camera, frameTime),
            1000 / 60
        );
    }

    update() {
        System.input([
            this.registry.get(this.player, Speed)!,
            this.registry.get<Velocity>(this.player, Velocity)!
        ]);
        System.network(this.registry, this.socket);
        System.physics(this.registry);
        System.collision([
            this.registry.get(this.player, Position)!,
            this.registry.get(this.player, Collider)!
        ], this.world);
        System.animation(this.registry);
    }

    draw(
        renderer: Renderer,
        camera: Camera,
        frameTime: number
    ) {
        renderer.camera = camera;
        // world offset is the opposite of the player's position
        // e.g. if we're moving right (+x), the world should move left (-x)
        // to create the illusion of the player moving
        const worldOffset = v2.negate(this.registry.get(this.player, Position)!.get(frameTime));

        /* if (this.tilemap) {
            this.tilemap.draw(renderer, worldOffset);
        } */
        if (this.world) {
            // TEMP
            this.world.setLevel("Level");
            this.world.render(renderer, worldOffset);
        }

        // draw all sprites except for player
        this.registry.group(Sprite, Position).each((entity, sprite, position) => {
            if (entity === this.player) return;

            const interpolatedPosition = position.get(frameTime);
            sprite.draw(renderer, 0, v2(
                worldOffset[0] + interpolatedPosition[0],
                worldOffset[1] + interpolatedPosition[1]
            ));
        });

        // draw player
        this.registry.get(this.player, Sprite)!
            .draw(renderer, 0);
        // draw player AABB
        drawBorderAABB(renderer,
            v2(),
            new AABB(v2(), v2(8, 8)),
            v4(1.0, 0.5, 1.0, 1.0));

        renderer.flush();
    }
}
