const express = require('express');
const app = express();
const server = require('http').Server(app)
const port = 3000;
const io = require('socket.io')(server);

const logLevel = 'DEBUG';
const logMode = 'CONSOLE';
var ServerLogger = require('./server/serverLogger.js');
var logger = new ServerLogger(logLevel, logMode);

const ServerCanvasManager = require('./server/serverCanvasManager.js');
const serverCanvas = new ServerCanvasManager(io, logger);

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/draw', (req, res) => {

    let userId = req.query.user_id;
    res.render('draw', {
        userId: userId
    });
})

app.get('/', (req, res) => {
    // Traitement sur l'url, sur les cookies, ... 
    res.render('\index')
});

server.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

function success() {
    if(document.getElementById("room").value==="") { 
           document.getElementById('btn_join').disabled = true; 
       } else { 
           document.getElementById('btn_join').disabled = false;
       }
   }