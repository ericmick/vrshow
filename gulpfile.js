const gulp = require('gulp');
const webpack = require('webpack');
const gutil = require('gulp-util');
const webpackConfig = require('./config/webpack.config.js');
const webpackRoomsConfig = require('./config/webpack.rooms.config.js');
const webpackConfigDev = require('./config/webpack-dev.config.js');
const webpackRoomsConfigDev = require('./config/webpack-dev.rooms.config.js');
const del = require('del');
const spawn = require('child_process').spawn;
let node;

// Ensure all processing stops on Ctrl-C
process.once('SIGINT', function () {
    process.exit(0);
});

gulp.task('vendor', function() {
    return gulp.src([
            './node_modules/three/build/three.min.js',
            './node_modules/stats.js/build/stats.min.js',
            './node_modules/three/examples/js/loaders/OBJLoader.js',
            './node_modules/webvr-polyfill/build/webvr-polyfill.js',
            './node_modules/webrtc-adapter/out/adapter.js'
        ], { buffer: true })
        .pipe(gulp.dest('dist/vendor'));
});

gulp.task('static', function() {
    return gulp.src(['client/static/**/*'], { buffer: true })
        .pipe(gulp.dest('dist'));
});

gulp.task('webpack', function(callback) {
    const compiler = webpack(webpackConfig);
    compiler.run(function(err, stats) {
        if(err) throw new gutil.PluginError('webpack', err);
        gutil.log('[webpack]', stats.toString({
            chunks: false,
            color: true
        }));
        callback();
    });
});

gulp.task('webpack-rooms', function(callback) {
    const compiler = webpack(webpackRoomsConfig);
    compiler.run(function(err, stats) {
        if(err) throw new gutil.PluginError('webpack', err);
        gutil.log('[webpack rooms]', stats.toString({
            chunks: false,
            color: true
        }));
        callback();
    });
});

gulp.task('webpack-dev', function() {
    const compiler = webpack(webpackConfigDev);
    compiler.watch({
        aggregateTimeout: 300
    },function(err, stats) {
        if(err) throw new gutil.PluginError('webpack', err);
        gutil.log('[webpack]', stats.toString({
            chunks: false,
            color: true
        }));
    });
});

gulp.task('webpack-rooms-dev', function() {
    const compiler = webpack(webpackRoomsConfigDev);
    compiler.watch({
        aggregateTimeout: 300
    },function(err, stats) {
        if(err) throw new gutil.PluginError('webpack', err);
        gutil.log('[webpack rooms]', stats.toString({
            chunks: false,
            color: true
        }));
    });
});

gulp.task('watch-client', ['vendor', 'static', 'webpack-dev', 'webpack-rooms-dev'], function() {
    return gulp.watch(['client/static/**/*'], function() {
        return gulp.run('static');
    });
});

gulp.task('watch-server', function() {
    gulp.run('start-server');

    gulp.watch(['server/**/*.js'], function() {
        gutil.log('Reloading server...');
        gulp.run('start-server');
    })
});

gulp.task('start-server', function() {
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
            gutil.log('Error with server, waiting...');
        }
    });
});

gulp.task('clean', function() {
    return del([
        'dist/**',
        'node_modules/**'
    ]);
});

gulp.task('dev', ['watch-client', 'watch-server']);
gulp.task('default', ['vendor', 'static', 'webpack', 'webpack-rooms']);