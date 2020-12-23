import { Collider, Position, Speed, Velocity } from './Component';
import { ECS, Input } from "core";
import { Sprite, Direction } from "core/gfx";
import { TileMap } from "core/map";
import { aabb_aabb, v2 } from 'core/math';

export function input_update(registry: ECS.Registry, [speed, velocity]: [Speed, Velocity]) {
    let deltaV = speed.value;
    velocity.value[0] = 0;
    velocity.value[1] = 0;

    if (Input.isPressed("ShiftLeft")) deltaV *= 10;
    if (Input.isPressed("KeyW")) velocity.value[1] -= deltaV;
    if (Input.isPressed("KeyS")) velocity.value[1] += deltaV;
    if (Input.isPressed("KeyA")) velocity.value[0] -= deltaV;
    if (Input.isPressed("KeyD")) velocity.value[0] += deltaV;
    if (Math.abs(velocity.value[0]) === Math.abs(velocity.value[1])) {
        velocity.value[0] /= Math.SQRT2;
        velocity.value[1] /= Math.SQRT2;
    }
}

export function physics_update(registry: ECS.Registry) {
    for (const [_, position, velocity] of registry.view(Position, Velocity)) {
        const nextPos = v2(
            position.current[0] + velocity.value[0],
            position.current[1] + velocity.value[1]
        );
        position.update(nextPos);
    }
}

export function collision_update(registry: ECS.Registry, tilemap?: TileMap) {
    for (const [_, position, collider] of registry.view(Position, Collider)) {
        const entityAABB = collider.value;
        const nextPos = position.current;
        entityAABB.moveTo(position.current);
        if (tilemap) {
            for (const layer of tilemap.layers) {
                for (const mapAABB of layer.collidables) {
                    const result = aabb_aabb(entityAABB, mapAABB);
                    if (result) {
                        nextPos[0] += result[0];
                        nextPos[1] += result[1];
                        entityAABB.moveTo(nextPos);
                    }
                }
            }
        }
    }
}

export function animation_update(registry: ECS.Registry) {
    for (const [_, sprite, velocity] of registry.view(Sprite, Velocity)) {
        let direction = 0;
        if (velocity.value[1] < 0) direction |= Direction.Up;
        else if (velocity.value[1] > 0) direction |= Direction.Down;
        if (velocity.value[0] < 0) direction |= Direction.Left;
        else if (velocity.value[0] > 0) direction |= Direction.Right;

        sprite.direction = direction;
        sprite.moving = velocity.value[0] !== 0 || velocity.value[1] !== 0;
        sprite.update();
    }
}