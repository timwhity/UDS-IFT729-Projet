const Redis = require('redis')
const redisClient = Redis.createClient();
connectionParameters = {
    password: 'KPkK9PrJWbniXWahsO09WqPpuAOL1p6e',
    socket: {
        host: 'redis-12266.c322.us-east-1-2.ec2.cloud.redislabs.com',
        port: 12266
    }
}

redisClient.connect(connectionParameters).then(() => {
    console.log('connection')
})


// Load canvas from JSON

async function createRoomDb() {}

async function loadFromDb() {
    let data = await redisClient.get('tableau');

    return data
        // canvas.loadFromJSON(JSON.parse(data), canvas.renderAll.bind(canvas));
}

async function saveToDb(canvas) {

    // newElements = elements.map(element => element.toObject());
    var jsonData = JSON.stringify(canvas);
    console.log(jsonData)

    await redisClient.set('tableau', jsonData)
}

module.exports = { saveToDb, loadFromDb }

/*

DB Schema

room:id : {
    name: room_name,
    canvas: canvas
};


create room :{
    room_name,
    room_id,
    username,
    room_password
}

log into room {
    username,
    room_password,
    room_id
}


messaging is not persistent;


*/