
export namespace Tiled {

    export enum PropertyType {
        String = "string",
        Int = "int",
        Float = "float",
        Bool = "bool",
        Color = "color",
        File = "file",
        Object = "object"
    }

    export interface Property {
        type: Tiled.PropertyType;
        value: any;
    }

    export interface Properties {
        [name: string]: Tiled.Property;
    }

    export interface Image {
        source: string;
        width: number;
        height: number;
    }

    export interface TileSet_Tile {
        properties: Tiled.Properties;
    }

    export interface TileSet {
        id: number;
        firstgid: number;
        name: string;
        tilewidth: number;
        tileheight: number;
        tilecount: number;
        columns: number;
        image: Tiled.Image
        tiles: { [id: number]: Tiled.TileSet_Tile };
    }

    export enum LayerDataEncoding {
        BASE64 = "base64",
        CSV = "csv"
    }

    export interface Tile {
        tileset: Tiled.TileSet;
        id: number;
    }

    export interface LayerDataChunk {
        x: number;
        y: number;
        width: number;
        height: number;
        tiles: (Tiled.Tile | null)[];
    }

    export interface LayerData {
        chunks: Tiled.LayerDataChunk[];
    }

    export interface Layer {
        id: number;
        name: string;
        width: number;
        height: number;
        properties: Tiled.Properties;
        data: Tiled.LayerData;
    }

    export interface Object {
        id: number;
        name: string;
        type: string;
        x: number;
        y: number;
        width: number;
        height: number;
        rotation: number;
        gid: number;
        visible: boolean;
        //template: Tiled.Template;
    }

    export interface ObjectGroup {
        id: number;
        name: string;
        /* color: string;
        x: number;
        y: number;
        width: number;
        height: number;
        opacity: number;
        visible: boolean;
        tintcolor: string;
        offsetx: number;
        offsety: number;
        properties: Tiled.Properties;
        objects: Tiled.Object[]; */
    }

    export interface TileMap {
        version: string;
        width: number;
        height: number;
        properties: Tiled.Properties;
        tilesets: Tiled.TileSet[];
        layers: Tiled.Layer[];
        objectgroups: Tiled.ObjectGroup[];
    }

}