import { createTexture } from "./Common";
import { ErrorKind, GLError } from "./Error";

interface TextureSampleOptions {
    /** @default RGBA */
    internalFormat?: GLenum;
    /** @default RGBA */
    format?: GLenum;
    /** @default UNSIGNED_BYTE */
    type?: GLenum;
    /** @default REPEAT */
    wrap_s?: GLenum;
    /** @default REPEAT */
    wrap_t?: GLenum;
    /** @default NEAREST */
    filter_min?: GLenum;
    /** @default NEAREST */
    filter_max?: GLenum;
}

type TextureSlot = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31;

export class Texture {
    private static readonly imageCache = new Map<string, HTMLImageElement>();

    public readonly gl: WebGL2RenderingContext;
    public readonly handle: WebGLTexture;

    constructor(
        gl: WebGL2RenderingContext,
        url: string,
        target: GLenum = gl.TEXTURE_2D,
        options: TextureSampleOptions = {}
    ) {
        if (DEBUG) {
            // just incase i try to use them
            if (target === gl.TEXTURE_3D || target === gl.TEXTURE_2D_ARRAY) {
                throw new GLError(ErrorKind.Unsupported, { what: "3D textures", plural: true });
            }
        }

        this.gl = gl;
        this.handle = createTexture(this.gl);

        let image = Texture.imageCache.get(url);
        if (image) {
            sampleImage(this.gl, this.handle, image, target, options);
        } else {
            image = new Image();
            image.onload = () => {
                Texture.imageCache.set(url, image!);
                sampleImage(this.gl, this.handle, image!, target, options);
            }
            image.src = url;
        }
    }

    bind(slot: TextureSlot) {
        this.gl.activeTexture(this.gl.TEXTURE0 + slot);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.handle);
    }
}

function sampleImage(gl: WebGL2RenderingContext, texture: WebGLTexture, image: HTMLImageElement, target: GLenum, options: TextureSampleOptions) {
    gl.bindTexture(target, texture);
    gl.texImage2D(target, 0,
        options.internalFormat ?? gl.RGBA,
        options.format ?? gl.RGBA,
        options.type ?? gl.UNSIGNED_BYTE,
        image);
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, options.wrap_s ?? gl.REPEAT);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, options.wrap_t ?? gl.REPEAT);
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, options.filter_min ?? gl.NEAREST);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, options.filter_max ?? gl.NEAREST);
    gl.generateMipmap(target);
    gl.bindTexture(target, null);
}