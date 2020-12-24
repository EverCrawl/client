import { Collider, Position, Speed, Velocity } from './Component';
import { ECS, Input } from "core";
import { Sprite, Direction } from "core/gfx";
import { TileMap } from "core/map";
import { aabb_aabb, v2 } from 'core/math';
import { Socket } from 'core/net';

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

export function network_update(registry: ECS.Registry, socket: Socket) {
    if (!socket.empty) {
        for (const packet of socket.readAll()) {
            console.log(packet);
        }
    }
}

const physics_view = ECS.Preprocessor.generateView(Position, Velocity);
export function physics_update(registry: ECS.Registry) {
    physics_view(registry, (_, position, velocity) => {
        position.update(v2(
            position.current[0] + velocity.value[0],
            position.current[1] + velocity.value[1]
        ));
    });
}

const collision_view = ECS.Preprocessor.generateView(Position, Collider);
export function collision_update(registry: ECS.Registry, tilemap?: TileMap) {
    collision_view(registry, (_, position, collider) => {
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
    });
}

const animation_view = ECS.Preprocessor.generateView(Sprite, Velocity);
export function animation_update(registry: ECS.Registry) {
    animation_view(registry, (_, sprite, velocity) => {
        let direction = 0;
        if (velocity.value[1] < 0) direction |= Direction.Up;
        else if (velocity.value[1] > 0) direction |= Direction.Down;
        if (velocity.value[0] < 0) direction |= Direction.Left;
        else if (velocity.value[0] > 0) direction |= Direction.Right;

        sprite.direction = direction;
        sprite.moving = velocity.value[0] !== 0 || velocity.value[1] !== 0;
        sprite.update();
    });
}