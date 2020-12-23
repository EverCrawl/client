import {
    Matrix3, m3, Vector2, v2, Vector4, v4, Vector3
} from "core/math";
import {
    Buffer, Camera, Shader, Texture, VertexArray, Viewport
} from "core/gfx";
import { DynamicBuffer, StaticBuffer } from "./Buffer";

// TODO: instead of separate renderers, have seperate render passes
// a render pass is just a function which sets GL state, accesses/modifies some resources, makes some draw calls, etc

// TODO: draw each tilemap chunk at once through instanced rendering
// quad vertices + indices
//      -> drawn N times, where N = chunk.width * chunk.height
// 3 uniforms
//      - uint tileset ID 
//      - uint tile ID
//      - vec2 position


interface SpriteRendererOptions { }

interface SpriteRenderCommand {
    texture: Texture;
    uv: Vector4;
    model: Matrix3;
}

export class SpriteRenderer {
    /// Rendering constructs
    private shader: Shader;
    private buffers: {
        vertex: StaticBuffer, index: StaticBuffer
    };
    private vertexArray: VertexArray;

    private commandBuffer: { [layer: number]: SpriteRenderCommand[] };

    constructor(
        public readonly gl: WebGL2RenderingContext,
        private options: SpriteRendererOptions = {}
    ) {
        this.gl = gl;

        this.shader = new Shader(
            this.gl,
            `#version 300 es
precision mediump float;

uniform mat4 uVIEW;
uniform mat4 uPROJECTION;

uniform mat3 uMODEL;
uniform vec4 uUV;

layout(location = 0) in vec2 aPOSITION;
layout(location = 1) in vec2 aTEXCOORD;

out vec2 vTEXCOORD;

void main()
{
    vTEXCOORD = aTEXCOORD * uUV.zw + uUV.xy;
    vec3 transformed = uMODEL * vec3(aPOSITION, 1.0);
    gl_Position = uPROJECTION * uVIEW * vec4(transformed.xy, 0.0, 1.0);
}`,
            `#version 300 es
precision mediump float;

uniform sampler2D uTEXTURE;

in vec2 vTEXCOORD;

out vec4 oFRAG;

void main()
{
    oFRAG = texture(uTEXTURE, vTEXCOORD);
}`
        );

        const vertices = [
            -1, -1, +0.0, +0.0,
            -1, +1, +0.0, +1.0,
            +1, +1, +1.0, +1.0,
            +1, -1, +1.0, +0.0,
        ];
        const indices = [
            0, 1, 2,
            2, 3, 0
        ];

        this.buffers = {
            vertex: Buffer.static(this.gl, new Float32Array(vertices), this.gl.ARRAY_BUFFER),
            index: Buffer.static(this.gl, new Int32Array(indices), this.gl.ELEMENT_ARRAY_BUFFER)
        };
        this.vertexArray = new VertexArray(this.gl,
            [
                {
                    buffer: this.buffers.vertex, descriptors: [
                        { location: 0, arraySize: 2, baseType: this.gl.FLOAT, normalized: false },
                        { location: 1, arraySize: 2, baseType: this.gl.FLOAT, normalized: false },
                    ]
                },
                {
                    buffer: this.buffers.index, descriptors: []
                }
            ]
        );

        this.commandBuffer = {};
    }

    /**
     * Begin recording commands
     */
    begin(camera: Camera) {
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.shader.bind();
        this.shader.uniforms.uVIEW.set(camera.view);
        this.shader.uniforms.uPROJECTION.set(camera.projection);
        // TODO: multiple textures?
        this.shader.uniforms.uTEXTURE.set(0);

        this.vertexArray.bind();

        // clear layers
        for (const layer of Object.keys(this.commandBuffer)) {
            this.commandBuffer[Number(layer)] = [];
        }
    }

    /**
     * Submit a render command
     * @param rotation in radians
     */
    draw(
        texture: Texture,
        layer: number,
        uvMin: Vector2 = [0, 0], uvMax: Vector2 = [1, 1],
        position: Vector2 = [0, 0], rotation: number = 0, scale: Vector2 = [1, 1]
    ) {
        const model = m3();
        m3.translate(model, position);
        m3.rotate(model, rotation);
        m3.scale(model, scale);

        const uv: Vector4 = v4(uvMin[0], uvMin[1], uvMax[0], uvMax[1]);

        const cmd: SpriteRenderCommand = { texture, uv, model };

        if (!this.commandBuffer[layer]) {
            this.commandBuffer[layer] = [cmd];
        } else {
            this.commandBuffer[layer].push(cmd);
        }
    }

    /**
     * Flush command buffer
     */
    end() {
        const layers = Object.keys(this.commandBuffer).sort((a, b) => +a - +b);
        for (let i = 0, len = layers.length; i < len; ++i) {
            // for each layer...
            const cmdList = this.commandBuffer[+layers[i]];
            for (let j = 0, len = cmdList.length; j < len; ++j) {
                // for each command...
                this.execute(cmdList[j]);
            }
        }
    }

