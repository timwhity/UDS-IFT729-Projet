var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var io = require('socket.io')(server);
var app = express();
var server = require('http').Server(app)

var indexRouter = require('./routes/index');

const port = 3000;

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
        socket.broadcast.emit('object modified', object);
    });
    socket.on('object added', (object) => {
        socket.broadcast.emit('object added', object);
    });
    socket.on('object removed', (object) => {
        socket.broadcast.emit('object removed', object);
    });
    socket.on('objects selected', (objectIds) => {
        socket.broadcast.emit('objects selected', { userId: socket.id, objectIds: objectIds });
    });
    socket.on('objects deselected', () => {
        socket.broadcast.emit('objects deselected', socket.id);
    });
    socket.on('disconnect', () => {
        console.log('A user disconnected with socket : ', socket.id);
        // socket.broadcast.emit('objects deselected', socket.id);     // On désélectionne les objets de l'utilisateur qui se déconnecte
        socket.broadcast.emit('user disconnected', socket.id);
    });
});

server.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});

module.exports = app;