
export * from "./Array";
export * from "./Filter";
export * from "./Immediate";
export * from "./Number";
export * from "./String";

export type Constructor<T> = {
    new(...args: any): T
}

export type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export type InstanceTypeTuple<T extends any[]> = {
    [K in keyof T]: T[K] extends Constructor<infer U> ? U : never;
};