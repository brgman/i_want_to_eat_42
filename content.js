function detect() {
  const icon = document.querySelector('.fa-truck');
  const box = icon && icon.closest('.box');
  const btn = box && box.querySelector('.button.is-active');
  if (!btn) return { state: 'unknown', text: '' };
  const text = btn.textContent.trim();
  if (/ferm/i.test(text)) return { state: 'closed', text };
  if (btn.classList.contains('is-success') || /ouvert/i.test(text)) return { state: 'open', text };
  return { state: 'closed', text };
}

// Données du graphique « Créneaux » (Chart.js) depuis le contexte de la page
function readSlots() {
  try {
    const w = window.wrappedJSObject;
    const C = w.Chart;
    if (!C) return null;
    let charts = [];
    if (C.instances) charts = Object.values(C.instances);
    if (!charts.length && C.getChart) {
      const ch = C.getChart(document.getElementById('chart'));
      if (ch) charts = [ch];
    }
    const ch = charts[0];
    if (!ch || !ch.data || !ch.data.datasets) return null;
    const labels = Array.from(ch.data.labels || []).map(String);
    const datasets = Array.from(ch.data.datasets).map((d, i) => ({
      label: String(d.label || 'ds' + i),
      data: Array.from(d.data || []).map(Number),
    }));
    if (!datasets.length || !datasets[0].data.length) return null;
    return { labels, datasets };
  } catch (e) { return null; }
}

browser.runtime.onMessage.addListener((msg) => {
  if (msg !== 'getStatus') return;
  return new Promise((resolve) => {
    const started = Date.now();
    let statusAt = 0;
    (function poll() {
      const r = detect();
      const now = Date.now();
      if (r.state !== 'unknown' && !statusAt) statusAt = now;
      const slots = readSlots();
      const done =
        (r.state !== 'unknown' && (slots || now - statusAt > 8000)) || now - started > 30000;
      if (done) {
        r.slots = slots;
        r.loggedIn = !!document.querySelector('[data-action="logout"]');
        return resolve(r);
      }
      setTimeout(poll, 500);
    })();
  });
});
