const { getAuthorizedCharacter } = require('../services/esi');
const axios = require('axios');

module.exports = async function iskModule(tg_id, chat_id, bot) {
  try {
    const char = await getAuthorizedCharacter(tg_id);
    const { access_token, character_id } = char;

    const response = await axios.get(`https://esi.evetech.net/latest/characters/${character_id}/wallet/`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const balance = Math.floor(response.data).toLocaleString('ru-RU');
    bot.sendMessage(chat_id, `💰 Баланс персонажа ${char.character_name}:\n${balance} ISK`);
  } catch (err) {
    if (err === 'not found') {
      const loginUrl = require('../services/esi').getLoginURL(chat_id);
      return bot.sendMessage(chat_id, '⛔ Вы не авторизованы. Войдите через EVE:', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔐 Авторизация', url: loginUrl }]]
        }
      });
    }

    if (err === 'refresh_failed') {
      return bot.sendMessage(chat_id, '❌ Ошибка обновления токена. Введите /change и авторизуйтесь заново.');
    }

    console.error('[ISK MODULE ERROR]', err);
    bot.sendMessage(chat_id, '🚨 Ошибка получения баланса.');
  }
};
