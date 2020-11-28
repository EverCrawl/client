


export class Viewport {
    public readonly gl: WebGL2RenderingContext;
    public readonly canvas: HTMLCanvasElement;

    constructor(
        gl: WebGL2RenderingContext
    ) {
        this.gl = gl;
        this.canvas = this.gl.canvas as HTMLCanvasElement;

        this.resize();
        window.addEventListener("resize", this.resize);
    }

    get width() { return this.canvas.width; }
    get height() { return this.canvas.height; }

    resize = () => {
        this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
        this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
}