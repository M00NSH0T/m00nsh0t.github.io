(function () {
  'use strict';
  const host = document.getElementById('research-progress');
  if (!host) return;
  const make = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const stageLabels = {
    drafting: 'Implementation', integration: 'Integration', review: 'Review',
    'market-test': 'Market testing', unknown: 'Uncategorized',
  };
  const kindOf = item => {
    if (item.stage === 'review') return 'review';
    if (item.stage === 'market-test') return 'report';
    if (item.stage === 'drafting' || item.stage === 'integration') return 'task';
    return 'unknown';
  };
  const ageText = hours => {
    if (hours == null) return 'age unknown';
    if (hours < 1) return 'updated within the last hour';
    if (hours < 48) return Math.round(hours) + ' hours since last saved update';
    return Math.round(hours / 24) + ' days since last saved update';
  };
  const attention = item => {
    if (item.process_live === false) return 'dead';
    if (item.state === 'blocked' || item.recorded_status === 'failed') return 'failed';
    if (item.stale) return 'stale';
    if (item.state === 'active' && item.process_live === true) return 'live';
    if (item.state === 'active') return 'recorded-active';
    if (item.stage === 'review' && item.state !== 'completed') return 'review';
    if (item.state === 'queued') return 'queued';
    if (item.state === 'completed') return 'completed';
    return 'unknown';
  };
  const chip = item => {
    const kind = attention(item);
    const labels = {
      live: 'Live process',
      'recorded-active': 'Recorded in progress (liveness not verified)',
      stale: 'Stale — no recent update',
      dead: 'Recorded running; wrapper is dead',
      failed: 'Failed or blocked',
      review: 'In review',
      queued: 'Waiting',
      completed: 'Completed step',
      unknown: 'Status unknown',
    };
    const classes = {
      live: 'worker-chip worker-live',
      'recorded-active': 'worker-chip worker-live',
      stale: 'worker-chip worker-stale',
      dead: 'worker-chip worker-dead',
      failed: 'worker-chip worker-failed',
      review: 'worker-chip worker-review',
      queued: 'worker-chip worker-queued',
      completed: 'worker-chip',
      unknown: 'worker-chip worker-stale',
    };
    return make('span', labels[kind], classes[kind]);
  };
  const reviewText = item => {
    const recorded = item.recorded_status || 'unspecified';
    if (item.stage === 'review') {
      if (item.state === 'completed') return 'Review recorded as finished (' + recorded + ').';
      if (item.state === 'active') return 'Review is the current saved stage (' + recorded + ').';
      return 'Review stage; recorded status ' + recorded + '.';
    }
    if (item.stage === 'drafting') return 'Not yet in independent review.';
    if (item.stage === 'integration') return 'Integration stage; review of this merge is separate.';
    if (item.stage === 'market-test') return 'A market-test receipt is not a readiness claim.';
    return 'Review status was not recorded.';
  };
  const compareAttention = (a, b) => {
    const order = {dead: 0, failed: 1, stale: 2, live: 3, 'recorded-active': 4, review: 5, queued: 6, completed: 7, unknown: 8};
    const d = (order[attention(a)] ?? 9) - (order[attention(b)] ?? 9);
    if (d) return d;
    return (b.hours_since_update || 0) - (a.hours_since_update || 0);
  };

  Promise.all([
    fetch('research_progress.json', { cache: 'no-store' }).then(response => {
      if (!response.ok) throw Error('not yet published');
      return response.json();
    }),
    fetch('learning.json', { cache: 'no-store' }).then(response => response.ok ? response.json() : null).catch(() => null),
  ]).then(([data, learning]) => {
    host.className = 'panel';
    host.append(make('h2', 'Live work, review and published reports'));
    host.append(make('p',
      'Worker and task age come from saved worker_status.json files for this week. ' +
      'Those files are the source; helper sidecar lifecycle totals are not canonical. ' +
      'A recorded “running” row is live only when process_live is true. ' +
      'Nothing here is a claim about investment results.'));
    const kinds = make('div', '', 'kind-legend');
    kinds.append(make('span', 'Task = implementation or integration receipts'));
    kinds.append(make('span', 'Review = independent review receipts'));
    kinds.append(make('span', 'Training = PPO telemetry (learning.json), not a market report'));
    kinds.append(make('span', 'Report = published comparison files on this page'));
    host.append(kinds);

    if (learning) {
      const train = make('div', '', 'worker-row');
      const ageHours = learning.updated_at
        ? (Date.now() - Date.parse(learning.updated_at)) / 3600000
        : null;
      train.append(make('h3', 'Training telemetry'));
      train.append(make('span', learning.status === 'running' ? 'Training' : 'Training not running',
        learning.status === 'running' ? 'worker-chip worker-live' : 'worker-chip worker-stale'));
      train.append(make('p',
        (learning.run_id ? 'Run ' + learning.run_id + '. ' : '') +
        'Status ' + (learning.status || 'unknown') +
        (learning.updated_at ? ' · saved ' + learning.updated_at : '') +
        (ageHours != null ? ' · ' + ageText(ageHours) : '') +
        '. Gradient, KL and value charts are in the learning strip below and on the learning monitor. ' +
        'This is training diagnostics, not a portfolio ranking.'));
      const link = document.createElement('a');
      link.href = 'learning.html';
      link.textContent = 'Open the PPO learning monitor';
      train.append(link);
      host.append(train);
    }

    const items = Array.isArray(data.items) ? data.items.slice() : [];
    items.sort(compareAttention);
    const attentionItems = items.filter(item => ['dead', 'failed', 'stale', 'live', 'recorded-active'].includes(attention(item)));
    const reviewItems = items.filter(item => attention(item) === 'review' || (item.stage === 'review' && item.state === 'completed'));
    const waiting = items.filter(item => attention(item) === 'queued');
    const done = items.filter(item => attention(item) === 'completed' && item.stage !== 'review');

    const addGroup = (title, rows, open) => {
      if (!rows.length) return;
      const box = document.createElement('details');
      if (open) box.open = true;
      box.append(make('summary', title + ' (' + rows.length + ')'));
      const grid = make('div', '', 'worker-grid');
      for (const item of rows) {
        const row = make('div', '', 'worker-row');
        row.append(make('h3', item.name || 'Unnamed task'));
        row.append(chip(item));
        row.append(make('span', (stageLabels[item.stage] || item.stage) + ' · ' + kindOf(item), 'muted'));
        row.append(make('p', ageText(item.hours_since_update)));
        const recorded = make('p', 'Recorded status: ' + (item.recorded_status || 'missing') +
          (item.process_live === true ? ' · process live' :
            item.process_live === false ? ' · process not live' :
              item.pid ? ' · liveness unknown' : ' · no PID in the receipt'));
        row.append(recorded);
        row.append(make('p', reviewText(item), 'muted'));
        for (const blocker of item.blockers || []) {
          row.append(make('p', 'Blocker: ' + blocker, 'warn'));
        }
        if (item.note) row.append(make('p', item.note, 'muted'));
        grid.append(row);
      }
      box.append(grid);
      host.append(box);
    };

    addGroup('Needs a check (stale, failed, dead, or unverified in-progress)', attentionItems, true);
    addGroup('Review receipts', reviewItems, true);
    addGroup('Waiting to start', waiting, false);
    addGroup('Completed implementation or integration receipts', done, false);

    host.append(make('small',
      'Snapshot generated ' + data.generated_at +
      (data.source ? ' from ' + data.source : ' from saved status files') +
      '. An in-progress task older than ' + data.stale_after_hours +
      ' hours is stale. File count is ' + items.length +
      '; do not treat that count as a second lifecycle ledger.',
      'muted'));
  }).catch(() => {
    host.textContent = 'Research progress has not been generated yet.';
  });
})();
