var express = require('express');
var router = express.Router();

var hash = require('pbkdf2-password')()
var session = require('express-session');

var drawRouter = require('./draw');
var homeRouter = require('./home');
var dataRequest = require('../utils/connection');

router.use(express.urlencoded({ extended: false }))
router.use(session({
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
  secret: 'mawCO2d1WGGsdffqdQFSFRDFAZ3ZRZZEbDQx9NXzD9jUr147SZ26zvad'
}));

// Session-persisted message middleware
router.use(function(req, res, next){
	var err = req.session.error;
	var msg = req.session.success;
	delete req.session.error;
	delete req.session.success;
	res.locals.message = '';
	if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
	if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
	next();
});

// Authenticate using our plain-object database of doom!
function authenticate(name, pass, fn) {
	dataRequest('SELECT * FROM users WHERE username = ?', [name], function(err, user) {
		if (err) return fn(err)
		if (!user || user.length < 0) return fn(null, null)
		user = user[0];

		// apply the same algorithm to the POSTed password, applying the hash against the pass / salt, if there is a match we found the user
		hash({ password: pass, salt: user.salt }, function (err, pass, salt, hash) {
			if (err) return fn(err);
			if (hash === user.hash) return fn(null, user)
			fn(null, null)
		});
	});
}

function restrict(req, res, next) {
	if (req.session.user) {
		next();
	} else {
		req.session.error = 'Access denied!';
		res.redirect('/s/login');
	}
}

router.use('/home', restrict, homeRouter);
router.use('/draw', restrict, drawRouter);

router.get('/', function(req, res){
	if (req.session.user) {
		res.redirect('/s/home')
	} else {
		res.redirect('/s/login');
	}
});

router.get('/login', function(req, res){
	res.render('login');
});
router.get('/logout', function(req, res){
	req.session.destroy(function(){
		res.redirect('/s/login');
	});
});
router.get('/signup', function(req, res){
	res.render('signup');
});

router.post('/login', function (req, res, next) {
	authenticate(req.body.username, req.body.password, function(err, user){
		if (err) return next(err)
		if (user) {
			// Regenerate session when signing in to prevent fixation
			req.session.regenerate(function(){
				req.session.user = user;
				req.session.success = 'Auhentifié en tant que ' + user.name
					+ ' Cliquer <a href="/s/logout">ici</a> pour vous déconnecter. '
					+ ' Vous pouvez maintenant accéder aux <a href="/s/home">données</a>.';
				res.redirect('/s/home');
			});
		} else {
			req.session.error = 'Nom d\'utilisateur ou mot de passe invalide.';
			res.redirect('/s/login');
		}
	});
});

router.post('/signup', function(req, res){
	const username = req.body.username;

	if (!username || username === '' || username.length < 3) {
		req.session.error = 'Veuillez saisir un nom d\'utilisateur valide.';
		res.redirect('/s/signup');
		return;
	}
	if (!req.body.password || req.body.password === '' || req.body.password.length < 8) {
		req.session.error = 'Veuillez saisir un mot de passe valide.';
		res.redirect('/s/signup');
		return;
	}


	hash({ password: req.body.password }, function (err, pass, salt, hash) {
		if (err) throw err;
		// store the salt & hash in the "db"
		dataRequest('INSERT INTO users (username, salt, hash) VALUES (?, ?, ?)', [username, salt, hash], (err, user) => {
			if (err) throw err;
			req.session.success = 'Utilisateur créé avec succès !';
			res.redirect('/s/login');
		});
	});
});


module.exports = router;