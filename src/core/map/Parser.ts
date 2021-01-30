
import { Tiled } from "./Tiled";
import { Path } from "core";
import { parseBool } from "core/utils";

function getChildrenByTagName(element: Element | Document, tagName: string): Element[] {
    const result = [];
    const children = element.children;
    for (let i = 0; i < children.length; ++i) {
        const child = children.item(i);
        if (child != null && child.tagName === tagName) {
            result.push(child);
        }
    }
    return result;
}

function getAttribute(element: Element, name: string): string | undefined {
    return element.attributes.getNamedItem(name)?.value;
}

function defaultValue(type: Tiled.PropertyType): string | number | boolean {
    switch (type) {
        case Tiled.PropertyType.String: return "";
        case Tiled.PropertyType.Int: return 0;
        case Tiled.PropertyType.Float: return 0;
        case Tiled.PropertyType.Bool: return false;
        case Tiled.PropertyType.Color: return "#00000000";
        case Tiled.PropertyType.File: return ".";
        case Tiled.PropertyType.Object: return -1;
    }
}

function parseValue(type: Tiled.PropertyType, value: any): string | number | boolean {
    switch (type) {
        case Tiled.PropertyType.String: return value;
        case Tiled.PropertyType.Int: return parseInt(value);
        case Tiled.PropertyType.Float: return parseFloat(value);
        case Tiled.PropertyType.Bool: return parseBool(value)!;
        case Tiled.PropertyType.Color: return value;
        case Tiled.PropertyType.File: return value;
        case Tiled.PropertyType.Object: return value;
    }
}

function validateType(type: string): Tiled.PropertyType {
    switch (type) {
        case Tiled.PropertyType.String: return type;
        case Tiled.PropertyType.Int: return type;
        case Tiled.PropertyType.Float: return type;
        case Tiled.PropertyType.Bool: return type;
        case Tiled.PropertyType.Color: return type;
        case Tiled.PropertyType.File: return type;
        case Tiled.PropertyType.Object: return type;
        default: throw new Error(`Invalid property type ${type}`);
    }
}

function parseProperties(properties: Element | undefined): Tiled.Properties {
    if (properties == null) return {};

    const result: Tiled.Properties = {};
    const children = properties.children;
    for (let i = 0; i < children.length; ++i) {
        const property = children.item(i);
        if (!property) continue;

        let name: string | undefined = property.attributes.getNamedItem("name")?.value;
        if (name == null) throw new Error(`Failed to parse property, missing name`);

        let type: Tiled.PropertyType | undefined = property.attributes.getNamedItem("type")?.value as Tiled.PropertyType | undefined;
        if (type == null) throw new Error(`Failed to parse property, missing type`);
        else type = validateType(type);

        let value: string | number | boolean | undefined = property.attributes.getNamedItem("value")?.value;
        if (value == null) {
            value = defaultValue(type);
        } else {
            value = parseValue(type, value);
        }

        result[name] = { type, value };
    }
    return result;
}

function parseTilesets(tilesets: Element[], base: string): Tiled.TileSet[] {
    const result: Tiled.TileSet[] = [];

    let id = 0;
    for (const data of tilesets) {
        const firstgid = getAttribute(data, "firstgid");
        if (firstgid == null) throw new Error(`Missing TileSet firstgid`);
        const name = getAttribute(data, "name");
        if (name == null) throw new Error(`Missing TileSet name`);
        const tilewidth = getAttribute(data, "tilewidth");
        if (tilewidth == null) throw new Error(`Missing TileSet name`);
        const tileheight = getAttribute(data, "tileheight");
        if (tileheight == null) throw new Error(`Missing TileSet name`);
        const tilecount = getAttribute(data, "tilecount");
        if (tilecount == null) throw new Error(`Missing TileSet name`);
        const columns = getAttribute(data, "columns");
        if (columns == null) throw new Error(`Missing TileSet columns`);

        const imgNode = getChildrenByTagName(data, "image")[0];
        const source = getAttribute(imgNode, "source");
        if (source == null) throw new Error(`Missing TileSet Image source`);
        const width = getAttribute(imgNode, "width");
        if (width == null) throw new Error(`Missing TileSet Image width`);
        const height = getAttribute(imgNode, "height");
        if (height == null) throw new Error(`Missing TileSet Image height`);
        const image: Tiled.Image = { source: Path.resolve(Path.dirname(base), source), width: parseInt(width), height: parseInt(height) };

        const tiles: { [id: number]: Tiled.TileSet_Tile } = {};
        const tileNodes = getChildrenByTagName(data, "tile");
        for (const tile of tileNodes) {
            const id = getAttribute(tile, "id");
            if (id == null) throw new Error(`Missing TileSet Tile id`);
            tiles[parseInt(id)] = {
                properties: parseProperties(getChildrenByTagName(tile, "properties")[0])
            };
        }

        result.push({
            id: id++,
            firstgid: parseInt(firstgid),
            name,
            tilewidth: parseInt(tilewidth),
            tileheight: parseInt(tileheight),
            tilecount: parseInt(tilecount),
            columns: parseInt(columns),
            image,
            tiles
        });
    }

    return result;
}

