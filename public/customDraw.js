const canvas = document.getElementById("my-canvas");
const socket = io('/')


// Variables initialisation with canvas context and all the buttons
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

const ctx = canvas.getContext("2d");


const clearBtn = document.getElementById("clear-btn");
const redBtn = document.getElementById("red-btn");
const blueBtn = document.getElementById("blue-btn");
const greenBtn = document.getElementById("green-btn");
const blackBtn = document.getElementById("black-btn");
const colorPicker = document.getElementById("color-picker");

let drawing = false;

let x1, y1; // x1 and y1 represent the coordinates of the point of contact on the 2D canvas

// Event listeners for when the user uses the color picker or any other color as defined in the UI
colorPicker.addEventListener("blur", (e) => {
    ctx.strokeStyle = e.target.value;
    changeColor(e.target.value)
})

clearBtn.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
})
redBtn.addEventListener("click", () => {
    changeColor('#FF0000')
})
blueBtn.addEventListener("click", () => {
    changeColor('#0000FF')
})
greenBtn.addEventListener("click", () => {
    changeColor('#00FF00')
})
blackBtn.addEventListener("click", () => {
    changeColor('#000000')
})

function changeColor(color) {
    ctx.strokeStyle = color;
    colorPicker.value = color;
}

canvas.addEventListener("mousedown", (e) => {
    init(e);
    socket.emit('initialising', { offsetX: e.offsetX, offsetY: e.offsetY })
})
canvas.addEventListener("mousemove", (e) => {
    draw(e);
    socket.emit('user-drawing', { color: ctx.strokeStyle, offsetX: e.offsetX, offsetY: e.offsetY })

})

canvas.addEventListener("mouseup", (e) => {
    drawing = false;
    socket.emit('user-not-drawing')
})


function init(e) {
    x1 = e.offsetX;
    y1 = e.offsetY;
    drawing = true;

}

function broadCastDraw(e) {
    let userColor = ctx.strokeStyle
    ctx.strokeStyle = e.color
    draw(e)
    ctx.strokeStyle = userColor
}


function draw(e) {
    if (drawing) {
        ctx.beginPath();
        ctx.moveTo(x1, y1)
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
        ctx.closePath()
        x1 = e.offsetX;
        y1 = e.offsetY;

    }

}


socket.on('user-drawing', data => {
    broadCastDraw(data)
})

socket.on('initialising', data => {
    init(data)
})

socket.on('user-not-drawing', () => {
    drawing = false
})