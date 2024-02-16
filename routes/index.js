var express = require('express');
var router = express.Router();

var secRouter = require('./sec');


router.use('/sec', secRouter);

router.get('/', (req, res, next) => {
  res.render('home');
});

router.get('/favicon.ico', (req, res, next) => {
  res.sendStatus(204);
});


module.exports = router;