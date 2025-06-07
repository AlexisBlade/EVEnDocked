// Express-сервер + точка входа

require('dotenv').config();
const express = require('express');
const bot = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  try {
    res.send('EVEnDocked is running.');
  } catch (err) {
    console.error('Error in / route:', err);
    res.status(500).send('Something went wrong!');
  }
});

app.listen(PORT, () => {
  console.log(`[EVEnDocked] Web server listening at http://localhost:${PORT}`);
});
