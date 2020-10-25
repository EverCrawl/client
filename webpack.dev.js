const path = require('path');
const { merge } = require('webpack-merge');
const webpack_common = require('./webpack.common.js');
const { DefinePlugin } = require("webpack");

module.exports = merge(webpack_common, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
      port: 8080,
      hot: false
    },
    plugins: [new DefinePlugin({
        DEBUG: true
    })]
});