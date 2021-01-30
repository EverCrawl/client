import { ECS } from "core";
import { Sprite, Spritesheet } from "core/gfx";
import { AABB, v2, Vector2 } from "core/math";
import { Collider, Position, Speed, Velocity } from "./Component";

export namespace Player {
    export function create(
        registry: ECS.Registry,
        sprite: string,
        position: Vector2 = v2()
    ) {
        const entity = registry.create();
        // players consist of a Sprite, Collider, Position, Speed and Velocity
        registry.emplace(entity, new Sprite(new Spritesheet(sprite)));
        registry.emplace(entity, new Collider(new AABB(v2(), v2(8, 8))));
        registry.emplace(entity, new Position(position));
        registry.emplace(entity, new Speed(2));
        registry.emplace(entity, new Velocity(v2()));
        return entity;
    }
}