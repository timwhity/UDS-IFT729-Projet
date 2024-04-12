const COLORS = ['rgba(200,0,0,1)', 'rgba(0,200,0,1)', 'rgba(0,0,200,1)', 'rgba(200,200,0,1)', 'rgba(0,200,200,1)', 'rgba(200,0,200,1)',
    'rgba(100,100,100,1)', 'rgba(150, 0, 0,1)', 'rgba(0, 150, 0,1)', 'rgba(0, 0, 150,1)', 'rgba(150, 150, 0,1)', 'rgba(0, 150, 150,1)',
    'rgba(150, 0, 150,1)', 'rgba(100, 100, 100,1)', 'rgba(100, 0, 0,1)', 'rgba(0, 100, 0,1)', 'rgba(0, 0, 100,1)', 'rgba(100, 100, 0,1)',
    'rgba(0, 100, 100,1)', 'rgba(100, 0, 100,1)', 'rgba(50, 50, 50,1)'
];

class CanvasManager {
    constructor(canvas, socket, logger, boardId, userId, writePermission) {
        this.canvas = canvas;
        this.socket = socket;
        this.logger = logger;
        this.action = "";
        this.clickPoint = null;
        this.writePermission = writePermission;
        this.boardId = boardId;
        this.userId = userId;
        this.id_obj = 0; // Utilisé pour créer les id des objets

        this.addedObjectIds = new Set(); // Liste des objets ajoutés par d'autres utilisateurs, pour éviter de renvoyer leur création
        this.removedObjectIds = new Set(); // Liste des objets supprimés par d'autres utilisateurs, pour éviter de renvoyer leur suppression
        this.selectedByOthersObjectIds = new Map(); // Liste des objets sélectionnés par d'autres utilisateurs, pour mettre à jour le rendu et interdire leur sélection
        this.modificationAuthorizedObjectIds = new Set(); // Liste des objets modifiables par l'utilisateur, pour autoriser leur modification
        this.othersColors = new Map(); // Liste des couleurs des autres utilisateurs

        // Server -> Client
        this.socket.on('error', this.handleError.bind(this));
        this.socket.on('object modified', this.handleObjectModified.bind(this));
        this.socket.on('object added', this.handleObjectAdded.bind(this));
        this.socket.on('object removed', this.handleObjectRemoved.bind(this));
        this.socket.on('objects selected', this.handleObjectsSelected.bind(this));
        this.socket.on('objects deselected', this.handleObjectsDeselected.bind(this));
        this.socket.on('user connected', this.handleUserConnected.bind(this));
        this.socket.on('user disconnected', this.handleUserDisconnected.bind(this));
        // Client -> Server
        this.canvas.on('object:modified', this.emitObjectModified.bind(this));
        this.canvas.on('object:moving', this.emitObjectMoving.bind(this));
        this.canvas.on('object:rotating', this.emitObjectMoving.bind(this));
        this.canvas.on('object:scaling', this.emitObjectMoving.bind(this));
        this.canvas.on('object:skewing', this.emitObjectMoving.bind(this));
        this.canvas.on('object:added', this.emitObjectAdded.bind(this));
        this.canvas.on('object:removed', this.emitObjectRemoved.bind(this));
        this.canvas.on('selection:created', this.emitObjectsSelected.bind(this));
        this.canvas.on('selection:cleared', this.emitObjectsDeselected.bind(this));
        this.canvas.on('selection:updated', this.emitSelectionUpdated.bind(this));

        // Rerender
        this.canvas.on('before:render', function() {
            this.updateSelectionRender();
        }.bind(this));

        this.canvas.on('mouse:down', function() {
            console.log("========== down mouse ========== ", this.action);
            if(this.action=='addPencil'){
                this.addPencil();
            }
        }.bind(this));
        this.canvas.on('mouse:up', function(event) {
            console.log("========== up mouse ==========", event);
            this.clickPoint = event.pointer;
            if(this.action=='addRect'){
                this.createRec();
            }else if(this.action == 'addCircle'){
                this.createCircle();
            }else if(this.action=='addLine'){
                this.addLine();
            }if(this.action=='addPencil'){
                //this.canvas.isDrawingMode= false;
            }
            
        }.bind(this));

        // Initialisation 
        if (!this.writePermission) {
            alert('You are in read-only mode');
        }
        this.askConnection();
        this.socket.on('connection-ok', this.connectionOk.bind(this));
    }

