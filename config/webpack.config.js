const path = require('path');

module.exports = {
    entry: {
        app: ['babel-polyfill', './client/js/index.js']

    },
    output: {
        path: 'dist/js',
        filename: '[name].js'
    },
    externals: [{
       'three': 'THREE'
    }],
    module: {
        loaders: [
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