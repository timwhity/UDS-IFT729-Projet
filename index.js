const express = require('express');
const app = express();
const server = require('http').Server(app)
const port = 3000;
const io = require('socket.io')(server);
const cors = require('cors');

const logLevel = 'DEBUG';
const logMode = 'CONSOLE';
var ServerLogger = require('./server/serverLogger.js');
var logger = new ServerLogger(logLevel, logMode);

const ServerCanvasManager = require('./server/serverCanvasManager.js');
const serverCanvas = new ServerCanvasManager(io, logger);

// Connection a la base de données
const { loadFromDb, saveToDb } = require('./server/connectionDb.js')


app.set('view engine', 'ejs');
app.use(cors())
app.use(express.static('public'));
// Analyse les corps des requêtes en JSON
app.use(express.json());
// Analyse les corps des requêtes en URL encodé
app.use(express.urlencoded({ extended: true }));

const session = require('express-session');
app.use(session({
    secret: "ezlkfqhmkjjkgt'eqrE4Yg('zyre('yrgE5YEZeghgjnJ.uydlM:oUOmgg",
    resave: false,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    res.render('home');
});

// Quand on recoit une requete post sur '/' avec "id" et "mdp" 
app.post('/', (req, res) => {
    const userId = req.body.userId;
    const mdp = req.body.mdp;

    // Vérification mot de passe 
    // TODO changer cela
    const writePermission = (mdp === "admin")

    req.session.userId = userId;
    req.session.boardId = 1; // Id de l'unique tableau pour le moment
    req.session.writePermission = writePermission;

    console.log(`Connection : ${userId} - ${writePermission}`);
    res.redirect('/draw');
});

app.get('/draw', (req, res) => {
    console.log(`draw : ${req.session.userId} - ${req.session.writePermission} - ${req.session.boardId}`);
    if (!req.session.boardId || req.session.boardId != 1) {
        res.render('error404');
    } else {
        const { userId, writePermission } = req.session;

        res.render('design', {
            userId: userId,
            writePermission: writePermission
        });
    }
})

app.get('/', (req, res) => {
    // Traitement sur l'url, sur les cookies, ... 
    res.render('\index')
});


app.get('/getLoad', async(req, res) => {
    const data = await loadFromDb()
    res.json(data)
})


app.get('/load', (req, res) => res.render('load'))


app.post('/database', async(req, res) => {
    console.log(req.body)
    await saveToDb(req.body)
    console.log('Saved successfully')
    res.send('working boy')
})

process.on('uncaughtException', function (err) {
    console.log(err);
}); 

server.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});