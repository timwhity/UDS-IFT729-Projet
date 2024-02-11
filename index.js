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
    res.render('draw')
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


    // Handle disconnect event
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});



server.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});