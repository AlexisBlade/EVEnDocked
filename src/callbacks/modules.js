const modulesList = require('../constants/modules');
const db = require('../db');
const path = require('path');

module.exports = function handleCallback(bot) {
  bot.on('callback_query', async (query) => {
    console.log('➡️ Callback received:', query.data, 'from', query.from.id);
    const tg_id = query.from.id;
    const chat_id = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('menu_page_')) {
      await bot.answerCallbackQuery(query.id);
      const page = Number(data.split('_').pop());
      const { reply_markup } = require('../utils/getMenuPage')(page);
      return bot.editMessageReplyMarkup(reply_markup, { chat_id, message_id: query.message.message_id });
    }

    if (data === 'mod_logout') {
      await bot.answerCallbackQuery(query.id);
      db.run('UPDATE users SET telegram_id = NULL WHERE telegram_id = ?', [tg_id], err => {
        if (err) return bot.sendMessage(chat_id, '❌ Ошибка при выходе из аккаунта.');
        bot.sendMessage(chat_id, '🚪 Успешно вышел. Для входа — /start');
      });
      return;
    }

    // 🧠 Обработка скиллов
    if (data.startsWith('skills_') || data === 'mod_skills') {
      await bot.answerCallbackQuery(query.id);
      const skillsModule = require('../modules/skills');
      return skillsModule(tg_id, chat_id, bot, query);
    }

    // 🧩 Остальные модули
    if (data.startsWith('mod_')) {
      const modId = data.replace('mod_', '');
      const selected = modulesList.find(m => m.id === modId);
      db.get('SELECT character_id FROM users WHERE telegram_id = ?', [tg_id], async (err, row) => {
        if (err || !row) {
          const loginUrl = require('../services/esi').getLoginURL(chat_id);
          await bot.answerCallbackQuery(query.id);
          return bot.sendMessage(chat_id, `⛔ Не авторизован.`, {
            reply_markup: { inline_keyboard: [[{ text: '🔐 Войти', url: loginUrl }]] }
          });
        }

        await bot.answerCallbackQuery(query.id);

        try {
          const runModule = require(path.resolve(__dirname, `../modules/${modId}.js`));
          await runModule(tg_id, chat_id, bot);
        } catch (e) {
          console.error(`[Module Error] ${modId}:`, e);
          bot.sendMessage(chat_id, `${selected?.label || modId} пока не реализован.`);
        }
      });
    }
  });
};
