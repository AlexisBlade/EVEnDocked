const TelegramBot = require('node-telegram-bot-api');
const startCommand = require('./commands/start');
const meCommand = require('./commands/me');
const handleCallback = require('./callbacks/modules');
const { log } = require('./utils/logger');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('No TELEGRAM_BOT_TOKEN provided in .env');

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => startCommand(bot, msg));
bot.onText(/\/me/, (msg) => meCommand(bot, msg));

// 👉 Теперь регистрируем колбэки централизованно
handleCallback(bot);

log('✅ Telegram bot started');

module.exports = bot;
