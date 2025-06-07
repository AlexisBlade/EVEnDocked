// Простой логгер

function log(msg) {
  const timestamp = new Date().toISOString();
  console.log(`[EVEnDocked] ${timestamp} → ${msg}`);
}

module.exports = { log };
