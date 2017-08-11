const fs = require('fs');
const _ = require('underscore');

const jsRegex = /\.js$/;
const files = fs.readdirSync(`${__dirname}/../client/js/rooms`);

module.exports = {
    entry: _.reduce(files, (obj, filename) => {
        if (jsRegex.test(filename)) {
            const name = filename.replace(jsRegex, '');
            obj[name] = [`./client/js/rooms/${name}.js`];
        }
        console.log('rooms webpack entries:', obj);
        return obj;
    }, {}),
    output: {
		path: `${__dirname}/dist/js/rooms`,
        filename: '[name].js'
    },
    externals: [{
        'three': 'THREE',
        'threeX': 'THREEx'
    }],
    module: {
        rules: [
            {
                test: jsRegex,
                exclude: /node_modules/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015', 'react']
                }
            }
        ]
    }
};