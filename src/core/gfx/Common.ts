import { ErrorKind, GLError, glError } from "./Error";

export interface KHR_parallel_shader_compile {
    readonly COMPLETION_STATUS_KHR: 0x91B1;
};

export function getContext(canvas: HTMLCanvasElement, contextId: "2d", options?: CanvasRenderingContext2DSettings, extensions?: string[]): CanvasRenderingContext2D;
export function getContext(canvas: HTMLCanvasElement, contextId: "bitmaprenderer", options?: ImageBitmapRenderingContextSettings, extensions?: string[]): ImageBitmapRenderingContext;
export function getContext(canvas: HTMLCanvasElement, contextId: "webgl", options?: WebGLContextAttributes, extensions?: string[]): WebGLRenderingContext;
export function getContext(canvas: HTMLCanvasElement, contextId: "webgl2", options?: WebGLContextAttributes, extensions?: string[]): WebGL2RenderingContext;
export function getContext(canvas: HTMLCanvasElement, contextId: string, options?: any, extensions?: string[]): RenderingContext {
    const ctx = canvas.getContext(contextId, options);
    if (!ctx) {
        throw new GLError(ErrorKind.ContextAcquireFailure, { contextId });
    }
    // TODO(?): support more extensions
    if (contextId === "webgl2" && Array.isArray(extensions)) {
        const supported = (ctx as WebGL2RenderingContext).getSupportedExtensions();
        if (supported === null) throw new GLError(ErrorKind.CreateFailure, { what: "WebGL2RenderingContext", why: "Could not query supported extensions" });
        for (const extName of extensions) {
            if (!supported.includes(extName)) {
                throw new GLError(ErrorKind.Unsupported, { what: `extension "${extName}"`, info: `Supported extensions are: ${supported.join(", ")}` });
            }
            const ext = (ctx as WebGL2RenderingContext).getExtension(extName);
        }
    }
    return ctx;
}

export function createShader(gl: WebGL2RenderingContext, type: GLenum): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
        throw new GLError(ErrorKind.CreateFailure, { what: "Shader", why: glError(gl) });
    }
    return shader;
}

export function createProgram(gl: WebGL2RenderingContext): WebGLShader {
    const shader = gl.createProgram();
    if (!shader) {
        throw new GLError(ErrorKind.CreateFailure, { what: "Program", why: glError(gl) });
    }
    return shader;
}

export function createBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
    const buffer = gl.createBuffer();
    if (!buffer) {
        throw new GLError(ErrorKind.CreateFailure, { what: "Buffer", why: glError(gl) });
    }
    return buffer;
}

export function createVertexArray(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
    const vertexArray = gl.createVertexArray();
    if (!vertexArray) {
        throw new GLError(ErrorKind.CreateFailure, { what: "Vertex Array", why: glError(gl) });
    }
    return vertexArray;
}

export function createTexture(gl: WebGL2RenderingContext): WebGLTexture {
    const texture = gl.createTexture();
    if (!texture) {
        throw new GLError(ErrorKind.CreateFailure, { what: "Texture", why: glError(gl) });
    }
    return texture;
}
