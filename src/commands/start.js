const db = require('../db');
const { getLoginURL } = require('../services/esi');

const modulesList = [
  { id: 'assets', label: '📦 Активы' },
  { id: 'industry', label: '🏭 Производство' },
  { id: 'market', label: '📈 Рынок' },
  { id: 'pi', label: '🌍 Планетарка' },
  { id: 'skills', label: '🧠 Скиллы и прокачка' },
  { id: 'contracts', label: '📑 Контракты' },
  { id: 'logistics', label: '🚚 Логистика' },
  { id: 'corp', label: '🏢 Корпорация' },
  { id: 'pvp', label: '🔫 PvP Мониторинг' },
  { id: 'bpo', label: '🧬 Чертежи / BPO' },
  { id: 'tax', label: '💸 Налоги' },
  { id: 'journal', label: '📒 Журнал ISK' },
  { id: 'deals', label: '📊 Аналитика сделок' },
  { id: 'activity', label: '🕒 Трекер активности' }
];

module.exports = function startCommand(bot, msg) {
  const chatId = msg.chat.id;

  db.get('SELECT character_name FROM users WHERE telegram_id = ?', [chatId], (err, row) => {
    if (err) {
      console.error('[DB] Ошибка при запросе пользователя:', err.message);
      return bot.sendMessage(chatId, '🚨 Ошибка при проверке авторизации.');
    }

    if (!row) {
      const loginUrl = getLoginURL(chatId); // 👈 chatId как state
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
