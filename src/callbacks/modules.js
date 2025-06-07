const modulesList = require('../constants/modules');
const db = require('../db');
const path = require('path');

module.exports = function handleCallback(bot) {
  bot.on('callback_query', async (query) => {
    const tg_id = query.from.id;
    const chat_id = query.message.chat.id;
    const modId = query.data.replace('mod_', '');
    const selected = modulesList.find(mod => mod.id === modId);

    if (modId === 'logout') {
      db.run('UPDATE users SET telegram_id = NULL WHERE telegram_id = ?', [tg_id], function (err) {
        if (err) {
          console.error('[LOGOUT] Ошибка:', err.message);
          return bot.sendMessage(chat_id, '❌ Ошибка при выходе из аккаунта.');
        }

        bot.sendMessage(chat_id, '🚪 Вы вышли из аккаунта. Чтобы снова войти — введите /start');
      });
      return;
    }

    db.get('SELECT character_id FROM users WHERE telegram_id = ?', [tg_id], async (err, row) => {
      if (err || !row) {
        const loginUrl = require('../services/esi').getLoginURL(chat_id);
        bot.answerCallbackQuery(query.id);
        return bot.sendMessage(chat_id, `⛔ Вы не авторизованы. Авторизуйтесь:`, {
          reply_markup: {
            inline_keyboard: [[{ text: '🔐 Авторизация', url: loginUrl }]]
          }
        });
      }

      bot.answerCallbackQuery(query.id);

      try {
        const modulePath = path.resolve(__dirname, `../modules/${modId}.js`);
        const runModule = require(modulePath);
        await runModule(tg_id, chat_id, bot);
      } catch (e) {
        console.log(`[MISSING MODULE] ${modId}`);
        bot.sendMessage(chat_id, `${selected ? selected.label : modId} пока не реализован.`);
      }
    });
  });
};
