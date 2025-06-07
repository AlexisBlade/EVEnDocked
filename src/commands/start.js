// Обработка команды /start

const TelegramBot = require('node-telegram-bot-api');

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

  const keyboard = {
    inline_keyboard: modulesList.map(mod => [
      { text: mod.label, callback_data: `mod_${mod.id}` }
    ])
  };

  bot.sendMessage(chatId, `Добро пожаловать в EVEnDocked!\nВыбери модуль:`, {
    reply_markup: keyboard
  });

  bot.on('callback_query', (query) => {
    const modId = query.data.replace('mod_', '');
    const selected = modulesList.find(mod => mod.id === modId);
    const reply = selected
      ? `${selected.label} пока не реализован.`
      : 'Модуль не найден.';
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(query.message.chat.id, reply);
  });
};
