'use strict';
// Run with: node test/routes.test.js
const { decide } = require('../routes');
const site = encodeURIComponent('https://bevbotdiscord.com/auth/callback');
const cases = [
  ['https://bevbotdiscord.com/dashboard', 'app'],
  ['https://www.bevbotdiscord.com/', 'app'],
  ['http://bevbotdiscord.com/', 'browser'],
  [`https://discord.com/oauth2/authorize?client_id=1&response_type=code&scope=identify%20guilds&redirect_uri=${site}`, 'app'],
  [`https://discord.com/api/oauth2/authorize?client_id=1&redirect_uri=${site}`, 'app'],
  [`https://discord.com/login?redirect_to=${encodeURIComponent(`/oauth2/authorize?client_id=1&redirect_uri=${site}`)}`, 'app'],
  ['https://discord.com/oauth2/authorize?client_id=1562204643755429980&permissions=8&scope=bot+applications.commands', 'browser'],
  [`https://discord.com/oauth2/authorize?client_id=1&redirect_uri=${encodeURIComponent('https://evil.example/cb')}`, 'browser'],
  [`https://discord.com/oauth2/authorize?client_id=1&redirect_uri=${encodeURIComponent('https://bevbotdiscord.com.evil.example/cb')}`, 'browser'],
  ['https://discord.com/login', 'browser'],
  ['https://discord.com/channels/@me', 'browser'],
  ['https://discord.gg/cbevs', 'browser'],
  ['https://github.com/cbevss/bev-desktop', 'browser'],
  ['mailto:bevbotsupport@gmail.com', 'browser'],
  ['file:///C:/Windows/system32/calc.exe', 'block'],
  ['javascript:alert(1)', 'block'],
  ['ms-settings:privacy', 'block'],
  ['not a url', 'block'],
];
let bad = 0;
for (const [url, want] of cases) {
  const got = decide(url);
  if (got !== want) { bad++; console.log('FAIL', url, 'got', got, 'want', want); } else console.log('ok  ', want.padEnd(7), url.slice(0, 90));
}
console.log(`\n${cases.length - bad}/${cases.length} passed`);
process.exit(bad ? 1 : 0);
