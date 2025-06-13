function splitText(text, maxLength = 4000) {
  const chunks = [];
  let current = '';

  for (const line of text.split('\n')) {
    if ((current + line + '\n').length > maxLength) {
      chunks.push(current.trim());
      current = '';
    }
    current += line + '\n';
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

module.exports = async function sendWithMenu(bot, chat_id, text, options = {}) {
  const fullText = `${text}\n\n📋 Меню: /start`;
  const parts = splitText(fullText);

  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i];
    const isLast = i === parts.length - 1;

    await bot.sendMessage(chat_id, chunk, {
      parse_mode: options.parse_mode || 'Markdown',
      reply_markup: isLast ? options.reply_markup : undefined
    });
  }
};
