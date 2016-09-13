const koa = require('koa');
const app = koa();
const router = require('koa-router')({
    prefix: '/api'
});
const serve = require('koa-static');

const isProd = process.env.NODE_ENV === 'production';
const port = isProd ? 80 : 3000;

router.get('/', function *(next) {
    this.status = 200;
    this.body = 'test';
});

app.use(router.routes());
app.use(router.allowedMethods());
app.use(serve(`${__dirname}/../dist`));

app.listen(port);
console.log(`Server started on http://${require("os").hostname()}:${port}`);