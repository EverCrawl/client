
export type Vector3 = [number, number, number];

export interface v3 {
    (x?: number, y?: number, z?: number): Vector3;
}
export function v3(x = 0, y = 0, z = 0): Vector3 {
    return [x, y, z];
}

// @ts-ignore
window.v3 = v3;
