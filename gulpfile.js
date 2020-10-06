const { dest, parallel, series, src, watch } = require('gulp');
const PluginError = require('plugin-error');
const webpack = require('webpack');
const webpackConfig = require('./config/webpack.config.js');
const webpackRoomsConfig = require('./config/webpack.rooms.config.js');
const webpackConfigDev = require('./config/webpack-dev.config.js');
const webpackRoomsConfigDev = require('./config/webpack-dev.rooms.config.js');
const del = require('del');
const { spawn } = require('child_process');
let node;

// Ensure all processing stops on Ctrl-C
process.once('SIGINT', function () {
    process.exit(0);
});

function vendor() {
    return src([
            './node_modules/three/build/three.min.js',
            './node_modules/stats.js/build/stats.min.js',
            './node_modules/three/examples/js/loaders/OBJLoader.js',
            './node_modules/webvr-polyfill/build/webvr-polyfill.js',
            './node_modules/webrtc-adapter/out/adapter.js'
        ], { buffer: true })
        .pipe(dest('dist/vendor'));
}

function staticClient() {
    return src(['client/static/**/*'], { buffer: true })
        .pipe(dest('dist'));
}

function webpackClient(callback) {
    webpack(webpackConfig,
        function(err, stats) {
            if(err) throw new PluginError('webpack', err);
            console.log('[webpack]', stats.toString({
                chunks: false,
                color: true
            }));
            callback();
        }
    );
}

function webpackRooms(callback) {
    webpack(webpackRoomsConfig,
        function(err, stats) {
            if(err) throw new PluginError('webpack', err);
            console.log('[webpack rooms]', stats.toString({
                chunks: false,
                color: true
            }));
            callback();
        }
    );
}

async function webpackDev() {
    const compiler = webpack(webpackConfigDev);
    compiler.watch({
        aggregateTimeout: 300
    },function(err, stats) {
        if(err) throw new PluginError('webpack', err);
        console.log('[webpack]', stats.toString({
            chunks: false,
            color: true
        }));
    });
}

async function webpackRoomsDev() {
    const compiler = webpack(webpackRoomsConfigDev);
    compiler.watch({
        aggregateTimeout: 300
    }, function(err, stats) {
        if(err) throw new PluginError('webpack', err);
        console.log('[webpack rooms]', stats.toString({
            chunks: false,
            color: true
        }));
    });
}

const watchClient = parallel(vendor, staticClient, webpackDev, webpackRoomsDev, function watchStaticClient() {
    watch('client/static/**/*', function(callback) {
        staticClient();
        callback();
    });
});

function watchServer() {
    startServer();
    watch('server/**/*.js', function(callback) {
        console.log('Reloading server...');
        startServer();
        callback();
    })
}

function startServer() {
    if(node) {
        node.kill();
    }
    node = spawn('node', ['server/index.js'], {
        stdio: 'inherit',
        env: {
            PATH: process.env.PATH,
            NODE_ENV: 'development'
        }
    });
    node.on('close', function (code) {
        if (code === 8) {
            console.log('Error with server, waiting...');
        }
    });
}

exports.clean = function() {
    return del([
        'dist/**',
        'node_modules/**'
    ]);
}

exports.dev = parallel(watchClient, watchServer);
exports.default = series(vendor, staticClient, webpackClient, webpackRooms);