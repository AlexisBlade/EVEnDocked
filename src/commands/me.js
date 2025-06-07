const db = require('../db');

module.exports = function meCommand(bot, msg) {
  const chatId = msg.chat.id;
  const tg_id = msg.from.id;

  db.get(
    'SELECT character_name, character_id, expires_at FROM users WHERE telegram_id = ?',
    [tg_id],
    (err, row) => {
      if (err) {
        console.error('[DB] Ошибка в /me:', err.message);
        return bot.sendMessage(chatId, '🚨 Ошибка при получении данных.');
      }

      if (!row) {
        return bot.sendMessage(chatId, `👤 Вы ещё не авторизованы. Введите /start, чтобы привязать персонажа.`);
      }

      bot.sendMessage(chatId, 
        `👤 Привязанный персонаж:\n` +
        `🧑 ${row.character_name} (ID: ${row.character_id})\n` +
        `🕒 Токен действителен до: ${row.expires_at}`
      );
    }
  );
};
