
/** TODO: dynamic buffer */

import { createBuffer } from "./Common";
import { ErrorKind, GLError } from "./Error";

interface TypedArrayInfo {
    type: number;
    typeName: string;
    elementSize: number;
}

function getTypedArrayInfo(array: ArrayBufferView | ArrayBuffer): TypedArrayInfo {
    switch (true) {
        case array instanceof ArrayBuffer: return { type: 0x1400, typeName: "Byte", elementSize: 1 };
        case array instanceof Uint8Array: return { type: 0x1405, typeName: "Uint8", elementSize: 1 };
        case array instanceof Uint16Array: return { type: 0x1405, typeName: "Uint16", elementSize: 2 };
        case array instanceof Uint32Array: return { type: 0x1405, typeName: "Uint32", elementSize: 4 };
        case array instanceof Int8Array: return { type: 0x1404, typeName: "Int8", elementSize: 1 };
        case array instanceof Int16Array: return { type: 0x1404, typeName: "Int16", elementSize: 2 };
        case array instanceof Int32Array: return { type: 0x1404, typeName: "Int32", elementSize: 4 };
        case array instanceof Float32Array: return { type: 0x1406, typeName: "Float32", elementSize: 4 };
        default: throw new GLError(ErrorKind.UnknownArrayType, { type: array.constructor.name.slice(0, array.constructor.name.length - "Array".length) });
    }
}

export type StaticBuffer = Buffer<"static">;
export type DynamicBuffer = Buffer<"dynamic">;

export class Buffer<Type extends "static" | "dynamic"> {

    private byteLength_: number;
    private info_: TypedArrayInfo | undefined;

    private constructor(
        public readonly gl: WebGL2RenderingContext,
        public readonly handle: WebGLBuffer,
        public readonly target: GLenum,
        public readonly usage: GLenum,
        byteLength: number,
        info: Type extends "static" ? TypedArrayInfo : TypedArrayInfo | undefined
    ) {
        this.byteLength_ = byteLength;
        this.info_ = info;
    }

    get byteLength() { return this.byteLength_; }
    /** undefined in case the buffer is empty */
    get elementType() { return this.info_?.type; }
    /** undefined in case the buffer is empty */
    get elementSize() { return this.info_?.elementSize; }
    /** undefined in case the buffer is empty */
    get elementTypeName() { return this.info_?.typeName; }

    bind() {
        this.gl.bindBuffer(this.target, this.handle);
    }

    unbind() {
        this.gl.bindBuffer(this.target, null);
    }

    upload(data: ArrayBufferView | ArrayBuffer, dstOffset = -1) {
        if (DEBUG && this.usage === this.gl.STATIC_DRAW)
            throw new Error(`Attempted to overwrite static buffer`);

        this.info_ = getTypedArrayInfo(data);

        this.bind();
        if (dstOffset === -1) {
            this.gl.bufferData(this.target, data, this.usage);
        } else {
            if (DEBUG && this.byteLength_ < dstOffset + data.byteLength)
                throw new Error(`Buffer overflow: ${dstOffset + data.byteLength}/${this.byteLength_}`);
            this.gl.bufferSubData(this.target, dstOffset, data);
        }
        this.unbind();
    }

    static static(
        gl: WebGL2RenderingContext,
        data: ArrayBufferView | ArrayBuffer,
        target: GLenum
    ): StaticBuffer {
        const handle = createBuffer(gl);

        gl.bindBuffer(target, handle);
        gl.bufferData(target, data, gl.STATIC_DRAW);
        gl.bindBuffer(target, null);

        const byteLength = data.byteLength;
        const info = getTypedArrayInfo(data);

        return new Buffer<"static">(gl, handle, target, gl.STATIC_DRAW, byteLength, info);
    }

    static dynamic(
        gl: WebGL2RenderingContext,
        data: ArrayBufferView | ArrayBuffer | number | null,
        target: GLenum
    ): DynamicBuffer {
        const handle = createBuffer(gl);

        let byteLength = 0;
        let info: TypedArrayInfo | undefined;
        if (data != null) {
            gl.bindBuffer(target, handle);
            if (typeof data === "number") {
                byteLength = data;
                gl.bufferData(target, data, gl.DYNAMIC_DRAW);
            } else {
                byteLength = data.byteLength;
                info = getTypedArrayInfo(data)
                gl.bufferData(target, data, gl.DYNAMIC_DRAW);
            }
            gl.bindBuffer(target, null);
        }

        return new Buffer<"dynamic">(gl, handle, target, gl.DYNAMIC_DRAW, byteLength, info);
    }
}