    //============================== INITIALIZATION ==============================
    askConnection() {
        this.socket.emit('connection-asked', this.boardId, this.userId, this.writePermission);
    }
    connectionOk(obj) {
        this.logger.debug('ConnectionOk');
        // Récupérérer les objets
        this.logger.debug(obj.objects);
        obj.objects.forEach(object => {
            this.logger.debug('object id : ' + object.id);
            this.addedObjectIds.add(object.id);
        })

        fabric.util.enlivenObjects(obj.objects, function(enlivenedObjects) {
            if (enlivenedObjects.length > 0) {
                enlivenedObjects.forEach(object => {
                    this.logger.debug('handleObjectAdded : ' + object);
                    this.canvas.add(object);
                });

            }
        }.bind(this));
        this.canvas.renderAll();

        // Initialiser les autres utilisateurs
        obj.users.forEach(userId => {
            this.othersColors.set(userId, COLORS[Math.floor(Math.random() * COLORS.length)]);
        });

        // Initialiser le compteur de présence des utilisateurs
        this.updateCounter(obj.users.length);
        this.socket.emit("objet initialiser");

    }


    //============================= SERVER -> CLIENT =============================
    handleError(title, message) {
        this.logger.error("ERROR send by server : " + title + " - " + message);
        window.location.href = "/error?title=" + title + "&message=" + message;
    }

