const { getAuthorizedCharacter } = require('../services/esi');
const axios = require('axios');
const dayjs = require('dayjs');

const duration = require('dayjs/plugin/duration');
const relativeTime = require('dayjs/plugin/relativeTime');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const sendWithMenu = require('../utils/sendWithMenu');

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

const nameCache = new Map();
const stationCache = new Map();
const systemCache = new Map();
const constellationCache = new Map();
const regionCache = new Map();

async function resolveNames(ids, access_token) {
  const unknown = ids.filter(id => !nameCache.has(id));
  if (unknown.length) {
    const { data } = await axios.post('https://esi.evetech.net/latest/universe/names/', unknown, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    data.forEach(obj => nameCache.set(obj.id, obj.name));
  }
  return ids.map(id => nameCache.get(id) || `ID: ${id}`);
}

async function getStationName(station_id) {
  if (stationCache.has(station_id)) return stationCache.get(station_id);

  const isStructure = station_id > 1_000_000_000_000;
  if (isStructure) {
    const name = `Структура (ID: ${station_id})`;
    stationCache.set(station_id, name);
    return name;
  }

  try {
    const { data } = await axios.get(`https://esi.evetech.net/latest/universe/stations/${station_id}/`);
    stationCache.set(station_id, data.name);
    return data.name;
  } catch {
    const fallback = `Станция (ID: ${station_id})`;
    stationCache.set(station_id, fallback);
    return fallback;
  }
}

async function getSystemAndRegion(system_id) {
  if (systemCache.has(system_id)) return systemCache.get(system_id);

  const { data: system } = await axios.get(`https://esi.evetech.net/latest/universe/systems/${system_id}/`);
  const { name: systemName, constellation_id, position } = system;

  if (!constellationCache.has(constellation_id)) {
    const { data: constellation } = await axios.get(`https://esi.evetech.net/latest/universe/constellations/${constellation_id}/`);
    constellationCache.set(constellation_id, constellation);
  }

  const constellation = constellationCache.get(constellation_id);
  const region_id = constellation.region_id;

  if (!regionCache.has(region_id)) {
    const { data: region } = await axios.get(`https://esi.evetech.net/latest/universe/regions/${region_id}/`);
    regionCache.set(region_id, region.name);
  }

  const regionName = regionCache.get(region_id);
  const full = { systemName, regionName, position };
  systemCache.set(system_id, full);
  return full;
}

module.exports = async function industryModule(tg_id, chat_id, bot) {
  try {
    const char = await getAuthorizedCharacter(tg_id);
    const { character_id, access_token, character_name } = char;

    const { data: jobs } = await axios.get(
      `https://esi.evetech.net/latest/characters/${character_id}/industry/jobs/?include_completed=false`,
      {
        headers: { Authorization: `Bearer ${access_token}` }
      }
    );

    if (!jobs.length) {
      return sendWithMenu(bot, chat_id, `📭 У персонажа ${character_name} нет активных производств.`);
    }

    const blueprintIds = jobs.map(j => j.blueprint_type_id);
    const blueprintNames = await resolveNames(blueprintIds, access_token);

    const lines = await Promise.all(jobs.map(async (job, i) => {
      const end = dayjs(job.end_date);
      const now = dayjs();
      const diff = dayjs.duration(end.diff(now));

      const blueprintName = blueprintNames[i];
      const stationName = await getStationName(job.station_id);

      let systemName = 'Неизвестная система';
      let regionName = 'Неизвестный регион';
      let position = { x: 0, y: 0, z: 0 };

      if (job.solar_system_id) {
        try {
          const location = await getSystemAndRegion(job.solar_system_id);
          systemName = location.systemName;
          regionName = location.regionName;
          position = location.position;
        } catch {}
      }

      // ⏳ или ✅
      let timeBlock = '';
      if (end.isBefore(now)) {
        timeBlock = '✅ Готов';
      } else {
        const timeLeft = `${diff.days()}д ${diff.hours()}ч ${Math.max(0, diff.minutes())}м`;
        const endTimeFormatted = end.tz('Europe/Moscow').format('YYYY-MM-DD HH:mm [МСК]');
        timeBlock = `⏳ ${timeLeft}\n🕒 ${endTimeFormatted}`;
      }

      return `🛠️ **${job.activity_id === 1 ? 'Производство' : 'Другое'}**
📦 ${blueprintName}
🏭 ${stationName}
🌍 ${systemName}, ${regionName}
📡 x:${position.x.toFixed(0)} y:${position.y.toFixed(0)} z:${position.z.toFixed(0)}
🔁 Кол-во: ${job.runs}
${timeBlock}`;
    }));

    return sendWithMenu(bot, chat_id, `🔧 Активные производства для ${character_name}:\n\n` + lines.join('\n\n'), {
      parse_mode: 'Markdown'
    });

  } catch (err) {
    if (err === 'not found') {
      const loginUrl = require('../services/esi').getLoginURL(chat_id);
      return sendWithMenu(bot, chat_id, '⛔ Вы не авторизованы. Войдите через EVE Online:', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔐 Авторизация', url: loginUrl }]]
        }
      });
    }

    if (err === 'refresh_failed') {
      return bot.sendMessage(chat_id, '❌ Ошибка обновления токена. Используйте /change.');
    }

    const errText = err.response?.data
      ? `🔴 Ошибка API: ${JSON.stringify(err.response.data)}`
      : `⚠️ Ошибка: ${err.message}`;

    return bot.sendMessage(chat_id, `🚨 Ошибка получения производств:\n${errText}`);
  }
};
