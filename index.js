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
const { title } = require('process');
app.use(session({
    secret: "ezlkfqhmkjjkgt'eqrE4Yg('zyre('yrgE5YEZeghgjnJ.uydlM:oUOmgg",
    resave: false,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    res.render('home');
});

let rooms = {};     // TEMP : à chaque identifiant de salle, on associe un mot de passe.

// Quand on recoit une requete post sur '/' avec "id" et "mdp" 
app.post('/join', (req, res) => {
    const userId = req.body.userId;
    const roomId = req.body.roomId;
    const mdp = req.body.mdp;

    if (!rooms[roomId]) {
        res.render('error', { title: "Erreur", message: "La salle n'existe pas." });
        return;
    }
    if (mdp && rooms[roomId] !== mdp) {
        res.render('error', { title: "Mot de passe incorrect.", message: "Si vous souhaitez rejoindre la salle en lecture seule, laissez le champ vide." });
        return;
    }
    const writePermission = (mdp && rooms[roomId] === mdp);

    req.session.userId = userId;
    req.session.boardId = roomId;
    req.session.writePermission = writePermission;

    console.log(`Connection : ${userId} - ${writePermission}`);
    res.redirect('/draw');
});

app.post('/create', (req, res) => {
    const userId = req.body.userIdCreate;
    const roomId = req.body.roomIdCreate;
    const mdp = req.body.mdpCreate;

    if (!userId || !roomId) {
        res.render('error', { title: "Erreur", message: "Veuillez renseigner tous les champs." });
        return;
    }

    if (rooms[roomId]) {
        res.render('error', { title: "Erreur", message: "La salle existe déjà." });
        return;
    }

    rooms[roomId] = mdp;

    req.session.userId = userId;
    req.session.boardId = roomId;
    req.session.writePermission = true;

    console.log(`Creation : ${userId} - ${true}`);
    res.redirect('/draw');
});

app.post('/disconnect', (req, res) => {
    console.log(`disconnect : ${req.session.userId} - ${req.session.writePermission} - ${req.session.boardId}`);
    req.session.destroy();
    res.redirect('/');
});

app.get('/draw', (req, res) => {
    console.log(`draw : ${req.session.userId} - ${req.session.writePermission} - ${req.session.boardId}`);
    if (!req.session.boardId) {
        res.render('error404');
    } else {
        const { boardId, userId, writePermission } = req.session;

        res.render('design', {
            boardId: boardId,
            userId: userId,
            writePermission: writePermission
        });
    }
})

app.get('/', (req, res) => {
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

server.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});