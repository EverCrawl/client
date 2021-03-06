// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: { url: "/", static: true },
    src: { url: "/dist" },
    assets: { url: "/assets" }
  },
  plugins: [
    "snowpack-plugin-tiled",
    "@snowpack/plugin-dotenv",
    "@snowpack/plugin-typescript"
  ],
  optimize: {
    bundle: true,
    minify: true,
    treeshake: true,
    target: "es2020"
  },
  alias: {
    "app": "./src/app",
    "core": "./src/core",
    "schemas": "./src/schemas"
  },
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
};
