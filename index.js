const express = require('express');
const app = express();
const server = require('http').Server(app)
const port = 3000;
const io = require('socket.io')(server);


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
    res.render('draw', { userId: userId });
})

io.on('connection', (socket) => {
    console.log('A user connected with socket : ', socket.id);

    socket.on('object modified', (data) => {
        console.log('object modified');
        socket.broadcast.emit('object modified', data);
    });
    socket.on('object added', (data) => {
        console.log('object added');
        socket.broadcast.emit('object added', data);
    });
    socket.on('object removed', (data) => {
        console.log('object removed');
        socket.broadcast.emit('object removed', data);
    });
    socket.on('objects selected', (data) => {
        console.log('objects selected');
        socket.broadcast.emit('objects selected', { userId: socket.id, objectIds: data });
    });
    socket.on('objects deselected', () => {
        console.log('objects deselected');
        socket.broadcast.emit('objects deselected', socket.id);
    });
    socket.on('disconnect', () => {
        console.log('user ' + socket.id + ' disconnected');
        socket.broadcast.emit('objects deselected', socket.id);     // On désélectionne les objets de l'utilisateur qui se déconnecte
    });
});



server.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});