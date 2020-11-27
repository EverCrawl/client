import {
    Matrix3, m3, Vector2, v2, Vector4, v4
} from "core/math";
import {
    Buffer, Camera, Shader, Texture, VertexArray, Viewport
} from "core/gfx";

interface SpriteRendererOptions {
    clearColor: [number, number, number, number];
}

interface SpriteRenderCommand {
    texture: Texture;
    uv: Vector4;
    model: Matrix3;
}

export class SpriteRenderer {
    /// Rendering constructs
    private shader: Shader;
    private buffers: {
        vertex: Buffer, index: Buffer
    };
    private vertexArray: VertexArray;

    private commandBuffer: { [layer: number]: SpriteRenderCommand[] };

    constructor(
        public readonly gl: WebGL2RenderingContext,
        private options: SpriteRendererOptions = {
            clearColor: [0, 0, 0, 1]
        }
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
            -1, -1, +0.0, +1.0,
            -1, +1, +0.0, +0.0,
            +1, +1, +1.0, +0.0,
            +1, -1, +1.0, +1.0,
        ];
        const indices = [
            0, 1, 2,
            2, 3, 0
        ];

        this.buffers = {
            vertex: new Buffer(this.gl, new Float32Array(vertices), this.gl.ARRAY_BUFFER),
            index: new Buffer(this.gl, new Int32Array(indices), this.gl.ELEMENT_ARRAY_BUFFER)
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
        this.gl.clearColor(...this.options.clearColor);
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
        this.gl.drawElements(/* TRIANGLES */ 0x0004, 6, /* UNSIGNED_INT */ 0x1405, 0);
    }
}


interface TileRendererOptions {
    clearColor: [number, number, number, number];
}

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
        vertex: Buffer, index: Buffer
    };
    private vertexArray: VertexArray;

    private commandBuffer: { [layer: number]: TileRenderCommand[] };

    constructor(
        public readonly gl: WebGL2RenderingContext,
        private options: TileRendererOptions = {
            clearColor: [0, 0, 0, 1]
        }
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
            -1, -1, +0.0, +1.0,
            -1, +1, +0.0, +0.0,
            +1, +1, +1.0, +0.0,
            +1, -1, +1.0, +1.0,
        ];
        const indices = [
            0, 1, 2,
            2, 3, 0
        ];

        this.buffers = {
            vertex: new Buffer(this.gl, new Float32Array(vertices), this.gl.ARRAY_BUFFER),
            index: new Buffer(this.gl, new Int32Array(indices), this.gl.ELEMENT_ARRAY_BUFFER)
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
        this.gl.clearColor(...this.options.clearColor);
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
        this.gl.drawElements(/* TRIANGLES */ 0x0004, 6, /* UNSIGNED_INT */ 0x1405, 0);
    }
}