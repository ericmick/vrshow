const koa = require('koa');
const app = koa();
const server = require('http').createServer(app.callback());
const bodyParser = require('koa-body-parser');
const session = require('koa-generic-session');
const router = require('koa-router')({});
const api = require('koa-router')({});
const serve = require('koa-static');
const io = require('socket.io')(server);
const peering = new (require('./Peering.js'))(io.of('peering'));

const isProd = process.env.NODE_ENV === 'production';
const port = isProd ? 80 : 3000;

const html = require('../client/index.html.js').template();
router.get('/', function *(next) {
    this.type = 'text/html';
    this.body = html;
});

function *cacheControl(next) {
    // 86400000 = a day in ms
    this.set('Cache-Control', 'max-age=86400000'); 
    yield next;
}

const generateMap = require('./generateMap');
api.get('/map/:id', function *(next) {
    this.type = 'image/png';
    this.body = generateMap(this.params.id, true);
});

api.get('/texture/:id', function *(next) {
    this.type = 'image/png';
    this.body = generateMap(this.params.id, false);
});
api.use(function *(next) {
    // 86400000 = a day in ms
    this.set('Cache-Control', 'max-age=86400000');
    this.set('Access-Control-Allow-Origin', '*');
    yield next;
});

router.use('/api', api.routes(), api.allowedMethods());

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());
app.use(serve(`${__dirname}/../dist`, {
    maxage: 300000 // 5 minutes in ms
}));

server.listen(port);
console.log(`Server started on http://${require("os").hostname()}:${port}`);