function decodeTile(tile: string, tilesets: Tiled.TileSet[]): Tiled.Tile | null {
    for (let i = tilesets.length - 1; i >= 0; --i) {
        const gid = parseInt(tile) & ~(0x80000000 | 0x40000000 | 0x20000000);
        if (tilesets[i].firstgid <= gid) {
            const id = gid - tilesets[i].firstgid;
            const collision = tilesets[i].tiles[id]?.properties["collision"]?.value ?? false;
            return {
                tileset: tilesets[i],
                id,
                collision,
            }
        }
    }
    return null;
}

function parseLayerData(data: Element, tilesets: Tiled.TileSet[]): Tiled.LayerData {
    const encoding = getAttribute(data, "encoding") as Tiled.LayerDataEncoding | undefined;
    if (encoding == null) throw new Error(`Missing Layer Data encoding`);
    if (encoding !== Tiled.LayerDataEncoding.CSV) throw new Error(`Only CSV chunk encoding is supported!`);

    const chunks: Tiled.LayerDataChunk[] = [];
    const chunkData = getChildrenByTagName(data, "chunk");
    if (chunkData.empty()) {
        console.warn(`Empty tile map layer ${getAttribute(data.parentElement!, "name")}`)
    }
    for (const chunk of chunkData) {
        const x = getAttribute(chunk, "x");
        if (x == null) throw new Error(`Missing Layer Data Chunk x`);
        const y = getAttribute(chunk, "y");
        if (y == null) throw new Error(`Missing Layer Data Chunk y`);
        const width = getAttribute(chunk, "width");
        if (width == null) throw new Error(`Missing Layer Data Chunk width`);
        const height = getAttribute(chunk, "height");
        if (height == null) throw new Error(`Missing Layer Data Chunk height`);

        const rawTiles = chunk.textContent?.replace(/\s+/g, "").split(",");
        if (rawTiles == null) throw new Error(`Empty chunk`);
        let tiles: (Tiled.Tile | null)[] = [];
        for (const tile of rawTiles) {
            tiles.push(decodeTile(tile, tilesets));
        }

        chunks.push({
            x: parseInt(x),
            y: parseInt(y),
            width: parseInt(width),
            height: parseInt(height),
            tiles
        });
    }

    return { chunks }
}

function parseLayers(layers: Element[], tilesets: Tiled.TileSet[]): Tiled.Layer[] {
    const result: Tiled.Layer[] = [];

    for (const layer of layers) {
        const id = getAttribute(layer, "id");
        if (id == null) throw new Error(`Missing Layer id`);
        const name = getAttribute(layer, "name");
        if (name == null) throw new Error(`Missing Layer name`);
        const width = getAttribute(layer, "width");
        if (width == null) throw new Error(`Missing Layer width`);
        const height = getAttribute(layer, "height");
        if (height == null) throw new Error(`Missing Layer height`);

        result.push({
            id: parseInt(id),
            name,
            width: parseInt(width),
            height: parseInt(height),
            properties: parseProperties(getChildrenByTagName(layer, "properties")[0]),
            data: parseLayerData(getChildrenByTagName(layer, "data")[0], tilesets)
        });
    }

    return result;
}

function parseObjectGroups(objectgroups: Element[]): Tiled.ObjectGroup[] {
    const result: Tiled.ObjectGroup[] = [];

    for (const objectgroup of objectgroups) {
        const id = getAttribute(objectgroup, "id");
        if (id == null) throw new Error(`Missing ObjectGroup id`);
        const name = getAttribute(objectgroup, "name");
        if (name == null) throw new Error(`Missing ObjectGroup name`);

        result.push({
            id: parseInt(id),
            name
        });
    }

    return result;
}

export class TiledParser {
    private static parser_ = new DOMParser();
    static parse(src: string, path: string): Tiled.TileMap {
        const xml: XMLDocument = TiledParser.parser_.parseFromString(src, "text/xml");

        const map = getChildrenByTagName(xml, "map")[0];

        const result: Partial<Tiled.TileMap> = {};
        result.version = getAttribute(map, "version") ?? "";
        result.width = parseInt(getAttribute(map, "width") ?? "0");
        result.height = parseInt(getAttribute(map, "height") ?? "0");

        result.properties = parseProperties(getChildrenByTagName(map, "properties")[0]);
        result.tilesets = parseTilesets(getChildrenByTagName(map, "tileset"), path);
        result.layers = parseLayers(getChildrenByTagName(map, "layer"), result.tilesets);
        result.objectgroups = parseObjectGroups(getChildrenByTagName(map, "objectgroup"));

        // safe because many assertions when parsing
        return result as Tiled.TileMap;
    }
}