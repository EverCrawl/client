
export function setImmediate(fn: Function) {
    return setTimeout(fn, 0);
}