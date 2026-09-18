// Current forecast research, kept separate from archived RL behavior checks.
(async () => {
  const host = document.getElementById('visual-summary');
  if (!host) return;
  const section = document.createElement('section');
  section.id = 'forecast-pilot';
  host.prepend(section);
  const add = (tag, text, parent = section) => {
    const element = document.createElement(tag); element.textContent = text;
    parent.append(element); return element;
  };
    add('h2', 'Forecast errors and training diagnostics — not a CAGR ranking');
  try {
    const response = await fetch('forecast_pilot.json', {cache: 'no-store'});
    if (!response.ok) throw new Error('Report unavailable');
    const report = await response.json();
    add('p', `${report.symbols} securities · ${report.evaluation_points} daily decisions · January–March 2022 · 3 training passes per refit.`);
    add('p', 'The six pilot runs finished. None beat the zero-change prediction baseline on squared error. Real and shuffled relationships behaved similarly. This tests the forecasting pipeline; it is not an RL portfolio result, not a daily IRA/VOO comparison, and not a completed training-budget study.');
    const label = add('label', 'Forecast horizon: ');
    const select = document.createElement('select'); select.setAttribute('aria-label', 'Forecast horizon');
    for (const h of [1, 5, 20]) {
      const option = document.createElement('option'); option.value = h;
      option.textContent = `${h} trading session${h === 1 ? '' : 's'}`; select.append(option);
    }
    label.append(select);
    add('p', 'Prediction error relative to always predicting zero change. Lower is better; the dashed line at 1.00 is the baseline. These numbers are not returns or a comparison with SPY.', section).className = 'visual-note';
    const chart = add('div', '');
    chart.setAttribute('aria-live', 'polite');
    const names = {graph: 'Graph relationships', no_graph: 'History without graph', shuffled_edges: 'Shuffled relationships'};
    const colors = {graph: '#7ad5c1', no_graph: '#e5b276', shuffled_edges: '#b9a8e9'};
    const descriptions = {
      graph: 'A shared temporal network exchanges messages using correlations fitted only on earlier history.',
      no_graph: 'The same temporal network predicts each stock without messages from other stocks.',
      shuffled_edges: 'The graph model receives shuffled sender relationships. Similar performance would weaken the case that the actual connections help.'
    };
    function draw() {
      chart.replaceChildren();
      const rows = report.rows.filter(r => r.horizon === Number(select.value));
      const scale = Math.max(2, ...rows.map(r => r.mse_relative_to_zero));
      for (const row of rows) {
        const item = add('div', '', chart); item.style.marginBottom = '14px';
        const caption = add('div', `${names[row.arm]} · seed ${row.seed}: ${row.mse_relative_to_zero.toFixed(3)}×`, item);
        caption.title = descriptions[row.arm]; caption.style.fontSize = '14px';
        const track = add('div', '', item);
        Object.assign(track.style, {position:'relative', background:'#29323c', height:'16px', marginTop:'5px'});
        const fill = add('div', '', track);
        Object.assign(fill.style, {width:`${100*row.mse_relative_to_zero/scale}%`, height:'100%', background:colors[row.arm]});
        const reference = add('div', '', track);
        Object.assign(reference.style, {position:'absolute', left:`${100/scale}%`, top:'-4px', bottom:'-4px', borderLeft:'2px dashed #fff'});
        track.setAttribute('role', 'img');
        track.setAttribute('aria-label', `${names[row.arm]}, seed ${row.seed}: ${row.mse_relative_to_zero.toFixed(3)} times baseline error`);
      }
    }
    select.addEventListener('change', draw); draw();
    add('p', 'Why keep the short pilot? It verifies causal refitting, saved checkpoints and the stock-by-horizon interface. The training-set audit also found that the short-horizon heads had not beaten a constant training-mean forecast. The separate longer-training comparison above examines this using earlier validation dates.').className='visual-note';
    const flow = add('div', ''); flow.className = 'visual-grid';
    for (const [title, body] of [
      ['1 · Observe', 'Completed price histories and dated relationships. Missing or stale information stays marked unavailable.'],
      ['2 · Forecast', 'One row per stock; columns predict fractional returns over 1, 5 and 20 sessions.'],
      ['3 · Decide', 'The RL policy receives forecasts alongside market and account state. It can Hold or propose an explicit order.'],
      ['4 · Account', 'Execution, commissions, settlement and taxable/IRA accounting determine economic reward.']]) {
      const panel = add('div', '', flow); panel.className='visual-panel';
      add('h3', title, panel); add('p', body, panel);
    }
    const details = add('details', ''); add('summary', 'Scope and limitations', details);
    for (const text of report.limitations) add('p', text, details).className = 'visual-note';
    add('p', `Run ${report.run_id}. Earlier synthetic RL checks remain on the environment page.`).className='visual-note';
  } catch (error) {
    add('p', 'The current forecast report is unavailable. Training diagnostics below are still shown when published.');
  }

  try {
    const response = await fetch('learning.json', {cache: 'no-store'});
    if (!response.ok) throw new Error('No training telemetry');
    const report = await response.json();
    const learn = document.createElement('section');
    learn.id = 'overview-learning';
    host.append(learn);
    const addL = (tag, text, parent = learn) => {
      const element = document.createElement(tag); element.textContent = text;
      parent.append(element); return element;
    };
    addL('h2', 'Training diagnostics (KL, value, clip) — not market returns');
    const age = report.updated_at ? (Date.now() - Date.parse(report.updated_at)) / 1000 : null;
    addL('p',
      (report.status || 'unknown') + ' · ' + (report.run_id || 'unidentified run') +
      (report.updated_at ? ' · updated ' + report.updated_at : '') +
      (report.status === 'running' && age > 120 ? ' · telemetry is stale; the process may be stopped' : '') +
      '. This is training/test telemetry, distinct from the published portfolio reports above.');
    const run = (report.runs || [])[0];
    if (!run || !Array.isArray(run.diagnostics) || !run.diagnostics.length) {
      addL('p', 'No completed training updates are in this telemetry file.');
    } else {
      addL('p', 'Seed ' + run.seed + ' · ' + (run.steps || 0).toLocaleString() + ' steps. Compare seeds on the learning monitor rather than picking the best curve.');
      const grid = addL('div', '');
      grid.className = 'visual-grid';
      const series = [
        ['train/approx_kl', 'Policy KL', 'How much the policy distribution moved this update. Spikes are abrupt changes, not extra return.'],
        ['train/value_loss', 'Value loss', 'Value-network prediction error. Lower is not proof of better investing.'],
        ['train/explained_variance', 'Value explained variance', 'Fit to rollout return targets. Near 1 is stronger; negative is worse than a constant.'],
        ['train/clip_fraction', 'Clip fraction', 'Share of PPO ratios outside the clip range. A diagnostic, not a performance score.'],
      ];
      for (const [key, title, help] of series) {
        const card = addL('div', '', grid);
        card.className = 'visual-panel';
        const heading = addL('h3', title, card);
        heading.title = help;
        const points = run.diagnostics.filter(r => Number.isFinite(r[key]));
        if (points.length < 2) {
          addL('p', 'Waiting for completed training updates.', card).className = 'visual-note';
          continue;
        }
        let lo = Math.min(...points.map(r => r[key])), hi = Math.max(...points.map(r => r[key]));
        const range = hi - lo || 1, max = points.at(-1).steps || 1;
        const path = points.map((r, i) => (i ? 'L' : 'M') + (45 + 510 * r.steps / max).toFixed(1) + ',' + (140 - 110 * (r[key] - lo) / range).toFixed(1)).join(' ');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 580 180');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', title + ' by training steps');
        svg.innerHTML = `<path d="M45 20V145H560" stroke="#64748b" fill="none"/><path d="${path}" stroke="#7ad5c1" stroke-width="2" fill="none"/>`;
        card.append(svg);
        addL('p', 'Latest: ' + points.at(-1)[key].toPrecision(4) + ' · ' + help, card).className = 'visual-note';
      }
      const link = document.createElement('p');
      const a = document.createElement('a');
      a.href = 'learning.html';
      a.textContent = 'Full PPO learning monitor (all seeds, checkpoints, blocked orders)';
      link.append(a);
      learn.append(link);
    }
  } catch (error) {
    const note = document.createElement('p');
    note.textContent = 'Training telemetry is not published on this dashboard snapshot.';
    note.className = 'visual-note';
    host.append(note);
  }
})();
