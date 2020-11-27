
import { setImmediate } from "core/utils";
import { Fragment } from "preact";
import { createShader, createProgram } from "./Common";
import { ErrorKind, GLError } from "./Error";

type Attribute = number;

interface ShaderOptions {
    sources: {
        vertex: string,
        fragment: string
    }
}

type UniformSetter = (data: number | number[]) => void;

type Uniform = {
    readonly name: string;
    readonly size: GLint;
    readonly type: string;
    readonly location: WebGLUniformLocation;
    readonly set: UniformSetter;
};

let boundShader: WebGLProgram | null = null;
export class Shader {
    public readonly gl: WebGL2RenderingContext;
    public readonly program: WebGLProgram;
    public readonly uniforms: { [name: string]: Uniform };

    constructor(
        gl: WebGL2RenderingContext,
        vertex: string, fragment: string
    ) {
        this.gl = gl;
        // compile the shader
        const program = linkProgram(this.gl,
            compileShader(this.gl, vertex, this.gl.VERTEX_SHADER),
            compileShader(this.gl, fragment, this.gl.FRAGMENT_SHADER)
        );
        this.program = program;
        // reflect uniforms
        this.uniforms = {};
        this.bind();
        for (let i = 0; i < this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS); ++i) {
            const info = this.gl.getActiveUniform(this.program, i)!;
            const location = this.gl.getUniformLocation(program, info.name)!;
            this.uniforms[info.name] = {
                name: info.name,
                size: info.size,
                type: stringifyType(info.type),
                location,
                set: createSetter(this.gl, info.type, location)
            };
        }
        this.unbind();
    }

    bind() {
        this.gl.useProgram(this.program);
        boundShader = this.program;
    }

    unbind() {
        this.gl.useProgram(null);
        boundShader = null;
    }
}

const underline = (text: TemplateStringsArray) => [`%c${text[0]}`, `text-decoration: underline;`];

function buildShaderErrorMessage(gl: WebGL2RenderingContext, shader: WebGLShader): string {
    const source = gl.getShaderSource(shader);
    const log = gl.getShaderInfoLog(shader);
    const type = gl.getShaderParameter(shader, gl.SHADER_TYPE);
    // if both sources are null, exit early
    if (source === null) {
        return `\n${log}\n`;
    }
    if (log === null) {
        return `Unknown error`;
    }
    // parse for line number and error
    const tokens = log
        .split("\n")
        .filter(it => it.length > 1)
        .map(it => it.replace(/(ERROR:\s)/g, ""))
        .map(it => it.split(":")).flat()
        .map(it => it.trim());
    const [line, token, error] = [parseInt(tokens[1]), tokens[2], tokens[3]];
    const lines = source.split(/\n|\r/g);
    // pad first line - this always works
    // because the first line in a webgl shader MUST be a #version directive
    // and no whitespace characters may precede it
    lines[0] = `    ${lines[0]}`;

    let padding = `${lines.length}`.length;

    let found = false;
    for (let i = 0; i < lines.length; ++i) {
        if (i === line - 1) {
            const whitespaces = lines[i].match(/\s+/);
            if (whitespaces !== null) {
                lines[i] = `${"-".repeat(whitespaces[0].length - 1)}> ${lines[i].trimStart()}`
            }
            lines[i] = `${" ".repeat(padding - `${i + 1}`.length)}${i + 1} +${lines[i]}`;
        } else {
            lines[i] = `${" ".repeat(padding - `${i + 1}`.length)}${i + 1} | ${lines[i]}`;
        }
    }
    lines.push(`${" ".repeat(padding)} |`);
    lines.push(`${" ".repeat(padding)} +-------> ${error}: ${token}`);
    lines.push(``);

    return lines.join("\n");
}

function compileShader(gl: WebGL2RenderingContext, source: string, type: GLenum): WebGLShader {
    const shader = createShader(gl, type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (DEBUG && gl.getShaderParameter(shader, gl.COMPILE_STATUS) === false) {
        throw new GLError(ErrorKind.ShaderCompileFailure, {
            message: buildShaderErrorMessage(gl, shader),
            type: gl.getShaderParameter(shader, gl.SHADER_TYPE) === gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT"
        }).message;
    }
    return shader;
}

function linkProgram(gl: WebGL2RenderingContext, vertex: WebGLShader, fragment: WebGLShader): WebGLProgram {
    const program = createProgram(gl);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);

    if (gl.getProgramParameter(program, /* LINK_STATUS */ 0x8B82) === false) {
        const log = gl.getProgramInfoLog(program);
        throw new GLError(ErrorKind.ShaderCompileFailure, { message: `${log ?? "Unknown error"}` });
    }
    return program;
}

