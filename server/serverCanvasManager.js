class serverCanvasManager {
    constructor(io, logger) {
        this.io = io;
        this.logger = logger;

        this.socketId2Id = new Map(); // A chaque socket_id, on associe un id d'utilisateur
        this.connectedUsers = new Map(); // A chaque id d'utilisateur connecté, on associe {selecedObjectsIds: [], socket_id: 0, state: 'uninitialized'}
        this.objects = []; // On stocke les objets du tableau blanc

        this.psw = "admin"; // Mot de passe d'édition temporaire
        this.init();
    }

    init() {
        this.io.on('connection', (socket) => {
            this.logger.debug('A user connected with socket : ' + socket.id);

            // On attend un message d'initialisation de l'utilisateur pour lui donner ses droits
            socket.on('connection-asked', (userId, psw) => {
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

                const state = (psw === this.psw) ? 'writer' : 'reader';
                this.connectedUsers.set(userId, { selectedObjectsIds: [], socket_id: socket.id, state: state });
                this.socketId2Id.set(socket.id, userId);

				this.logger.debug('User ' + userId + ' initialized with state ' + state);
				this.logger.debug('User ' + userId + ' initialized with objects ' + this.objects);
				socket.emit('connection-ok', { state: state, objects: this.objects, users: Array.from(this.connectedUsers.keys()) });
				socket.broadcast.emit('user connected', userId);
			});
		
			socket.on('object modified', (object) => {
				if (!this.checkRights(socket)) return;
				this.logger.debug('object modified');
				socket.broadcast.emit('object modified', object);
			});
			socket.on('object added', (object) => {
				if (!this.checkRights(socket)) return;
				this.logger.debug('object added');
				this.objects.push(object);
				socket.broadcast.emit('object added', object);
			});
			socket.on('object removed', (object) => {
				if (!this.checkRights(socket)) return;
				this.logger.debug('object removed');
				this.objects.at(this.objects.findIndex(obj=> (obj.id==object.id))).delete;
				socket.broadcast.emit('object removed', object);
			});
			socket.on('objects selected', (objectIds) => {
				if (!this.checkRights(socket)) return;
				this.logger.debug('objects selected');
				socket.broadcast.emit('objects selected', { userId: this.socketId2Id.get(socket.id), objectIds: objectIds });
			});
			socket.on('objects deselected', () => {
				if (!this.checkRights(socket)) return;
				this.logger.debug('objects deselected');
				socket.broadcast.emit('objects deselected', this.socketId2Id.get(socket.id));
			});

            socket.on('disconnect', () => {
                this.logger.debug('A user disconnected with socket : ' + socket.id);
                const userId = this.socketId2Id.get(socket.id);
                if (userId) {
                    this.logger.debug('He had id : ' + userId);
                    this.socketId2Id.delete(socket.id);
                    this.connectedUsers.delete(userId);
                    socket.broadcast.emit('user disconnected', userId);
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
        } else if (this.connectedUsers.get(userId).state !== 'writer') {
            this.logger.warn('User ' + userId + ' does not have the rights to do this action');
            socket.emit('error', 'You do not have the rights to do this action');
            return false;
        }
        return true;
    }
}



module.exports = serverCanvasManager;