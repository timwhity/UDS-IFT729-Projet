var express = require('express');
var router = express.Router();

const logLevel = 'DEBUG';
const logMode = 'ALERT';

router.get('/', (req, res, next) => {

    // Récupérer l'identifiant de l'utilisateur
    let user = req.session.user;
    if (!user) {
        res.redirect('/s/login');
        return;
    }

    console.log('user : ', user);
    res.render('draw', {
        userId: user,
        logLevel: logLevel,
        logMode: logMode
    });
});



module.exports = router;
