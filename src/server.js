// Express-сервер + точка входа

require('dotenv').config();
const express = require('express');
const bot = require('./bot');
const { getLoginURL, getToken, getCharacterInfo } = require('./services/esi');
const db = require('./db');

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

// Авторизация через EVE
app.get('/login', (req, res) => {
  const url = getLoginURL();
  res.redirect(url);
});

app.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const tokenData = await getToken(code);
    const charData = await getCharacterInfo(tokenData.access_token);

    // сохраняем
    db.run(`
      INSERT INTO users (character_id, character_name, access_token, refresh_token, expires_at)
      VALUES (?, ?, ?, ?, datetime('now', '+3600 seconds'))
    `, [
      charData.CharacterID,
      charData.CharacterName,
      tokenData.access_token,
      tokenData.refresh_token
    ]);

    res.send(`<h2>Добро пожаловать, ${charData.CharacterName}!</h2><p>Токен успешно сохранён.</p>`);
  } catch (err) {
    console.error('OAuth error:', err);
    res.status(500).send('Ошибка авторизации.');
  }
});

app.listen(PORT, () => {
  console.log(`[EVEnDocked] Web server listening at http://localhost:${PORT}`);
});
