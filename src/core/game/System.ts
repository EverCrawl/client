import { Collider, Position, Speed, Velocity } from './Component';
import { ECS, Input } from "core";
import { Sprite, Direction } from "core/gfx";
import { TileMap } from "core/map";
import { AABB, aabb_aabb, v2 } from 'core/math';
import { Socket } from 'core/net';

export function input_update([speed, velocity]: [Speed, Velocity]) {
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

export function physics_update(registry: ECS.Registry) {
    registry.group(Position, Velocity).each((_, position, velocity) => {
        position.update(v2(
            position.current[0] + velocity.value[0],
            position.current[1] + velocity.value[1]
        ));
    });
}

export function collision_update([position, collider]: [Position, Collider], tilemap?: TileMap) {
    // TODO: sometimes player gets stuck on wall when moving -y
    if (tilemap == null || !tilemap.ready) return;
    const playerPos = position.current;
    const playerAABB = collider.value;
    const tileAABB = new AABB(v2(), v2(16, 16));

    playerAABB.moveTo(playerPos);
    const left = Math.floor(playerAABB.left / 32);
    const right = Math.floor(playerAABB.right / 32);
    const top = Math.floor(playerAABB.top / 32);
    const bottom = Math.floor(playerAABB.bottom / 32);
    for (const layer of tilemap.layers) {
        for (let x = left; x <= right; ++x) {
            for (let y = top; y <= bottom; ++y) {
                const tile = layer.tiles[x]?.[y];
                if (tile != null && tile.properties != null && tile.properties.collision != null && tile.properties.collision.value) {
                    // collides
                    const tilePos = v2(x * 32 + 16, y * 32 + 16);
                    tileAABB.moveTo(tilePos);
                    const result = aabb_aabb(playerAABB, tileAABB);
                    if (result != null) {
                        // collided
                        playerPos[0] += result[0];
                        playerPos[1] += result[1];
                        playerAABB.moveTo(playerPos);
                    }
                }
                // does not collide
            }
        }
    }
}

export function animation_update(registry: ECS.Registry) {
    registry.group(Sprite, Velocity).each((_, sprite, velocity) => {
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