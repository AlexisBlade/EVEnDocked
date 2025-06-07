const axios = require('axios');
const qs = require('querystring');
const db = require('../db');

const CLIENT_ID = '560783be381b4a09bb92fe23db4094e0';
const CLIENT_SECRET = 'BcQLe4VbwtevfnbUlEPKHeupDOwICOetA70eEjaQ';
const REDIRECT_URI = 'http://194.116.172.72:1111/callback';
const SCOPE = 'esi-wallet.read_character_wallet.v1 esi-skills.read_skills.v1';

function getLoginURL(state = 'init') {
  return `https://login.eveonline.com/v2/oauth/authorize?response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_id=${CLIENT_ID}&scope=${encodeURIComponent(SCOPE)}&state=${state}`;
}

async function getToken(code) {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const response = await axios.post('https://login.eveonline.com/v2/oauth/token',
    qs.stringify({
      grant_type: 'authorization_code',
      code,
    }),
    {
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    }
  );
  return response.data;
}

async function getCharacterInfo(access_token) {
  const { data } = await axios.get('https://login.eveonline.com/oauth/verify', {
    headers: {
      Authorization: `Bearer ${access_token}`
    }
  });
  return data;
}

module.exports = {
  getLoginURL,
  getToken,
  getCharacterInfo
};
