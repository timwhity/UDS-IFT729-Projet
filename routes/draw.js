var express = require('express');
var router = express.Router();

const logLevel = 'DEBUG';
const logMode = 'ALERT';

router.get('/', (req, res, next) => {
	let userId = req.query.username;
    if (!userId || userId === '') {
        userId = Math.random().toString(36).substring(7);
    }
    console.log('userId : ', userId);
    res.render('draw', {
        userId: userId,
        logLevel: logLevel,
        logMode: logMode
    });
});



module.exports = router;
