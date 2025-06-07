const db = require('../db');
const { getLoginURL } = require('../services/esi');

const modulesList = require('../constants/modules');

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

    const keyboard = {
      inline_keyboard: modulesList.map(mod => [
        { text: mod.label, callback_data: `mod_${mod.id}` }
      ])
    };

    bot.sendMessage(chatId, `👋 Добро пожаловать, ${row.character_name}!\nВыбери модуль:`, {
      reply_markup: keyboard
    });
  });
};
