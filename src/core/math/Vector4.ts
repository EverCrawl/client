
export type Vector4 = [number, number, number, number];

export interface v4 {
    (x?: number, y?: number, z?: number, w?: number): Vector4;
}
export function v4(x = 0, y = 0, z = 0, w: number = 0): Vector4 {
    return [x, y, z, w];
}

// @ts-ignore
window.v4 = v4;
