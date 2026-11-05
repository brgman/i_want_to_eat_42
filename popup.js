async function show() {
  const d = await browser.storage.local.get(['last', 'checkedAt', 'slotsFound', 'slotsNotify']);
  const names = { open: '🟢 Cuisine ouverte', closed: '🔴 Cuisine fermée', unknown: '⚪ Inconnu' };
  document.getElementById('s').textContent = names[d.last] || '⚪ Pas encore vérifié';
  let t = d.checkedAt ? 'Vérifié : ' + new Date(d.checkedAt).toLocaleTimeString() : '';
  if (d.last === 'unknown') t += ' — connecte-toi au site dans Firefox';
  if (d.checkedAt) t += d.slotsFound ? ' · graphique : ok' : ' · graphique illisible';
  document.getElementById('t').textContent = t;
  document.getElementById('c').checked = d.slotsNotify !== false;
}
document.getElementById('c').onchange = (e) => browser.storage.local.set({ slotsNotify: e.target.checked });
document.getElementById('b').onclick = async () => {
  document.getElementById('s').textContent = '⏳ Vérification…';
  await browser.runtime.sendMessage('checkNow'); show();
};
document.getElementById('o').onclick = () => browser.tabs.create({ url: 'https://steakoverflow.42paris.fr/' });
show();
