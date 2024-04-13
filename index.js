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
const { loadFromDb, saveToDb, createBoard, getBoard } = require('./server/connectionDb.js')


app.set('view engine', 'ejs');
app.use(cors())
app.use(express.static('public'));
// Analyse les corps des requêtes en JSON
app.use(express.json());
// Analyse les corps des requêtes en URL encodé
app.use(express.urlencoded({ extended: true }));

const session = require('express-session');
const { title } = require('process');
const { log } = require('console');
app.use(session({
    secret: "ezlkfqhmkjjkgt'eqrE4Yg('zyre('yrgE5YEZeghgjnJ.uydlM:oUOmgg",
    resave: false,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    res.render('home');
});

// Quand on recoit une requete post sur '/' avec "id" et "mdp" 
app.post('/join', async (req, res) => {
    const userId = req.body.userId;
    const roomId = req.body.roomId;
    const mdp = req.body.mdp;

    const password = await getBoard(roomId);
    if (!password) {
        res.render('error', { title: "Erreur", message: "La salle n'existe pas." });
        return;
    }
    if (mdp && password !== mdp) {
        res.render('error', { title: "Mot de passe incorrect.", message: "Si vous souhaitez rejoindre la salle en lecture seule, laissez le champ vide." });
        return;
    }
    const writePermission = (mdp && password === mdp);

    req.session.userId = userId;
    req.session.boardId = roomId;
    req.session.writePermission = writePermission;
    logger.debug(`User ${userId} joined room ${roomId} with write permission ${writePermission}`);
    res.redirect('/draw');
});

app.post('/create', async (req, res) => {
    const userId = req.body.userIdCreate;
    const roomId = req.body.roomIdCreate;
    const mdp = req.body.mdpCreate;

    if (!userId || !roomId) {
        res.render('error', { title: "Erreur", message: "Veuillez renseigner tous les champs." });
        return;
    }
    if (await getBoard(roomId)) {
        res.render('error', { title: "Erreur", message: "La salle existe déjà." });
        return;
    }
    await createBoard(roomId, mdp);

    req.session.userId = userId;
    req.session.boardId = roomId;
    req.session.writePermission = true;
    res.redirect('/draw');
    logger.debug(`User ${userId} created room ${roomId}`);
});

app.post('/disconnect', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/disconnect', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/draw', (req, res) => {
    logger.debug(`user ${req.session.userId} is joined room ${req.session.boardId}`);
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


app.get('/load/:boardId', async(req, res) => { 
    const boardId = req.params.boardId
    if (req.session.boardId !== boardId) {
        res.status(403).send('You are not allowed to access this board')
    }
    if (!boardId) {
        res.status(400).send('boardId is required')
    }
    const data = await loadFromDb(boardId)
    res.json(data)
})


app.post('/save/:boardId', async(req, res) => {
    const boardId = req.params.boardId
    if (req.session.boardId !== boardId || !req.session.writePermission) {
        res.status(403).send('You are not allowed to access this board')
    }
    await saveToDb(req.body, boardId)
    logger.debug(`Saved board ${boardId}`)
    res.send('Saved successfully')
})

app.get('/error', (req, res) => {
    const title = req.query.title || "Erreur";
    const message = req.query.message || "Une erreur est survenue.";
    res.render('error', { title: title, message: message });
});

process.on('uncaughtException', function (err) {
    logger.error(err);
}); 

server.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});