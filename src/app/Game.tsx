import { h, Component, createRef } from "preact";
import * as Core from "core";
import "./Game.css";

// TODO: load + render sprites/animations from aseprite
// TODO: collisions
// TODO: load + render maps from Tiled
// TODO: net connection

export default class Game extends Component {
    canvasRef = createRef<HTMLCanvasElement>();
    gl!: WebGL2RenderingContext;

    componentDidMount() {
        if (!this.canvas) throw new Error(`Failed to initialize Game`);
        this.gl = Core.getContext(this.canvas, "webgl2", {
            alpha: false,
            depth: false,
            stencil: false,
        });

        const spritesheet = new Core.Spritesheet(this.gl, "assets/sprites/slime.json");

        const viewport = new Core.Viewport(this.gl);
        const camera = new Core.Camera(viewport);

        const renderer = new Core.Renderer(this.gl);

        //const texture = new Core.Texture(this.gl, "assets/img/AYAYA.png");
        const sprite = new Core.Sprite(spritesheet);

        let rot = 0;
        let pos = [500, 500] as [number, number];
        let vel = [1, 0];

        const loop = () => {
            //rot = (rot + 0.5) % 360;
            //if (pos[0] > 1000 || pos[0] < 500) {
            //    vel[0] *= -1;
            //}
            //pos[0] += vel[0];

            renderer.begin(camera);
            sprite.draw(renderer, 0, pos, Math.rad(rot), [2, 2]);
            renderer.end();

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    render() {
        return <canvas ref={this.canvasRef} tabIndex={-1} class="noselect"></canvas>;
    }

    get canvas() {
        return this.canvasRef.current;
    }
}
