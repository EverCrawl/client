This repository hosts the game client for an online browser-based platformer.

### Prerequisites

* [Node](https://nodejs.org/en/) 14+
* WebGL2 compatible browser
  * You can check if your browser supports it [here](https://webglreport.com/?v=2)

### Build

The repository should be cloned recursively.

```
$ git clone --recurse-submodules git://github.com/jprochazk/underworld-client.git
$ cd client
$ npm install
$ npm run dev
```

The client will be served to localhost and opened in a new browser window.

### Controls

Just WASD to move, SHIFT to move faster. Currently lacks most planned gameplay features.