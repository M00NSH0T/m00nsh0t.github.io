(function () {
  'use strict';
function formatSharpe(value, basis) {
  if (basis !== "zero_cash" && basis !== "excess_cash") {
    throw new TypeError("invalid basis");
  }
  const unavailable = value === null || value === undefined;
  if (!unavailable && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new TypeError("invalid value");
  }
  const label =
    basis === "zero_cash"
      ? "Sharpe (zero cash rate)"
      : "Sharpe (excess over cash)";
  const explanation =
    "Compares historical excess return to the variability of returns. A higher historical Sharpe is not proof of future success.";
  if (unavailable) {
    return { valueText: "unavailable", label, explanation };
  }
  return { valueText: value.toFixed(2), label, explanation };
}

  var HOST = document.getElementById('portfolio-leaders');
  if (!HOST) { return; }
  var SVGNS = 'http://www.w3.org/2000/svg';
  var LINE_COLORS = { candidate: '#7ad5c1', VOO: '#94b8e5', SPY: '#e5b276' };
  var state = { data: null, cohortId: null, candidateId: null, chart: 'growth' };

  var style = document.createElement('style');
  style.textContent = [
    '#portfolio-leaders{background:#0d131a;color:#eef3f8;font:14px/1.5 system-ui,-apple-system,sans-serif;padding:18px;border-radius:12px;margin-bottom:24px;max-width:100%;overflow-wrap:anywhere;min-width:0}',
    '#portfolio-leaders .leaders-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
    '#portfolio-leaders .leaders-head h2{margin:0;font-size:20px;text-wrap:balance}',
    '#portfolio-leaders .leaders-badge{border:1px dashed #a8b7c8;color:#eef3f8;background:transparent;font-size:11px;font-weight:700;padding:2px 9px;border-radius:4px;letter-spacing:.5px;text-transform:uppercase}',
    '#portfolio-leaders .archived-flag{display:inline-block;border:1px dashed #a8b7c8;border-radius:4px;padding:2px 8px;font-size:11px;letter-spacing:.3px;text-transform:uppercase;margin:0 0 8px}',
    '#portfolio-leaders .leaders-note{color:#a8b7c8;margin:6px 0 16px;max-width:72em;text-wrap:pretty}',
    '#portfolio-leaders .leaders-controls{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px}',
    '#portfolio-leaders .leaders-controls>*{min-width:0;flex:1 1 220px}',
    '#portfolio-leaders .leaders-controls label{display:block;color:#a8b7c8;font-size:12px;margin-bottom:4px}',
    '#portfolio-leaders select{background:#171f29;color:#eef3f8;border:1px solid #33445a;border-radius:6px;padding:6px 8px;max-width:100%;width:100%;min-width:0}',
    '#portfolio-leaders .leaders-toggle button{background:#171f29;color:#a8b7c8;border:1px solid #33445a;padding:6px 12px;cursor:pointer;font:inherit}',
    '#portfolio-leaders .leaders-toggle button.leaders-on{color:#0d131a;background:#7ad5c1;border-color:#7ad5c1}',
    '#portfolio-leaders .leaders-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:16px}',
    '#portfolio-leaders .leaders-card{background:#171f29;border:1px solid #33445a;border-radius:10px;padding:12px;text-align:left;color:#eef3f8;cursor:pointer;font:inherit}',
    '#portfolio-leaders .leaders-card.leaders-selected{border-color:#7ad5c1;box-shadow:0 0 0 1px #7ad5c1}',
    '#portfolio-leaders .leaders-card:focus-visible,#portfolio-leaders .leaders-toggle button:focus-visible,#portfolio-leaders svg:focus-visible{outline:2px solid #94b8e5;outline-offset:2px}',
    '#portfolio-leaders .leaders-rank{color:#7ad5c1;font-size:11px;letter-spacing:.4px;text-transform:uppercase}',
    '#portfolio-leaders .leaders-card h3{margin:4px 0 6px;font-size:15px}',
    '#portfolio-leaders .leaders-card p{margin:6px 0 0;color:#a8b7c8;font-size:12px}',
    '#portfolio-leaders .leaders-mini{display:flex;gap:14px;font-size:13px;flex-wrap:wrap}',
    '#portfolio-leaders .leaders-hero{background:#171f29;border-radius:10px;padding:14px 16px;margin-bottom:16px}',
    '#portfolio-leaders .leaders-hero h3{margin:0 0 4px;font-size:17px}',
    '#portfolio-leaders .leaders-basis{color:#a8b7c8;font-size:12px;margin:0 0 8px}',
    '#portfolio-leaders .leaders-blurb{background:#0d131a;border-left:3px solid #e5b276;padding:8px 10px;border-radius:0 6px 6px 0;margin:10px 0;color:#a8b7c8}',
    '#portfolio-leaders .leaders-metrics{display:flex;gap:18px;flex-wrap:wrap;margin:10px 0 0}',
    '#portfolio-leaders .leaders-metrics dt{color:#a8b7c8;font-size:11px;text-transform:uppercase;letter-spacing:.4px}',
    '#portfolio-leaders .leaders-metrics dd{margin:2px 0 0;font-size:15px;font-weight:600}',
    '#portfolio-leaders .leaders-chartwrap{position:relative;background:#171f29;border-radius:10px;padding:12px;margin-bottom:16px}',
    '#portfolio-leaders .leaders-chartwrap svg{display:block;width:100%;height:auto}',
    '#portfolio-leaders .leaders-tip{position:absolute;pointer-events:none;background:#0d131a;border:1px solid #33445a;border-radius:6px;padding:6px 9px;font-size:12px;display:none;max-width:280px;z-index:2}',
    '#portfolio-leaders .leaders-legend{display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:#a8b7c8}',
    '#portfolio-leaders .leaders-swatch{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px}',
    '#portfolio-leaders details{background:#171f29;border-radius:10px;padding:10px 14px;margin-bottom:14px}',
    '#portfolio-leaders .leaders-evidence{border-top:1px solid #33445a;margin-top:10px;padding-top:8px}',
    '#portfolio-leaders .leaders-evidence h3{margin:4px 0 6px;font-size:14px}',
    '#portfolio-leaders .leaders-evidence p{margin:6px 0;color:#a8b7c8;font-size:13px;max-width:80em}',
    '#portfolio-leaders summary{cursor:pointer;color:#94b8e5}',
    '#portfolio-leaders details ul{color:#a8b7c8;margin:8px 0 4px}',
    '#portfolio-leaders a{color:#94b8e5}',
    '#portfolio-leaders .leaders-footer{border-top:1px solid #33445a;padding-top:10px;color:#a8b7c8;font-size:12px}',
    '#portfolio-leaders .leaders-msg{background:#171f29;border-radius:10px;padding:16px;color:#a8b7c8;margin-bottom:14px}'
  ].join('');
  document.head.appendChild(style);

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) { n.className = cls; } if (text != null) { n.textContent = text; } return n; }
  function svgEl(tag, attrs) { var n = document.createElementNS(SVGNS, tag); Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); }); return n; }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function pct(v) { return isNum(v) ? (v * 100).toFixed(2) + '%' : 'unavailable'; }
  function money(v) { return isNum(v) ? '$' + Math.round(v).toLocaleString('en-US') : 'unavailable'; }
  function renderMessage(text) { HOST.textContent = ''; HOST.appendChild(el('div', 'leaders-msg', text)); }

  function activeCohort() {
    var match = null;
    state.data.cohorts.forEach(function (c) { if (c.id === state.cohortId) { match = c; } });
    return match || state.data.cohorts[0];
  }

  function rankCandidates(cohort) {
    return (cohort.candidates || []).slice().sort(function (a, b) {
      var av = a.metrics && isNum(a.metrics.cagr) ? a.metrics.cagr : null;
      var bv = b.metrics && isNum(b.metrics.cagr) ? b.metrics.cagr : null;
      if (av === null && bv !== null) { return 1; }
      if (bv === null && av !== null) { return -1; }
      if (av !== null && bv !== null && av !== bv) { return bv - av; }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }

  function render() {
    var cohort = activeCohort();
    state.cohortId = cohort.id;
    var list = rankCandidates(cohort);
    var selected = null;
    list.forEach(function (cand) { if (cand.id === state.candidateId) { selected = cand; } });
    if (!selected && list.length) { selected = list[0]; }
    state.candidateId = selected ? selected.id : null;
    HOST.textContent = '';
    var head = el('div', 'leaders-head');
    head.appendChild(el('h2', null, 'Archived unmatched IRA catalog (ranking 2 of 2)'));
    head.appendChild(el('span', 'leaders-badge', 'Archived catalog · not this week'));
    HOST.appendChild(head);
    HOST.appendChild(el('p', 'leaders-note',
      'Ranking 2 of 2. This catalog still defaults to the mixed IRA book. It is an archived unmatched ranking, not this week\'s winner. The 22.78% first-eligible row is an unmatched AccountBook study that W21 closed. Ordering seeds are a path spread, not extra strategies and not extra market histories. Nothing is promoted or paper-ready.'));
    if (state.data.overall_note) { HOST.appendChild(el('p', 'leaders-note', state.data.overall_note)); }
    HOST.appendChild(buildControls(cohort, list, selected));
    if (!list.length) {
      HOST.appendChild(el('div', 'leaders-msg', 'This scenario has no candidates yet.'));
    } else {
      HOST.appendChild(buildCards(groupedArms(list), selected));
      HOST.appendChild(el('p', 'leaders-blurb', 'Not market-ready: ' + selected.readiness_blurb));
      HOST.appendChild(buildChart(cohort, selected));
      HOST.appendChild(buildHero(cohort, selected));
    }
    HOST.appendChild(buildDetails(cohort, selected));
    if (Array.isArray(state.data.model_evidence) && state.data.model_evidence.length) {
      HOST.appendChild(buildEvidence(state.data.model_evidence));
    }
    var foot = el('div', 'leaders-footer');
    foot.appendChild(document.createTextNode('These are historical research portfolios, not live or investable results. Forecast research (separate from portfolio performance) runs in the '));
    var link = el('a', null, 'research environment');
    link.href = 'environment.html';
    foot.appendChild(link);
    foot.appendChild(document.createTextNode('.'));
    HOST.appendChild(foot);
  }

  function buildControls(cohort, list, selected) {
    var wrap = el('div', 'leaders-controls');
    var cohortOptions = state.data.cohorts.map(function (c) { return { value: c.id, label: c.label || c.id }; });
    wrap.appendChild(selectBox('leaders-cohort-select', 'Archived unmatched catalog book (not this week\'s matched 2026 book)', cohortOptions, cohort.id, function (value) { state.cohortId = value; state.candidateId = null; render(); }));
    var stratOptions = list.map(function (cand) { return { value: cand.id, label: strategyOptionLabel(cand) }; });
    if (stratOptions.length) { wrap.appendChild(selectBox('leaders-strategy-select', 'Archived catalog row (CAGR sort inside this unmatched book; not this week\'s winner)', stratOptions, selected ? selected.id : '', function (value) { state.candidateId = value; render(); })); }
    var toggleWrap = el('div');
    toggleWrap.appendChild(el('label', null, 'Chart view'));
    var toggle = el('div', 'leaders-toggle');
    toggle.setAttribute('role', 'group');
    toggle.setAttribute('aria-label', 'Chart view');
    [['growth', 'Growth of $10,000'], ['drawdown', 'Drawdown']].forEach(function (mode) {
      var btn = el('button', state.chart === mode[0] ? 'leaders-on' : null, mode[1]);
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(state.chart === mode[0]));
      btn.addEventListener('click', function () { state.chart = mode[0]; render(); });
      toggle.appendChild(btn);
    });
    toggleWrap.appendChild(toggle);
    wrap.appendChild(toggleWrap);
    return wrap;
  }

  function selectBox(id, labelText, options, value, onChange) {
    var wrap = el('div');
    var label = el('label', null, labelText);
    label.htmlFor = id;
    var select = el('select');
    select.id = id;
    options.forEach(function (opt) { var o = el('option', null, opt.label); o.value = opt.value; select.appendChild(o); });
    select.value = value;
    select.addEventListener('change', function () { onChange(select.value); });
    wrap.appendChild(label);
    wrap.appendChild(select);
    return wrap;
  }

  function helper() { return window.StockBlitzOverview || null; }
  function isSeedCandidate(cand) {
    var O = helper();
    if (O && typeof O.isSeedPath === 'function') { return O.isSeedPath(cand); }
    return /seed\s*\d+/i.test((cand.id || '') + ' ' + (cand.name || '')) || /random ordering/i.test(cand.name || '');
  }
  function isFirstEligibleCandidate(cand) {
    var O = helper();
    if (O && typeof O.isFirstEligible === 'function') { return O.isFirstEligible(cand); }
    return /first_eligible|first eligible/i.test((cand.id || '') + ' ' + (cand.name || ''));
  }
  function isClosedUnmatchedHeadline(cand) {
    var cagr = cand && cand.metrics && cand.metrics.cagr;
    var blob = ((cand && cand.id) || '') + ' ' + ((cand && cand.name) || '');
    if (!isFirstEligibleCandidate(cand)) { return false; }
    if (typeof cagr === 'number' && cagr >= 0.227 && cagr < 0.229) { return true; }
    return /raw_menu_first_eligible|Raw recommendations/i.test(blob);
  }
  function groupedArms(list) {
    var O = helper();
    if (O && typeof O.groupByArm === 'function' && typeof O.sortGroups === 'function') {
      return O.sortGroups(O.groupByArm(list));
    }
    return list.map(function (cand) {
      return { key: cand.id, label: cand.name, representative: cand, seeds: [] };
    });
  }
  function strategyOptionLabel(cand) {
    var tags = [];
    if (isClosedUnmatchedHeadline(cand)) { tags.push('archived unmatched · closed by W21'); }
    else { tags.push('archived catalog'); }
    if (isSeedCandidate(cand)) { tags.push('ordering seed · path spread, not an extra strategy'); }
    return '[' + tags.join('; ') + '] ' + cand.name + ' (catalog CAGR ' + pct(cand.metrics && cand.metrics.cagr) + ')';
  }

  function buildCards(groups, selected) {
    var grid = el('div', 'leaders-cards');
    groups.slice(0, 3).forEach(function (group, i) {
      var cand = group.representative;
      var inGroup = selected && (cand.id === selected.id || (group.seeds || []).some(function (s) { return s.id === selected.id; }));
      var card = el('button', 'leaders-card' + (inGroup ? ' leaders-selected' : ''));
      card.type = 'button';
      card.setAttribute('aria-pressed', String(!!inGroup));
      if (isClosedUnmatchedHeadline(cand)) {
        card.appendChild(el('div', 'archived-flag', 'Archived unmatched · closed by W21'));
      }
      card.appendChild(el('div', 'leaders-rank', i === 0
        ? 'Highest archived catalog CAGR in this unmatched book — not this week\'s winner'
        : 'Archived catalog rank ' + (i + 1) + ' by historical annualized return'));
      card.appendChild(el('h3', null, group.label || cand.name));
      var mini = el('div', 'leaders-mini');
      mini.appendChild(el('span', null, 'Archived catalog CAGR: ' + pct(cand.metrics && cand.metrics.cagr)));
      mini.appendChild(el('span', null, 'Max drawdown: ' + pct(cand.metrics && cand.metrics.max_drawdown)));
      card.appendChild(mini);
      var O = helper();
      var spread = O && typeof O.seedSpread === 'function' ? O.seedSpread(group) : null;
      if (spread) {
        card.appendChild(el('p', null,
          'Ordering-seed spread: ' + pct(spread.min) + ' to ' + pct(spread.max) +
          ' across ' + spread.n + ' seeds. That is a path spread, not extra strategies and not extra market histories.'));
      } else if (group.seeds && group.seeds.length) {
        card.appendChild(el('p', null, 'Ordering seeds are a path spread, not extra strategies.'));
      }
      if (cand.description) { var brief = cand.description.split('. ')[0] + '.'; var description = el('p', null, brief); description.title = cand.description; card.appendChild(description); }
      card.addEventListener('click', function () { state.candidateId = cand.id; render(); });
      grid.appendChild(card);
    });
    return grid;
  }

  function buildHero(cohort, cand) {
    var box = el('div', 'leaders-hero');
    box.appendChild(el('p', 'leaders-basis', 'Archived catalog selection — not a live recommendation and not this week\'s matched 2026 book.'));
    if (isClosedUnmatchedHeadline(cand)) {
      box.appendChild(el('div', 'archived-flag', 'Archived unmatched · closed by W21'));
      box.appendChild(el('p', 'leaders-blurb', 'This 22.78% first-eligible row is an archived unmatched AccountBook study. W21 closed it. It is not this week\'s result.'));
    }
    box.appendChild(el('h3', null, cand.name));
    var basis = [];
    if (cohort.metric_basis) { basis.push(cohort.metric_basis); }
    if (cohort.start && cohort.end) { basis.push('Period: ' + cohort.start + ' to ' + cohort.end); }
    if (isNum(cohort.starting_equity)) { basis.push('Starting equity: ' + money(cohort.starting_equity)); }
    if (basis.length) { box.appendChild(el('p', 'leaders-basis', basis.join(' | '))); }
    if (cand.description) { box.appendChild(el('p', null, cand.description)); }
    // Readiness is shown once, immediately above the chart.
    var m = cand.metrics || {};
    var sharpe = formatSharpe(m.sharpe_zero_cash_rate, 'zero_cash');
    var rows = [
      ['Archived catalog CAGR', pct(m.cagr)],
      ['Total return', pct(m.total_return)],
      [sharpe.label, sharpe.valueText],
      ['Max drawdown', pct(m.max_drawdown)],
      ['Ending equity', money(m.ending_equity)],
      ['Orders', isNum(m.orders) ? String(m.orders) : 'unavailable'],
      ['Costs', costText(m)]
    ];
    var dl = el('dl', 'leaders-metrics');
    rows.forEach(function (row) {
      var cell = el('div');
      cell.appendChild(el('dt', null, row[0]));
      cell.appendChild(el('dd', null, row[1]));
      dl.appendChild(cell);
    });
    box.appendChild(dl);
    var sharpeNote = el('p', 'leaders-basis', sharpe.explanation + ' Cash return is set to zero in this calculation.');
    sharpeNote.title = 'Annualized mean daily return divided by annualized daily-return volatility; not CAGR divided by volatility.';
    box.appendChild(sharpeNote);
    (cohort.benchmarks || []).forEach(function (b) {
      var value = formatSharpe((b.metrics || {}).sharpe_zero_cash_rate, 'zero_cash');
      box.appendChild(el('span', 'leaders-basis', b.id + ' Sharpe: ' + value.valueText + '  '));
    });
    return box;
  }

  function costText(m) {
    var parts = [m.commissions, m.slippage_cost, m.financing_expense].filter(isNum);
    if (!parts.length) { return 'unavailable'; }
    var total = parts.reduce(function (a, b) { return a + b; }, 0);
    return money(total) + (parts.length < 3 ? ' (known components only)' : '');
  }

  function buildChart(cohort, cand) {
    var wrap = el('div', 'leaders-chartwrap');
    var caption = state.chart === 'growth'
      ? 'Growth of $10,000 (display-only normalization from the cohort starting equity of ' + money(cohort.starting_equity) + '; costs are not recomputed)'
      : 'Drawdown from peak equity (peak tracking starts at the account starting equity)';
    wrap.appendChild(el('p', 'leaders-basis', caption));
    var series = [];
    if (cand && Array.isArray(cand.curve) && cand.curve.length) { series.push({ label: cand.name, color: LINE_COLORS.candidate, curve: cand.curve }); }
    (cohort.benchmarks || []).forEach(function (b) {
      if (Array.isArray(b.curve) && b.curve.length) { series.push({ label: (b.name || b.id) + ' · ' + pct(b.metrics && b.metrics.cagr) + ' annualized', color: LINE_COLORS[b.id] || '#a8b7c8', curve: b.curve }); }
    });
    if (!series.length || !isNum(cohort.starting_equity) || cohort.starting_equity <= 0) {
      wrap.appendChild(el('div', 'leaders-msg', 'Curve data is unavailable for this selection.'));
      return wrap;
    }
    series.forEach(function (s) {
      var peak = cohort.starting_equity;
      s.values = s.curve.map(function (p) {
        if (!isNum(p.equity)) { return null; }
        if (state.chart === 'growth') { return 10000 * p.equity / cohort.starting_equity; }
        peak = Math.max(peak, p.equity);
        return peak > 0 ? p.equity / peak - 1 : 0;
      });
    });
    var grid = series[0].curve.map(function (p) { return p.date; });
    var n = grid.length;
    var W = 760, H = 300, L = 64, R = 14, T = 14, B = 34;
    var lo = Infinity, hi = -Infinity;
    series.forEach(function (s) { s.values.forEach(function (v) { if (isNum(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }); });
    if (!isFinite(lo)) {
      wrap.appendChild(el('div', 'leaders-msg', 'Curve data is unavailable for this selection.'));
      return wrap;
    }
    if (hi === lo) { var padY = Math.abs(hi) * 0.05 + (state.chart === 'growth' ? 100 : 0.01); hi += padY; lo -= padY; }
    function xAt(i) { return n > 1 ? L + (W - L - R) * i / (n - 1) : (L + W - R) / 2; }
    function yAt(v) { return T + (H - T - B) * (hi - v) / (hi - lo); }
    var fmtY = state.chart === 'growth' ? money : pct;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', tabindex: '0' });
    svg.setAttribute('aria-label', caption + '. Use the left and right arrow keys to read values by date.');
    for (var t = 0; t <= 4; t++) {
      var gv = lo + (hi - lo) * t / 4;
      var gy = yAt(gv);
      svg.appendChild(svgEl('line', { x1: L, x2: W - R, y1: gy, y2: gy, stroke: '#232f3d', 'stroke-width': 1 }));
      var yl = svgEl('text', { x: L - 6, y: gy + 4, fill: '#a8b7c8', 'font-size': 11, 'text-anchor': 'end' });
      yl.textContent = fmtY(gv);
      svg.appendChild(yl);
    }
    [0, Math.floor((n - 1) / 2), n - 1].forEach(function (i, idx, arr) {
      if (i < 0 || (idx > 0 && i === arr[idx - 1])) { return; }
      var xl = svgEl('text', { x: xAt(i), y: H - 10, fill: '#a8b7c8', 'font-size': 11, 'text-anchor': idx === 0 ? 'start' : idx === arr.length - 1 ? 'end' : 'middle' });
      xl.textContent = grid[i];
      svg.appendChild(xl);
    });
    series.forEach(function (s) {
      var d = '';
      s.curve.forEach(function (p, i) {
        if (i >= n || !isNum(s.values[i])) { return; }
        d += (d ? 'L' : 'M') + xAt(i).toFixed(1) + ' ' + yAt(s.values[i]).toFixed(1);
      });
      if (n === 1 && isNum(s.values[0])) { svg.appendChild(svgEl('circle', { cx: xAt(0), cy: yAt(s.values[0]), r: 3, fill: s.color })); }
      else if (d) { svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: s.color, 'stroke-width': 2 })); }
    });
    var cursor = svgEl('line', { y1: T, y2: H - B, stroke: '#a8b7c8', 'stroke-width': 1, 'stroke-dasharray': '3 3', visibility: 'hidden' });
    svg.appendChild(cursor);
    var dots = series.map(function (s) { var dot = svgEl('circle', { r: 3.5, fill: s.color, visibility: 'hidden' }); svg.appendChild(dot); return dot; });
    var tip = el('div', 'leaders-tip');
    tip.setAttribute('role', 'status');
    var hoverIndex = -1;
    function hideTip() {
      hoverIndex = -1;
      tip.style.display = 'none';
      cursor.setAttribute('visibility', 'hidden');
      dots.forEach(function (dot) { dot.setAttribute('visibility', 'hidden'); });
    }
    function showIndex(i) {
      i = Math.max(0, Math.min(n - 1, i));
      hoverIndex = i;
      cursor.setAttribute('x1', xAt(i));
      cursor.setAttribute('x2', xAt(i));
      cursor.setAttribute('visibility', 'visible');
      tip.textContent = '';
      tip.appendChild(el('div', null, grid[i]));
      series.forEach(function (s, k) {
        var p = s.curve[i];
        if (!p || !isNum(s.values[i])) { dots[k].setAttribute('visibility', 'hidden'); return; }
        dots[k].setAttribute('cx', xAt(i));
        dots[k].setAttribute('cy', yAt(s.values[i]));
        dots[k].setAttribute('visibility', 'visible');
        var text = state.chart === 'growth'
          ? s.label + ': ' + money(p.equity) + ' actual equity (' + money(s.values[i]) + ' per $10,000)'
          : s.label + ': ' + pct(s.values[i]) + ' drawdown (equity ' + money(p.equity) + ')';
        tip.appendChild(el('div', null, text));
      });
      tip.style.display = 'block';
      var frac = n > 1 ? i / (n - 1) : 0.5;
      tip.style.left = Math.max(4, Math.min(wrap.clientWidth - 290, wrap.clientWidth * frac)) + 'px';
      tip.style.top = '34px';
    }
    svg.addEventListener('pointermove', function (ev) {
      var box = svg.getBoundingClientRect();
      if (!box.width) { return; }
      var vx = (ev.clientX - box.left) * W / box.width;
      showIndex(n > 1 ? Math.round((vx - L) * (n - 1) / (W - L - R)) : 0);
    });
    svg.addEventListener('pointerleave', hideTip);
    svg.addEventListener('blur', hideTip);
    svg.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight') { showIndex(hoverIndex < 0 ? 0 : hoverIndex + 1); ev.preventDefault(); }
      else if (ev.key === 'ArrowLeft') { showIndex(hoverIndex < 0 ? n - 1 : hoverIndex - 1); ev.preventDefault(); }
      else if (ev.key === 'Escape') { hideTip(); }
    });
    var legend = el('div', 'leaders-legend');
    series.forEach(function (s) {
      var item = el('span');
      var swatch = el('span', 'leaders-swatch');
      swatch.style.background = s.color;
      item.appendChild(swatch);
      item.appendChild(document.createTextNode(s.label));
      legend.appendChild(item);
    });
    ['VOO', 'SPY'].forEach(function (id) {
      var present = (cohort.benchmarks || []).some(function (b) { return b.id === id && Array.isArray(b.curve) && b.curve.length; });
      if (!present) { legend.appendChild(el('span', null, id + ' benchmark curve unavailable')); }
    });
    wrap.appendChild(svg);
    wrap.appendChild(tip);
    wrap.appendChild(legend);
    return wrap;
  }

  function buildDetails(cohort, cand) {
    var box = document.createElement('details');
    box.appendChild(el('summary', null, 'Data provenance and limitations'));
    var ul = document.createElement('ul');
    (cohort.limitations || []).forEach(function (item) { ul.appendChild(el('li', null, item)); });
    if (!ul.childNodes.length) { ul.appendChild(el('li', null, 'No limitations were listed for this scenario.')); }
    box.appendChild(ul);
    if (cand && cand.source_report) {
      var p = el('p', null, 'Source report: ');
      var a = el('a', null, cand.source_report);
      a.href = 'portfolio_leaders.json';
      a.title = 'Open the exported comparison, with source report names and fingerprints';
      p.appendChild(a);
      box.appendChild(p);
    }
    if (state.data.generated_at) { box.appendChild(el('p', 'leaders-basis', 'Data generated: ' + state.data.generated_at)); }
    return box;
  }

  function buildEvidence(entries) {
    var box = document.createElement('details');
    box.appendChild(el('summary', null, 'Model evidence \u2014 forecast experiments, shown separately and never ranked'));
    box.appendChild(el('p', 'leaders-basis', 'These are supervised forecast-error diagnostics, not portfolio returns: no costs, taxes or execution. They are excluded from every ranking above; null results and failed controls stay reported.'));
    entries.forEach(function (entry) {
      if (entry.ranked !== false) { return; }
      var item = el('div', 'leaders-evidence');
      item.appendChild(el('h3', null, entry.title));
      if (entry.summary) { item.appendChild(el('p', null, entry.summary)); }
      if (entry.verdict) { item.appendChild(el('p', 'leaders-blurb', 'Verdict: ' + entry.verdict)); }
      if (entry.source_report) { item.appendChild(el('p', 'leaders-basis', 'Source report: ' + entry.source_report)); }
      box.appendChild(item);
    });
    return box;
  }

  renderMessage('Loading archived unmatched catalog...');
  fetch('portfolio_leaders.json', { cache: 'no-store' })
    .then(function (resp) { if (!resp.ok) { throw new Error('HTTP ' + resp.status); } return resp.json(); })
    .then(function (data) {
      if (!data || !Array.isArray(data.cohorts) || !data.cohorts.length) {
        renderMessage('No portfolio comparison data is available yet. Run the portfolio research export to create portfolio_leaders.json.');
        return;
      }
      state.data = data;
      var hasDefault = data.cohorts.some(function (c) { return c.id === data.default_cohort_id; });
      state.cohortId = hasDefault ? data.default_cohort_id : data.cohorts[0].id;
      render();
    })
    .catch(function (err) {
      renderMessage('Could not load portfolio comparison data (' + (err && err.message ? err.message : 'unknown error') + '). Reload the page to retry.');
    });
})();
