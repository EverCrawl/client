# underworld-client

This repository hosts the game client for an online browser-based platformer.

### Prerequisites

* [Node](https://nodejs.org/en/) 12+
* [Yarn](https://yarnpkg.com/)
  * `npm install -g yarn`
* WebGL2 compatible browser
  * You can check if your browser supports it [here](https://webglreport.com/?v=2)

### Build

Assets are held in a submodule, so the repository should be cloned recursively.

```
$ git clone --recurse-submodules git://github.com/jprochazk/underworld-client.git
$ cd underworld-client
$ yarn && yarn dev
```

The client will be served to [`http://localhost:8080/`](http://localhost:8080/).

### Controls

Just WASD to move, SHIFT to move faster. Currently lacks most planned gameplay features.

![Demo](demo.gif)