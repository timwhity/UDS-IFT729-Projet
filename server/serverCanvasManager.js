const { loadFromDb, saveToDb } = require('./connectionDb.js')

class serverCanvasManager {
    constructor(io, logger) {
        this.io = io;
        this.logger = logger;
        this.count = 0
        this.socketId2Id = new Map(); // A chaque socket_id, on associe un id d'utilisateur
        this.connectedUsers = new Map(); // A chaque id d'utilisateur connecté, on associe {selecedObjectsIds: [], socket_id: 0, writePermission: false}
        this.objects = []; // On stocke les objets du tableau blanc

        this.psw = "admin"; // Mot de passe d'édition temporaire
        this.init();
    }

    init() {
        this.io.on('connection', async(socket) => {
            // console.log("Count is ", count)


            // On attend un message d'initialisation de l'utilisateur pour lui donner ses droits
            socket.on('connection-asked', async(userId, writePermission) => {
                this.logger.debug('User ' + userId + ' asked for initialization');
                if (this.connectedUsers.has(userId)) {
                    this.logger.warn('User ' + userId + ' already initialized');
                    socket.emit('error', 'Your id is already used');
                    return;
                } else if (this.socketId2Id.has(socket.id)) {
                    this.logger.warn('User ' + userId + ' already initialized');
                    socket.emit('error', 'You are already initialized');
                    return;
                }

                // const state = (psw === this.psw) ? 'writer' : 'reader';
                this.connectedUsers.set(userId, { selectedObjectsIds: [], socket_id: socket.id, writePermission: writePermission });
                this.socketId2Id.set(socket.id, userId);
                if (!this.count) {
                    console.log("First connection")
                    let temp = await loadFromDb()
                    if (temp) {
                        this.objects = JSON.parse(temp)
                    }
                    console.log(this.objects)
                }
                this.count += 1;
                this.logger.debug('A user connected with socket : ' + socket.id);
                this.logger.debug('User ' + userId + ' initialized with writePermission ' + writePermission);
                this.logger.debug('User ' + userId + ' initialized with objects ' + this.objects);
                
                socket.emit('connection-ok', { objects: this.objects, users: Array.from(this.connectedUsers.keys())});

                
                socket.broadcast.emit('user connected', userId);
            });

            socket.on("objet initialiser",()=>{
                this.connectedUsers.forEach((value,key, map) => {
                    this.logger.debug('User ' + key + ' selection: ' + value["selectedObjectsIds"]);
                    socket.emit('objects selected',{ userId: key, objectIds: value["selectedObjectsIds"] })
                })
            })

            socket.on('object modified', (object) => {
                if (!this.checkRights(socket)) return;
                this.logger.debug('object modified');
                this.objects.splice(this.objects.findIndex(obj => (obj.id == object.id)), 1, object);
                socket.broadcast.emit('object modified', object);
            });
            socket.on('object added', (object) => {
                console.log(this.objects)
                if (!this.checkRights(socket)) return;
                this.logger.debug('object added');
                console.log(this.objects)
                this.objects.push(object);
                socket.broadcast.emit('object added', object);
            });
            socket.on('object removed', (object) => {
                if (!this.checkRights(socket)) return;
                this.logger.debug('object removed');
                this.objects.splice(this.objects.findIndex(obj => (obj.id == object.id)), 1);
                socket.broadcast.emit('object removed', object);
            });
            socket.on('objects selected', (objectIds) => {
                if (!this.checkRights(socket)) return;
                this.logger.debug('objects selected');
                this.connectedUsers.get(this.socketId2Id.get(socket.id))["selectedObjectsIds"] = objectIds;
                socket.broadcast.emit('objects selected', { userId: this.socketId2Id.get(socket.id), objectIds: objectIds });
            });
            socket.on('objects deselected', () => {
                if (!this.checkRights(socket)) return;
                this.logger.debug('objects deselected');
                this.connectedUsers.get(this.socketId2Id.get(socket.id))["selectedObjectsIds"] = [];
                socket.broadcast.emit('objects deselected', this.socketId2Id.get(socket.id));
            });

            socket.on('disconnect', async() => {
                this.logger.debug('A user disconnected with socket : ' + socket.id);
                const userId = this.socketId2Id.get(socket.id);
                if (userId) {
                    this.logger.debug('He had id : ' + userId);
                    this.socketId2Id.delete(socket.id);
                    this.connectedUsers.delete(userId);
                    socket.broadcast.emit('user disconnected', userId);
                }

                this.count -= 1;

                if (!this.count) {
                    await saveToDb(this.objects);
                    console.log("All user are disconnected")
                }
            });
        });
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