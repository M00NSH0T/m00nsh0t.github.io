(function () {
  'use strict';
  const host = document.getElementById('latest-scores');
  if (!host) return;

  const make = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  };

  const GROUPS = [
    { id: 'incoming', heading: 'Incoming', empty: 'No in-flight score files in this rebuild.' },
    { id: 'unique-bar-v2', heading: 'Unique-bar v2 (Fable iterate)', empty: 'No unique-bar v2 queue rows in this rebuild.' },
    { id: 'matched-bar', heading: 'Matched-bar RL (vs always-hold, not VOO)', empty: 'No matched-bar RL scores in this rebuild.' },
    { id: 'walk-forward', heading: 'Walk-forward vs VOO', empty: 'No walk-forward scores in this rebuild.' },
    { id: 'historical-2026', heading: 'Single-path 2026 (not the gate)', empty: 'No 2026 path scores in this rebuild.' },
    { id: 'not-started', heading: 'Not started / blocked', empty: 'No blocked follow-ups recorded.' },
  ];

  const statusLabel = (row) => {
    if (row.status === 'scoring') return 'Scoring';
    if (row.status === 'running') return 'Running';
    if (row.status === 'blocked') return 'Blocked';
    if (row.status === 'control') return 'Declared control';
    if (row.promoted === true) {
      return row.group === 'matched-bar'
        ? 'Beat always-hold (1 fold)'
        : 'Promoted with limits';
    }
    if (row.promoted === false) return 'Not promoted';
    return 'Complete';
  };

  const statusClass = (row) => {
    if (row.status === 'scoring' || row.status === 'running') return 'score-chip score-incoming';
    if (row.status === 'blocked' || row.status === 'control') return 'score-chip score-blocked';
    if (row.promoted === true) return 'score-chip score-promoted';
    return 'score-chip score-failed';
  };

  const excessText = (row) => {
    if (row.mean_excess_pp == null) return '—';
    const value = Number(row.mean_excess_pp);
    const sign = value > 0 ? '+' : '';
    return sign + value.toFixed(2) + ' pp';
  };

  const renderGroup = (group, rows) => {
    const article = make('article', null, 'panel latest-group');
    article.id = 'latest-' + group.id;
    const heading = make('h2', group.heading);
    heading.id = article.id + '-title';
    article.setAttribute('aria-labelledby', heading.id);
    article.appendChild(heading);
    const matches = rows.filter((row) => row.group === group.id);
    if (!matches.length) {
      article.appendChild(make('p', group.empty));
      return article;
    }
    const wrap = make('div', null, 'matched-table-wrap');
    const table = document.createElement('table');
    const caption = document.createElement('caption');
    caption.textContent = group.heading + ' · rebuilt from saved score files';
    table.appendChild(caption);
    const head = table.createTHead().insertRow();
    const columns = group.id === 'matched-bar'
      ? ['Study', 'Status', 'Trained vs always-hold', 'OOS fills', 'What this means']
      : ['Study', 'Status', 'Mean excess vs VOO', 'Folds beat VOO', 'What this means'];
    for (const label of columns) {
      const th = document.createElement('th');
      th.scope = 'column';
      th.textContent = label;
      head.appendChild(th);
    }
    const body = table.createTBody();
    for (const row of matches) {
      const tr = body.insertRow();
      if (row.promoted === true) tr.className = 'score-pass';
      tr.setAttribute('data-study-id', row.id);
      const title = document.createElement('th');
      title.scope = 'row';
      if (row.live_progress) {
        const link = document.createElement('a');
        link.className = 'score-study-link';
        link.href = 'rl_progress.html?id=' + encodeURIComponent(row.id);
        link.textContent = row.title;
        title.appendChild(link);
      } else {
        title.textContent = row.title;
      }
      tr.appendChild(title);
      const statusCell = tr.insertCell();
      statusCell.appendChild(make('span', statusLabel(row), statusClass(row)));
      tr.insertCell().textContent = excessText(row);
      tr.insertCell().textContent = row.folds_beat_voo || '—';
      tr.insertCell().textContent = row.note;
    }
    wrap.appendChild(table);
    article.appendChild(wrap);
    return article;
  };

  const render = (payload) => {
    host.replaceChildren();
    const counts = payload.counts || {};
    const summary = make('div', null, 'latest-summary');
    summary.appendChild(make('p', payload.gate || ''));
    const stats = make('div', null, 'stats latest-stats');
    const items = [
      [String(counts.incoming ?? 0), 'Incoming or running'],
      [String(counts.complete ?? 0), 'Scored studies in this feed'],
      [String(counts.promoted_with_limits ?? 0), 'Gate pass with traveling limits'],
    ];
    for (const [value, label] of items) {
      const stat = make('div', null, 'stat');
      stat.appendChild(make('div', value, 'value'));
      stat.appendChild(make('div', label, 'label'));
      stats.appendChild(stat);
    }
    summary.appendChild(stats);
    if (payload.generated_at) {
      summary.appendChild(make('p', 'Feed rebuilt ' + payload.generated_at + '. Rebuild the dashboard after new scores land, then this tab reloads the saved file.', 'muted'));
    }
    const reload = make('button', 'Reload saved scores');
    reload.type = 'button';
    reload.addEventListener('click', load);
    summary.appendChild(reload);
    host.appendChild(summary);
    for (const group of GROUPS) {
      host.appendChild(renderGroup(group, payload.rows || []));
    }
  };

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

  const load = () => {
    if (!host.childElementCount) {
      host.appendChild(make('p', 'Loading saved scores…', 'muted'));
    }
    return fetchJson('latest_scores.json').then(render).catch((error) => {
      host.replaceChildren();
      const panel = make('article', null, 'panel');
      panel.appendChild(make('h2', 'Latest scores are not published yet'));
      panel.appendChild(make('p', 'Run scripts/build_dashboard.py to harvest saved walk-forward files into this tab. ' + error.message));
      const retry = make('button', 'Retry');
      retry.type = 'button';
      retry.addEventListener('click', load);
      panel.appendChild(retry);
      host.appendChild(panel);
    });
  };
  load();
  if (typeof window !== 'undefined') {
    window.setInterval(load, 60000);
  }

  const jump = document.getElementById('latest-jump-links');
  if (jump && typeof CSS !== 'undefined' && CSS.supports && CSS.supports('scroll-target-group: auto')) {
    const sync = () => {
      const current = jump.querySelector('a:target-current');
      jump.querySelectorAll('a').forEach((link) => {
        link.setAttribute('aria-current', link === current ? 'true' : 'false');
      });
    };
    sync();
    document.addEventListener('scrollend', sync);
  }
})();
