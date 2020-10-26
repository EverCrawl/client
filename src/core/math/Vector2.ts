import { Matrix3 } from "./Matrix3";

export type Vector2 = [number, number];

export interface v2 {
    (x?: number, y?: number): Vector2;
    clone(vec: Vector2): Vector2;
    add(a: Vector2, b: Vector2): Vector2;
    sub(a: Vector2, b: Vector2): Vector2;
    mult(a: Vector2, b: Vector2): Vector2;
    div(a: Vector2, b: Vector2): Vector2;
    min(a: Vector2, b: Vector2): Vector2;
    max(a: Vector2, b: Vector2): Vector2;
    ceil(vec: Vector2): Vector2;
    floor(vec: Vector2): Vector2;
    round(vec: Vector2): Vector2;
    scale(vec: Vector2, value: number): Vector2;
    dist(a: Vector2, b: Vector2): number;
    dist2(a: Vector2, b: Vector2): number;
    len(vec: Vector2): number;
    len2(vec: Vector2): number;
    clamp(a: Vector2, b: Vector2): Vector2;
    negate(vec: Vector2): Vector2;
    inverse(vec: Vector2): Vector2;
    norm(vec: Vector2): Vector2;
    dot(a: Vector2, b: Vector2): number;
    cross(a: Vector2, b: Vector2): [number, number, number];
    lerp(a: Vector2, b: Vector2, t: number): Vector2;
    multMat3(vec: Vector2, mat: Matrix3): Vector2;
    rotate(vec: Vector2, o: Vector2, rad: number): Vector2;
    angle(a: Vector2, b: Vector2): number;
    zero(vec: Vector2): Vector2;
    equals(a: Vector2, b: Vector2, epsilon?: number): boolean;
    exactEquals(a: Vector2, b: Vector2): boolean;
}
export function v2(x = 0, y = 0): Vector2 {
    return [x, y];
}
v2.clone = function (vec: Vector2): Vector2 {
    return [vec[0], vec[1]];
}
v2.add = function (a: Vector2, b: Vector2): Vector2 {
    a[0] += b[0];
    a[1] += b[1];
    return a;
}
v2.sub = function (a: Vector2, b: Vector2): Vector2 {
    a[0] -= b[0];
    a[1] -= b[1];
    return a;
}
v2.mult = function (a: Vector2, b: Vector2): Vector2 {
    a[0] *= b[0];
    a[1] *= b[1];
    return a;
}
v2.div = function (a: Vector2, b: Vector2): Vector2 {
    a[0] /= b[0];
    a[1] /= b[1];
    return a;
}
v2.min = function (a: Vector2, b: Vector2): Vector2 {
    a[0] = Math.min(a[0], b[0]);
    a[1] = Math.min(a[1], b[1]);
    return a;
}
v2.max = function (a: Vector2, b: Vector2): Vector2 {
    a[0] = Math.max(a[0], b[0]);
    a[1] = Math.max(a[1], b[1]);
    return a;
}
v2.ceil = function (vec: Vector2): Vector2 {
    vec[0] = Math.ceil(vec[0]);
    vec[1] = Math.ceil(vec[1]);
    return vec;
}
v2.floor = function (vec: Vector2): Vector2 {
    vec[0] = Math.floor(vec[0]);
    vec[1] = Math.floor(vec[1]);
    return vec;
}
v2.round = function (vec: Vector2): Vector2 {
    vec[0] = Math.round(vec[0]);
    vec[1] = Math.round(vec[1]);
    return vec;
}
v2.scale = function (vec: Vector2, value: number): Vector2 {
    vec[0] *= value;
    vec[1] *= value;
    return vec;
}
v2.dist = function (a: Vector2, b: Vector2): number {
    return Math.fhypot(b[0] - a[0], b[1] - a[1]);
}
v2.dist2 = function (a: Vector2, b: Vector2): number {
    return (b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]);
}
v2.len = function (vec: Vector2): number {
    return Math.fhypot(vec[0], vec[1]);
}
v2.len2 = function (vec: Vector2): number {
    return vec[0] * vec[0] + vec[1] * vec[1];
}
v2.negate = function (vec: Vector2): Vector2 {
    vec[0] = -vec[0];
    vec[1] = -vec[1];
    return vec;
}
v2.inverse = function (vec: Vector2): Vector2 {
    vec[0] = 1 / vec[0];
    vec[1] = 1 / vec[1];
    return vec;
}
v2.norm = function (vec: Vector2): Vector2 {
    let len = vec[0] * vec[0] + vec[1] * vec[1];
    if (len > 0) {
        len = 1 / Math.sqrt(len);
    }
    vec[0] *= len;
    vec[1] *= len;
    return vec;
}
v2.dot = function (a: Vector2, b: Vector2): number {
    return a[0] * b[0] + a[1] * b[1];
}
v2.cross = function (a: Vector2, b: Vector2): [number, number, number] {
    const z = a[0] * b[1] - a[1] * b[0];
    return [0, 0, z];
}
v2.lerp = function (a: Vector2, b: Vector2, t: number): Vector2 {
    return [
        a[0] + t * (b[0] - a[0]),
        a[1] + t * (b[1] - a[1])
    ];
}
v2.multMat3 = function (vec: Vector2, mat: Matrix3): Vector2 {
    vec[0] = mat[0] * vec[0] + mat[3] * vec[1] + mat[6];
    vec[0] = mat[1] * vec[0] + mat[4] * vec[1] + mat[7];
    return vec;
}
v2.minc = function (a: Vector2, b: Vector2): Vector2 {
    return [
        Math.min(a[0], b[0]),
        Math.min(a[1], b[1])
    ];
}
v2.maxc = function (a: Vector2, b: Vector2): Vector2 {
    return [
        Math.max(a[0], b[0]),
        Math.max(a[1], b[1])
    ];
}
v2.clampc = function (vec: Vector2, min: Vector2, max: Vector2): Vector2 {
    return v2.minc(v2.maxc(vec, [min[0], min[1]]), [max[0], max[1]]);
}
v2.rotate = function (vec: Vector2, o: Vector2, rad: number): Vector2 {
    let p0 = vec[0] - o[0],
        p1 = vec[1] - o[1],
        sinC = Math.sin(rad),
        cosC = Math.cos(rad);
    vec[0] = p0 * cosC - p1 * sinC + o[0];
    vec[1] = p0 * sinC + p1 * cosC + o[1];
    return vec;
}
v2.perp = function (vec: Vector2): Vector2 {
    return [vec[1], -vec[0]];
}
v2.angle = function (a: Vector2, b: Vector2): number {
    let mag = Math.sqrt(a[0] * a[0] + a[1] * a[1]) * Math.sqrt(b[0] * b[0] + b[1] * b[1]),
        cosine = mag && (a[0] * b[0] + a[1] * b[1]) / mag;
    return Math.acos(Math.min(Math.max(cosine, -1), 1));
}
v2.zero = function (vec: Vector2): Vector2 {
    vec[0] = 0;
    vec[1] = 0;
    return vec;
}
v2.equals = function (a: Vector2, b: Vector2, epsilon: number = Math.EPSILON): boolean {
    return (
        Math.abs(a[0] - b[0]) < epsilon &&
        Math.abs(a[1] - b[1]) < epsilon
    );
}
v2.exactEquals = function (a: Vector2, b: Vector2): boolean {
    return (
        a[0] === b[0] &&
        a[1] === b[1]
    );
}

// @ts-ignore
window.v2 = v2;


