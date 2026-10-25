'use strict';
// Which links open inside the BEV app and which open in the normal web browser.
//   'app'     : bevbotdiscord.com, and Discord's own sign-in pages when they lead back to bevbotdiscord.com
//   'browser' : every other web link (Join Discord, Add to server, GitHub…) and email links
//   'block'   : anything else (file:, javascript:, custom app links)

const SITE_HOSTS = new Set(['bevbotdiscord.com', 'www.bevbotdiscord.com']);
const DISCORD_HOSTS = new Set(['discord.com', 'www.discord.com', 'canary.discord.com', 'ptb.discord.com']);

function parse(url) {
  try { return new URL(String(url)); } catch (e) { return null; }
}

function backToSite(value) {
  const u = parse(value);
  return !!u && u.protocol === 'https:' && SITE_HOSTS.has(u.hostname);
}

// Signing in to the website goes through Discord: discord.com/oauth2/authorize?…redirect_uri=https://bevbotdiscord.com/…
// and, if you're not signed in to Discord yet, discord.com/login?redirect_to=/oauth2/authorize…
// Inviting the bot (Add to server) has no redirect back to the site, so it opens in the browser.
function discordSignIn(u) {
  const path = u.pathname.replace(/\/+$/, '');
  if (path === '/oauth2/authorize' || path === '/api/oauth2/authorize') return backToSite(u.searchParams.get('redirect_uri'));
  if (path === '/login' || path === '/register') {
    const next = u.searchParams.get('redirect_to') || '';
    if (!next.startsWith('/oauth2/authorize')) return false;
    const inner = parse('https://discord.com' + next);
    return !!inner && backToSite(inner.searchParams.get('redirect_uri'));
  }
  return false;
}

function decide(url) {
  const u = parse(url);
  if (!u) return 'block';
  if (u.protocol === 'mailto:') return 'browser';
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'block';
  if (u.protocol === 'https:' && SITE_HOSTS.has(u.hostname)) return 'app';
  if (u.protocol === 'https:' && DISCORD_HOSTS.has(u.hostname) && discordSignIn(u)) return 'app';
  return 'browser';
}

module.exports = { decide, SITE_HOSTS };
