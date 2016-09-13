const webpackConfig = require('./webpack.config.js');

const myDevConfig = Object.create(webpackConfig);
myDevConfig.devtool = 'sourcemap';
myDevConfig.debug = true;

module.exports = myDevConfig;