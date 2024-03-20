function saveCanvasStateToServer(canvas) {
    // Get the canvas state as JSON
    // var canvasState = JSON.stringify(canvas.toJSON());

    // Make an HTTP POST request to your server
    fetch('http://localhost:3000/database')
        .then(response => {
            if (response.ok) {
                console.log('Canvas state saved successfully.');
            } else {
                console.error('Failed to save canvas state:', response.statusText);
            }
        })
        .catch(error => {
            console.error('Error saving canvas state:', error);
        });
}