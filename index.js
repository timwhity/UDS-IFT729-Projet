
const server = require('http').Server(app)
const port = 3000;

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var io = require('socket.io')(server);
var indexRouter = require('./routes/index');


const logLevel = 'DEBUG';
const logMode = 'ALERT';
var Logger = require('./public/logger.js');
var logger = new Logger(logLevel, logMode, 'Serveur');

var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});


io.on('connection', (socket) => {
    console.log('A user connected with socket : ', socket.id);
    socket.broadcast.emit('user connected', socket.id);

    socket.on('object modified', (object) => {
        logger.debug('object modified');
        socket.broadcast.emit('object modified', object);
    });
    socket.on('object added', (object) => {
        logger.debug('object added');
        socket.broadcast.emit('object added', object);
    });
    socket.on('object removed', (object) => {
        logger.debug('object removed');
        socket.broadcast.emit('object removed', object);
    });
    socket.on('objects selected', (objectIds) => {
        logger.debug('objects selected');
        socket.broadcast.emit('objects selected', { userId: socket.id, objectIds: objectIds });
    });
    socket.on('objects deselected', () => {
        logger.debug('objects deselected');
        socket.broadcast.emit('objects deselected', socket.id);
    });
    socket.on('disconnect', () => {
        console.log('A user disconnected with socket : ', socket.id);
        // socket.broadcast.emit('objects deselected', socket.id);     // On désélectionne les objets de l'utilisateur qui se déconnecte
        socket.broadcast.emit('user disconnected', socket.id);
    });
});

server.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

module.exports = app;