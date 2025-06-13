const { getAuthorizedCharacter } = require('../services/esi');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const resolveNames = require('../utils/resolveNames');
const sendWithMenu = require('../utils/sendWithMenu');

// Временный кэш на экспорт
const skillsCache = new Map();

module.exports = async function skillsModule(tg_id, chat_id, bot, query = null) {
  // ✅ Telegram требует ответа на callback_query, иначе всё виснет
  if (query?.id) {
    await bot.answerCallbackQuery(query.id);
  }

  const action = query?.data?.replace('skills_', '');

  try {
    const char = await getAuthorizedCharacter(tg_id);
    const { character_id, access_token, character_name } = char;

    // Меню выбора
    if (!action || action === 'main') {
      return bot.sendMessage(chat_id, `🧠 Что именно показать для ${character_name}?`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📚 Прокачанные', callback_data: 'skills_view_trained' }],
            [{ text: '⏳ Очередь', callback_data: 'skills_view_queue' }],
            [{ text: '💾 Экспорт JSON', callback_data: 'skills_export' }],
            [{ text: '📋 Меню', callback_data: 'menu_page_0' }]
          ]
        }
      });
    }

    // Экспорт
    if (action === 'export') {
      const lastData = skillsCache.get(tg_id);
      if (!lastData) {
        return sendWithMenu(bot, chat_id, '⚠️ Нет данных для экспорта. Сначала выбери "Прокачанные" или "Очередь".');
      }

      const filename = `skills_${tg_id}_${Date.now()}.json`;
      const filepath = path.join('/tmp', filename);
      fs.writeFileSync(filepath, JSON.stringify(lastData, null, 2));

      return bot.sendDocument(chat_id, filepath, {}, {
        filename,
        contentType: 'application/json'
      });
    }

    // Прокачанные
    if (action === 'view_trained') {
      const { data } = await axios.get(
        `https://esi.evetech.net/latest/characters/${character_id}/skills/`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      const total_sp = data.total_sp;
      const skills = data.skills || [];

      const skillNames = await resolveNames(skills.map(s => s.skill_id), access_token);

      const exportData = skills.map((s, i) => ({
        name: skillNames[i],
        skill_id: s.skill_id,
        level: s.trained_skill_level,
        sp: s.skillpoints_in_skill
      }));
      skillsCache.set(tg_id, exportData);

      const full = exportData
        .sort((a, b) => b.sp - a.sp)
        .map(s => `📘 ${s.name} | Уровень ${s.level} | ${s.sp.toLocaleString('ru-RU')} SP`)
        .join('\n');

      return sendWithMenu(bot, chat_id, `📚 Все навыки персонажа ${character_name} (${total_sp.toLocaleString('ru-RU')} SP)\n\n${full}`);
    }

    // Очередь
    if (action === 'view_queue') {
      const { data } = await axios.get(
        `https://esi.evetech.net/latest/characters/${character_id}/skillqueue/`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      const ids = data.map(i => i.skill_id);
      const names = await resolveNames(ids, access_token);

      const now = new Date();

      const list = data.map((item, i) => {
        const end = item.finish_date ? new Date(item.finish_date) : null;
        const mins = end ? Math.round((end - now) / 60000) : null;
        return `🧠 ${names[i]} → Уровень ${item.finished_level} ${mins ? `| Осталось: ${mins} мин` : ''}`;
      }).join('\n');

      skillsCache.set(tg_id, data);

      return sendWithMenu(bot, chat_id, `⏳ Очередь прокачки персонажа ${character_name}:\n\n${list}`);
    }

  } catch (err) {
    if (err === 'not found') {
      const loginUrl = require('../services/esi').getLoginURL(chat_id);
      return bot.sendMessage(chat_id, '⛔ Вы не авторизованы. Войдите через EVE Online:', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔐 Авторизация', url: loginUrl }]]
        }
      });
    }

    if (err === 'refresh_failed') {
      return bot.sendMessage(chat_id, '❌ Токен истёк. Используйте /change.');
    }

    return bot.sendMessage(chat_id, `🚨 Ошибка в модуле скиллов:\n${err.message}`);
  }
};
