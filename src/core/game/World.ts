import { ECS } from "core";
import { Camera, LineRenderer, PointRenderer, Sprite, SpriteRenderer, Spritesheet, TileRenderer } from "core/gfx";
import { TileMap } from "core/map";
import { AABB, v2, Vector2 } from "core/math";
import { Socket } from "core/net";
import { Collider, Position, Speed, Velocity } from "./Component";
import { animation_update, input_update, collision_update, physics_update, network_update } from "./System";

export class World {
    tilemap?: TileMap;
    registry: ECS.Registry;
    socket: Socket;
    player: ECS.Entity;

    constructor(
        public gl: WebGL2RenderingContext
    ) {
        this.registry = new ECS.Registry();
        this.socket = new Socket("127.0.0.1:8000", "test");
        this.player = Player.create(this.registry, this.gl, "sprites/character.json");

        //@ts-ignore
        window.World = this;
    }

    update() {
        input_update(this.registry, [
            this.registry.get(this.player, Speed)!,
            this.registry.get(this.player, Velocity)!]);
        network_update(this.registry, this.socket);
        physics_update(this.registry);
        collision_update(this.registry, this.tilemap);
        animation_update(this.registry);
    }

    draw(
        renderer: {
            sprite: SpriteRenderer,
            tile: TileRenderer,
            line: LineRenderer,
            point: PointRenderer
        },
        camera: Camera,
        frameTime: number
    ) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // tilemap offset is the opposite of the player's position
        // e.g. if we're moving right (+x), the tilemap should move left (-x)
        // to create the illusion of the same movement
        const tilemapOffset = v2.negate(this.registry.get(this.player, Position)!.get(frameTime));

        if (this.tilemap) {
            renderer.tile.begin(camera);
            this.tilemap.draw(renderer.tile, tilemapOffset);
            renderer.tile.end();
        }

        renderer.sprite.begin(camera);
        for (const [entity, sprite, position] of this.registry.view(Sprite, Position)) {
            // we always want to draw player at [0, 0] (center of viewport)
            if (entity === this.player) {
                sprite.draw(renderer.sprite, 0);
            } else {
                const interpolatedPosition = position.get(frameTime);
                sprite.draw(renderer.sprite, 0, v2(
                    tilemapOffset[0] + interpolatedPosition[0],
                    tilemapOffset[1] + interpolatedPosition[1]
                ));
            }
        }
        renderer.sprite.end();
    }
}

export namespace Player {
    export function create(
        registry: ECS.Registry,
        gl: WebGL2RenderingContext,
        sprite: string,
        position: Vector2 = v2()
    ) {
        const entity = registry.create();
        // add Sprite, Collider, Position, Speed, Velocity
        registry.emplace(entity, new Sprite(new Spritesheet(gl, sprite)));
        registry.emplace(entity, new Collider(new AABB(v2(), v2(8, 8))));
        registry.emplace(entity, new Position());
        registry.emplace(entity, new Speed(2));
        registry.emplace(entity, new Velocity(v2()));
        return entity;
    }
}