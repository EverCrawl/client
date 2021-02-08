
const keys: { [name: string]: boolean } = {};
window.addEventListener("keydown", e => (
    keys[e.code] = true,
    console.log(e.code)));
window.addEventListener("keyup", e => (
    keys[e.code] = false,
    console.log(e.code)));

export function isPressed(key: string) {
    return keys[key] ?? false;
}

export function get() {
    return keys;
}