const { loadFromDb, saveToDb } = require('./connectionDb.js')
const { performance } = require('perf_hooks');

class serverCanvasManager {
    constructor(io, logger) {
        this.io = io;
        this.logger = logger;
        this.count = {};
        this.socketId2Id = new Map(); // A chaque socket_id, on associe un id d'utilisateur
        this.connectedUsers = new Map(); // A chaque id d'utilisateur connecté, on associe {selectedObjectsIds: [], boardId: "", socket_id: 0, writePermission: false}
        this.boardsObjetcs = {}; // On stocke les objets pour chaque tableau blanc
        this.init();
    }

    init() {
        this.io.on('connection', async(socket) => {
            // On attend un message d'initialisation de l'utilisateur pour lui donner ses droits
            socket.on('connection-asked', async(boardId, userId, writePermission) => {
                this.logger.debug('User ' + userId + ' asked for initialization for board ' + boardId + ' with writePermission ' + writePermission);
                if (this.connectedUsers.has(userId)) {
                    this.logger.warn('User ' + userId + ' already initialized');
                    socket.emit('error', 'Your id is already used');
                    return;
                } else if (this.socketId2Id.has(socket.id)) {
                    this.logger.warn('User ' + userId + ' already initialized');
                    socket.emit('error', 'You are already initialized');
                    return;
                }
                
                socket.join(boardId);
                this.connectedUsers.set(userId, { selectedObjectsIds: [], boardId: boardId, socket_id: socket.id, writePermission: writePermission });
                this.socketId2Id.set(socket.id, userId);
                if (!this.count[boardId]) {
                    console.log("First connection")
                    let temp = await loadFromDb(boardId)
                    if (temp) {
                        this.boardsObjetcs[boardId] = JSON.parse(temp)
                    } else {
                        this.boardsObjetcs[boardId] = []
                    }
                } else {
                    if (!this.boardsObjetcs[boardId]) {
                        socket.emit('error', 'The board does not exist');
                        return;
                    }
                }
                this.count[boardId] += 1;
                this.logger.debug('A user connected with socket : ' + socket.id + ' and id : ' + userId + ' on board ' + boardId + ' with writePermission ' + writePermission);
                socket.emit('connection-ok', { objects: this.boardsObjetcs[boardId], users: Array.from(this.connectedUsers.keys()) });
                socket.to(boardId).emit('user connected', userId);
            });

            socket.on('object modified', (object) => {
                if (!this.checkRights(socket)) return;
                const boardId = this.getBoardId(socket);
                if (!boardId) return;
                this.logger.debug('object modified on board ' + boardId);
                this.boardsObjetcs[boardId].splice(this.boardsObjetcs[boardId].findIndex(obj => (obj.id == object.id)), 1, object);
                socket.to(boardId).emit('object modified', object);
            });
            socket.on('object added', (object) => {
                let t0 = performance.now();
                if (!this.checkRights(socket)) return;
                const boardId = this.getBoardId(socket);
                if (!boardId) return;
                this.logger.debug('object added on board ' + boardId);
                this.boardsObjetcs[boardId].push(object);
                socket.to(boardId).emit('object added', object);
                let t1 = performance.now();
                console.log("Adding objet took " + (t1 - t0) + " milliseconds.on the server side.")
            });
            socket.on('object removed', (object) => {
                if (!this.checkRights(socket)) return;
                const boardId = this.getBoardId(socket);
                if (!boardId) return;
                this.logger.debug('object removed on board ' + boardId);
                this.boardsObjetcs[boardId].splice(this.boardsObjetcs[boardId].findIndex(obj => (obj.id == object.id)), 1);
                socket.to(boardId).emit('object removed', object);
            });
            socket.on('objects selected', (objectIds) => {
                if (!this.checkRights(socket)) return;
                const boardId = this.getBoardId(socket);
                if (!boardId) return;
                this.logger.debug('objects selected on board ' + boardId);
                socket.to(boardId).emit('objects selected', { userId: this.socketId2Id.get(socket.id), objectIds: objectIds });
            });
            socket.on('objects deselected', () => {
                if (!this.checkRights(socket)) return;
                const boardId = this.getBoardId(socket);
                if (!boardId) return;
                this.logger.debug('objects deselected on board ' + boardId);
                socket.to(boardId).emit('objects deselected', this.socketId2Id.get(socket.id));
            });

            socket.on('disconnect', async() => {
                const userId = this.socketId2Id.get(socket.id);
                const boardId = this.getBoardId(socket);
                if (!boardId) return;
                this.logger.debug('User ' + userId + ' disconnected of board ' + boardId);
                if (userId) {
                    this.socketId2Id.delete(socket.id);
                    this.connectedUsers.delete(userId);
                    socket.to(boardId).emit('user disconnected', userId);
                }

                this.count[boardId] -= 1;

                if (!this.count[boardId]) {
                    await saveToDb(this.boardsObjetcs[boardId], boardId)
                    console.log("All user are disconnected")
                }
            });
        });
    }

    getBoardId(socket) {
        const userId = this.socketId2Id.get(socket.id);
        if (!userId) {
            this.logger.warn('User with socket ' + socket.id + ' is not initialized');
            socket.emit('error', 'You are not initialized');
            return;
        } else if (!this.connectedUsers.has(userId)) {
            this.logger.warn('User ' + userId + ' is not initialized (This should not happen)');
            socket.emit('error', 'You are not initialized (This should not happen)');
            return;
        } else if (!this.connectedUsers.get(userId).boardId) {
            this.logger.warn('User ' + userId + ' does not have a boardId');
            socket.emit('error', 'You do not have a boardId');
            return;
        }
        return this.connectedUsers.get(userId).boardId;
    }

    checkRights(socket) {
        const userId = this.socketId2Id.get(socket.id);
        if (!userId) {
            this.logger.warn('User with socket ' + socket.id + ' is not initialized');
            socket.emit('error', 'You are not initialized');
            return false;
        } else if (!this.connectedUsers.has(userId)) {
            this.logger.warn('User ' + userId + ' is not initialized (This should not happen)');
            socket.emit('error', 'You are not initialized (This should not happen)');
            return false;
        } else if (!this.connectedUsers.get(userId).socket_id === socket.id) {
            this.logger.warn('User ' + userId + ' is not the right user');
            socket.emit('error', 'You are not the right user');
            return false;
        } else if (!this.connectedUsers.get(userId).writePermission) {
            this.logger.warn('User ' + userId + ' does not have the rights to do this action');
            socket.emit('error', 'You do not have the rights to do this action');
            return false;
        }
        return true;
    }
}



module.exports = serverCanvasManager;