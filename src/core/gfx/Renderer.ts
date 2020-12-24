import { Matrix3, m3, Vector2, Vector4, v4, Vector3 } from "core/math";
import { Buffer, Camera, Shader, Texture, VertexArray } from "core/gfx";
import { DynamicBuffer } from "./Buffer";
import * as Shaders from "./glsl";
import * as Meshes from "./mesh";

// TODO: draw each tilemap chunk at once through instanced rendering
// quad vertices + indices
//      -> drawn N times, where N = chunk.width * chunk.height
// 3 uniforms
//      - uint tileset ID 
//      - uint tile ID
//      - vec2 position


interface SpriteRenderCommand {
    texture: Texture;
    uv: Vector4;
    model: Matrix3;
}

interface TileRenderCommand {
    texture: Texture;
    tile: number;
    model: Matrix3;
}

export class Renderer {
    private shaders: {
        sprite: Shader;
        tile: Shader;
        line: Shader;
        point: Shader;
    }
    private vao: {
        quad: VertexArray;
        point: VertexArray;
        line: VertexArray;
    }
    private commands: {
        sprite: {
            [layer: number]: SpriteRenderCommand[];
        }
        tile: {
            [layer: number]: TileRenderCommand[];
        }
    }
    private buffers: {
        point: {
            cpu: number[];
            gpu: DynamicBuffer;
        };
        line: {
            cpu: number[];
            gpu: DynamicBuffer;
        };
    }

    camera: Camera | null;

    options: {
        maxLines: number;
        maxPoints: number;
        lineWidth: number;
    }

    constructor(
        options: {
            maxLines?: number,
            maxPoints?: number,
            lineWidth?: number
        } = {}
    ) {
        this.options = {
            maxLines: options.maxLines ?? 512,
            maxPoints: options.maxPoints ?? 1024,
            lineWidth: options.lineWidth ?? 2
        };
        this.shaders = {
            sprite: Shaders.Sprite.compile(),
            tile: Shaders.Tile.compile(),
            line: Shaders.Line.compile(),
            point: Shaders.Point.compile(),
        };
        this.commands = {
            sprite: [],
            tile: []
        };
        this.buffers = {
            point: {
                cpu: [],
                gpu: Buffer.dynamic((4 * 2) + (4 * 4) * this.options.maxPoints, GL.ARRAY_BUFFER)
            },
            line: {
                cpu: [],
                gpu: Buffer.dynamic((4 * 2) + (4 * 3) * this.options.maxLines, GL.ARRAY_BUFFER)
            }
        };
        this.vao = {
            quad: Meshes.Quad22I.build(),
            point: new VertexArray([{
                buffer: this.buffers.point.gpu, descriptors: [
                    { location: 0, arraySize: 2, baseType: GL.FLOAT, normalized: false },
                    { location: 1, arraySize: 4, baseType: GL.FLOAT, normalized: false },
                ]
            }]),
            line: new VertexArray([{
                buffer: this.buffers.line.gpu, descriptors: [
                    { location: 0, arraySize: 2, baseType: GL.FLOAT, normalized: false },
                    { location: 1, arraySize: 3, baseType: GL.FLOAT, normalized: false },
                ]
            }]),
        };

        this.camera = null;
    }

    command = {
        quad: (
            texture: Texture,
            layer: number,
            uvMin: Vector2 = [0, 0], uvMax: Vector2 = [1, 1],
            position: Vector2 = [0, 0], rotation: number = 0, scale: Vector2 = [1, 1]
        ) => {
            if (DEBUG && this.camera == null) {
                throw new Error(`Renderer has no bound camera`);
            }
            const model = m3();
            m3.translate(model, position);
            m3.rotate(model, rotation);
            m3.scale(model, scale);

            const uv: Vector4 = v4(uvMin[0], uvMin[1], uvMax[0], uvMax[1]);

            const cmd: SpriteRenderCommand = { texture, uv, model };

            if (!this.commands.sprite[layer]) {
                this.commands.sprite[layer] = [cmd];
            } else {
                this.commands.sprite[layer].push(cmd);
            }
        },
        tile: (
            texture: Texture,
            layer: number,
            tile: number,
            position: Vector2 = [0, 0], rotation: number = 0, scale: Vector2 = [1, 1]
        ) => {
            if (DEBUG && this.camera == null) {
                throw new Error(`Renderer has no bound camera`);
            }
            const model = m3();
            m3.translate(model, position);
            m3.rotate(model, rotation);
            m3.scale(model, scale);

            const cmd: TileRenderCommand = { texture, tile, model };

            if (!this.commands.tile[layer]) {
                this.commands.tile[layer] = [cmd];
            } else {
                this.commands.tile[layer].push(cmd);
            }
        },
        line: (
            p0: Vector2,
            p1: Vector2,
            color: Vector4 = [0.5, 0.5, 0.5, 1.0],
        ) => {
            if (DEBUG && this.camera == null) {
                throw new Error(`Renderer has no bound camera`);
            }
            this.buffers.line.cpu.push(
                ...p0, ...color,
                ...p1, ...color
            );
        },
        point: (
            position: Vector2,
            color: Vector3 = [0.5, 0.5, 0.5],
        ) => {
            if (DEBUG && this.camera == null) {
                throw new Error(`Renderer has no bound camera`);
            }
            this.buffers.point.cpu.push(...position, ...color);
        }
    }

