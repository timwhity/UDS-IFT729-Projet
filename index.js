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
    req.session.boardId = 1;      // Id de l'unique tableau pour le moment
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

server.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
