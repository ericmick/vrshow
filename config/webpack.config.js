const path = require('path');

module.exports = {
    entry: {
        app: ['babel-polyfill', './client/js/index.js']
    },
    output: {
        path: path.resolve(__dirname, '../dist/js'),
        filename: '[name].js'
    },
    externals: [{
        'three': 'THREE',
        'threeX': 'THREEx'
    }],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015', 'react']
                }
            }
        ]
    }
};