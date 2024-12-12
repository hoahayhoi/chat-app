const express = require("express");
const bodyParser = require('body-parser');

const flash = require('express-flash');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// const methodOverride = require('method-override');
const path = require('path');
require('dotenv').config();
const systemConfig = require("./config/system");

const http = require('http');
const { Server } = require("socket.io");

const app = express();
const port = process.env.PORT;

const server = http.createServer(app);
const io = new Server(server);

const databse = require("./config/database");
databse.connect();

const routes = require("./routes/index.route");


app.set('views', `${__dirname}/views`); // Tìm đến thư mục tên là views / Sử dụng trực tiếp biến dirname để môi trường deploy hiểu 
app.set('view engine', 'pug'); // template engine sử dụng: pug

app.use(express.static(`${__dirname}/public`)); // Thiết lập thư mục chứa file tĩnh

// // override with POST having ?_method=DELETE
// app.use(methodOverride('_method'));

// Khai báo biến toàn cục cho file pug
app.locals.prefixAdmin = systemConfig.prefixAdmin;

// parse application/json
app.use(bodyParser.json());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser('MINHHOA-FLASH'));
app.use(session({ cookie: { maxAge: 60000 }}));
app.use(flash());

// Khai báo biến toàn cục cho file js backend
global._io = io;

routes(app);


server.listen(port, () => {
    console.log(`App listening on port ${port}`);
});