    handleObjectModified(object) { // Objet modifié par un autre utilisateur
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


    handleObjectAdded(object) { // Objet ajouté par un autre utilisateur
        this.addedObjectIds.add(object.id);
        fabric.util.enlivenObjects([object], function(enlivenedObjects) {
            this.logger.debug('handleObjectAdded : ' + enlivenedObjects[0].id);
            this.canvas.add(enlivenedObjects[0]);
            this.canvas.renderAll();
        }.bind(this));
    }
    handleObjectRemoved(object) { // Objet supprimé par un autre utilisateur
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
    handleObjectsSelected(event) { // Objets sélectionnés par un autre utilisateur
        var userId = event.userId; // Id de l'utilisateur sélectionnant les objets
        let oldSelectionByUser = this.selectedByOthersObjectIds.get(userId) || []; // Ancienne sélection de l'utilisateur
        let newSelectionByUser = event.objectIds; // Nouvelle sélection de l'utilisateur
        this.logger.debug('User ' + userId + ' selected objects : ' + newSelectionByUser.join(', '));
        this.handleSelectionModification(oldSelectionByUser, newSelectionByUser, userId);
    }
    handleObjectsDeselected(userId) { // Objets désélectionnés par un autre utilisateur
        let oldSelectionByUser = this.selectedByOthersObjectIds.get(userId) || [];
        this.logger.debug('User ' + userId + ' deselected objects : ' + oldSelectionByUser.join(', '));
        this.handleSelectionModification(oldSelectionByUser, [], userId);
    }
    handleSelectionModification(oldSelection, newSelection, userId) {

        // Supprimer les objets désélectionnés
        oldSelection.forEach(objectId => {
            if (!newSelection.includes(objectId)) {
                let canvasObject = this.getObjectById(objectId); // Objet désélectionné
                let selectionRec = this.getObjectById('selectionRec|' + objectId); // Sélection de l'objet
                let selectionLabel = this.getObjectById('selectionLabel|' + objectId); // Étiquette de l'objet
                if (!canvasObject) {
                    this.logger.warn('DESYNC : handleSelectionModification : Object not found in canvas');
                    return;
                }
                if (this.writePermission) {
                    this.logger.debug('Object ' + canvasObject.id + ' is now selectable');
                    canvasObject.set('selectable', true);
                    canvasObject.set('evented', true);
                }
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
                let canvasObject = this.getObjectById(objectId); // Objet sélectionné
                if (!canvasObject) {
                    this.logger.warn('DESYNC : handleSelectionModification : Object not found in canvas');
                    return;
                }
                this.logger.debug('Object ' + canvasObject.id + ' is now unselectable');
                canvasObject.set('selectable', false);
                canvasObject.set('evented', false);

                canvasObject.setCoords();
                let bound = canvasObject.getBoundingRect();
                let color = this.othersColors.get(userId);
                if (!color) {
                    this.logger.warn('DESYNC : handleSelectionModification : Color not found');
                    return;
                }

                this.logger.debug('Creating selection for object ' + canvasObject.id);
                let selection = new fabric.Rect({
                    id: 'selectionRec|' + canvasObject.id,
                    left: bound.left - 2,
                    top: bound.top - 2,
                    width: bound.width + 4,
                    height: bound.height + 4,
                    fill: 'rgba(0,0,0,0)',
                    stroke: color,
                    selectable: false,
                    evented: false
                });
                this.canvas.add(selection);

                let label = new fabric.Text(userId, {
                    id: 'selectionLabel|' + canvasObject.id,
                    left: bound.left + 0.5,
                    top: bound.top - 20,
                    fontSize: 12,
                    fill: color,
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
    handleUserConnected(userId) { // Un autre utilisateur s'est connecté
        this.logger.debug('User connected : ' + userId);
        let color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.othersColors.set(userId, color);
        this.updateCounter(this.othersColors.size);
    }
    handleUserDisconnected(userId) { // Un autre utilisateur s'est déconnecté
        this.logger.debug('User disconnected : ' + userId);
        this.othersColors.delete(userId);
        this.selectedByOthersObjectIds.delete(userId);
        this.updateCounter(this.othersColors.size);
    }

    //================================= BUTTONS ==================================

    createText() {
        var text = new fabric.Textbox('', {
            width: 450,
            height: 30,
            id: this.genId()
        });
        return text;
    }

    createShape(shapeType) {
        // Ensure shapeType is a valid shape constructor provided by Fabric.js
        if (!fabric[shapeType]) {
            console.error("Invalid shape type:", shapeType);
            return;
        }

        if(shapeType=="Circle"){
            return new fabric[shapeType]({
                left: this.clickPoint.x,
            top: this.clickPoint.y,
                // width: 20,
                // height: 20,
                radius: 50, 
                fill: '', 
                stroke: 'black', 
                strokeWidth: 3 ,
                    id: this.genId()
            })
            
            
        }else if(shapeType=="Line"){
            return new fabric[shapeType]([this.clickPoint.x, this.clickPoint.y, this.clickPoint.x+100, this.clickPoint.y],{
                stroke: 'black', 
                strokeWidth: 3 ,
                id: this.genId()
            })
        }else if(shapeType == "PencilBrush"){
            return new fabric['PencilBrush'](this.canvas);
        }

        // Create the shape dynamically using bracket notation
        var shape = new fabric[shapeType]({
            left: this.clickPoint.x,
            top: this.clickPoint.y,
            fill: 'red',
            width: 20,
            height: 20,
            id: this.genId()
        });

        return shape;
    }

    setAction(action) {
        this.action = action;
    }

    createRec() {
        if (!this.writePermission) return;
        const rectangle = this.createShape('Rect')
        canvas.add(rectangle);
        canvas.setActiveObject(rectangle);
    }

    createCircle() {
        if (!this.writePermission) return;
        const circle = this.createShape('Circle')
        canvas.add(circle);
        canvas.setActiveObject(circle);
    }

    createTriangle() {
        if (!this.writePermission) return;
        const triangle = this.createShape('Triangle')
        canvas.add(triangle);
        canvas.setActiveObject(triangle);
    }

    addImage() {
        if (!this.writePermission) return;
    }

    addText() {
        if (!this.writePermission) return;
        const text = this.createText()
        canvas.add(text);
        canvas.setActiveObject(text);
    }

    addLine() {
        if (!this.writePermission) return;
        const line = this.createShape('Line')
        canvas.add(line);
        canvas.setActiveObject(line);
    }

    addPencil() {
        if (!this.writePermission) return;
        console.log("============ add pencil =============");
        const pencil = this.createShape('PencilBrush')
        this.canvas.isDrawingMode= true;
        this.canvas.freeDrawingBrush = pencil;
        this.canvas.freeDrawingBrush.color = "black";
       // canvas.add(line);
        //canvas.setActiveObject(line);
    }

    addEraser() {
        if (!this.writePermission) return;
    }

    del() {
        if (!this.writePermission) return;
        for (const obj of canvas.getActiveObjects()) {
            canvas.remove(obj);
        }
    }

    updateCounter(count) { // Mise à jour du compteur
        this.logger.debug('Counter updated : ' + count);
        document.querySelector('.active-users').textContent = `${count} actifs`;
    }

    saveCanvas() {
        connection = "http://localhost:3000"
    }

    //============================= CLIENT -> SERVER =============================
    emitObjectModified(e) { // Objet modifié par le client
        if (!this.checkRights()) return;
        if (e.target.type === 'activeSelection') {
            e.target.getObjects().forEach((object) => {
                if (!this.modificationAuthorizedObjectIds.has(object.id)) {
                    this.logger.warn('Modification unauthorized');
                    return;
                }
                this.logger.debug('emitObjectModified : ' + object.id);
                this.socket.emit('object modified', object.toObject(['id', 'left', 'top']));
            });
        } else {
            if (!this.modificationAuthorizedObjectIds.has(e.target.id)) {
                this.logger.warn('Modification unauthorized');
                return;
            }
            this.logger.debug('emitObjectModified : ' + e.target.id);
            this.socket.emit('object modified', e.target.toObject(['id']));
        }
    }
    emitObjectMoving(e){
        if (!this.checkRights()) return;
        if (e.target.type === 'activeSelection') {
            e.target.getObjects().forEach((object) => {
                if (!this.modificationAuthorizedObjectIds.has(object.id)) {
                    this.logger.warn('Modification unauthorized');
                    return;
                }
                this.logger.debug('emitObjectMoving : ' + object.id);
                this.socket.emit('object moving', object.toObject(['id', 'left', 'top']));
            });
        } else {
            if (!this.modificationAuthorizedObjectIds.has(e.target.id)) {
                this.logger.warn('Modification unauthorized');
                return;
            }
            this.logger.debug('emitObjectMoving : ' + e.target.id);
            this.socket.emit('object moving', e.target.toObject(['id']));
        }
    }
    emitObjectAdded(e) { // Objet ajouté par le client
        if (e.target.id.startsWith('selection')) return; // Si l'objet modifié est une sélection, on ne la renvoie pas
        if (this.addedObjectIds.has(e.target.id)) { // Si la création de l'objet a été envoyée par le serveur, on ne la renvoie pas
            this.addedObjectIds.delete(e.target.id);
            return;
        }
        if (!this.checkRights()) return;
        this.logger.debug('emitObjectAdded : ' + e.target.id);
        this.socket.emit('object added', e.target.toObject(['id']));
    }
    emitObjectRemoved(e) { // Objet supprimé par le client
        if (e.target.id.startsWith('selection')) return; // Si l'objet modifié est une sélection, on ne la renvoie pas
        if (this.removedObjectIds.has(e.target.id)) { // Si la suppression de l'objet a été envoyée par le serveur, on ne la renvoie pas
            this.removedObjectIds.delete(e.target.id);
            return;
        }
        if (!this.checkRights()) return;
        this.logger.debug('emitObjectRemoved : ' + e.target.id);
        this.socket.emit('object removed', e.target.toObject(['id']));
    }
    emitObjectsSelected(e) { // Objets sélectionnés par le client
        if (!this.checkRights()) return;
        console.log("================ emitObjectsSelected ============ ");
        this.action=null;
        this.logger.debug('emitObjectsSelected : ' + this.canvas.getActiveObjects().map(obj => obj.id).join(', '));
        this.socket.emit('objects selected', this.canvas.getActiveObjects().map(obj => obj.id));
        this.modificationAuthorizedObjectIds = new Set(this.canvas.getActiveObjects().map(obj => obj.id));
    }
    emitObjectsDeselected(e) { // Objets désélectionnés par le client
        if (!this.checkRights()) return;
        this.logger.debug('emitObjectsDeselected');
        this.socket.emit('objects deselected');
        this.modificationAuthorizedObjectIds = new Set();
    }
    emitSelectionUpdated(e) { // Mise à jour de la sélection par le client
        if (!this.checkRights()) return;
        this.logger.debug('emitSelectionUpdated');
        this.socket.emit('objects selected', this.canvas.getActiveObjects().map(obj => obj.id));
        this.modificationAuthorizedObjectIds = new Set(this.canvas.getActiveObjects().map(obj => obj.id));
    }


    //============================= OTHERS =============================

    checkRights() {
        if (this.writePermission) return true;
        this.logger.warn('Modification should be unauthorized');
        return false;
    }

    getObjectById(id) {
        return this.canvas.getObjects().find(obj => obj.id === id);
    }

    genId() {
        return this.userId + '-' + this.id_obj++ + '-' + Math.floor(Math.random() * 1000);
    }

    updateSelectionRender() {
        this.logger.debug('updateSelectionRender');

        this.selectedByOthersObjectIds.forEach((objectIds, userId) => {
            // Mettre à jour les sélections
            objectIds.forEach(objectId => {
                let canvasObject = this.getObjectById(objectId); // Objet sélectionné
                let selectionRec = this.getObjectById('selectionRec|' + objectId); // Sélection de l'objet
                let selectionLabel = this.getObjectById('selectionLabel|' + objectId); // Étiquette de l'objet
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