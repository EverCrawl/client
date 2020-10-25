import { h, Component } from 'preact';
import "./App.css";

import Game from "./Game";

export default class App extends Component {
    render() {
        return (
            <div class="container rows center-items noselect">
                <Game />
            </div>
        );
    }
}