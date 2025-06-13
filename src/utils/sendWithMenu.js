module.exports = function sendWithMenu(bot, chatId, text, extra = {}) {
  return bot.sendMessage(chatId, text, {
    ...extra,
    reply_markup: {
      ...(extra.reply_markup || {}),
      inline_keyboard: [
        ...(extra.reply_markup?.inline_keyboard || []),
        [{ text: '📋 Меню', callback_data: 'menu_page_0' }]
      ]
    }
  });
};
