const db = require('../db');
const { getLoginURL } = require('../services/esi');
const getMenuPage = require('../utils/getMenuPage');

module.exports = function startCommand(bot, msg) {
  const chatId = msg.chat.id;

  db.get('SELECT character_name FROM users WHERE telegram_id = ?', [chatId], (err, row) => {
    if (err) {
      console.error('[DB] Ошибка при запросе пользователя:', err.message);
      return bot.sendMessage(chatId, '🚨 Ошибка при проверке авторизации.');
    }

    if (!row) {
      const loginUrl = getLoginURL(chatId);
      return bot.sendMessage(chatId, `👋 Привет! Чтобы пользоваться ботом, сначала авторизуйся через EVE Online:`, {
        reply_markup: {
          inline_keyboard: [[{ text: '🔐 Авторизоваться', url: loginUrl }]]
        }
      });
    }

    const keyboard = getMenuPage(0);
    bot.sendMessage(chatId, `👋 Добро пожаловать, ${row.character_name}!\nВыбери модуль:`, keyboard);
  });
};
