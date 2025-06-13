const axios = require('axios');

const nameCache = new Map();

module.exports = async function resolveNames(ids, access_token) {
  const unknown = ids.filter(id => !nameCache.has(id));
  if (unknown.length) {
    const { data } = await axios.post('https://esi.evetech.net/latest/universe/names/', unknown, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    data.forEach(obj => nameCache.set(obj.id, obj.name));
  }
  return ids.map(id => nameCache.get(id) || `ID: ${id}`);
};
