
export * from "./Array";
export * from "./Filter";
export * from "./Immediate";
export * from "./Number";
export * from "./Object";
export * from "./String";

export type Constructor<T> = {
    new(...args: any): T
}

export type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export type InstanceTypeTuple<T extends any[]> = {
    [K in keyof T]: T[K] extends Constructor<infer U> ? U : never;
};

export type Friend<T, Expose> = {
    [K in keyof T]: K extends keyof Expose ? never : T[K];
} & Expose;

export function parseBool(value: string): boolean | null {
    switch (value.toLowerCase()) {
        case "false": return false;
        case "true": return true;
        default: return null;
    }
}