const express = require('express');
const app = express();
const server = require('http').Server(app)
const port = 3000;
const io = require('socket.io')(server);

const logLevel = 'DEBUG';
const logMode = 'ALERT';
var Logger = require('./public/logger.js');
var logger = new Logger(logLevel, logMode, 'Serveur');

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
    // Traitement sur l'url, sur les cookies, ... 
    res.redirect('/draw')
});

app.get('/draw', (req, res) => {

    let userId = req.query.username;
    if (!userId || userId === '') {
        userId = Math.random().toString(36).substring(7);
    }
    console.log('userId : ', userId);
    res.render('draw', {
        userId: userId,
        logLevel: logLevel,
        logMode: logMode
    });
})

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