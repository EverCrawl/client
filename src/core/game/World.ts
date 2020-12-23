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

        // TEMP: create some random players in the world
        const range = 8 * 32;
        for (let i = 0; i < 10; ++i) {
            const x = -range + (Math.random() * range);
            const y = -range + (Math.random() * range);
            console.log(x, y);
            Player.create(this.registry, this.gl, "sprites/character.json", v2(x, y));
        }

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

        // world offset is the opposite of the player's position
        // e.g. if we're moving right (+x), the world should move left (-x)
        // to create the illusion of the player moving
        const worldOffset = v2.negate(this.registry.get(this.player, Position)!.get(frameTime));

        if (this.tilemap) {
            renderer.tile.begin(camera);
            this.tilemap.draw(renderer.tile, worldOffset);
            renderer.tile.end();
        }

        renderer.sprite.begin(camera);
        for (const [entity, sprite, position] of this.registry.view(Sprite, Position)) {
            // player is drawn separately after every other sprite
            if (entity === this.player) continue;

            const interpolatedPosition = position.get(frameTime);
            sprite.draw(renderer.sprite, 0, v2(
                worldOffset[0] + interpolatedPosition[0],
                worldOffset[1] + interpolatedPosition[1]
            ));
        }
        const playerSprite = this.registry.get(this.player, Sprite)!;
        playerSprite.draw(renderer.sprite, 0);
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
        // players consist of a Sprite, Collider, Position, Speed and Velocity
        registry.emplace(entity, new Sprite(new Spritesheet(gl, sprite)));
        registry.emplace(entity, new Collider(new AABB(v2(), v2(8, 8))));
        registry.emplace(entity, new Position(position));
        registry.emplace(entity, new Speed(2));
        registry.emplace(entity, new Velocity(v2()));
        return entity;
    }
}