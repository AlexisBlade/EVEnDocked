const { getAuthorizedCharacter } = require('../services/esi');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const resolveNames = require('../utils/resolveNames');

const skillsCache = new Map();

module.exports = async function skillsModule(tg_id, chat_id, bot, query = null) {
  if (query?.id) await bot.answerCallbackQuery(query.id);

  const raw = query?.data;
  const action = raw?.startsWith('skills_') ? raw.replace('skills_', '') : 'main';

  let char;
  try {
    char = await getAuthorizedCharacter(tg_id);
  } catch (e) {
    return bot.sendMessage(chat_id, '⛔ Вы не авторизованы. Введите /start.');
  }

  const { character_id, access_token, character_name } = char;

  // 📋 Главное меню
  if (!action || action === 'main') {
    return bot.sendMessage(chat_id, `🧠 Скиллы персонажа ${character_name}`, {
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

  // 📚 Просмотр прокачанных скиллов
  if (action === 'view_trained') {
    const { data } = await axios.get(
      `https://esi.evetech.net/latest/characters/${character_id}/skills/`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const skills = data.skills || [];
    const total_sp = data.total_sp;
    const names = await resolveNames(skills.map(s => s.skill_id), access_token);

    const exportData = skills.map((s, i) => ({
      id: s.skill_id,
      name: names[i],
      level: s.trained_skill_level,
      sp: s.skillpoints_in_skill
    }));

    skillsCache.set(tg_id, exportData);

    const sorted = exportData
      .sort((a, b) => b.sp - a.sp)
      .map(s => `📘 ${s.name} | L${s.level} | ${s.sp.toLocaleString('ru-RU')} SP`);

    // разбиение на чанки по ~30 строк
    const chunks = [];
    for (let i = 0; i < sorted.length; i += 30) {
      chunks.push(sorted.slice(i, i + 30).join('\n'));
    }

    await bot.sendMessage(chat_id, `📚 Прокачанные скиллы (${total_sp.toLocaleString('ru-RU')} SP):`);

    for (const chunk of chunks) {
      await bot.sendMessage(chat_id, chunk);
    }

    return bot.sendMessage(chat_id, '📋 Меню: /start', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📋 Вернуться к меню', callback_data: 'menu_page_0' }]
        ]
      }
    });
  }

  // ⏳ Очередь прокачки
  if (action === 'view_queue') {
    const { data } = await axios.get(
      `https://esi.evetech.net/latest/characters/${character_id}/skillqueue/`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const names = await resolveNames(data.map(i => i.skill_id), access_token);
    const now = Date.now();

    const list = data.map((item, i) => {
      const end = new Date(item.finish_date).getTime();
      const mins = Math.max(0, Math.round((end - now) / 60000));
      return `🧠 ${names[i]} → L${item.finished_level} | ${mins} мин`;
    });

    skillsCache.set(tg_id, data);

    // делим на чанки по 30 строк
    const chunks = [];
    for (let i = 0; i < list.length; i += 30) {
      chunks.push(list.slice(i, i + 30).join('\n'));
    }

    await bot.sendMessage(chat_id, `⏳ Очередь прокачки:`);

    for (const chunk of chunks) {
      await bot.sendMessage(chat_id, chunk);
    }

    return bot.sendMessage(chat_id, '📋 Меню: /start', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📋 Вернуться к меню', callback_data: 'menu_page_0' }]
        ]
      }
    });
  }

  // 💾 Экспорт
  if (action === 'export') {
    const data = skillsCache.get(tg_id);
    if (!data) {
      return bot.sendMessage(chat_id, '⚠️ Нет данных для экспорта. Сначала открой список.');
    }

    const filename = `skills_${tg_id}_${Date.now()}.json`;
    const filepath = path.join('/tmp', filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    return bot.sendDocument(chat_id, filepath, {}, {
      filename,
      contentType: 'application/json'
    });
  }
};
