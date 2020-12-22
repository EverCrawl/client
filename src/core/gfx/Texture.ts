import { createTexture } from "./Common";
import { ErrorKind, GLError } from "./Error";

export interface TextureBaseOptions {
    internalFormat?: GLenum;
    format?: GLenum;
    type?: GLenum;
    wrap_s?: GLenum;
    wrap_t?: GLenum;
    filter_min?: GLenum;
    filter_mag?: GLenum;
    mipmap?: boolean;
}
export interface TextureImage2DOptions extends TextureBaseOptions {
    path: string;
}
export interface TextureAtlasOptions extends TextureBaseOptions {
    path: string;
    tilesize: number;
    wrap_r?: GLenum;
}
export type TextureBuffer = ArrayBufferView & { length: number, [n: number]: number };
export interface TextureBufferOptions extends TextureBaseOptions {
    buffer: TextureBuffer;
    width: number;
    height: number;
}
export type TextureSlot = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31;

export const enum TextureKind {
    Image2D, Atlas, Buffer
}

export class Texture {
    private static ID_SEQUENCE = 0;
    public readonly id: number;
    public readonly handle: WebGLTexture;
    private target!: GLenum;

    private constructor(
        public readonly gl: WebGL2RenderingContext,
        private image: HTMLImageElement,
        private kind: TextureKind,
        private options: any
    ) {
        this.id = Texture.ID_SEQUENCE++;
        this.gl = gl;
        this.handle = createTexture(this.gl);
        this.image.onload = () => {
            switch (this.kind) {
                case TextureKind.Image2D:
                    this.target = this.gl.TEXTURE_2D
                    sampleImage(this.gl, this.handle, this.image, this.options);
                    break;
                case TextureKind.Atlas:
                    this.target = this.gl.TEXTURE_2D_ARRAY
                    sampleAtlas(this.gl, this.handle, this.image, this.options);
                    break;
                case TextureKind.Buffer:
                    this.target = this.gl.TEXTURE_2D
                    sampleImage(this.gl, this.handle, this.image, this.options);
                    break;
            }
            this.image.onload = null;
        }
    }

    get width() {
        return this.image.naturalWidth;
    }

    get height() {
        return this.image.naturalHeight;
    }

    bind(slot: TextureSlot) {
        if (!this.target) return;
        this.gl.activeTexture(this.gl.TEXTURE0 + slot);
        this.gl.bindTexture(this.target, this.handle);
    }

    private static readonly imageCache = new Map<string, HTMLImageElement>();
    static create(gl: WebGL2RenderingContext, kind: TextureKind.Image2D, options: TextureImage2DOptions): Texture;
    static create(gl: WebGL2RenderingContext, kind: TextureKind.Atlas, options: TextureAtlasOptions): Texture;
    static create(gl: WebGL2RenderingContext, kind: TextureKind.Buffer, options: TextureBufferOptions): Texture;
    static create(gl: WebGL2RenderingContext, kind: TextureKind, options: any): Texture {
        let img;
        switch (kind) {
            case TextureKind.Image2D: {
                const path = (options as TextureImage2DOptions).path;
                img = Texture.imageCache.get(path);
                if (!img) {
                    img = new Image();
                    img.src = path;
                }
            } break;
            case TextureKind.Atlas: {
                const path = (options as TextureAtlasOptions).path;
                img = Texture.imageCache.get(path);
                if (!img) {
                    img = new Image();
                    img.src = path;
                }
            } break;
            case TextureKind.Buffer: {
                img = toImageElement(
                    (options as TextureBufferOptions).buffer,
                    (options as TextureBufferOptions).width,
                    (options as TextureBufferOptions).height);
            } break;
        }
        return new Texture(gl, img, kind, options);
    }
}


const BufferHelperCtx: CanvasRenderingContext2D = (() => {
    const canvas = document.createElement("canvas")!;
    return canvas.getContext("2d")!;
})();
function toImageElement(buffer: TextureBuffer, width: number, height: number) {
    BufferHelperCtx.canvas.width = width;
    BufferHelperCtx.canvas.height = height;
    BufferHelperCtx.clearRect(0, 0, BufferHelperCtx.canvas.width, BufferHelperCtx.canvas.height);
    const imgData = BufferHelperCtx.getImageData(0, 0, width, height);
    imgData.data.set(buffer);
    BufferHelperCtx.putImageData(imgData, 0, 0);

    const img = new Image();
    img.src = BufferHelperCtx.canvas.toDataURL();
    return img;
}

function sampleImage(gl: WebGL2RenderingContext, texture: WebGLTexture, image: HTMLImageElement, options: TextureBaseOptions) {
    const target = gl.TEXTURE_2D;
    gl.bindTexture(target, texture);
    gl.texImage2D(target, 0,
        options.internalFormat ?? gl.RGBA,
        options.format ?? gl.RGBA,
        options.type ?? gl.UNSIGNED_BYTE,
        image);
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, options.wrap_s ?? gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, options.wrap_t ?? gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, options.filter_min ?? gl.NEAREST);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, options.filter_mag ?? gl.NEAREST);
    if (options.mipmap !== false) gl.generateMipmap(target);
    gl.bindTexture(target, null);
}

const AtlasHelperCtx: CanvasRenderingContext2D = (() => {
    const canvas = document.createElement("canvas")!;
    return canvas.getContext("2d")!;
})();
function sampleAtlas(gl: WebGL2RenderingContext, texture: WebGLTexture, image: HTMLImageElement, options: TextureAtlasOptions) {
    const target = gl.TEXTURE_2D_ARRAY;
    const internalFormat = options.internalFormat ?? gl.RGBA;
    const inputFormat = options.format ?? gl.RGBA;
    const inputType = options.type ?? gl.UNSIGNED_BYTE;
    const columns = image.width / options.tilesize;
    const rows = image.height / options.tilesize;
    const depth = columns * rows;

    // resize helper canvas
    AtlasHelperCtx.canvas.width = options.tilesize;
    AtlasHelperCtx.canvas.height = options.tilesize;

    // allocate storage
    gl.bindTexture(target, texture);
    gl.texImage3D(target, 0,
        internalFormat,
        options.tilesize, options.tilesize, depth, 0,
        inputFormat, inputType, null);
    // draw each tile onto the canvas, and then place it in the texture array
    for (let col = 0; col < columns; ++col) {
        for (let row = 0; row < rows; ++row) {
            AtlasHelperCtx.clearRect(0, 0, options.tilesize, options.tilesize);
            const x = col * options.tilesize;
            const y = row * options.tilesize;
            AtlasHelperCtx.drawImage(image,
                x, y, options.tilesize, options.tilesize,
                0, 0, options.tilesize, options.tilesize);
            const data = AtlasHelperCtx.getImageData(0, 0, options.tilesize, options.tilesize);

            const layer = col + row * columns;
            gl.texSubImage3D(target, 0,
                0, 0, layer,
                options.tilesize, options.tilesize,
                1,
                inputFormat, inputType,
                data);
        }
    }
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, options.wrap_s ?? gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, options.wrap_t ?? gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_WRAP_R, options.wrap_t ?? gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, options.filter_min ?? gl.NEAREST);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, options.filter_mag ?? gl.NEAREST);
    if (options.mipmap !== false) gl.generateMipmap(target);

    gl.bindTexture(target, null);
}