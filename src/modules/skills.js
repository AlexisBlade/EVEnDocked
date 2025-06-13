const fs = require('fs');
const path = require('path');
const { safeRequest, safeGetCharacter } = require('../services/safeAxios');
const resolveNames = require('../utils/resolveNames');

const skillsCache = new Map();

module.exports = async function skillsModule(tg_id, chat_id, bot, query = null) {
  if (query?.id) await bot.answerCallbackQuery(query.id);

  const raw = query?.data;
  const action = raw?.startsWith('skills_') ? raw.replace('skills_', '') : 'main';

  let char;
  try {
    char = await safeGetCharacter(tg_id);
  } catch (e) {
    return bot.sendMessage(chat_id, '⛔ Вы не авторизованы. Введите /start.');
  }

  const { character_id, character_name } = char;

  if (!action || action === 'main') {
    return bot.sendMessage(chat_id, `🧠 Скиллы персонажа ${character_name}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📚 Прокачанные', callback_data: 'skills_view_trained' }],
          [{ text: '⏳ Очередь', callback_data: 'skills_view_queue' }],
          [{ text: '👤 О персонаже', callback_data: 'skills_attributes' }],
          [{ text: '💾 Экспорт JSON', callback_data: 'skills_export' }],
          [{ text: '📋 Меню', callback_data: 'menu_page_0' }]
        ]
      }
    });
  }

  if (action === 'view_trained') {
    const { data } = await safeRequest(tg_id, {
      method: 'get',
      url: `https://esi.evetech.net/latest/characters/${character_id}/skills/`
    });

    const skills = data.skills || [];
    const total_sp = data.total_sp;
    const names = await resolveNames(skills.map(s => s.skill_id), char.access_token);

    const exportData = skills.map((s, i) => ({
      id: s.skill_id,
      name: names[i],
      level: s.trained_skill_level,
      sp: s.skillpoints_in_skill
    }));

    if (!skillsCache.has(tg_id)) skillsCache.set(tg_id, {});
    skillsCache.get(tg_id).trained = exportData;

    const sorted = exportData
      .sort((a, b) => b.sp - a.sp)
      .map(s => `📘 ${s.name} | L${s.level} | ${s.sp.toLocaleString('ru-RU')} SP`);

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
        inline_keyboard: [[{ text: '📋 Вернуться к меню', callback_data: 'menu_page_0' }]]
      }
    });
  }

  if (action === 'view_queue') {
    const { data } = await safeRequest(tg_id, {
      method: 'get',
      url: `https://esi.evetech.net/latest/characters/${character_id}/skillqueue/`
    });

    const names = await resolveNames(data.map(i => i.skill_id), char.access_token);
    const now = Date.now();

    const queueData = data.map((item, i) => ({
      id: item.skill_id,
      name: names[i],
      target_level: item.finished_level,
      start: item.start_date,
      end: item.finish_date
    }));

    if (!skillsCache.has(tg_id)) skillsCache.set(tg_id, {});
    skillsCache.get(tg_id).queue = queueData;

    const list = queueData.map((item) => {
      const end = new Date(item.end).getTime();
      const mins = Math.max(0, Math.round((end - now) / 60000));
      return `🧠 ${item.name} → L${item.target_level} | ${mins} мин`;
    });

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
        inline_keyboard: [[{ text: '📋 Вернуться к меню', callback_data: 'menu_page_0' }]]
      }
    });
  }

  if (action === 'attributes') {
    let msg = `👤 *Информация о персонаже ${character_name}*\n\n`;

    // Атрибуты
    const { data: attr } = await safeRequest(tg_id, {
      method: 'get',
      url: `https://esi.evetech.net/latest/characters/${character_id}/attributes/`
    });

    msg += `🧬 *Характеристики:*\n`;
    msg += `• Интеллект: *${attr.intelligence}*\n`;
    msg += `• Восприятие: *${attr.perception}*\n`;
    msg += `• Память: *${attr.memory}*\n`;
    msg += `• Сила воли: *${attr.willpower}*\n`;
    msg += `• Харизма: *${attr.charisma}*\n`;

    // Бустер
    if (attr.acceleration_booster) {
      const boosterName = await resolveNames([attr.acceleration_booster.booster_type_id], char.access_token);
      const expires = new Date(attr.acceleration_booster.expires_at);
      const expiresLocal = expires.toLocaleString('ru-RU');
      const remainingMins = Math.round((expires.getTime() - Date.now()) / 60000);
      const remaining = remainingMins > 60
        ? `${Math.floor(remainingMins / 60)}ч ${remainingMins % 60}м`
        : `${remainingMins} мин`;
      msg += `\n💊 *Бустер:* ${boosterName[0]} (до ${expiresLocal}, осталось ${remaining})`;
    } else {
      msg += `\n💊 *Бустер:* _нет активных_`;
    }

    // Импланты
    try {
      const { data: clone } = await safeRequest(tg_id, {
        method: 'get',
        url: `https://esi.evetech.net/latest/characters/${character_id}/clones/`
      });

      if (clone?.implants?.length) {
        const implantNames = await resolveNames(clone.implants, char.access_token);
        msg += `\n\n🧠 *Импланты:*\n`;
        clone.implants.forEach((id, idx) => {
          msg += `• Слот ${idx + 1}: ${implantNames[idx]}\n`;
        });
      } else {
        msg += `\n\n🧠 *Импланты:* _не установлены_`;
      }
    } catch {
      msg += `\n\n🧠 *Импланты:* _недоступны (нет прав)_`;
    }

    return bot.sendMessage(chat_id, msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '📋 Вернуться к меню', callback_data: 'menu_page_0' }]]
      }
    });
  }

  if (action === 'export') {
    const cached = skillsCache.get(tg_id);
    if (!cached || (!cached.trained && !cached.queue)) {
      return bot.sendMessage(chat_id, '⚠️ Нет данных для экспорта. Сначала открой прокачанное и очередь.');
    }

    const fullExport = {
      character: character_name,
      character_id,
      trained: cached.trained || [],
      queue: cached.queue || [],
      exported_at: new Date().toISOString()
    };

    const filename = `skills_export_${tg_id}_${Date.now()}.json`;
    const filepath = path.join('/tmp', filename);
    fs.writeFileSync(filepath, JSON.stringify(fullExport, null, 2));

    return bot.sendDocument(chat_id, filepath, {}, {
      filename,
      contentType: 'application/json'
    });
  }
};
