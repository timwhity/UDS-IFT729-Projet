class CanvasManager {
    constructor(canvas, socket) {
        this.canvas = canvas;
        this.socket = socket;

        this.addedObjectIds = new Set();             // Liste des objets ajoutés par d'autres utilisateurs, pour éviter de renvoyer leur création
        this.removedObjectIds = new Set();           // Liste des objets supprimés par d'autres utilisateurs, pour éviter de renvoyer leur suppression
        this.selectedByOthersObjectIds = new Map();         // Liste des objets sélectionnés par d'autres utilisateurs, pour mettre à jour le rendu et interdire leur sélection
        this.modificationAuthorizedObjectIds = new Set();     // Liste des objets modifiables par l'utilisateur, pour autoriser leur modification

        this.initSocketEvents();
        this.initCanvasEvents();
    }

    initSocketEvents() {        // Server -> Client
        this.socket.on('object modified', this.handleObjectModified.bind(this));
        this.socket.on('object added', this.handleObjectAdded.bind(this));
        this.socket.on('object removed', this.handleObjectRemoved.bind(this));
        this.socket.on('objects selected', this.handleObjectsSelected.bind(this));
        this.socket.on('objects deselected', this.handleObjectsDeselected.bind(this));
    }

    initCanvasEvents() {        // Client -> Server
        this.canvas.on('object:modified', this.emitObjectModified.bind(this));
        this.canvas.on('object:added', this.emitObjectAdded.bind(this));
        this.canvas.on('object:removed', this.emitObjectRemoved.bind(this));
        this.canvas.on('selection:created', this.emitObjectsSelected.bind(this));
        this.canvas.on('selection:cleared', this.emitObjectsDeselected.bind(this));
    }

    emitObjectModified(e) {
        if (!this.modificationAuthorizedObjectIds.has(e.target.id)) {
            console.log('Modification non autorisée');
            return;
        }
        this.socket.emit('object modified', e.target.toObject());
    }
    emitObjectAdded(e) {
        if (this.addedObjectIds.has(e.target.id)) {
            this.addedObjectIds.delete(e.target.id);
            return;
        }
        this.socket.emit('object added', e.target.toObject());
    }
    emitObjectRemoved(e) {
        if (this.removedObjectIds.has(e.target.id)) {
            this.removedObjectIds.delete(e.target.id);
            return;
        }
        this.socket.emit('object removed', e.target.toObject());
    }
    emitObjectsSelected(e) {
        this.socket.emit('objects selected', this.canvas.getActiveObjects().map(obj => obj.toObject()));
        this.modificationAuthorizedObjectIds = new Set(this.canvas.getActiveObjects().map(obj => obj.id));
    }
    emitObjectsDeselected(e) {
        this.socket.emit('objects deselected');
        this.modificationAuthorizedObjectIds = new Set();
    }


    handleObjectModified(object) {
        let canvasObject = this.getObjectById(object.id);
        if (canvasObject) {
            fabric.util.enlivenObjects([object], function(enlivenedObjects) {
                canvasObject.set(enlivenedObjects[0].toObject());
                this.canvas.renderAll();
            }.bind(this));
        }
    }
    handleObjectAdded(object) {
        this.addedObjectIds.add(object.id);
        fabric.util.enlivenObjects([object], function(enlivenedObjects) {
            this.canvas.add(enlivenedObjects[0]);
            this.canvas.renderAll();
        }.bind(this));
    }
    handleObjectRemoved(object) {
        this.removedObjectIds.add(object.id);
        let canvasObject = this.getObjectById(object.id);
        if (canvasObject) {
            this.canvas.remove(canvasObject);
            this.canvas.renderAll();
        } else {
            console.error('WARNING DESYNC : handleObjectRemoved : Object not found in canvas');
        }
    }
    handleObjectsSelected(event) {
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
    handleObjectsDeselected(userId) {
        this.selectedByOthersObjectIds.delete(userId);
        this.updateSelectionRender();
    }

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
                    console.error('WARNING DESYNC : updateSelectionRender : Object not found in canvas');
                }
            });
        });

        this.canvas.renderAll();
    }
}