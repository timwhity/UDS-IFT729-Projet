const express = require('express');

const app = express();
const port = 3000;

app.get('/', (req, res) => {
	// Traitement sur l'url, sur les cookies, ... 
	  res.render('index');
});

app.set('view engine', 'ejs');

app.listen(port, () => {
	  console.log(`Example app listening at http://localhost:${port}`);
});