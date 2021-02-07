import { AABB, aabb_aabb, Interpolated, v2, Vector2 } from "core/math";

export class Value<T> {
    constructor(public value: T) { }
}

/* export class Position extends Interpolated<Vector2> {
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
} */

type CollisionState =
    | "air"
    | "ground"
    | "ladder"

export class RigidBody {
    position: Interpolated<Vector2>
    velocity: Vector2
    speed: number
    jumpSpeed: number
    ladderSpeed: number
    cstate: CollisionState

    constructor(
        pos: Vector2,
        speed: number = 2,
        jumpSpeed: number = 5,
        ladderSpeed: number = 1.5
    ) {
        this.position = new Interpolated<Vector2>(pos, v2.lerp);
        this.velocity = v2();
        this.speed = speed;
        this.jumpSpeed = jumpSpeed;
        this.ladderSpeed = ladderSpeed;
        this.cstate = "ground";
    }
}