    flush() {
        if (DEBUG && this.camera == null) {
            throw new Error(`Renderer has no bound camera`);
        }

        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
        GL.lineWidth(this.options.lineWidth ?? 2);
        GL.enable(GL.BLEND);
        GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);

        { // tiles
            // TODO: instanced rendering of tiles (described above)
            // setup
            const shader = this.shaders.tile;
            shader.bind();
            shader.uniforms.uVIEW.set(this.camera!.view);
            shader.uniforms.uPROJECTION.set(this.camera!.projection);
            // TODO(speed): multiple textures
            shader.uniforms.uATLAS.set(0);
            this.vao.quad.bind();
            const commands = this.commands.tile;

            // draw
            const layers = Object.keys(commands).sort((a, b) => +a - +b);
            for (let i = 0, len = layers.length; i < len; ++i) {
                const cmdList = commands[+layers[i]];
                for (let j = 0, len = cmdList.length; j < len; ++j) {
                    cmdList[j].texture && cmdList[j].texture.bind(0);
                    shader.uniforms.uTILE.set(cmdList[j].tile);
                    shader.uniforms.uMODEL.set(cmdList[j].model);
                    GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_INT, 0);
                }
            }
        }
        { // sprites
            // setup
            const shader = this.shaders.sprite;
            shader.bind();
            shader.uniforms.uVIEW.set(this.camera!.view);
            shader.uniforms.uPROJECTION.set(this.camera!.projection);
            // TODO(speed): multiple textures
            shader.uniforms.uTEXTURE.set(0);
            this.vao.quad.bind();
            const commands = this.commands.sprite;

            // draw
            const layers = Object.keys(commands).sort((a, b) => +a - +b);
            for (let i = 0, len = layers.length; i < len; ++i) {
                const cmdList = commands[+layers[i]];
                for (let j = 0, len = cmdList.length; j < len; ++j) {
                    cmdList[j].texture && cmdList[j].texture.bind(0);
                    shader.uniforms.uUV.set(cmdList[j].uv);
                    shader.uniforms.uMODEL.set(cmdList[j].model);
                    GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_INT, 0);
                }
            }
        }
        { // lines
            // setup
            const shader = this.shaders.line;
            shader.bind();
            shader.uniforms.uVIEW.set(this.camera!.view);
            shader.uniforms.uPROJECTION.set(this.camera!.projection);
            this.vao.line.bind();
            const buffer = this.buffers.line;

            // draw
            buffer.gpu.upload(new Float32Array(buffer.cpu), 0);
            GL.drawArrays(GL.LINES, 0, buffer.cpu.length / 6);
        }
        { // points
            // setup
            const shader = this.shaders.point;
            shader.bind();
            shader.uniforms.uVIEW.set(this.camera!.view);
            shader.uniforms.uPROJECTION.set(this.camera!.projection);
            this.vao.point.bind();
            const buffer = this.buffers.point;

            // draw
            buffer.gpu.upload(new Float32Array(buffer.cpu), 0);
            GL.drawArrays(GL.LINES, 0, buffer.cpu.length / 5);
        }

        this.commands.sprite = [];
        this.commands.tile = [];
        this.buffers.point.cpu = [];
        this.buffers.line.cpu = [];
    }
}