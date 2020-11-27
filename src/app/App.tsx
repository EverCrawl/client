import { h, Component, createRef } from 'preact';
import "./App.css";

import { Game } from "core/game";

export default class App extends Component {
    canvasRef = createRef<HTMLCanvasElement>();
    game!: Game;

    componentDidMount() {
        if (!this.canvasRef.current) throw new Error(`Something went wrong.`);

        try {
            (new Game(this.canvasRef.current)).run();
        } catch (err) {
            console.error(err);
        }
    }

    render() {
        return (
            <div class="container rows center-items noselect">
                <canvas ref={this.canvasRef} tabIndex={-1} class="noselect"></canvas>
            </div>
        );
    }
}