
import { Texture, TextureKind, TileRenderer } from "core/gfx";
import { AABB, v2, Vector2 } from "core/math";
import { parseBool } from "core/utils";
import { TiledParser } from "./Parser";
import { Tiled } from "./Tiled";

// TODO: broad phase
function buildNarrowPhasePrimitives(layer: string, chunks: Tiled.LayerDataChunk[], size: Vector2): AABB[] {
    // phase #1: join contiguous tiles in the same row
    const rows: { x: number; y: number; length: number; }[] = [];
    let currentRow: { x: number; y: number; length: number; } | null = null;

    for (let y = -size[1] / 2; y < size[1] / 2; ++y) {
        for (let x = -size[0] / 2; x < size[0] / 2; ++x) {
            const layerX = x + (size[0] / 2);
            const layerY = y + (size[1] / 2);

            let collidable = false;
            for (const chunk of chunks) {
                if (x < chunk.x || x > chunk.x + chunk.width) continue;
                if (y < chunk.y || y > chunk.y + chunk.height) continue;
                const chunkX = layerX % chunk.width;
                const chunkY = layerY % chunk.height;

                const tile = chunk.tiles[chunkX + chunkY * chunk.width];
                const tileInfo = tile?.tileset.tiles[tile.id];
                collidable = parseBool(tileInfo?.properties["collision"]?.value ?? "false")!;
            }

            if (collidable) {
                // if so, add it to the current row
                // if it doesn't exist, create a new one
                if (!currentRow) {
                    currentRow = {
                        x, y,
                        length: 1
                    }
                } else {
                    currentRow.length++;
                }
            } else {
                // if the tile isn't collidable, but we have a row
                // then end the current row
                if (currentRow) {
                    rows.push(currentRow);
                    currentRow = null;
                }
            }
        }
        // after we've looped over an entire tile row
        // deposit whatever we have
        if (currentRow) {
            rows.push(currentRow);
            currentRow = null;
        }
    }

    // phase #2: join adjacent rows with the same x and length
    const rowGroups: { x: number; y: number; length: number; }[][] = [];
    let lastRow: { x: number; y: number; length: number; } | undefined;
    let currentRowGroup: { x: number; y: number; length: number; }[] = [];

    // scan x-first
    for (let x = -size[0] / 2; x < size[0] / 2; ++x) {
        for (const row of rows) {
            if (row.x !== x) continue;

            if (!lastRow) {
                lastRow = row;
                currentRowGroup.push(row);
                continue;
            }

            const sameX = lastRow.x === row.x;
            const adjacent = (lastRow.y + 1 === row.y) || (lastRow.y - 1 === row.y);
            const sameLength = lastRow.length === row.length;
            if (sameX && adjacent && sameLength) {
                currentRowGroup.push(row);
            } else {
                rowGroups.push(currentRowGroup);
                currentRowGroup = [row];
            }
            lastRow = row;
        }
    }
    if (!currentRowGroup.empty()) rowGroups.push(currentRowGroup);

    // phase #3: convert row groups into AABBs
    const result: AABB[] = [];
    for (const group of rowGroups) {
        const first = group.front();
        const last = group.back();
        let min_x = first.x * 32 - 16;
        let max_x = first.x * 32 + (last.length - 1) * 32 + 16;
        let min_y = first.y * 32 - 16;
        let max_y = last.y * 32 + 16;

        let half = v2(
            (max_x - min_x) / 2,
            (max_y - min_y) / 2
        );
        let center = v2(
            (max_x + min_x) / 2,
            (max_y + min_y) / 2
        );
        result.push(new AABB(center, half))
    }

    return result;
}

interface Layer {
    id: number;
    name: string;
    collidables: AABB[];
    chunks: Tiled.LayerDataChunk[];
}

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

            this.size = calcRealMapSize(mapData);

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
                    collidables: buildNarrowPhasePrimitives(layer.name, layer.data.chunks, this.size),
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