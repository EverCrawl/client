
import * as m from "core/math";
import { Viewport } from "./Viewport";

export interface CameraOptions {
    eye?: m.Vector3;
    center?: m.Vector3;
    near?: number;
    far?: number;
    worldUp?: m.Vector3;
    zoom?: number;
}

function calcView(eye: m.Vector3, center: m.Vector3, worldUp: m.Vector3): m.Matrix4 {
    return m.m4.lookAt(eye, center, worldUp);
}

function calcProjection(viewport: Viewport, near: number, far: number, zoom: number): m.Matrix4 {
    const hw = viewport.width / 2;
    const hh = viewport.height / 2;
    return m.m4.orthographic(-hw, hw, -hh, hh, near, far);
}

export class Camera {
    private view_: m.Matrix4;
    private projection_: m.Matrix4;

    private eye_: m.Vector3;
    private center_: m.Vector3;
    private near_: number;
    private far_: number;
    private worldUp_: m.Vector3;
    private zoom_: number;

    constructor(
        public viewport: Viewport,
        options: CameraOptions = {}
    ) {
        this.eye_ = options.eye !== undefined ? options.eye : m.v3(0, 0, -1);
        this.center_ = options.center !== undefined ? options.center : m.v3(0, 0, 0);
        this.near_ = options.near !== undefined ? options.near : -1;
        this.far_ = options.far !== undefined ? options.far : 1;
        this.worldUp_ = options.worldUp !== undefined ? options.worldUp : m.v3(0, 1, 0);
        this.zoom_ = 1;

        this.projection_ = m.m4();
        this.view_ = m.m4();
        this.update();
        this.resize();

        window.addEventListener("resize", this.resize);
    }

    update() {
        this.view_ = calcView(this.eye_, this.center_, this.worldUp_);
        this.projection_ = calcProjection(this.viewport, this.near_, this.far_, this.zoom_);
    }

    public get view(): m.Matrix4 {
        return this.view_;
    }
    public get projection(): m.Matrix4 {
        return this.projection_;
    }
    public get position(): m.Vector2 {
        return m.v2(this.eye_[0], this.eye_[1]);
    }
    public set position(value: m.Vector2) {
        this.eye_ = m.v3(value[0], value[1], -1);
        this.center_ = m.v3(value[0], value[1], 0);
        this.update();
    }
    public get zoom(): number {
        return this.zoom_;
    }
    public set zoom(value: number) {
        this.zoom_ = value;
        this.update();
    }

    private resize = () => {
        this.projection_ = calcProjection(this.viewport, this.near_, this.far_, this.zoom_);
    }
}
