const COLORS = ['rgba(255,0,0,0.5)', 'rgba(0,255,0,0.5)', 'rgba(0,0,255,0.5)', 'rgba(255,255,0,0.5)', 'rgba(0,255,255,0.5)', 'rgba(255,0,255,0.5)', 
    'rgba(255,255,255,0.5)', 'rgba(200, 0, 0, 0.5)', 'rgba(0, 200, 0, 0.5)', 'rgba(0, 0, 200, 0.5)', 'rgba(200, 200, 0, 0.5)', 'rgba(0, 200, 200, 0.5)', 
    'rgba(200, 0, 200, 0.5)', 'rgba(200, 200, 200, 0.5)', 'rgba(150, 0, 0, 0.5)', 'rgba(0, 150, 0, 0.5)', 'rgba(0, 0, 150, 0.5)', 'rgba(150, 150, 0, 0.5)',
    'rgba(0, 150, 150, 0.5)', 'rgba(150, 0, 150, 0.5)', 'rgba(150, 150, 150, 0.5)'];

class CanvasManager {
    constructor(canvas, socket, logger) {
        this.canvas = canvas;
        this.socket = socket;
        this.logger = logger;

        this.addedObjectIds = new Set();             // Liste des objets ajoutés par d'autres utilisateurs, pour éviter de renvoyer leur création
        this.removedObjectIds = new Set();           // Liste des objets supprimés par d'autres utilisateurs, pour éviter de renvoyer leur suppression
        this.selectedByOthersObjectIds = new Map();         // Liste des objets sélectionnés par d'autres utilisateurs, pour mettre à jour le rendu et interdire leur sélection
        this.modificationAuthorizedObjectIds = new Set();     // Liste des objets modifiables par l'utilisateur, pour autoriser leur modification
        this.othersColors = new Map();               // Liste des couleurs des autres utilisateurs
        
        // Server -> Client
        this.socket.on('object modified', this.handleObjectModified.bind(this));
        this.socket.on('object added', this.handleObjectAdded.bind(this));
        this.socket.on('object removed', this.handleObjectRemoved.bind(this));
        this.socket.on('objects selected', this.handleObjectsSelected.bind(this));
        this.socket.on('objects deselected', this.handleObjectsDeselected.bind(this));
        this.socket.on('user connected', this.handleUserConnected.bind(this));
        this.socket.on('user disconnected', this.handleUserDisconnected.bind(this));

        // Client -> Server
        this.canvas.on('object:modified', this.emitObjectModified.bind(this));
        this.canvas.on('object:added', this.emitObjectAdded.bind(this));
        this.canvas.on('object:removed', this.emitObjectRemoved.bind(this));
        this.canvas.on('selection:created', this.emitObjectsSelected.bind(this));
        this.canvas.on('selection:cleared', this.emitObjectsDeselected.bind(this));

        // Rerender
        this.canvas.contextContainer.strokeStyle = '#555';
        this.canvas.on('before:render', function() {
            this.updateSelectionRender();
        }.bind(this));
        // this.canvas.on('after:render', function() {
        //     this.updateSelectionRenderbis();
        // }.bind(this));
    }

    //============================= CLIENT -> SERVER =============================
    emitObjectModified(e) {     // Objet modifié par le client
        if (e.target.id.startsWith('selection')) {     // Si l'objet modifié est une sélection, on ne la renvoie pas
            return;
        }
        if (!this.modificationAuthorizedObjectIds.has(e.target.id)) {
            this.logger.warn('Modification unauthorized');
            return;
        }
        this.logger.debug('emitObjectModified : ' + e.target.id);
        this.socket.emit('object modified', e.target.toObject(['id']));
    }
    emitObjectAdded(e) {        // Objet ajouté par le client
        if (e.target.id.startsWith('selection')) {     // Si l'objet ajouté est une sélection, on ne la renvoie pas
            return;
        }
        if (this.addedObjectIds.has(e.target.id)) {     // Si la création de l'objet a été envoyée par le serveur, on ne la renvoie pas
            this.addedObjectIds.delete(e.target.id);
            return;
        }
        this.logger.debug('emitObjectAdded : ' + e.target.id);
        this.socket.emit('object added', e.target.toObject(['id']));
    }
    emitObjectRemoved(e) {      // Objet supprimé par le client
        if (e.target.id.startsWith('selection')) {     // Si l'objet supprimé est une sélection, on ne la renvoie pas
            return;
        }
        if (this.removedObjectIds.has(e.target.id)) {   // Si la suppression de l'objet a été envoyée par le serveur, on ne la renvoie pas
            this.removedObjectIds.delete(e.target.id);
            return;
        }
        this.logger.debug('emitObjectRemoved : ' + e.target.id);
        this.socket.emit('object removed', e.target.toObject(['id']));
    }
    emitObjectsSelected(e) {    // Objets sélectionnés par le client
        // TODO : check permission
        this.logger.debug('emitObjectsSelected : ' + this.canvas.getActiveObjects().map(obj => obj.id).join(', '));
        this.socket.emit('objects selected', this.canvas.getActiveObjects().map(obj => obj.id));
        this.modificationAuthorizedObjectIds = new Set(this.canvas.getActiveObjects().map(obj => obj.id));
    }
    emitObjectsDeselected(e) {  // Objets désélectionnés par le client
        this.logger.debug('emitObjectsDeselected');
        this.socket.emit('objects deselected');
        this.modificationAuthorizedObjectIds = new Set();
    }

