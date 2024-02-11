class CanvasManager {
    constructor(canvas, socket) {
        this.canvas = canvas;
        this.socket = socket;

        this.addedObjects = new Set();
        this.removedObjects = new Set();

        this.initSocketEvents();
        this.initCanvasEvents();
    }

    initSocketEvents() {        // Server -> Client
        this.socket.on('object modified', this.handleObjectModified.bind(this));
        this.socket.on('object added', this.handleObjectAdded.bind(this));
        this.socket.on('object removed', this.handleObjectRemoved.bind(this));
    }

    initCanvasEvents() {        // Client -> Server
        this.canvas.on('object:modified', this.emitObjectModified.bind(this));
        this.canvas.on('object:added', this.emitObjectAdded.bind(this));
        this.canvas.on('object:removed', this.emitObjectRemoved.bind(this));
    }

    emitObjectModified(e) {
        this.socket.emit('object modified', e.target.toObject());
    }

    emitObjectAdded(e) {
        if (this.addedObjects.has(e.target.id)) {
            this.addedObjects.delete(e.target.id);
            return;
        }
        this.socket.emit('object added', e.target.toObject());
    }

    emitObjectRemoved(e) {
        if (this.removedObjects.has(e.target.id)) {
            this.removedObjects.delete(e.target.id);
            return;
        }
        this.socket.emit('object removed', e.target.toObject());
    }

    handleObjectModified(object) {
        let canvasObject = this.canvas.getObjectById(object.id);
        if (canvasObject) {
            fabric.util.enlivenObjects([object], function(enlivenedObjects) {
                canvasObject.set(enlivenedObjects[0].toObject());
                this.canvas.renderAll();
            }.bind(this));
        }
    }
    handleObjectAdded(object) {
        this.addedObjects.add(object.id);
        fabric.util.enlivenObjects([object], function(enlivenedObjects) {
            this.canvas.add(enlivenedObjects[0]);
            this.canvas.renderAll();
        }.bind(this));
    }
    handleObjectRemoved(object) {
        this.removedObjects.add(object.id);
        let canvasObject = this.getObjectById(object.id);
        if (canvasObject) {
            this.canvas.remove(canvasObject);
            this.canvas.renderAll();
        } else {
            console.error('WARNING DESYNC : handleObjectRemoved : Object not found in canvas');
        }
    }

    getObjectById(id) {
        return this.canvas.getObjects().find(obj => obj.id === id);
    }
}