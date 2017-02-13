const webpack = require('webpack');
const webpackConfig = require('./webpack.rooms.config.js');

const myDevConfig = Object.create(webpackConfig);
myDevConfig.devtool = 'sourcemap';

myDevConfig.plugins = [new webpack.LoaderOptionsPlugin({
    debug: true,
})];

module.exports = myDevConfig;