    private execute(cmd: SpriteRenderCommand) {
        cmd.texture && cmd.texture.bind(0);
        this.shader.uniforms.uUV.set(cmd.uv);
        this.shader.uniforms.uMODEL.set(cmd.model);
        this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
    }
}


interface TileRendererOptions { }

interface TileRenderCommand {
    texture: Texture;
    tile: number;
    model: Matrix3;
}

// TODO: batching
export class TileRenderer {
    /// Rendering constructs
    private shader: Shader;
    private buffers: {
        vertex: StaticBuffer, index: StaticBuffer
    };
    private vertexArray: VertexArray;

    private commandBuffer: { [layer: number]: TileRenderCommand[] };

    constructor(
        public readonly gl: WebGL2RenderingContext,
        private options: TileRendererOptions = {}
    ) {
        this.gl = gl;

        this.shader = new Shader(
            this.gl,
            `#version 300 es
precision mediump float;

uniform mat4 uVIEW;
uniform mat4 uPROJECTION;
uniform mat3 uMODEL;

layout(location = 0) in vec2 aPOSITION;
layout(location = 1) in vec2 aTEXCOORD;

out vec2 vTEXCOORD;

void main()
{
    //vTEXCOORD = vec2(aTEXCOORD.x, 1.0 - aTEXCOORD.y);
    vTEXCOORD = aTEXCOORD;
    vec3 transformed = uMODEL * vec3(aPOSITION, 1.0);
    gl_Position = uPROJECTION * uVIEW * vec4(transformed.xy, 0.0, 1.0);
}`,
            `#version 300 es
precision mediump float;
precision mediump sampler2DArray;

uniform sampler2DArray uATLAS;
uniform uint uTILE;

in vec2 vTEXCOORD;

out vec4 oFRAG;

void main()
{
    vec3 uvw = vec3(vTEXCOORD.x, vTEXCOORD.y, uTILE);
    oFRAG = texture(uATLAS, uvw);
    //oFRAG = vec4(uvw, 1.0);
}`
        );

        const vertices = [
            -1, -1, +0.0, +0.0,
            -1, +1, +0.0, +1.0,
            +1, +1, +1.0, +1.0,
            +1, -1, +1.0, +0.0,
        ];
        const indices = [
            0, 1, 2,
            2, 3, 0
        ];

        this.buffers = {
            vertex: Buffer.static(this.gl, new Float32Array(vertices), this.gl.ARRAY_BUFFER),
            index: Buffer.static(this.gl, new Int32Array(indices), this.gl.ELEMENT_ARRAY_BUFFER)
        };
        this.vertexArray = new VertexArray(this.gl,
            [
                {
                    buffer: this.buffers.vertex, descriptors: [
                        { location: 0, arraySize: 2, baseType: this.gl.FLOAT, normalized: false },
                        { location: 1, arraySize: 2, baseType: this.gl.FLOAT, normalized: false },
                    ]
                },
                {
                    buffer: this.buffers.index, descriptors: []
                }
            ]
        );

        this.commandBuffer = {};

    }

    /**
     * Begin recording commands
     */
    begin(camera: Camera) {
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.shader.bind();
        this.shader.uniforms.uVIEW.set(camera.view);
        this.shader.uniforms.uPROJECTION.set(camera.projection);
        // TODO: multiple textures?
        this.shader.uniforms.uATLAS.set(0);

        this.vertexArray.bind();

        // clear layers
        for (const layer of Object.keys(this.commandBuffer)) {
            this.commandBuffer[Number(layer)] = [];
        }
    }

    /**
     * Submit a render command
     * @param rotation in radians
     */
    draw(
        texture: Texture,
        layer: number,
        tile: number,
        position: Vector2 = [0, 0], rotation: number = 0, scale: Vector2 = [1, 1]
    ) {
        const model = m3();
        m3.translate(model, position);
        m3.rotate(model, rotation);
        m3.scale(model, scale);

        const cmd: TileRenderCommand = { texture, tile, model };

        if (!this.commandBuffer[layer]) {
            this.commandBuffer[layer] = [cmd];
        } else {
            this.commandBuffer[layer].push(cmd);
        }
    }

    /**
     * Flush command buffer
     */
    end() {
        const layers = Object.keys(this.commandBuffer).sort((a, b) => +a - +b);
        for (let i = 0, len = layers.length; i < len; ++i) {
            // for each layer...
            const cmdList = this.commandBuffer[+layers[i]];
            for (let j = 0, len = cmdList.length; j < len; ++j) {
                // for each command...
                this.execute(cmdList[j]);
            }
        }
    }

    private execute(cmd: TileRenderCommand) {
        cmd.texture && cmd.texture.bind(0);
        this.shader.uniforms.uTILE.set(cmd.tile);
        this.shader.uniforms.uMODEL.set(cmd.model);
        this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
    }
}

interface LineRendererOptions {
    maxLines: number;
    lineWidth: number;
}

// TODO: fallback to rendering lines as quads
export class LineRenderer {
    private shader: Shader;
    private vertexArray: VertexArray;

    private buffer: {
        cpu: number[],
        gpu: DynamicBuffer
    };

