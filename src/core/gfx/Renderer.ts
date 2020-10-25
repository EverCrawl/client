import { m3, Vector2 } from "core/math";
import { Buffer } from "./Buffer";
import { Camera } from "./Camera";
import { Shader } from "./Shader";
import { Texture } from "./Texture";
import { VertexArray } from "./VertexArray";
import { Viewport } from "./Viewport";

interface RendererOptions {
    clearColor: [number, number, number, number];
}

export class Renderer {
    public readonly gl: WebGL2RenderingContext;

    /// Rendering constructs
    private viewport: Viewport;
    private shader: Shader;
    private buffers: {
        vertex: Buffer, index: Buffer
    };
    private vertexArray: VertexArray;

    constructor(
        gl: WebGL2RenderingContext,
        options: RendererOptions = {
            clearColor: [0, 0, 0, 1]
        }
    ) {
        this.gl = gl;

        this.viewport = new Viewport(this.gl);

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

        this.gl.clearColor(...options.clearColor);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }

    /**
     * Begin the scene
     * @param camera 
     */
    begin(camera: Camera) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.shader.bind();
        this.shader.uniforms.uVIEW.set(camera.view);
        this.shader.uniforms.uPROJECTION.set(camera.projection);
        // TODO: multiple textures?
        this.shader.uniforms.uTEXTURE.set(0);

        this.vertexArray.bind();
    }

    /**
     * Draw a sprite
     * @param texture 
     * @param position 
     * @param rotation in radians
     * @param scale 
     */
    draw(
        texture: Texture,
        uvMin: Vector2 = [0, 0], uvMax: Vector2 = [1, 1],
        position: Vector2 = [0, 0], rotation: number = 0, scale: Vector2 = [1, 1]
    ) {
        const model = m3();
        m3.translate(model, position);
        m3.rotate(model, rotation);
        m3.scale(model, scale);
        this.shader.uniforms.uMODEL.set(model);

        texture.bind(0);
        this.shader.uniforms.uUV.set([uvMin[0], uvMin[1], uvMax[0], uvMax[1]]);

        this.gl.drawElements(/* TRIANGLES */ 0x0004, 6, /* UNSIGNED_INT */ 0x1405, 0);
    }

    /**
     * End the scene
     */
    end() {
        // Not sure if there's even a reason for this to exist
    }
}