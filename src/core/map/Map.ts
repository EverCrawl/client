
import { Renderer, Texture, TextureKind } from "core/gfx";
import { AABB, v2, v3, v4, Vector2 } from "core/math";
import { parseBool, Array2D } from "core/utils";
import { TiledParser } from "./Parser";
import { Tiled } from "./Tiled";

function calcRealMapSize(map: Tiled.TileMap): Vector2 {
    // real size = max_pos - min_pos

    let min_x = Infinity;
    let min_y = Infinity;
    let max_x = -Infinity;
    let max_y = -Infinity;

    for (const layer of map.layers) {
        for (const chunk of layer.data.chunks) {
            if (chunk.x < min_x) min_x = chunk.x;
            if (chunk.y < min_y) min_y = chunk.y;
            if (chunk.x + chunk.width > max_x) max_x = chunk.x + chunk.width;
            if (chunk.y + chunk.height > max_y) max_y = chunk.y + chunk.height;
        }
    }

    return v2(
        max_x - min_x,
        max_y - min_y
    );
}

function flattenChunks(chunks: Tiled.LayerDataChunk[], size: Vector2): Array2D<Tile | null> {
    const result: Array2D<Tile | null> = [];
    for (const chunk of chunks) {
        for (let y = 0; y < chunk.height; ++y) {
            for (let x = 0; x < chunk.width; ++x) {
                const tile = chunk.tiles[x + y * chunk.width];
                const mapX = x + chunk.x + size[0] / 2;
                const mapY = y + chunk.y + size[1] / 2;
                if (!result[mapX]) {
                    result[mapX] = [];
                }
                result[mapX][mapY] = null;
                if (tile != null) {
                    result[mapX][mapY] = {
                        properties: tile.tileset.tiles[tile.id]?.properties ?? {},
                        ...tile
                    };
                }
            }
        }
    }
    return result;
}

export interface Tile {
    tileset: Tiled.TileSet;
    id: number;
    collision: boolean;
    properties: { [name: string]: Tiled.Property }
}

interface Layer {
    id: number;
    name: string;
    /* collidables: AABB[]; */
    tiles: Array2D<Tile | null>;
    /* chunks: Tiled.LayerDataChunk[]; */
}

export class TileMap {
    private static cache: Map<string, TileMap> = new Map();

    ready = false;

    tilesets: Texture[] = [];
    layers: Layer[] = [];
    size: Vector2 = v2();

    constructor(
        path: string
    ) {
        if (TileMap.cache.has(path)) return TileMap.cache.get(path)!;
        (async () => {
            const mapData = TiledParser.parse(await (await fetch(path)).text(), path);

            this.size = calcRealMapSize(mapData);

            for (let tileset of mapData.tilesets) {
                this.tilesets.push(
                    Texture.create(TextureKind.Atlas, {
                        path: tileset.image.source,
                        tilesize: 32
                    })
                );
            }

            for (let layer of mapData.layers) {
                this.layers.push({
                    id: layer.id,
                    name: layer.name,
                    /* collidables: buildNarrowPhasePrimitives(layer.name, layer.data.chunks, this.size), */
                    tiles: flattenChunks(layer.data.chunks, this.size),
                    /* chunks: layer.data.chunks, */
                });
            }

            TileMap.cache.set(path, this);
            console.log(`finished loading ${path}`, this);
            this.ready = true;
        })();
    }

    draw(renderer: Renderer, position = v2()) {
        let layer_id = -10;
        for (let y = 0; y < this.size[1]; ++y) {
            for (let x = 0; x < this.size[0]; ++x) {
                for (const layer of this.layers) {
                    const tile = layer.tiles[x][y];
                    if (tile == null) continue;

                    const tilePos = v2(position[0] + x * 32 + 16, position[1] + y * 32 + 16);
                    renderer.command.tile(this.tilesets[0], layer_id++,
                        tile.id,
                        tilePos,
                        0,
                        v2(16, 16));
                }
            }
        }
    }
}
