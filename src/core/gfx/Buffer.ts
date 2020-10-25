
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

export class Buffer {
    public readonly gl: WebGL2RenderingContext;
    public readonly handle: WebGLBuffer;
    public readonly target: GLenum;
    private byteLength_: number;
    private typeInfo_: TypedArrayInfo;

    constructor(
        gl: WebGL2RenderingContext,
        data: ArrayBufferView | ArrayBuffer,
        target: GLenum
    ) {
        this.gl = gl;
        this.handle = createBuffer(this.gl);
        this.target = target;

        this.gl.bindBuffer(this.target, this.handle);
        this.gl.bufferData(this.target, data, this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.target, null);

        this.byteLength_ = data.byteLength;
        this.typeInfo_ = getTypedArrayInfo(data);
    }

    get byteLength() { return this.byteLength_; }
    get elementType() { return this.typeInfo_.type; }
    get elementSize() { return this.typeInfo_.elementSize; }

    bind() {
        this.gl.bindBuffer(this.target, this.handle);
    }

    unbind() {
        this.gl.bindBuffer(this.target, null);
    }
}