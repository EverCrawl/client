
declare global {
    interface Math {
        EPSILON: number;
        /**
         * Epsilon rounded up to the nearest power of two.
         */
        EPSILONP2: number;
        rad(angle: number): number;
        deg(angle: number): number;
        clamp(num: number, min: number, max: number): number;
        lerp(start: number, end: number, weight: number): number;
        norm(start: number, end: number, value: number): number;
        /**
         * Fast hypotenuse.
         * 
         * Returns the square root of the sum of the squares of its arguments.
         * 
         * Does not handle edge cases such as one or more of the arguments being NaN,
         * or passed as a string.
         */
        fhypot(...n: number[]): number;
        /**
         * Inverse square root.
         */
        rsqrt(n: number): number;
        /**
         * Round number up to the nearest power of 2.
         */
        ceil2(n: number): number;
    }
}

Math.EPSILON = 0.000001;
const _PI_DIV_180 = Math.PI / 180;
const _180_DIV_PI = 180 / Math.PI;
window["Math"]["rad"] = (angle) => angle * _PI_DIV_180;
window["Math"]["deg"] = (angle) => angle * _180_DIV_PI;
window["Math"]["clamp"] = (num, min, max) => num <= min ? min : num >= max ? max : num;
window["Math"]["lerp"] = (start, end, weight) => start * (1 - weight) + end * weight;
window["Math"]["norm"] = (start, end, value) => (value - start) / (end - start);
window["Math"]["fhypot"] = (...n) => {
    let sum = 0;
    for (let i = 0; i < n.length; ++i) {
        sum += n[i] * n[i];
    }
    return Math.sqrt(sum);
}
window["Math"]["rsqrt"] = (n) => 1 / Math.sqrt(n);
window["Math"]["ceil2"] = (n) => Math.pow(2, Math.ceil(Math.log(n) / Math.log(2)));

export { };