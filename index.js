const express = require('express');
const app = express();
const server = require('http').Server(app)
const port = 3000;
const io = require('socket.io')(server);


app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    // Traitement sur l'url, sur les cookies, ... 
    res.render('index');
});

app.get('/home', (req, res) => {
    res.render('draw')
})

io.on('connection', (socket) => {
    console.log('A user connected with socket : ', socket.id);

    // Handle message event

    socket.on('user-drawing', data => {
        console.log(data)
        console.log('User is drawing')
        socket.broadcast.emit('user-drawing', data)
    })

    socket.on('initialising', data => {
        socket.broadcast.emit('initialising', data)
    })


    socket.on('user-not-drawing', () => {
        socket.broadcast.emit('user-not-drawing')
    })

    socket.on('change-color', (color) => {
        socket.broadcast.emit('change-color', color)
    })

    // Handle disconnect event
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});



app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});