    //============================= SERVER -> CLIENT =============================
    handleObjectModified(object) {      // Objet modifié par un autre utilisateur
        let canvasObject = this.getObjectById(object.id);
        if (canvasObject) {
            fabric.util.enlivenObjects([object], function(enlivenedObjects) {
                this.logger.debug('handleObjectModified : ' + enlivenedObjects[0].id);
                canvasObject.set(enlivenedObjects[0].toObject(['id']));
                this.canvas.renderAll();
            }.bind(this));
        } else {
            this.logger.warn('DESYNC : handleObjectModified : Object not found in canvas');
        }
    }
    handleObjectAdded(object) {         // Objet ajouté par un autre utilisateur
        this.addedObjectIds.add(object.id);
        fabric.util.enlivenObjects([object], function(enlivenedObjects) {
            this.logger.debug('handleObjectAdded : ' + enlivenedObjects[0].id);
            this.canvas.add(enlivenedObjects[0]);
            this.canvas.renderAll();
        }.bind(this));
    }
    handleObjectRemoved(object) {       // Objet supprimé par un autre utilisateur
        this.removedObjectIds.add(object.id);
        let canvasObject = this.getObjectById(object.id);
        if (canvasObject) {
            this.logger.debug('handleObjectRemoved : ' + canvasObject.id);
            this.canvas.remove(canvasObject);
            this.canvas.renderAll();
        } else {
            this.logger.warn('DESYNC : handleObjectRemoved : Object not found in canvas');
        }
    }
    handleObjectsSelected(event) {      // Objets sélectionnés par un autre utilisateur
        var userId = event.userId;                                                     // Id de l'utilisateur sélectionnant les objets
        let oldSelectionByUser = this.selectedByOthersObjectIds.get(userId) || [];     // Ancienne sélection de l'utilisateur
        let newSelectionByUser = event.objectIds;                                      // Nouvelle sélection de l'utilisateur
        this.handleSelectionModification(oldSelectionByUser, newSelectionByUser, userId);
    }
    handleObjectsDeselected(userId) {   // Objets désélectionnés par un autre utilisateur
        let oldSelectionByUser = this.selectedByOthersObjectIds.get(userId) || [];
        this.handleSelectionModification(oldSelectionByUser, [], userId);
    }
    handleSelectionModification(oldSelection, newSelection, userId) {

        // Supprimer les objets désélectionnés
        oldSelection.forEach(objectId => {
            if (!newSelection.includes(objectId)) {
                let canvasObject = this.getObjectById(objectId);                          // Objet désélectionné
                let selectionRec = this.getObjectById('selectionRec|' + objectId);        // Sélection de l'objet
                let selectionLabel = this.getObjectById('selectionLabel|' + objectId);    // Étiquette de l'objet
                if (!canvasObject) {
                    this.logger.warn('DESYNC : handleSelectionModification : Object not found in canvas');
                    return;
                }
                this.logger.debug('Object ' + canvasObject.id + ' is now selectable');
                canvasObject.set('selectable', true);
                canvasObject.set('evented', true);
                if (!selectionRec) {
                    this.logger.warn('DESYNC : handleSelectionModification : Selection not found in canvas');
                    return;
                }
                if (!selectionLabel) {
                    this.logger.warn('DESYNC : handleSelectionModification : Label not found in canvas');
                    return;
                }
                this.logger.debug('Removing selection ' + selectionRec.id + ' for object ' + objectId);
                this.canvas.remove(selectionRec);
                this.logger.debug('Removing label ' + selectionLabel.id + ' for object ' + objectId);
                this.canvas.remove(selectionLabel);
            }
        });

        // Ajouter les objets sélectionnés
        newSelection.forEach(objectId => {
            if (!oldSelection.includes(objectId)) {
                let canvasObject = this.getObjectById(objectId);                          // Objet sélectionné
                if (!canvasObject) {
                    this.logger.warn('DESYNC : handleSelectionModification : Object not found in canvas');
                    return;
                }
                this.logger.debug('Object ' + canvasObject.id + ' is now unselectable');
                canvasObject.set('selectable', false);
                canvasObject.set('evented', false);

                canvasObject.setCoords();
                let bound = canvasObject.getBoundingRect();

                this.logger.debug('Creating selection for object ' + canvasObject.id);
                let selection = new fabric.Rect({
                    id: 'selectionRec|' + canvasObject.id,
                    left: bound.left - 2,
                    top: bound.top - 2,
                    width: bound.width + 4,
                    height: bound.height + 4,
                    fill: 'rgba(0,0,0,0)',
                    stroke: this.othersColors.get(userId),
                    selectable: false,
                    evented: false
                });
                this.canvas.add(selection);

                let label = new fabric.Text(userId, {
                    id: 'selectionLabel|' + canvasObject.id,
                    left: bound.left + 0.5,
                    top: bound.top - 20,
                    fontSize: 12,
                    fill: this.othersColors.get(userId),
                    selectable: false,
                    evented: false
                });
                this.canvas.add(label);
            }
        });

        // Mettre à jour la sélection
        this.selectedByOthersObjectIds.set(userId, newSelection);
        this.canvas.renderAll();
        
    }
    handleUserConnected(userId) {       // Un autre utilisateur s'est connecté
        let color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.othersColors.set(userId, color);
    }
    handleUserDisconnected(userId) {    // Un autre utilisateur s'est déconnecté
        this.othersColors.delete(userId);
        this.selectedByOthersObjectIds.delete(userId);
    }

