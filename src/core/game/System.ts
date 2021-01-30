import { Collider, Position, Speed, Velocity } from './Component';
import { ECS, Input } from "core";
import { Sprite, Direction } from "core/gfx";
import { World } from "core/map";
import { AABB, aabb_aabb, v2 } from 'core/math';
import { Socket } from 'core/net';

export function input([speed, velocity]: [Speed, Velocity]) {
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

export function network(registry: ECS.Registry, socket: Socket) {
    if (!socket.empty) {
        for (const packet of socket.readAll()) {
            console.log(packet);
        }
    }
}

export function physics(registry: ECS.Registry) {
    registry.group(Position, Velocity).each((_, position, velocity) => {
        position.update(v2(
            position.current[0] + velocity.value[0],
            position.current[1] + velocity.value[1]
        ));
    });
}

export function collision([position, collider]: [Position, Collider], world?: World) {
    // TODO: sometimes player gets stuck on wall when moving -y
    if (world == null || !world.ready || world.level == null) return;
    const playerPos = position.current;
    const playerAABB = collider.value;
    const tileAABB = new AABB(v2(), v2(16, 16));

    playerAABB.moveTo(playerPos);
    for (const layer of world.level.layers) {
        if (layer.type === "IntGrid") {
            const left = Math.floor(playerAABB.left / 32);
            const right = Math.ceil(playerAABB.right / 32);
            const top = Math.floor(playerAABB.top / 32);
            const bottom = Math.ceil(playerAABB.bottom / 32);
            for (let x = left; x <= right; ++x) {
                const column = layer.intGrid![x];
                if (column == null) continue;
                for (let y = top; y <= bottom; ++y) {
                    const tile = column[y];
                    if (tile === 1) {
                        const tilePos = v2(x * 32, y * 32);
                        tileAABB.moveTo(tilePos);
                        const result = aabb_aabb(playerAABB, tileAABB);
                        if (result != null) {
                            playerPos[0] += result[0];
                            playerPos[1] += result[1];
                            playerAABB.moveTo(playerPos);
                        }
                    }
                }
            }
        }
    }
}

export function animation(registry: ECS.Registry) {
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