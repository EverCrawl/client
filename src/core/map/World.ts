
import { Renderer, Texture, TextureKind } from "core/gfx";
import { v2, Vector2 } from "core/math";
import { Path } from "core/utils";
import { World as LWorld } from "ldtk";

export class World {

    private ready_ = false;
    private lworld!: LWorld;
    private loadingLevel: string | null = null;
    private currentLevel: string | null = null;
    private clTilesets: Record<number, Texture> = {};
    private clBackground: Texture | null = null;

    constructor(private path: string) {
        LWorld.fromURL(path).then(world => {
            console.log(`Loading world '${path}'...`);
            this.lworld = world;
            this.ready_ = true;
            console.log(`Finished loading world '${path}'`);
        });
    }

    get ready() { return this.ready_; }

    set level(id: string) {
        if (!this.ready || id === this.currentLevel || id === this.loadingLevel) return;

        this.currentLevel = null;
        this.loadingLevel = id;
        this.ready_ = false;
        console.log(`Loading level '${id}'...`);

        this.lworld.loadLevel(id).then(async _ => {
            this.clTilesets = {};
            const level = this.lworld.levelMap[id];
            const promises = [];
            // load bg
            if (level.background.path != null) {
                promises.push(new Promise<void>((resolve, reject) => {
                    const path = Path.resolve(Path.dirname(this.path), level.background.path!);
                    console.log(`Background '${path}'...`)
                    const bg = Texture.create(TextureKind.Image2D, { path });
                    bg.onload = () => this.clBackground = bg, resolve();
                    bg.onerror = ev => reject(ev);
                }));
            }
            // load tilesets
            for (const layer of level.layers) {
                if (layer.tileset == null) continue;
                promises.push(new Promise<void>((resolve, reject) => {
                    const path = Path.resolve(Path.dirname(this.path), layer.tileset!.path);
                    console.log(`Tileset #${layer.tileset!.uid} '${path}'...`);
                    const ts = Texture.create(TextureKind.Atlas, { path, tilesize: layer.tileset!.gridSize });
                    ts.onload = () => this.clTilesets[layer.tileset!.uid] = ts, resolve();
                    ts.onerror = ev => reject(ev);
                }));
            }
            await Promise.all(promises);

            this.currentLevel = id;
            this.loadingLevel = null;
            this.ready_ = true;
            console.log(`Finished loading level '${id}'`);
        });
    }

    render(renderer: Renderer, worldOffset: Vector2) {
        if (!this.ready || this.currentLevel == null) return;
        const level = this.lworld.levelMap[this.currentLevel];
        if (level == null) return;
        /* debugger; */

        // layer:           rendered:
        // background       <-- here
        // tiles            <-- here
        // static entities  <-- here
        // player           <-- elsewhere

        for (let li = 0; li < level.layers.length; ++li) {
            const layer = level.layers[li];
            // no tileset = can't render
            if (layer.tileset == null) continue;
            // can only render Tile layers (for now)
            // TODO: render entity layers
            if (layer.type === "Tiles") {
                const tileset = this.clTilesets[layer.tileset.uid];
                const scale = v2(layer.tileset.gridSize / 2, layer.tileset.gridSize / 2);
                for (let ti = 0; ti < layer.gridTiles!.length; ++ti) {
                    const tile = layer.gridTiles![ti];
                    const pos = v2(
                        tile.px[0] + worldOffset[0],
                        tile.px[1] + worldOffset[1]
                    );
                    renderer.command.tile(
                        tileset,
                        -5 + li, // TODO: standard layers + layer enum
                        tile.t,
                        pos, 0, scale);
                }
            }
        }
    }
}