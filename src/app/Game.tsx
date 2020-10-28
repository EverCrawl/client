import { h, Component, createRef } from "preact";
import * as Core from "core";
import "./Game.css";
import { v2, Vector2 } from "core";

// TODO: animations
// TODO: better main loop
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

        const sprite = new Core.Sprite(spritesheet);

        let rot = 0;
        let lastPos = [500, 500] as Vector2;
        let pos = [500, 500] as Vector2;

        let keys: { [x: string]: boolean } = {};

        window.addEventListener("keydown", (evt) => {
            keys[evt.code] = true;
        });
        window.addEventListener("keyup", (evt) => {
            keys[evt.code] = false;
        })

        let vel = v2();
        let g = 0.09;

        let orientation = 1;

        const loop = () => {
            vel[1] -= g;
            vel[0] = 0;

            if (keys["KeyA"]) {
                vel[0] -= 2; orientation = -1;
                // can only go to "move" when in "idle"
                if (sprite.animation === "Idle") {
                    // move has no transition
                    sprite.animate("Move", true);
                }
            }
            if (keys["KeyD"]) {
                vel[0] += 2; orientation = 1;
                // can only go to "move" when in "idle"
                if (sprite.animation === "Idle") {
                    // move has no transition
                    sprite.animate("Move", true);
                }
            }
            if (keys["Space"]) {
                if (sprite.animation !== "Jump") {
                    vel[1] = 5;
                    // jump has a transition
                    sprite.animate("Jump", false);
                }
            }
            lastPos = v2.clone(pos);
            v2.add(pos, vel);

            if (vel[0] === 0 && sprite.animation === "Move") {
                sprite.animate("Idle", true);
            }

            if (pos[0] > this.gl.canvas.width - 50) pos[0] = this.gl.canvas.width - 50;
            if (pos[0] < 50) pos[0] = 50;
            if (pos[1] > this.gl.canvas.height - 50) pos[1] = this.gl.canvas.height - 50;
            if (pos[1] < 50) {
                // landing
                if (sprite.animation === "Jump") {
                    sprite.animate("Idle", false);
                }
                pos[1] = 50;
            }

            renderer.begin(camera);
            sprite.draw(renderer, 0, pos, Math.rad(rot), [orientation, 1]);
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
