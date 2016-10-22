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

const generateMap = require('./generateMap');
api.get('/map/:id', function *(next) {
    this.type = 'image/png';
    this.body = generateMap(this.params.id, true);
});

api.get('/texture/:id', function *(next) {
    this.type = 'image/png';
    this.body = generateMap(this.params.id, false);
});

router.use('/api', api.routes(), api.allowedMethods());

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());
app.use(serve(`${__dirname}/../dist`));

server.listen(port);
console.log(`Server started on http://${require("os").hostname()}:${port}`);