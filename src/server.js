const express = require('express');
const { getToken, getCharacterInfo } = require('./services/esi');
const db = require('./db');
const bot = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('EVEnDocked is running.');
});

app.get('/login', (req, res) => {
  res.redirect(require('./services/esi').getLoginURL());
});

app.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const chat_id = req.query.state; 

    const tokenData = await getToken(code);
    const charData = await getCharacterInfo(tokenData.access_token);

    db.run(`
      INSERT OR REPLACE INTO users (character_id, character_name, access_token, refresh_token, expires_at, telegram_id)
      VALUES (?, ?, ?, ?, datetime('now', '+3600 seconds'), ?)
    `, [
      charData.CharacterID,
      charData.CharacterName,
      tokenData.access_token,
      tokenData.refresh_token,
      chat_id
    ]);

    bot.sendMessage(chat_id, `✅ Авторизация прошла успешно!\nПривязан персонаж: ${charData.CharacterName}\nМожешь использовать /start для доступа к модулям.`);

    res.send(`<h2>Готово!</h2><p>Вы успешно авторизовались как ${charData.CharacterName}. Возвращайтесь в Telegram!</p>`);
  } catch (err) {
    console.error('OAuth error:', err);
    res.status(500).send('Ошибка авторизации.');
  }
});

app.listen(PORT, () => {
  console.log(`[EVEnDocked] Web server listening at http://localhost:${PORT}`);
});