    constructor(
        public readonly gl: WebGL2RenderingContext,
        private options: LineRendererOptions = {
            maxLines: 512,
            lineWidth: 4
        }
    ) {

        this.shader = new Shader(this.gl,
            `#version 300 es
precision mediump float;
uniform mat4 uVIEW;
uniform mat4 uPROJECTION;
layout(location = 0) in vec2 aPOSITION;
layout(location = 1) in vec4 aCOLOR;
out vec4 vColor;
void main()
{
    vColor = aCOLOR;
    gl_Position = uPROJECTION * uVIEW * vec4(aPOSITION, 0.0, 1.0);
}`,
            `#version 300 es
precision mediump float;
in vec4 vColor;
out vec4 oFragColor;
void main()
{
    oFragColor = vColor;
}`
        );

        // sizeof(point) == float 2-component vector + float 4-component vector
        const sizeof_line = (4 * 2) + (4 * 4);
        const bufferSize = sizeof_line * this.options.maxLines;

        this.buffer = {
            cpu: [],
            gpu: Buffer.dynamic(this.gl, bufferSize, this.gl.ARRAY_BUFFER)
        };

        this.vertexArray = new VertexArray(this.gl, [{
            buffer: this.buffer.gpu, descriptors: [
                { location: 0, arraySize: 2, baseType: this.gl.FLOAT, normalized: false },
                { location: 1, arraySize: 4, baseType: this.gl.FLOAT, normalized: false },
            ]
        }]);
    }

    /**
     * Begin recording commands
     */
    begin(camera: Camera) {
        this.gl.lineWidth(this.options.lineWidth);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.shader.bind();
        this.shader.uniforms.uVIEW.set(camera.view);
        this.shader.uniforms.uPROJECTION.set(camera.projection);

        this.vertexArray.bind();

        this.buffer.cpu = [];
    }

    /**
     * Submit a render command
     * @param rotation in radians
     */
    draw(
        p0: Vector2,
        p1: Vector2,
        color: Vector4 = [0.5, 0.5, 0.5, 1.0],
    ) {
        this.buffer.cpu.push(
            ...p0, ...color,
            ...p1, ...color
        );
    }

    /**
     * Flush buffer
     */
    end() {
        this.buffer.gpu.upload(new Float32Array(this.buffer.cpu), 0);
        this.gl.drawArrays(this.gl.LINES, 0, this.buffer.cpu.length / 6);
    }
}

interface PointRendererOptions {
    maxPoints: number;
}

export class PointRenderer {
    private shader: Shader;
    private vertexArray: VertexArray;

    private buffer: {
        cpu: number[],
        gpu: DynamicBuffer
    };

    constructor(
        public readonly gl: WebGL2RenderingContext,
        private options: PointRendererOptions = {
            maxPoints: 1024
        }
    ) {
        this.shader = new Shader(
            this.gl,
            `#version 300 es
precision mediump float;
uniform mat4 uVIEW;
uniform mat4 uPROJECTION;
layout(location = 0) in vec2 aPOSITION;
layout(location = 1) in vec3 aCOLOR;
out vec3 vColor;
void main()
{
    vColor = aCOLOR;
    gl_Position = uPROJECTION * uVIEW * vec4(aPOSITION.x, aPOSITION.y, 0.0, 1.0);
    // TODO: variable point size
    gl_PointSize = 10.0;
}`,
            `#version 300 es
#extension GL_OES_standard_derivatives : enable
precision mediump float;
in vec3 vColor;
out vec4 oFragColor;
void main()
{
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    float delta = fwidth(r);
    float alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, r);
    oFragColor = vec4(vColor, alpha);
}`
        );

        // sizeof(point) == float 2-component vector + float 3-component vector
        const sizeof_point = (4 * 2) + (4 * 3);
        const bufferSize = sizeof_point * this.options.maxPoints;

        this.buffer = {
            cpu: [],
            gpu: Buffer.dynamic(this.gl, bufferSize, this.gl.ARRAY_BUFFER)
        }
        this.vertexArray = new VertexArray(this.gl, [{
            buffer: this.buffer.gpu, descriptors: [
                { location: 0, arraySize: 2, baseType: this.gl.FLOAT, normalized: false },
                { location: 1, arraySize: 3, baseType: this.gl.FLOAT, normalized: false },
            ]
        }]);
    }

    /**
     * Begin recording commands
     */
    begin(camera: Camera) {
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.shader.bind();
        this.shader.uniforms.uVIEW.set(camera.view);
        this.shader.uniforms.uPROJECTION.set(camera.projection);

        this.vertexArray.bind();

        this.buffer.cpu = [];
    }

    /**
     * Submit a render command
     * @param rotation in radians
     */
    draw(
        position: Vector2,
        color: Vector3 = [0.5, 0.5, 0.5],
    ) {
        this.buffer.cpu.push(...position, ...color);
    }

    /**
     * Flush buffer
     */
    end() {
        this.buffer.gpu.upload(new Float32Array(this.buffer.cpu), 0);
        this.gl.drawArrays(this.gl.POINTS, 0, this.buffer.cpu.length / 5);
    }
}