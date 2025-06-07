const db = require('../db');
const { getLoginURL } = require('../services/esi');
const modulesList = require('../constants/modules');

module.exports = function handleCallback(bot) {
  bot.on('callback_query', (query) => {
    const tg_id = query.from.id;
    const modId = query.data.replace('mod_', '');
    const selected = modulesList.find(mod => mod.id === modId);

    db.get('SELECT character_id FROM users WHERE telegram_id = ?', [tg_id], (err, row) => {
      if (err || !row) {
        const loginUrl = getLoginURL(tg_id);
        bot.answerCallbackQuery(query.id);
        return bot.sendMessage(query.message.chat.id, `⛔ Вы не авторизованы. Пожалуйста, авторизуйтесь:`, {
          reply_markup: {
            inline_keyboard: [[{ text: '🔐 Авторизоваться', url: loginUrl }]]
          }
        });
      }

      bot.answerCallbackQuery(query.id);
      const reply = selected
        ? `${selected.label} пока не реализован.`
        : 'Модуль не найден.';
      bot.sendMessage(query.message.chat.id, reply);
    });
  });
};
