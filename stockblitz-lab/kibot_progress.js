(function () {
  'use strict';
  const host = document.getElementById('kibot-fill');
  if (!host) return;

  const make = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  };

  const number = (value) => Number(value || 0).toLocaleString();

  const fetchJson = (name) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    return fetch(name + '?t=' + Date.now(), { cache: 'no-store', signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(name + ' HTTP ' + response.status);
        return response.json();
      })
      .finally(() => window.clearTimeout(timer));
  };

  const fromLatestScores = (payload) => {
    const kibot = payload && payload.kibot;
    if (!kibot) throw new Error('latest_scores.json has no kibot block');
    const replaced = Number(kibot.replaced || kibot.unique_replaced || 0);
    const skipped = Number(kibot.skipped || kibot.unique_skipped || 0);
    return {
      universe_note: kibot.universe_note,
      listing_size: kibot.listing_size,
      unique_done: kibot.unique_done != null ? kibot.unique_done : replaced + skipped,
      unique_replaced: replaced,
      sql_loaded_events: kibot.sql_loaded || kibot.sql_loaded_events || 0,
      error_events: kibot.errors || kibot.error_events || 0,
      remaining_estimate: kibot.remaining_estimate,
      last_symbol: kibot.last_symbol,
      generated_at: kibot.generated_at || payload.generated_at,
      local_files: kibot.local_files,
      local_missing_vs_listing: kibot.local_missing_vs_listing,
    };
  };

  const render = (payload) => {
    host.replaceChildren();
    const heading = make('h2', 'Kibot stocks 1-minute fill');
    heading.id = 'kibot-fill-title';
    host.appendChild(heading);
    host.appendChild(make(
      'p',
      payload.universe_note ||
        'Fill uses the Kibot account listing, not the prior local archive.',
    ));
    const listing = Number(payload.listing_size || 0);
    const done = Number(payload.unique_done || 0);
    const bar = document.createElement('progress');
    bar.id = 'kibot-stocks-1m';
    bar.max = listing > 0 ? listing : 1;
    if (listing > 0) bar.value = Math.min(done, listing);
    bar.setAttribute('aria-label', 'Kibot stocks 1-minute fill');
    bar.textContent = number(done) + ' of ' + number(listing);
    host.appendChild(bar);
    const meta = make('div', null, 'kibot-fill-meta');
    meta.appendChild(make(
      'strong',
      number(done) + ' / ' + number(listing) + ' listing names processed',
    ));
    const local = payload.local_files;
    if (local != null) {
      meta.appendChild(make(
        'span',
        number(local) + ' local files · ' +
          number(payload.local_missing_vs_listing) + ' listing names still have no file',
      ));
    }
    host.appendChild(meta);
    const details = [
      number(payload.unique_replaced) + ' replaced',
      number(payload.sql_loaded_events) + ' SQL-loaded',
      number(payload.error_events) + ' errors',
      'remaining estimate ' + number(payload.remaining_estimate),
    ];
    if (payload.last_symbol) details.push('last ' + payload.last_symbol);
    host.appendChild(make('p', details.join(' · '), 'muted'));
    if (payload.generated_at) {
      host.appendChild(make('small', 'Journal snapshot ' + payload.generated_at));
    }
  };

  const load = () => fetchJson('kibot_progress.json').then(render).catch(() => (
    fetchJson('latest_scores.json').then(fromLatestScores).then(render)
  )).catch((error) => {
    host.replaceChildren();
    host.appendChild(make('h2', 'Kibot stocks 1-minute fill'));
    host.appendChild(make(
      'p',
      'Progress file is not published yet. ' + error.message,
    ));
  });
  if (!host.childElementCount) {
    host.appendChild(make('h2', 'Kibot stocks 1-minute fill'));
    host.appendChild(make('p', 'Loading Kibot fill progress…', 'muted'));
  }
  load();
  if (typeof window !== 'undefined') {
    window.setInterval(load, 15000);
  }
})();
