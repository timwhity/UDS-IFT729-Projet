const Redis = require('redis')

const connectionParameters = {
    password: 'KPkK9PrJWbniXWahsO09WqPpuAOL1p6e',
    socket: {
        host: 'redis-12266.c322.us-east-1-2.ec2.cloud.redislabs.com',
        port: 12266
    }
}

const redisClient = Redis.createClient(connectionParameters);

redisClient.connect(connectionParameters).then(() => {
    console.log('connection successful with redis')
})

redisClient.on("error", function(err) {
    console.log("Error: " + err)
})

async function loadFromDb(boardId) {
    let data = await redisClient.get('tableau-' + boardId);
    return data
}

async function saveToDb(canvas, boardId) {
    // newElements = elements.map(element => element.toObject());
    var jsonData = JSON.stringify(canvas);
    // console.log(jsonData)
    await redisClient.set('tableau-' + boardId, jsonData)
}

async function createBoard(boardId, password) {
    await redisClient.set(boardId, password)
}

async function getBoard(boardId) {
    let password = await redisClient.get(boardId)
    return password
}

module.exports = { saveToDb, loadFromDb, createBoard, getBoard }