const modules = require('../constants/modules');
const PAGE_SIZE = 5;

function getMenuPage(page = 0) {
  const total = modules.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  const sliced = modules.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const buttons = sliced.map(mod => [
    { text: mod.label, callback_data: `mod_${mod.id}` }
  ]);

  if (pages > 1) {
    const nav = [];
    if (page > 0) nav.push({ text: '⬅️ Назад', callback_data: `menu_page_${page - 1}` });
    if (page < pages - 1) nav.push({ text: 'Вперёд ➡️', callback_data: `menu_page_${page + 1}` });
    buttons.push(nav);
  }

  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

module.exports = getMenuPage;
