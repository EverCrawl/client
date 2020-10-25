

export function glError(gl: WebGL2RenderingContext): string | null {
    const error = gl.getError();
    switch (error) {
        case gl.INVALID_ENUM: return "Unacceptable value has been specified for an enumerated argument.";
        case gl.INVALID_VALUE: return "Numeric argument is out of range.";
        case gl.INVALID_OPERATION: return "The specified command is not allowed for the current state.";
        case gl.INVALID_FRAMEBUFFER_OPERATION: return "The currently bound framebuffer is not framebuffer complete when trying to render to or to read from it.";
        case gl.OUT_OF_MEMORY: return "Not enough memory is left to execute the command.";
        case gl.CONTEXT_LOST_WEBGL: return "The WebGL context was lost.";
        default: return null;
    }
}

function isContextTypeSupported(type: string) {
    switch (type) {
        case "2d": return !!window.CanvasRenderingContext2D;
        case "bitmaprenderer": return !!window.ImageBitmapRenderingContext;
        case "webgl": return !!window.WebGLRenderingContext;
        case "webgl2": return !!window.WebGL2RenderingContext;
    }
}

export const enum ErrorKind {
    EmptyVertexArray = "E1VA",
    UnknownBaseType = "U2BT",
    ShaderCompileFailure = "S3CF",
    CreateFailure = "N4CF",
    ContextAcquireFailure = "C5AF",
    UnknownUniformType = "U6UT",
    InvalidUniformData = "I7UD",
    UnknownArrayType = "U8AT",
    Unsupported = "U9SP",
}

export function stringifyErrorKind(code: ErrorKind, extra?: any) {
    if (!DEBUG) return `GL operation failed. Code: ${code}`;
    switch (code) {
        case ErrorKind.EmptyVertexArray:
            return "Cannot create empty vertex array.";
        case ErrorKind.UnknownBaseType:
            return `Unknown base type: ${extra.type}`;
        case ErrorKind.ShaderCompileFailure:
            return `Failed to compile program from sources:\nVertex: \n${extra.vertex}\nFragment: \n${extra.fragment}\nErrors:\n${extra.errors}`;
        case ErrorKind.CreateFailure:
            return `Failed to create ${extra.what}: ${extra.why}`;
        case ErrorKind.ContextAcquireFailure:
            return `Failed to acquire context ${extra.contextId}. Supported: ${isContextTypeSupported(extra.contextId)}.`;
        case ErrorKind.UnknownUniformType:
            return `Unknown uniform type: ${extra.type}`;
        case ErrorKind.InvalidUniformData:
            return `Attempted to set uniform of type ${extra.type} with data of length ${extra.actualLength}, expected ${extra.expectedLength}`;
        case ErrorKind.UnknownArrayType:
            return `Unknown array type: ${extra.type}`;
        case ErrorKind.Unsupported:
            return `${extra.what} ${extra.plural ? "are" : "is"} unsupported.`;
    }
}

export class GLError extends Error {
    constructor(
        code: ErrorKind,
        extra?: any
    ) {
        super(stringifyErrorKind(code, extra))
    }
}