
const isIterable = <T>(it: any): it is Iterable<T> => it != null && typeof (it[Symbol.iterator]) === "function";

type TypedArraySuffix = "Uint8" | "Uint16" | "Uint32" | "Int8" | "Int16" | "Int32" | "Float32";

export class Packet {
    private static encoder = new TextEncoder();
    private static decoder = new TextDecoder();

    private buffer_: ArrayBuffer;
    private view_: DataView;
    private arrayView_: Uint8Array;
    private cursor_: number;

    constructor(input: number | Iterable<number> | ArrayBuffer = 0) {
        if (typeof input === "number") {
            this.buffer_ = new ArrayBuffer(input);
        } else if (isIterable<number>(input)) {
            this.buffer_ = new Uint8Array(input).buffer;
        } else if (input instanceof ArrayBuffer) {
            this.buffer_ = input.slice(0);
        } else {
            throw new TypeError(`${input} is not a valid size, Iterable, or ArrayBuffer`);
        }
        this.view_ = new DataView(this.buffer_);
        this.arrayView_ = new Uint8Array(this.buffer_);
        this.cursor_ = 0;
    }



    /**
     * @returns {number} previous position
     */
    private advance(by: number): number {
        const old = this.cursor_;
        this.cursor_ += by;
        return old;
    }

    private resize(n: number) {
        if (this.buffer_.byteLength > n) return;
        const old = new Uint8Array(this.buffer_.slice(0));
        this.buffer_ = new ArrayBuffer(n * 2); // allocate a bit more
        new Uint8Array(this.buffer_).set(old);
        this.view_ = new DataView(this.buffer_);
        this.arrayView_ = new Uint8Array(this.buffer_);
    }

    private read(bytes: number, type: TypedArraySuffix, littleEndian = false): number {
        //@ts-ignore no good way to describe this before TS4.1 template literal types
        return (this.view_["get" + type])(this.advance(bytes), littleEndian);
    }

    private write(bytes: number, value: number, type: TypedArraySuffix, littleEndian = false): void {
        this.resize(this.cursor_ + bytes);
        //@ts-ignore no good way to describe this before TS4.1 template literal types
        this.view_["set" + type](this.advance(bytes), value, littleEndian);
    }

    get cursor() { return this.cursor_; }
    set cursor(value) { this.cursor_ = value; }
    get length() { return this.buffer_.byteLength; }

    get u8() { return this.read(1, "Uint8", true); }
    set u8(value) { this.write(1, value, "Uint8", true), value; }
    get u16() { return this.read(2, "Uint16", true); }
    set u16(value) { this.write(2, value, "Uint16", true), value; }
    get u32() { return this.read(4, "Uint32", true); }
    set u32(value) { this.write(4, value, "Uint32", true), value; }
    get i8() { return this.read(1, "Int8", true); }
    set i8(value) { this.write(1, value, "Int8", true), value; }
    get i16() { return this.read(2, "Int16", true); }
    set i16(value) { this.write(2, value, "Int16", true), value; }
    get i32() { return this.read(4, "Int32", true); }
    set i32(value) { this.write(4, value, "Int32", true), value; }
    get str() {
        const len = this.u16;
        const pos = this.advance(len);
        return Packet.decoder.decode(this.arrayView_.slice(pos, pos + len));
    }
    set str(value) {
        this.u16 = value.length;
        this.resize(this.cursor_ + value.length);
        this.arrayView_.set(Packet.encoder.encode(value), this.advance(value.length));
    }

    slice(start: number = 0, end: number = this.buffer_.byteLength): Packet {
        return new Packet(this.buffer_.slice(start, end));
    }

    arrayBuffer(): ArrayBuffer {
        return this.buffer_.slice(0);
    }

    view(start: number = 0, end: number = this.buffer_.byteLength): Uint8Array {
        return new Uint8Array(this.buffer_.slice(start, end));
    }

    [Symbol.iterator](): IterableIterator<number> {
        return this.arrayView_.values();
    }
}
