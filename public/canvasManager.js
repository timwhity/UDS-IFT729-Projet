class CanvasManager {
    constructor(canvas, socket, logger) {
        this.canvas = canvas;
        this.socket = socket;
        this.logger = logger;

        this.addedObjectIds = new Set();             // Liste des objets ajoutés par d'autres utilisateurs, pour éviter de renvoyer leur création
        this.removedObjectIds = new Set();           // Liste des objets supprimés par d'autres utilisateurs, pour éviter de renvoyer leur suppression
        this.selectedByOthersObjectIds = new Map();         // Liste des objets sélectionnés par d'autres utilisateurs, pour mettre à jour le rendu et interdire leur sélection
        this.modificationAuthorizedObjectIds = new Set();     // Liste des objets modifiables par l'utilisateur, pour autoriser leur modification
        
        // Server -> Client
        this.socket.on('object modified', this.handleObjectModified.bind(this));
        this.socket.on('object added', this.handleObjectAdded.bind(this));
        this.socket.on('object removed', this.handleObjectRemoved.bind(this));
        this.socket.on('objects selected', this.handleObjectsSelected.bind(this));
        this.socket.on('objects deselected', this.handleObjectsDeselected.bind(this));

        // Client -> Server
        this.canvas.on('object:modified', this.emitObjectModified.bind(this));
        this.canvas.on('object:added', this.emitObjectAdded.bind(this));
        this.canvas.on('object:removed', this.emitObjectRemoved.bind(this));
        this.canvas.on('selection:created', this.emitObjectsSelected.bind(this));
        this.canvas.on('selection:cleared', this.emitObjectsDeselected.bind(this));
    }

    //============================= CLIENT -> SERVER =============================
    emitObjectModified(e) {     // Objet modifié par le client
        if (!this.modificationAuthorizedObjectIds.has(e.target.id)) {
            this.logger.warn('Modification unauthorized');
            return;
        }
        this.socket.emit('object modified', e.target.toObject(['id']));
    }
    emitObjectAdded(e) {        // Objet ajouté par le client
        if (this.addedObjectIds.has(e.target.id)) {
            this.addedObjectIds.delete(e.target.id);
            return;
        }
        this.socket.emit('object added', e.target.toObject(['id']));
    }
    emitObjectRemoved(e) {      // Objet supprimé par le client
        if (this.removedObjectIds.has(e.target.id)) {
            this.removedObjectIds.delete(e.target.id);
            return;
        }
        this.socket.emit('object removed', e.target.toObject(['id']));
    }
    emitObjectsSelected(e) {    // Objets sélectionnés par le client
        this.socket.emit('objects selected', this.canvas.getActiveObjects().map(obj => obj.toObject(['id'])));
        this.modificationAuthorizedObjectIds = new Set(this.canvas.getActiveObjects().map(obj => obj.id));
    }
    emitObjectsDeselected(e) {  // Objets désélectionnés par le client
        this.socket.emit('objects deselected');
        this.modificationAuthorizedObjectIds = new Set();
    }

    //============================= SERVER -> CLIENT =============================
    handleObjectModified(object) {      // Objet modifié par un autre utilisateur
        let canvasObject = this.getObjectById(object.id);
        if (canvasObject) {
            fabric.util.enlivenObjects([object], function(enlivenedObjects) {
                canvasObject.set(enlivenedObjects[0].toObject(['id']));
                this.canvas.renderAll();
            }.bind(this));
        }
    }
    handleObjectAdded(object) {         // Objet ajouté par un autre utilisateur
        this.addedObjectIds.add(object.id);
        fabric.util.enlivenObjects([object], function(enlivenedObjects) {
            // Ajouter l'objet à la liste des objets sélectionnés par d'autres utilisateurs ????
            // this.selectedByOthersObjectIds.set(object.id, []);
            // this.updateSelectionRender();

            console.log('handleObjectAdded : ', enlivenedObjects[0]);

            this.canvas.add(enlivenedObjects[0]);
            this.canvas.renderAll();
        }.bind(this));
    }
    handleObjectRemoved(object) {       // Objet supprimé par un autre utilisateur
        this.removedObjectIds.add(object.id);
        let canvasObject = this.getObjectById(object.id);
        if (canvasObject) {
            this.canvas.remove(canvasObject);
            this.canvas.renderAll();
        } else {
            this.logger.warn('DESYNC : handleObjectRemoved : Object not found in canvas');
        }
    }
    handleObjectsSelected(event) {      // Objets sélectionnés par un autre utilisateur
        var objectIds = event.objectIds;
        var userId = event.userId;

        if (userId === this.socket.id) {
            console.log('Est-ce normal ??? handleObjectsSelected : User selected objects');
            return;
        }

        // Mettre à jour la sémection de l'utilisateur
        this.selectedByOthersObjectIds.set(userId, objectIds);

        // Mettre à jour le rendu des objets sélectionnés
        this.updateSelectionRender();
    }
    handleObjectsDeselected(userId) {   // Objets désélectionnés par un autre utilisateur
        this.selectedByOthersObjectIds.delete(userId);
        this.updateSelectionRender();
    }

    //============================= OTHERS =============================
    getObjectById(id) {
        return this.canvas.getObjects().find(obj => obj.id === id);
    }

    updateSelectionRender() {
        console.log('updateSelectionRender');
        console.log(this.selectedByOthersObjectIds);
        console.log(this.canvas.getObjects());

        this.canvas.getObjects().forEach(obj => {
            if (obj.id === 'selection') {
                this.canvas.remove(obj);
            }
        });

        this.selectedByOthersObjectIds.forEach((objectIds, userId) => {
            objectIds.forEach(objectId => {
                let canvasObject = this.getObjectById(objectId);
                if (canvasObject) {
                    let selection = new fabric.Rect({
                        id: 'selection',
                        left: canvasObject.left,
                        top: canvasObject.top,
                        width: canvasObject.width,
                        height: canvasObject.height,
                        fill: 'rgba(0,0,0,0)',
                        stroke: 'rgba(0,0,255,0.5)',
                        strokeWidth: 2,
                        strokeDashArray: [5, 5],
                        selectable: false,
                        evented: false
                    });
                    this.canvas.add(selection);
                } else {
                    this.logger.warn('WARNING DESYNC : updateSelectionRender : Object not found in canvas');
                }
            });
        });

        this.canvas.renderAll();
    }
}