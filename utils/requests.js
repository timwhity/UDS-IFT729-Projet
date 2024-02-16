var dataRequest = require('./connection');

function addUser(username, salt, hash, callback) {
	return dataRequest('INSERT INTO users (username, salt, hash) VALUES (?, ?)', [username, salt, hash], callback);
}
function getUser(username, callback) {
	return dataRequest('SELECT * FROM users WHERE username = ?', [username], callback);
}

module.exports = {
	addUser: addUser,
	getUser: getUser
}