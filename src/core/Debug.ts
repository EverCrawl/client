
import { v2, Vector2, Vector4, AABB } from "core/math";
import { Renderer } from "./gfx";

export function drawBorderAABB(lr: Renderer, offset: Vector2, aabb: AABB, color: Vector4) {
    const top = offset[1] + aabb.top;
    const bottom = offset[1] + aabb.bottom;
    const left = offset[0] + aabb.left;
    const right = offset[0] + aabb.right;
    lr.command.line(
        v2(left, top),
        v2(right, top),
        color
    );
    lr.command.line(
        v2(right, top),
        v2(right, bottom),
        color
    );
    lr.command.line(
        v2(right, bottom),
        v2(left, bottom),
        color
    );
    lr.command.line(
        v2(left, bottom),
        v2(left, top),
        color
    );
}