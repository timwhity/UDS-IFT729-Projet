const mysql = require('mysql');
const dotenv = require('dotenv');


function connection() {
  return mysql.createConnection({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	database: process.env.DB_NAME
  });
}

function dataRequest(query, params, callback) {
  const db = connection();
  db.connect(function(err) {
    if (err) {
      return callback(err);
    }
    db.query(query, params, function (err, rows, fields) {
      db.end();
      if (err) {
        return callback(err);
      }
      return callback(null, rows);
    });
  });
}

module.exports = dataRequest