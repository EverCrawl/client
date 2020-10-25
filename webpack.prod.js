const { merge } = require('webpack-merge');
const webpack_common = require('./webpack.common.js');
const TerserPlugin = require("terser-webpack-plugin");
const { DefinePlugin } = require("webpack");

module.exports = merge(webpack_common, {
    mode: 'production',
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin({
            terserOptions: {
                keep_classnames: true,
                keep_fnames: true
            }
        })],
    },
    plugins: [new DefinePlugin({
        DEBUG: false
    })]
})