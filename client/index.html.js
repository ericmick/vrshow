module.exports.template = (context) => {
    context = context || this;
    const isProd = process.env.NODE_ENV === 'production';
    const cloudfrontInProd = isProd ? '//cf.vrs.how/' : '';
    return `<!doctype html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">
            <meta name="mobile-web-app-capable" content="yes">
            <meta name="apple-mobile-web-app-capable" content="yes">

            <title>VRSHOW: The Tank</title>
            <meta name="description" content="webvr chat room">
            <link rel="stylesheet" href="main.css">
        </head>
        <body>

            <div id="error-container" class="hide-for-camera">Error message.</div>
            <div id="button-container" class="hide-for-camera">
                <button id="vr-toggle">Enter VR</button>
                <button id="reset-pose">Reset Pose</button>
            </div>

            <div id="color-indicator" class="circle hide-for-camera"></div>

            <div id="loading">
                <div id="loading-background"></div>
                <div id="loading-text">
                    <h1>loading...</h1>
                </div>
            </div>
            
            <script src="${cloudfrontInProd}vendor/webvr-polyfill.js"></script>

            <script src="${cloudfrontInProd}vendor/three.min.js"></script>
            <script src="${cloudfrontInProd}vendor/stats.min.js"></script>
            <script src="${cloudfrontInProd}vendor/OBJLoader.js"></script>

            <script src="${cloudfrontInProd}vendor/threex.daynight.js"></script>

            <!-- Shim for WebRTC -->
            <script src="${cloudfrontInProd}vendor/adapter.js"></script>
            
            <script src="/socket.io/socket.io.js"></script>

            <script src="js/app.js"></script>
        </body>
        </html>`;
};