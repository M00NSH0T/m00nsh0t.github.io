/* overview-helpers-start */
var StockBlitzOverview = (function () {
  'use strict';
  const PREFERRED = ['menu_learned_longer_5', 'menu_learned_5', 'frozen_controls_v3_5', 'ira_5'];
  const METRIC_TIPS = {
    cagr: 'Compound annual growth over this scenario only. Not an expected future return, and not comparable across different accounts, dates or cost books.',
    sharpe: 'Annualized mean daily return divided by daily-return volatility, using a zero cash rate — not excess over T-bills, and not CAGR divided by volatility.',
    drawdown: 'Largest peak-to-trough drop in marked wealth. More negative is a deeper loss. It is not a VaR or a live-risk limit.',
    orders: 'Filled buy and sell orders. Rejected attempts and dividends are excluded.',
    pretax: 'These curves do not deduct personal capital-gains or withdrawal tax. They are not after-tax household wealth.',
    aftertax: 'After-tax household liquidation is a different objective and is not shown as a ranking metric here.',
  };

  function familyOf(id) {
    if (!id) return 'unknown';
    if (id.startsWith('menu_learned_longer')) return 'menu_learned_longer';
    if (id.startsWith('menu_learned')) return 'menu_learned';
    if (id.startsWith('frozen_controls')) return 'frozen_controls_v3';
    if (id.startsWith('raw_')) return 'raw';
    if (id.startsWith('ira_')) return 'ira';
    if (id === 'taxable') return 'taxable';
    return 'other';
  }

  function costOf(id) {
    if (!id) return null;
    if (/_25$/.test(id) || id.endsWith('_25')) return 25;
    if (/_5$/.test(id) || id === 'ira_5') return 5;
    if (id === 'taxable') return 5;
    return null;
  }

  function eraOf(id) {
    if (!id) return 'continuous';
    const match = /^raw_(2021|2022|2023_2024|2025_2026)_/.exec(id);
    return match ? match[1] : 'continuous';
  }

  function pickDefaultCohort(cohorts) {
    const list = Array.isArray(cohorts) ? cohorts : [];
    for (const id of PREFERRED) {
      if (list.some(c => c.id === id)) return id;
    }
    return list[0] ? list[0].id : null;
  }

  function filterCohorts(cohorts, filters) {
    const family = filters && filters.family;
    const cost = filters && filters.cost;
    const era = filters && filters.era;
    return (cohorts || []).filter(c => {
      if (family && familyOf(c.id) !== family) return false;
      if (cost != null && costOf(c.id) !== Number(cost)) return false;
      if (era && era !== 'continuous' && familyOf(c.id) === 'raw' && eraOf(c.id) !== era) return false;
      if (era === 'continuous' && familyOf(c.id) === 'raw') return false;
      return true;
    });
  }

  function isSeedPath(candidate) {
    const id = (candidate.id || '') + ' ' + (candidate.name || '');
    return /seed\s*\d+/i.test(id) || /random ordering/i.test(id);
  }

  function isFirstEligible(candidate) {
    return /first_eligible|first eligible/i.test((candidate.id || '') + ' ' + (candidate.name || ''));
  }

  function armKey(candidate) {
    const blob = ((candidate.id || '') + ' ' + (candidate.name || '')).toLowerCase();
    if (blob.includes('ensemble')) return 'ensemble';
    if (blob.includes('ridge')) return 'ridge';
    if (blob.includes('raw_menu') || blob.includes('raw recommendations') || blob.includes('momentum')) return 'momentum';
    if (blob.includes('vol_target') || blob.includes('volatility-targeted') || blob.includes('volatility-managed')) return 'vol_target';
    if (blob.includes('equal')) return 'equal';
    if (blob.includes('sentiment') || blob.includes('news-weighted')) return 'news';
    if (blob.includes('trend')) return 'trend';
    return candidate.id || 'other';
  }

  function armLabel(candidate) {
    const key = armKey(candidate);
    const labels = {
      ensemble: 'Stacked ensemble scores',
      ridge: 'Learned ridge scores',
      momentum: 'Fixed momentum menu',
      vol_target: 'Volatility-targeted SPY',
      equal: 'Equal-weight control',
      news: 'News-weighted stocks',
      trend: 'Trend overlay',
    };
    return labels[key] || candidate.name || key;
  }

  function groupByArm(candidates) {
    const groups = [];
    const index = {};
    for (const candidate of candidates || []) {
      const key = armKey(candidate);
      if (!index[key]) {
        const group = { key, label: armLabel(candidate), representative: null, seeds: [] };
        index[key] = group;
        groups.push(group);
      }
      const group = index[key];
      if (isSeedPath(candidate)) group.seeds.push(candidate);
      else if (!group.representative || isFirstEligible(candidate)) group.representative = candidate;
    }
    for (const group of groups) {
      if (!group.representative && group.seeds.length) group.representative = group.seeds[0];
    }
    return groups.filter(g => g.representative);
  }

  function seedSpread(group) {
    const values = (group.seeds || []).map(s => s.metrics && s.metrics.cagr).filter(v => typeof v === 'number' && isFinite(v));
    if (!values.length) return null;
    return { n: values.length, min: Math.min.apply(null, values), max: Math.max.apply(null, values) };
  }

  function sortGroups(groups) {
    return groups.slice().sort((a, b) => {
      const av = a.representative.metrics && a.representative.metrics.cagr;
      const bv = b.representative.metrics && b.representative.metrics.cagr;
      if (av == null && bv != null) return 1;
      if (bv == null && av != null) return -1;
      if (av != null && bv != null && av !== bv) return bv - av;
      return (a.label < b.label) ? -1 : (a.label > b.label) ? 1 : 0;
    });
  }

  function describeRl(candidate, cohort) {
    const blob = ((candidate.name || '') + ' ' + (candidate.description || '') + ' ' + (candidate.readiness_blurb || '')).toLowerCase();
    const id = (candidate.id || '').toLowerCase();
    const family = familyOf(cohort && cohort.id);
    if (family === 'frozen_controls_v3' || family === 'taxable' || family === 'ira') {
      return 'No. This scenario has no trained RL policy. Do not compare it with synthetic-reward or minute-path RL runs.';
    }
    if (id.includes('raw_menu') || /no rl|no learning/.test(blob)) {
      return 'No. This is a transparent first-eligible or random-order menu, not a trained RL policy.';
    }
    if (id.includes('ridge') || blob.includes('ridge')) {
      return 'Not in this book. Ridge is a supervised forecast that replaces the menu score. Separate minute-menu and decode studies found no consistent RL edge; those rewards are not ranked here.';
    }
    if (id.includes('ensemble') || blob.includes('ensemble')) {
      return 'Not RL. The stacked scores are supervised out-of-fold forecasts. They underperformed the fixed menu on the matched 2022–2026 overlap.';
    }
    return 'RL was not part of this matched comparison.';
  }

  function describeDrivers(candidate) {
    return candidate.description || 'Decision rule is not described in this catalog row.';
  }

  function describeMeasures(cohort) {
    const basis = (cohort && cohort.metric_basis) || 'Metric basis was not recorded.';
    const tax = /pre-tax|pretax|not deducted|withdrawal taxes excluded/i.test(basis)
      ? ' Pre-tax / IRA-internal marks only; not after-tax household wealth.'
      : '';
    return basis + tax;
  }

  function describeBlocker(candidate) {
    return candidate.readiness_blurb || 'Readiness blocker was not recorded. No strategy is market-ready.';
  }

  function missingBenchmarks(cohort) {
    const present = new Set((cohort.benchmarks || []).filter(b => Array.isArray(b.curve) && b.curve.length).map(b => b.id));
    return ['VOO', 'SPY'].filter(id => !present.has(id));
  }

  function familiesPresent(cohorts) {
    const labels = {
      menu_learned_longer: 'Archived unmatched longer book (2021–2026, closed by W21)',
      menu_learned: 'Archived unmatched menu vs learned (2022–2026)',
      frozen_controls_v3: 'Frozen traditional controls v3 (different engine)',
      raw: 'Raw recommendations by reset era (archived unmatched)',
      ira: 'Archived unmatched mixed IRA catalog',
      taxable: 'Taxable low-turnover / margin (pre-tax)',
    };
    const seen = [];
    for (const c of cohorts || []) {
      const key = familyOf(c.id);
      if (!seen.some(x => x.value === key)) seen.push({ value: key, label: labels[key] || key });
    }
    return seen;
  }

  return {
    PREFERRED, METRIC_TIPS, familyOf, costOf, eraOf, pickDefaultCohort, filterCohorts,
    isSeedPath, isFirstEligible, armKey, armLabel, groupByArm, seedSpread, sortGroups,
    describeRl, describeDrivers, describeMeasures, describeBlocker, missingBenchmarks,
    familiesPresent,
  };
})();
/* overview-helpers-end */
(function () {
  'use strict';
  const host = document.getElementById('candidate-overview');
  if (!host || !window.StockBlitzOverview) return;
  const O = StockBlitzOverview;
  const COLORS = { candidate: '#7ad5c1', VOO: '#94b8e5', SPY: '#e5b276' };
  const state = { data: null, family: null, cost: 5, era: 'continuous', model: 'all', selected: null };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function pct(v) {
    return typeof v === 'number' && isFinite(v) ? (100 * v).toFixed(2) + '%' : 'unavailable';
  }
  function money(v) {
    return typeof v === 'number' && isFinite(v) ? '$' + Math.round(v).toLocaleString('en-US') : 'unavailable';
  }
  function tip(label, key) {
    const abbr = document.createElement('abbr');
    abbr.className = 'metric-help';
    abbr.textContent = label;
    abbr.title = O.METRIC_TIPS[key] || label;
    return abbr;
  }
  function activeCohort() {
    const matches = O.filterCohorts(state.data.cohorts, { family: state.family, cost: state.cost, era: state.era });
    return matches[0] || null;
  }
  function renderMessage(text) {
    host.textContent = '';
    host.className = 'panel';
    host.append(el('p', null, text));
  }

  function drawChart(cohort, candidate) {
    const wrap = el('div');
    const missing = O.missingBenchmarks(cohort);
    if (missing.length) {
      wrap.append(el('p', 'missing-bench', 'Missing benchmark curve: ' + missing.join(' and ') + '.'));
    }
    const series = [];
    if (candidate && candidate.curve) series.push({ id: 'candidate', label: candidate.name, curve: candidate.curve, color: COLORS.candidate });
    (cohort.benchmarks || []).forEach(b => {
      if (b.curve && b.curve.length) series.push({ id: b.id, label: b.name || b.id, curve: b.curve, color: COLORS[b.id] || '#a8b7c8' });
    });
    if (!series.length || !cohort.starting_equity) {
      wrap.append(el('p', 'muted', 'Curve data is unavailable for this selection.'));
      return wrap;
    }
    const n = series[0].curve.length;
    const W = 760, H = 240, L = 58, R = 12, T = 12, B = 28;
    let lo = Infinity, hi = -Infinity;
    series.forEach(s => s.curve.forEach(p => {
      if (typeof p.equity === 'number') {
        lo = Math.min(lo, p.equity);
        hi = Math.max(hi, p.equity);
      }
    }));
    if (!isFinite(lo)) {
      wrap.append(el('p', 'muted', 'Curve data is unavailable for this selection.'));
      return wrap;
    }
    if (hi === lo) { hi += 1; lo -= 1; }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('class', 'overview-chart');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Marked wealth for the selected candidate versus VOO and SPY in this scenario');
    function xAt(i) { return n > 1 ? L + (W - L - R) * i / (n - 1) : (L + W - R) / 2; }
    function yAt(v) { return T + (H - T - B) * (hi - v) / (hi - lo); }
    for (let t = 0; t <= 4; t++) {
      const gv = lo + (hi - lo) * t / 4;
      const gy = yAt(gv);
      const line = document.createElementNS(svg.namespaceURI, 'line');
      line.setAttribute('x1', L); line.setAttribute('x2', W - R);
      line.setAttribute('y1', gy); line.setAttribute('y2', gy);
      line.setAttribute('stroke', '#2b3440');
      svg.appendChild(line);
      const lab = document.createElementNS(svg.namespaceURI, 'text');
      lab.setAttribute('x', L - 6); lab.setAttribute('y', gy + 4);
      lab.setAttribute('fill', '#9ba9b9'); lab.setAttribute('font-size', '11'); lab.setAttribute('text-anchor', 'end');
      lab.textContent = money(gv);
      svg.appendChild(lab);
    }
    series.forEach(s => {
      let d = '';
      s.curve.forEach((p, i) => {
        if (typeof p.equity !== 'number') return;
        d += (d ? 'L' : 'M') + xAt(i).toFixed(1) + ' ' + yAt(p.equity).toFixed(1);
      });
      if (d) {
        const path = document.createElementNS(svg.namespaceURI, 'path');
        path.setAttribute('d', d); path.setAttribute('fill', 'none');
        path.setAttribute('stroke', s.color); path.setAttribute('stroke-width', '2');
        svg.appendChild(path);
      }
    });
    const dates = series[0].curve;
    [0, n - 1].forEach((i, idx) => {
      if (!dates[i]) return;
      const lab = document.createElementNS(svg.namespaceURI, 'text');
      lab.setAttribute('x', xAt(i)); lab.setAttribute('y', H - 8);
      lab.setAttribute('fill', '#9ba9b9'); lab.setAttribute('font-size', '11');
      lab.setAttribute('text-anchor', idx ? 'end' : 'start');
      lab.textContent = dates[i].date;
      svg.appendChild(lab);
    });
    wrap.append(svg);
    const legend = el('div', 'overview-legend');
    series.forEach(s => {
      const span = el('span');
      span.style.color = s.color;
      const bench = (cohort.benchmarks || []).find(b => b.id === s.id);
      const extra = s.id !== 'candidate' && bench && bench.metrics
        ? ' · ' + pct(bench.metrics.cagr) + ' annualized'
        : '';
      span.textContent = s.label + extra;
      legend.append(span);
    });
    wrap.append(legend);
    wrap.append(el('p', 'muted',
      'Same account, dates and cost book. Seed/path spreads are shown on the cards; they are not market confidence intervals. ' +
      'W01: candidate-versus-VOO/SPY paired 95% intervals on the 28-arm menu books include zero. Synthetic RL rewards are not on this chart.'));
    return wrap;
  }

  function selectBox(labelText, options, value, onChange) {
    const wrap = el('div');
    const label = el('label', null, labelText);
    const select = document.createElement('select');
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      select.append(o);
    });
    select.value = value;
    select.addEventListener('change', () => onChange(select.value));
    wrap.append(label, select);
    return wrap;
  }

  function render() {
    const cohort = activeCohort();
    host.textContent = '';
    host.className = 'panel';
    host.append(el('div', 'eyebrow', 'Ranking 1 of 2 · archived unmatched catalog · closed by W21'));
    host.append(el('h2', null, 'Archived unmatched longer book (not this week\'s ranking)'));
    host.append(el('p', null,
      'This is the archived unmatched longer IRA menu-versus-learned book (2021–2026) that W21 closed. It is not this week\'s comparable 2026 book and not a live recommendation. ' +
      'The default view stays on that longer catalog so existing checks can find it. Cards are sorted only inside this archived account, period and cost. Minute-menu RL is unranked against these daily CAGRs. Nothing is promoted or paper-ready.'));

    const controls = el('div', 'overview-controls');
    const families = O.familiesPresent(state.data.cohorts);
    if (!state.family) state.family = O.familyOf(O.pickDefaultCohort(state.data.cohorts));
    controls.append(selectBox('Account / study book', families, state.family, value => {
      state.family = value;
      state.selected = null;
      if (value !== 'raw') state.era = 'continuous';
      const available = O.filterCohorts(state.data.cohorts, {
        family: value, cost: state.cost, era: value === 'raw' ? state.era : 'continuous',
      });
      if (!available.length) {
        const any = O.filterCohorts(state.data.cohorts, { family: value });
        if (any.length) state.cost = O.costOf(any[0].id) || state.cost;
      }
      render();
    }));
    const costOptions = [
      { value: '5', label: 'Base costs · $1/order + 5 bps' },
      { value: '25', label: 'Cost stress · $1/order + 25 bps' },
    ].filter(opt => O.filterCohorts(state.data.cohorts, { family: state.family, cost: Number(opt.value), era: state.family === 'raw' ? state.era : 'continuous' }).length);
    if (costOptions.length) {
      controls.append(selectBox('Cost stress', costOptions, String(state.cost), value => {
        state.cost = Number(value);
        state.selected = null;
        render();
      }));
    }
    if (state.family === 'raw') {
      const eras = [
        { value: '2021', label: '2021 (starts in cash)' },
        { value: '2022', label: '2022 (starts in cash)' },
        { value: '2023_2024', label: '2023–2024 (starts in cash)' },
        { value: '2025_2026', label: '2025–2026 (starts in cash)' },
      ];
      if (!eras.some(e => e.value === state.era)) state.era = '2021';
      controls.append(selectBox('Era view (not ranked against the continuous book)', eras, state.era, value => {
        state.era = value;
        state.selected = null;
        render();
      }));
    }
    const modelOptions = [{ value: 'all', label: 'All models in this book' }];
    if (cohort) {
      O.groupByArm(cohort.candidates).forEach(g => modelOptions.push({ value: g.key, label: g.label }));
    }
    controls.append(selectBox('Model', modelOptions, state.model, value => {
      state.model = value;
      state.selected = null;
      render();
    }));
    host.append(controls);
    if (state.family !== 'raw') {
      host.append(el('p', 'muted', 'Continuous book. Era slices of the raw-recommendation study start in cash and are a different scenario.'));
    }

    if (!cohort) {
      host.append(el('p', 'warn', 'No comparable cohort matches this account/period/cost filter. Missing benchmark data is a gap, not a ranking.'));
      return;
    }

    const basis = el('p', 'muted');
    basis.append(tip('What this measures', /pre-tax|pretax|not deducted/i.test(cohort.metric_basis || '') ? 'pretax' : 'aftertax'));
    basis.append(document.createTextNode(' · ' + O.describeMeasures(cohort)));
    if (cohort.start && cohort.end) basis.append(document.createTextNode(' · ' + cohort.start + ' to ' + cohort.end));
    if (cohort.starting_equity) basis.append(document.createTextNode(' · start ' + money(cohort.starting_equity)));
    host.append(basis);

    let groups = O.sortGroups(O.groupByArm(cohort.candidates));
    if (state.model !== 'all') groups = groups.filter(g => g.key === state.model);
    if (!groups.length) {
      host.append(el('p', 'muted', 'No candidates in this filter.'));
      return;
    }
    const selectedGroup = groups.find(g => g.representative.id === state.selected) || groups[0];
    state.selected = selectedGroup.representative.id;

    const cards = el('div', 'why-cards');
    groups.forEach((group, i) => {
      const cand = group.representative;
      const card = el('button', 'why-card' + (cand.id === state.selected ? ' selected' : ''));
      card.type = 'button';
      card.setAttribute('aria-pressed', String(cand.id === state.selected));
      const rank = el('div', 'eyebrow', i === 0
        ? 'Highest archived catalog CAGR in this unmatched book only — not this week\'s winner'
        : 'Archived catalog rank ' + (i + 1) + ' by historical annualized return');
      card.append(rank);
      card.append(el('h3', null, group.label));
      const mini = el('p');
      mini.append(tip('Annualized', 'cagr'));
      mini.append(document.createTextNode(' ' + pct(cand.metrics && cand.metrics.cagr) + ' · '));
      mini.append(tip('Max drawdown', 'drawdown'));
      mini.append(document.createTextNode(' ' + pct(cand.metrics && cand.metrics.max_drawdown) + ' · '));
      mini.append(tip('Orders', 'orders'));
      mini.append(document.createTextNode(' ' + (cand.metrics && cand.metrics.orders != null ? cand.metrics.orders : 'unavailable')));
      card.append(mini);
      const spread = O.seedSpread(group);
      if (spread) {
        card.append(el('p', 'muted',
          'Seed/path spread: ' + pct(spread.min) + ' to ' + pct(spread.max) +
          ' across ' + spread.n + ' ordering seeds. That is model-path dispersion, not extra market history.'));
      }
      const dl = document.createElement('dl');
      [[ 'What drives decisions', O.describeDrivers(cand) ],
       [ 'Did RL add value?', O.describeRl(cand, cohort) ],
       [ 'What this result measures', O.describeMeasures(cohort) ],
       [ 'Blocker to readiness', O.describeBlocker(cand) ]].forEach(([dt, dd]) => {
        dl.append(el('dt', null, dt));
        dl.append(el('dd', null, dd));
      });
      card.append(dl);
      card.addEventListener('click', () => { state.selected = cand.id; render(); });
      cards.append(card);
    });
    host.append(cards);
    host.append(drawChart(cohort, selectedGroup.representative));
    const sharpeLine = el('p', 'muted');
    sharpeLine.append(tip('Sharpe (zero cash rate)', 'sharpe'));
    const m = selectedGroup.representative.metrics || {};
    sharpeLine.append(document.createTextNode(
      ' ' + (typeof m.sharpe_zero_cash_rate === 'number' ? m.sharpe_zero_cash_rate.toFixed(2) : 'unavailable') +
      '. Costs in this row: commissions ' + money(m.commissions) + ', slippage ' + money(m.slippage_cost) +
      (m.financing_expense ? ', financing ' + money(m.financing_expense) : '') + '.'));
    host.append(sharpeLine);
  }

  fetch('portfolio_leaders.json', { cache: 'no-store' })
    .then(resp => { if (!resp.ok) throw new Error('HTTP ' + resp.status); return resp.json(); })
    .then(data => {
      if (!data || !Array.isArray(data.cohorts) || !data.cohorts.length) {
        renderMessage('No comparable portfolio catalog is published yet.');
        return;
      }
      state.data = data;
      const def = O.pickDefaultCohort(data.cohorts);
      state.family = O.familyOf(def);
      state.cost = O.costOf(def) || 5;
      state.era = O.eraOf(def);
      render();
    })
    .catch(err => {
      renderMessage('Could not load the comparable catalog (' + (err && err.message ? err.message : 'unknown error') + ').');
    });
})();
// Experiment tables read only generated public summaries. No account APIs.
(async function(){
let report;
try{
report=await (async()=>{
for(let i=0;i<100;i++){
if(typeof data!=='undefined'&&data)return data;
await new Promise((resolve)=>setTimeout(resolve,50));
}
const response=await fetch('report.json',{cache:'no-store'});
if(!response.ok)throw new Error('No report.json');
return response.json();
})();
}catch(err){
return;
}
const nav=document.querySelector('nav'),main=document.querySelector('main');
const button=document.createElement('button');button.textContent='Strategy & RL studies';nav.append(button);
const section=document.createElement('section');section.id='experiments';main.append(section);
button.onclick=()=>{document.querySelectorAll('nav button,section').forEach(x=>x.classList.remove('active'));button.classList.add('active');section.classList.add('active')};
function heading(text){const h=document.createElement('h2');h.textContent=text;section.append(h)}
function note(text){const p=document.createElement('p');p.textContent=text;section.append(p)}
function table(headers,rows){const wrap=document.createElement('div');wrap.className='panel overflow';const t=document.createElement('table');const head=t.insertRow();for(const label of headers){const th=document.createElement('th');th.textContent=label;head.append(th)}for(const values of rows){const row=t.insertRow();for(const value of values){const cell=row.insertCell();cell.textContent=String(value);const help=typeof explanations!=='undefined'?explanations[String(value)]:null;if(help){const d=document.createElement('details');d.className='help';const summary=document.createElement('summary');summary.textContent='?';summary.setAttribute('aria-label','Explain '+value);const body=document.createElement('span');body.textContent=help;d.append(summary,body);cell.append(d);cell.title=help;}}}wrap.append(t);section.append(wrap)}
const pct=n=>(100*n).toFixed(2)+'%',num=n=>Number(n).toFixed(3);
if(report.experiment_index){const tab=document.createElement('button');tab.textContent='Research index';nav.append(tab);const index=document.createElement('section');index.id='research-index';main.append(index);tab.onclick=()=>{document.querySelectorAll('nav button,section').forEach(x=>x.classList.remove('active'));tab.classList.add('active');index.classList.add('active')};const title=document.createElement('h2');title.textContent='What we tested and how to reproduce it';index.append(title);const intro=document.createElement('p');intro.textContent='Each study answers a different question. Use the continuous curves and risk comparisons on Overview, then inspect the detailed results in Strategy & RL studies. These are historical experiments, not live trading systems.';index.append(intro);for(const study of report.experiment_index.studies){const card=document.createElement('div');card.className='panel';const heading=document.createElement('h3');heading.textContent=study.title+' · '+study.status;card.append(heading);for(const value of [study.question,study.design]){const p=document.createElement('p');p.textContent=value;card.append(p)}const destinations={rl_walk_forward:'nested',rl_cadence:'cadence42',rl_replication:'cadence44',rl_compute:'matched42',classical:'classical',hypotheses:'hypotheses',news_attention:'news',sentiment:'sentiment',sentiment_transfer:'transfer_new24',etf_benchmarks:'contenders',ira_comparison:'ira100',ira_transfer:'ira_new24',ira_simple_controls:'simplecash',ira_execution_cadence:'execution'};if(destinations[study.id]){const compare=document.createElement('button');compare.textContent='Compare portfolios';compare.setAttribute('aria-label','Compare portfolios: '+study.title);compare.onclick=()=>{const selector=document.getElementById('comparison');selector.value=destinations[study.id];selector.dispatchEvent(new Event('change'));document.querySelector('nav button').click();window.scrollTo({top:0,behavior:'smooth'})};card.append(compare);}const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Reproduction details';details.append(summary);const command=document.createElement('pre');command.style.whiteSpace='pre-wrap';command.textContent='data_refresh\\.venv\\Scripts\\python.exe scripts/run_experiment.py '+study.id+' --rerun';details.append(command);const note=document.createElement('p');note.textContent='Requires the local input snapshots and dependencies. Re-running consumes compute and replaces the current report; a timestamped manifest and report copy are retained. Existing historical results were not retroactively assigned a producing commit.';details.append(note);card.append(details);index.append(card)}}
if(report.ira_signal_challenge){heading('Does company-specific sentiment explain the candidate?');note('Exact original reproduction, three fixed issuer permutations and a price-only reversal control. All use the same frozen decision schedule, daily execution and 2% band. One shuffled control exceeds the original return with a deeper drawdown. Three permutations are a small diagnostic sample, not a significance test or a strategy-selection pool.');table(['Control','Annual growth','Drawdown','Orders'],report.ira_signal_challenge.tests.map(x=>[x.name,pct(x.metrics.cagr),pct(x.metrics.max_drawdown),x.orders]));}
if(report.ira_simple_interest){heading('IRA cash-interest sensitivity');note('Fixed ETF rules, unchanged settings, conservative settlement. These are lagged federal-funds scenarios, not historical IBKR rates. Interest accrues only on settled cash; actual monthly broker crediting is not replicated. Taxes on withdrawals remain excluded.');table(['Rule','Interest scenario','Annual growth','Drawdown','Interest credited'],report.ira_simple_interest.results.map(x=>[x.rule,x.scenario,pct(x.metrics.cagr),pct(x.metrics.max_drawdown),'$'+Number(x.interest_credited).toLocaleString('en-US',{maximumFractionDigits:0})]));}
if(report.sentiment_transfer){heading('Frozen settings on additional stocks');note('No parameters were retuned using the new-issuer outcomes. The combined set includes the original discovery stocks, so it is not an independent replication. The favorable initial sentiment result weakened on the broader opportunity set.');table(['Universe','Control','Annual growth','Realized volatility','Drawdown'],report.sentiment_transfer.tests.map(x=>[x.scope,x.name,pct(x.metrics.cagr),pct(x.realized_volatility),pct(x.metrics.max_drawdown)]));}
if(report.sentiment_study){const r=report.sentiment_study;note(r.action_snapshot==='alpaca_actions_20260911'?'Sentiment results use the corrected processing-date corporate-action snapshot.':'Sentiment results await the corrected corporate-action rerun.');heading('A financial-language model that predates the test period');note('FinBERT uses a verified December 2020 checkpoint and 16,000 single-stock headlines from 2021 onward. Scores wait at least 24 hours after the last eligible article revision. The first validation begins April 2021; test portfolios start in 2022. This is still a retrospective archive study.');table(['Rule','Annual growth','Drawdown','Growth at 25 bps cost','Growth with extra delay','Reversal without sentiment filter'],r.results.map(x=>[x.family,pct(x.metrics.cagr),pct(x.metrics.max_drawdown),pct(x.high_cost_metrics.cagr),pct(x.extra_delay_metrics.cagr),x.matched_price_control?pct(x.matched_price_control.metrics.cagr):'—']));}
if(report.sentiment_robustness){heading('Sentiment falsification and exposure controls');note('The selected schedule stays fixed. Issuer permutations move sentiment histories to different companies; random baskets remove ranking or polarity. These are exploratory controls, not independent confirmations.');table(['Control','Annual growth','Realized volatility','Drawdown'],report.sentiment_robustness.tests.map(x=>[x.name,pct(x.metrics.cagr),pct(x.realized_volatility),pct(x.metrics.max_drawdown)]));}
if(report.reversal_robustness){heading('Try to disprove the stronger stock-reversal result');note('The original schedule is frozen. Random baskets of recent losers often match or beat ranking the largest losers; fixed weekly/monthly schedules are weaker. Paired uncertainty intervals versus equal weighting span zero. This remains a candidate, not established alpha.');table(['Control','Annual growth','Drawdown'],report.reversal_robustness.tests.map(x=>[x.name,pct(x.metrics.cagr),pct(x.metrics.max_drawdown)]));}
if(report.news_attention){const r=report.news_attention;note(r.action_snapshot==='alpaca_actions_20260911'?'News-attention results use the corrected corporate-action snapshot.':'News-attention results await the corrected corporate-action rerun.');heading('Does news attention add anything beyond prices?');note('A retrospective test of unusually frequent company news, with publication revisions delayed and broad roundups discounted. Each family selects settings from the preceding year. Attention measures coverage rather than sentiment. Continuous curves are on Overview.');table(['Rule','Annual growth','Drawdown','Same-schedule price-only growth','Growth at 25 bps cost','Growth with extra news delay'],r.results.map(x=>[x.family,pct(x.metrics.cagr),pct(x.metrics.max_drawdown),pct(x.matched_price_control_metrics.cagr),pct(x.high_cost_metrics.cagr),pct(x.extra_delay_metrics.cagr)]));note(r.data_audit.unique_articles.toLocaleString()+' unique archived articles; '+r.data_audit.stale_revisions_quarantined.toLocaleString()+' quarantined because the last revision occurred more than seven days after publication. Current vendor tags are not certified historical observations.');const details=document.createElement('details');const label=document.createElement('summary');label.textContent='Weighted news coverage by year';details.append(label);const coverage=Object.entries(r.coverage_weighted_articles_by_year),symbols=coverage.length?Object.keys(coverage[0][1]):[];table(['Year',...symbols],coverage.map(([year,values])=>[year,...symbols.map(s=>values[s].toFixed(1))]));details.append(section.lastElementChild);section.append(details);}
if(report.news_probe){heading('Historical news access verified');note('The existing Alpaca account returned '+report.news_probe.samples.reduce((n,x)=>n+x.articles,0)+' articles across two small 2019/2026 samples. Publication and revision timestamps are checked; raw text stays in local files. This is a data-access test, not a sentiment strategy result.');}
if(report.risk_references){const r=report.risk_references;heading('Risk-aware references');note('Fixed volatility targets use only preceding returns and never add leverage. Realized risk below is measured afterward; it is not a guaranteed cap. Compare risk and exposure alongside return.');table(['Reference','Annual growth','Realized annual volatility','Drawdown'],r.results.map(x=>[x.name,pct(x.metrics.cagr),pct(x.realized_volatility),pct(x.metrics.max_drawdown)]));const panel=document.createElement('div');panel.className='panel';const title=document.createElement('h2');title.textContent='Original RL study: return versus realized risk';panel.append(title);const intro=document.createElement('p');intro.textContent='Separate legacy-accounting study: green points are simple risk-targeted references; blue points are RL training seeds on the original study stock universe. These points do not change with the Overview selector and are not the newer IRA results.';panel.append(intro);const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1000 360');svg.setAttribute('class','chart');svg.setAttribute('role','img');svg.setAttribute('aria-label','Annual growth versus realized volatility for references and RL seeds');const points=[...r.results.map(x=>({...x,color:'#7ad5c1'})),...r.rl_comparisons.map(x=>({...x,color:'#94b8e5'}))];const maxX=Math.max(...points.map(x=>x.realized_volatility))*1.15,maxY=Math.max(...points.map(x=>x.metrics.cagr))*1.15;function textAt(x,y,text){const t=document.createElementNS(ns,'text');t.setAttribute('x',x);t.setAttribute('y',y);t.setAttribute('fill','#9ba9b9');t.setAttribute('font-size','12');t.textContent=text;svg.append(t)}for(let j=0;j<5;j++){const x=65+j*850/4,y=290-j*245/4;const line=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1:65,x2:915,y1:y,y2:y,stroke:'#2b3440'}))line.setAttribute(k,v);svg.append(line);textAt(15,y+4,pct(maxY*j/4));textAt(x-10,315,pct(maxX*j/4));}textAt(370,345,'Realized annual volatility');textAt(65,22,'Annual growth');for(const point of points){const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',65+850*point.realized_volatility/maxX);dot.setAttribute('cy',290-245*point.metrics.cagr/maxY);dot.setAttribute('r',point.color==='#7ad5c1'?7:5);dot.setAttribute('fill',point.color);const label=document.createElementNS(ns,'title');label.textContent=point.name+': growth '+pct(point.metrics.cagr)+', volatility '+pct(point.realized_volatility);dot.append(label);svg.append(dot);}panel.append(svg);section.append(panel);}
if(report.backfill_sample_audit){const a=report.backfill_sample_audit;note('Independent backfill sample: '+a.rows_checked.toLocaleString()+' rows across '+a.sampled_batches+' completed chunks; '+a.invalid_bars+' invalid bars, '+a.duplicate_keys+' duplicate keys, '+a.off_calendar_rows+' off-calendar rows. This was the preliminary sample; the full audit status is shown separately.');}
if(report.rl_cadence_matched){heading('Separate newer data from more computation');note('Training work accrues per elapsed trading session. Annual and monthly models spend that budget when they retrain; daily models spend it each day. Unspent work after the last update remains unused. This helps distinguish timing from total computation.');table(['Retraining','Seed','Status','Annual growth','Drawdown','Update training steps'],report.rl_cadence_matched.results.filter(x=>x.metrics).map(x=>[x.cadence,x.seed,x.status,pct(x.metrics.cagr),pct(x.metrics.max_drawdown),x.total_update_steps.toLocaleString()]));}
if(report.minute_2026_audit){const a=report.minute_2026_audit;heading('2026 minute refresh complete');note(a.rows.toLocaleString()+' additional raw minute bars, '+a.symbols_available+' available labels. Invalid bars: '+a.invalid_bars+'; duplicate keys: '+a.duplicate_keys+'; off-calendar bars: '+a.off_calendar_rows+'.');}
if(report.historical_backfill){const b=report.historical_backfill;note('Older minute backfill '+b.start+' to '+b.end+': '+b.status+' · '+b.completed_jobs+' batches · '+b.rows_downloaded.toLocaleString()+' downloaded bars. This is a dashboard snapshot; the local manifest has live progress.');}
heading('Read these results as experiments, not forecasts');
if(report.cash_sensitivity){heading('Does earning interest on idle cash change the answer?');note('These are cash-interest sensitivity scenarios, not historical broker statements. The threshold proxy excludes the first $10,000, applies a spread and reduces rates below $100,000 NAV. Parameters stay frozen from the zero-interest study; taxes and settlement timing are not modeled.');table(['Cash assumption','Strategy','Annual growth','Drawdown','Interest credited'],report.cash_sensitivity.results.map(x=>[x.scenario,x.family,pct(x.metrics.cagr),pct(x.metrics.max_drawdown),'$'+Math.round(x.interest_credited).toLocaleString()]));}
if(report.rl_cadence?.status==='complete'&&report.rl_cadence_replication?.status==='complete'){heading('Retraining: judge the spread, not the best seed');const rows=[...report.rl_cadence.results,...report.rl_cadence_replication.results];table(['Update schedule','Seeds','Mean annual growth across seeds','Lowest','Highest'],['monthly','daily'].map(name=>{const v=rows.filter(x=>x.cadence===name).map(x=>x.metrics.cagr);return [name,v.length,pct(v.reduce((a,b)=>a+b,0)/v.length),pct(Math.min(...v)),pct(Math.max(...v))]}));note('These are averages of separate historical training runs, not returns of an ensemble portfolio. Daily and monthly mean growth are similar here, with a much wider range for daily updates.');}
if(report.intraday_peer_test){heading('Intraday peer transmission: five-minute forecast diagnostic');note('A complete five-minute bar is observed, followed by a one-minute delay before a five-minute forward label. Each month selects the ridge setting from the previous month and refits using completed history. No overnight returns or forward-filled prices. This is a prediction test, not a portfolio backtest.');table(['Test month','Model','Rank correlation','Error / zero forecast error','Gross selected return (bps)','After 10 bps cost hurdle'],report.intraday_peer_test.folds.flatMap(f=>f.models.map(x=>[f.month,x.name,num(x.metrics.mean_cross_sectional_rank_ic),(x.metrics.mse/x.metrics.zero_mse).toFixed(6),num(x.metrics.top_positive_mean_raw_return_bps),num(x.metrics.top_positive_mean_raw_return_after_10bps)])));note('Higher rank correlation is better; error below 1 beats a zero forecast. The cost hurdle subtracts an illustrative round-trip spread/slippage cost, before commissions. It is not an executable strategy return. Correlated-peer features did not improve the ranking signal in these months.');}
note('Return is the portfolio gain during the stated period; annual growth compounds that gain per year. Drawdown is the worst fall from a prior peak. Sharpe compares average daily return with its volatility, using a zero cash rate. Higher return can come with higher risk. All simulations include modeled trading costs; taxes are not deducted.');
if(report.rl_cadence){const r=report.rl_cadence;heading('How often should the agent learn again?');note('Every version can trade each day. Daily, weekly, monthly and annual refer to policy retraining, not trade frequency. They start from the same pre-2022 model, then learn from the last 252 completed sessions. Market factors stay frozen to keep their meaning stable. Each update gets the same small training budget, so daily retraining uses more total computation.');table(['Retraining','Seed','Progress','Annual growth','Drawdown','Sharpe','Updates','Training minutes'],r.results.filter(x=>x.metrics).map(x=>[x.cadence,x.seed,x.status,pct(x.metrics.cagr),pct(x.metrics.max_drawdown),num(x.metrics.sharpe_zero_cash_rate),(x.update_count??x.updates?.length??0),(x.training_seconds/60).toFixed(1)]));note('Continuous curves are on Overview under Portfolio comparison. Partial runs are not full-period comparisons.');}
if(report.rl_walk_forward){const r=report.rl_walk_forward;heading('Annual nested walk-forward RL');note(r.protocol+' Expanding uses all available training history; rolling3 uses the most recent three years when available. Seed numbers repeat training with different randomness.');for(const m of r.modes){heading(m.mode==='expanding'?'Expanding training history':'Rolling three-year training history');table(['Trade year','Fit candidates through','Choose using','Selected dimensions','Selected return window'],m.folds.map(f=>[f.year,f.dates.inner_end,f.dates.validation_start.slice(0,4),f.selected?.dimensions??'pending',f.selected?.window??'pending']));table(['Seed','Annual growth','Drawdown','Sharpe'],m.results.map(x=>[x.seed,pct(x.metrics.cagr),pct(x.metrics.max_drawdown),num(x.metrics.sharpe_zero_cash_rate)]));}note('Early folds have less history. This is retrospective walk-forward: the universe and data revisions are not point-in-time certified.');}
if(report.classical_frequency){heading('Revisit the stronger conventional ideas');note('Momentum, mean reversion and volatility control were tested again with 1/5/21-session decisions and optional 2% minimum trade adjustments. Each year chooses among 12 settings using only the prior year. The continuous curves are on Overview.');table(['Strategy','Annual growth','Drawdown','Sharpe','Annual growth at 25 bps slippage'],report.classical_frequency.results.map(x=>[x.family,pct(x.metrics.cagr),pct(x.metrics.max_drawdown),num(x.metrics.sharpe_zero_cash_rate),pct(x.high_cost_metrics.cagr)]));}
if(report.shock_robustness){heading('Peer-shock falsification checks');note('Random peers sometimes outperform the original correlation network. Removing individual stocks changes the result materially. The paired block-bootstrap interval versus equal weighting includes zero. This weakens the network-specific explanation.');table(['Control','Annual growth','Drawdown','Sharpe'],report.shock_robustness.tests.map(x=>[x.name,pct(x.metrics.cagr),pct(x.metrics.max_drawdown),num(x.metrics.sharpe_zero_cash_rate)]));}
if(report.rl_cadence_replication){heading('Retraining replication: additional seeds and a frozen policy');note('A frozen policy never learns again after 2021. All versions can still adjust holdings each day. The first daily-retraining results differed sharply between seeds; these additional runs check stability. Partial runs cover different periods and must not be ranked against completed runs.');table(['Policy updates','Seed','Status','Annual growth','Drawdown','Sharpe'],report.rl_cadence_replication.results.filter(x=>x.metrics).map(x=>[x.cadence,x.seed,x.status,pct(x.metrics.cagr),pct(x.metrics.max_drawdown),num(x.metrics.sharpe_zero_cash_rate)]));}
if(report.hypothesis_search){const r=report.hypothesis_search;heading('New network and adaptive hypotheses');note('Each year selects settings from the preceding year. Shock diffusion buys stocks lagging correlated peers; residual reversal buys short-term weakness after removing market exposure; breadth and correlation rules reduce exposure when the market appears fragile. These are testable proxies, not proven mechanisms.');table(['Hypothesis','Annual growth','Drawdown','Sharpe','Annual growth at higher trading cost'],r.results.map(x=>[x.family,pct(x.metrics.cagr),pct(x.metrics.max_drawdown),num(x.metrics.sharpe_zero_cash_rate),pct(x.high_cost_metrics.cagr)]));note('Base slippage is 5 basis points per side; stress slippage is 25. One basis point is 0.01%. All include a $1 commission per order. Changing costs can change future holdings and wash-sale blocks, not merely subtract a fixed fee.');}
if(report.walk_forward){heading('Rolling-year test, 2021–2026');note('Each year selects settings from the preceding year only. Holdings, costs and wash-sale state carry across year boundaries. This remains an exploratory historical study.');table(['Strategy','Annual growth','Max drawdown','Sharpe'],report.walk_forward.results.map(r=>[r.strategy,pct(r.metrics.cagr),pct(r.metrics.max_drawdown),num(r.metrics.sharpe_zero_cash_rate)]));}
heading('Earlier fixed-split experiments');
note('The following studies selected settings using 2024 validation. They remain visible as exploratory comparisons; they are not nested walk-forward RL results.');
if(report.strategy_search){const s=report.strategy_search;heading('Six strategy families');table(['Family','Validation-selected settings','2025+ annual growth','2025+ drawdown','2025+ Sharpe'],s.selected.concat(s.references).map(r=>[r.strategy,JSON.stringify(r.parameters||{}),pct(r.holdout.cagr),pct(r.holdout.max_drawdown),num(r.holdout.sharpe_zero_cash_rate)]));note(s.trials.length+' parameter configurations were evaluated. The full search is retained in the local report.');}
for(const key of ['rl_search','rl_stocks_search']){const r=report[key];if(!r)continue;heading(key==='rl_search'?'PPO: four ETFs plus cash':'PPO: twenty securities plus cash');note('State: higher-dimensional market factors, current holdings, cost basis and recent purchase/loss-sale ages. '+r.timesteps_per_trial.toLocaleString()+' training transitions per configuration.');table(['Dimensions','Return window (sessions)','2024 validation return','2024 validation Sharpe'],r.trials.map(t=>[t.dimensions,t.window,pct(t.validation.total_return),num(t.validation.sharpe_zero_cash_rate)]));if(r.selected){note('Selected on validation: '+r.selected.dimensions+' dimensions, '+r.selected.window+'-session return window.');if(r.holdout_seeds)table(['Selected-policy seed','Holdout return','Holdout max drawdown','Holdout Sharpe'],r.holdout_seeds.map(s=>[s.seed,pct(s.metrics.total_return),pct(s.metrics.max_drawdown),num(s.metrics.sharpe_zero_cash_rate)]));if(r.holdout_references)table(['Same-environment reference','Holdout return','Holdout max drawdown','Holdout Sharpe'],Object.entries(r.holdout_references).map(([name,v])=>[name,pct(v.total_return),pct(v.max_drawdown),num(v.sharpe_zero_cash_rate)]));}if(r.status!=='complete')note('This experiment is still running. Reload for newly completed trials.');}
if(report.rl_ablations){heading('Does the selected policy use the market state?');const r=report.rl_ablations;table(['Ablation','Holdout return','Holdout drawdown','Holdout Sharpe'],Object.entries(r.tests).map(([name,v])=>[name,pct(v.total_return),pct(v.max_drawdown),num(v.sharpe_zero_cash_rate)]));note(r.interpretation);table(['Slippage per side','Holdout return','Holdout Sharpe'],Object.entries(r.cost_sensitivity).map(([bps,v])=>[bps+' bps',pct(v.total_return),num(v.sharpe_zero_cash_rate)]));}
})();
