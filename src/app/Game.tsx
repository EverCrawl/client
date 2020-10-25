import { h, Component, createRef } from "preact";
import * as Core from "core";
import "./Game.css";
import AYAYA from "./img/icon_128x128.png";

// TODO: sprite (only holds texture and animation info)
// TODO: renderer.beginScene(camera)
// TODO: renderer.draw(sprite)
// TODO: renderer.endScene()
// TODO: load + render sprites/animations from aseprite
// TODO: load + render maps from Tiled
// TODO: collisions
// TODO: ECS (maybe can do without it? - maybe its not worth it, and composition architecture would be better)

const tuple = <T extends [any?, ...any[]]>(t: T) => t;

export default class Game extends Component {
    canvasRef = createRef<HTMLCanvasElement>();
    gl!: WebGL2RenderingContext;

    componentDidMount() {
        if (!this.canvas) throw new Error(`Failed to initialize Game`);
        this.gl = Core.getContext(this.canvas, "webgl2");

        const viewport = new Core.Viewport(this.gl);
        const camera = new Core.Camera(viewport);

        // start the game here
        const shader = new Core.Shader(
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
    vTEXCOORD = aTEXCOORD;
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

        const VBO = new Core.Buffer(this.gl, new Float32Array(vertices), this.gl.ARRAY_BUFFER);
        const EBO = new Core.Buffer(this.gl, new Int32Array(indices), this.gl.ELEMENT_ARRAY_BUFFER);
        const VAO = new Core.VertexArray(this.gl,
            [
                {
                    buffer: VBO, descriptors: [
                        { location: 0, arraySize: 2, baseType: this.gl.FLOAT, normalized: false },
                        { location: 1, arraySize: 2, baseType: this.gl.FLOAT, normalized: false },
                    ]
                },
                {
                    buffer: EBO, descriptors: []
                }
            ]
        );
        const texture = new Core.Texture(this.gl, AYAYA);

        console.log(shader.uniforms);

        let scale = [200, 200] as [number, number];
        let rot = 15;
        let pos = [500, 500] as [number, number];
        let vel = [1, 0];

        const loop = () => {
            //rot = (++rot) % 360;
            if (pos[0] > 1000 || pos[0] < 500) {
                vel[0] *= -1;
            }
            pos[0] += vel[0];
            //camera.position = pos;

            this.gl.clearColor(0.2, 0.3, 0.3, 1.0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

            shader.bind();
            shader.uniforms.uVIEW.set(camera.view);
            shader.uniforms.uPROJECTION.set(camera.projection);
            shader.uniforms.uTEXTURE.set(0);
            VAO.bind();

            shader.uniforms.uMODEL.set(
                Core.m3.scale(
                    Core.m3.rotate(
                        Core.m3.translate(Core.m3(), pos),
                        Math.rad(rot)),
                    scale));

            texture.bind(0);

            this.gl.drawElements(this.gl.TRIANGLES, EBO.byteLength / EBO.elementSize, this.gl.UNSIGNED_INT, 0);

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    render() {
        return <canvas ref={this.canvasRef} tabIndex={-1} class="noselect"></canvas>;
    }

    get canvas() {
        return this.canvasRef.current;
    }
}
