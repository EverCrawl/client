
import { createTexture, SpriteRenderer, Texture, TextureKind, TileRenderer } from "core/gfx";
import { v2 } from "core/math";

const build_path = (...args: string[]) => {
    return args.map((part, i) => {
        if (i === 0) {
            return part.trim().replace(/[\/]*$/g, '')
        } else {
            return part.trim().replace(/(^[\/]*|[\/]*$)/g, '')
        }
    }).filter(x => x.length).join('/')
}

function calculate_tile_uv(tile: number, tileSize: number, atlasWidth: number, altasHeight: number) {
    const tile_id = tid(tile);

    // tiles per row
    const perRow = atlasWidth / tileSize;
    // the width/height of a single tile
    // width -> (0, width) mapped to (0, 1)
    // height -> (0, height) mapped to (0, 1)
    const singeTileUV = v2(tileSize / atlasWidth, tileSize / altasHeight);

    const col = Math.floor(tile_id / perRow);
    const row = ((altasHeight / tileSize) - 1) - tile_id % perRow;
    const minU = col * singeTileUV[0];
    const minV = row * singeTileUV[1];
    const maxU = singeTileUV[0] - 1 / atlasWidth;
    const maxV = singeTileUV[1] - 1 / altasHeight;
    return { minU, minV, maxU, maxV };
}

export function tid(tile: number) {
    return (tile & 0b0000001111111111);
}

export function tsid(tile: number) {
    return (tile & 0b1111110000000000) >> 10;
}

interface TileMapJson {
    name: string,
    columns: number,
    rows: number,
    tileSize: number;
    tiles: number[],
    tileSets: string[]
}

export class TileMap {
    name: string = "";
    columns: number = 0;
    rows: number = 0;
    tilesize: number = 0;
    // TODO: put all the tilesets in a 3d texture
    tilesets: Texture[] = [];
    tiles: number[] = [];

    constructor(
        public readonly gl: WebGL2RenderingContext,
        public readonly path: string
    ) {

        (async () => {
            const basePath = path.substr(0, path.lastIndexOf("/"));
            const res = await fetch(path);
            const json: TileMapJson = await res.json();

            // TODO: try texture arrays
            // array of 32x32 textures, indexed by raw tex coords and then with tile id as the 3rd coord
            this.name = json.name;
            this.columns = json.columns;
            this.rows = json.rows;
            this.tilesize = json.tileSize;
            this.tiles = json.tiles;
            this.tilesets = [];
            for (const path of json.tileSets) {
                const abs = build_path(basePath, path);
                this.tilesets.push(Texture.create(gl, TextureKind.Atlas, { path: abs, tilesize: 32, mipmap: false }));
            };
        })();
    }

    draw(renderer: TileRenderer) {
        const half_tilesize = this.tilesize / 2;
        for (let row = 0; row < this.rows; ++row) {
            for (let column = 0; column < this.columns; ++column) {
                const tile = this.tiles[column + row * this.columns];
                const atlas = this.tilesets[tsid(tile)];
                renderer.draw(atlas, -1,
                    tid(tile),
                    v2(half_tilesize + column * this.tilesize, half_tilesize + row * this.tilesize),
                    0,
                    v2(half_tilesize, half_tilesize));
            }
        }
    }
}

/* function RGBToHex(r: number, g: number, b: number) {
    let R = r.toString(16);
    let G = g.toString(16);
    let B = b.toString(16);

    if (R.length === 1) R = "0" + R;
    if (G.length === 1) G = "0" + G;
    if (B.length === 1) B = "0" + B;

    return `#${r}${g}${b}`;
}

function CreateTileMapIndexTexture(
    gl: WebGL2RenderingContext,
    tiles: number[],
    rows: number,
    columns: number
): Texture {

    const data: number[] = [];
    let count = 0;
    for (let row = 0; row < rows; ++row) {
        for (let col = 0; col < columns; ++col) {
            const tile = tiles[col + row * columns];
            const id = tid(tile);
            const x = Math.floor(id / columns);
            const y = Math.floor(id % columns);

            // encode tile into the texture by splitting the bits
            data[count++] = x;//(tile & 0b11111111_00000000); // 8 bits
            data[count++] = y;//(tile & 0b00000000_11111111); // 8 bits
            //data[count++] = 0;
            //data[count++] = 255;
        }
    }

    return Texture.from(gl,
        new Uint8Array(data),
        gl.TEXTURE_2D,
        { internalFormat: gl.RG8UI, format: gl.RG_INTEGER, type: gl.UNSIGNED_BYTE, width: columns, height: rows, mipmap: false }
    );
}

// FINISH THIS
// some inspiration
// http://www.connorhollis.com/fast-tilemap-shader/
// https://codepen.io/goodboydigital/pen/vdvEmE?editors=0010
export const TileMapShader = {
    vertex: `#version 300 es
precision mediump float;
precision mediump usampler2D;

uniform mat4 uVIEW;
uniform mat4 uPROJECTION;

uniform mat3 uMODEL;

uniform usampler2D uMAP;

layout(location = 0) in vec2 aPOSITION;
layout(location = 1) in vec2 aTEXCOORD;

out vec2 vTEXCOORD;

mat4 scale2D(int x, int y)
{
    return mat4(mat2(x, 0, 0, y));
}

void main()
{
    // flip tex coords on y axis
    vTEXCOORD = vec2(aTEXCOORD.x, 1.0f - aTEXCOORD.y);

    // scale tex coords by number of tiles
    ivec2 num_tiles = textureSize(uMAP, 0);
    vec4 scaled_uv = (scale2D(num_tiles.x, num_tiles.y) * vec4(vTEXCOORD, 0, 1));
    vTEXCOORD = scaled_uv.xy;

    // transform quad
    vec3 transformed = uMODEL * vec3(aPOSITION, 1.0);
    gl_Position = uPROJECTION * uVIEW * vec4(transformed.xy, 0.0, 1.0);
}`,
    fragment: `#version 300 es
precision mediump float;
precision mediump usampler2D;

uniform usampler2D uMAP;
uniform sampler2D uATLAS;

in vec2 vTEXCOORD;

out vec4 oFRAG;

// TODO: variable tilesize
void main()
{
    ivec2 mapCoord = ivec2(vTEXCOORD);
    uvec4 data = texelFetch(uMAP, mapCoord, 0);

    vec2 texCoord = fract(vTEXCOORD);

    ivec2 num_tiles = textureSize(uMAP, 0);
    vec2 uv = (vec2(data.xy) + texCoord) / vec2(num_tiles);

    oFRAG = texture(uATLAS, uv);
}`
}; */