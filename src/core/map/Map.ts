
import { Texture, TextureKind, TileRenderer } from "core/gfx";
import { v2, Vector2 } from "core/math";
import { parseBool } from "core/utils";
import { TiledParser } from "./Parser";
import { Tiled } from "./Tiled";

interface CollisionData {
    [x: number]: {
        [y: number]: boolean;
    }
}

function getCollisionData(layer: string, chunks: Tiled.LayerDataChunk[], size: Vector2): CollisionData {
    const out: CollisionData = {};
    for (const chunk of chunks) {
        for (let x = 0; x < chunk.width; ++x) {
            const layerX = x + chunk.x;
            if (out[layerX] == null) out[layerX] = {};
            for (let y = 0; y < chunk.height; ++y) {
                const layerY = y + chunk.y;
                const tile = chunk.tiles[x + y * chunk.width];
                const tileInfo = tile?.tileset.tiles[tile.id];
                const collisionInfo = tileInfo?.properties["collision"]?.value ?? "false";

                out[layerX][layerY] = parseBool(collisionInfo)!;
            }
        }
    }
    return out;
}

interface Layer {
    id: number;
    name: string;
    collision: CollisionData;
    chunks: Tiled.LayerDataChunk[];
}

export class TileMap {

    tilesets: Texture[] = [];
    layers: Layer[] = [];
    size: Vector2 = v2();

    constructor(
        gl: WebGL2RenderingContext,
        path: string,
    ) {
        (async () => {
            const mapData = TiledParser.parse(await (await fetch(path)).text());

            this.size = v2(mapData.width, mapData.height);

            for (let tileset of mapData.tilesets) {
                this.tilesets.push(
                    Texture.create(gl, TextureKind.Atlas, {
                        path: tileset.image.source,
                        tilesize: 32
                    })
                );
            }

            for (let layer of mapData.layers) {
                /* const flippedChunks = [];
                for (const chunk of layer.data.chunks) {
                    flippedChunks.push(flipChunkVertical(chunk));
                } */

                this.layers.push({
                    id: layer.id,
                    name: layer.name,
                    collision: getCollisionData(layer.name, layer.data.chunks, this.size),
                    chunks: layer.data.chunks
                });
            }

            console.log("finished loading:", path);
        })();
    }

    private drawChunk(renderer: TileRenderer, position = v2(), lid: number, chunk: Tiled.LayerDataChunk) {
        for (let y = 0; y < chunk.height; ++y) {
            for (let x = 0; x < chunk.width; ++x) {
                const tile = chunk.tiles[x + y * chunk.width];
                if (tile == null) continue;

                // TODO: multiple tilesets
                renderer.draw(this.tilesets[0], lid,
                    tile.id,
                    v2(position[0] + x * 32, position[1] + y * 32),
                    0,
                    v2(16, 16));
            }
        }
    }

    draw(renderer: TileRenderer, position = v2()) {
        let layer_id = -5;
        for (const layer of this.layers) {
            for (const chunk of layer.chunks) {
                this.drawChunk(renderer,
                    v2(
                        position[0] + chunk.x * 32,
                        position[1] + chunk.y * 32
                    ),
                    layer_id++,
                    chunk
                );
            }
        }
    }

    collides(tile: Vector2) {
        for (const layer of this.layers) {
            const collides = layer.collision[tile[0]][tile[1]];
            if (collides) return true;
        }

        return false;
    }
}

/* function flipChunkVertical(chunk: Tiled.LayerDataChunk): Tiled.LayerDataChunk {
    const tiles = [];
    for (let y = 0; y < chunk.height; ++y) {
        for (let x = 0; x < chunk.width; ++x) {
            let newY = chunk.height - y - 1;
            tiles[x + newY * chunk.width] = chunk.tiles[x + y * chunk.width];
        }
    }

    return {
        x: chunk.x,
        y: (chunk.y * (-1)) - chunk.height + 1,
        width: chunk.width,
        height: chunk.height,
        tiles
    };
} */