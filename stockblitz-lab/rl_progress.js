(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const studyId = String(params.get('id') || '').trim();
  const statusEl = document.getElementById('status');
  const titleEl = document.getElementById('title');
  const statsEl = document.getElementById('stats');
  const barEl = document.getElementById('bar');
  const rewardEl = document.getElementById('reward-chart');
  const errorEl = document.getElementById('error-chart');
  const logEl = document.getElementById('log');
  let controller = null;
  let timer = 0;
  const ROLLING_WINDOW = 50;

  const fmt = (value, digits) => {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    return Number(value).toLocaleString('en-US', { maximumFractionDigits: digits ?? 0 });
  };

  const stat = (value, label) => {
    const wrap = document.createElement('div');
    wrap.className = 'stat';
    const number = document.createElement('div');
    number.className = 'value';
    number.textContent = value;
    const text = document.createElement('div');
    text.className = 'label';
    text.textContent = label;
    wrap.append(number, text);
    return wrap;
  };

  const xy = (rows, row, key, x0, xSpan, y0, ySpan, lo, hi) => {
    const first = Number(rows[0].steps);
    const last = Number(rows[rows.length - 1].steps);
    const range = hi - lo || 1;
    const x = x0 + xSpan * ((Number(row.steps) - first) / (last - first || 1));
    const y = y0 + ySpan * (1 - (Number(row[key]) - lo) / range);
    return [x, y];
  };

  const pathFrom = (rows, key, x0, xSpan, y0, ySpan, lo, hi) => {
    return rows.map((row, index) => {
      const [x, y] = xy(rows, row, key, x0, xSpan, y0, ySpan, lo, hi);
      return (index ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
  };

  const axisBounds = (rows, keys) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const item of keys) {
      for (const row of rows) {
        const value = Number(row[item.key]);
        if (!Number.isFinite(value)) continue;
        if (value < lo) lo = value;
        if (value > hi) hi = value;
      }
    }
    if (!Number.isFinite(lo)) {
      lo = 0;
      hi = 1;
    }
    if (lo === hi) {
      lo -= Math.abs(lo) * 0.05 || 1;
      hi += Math.abs(hi) * 0.05 || 1;
    }
    return [lo, hi];
  };

  const attachRolling = (points, window) => {
    const size = window || ROLLING_WINDOW;
    const rewards = [];
    const mses = [];
    return (points || []).map((row, index) => {
      const copy = Object.assign({}, row);
      if (!Number.isFinite(Number(copy.steps))) {
        copy.steps = Number.isFinite(Number(copy.update)) ? Number(copy.update) : index + 1;
      }
      const reward = Number(copy.reward);
      if (Number.isFinite(reward)) {
        rewards.push(reward);
        if (rewards.length > size) rewards.shift();
        if (copy.rolling_reward_50 == null || !Number.isFinite(Number(copy.rolling_reward_50))) {
          copy.rolling_reward_50 = rewards.reduce((sum, value) => sum + value, 0) / rewards.length;
        }
      }
      let mse = Number(copy.mse);
      if (!Number.isFinite(mse) && Number.isFinite(Number(copy.value_loss))) {
        mse = 2 * Number(copy.value_loss);
        copy.mse = mse;
      }
      if (Number.isFinite(mse)) {
        mses.push(mse);
        if (mses.length > size) mses.shift();
        if (copy.rolling_mse_50 == null || !Number.isFinite(Number(copy.rolling_mse_50))) {
          copy.rolling_mse_50 = mses.reduce((sum, value) => sum + value, 0) / mses.length;
        }
      }
      return copy;
    });
  };

  const addText = (svg, x, y, fill, content, anchor) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    node.setAttribute('x', String(x));
    node.setAttribute('y', String(y));
    node.setAttribute('fill', fill);
    node.setAttribute('font-size', '11');
    if (anchor) node.setAttribute('text-anchor', anchor);
    node.textContent = content;
    svg.appendChild(node);
    return node;
  };

  const chart = (host, points, series, label) => {
    host.replaceChildren();
    const prepared = attachRolling(points);
    const keys = series.filter((item) => prepared.some((row) => Number.isFinite(Number(row[item.key]))));
    const usable = prepared.filter((row) => keys.some((item) => Number.isFinite(Number(row[item.key]))));
    if (!usable.length || !keys.length) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'Waiting for the first training updates. This chart fills in as episode reward and error are written.';
      host.appendChild(empty);
      return;
    }
    const leftKeys = keys.filter((item) => (item.axis || 'left') === 'left');
    const rightKeys = keys.filter((item) => item.axis === 'right');
    const [leftLo, leftHi] = axisBounds(usable, leftKeys.length ? leftKeys : keys);
    const [rightLo, rightHi] = rightKeys.length ? axisBounds(usable, rightKeys) : [0, 1];
    const hasRight = rightKeys.length > 0;
    const x0 = 56;
    const xSpan = hasRight ? 578 : 634;
    const y0 = 18;
    const ySpan = 158;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 720 220');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-labelledby', label);
    const axis = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    axis.setAttribute('d', hasRight ? 'M56 18V176H634 V18' : 'M56 18V176H690');
    axis.setAttribute('stroke', '#64748b');
    axis.setAttribute('fill', 'none');
    svg.appendChild(axis);
    addText(svg, 8, 22, '#9ba9b9', leftHi.toPrecision(3));
    addText(svg, 8, 176, '#9ba9b9', leftLo.toPrecision(3));
    if (hasRight) {
      const rightColor = rightKeys[0].color;
      addText(svg, 712, 22, rightColor, rightHi.toPrecision(3), 'end');
      addText(svg, 712, 176, rightColor, rightLo.toPrecision(3), 'end');
    }
    const end = usable[usable.length - 1];
    addText(svg, hasRight ? 430 : 560, 208, '#9ba9b9', fmt(end.steps) + ' steps');
    for (const item of keys) {
      const rows = usable.filter((row) => Number.isFinite(Number(row[item.key])));
      if (!rows.length) continue;
      const right = item.axis === 'right';
      const lo = right ? rightLo : leftLo;
      const hi = right ? rightHi : leftHi;
      if (rows.length >= 2) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('d', pathFrom(rows, item.key, x0, xSpan, y0, ySpan, lo, hi));
        line.setAttribute('stroke', item.color);
        line.setAttribute('stroke-width', item.width || '2');
        line.setAttribute('fill', 'none');
        if (item.dash) line.setAttribute('stroke-dasharray', item.dash);
        svg.appendChild(line);
      }
      const last = rows[rows.length - 1];
      const [cx, cy] = xy(rows, last, item.key, x0, xSpan, y0, ySpan, lo, hi);
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', cx.toFixed(1));
      dot.setAttribute('cy', cy.toFixed(1));
      dot.setAttribute('r', '3.5');
      dot.setAttribute('fill', item.color);
      svg.appendChild(dot);
    }
    host.appendChild(svg);
    const legend = document.createElement('div');
    legend.className = 'legend';
    for (const item of keys) {
      const chip = document.createElement('span');
      chip.style.setProperty('--color', item.color);
      const last = [...usable].reverse().find((row) => Number.isFinite(Number(row[item.key])));
      const side = item.axis === 'right' ? ' (right axis)' : '';
      chip.textContent = item.name + side + (last ? ' · ' + Number(last[item.key]).toPrecision(4) : '');
      legend.appendChild(chip);
    }
    host.appendChild(legend);
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Data table';
    details.appendChild(summary);
    const table = document.createElement('table');
    const head = table.createTHead().insertRow();
    ['Steps'].concat(keys.map((item) => item.name)).forEach((name) => {
      const th = document.createElement('th');
      th.scope = 'column';
      th.textContent = name;
      head.appendChild(th);
    });
    const body = table.createTBody();
    usable.slice(-12).forEach((row) => {
      const tr = body.insertRow();
      tr.insertCell().textContent = fmt(row.steps);
      keys.forEach((item) => {
        const cell = tr.insertCell();
        const value = Number(row[item.key]);
        cell.textContent = Number.isFinite(value) ? value.toPrecision(4) : '—';
      });
    });
    details.appendChild(table);
    host.appendChild(details);
  };

  const render = (payload) => {
    document.title = payload.title + ' · live training';
    titleEl.textContent = payload.title;
    const bits = [
      payload.phase || payload.status || 'unknown',
      payload.engine || '',
      payload.device || '',
      payload.pid_live ? 'trainer live' : 'trainer idle',
      payload.prep_pid_live ? 'prep live' : '',
    ].filter(Boolean);
    statusEl.textContent = bits.join(' · ');
    const series = attachRolling(payload.series);
    const latest = series.length ? series[series.length - 1] : {};
    const rollingReward = latest.rolling_reward_50;
    const rollingMse = latest.rolling_mse_50;
    statsEl.replaceChildren(
      stat(fmt(payload.steps), 'Steps'),
      stat(fmt(payload.episode_count), 'Episodes'),
      stat(payload.reward == null ? '—' : Number(payload.reward).toPrecision(4), 'Latest reward'),
      stat(rollingReward == null ? '—' : Number(rollingReward).toPrecision(4), 'Rolling 50 reward'),
      stat(rollingMse == null ? '—' : Number(rollingMse).toPrecision(4), 'Rolling 50 MSE'),
      stat(
        payload.value_loss == null && payload.actor_loss == null
          ? '—'
          : Number(payload.value_loss ?? payload.actor_loss).toPrecision(4),
        'Latest error',
      ),
    );
    const declared = Number(payload.steps_declared);
    const done = Number(payload.steps);
    if (Number.isFinite(declared) && declared > 0 && Number.isFinite(done)) {
      barEl.hidden = false;
      barEl.max = declared;
      barEl.value = Math.min(done, declared);
    } else {
      barEl.hidden = true;
    }
    chart(rewardEl, payload.series, [
      { key: 'reward', color: '#4d6b63', name: 'Episode reward', axis: 'left', width: '1.5', dash: '4 4' },
      { key: 'rolling_reward_50', color: '#7ad5c1', name: 'Rolling 50 reward', axis: 'left' },
      { key: 'rolling_mse_50', color: '#e5b276', name: 'Rolling 50 MSE', axis: 'right' },
    ], 'reward-heading');
    chart(errorEl, payload.series, [
      { key: 'actor_loss', color: '#ed8d93', name: 'Policy error' },
      { key: 'value_loss', color: '#94b8e5', name: 'Value error' },
    ], 'error-heading');
    const lines = (payload.events || []).map((event) => {
      if (event.text) return event.text;
      return JSON.stringify(event);
    });
    logEl.textContent = lines.length ? lines.join('\n') : 'No trainer log lines yet.';
  };

  const loadPayload = (signal) => {
    const live = '/api/rl-progress?id=' + encodeURIComponent(studyId) + '&t=' + Date.now();
    const snapshot = new URL('progress/' + encodeURIComponent(studyId) + '.json', window.location.href).href;
    return fetch(live, { cache: 'no-store', signal }).then((response) => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).catch(() => fetch(snapshot, { cache: 'no-store', signal }).then((response) => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }));
  };

  const load = () => {
    if (!studyId) {
      statusEl.textContent = 'Missing study id.';
      return;
    }
    if (controller) controller.abort();
    controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    loadPayload(controller.signal).then(render).catch((error) => {
      statusEl.textContent = error.name === 'AbortError' ? 'Timed out; retrying…' : (error.message + ' · retrying');
    }).finally(() => {
      window.clearTimeout(timeout);
    });
  };

  load();
  timer = window.setInterval(load, 5000);
  window.addEventListener('pagehide', () => {
    window.clearInterval(timer);
    if (controller) controller.abort();
  });
})();
