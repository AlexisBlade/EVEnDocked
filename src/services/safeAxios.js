const axios = require('axios');
const { refreshToken, getAuthorizedCharacter } = require('./esi');

async function safeGetCharacter(tg_id) {
  const char = await getAuthorizedCharacter(tg_id);
  axios.defaults.headers.common['Authorization'] = `Bearer ${char.access_token}`;
  return char;
}

async function safeRequest(tg_id, config) {
  let char = await safeGetCharacter(tg_id);
  try {
    return await axios({ ...config });
  } catch (e) {
    if (e.response?.status === 401) {
      char = await refreshToken(char.refresh_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${char.access_token}`;
      return axios({ ...config });
    }
    throw e;
  }
}

module.exports = { safeRequest, safeGetCharacter };