function createSetter(gl: WebGL2RenderingContext, /* shader: WebGLProgram,  */type: number, location: WebGLUniformLocation): UniformSetter {
    switch (type) {
        case 0x1400:
        case 0x1402:
        case 0x1404:
        case 0x8b56:
        case 0x8b5e:
        case 0x8b5f:
        case 0x8b60:
        case 0x8dc1:
        case 0x8dd2: return function (data) {
            if (DEBUG && typeof data !== "number") {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: data.length, expectedLength: 1 });
            }
            gl["uniform1i"](location, data as number);
        };
        case 0x1401:
        case 0x1403:
        case 0x1405: return function (data) {
            if (DEBUG && typeof data !== "number") {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: data.length, expectedLength: 1 });
            }
            gl["uniform1ui"](location, data as number)
        };
        case 0x8b53:
        case 0x8b57: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 2)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 2 });
            }
            gl["uniform2iv"](location, data as number[])
        };
        case 0x8b54:
        case 0x8b58: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 3)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 3 });
            }
            gl["uniform3iv"](location, data as number[])
        };
        case 0x8b55:
        case 0x8b59: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 4)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 4 });
            }
            gl["uniform4iv"](location, data as number[])
        };
        case 0x1406: return function (data) {
            if (DEBUG && typeof data !== "number") {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: data.length, expectedLength: 1 });
            }
            gl["uniform1f"](location, data as number)
        };
        case 0x8b50: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 2)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 2 });
            }
            gl["uniform2fv"](location, data as number[])
        };
        case 0x8b51: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 3)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 3 });
            }
            gl["uniform3fv"](location, data as number[])
        };
        case 0x8b52: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 4)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 4 });
            }
            gl["uniform4fv"](location, data as number[])
        };
        case 0x8b55: return function (data) {
            if (DEBUG && typeof data !== "number") {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: data.length, expectedLength: 1 });
            }
            gl["uniform1ui"](location, data as number)
        };
        case 0x8dc6: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 2)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 2 });
            }
            gl["uniform2uiv"](location, data as number[])
        };
        case 0x8dc7: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 3)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 3 });
            }
            gl["uniform3uiv"](location, data as number[])
        };
        case 0x8dc8: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 4)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 4 });
            }
            gl["uniform4uiv"](location, data as number[])
        };
        case 0x8b57: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 2)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 2 });
            }
            gl["uniform2iv"](location, data as number[])
        };
        case 0x8b58: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 3)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 3 });
            }
            gl["uniform3iv"](location, data as number[])
        };
        case 0x8b59: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 4)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 4 });
            }
            gl["uniform4iv"](location, data as number[])
        };
        case 0x8b5a: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 2 * 2)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 2 * 2 });
            }
            gl["uniformMatrix2fv"](location, false, data as number[])
        };
        case 0x8b65: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 2 * 3)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 2 * 3 });
            }
            gl["uniformMatrix2x3fv"](location, false, data as number[])
        };
        case 0x8b66: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 2 * 4)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 2 * 4 });
            }
            gl["uniformMatrix2x4fv"](location, false, data as number[])
        };
        case 0x8b67: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 3 * 2)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 3 * 2 });
            }
            gl["uniformMatrix3x2fv"](location, false, data as number[])
        };
        case 0x8b5b: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 3 * 3)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 3 * 3 });
            }
            gl["uniformMatrix3fv"](location, false, data as number[])
        };
        case 0x8b68: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 3 * 4)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 3 * 4 });
            }
            gl["uniformMatrix3x4fv"](location, false, data as number[])
        };
        case 0x8b69: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 4 * 2)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 4 * 2 });
            }
            gl["uniformMatrix4x2fv"](location, false, data as number[])
        };
        case 0x8b6a: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 4 * 3)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 4 * 3 });
            }
            gl["uniformMatrix4x3fv"](location, false, data as number[])
        };
        case 0x8b5c: return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== 4 * 4)) {
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), actualLength: 1, expectedLength: 4 * 4 });
            }
            gl["uniformMatrix4fv"](location, false, data as number[])
        };
        default: throw new GLError(ErrorKind.UnknownUniformType, { type });
    }
}

function stringifyType(type: number): string {
    switch (type) {
        case 0x1400: return "byte";
        case 0x1402: return "short";
        case 0x1404: return "int";
        case 0x8b56: return "bool";
        case 0x8b5e: return "2d float sampler";
        case 0x8b5f: return "3d float sampler";
        case 0x8dc1: return "2d float sampler array";
        case 0x8dd2: return "2d unsigned int sampler";
        case 0x8b60: return "cube sampler";
        case 0x1401: return "unsigned byte";
        case 0x1403: return "unsigned short";
        case 0x1405: return "unsigned int";
        case 0x8b53: return "int 2-component vector";
        case 0x8b54: return "int 3-component vector";
        case 0x8b55: return "int 4-component vector";
        case 0x8b57: return "bool 2-component vector";
        case 0x8b58: return "bool 3-component vector";
        case 0x8b59: return "bool 4-component vector";
        case 0x1406: return "float";
        case 0x8b50: return "float 2-component vector";
        case 0x8b51: return "float 3-component vector";
        case 0x8b52: return "float 4-component vector";
        case 0x8dc6: return "unsigned int 2-component vector";
        case 0x8dc7: return "unsigned int 3-component vector";
        case 0x8dc8: return "unsigned int 4-component vector";
        case 0x8b5a: return "float 2x2 matrix";
        case 0x8b65: return "float 2x3 matrix";
        case 0x8b66: return "float 2x4 matrix";
        case 0x8b5b: return "float 3x3 matrix";
        case 0x8b67: return "float 3x2 matrix";
        case 0x8b68: return "float 3x4 matrix";
        case 0x8b5c: return "float 4x4 matrix";
        case 0x8b69: return "float 4x2 matrix";
        case 0x8b6a: return "float 4x3 matrix";
        default: throw new GLError(ErrorKind.UnknownUniformType, { type });
    }
}
