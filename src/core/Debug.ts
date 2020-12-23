
import {
    LineRenderer,
    v2, Vector2, Vector4,
    AABB
} from "core";

export function drawBorderAABB(lr: LineRenderer, offset: Vector2, aabb: AABB, color: Vector4) {
    const top = offset[1] + aabb.top;
    const bottom = offset[1] + aabb.bottom;
    const left = offset[0] + aabb.left;
    const right = offset[0] + aabb.right;
    lr.draw(
        v2(left, top),
        v2(right, top),
        color
    );
    lr.draw(
        v2(right, top),
        v2(right, bottom),
        color
    );
    lr.draw(
        v2(right, bottom),
        v2(left, bottom),
        color
    );
    lr.draw(
        v2(left, bottom),
        v2(left, top),
        color
    );
}