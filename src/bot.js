// Инициализация Telegram-бота

const TelegramBot = require('node-telegram-bot-api');
const startCommand = require('./commands/start');
const { log } = require('./utils/logger');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('No TELEGRAM_BOT_TOKEN provided in .env');
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => startCommand(bot, msg));

log('✅ Telegram bot started');

module.exports = bot;
