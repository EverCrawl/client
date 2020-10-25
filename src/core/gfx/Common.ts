import { ErrorKind, GLError, glError } from "./Error";

export interface KHR_parallel_shader_compile {
    readonly COMPLETION_STATUS_KHR: 0x91B1;
};

export function getContext(canvas: HTMLCanvasElement, contextId: "2d", options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D;
export function getContext(canvas: HTMLCanvasElement, contextId: "bitmaprenderer", options?: ImageBitmapRenderingContextSettings): ImageBitmapRenderingContext;
export function getContext(canvas: HTMLCanvasElement, contextId: "webgl", options?: WebGLContextAttributes): WebGLRenderingContext;
export function getContext(canvas: HTMLCanvasElement, contextId: "webgl2", options?: WebGLContextAttributes): WebGL2RenderingContext;
export function getContext(canvas: HTMLCanvasElement, contextId: string, options?: any): RenderingContext {
    const ctx = canvas.getContext(contextId, options);
    if (!ctx) {
        throw new GLError(ErrorKind.ContextAcquireFailure, { contextId });
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