    //============================= OTHERS =============================
    getObjectById(id) {
        return this.canvas.getObjects().find(obj => obj.id === id);
    }

    // updateSelectionRenderbis() {
    //     this.logger.debug('updateSelectionRenderBis');
    //     this.canvas.contextContainer.clearRect(0, 0, this.canvas.width, this.canvas.height);

    //     this.canvas.getObjects().forEach(obj => {
    //         this.selectedByOthersObjectIds.forEach((objectIds, userId) => {
    //             if (objectIds.includes(obj.id)) {
    //                 this.logger.debug('Rendering selection for object ' + obj.id);
    //                 obj.setCoords();
    //                 var bound = obj.getBoundingRect();
    //                 this.canvas.contextContainer.strokeStyle = this.othersColors.get(userId);
    //                 this.canvas.contextContainer.fillStyle = this.othersColors.get(userId);
    //                 this.canvas.contextContainer.strokeRect(
    //                     bound.left + 0.5,
    //                     bound.top + 0.5,
    //                     bound.width,
    //                     bound.height
    //                 );
    //                 this.canvas.contextContainer.fillText(userId, bound.left + 0.5, bound.top - 5);
    //             }
    //         });
    //     });

    // }

    updateSelectionRender() {
        this.logger.debug('updateSelectionRender');

        this.selectedByOthersObjectIds.forEach((objectIds, userId) => {
            // Mettre à jour les sélections
            objectIds.forEach(objectId => {
                let canvasObject = this.getObjectById(objectId);                          // Objet sélectionné
                let selectionRec = this.getObjectById('selectionRec|' + objectId);        // Sélection de l'objet
                let selectionLabel = this.getObjectById('selectionLabel|' + objectId);    // Étiquette de l'objet
                if (!canvasObject) {
                    this.logger.warn('DESYNC : updateSelectionRender : Object not found in canvas');
                    return;
                }
                if (!selectionRec) {
                    this.logger.warn('DESYNC : updateSelectionRender : Selection not found in canvas');
                    return;
                }
                if (!selectionLabel) {
                    this.logger.warn('DESYNC : updateSelectionRender : Label not found in canvas');
                    return;
                }
                
                canvasObject.setCoords();
                let boundingRect = canvasObject.getBoundingRect();
                selectionRec.set({
                    left: boundingRect.left - 2,
                    top: boundingRect.top - 2,
                    width: boundingRect.width + 4,
                    height: boundingRect.height + 4
                });
                selectionLabel.set({
                    left: boundingRect.left + 0.5,
                    top: boundingRect.top - 20
                });
            });
        });
    }
}