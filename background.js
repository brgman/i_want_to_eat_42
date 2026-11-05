const URL_SITE = 'https://steakoverflow.42paris.fr/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ICON = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text y="52" font-size="52">🔥</text></svg>');

function push(title, message) {
  browser.notifications.create('kuzn-' + Date.now(), { type: 'basic', iconUrl: ICON, title, message });
}

async function ask(tabId) {
  for (let i = 0; i < 20; i++) {
    try { return await browser.tabs.sendMessage(tabId, 'getStatus'); }
    catch (e) { await sleep(1000); }
  }
  return null;
}

async function readStatus() {
  const tabs = await browser.tabs.query({ url: URL_SITE + '*' });
  for (const t of tabs) {
    try { const r = await browser.tabs.sendMessage(t.id, 'getStatus'); if (r) return r; } catch (e) {}
  }
  const tab = await browser.tabs.create({ url: URL_SITE, active: false });
  try {
    return (await ask(tab.id)) || { state: 'unknown', text: '', loggedIn: false };
  } finally {
    browser.tabs.remove(tab.id).catch(() => {});
  }
}

function paint(state) {
  const m = {
    open:    { t: '', c: '#2ecc40', title: 'Cuisine OUVERTE' },
    closed:  { t: '', c: '#e74c3c', title: 'Cuisine fermée' },
    unknown: { t: '', c: '#999999', title: 'Statut inconnu (vérifie la connexion)' },
  }[state];
  browser.browserAction.setBadgeText({ text: m.t });
  browser.browserAction.setBadgeBackgroundColor({ color: m.c });
  browser.browserAction.setTitle({ title: m.title });
}

function flatten(slots) {
  const map = {};
  slots.datasets.forEach((d) => d.data.forEach((v, i) => {
    map[d.label + ' | ' + (slots.labels[i] ?? i)] = v;
  }));
  return map;
}

async function check() {
  let r;
  try { r = await readStatus(); } catch (e) { r = { state: 'unknown', text: String(e) }; }
  const s = await browser.storage.local.get(['lastKnown', 'slotsSnap', 'slotsNotify']);

  // 1) notification quand le statut change ouvert <-> fermé
  if (r.state !== 'unknown' && s.lastKnown !== r.state && !(s.lastKnown === undefined && r.state === 'closed')) {
    push(r.state === 'open' ? 'Cuisine ouverte !' : 'Cuisine fermée',
         r.state === 'open' ? 'Steak Overflow prend les commandes.' : 'Steak Overflow ne prend plus de commandes.');
  }

  // 2) notification de test : une valeur du graphique « Créneaux » a augmenté
  const upd = { checkedAt: Date.now(), last: r.state, text: r.text || '', slotsFound: !!r.slots };
  if (r.state !== 'unknown') upd.lastKnown = r.state;
  if (r.slots) {
    const cur = flatten(r.slots);
    const prev = s.slotsSnap;
    if (prev && s.slotsNotify !== false) {
      const up = Object.keys(cur).filter((k) => k in prev && cur[k] > prev[k])
        .map((k) => `${k}: ${prev[k]} → ${cur[k]}`);
      if (up.length) push('Créneaux : une valeur a augmenté', up.slice(0, 5).join('\n') + (up.length > 5 ? '\n…' : ''));
    }
    upd.slotsSnap = cur;
  }
  await browser.storage.local.set(upd);
  paint(r.state);
}

browser.alarms.create('check', { periodInMinutes: 1 });
browser.alarms.onAlarm.addListener((a) => { if (a.name === 'check') check(); });
browser.runtime.onStartup.addListener(check);
browser.runtime.onInstalled.addListener(check);
browser.runtime.onMessage.addListener((m) => { if (m === 'checkNow') return check(); });
browser.notifications.onClicked.addListener(() => browser.tabs.create({ url: URL_SITE }));
