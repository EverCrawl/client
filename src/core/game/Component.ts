import { AABB, aabb_aabb, Interpolated, v2, Vector2 } from "core/math";

export class Value<T> {
    constructor(public value: T) { }
}

export class Position extends Interpolated<Vector2> {
    constructor(initial: Vector2 = v2()) {
        super(initial, v2.lerp);
    }
}

export class Velocity extends Value<Vector2> { }
export class Speed extends Value<number> { }
export class Collider extends Value<AABB> {
    clone() {
        return new Collider(new AABB(v2.clone(this.value.center), v2.clone(this.value.half)))
    }
}