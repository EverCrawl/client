const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    entry: "./src/index.tsx",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(png|jpe?g|gif|svg)$/i,
                use: [{ loader: 'file-loader' }],
            },
        ],
    },
    plugins: [new HtmlWebpackPlugin({
        hash: true,
        template: "src/index.html"
    })],
    resolve: {
        extensions: [".ts", ".js", ".tsx", ".jsx"],
        modules: [path.resolve("./src"), path.resolve("./node_modules")],
    },
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "dist"),
        publicPath: "/"
    },
};