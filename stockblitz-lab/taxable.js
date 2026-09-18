/* Research-only taxable comparisons. Personal account artifacts are never loaded. */
function taxableLabel(row) {
  if (row.rule.endsWith('_passive_reinvested')) return row.rule.slice(0,3)+' reinvested';
  const rule={spy_vol15:'SPY volatility control',equal_four:'Equal four ETFs',momentum_252:'ETF momentum'}[row.rule]||row.rule;
  return rule+' · '+(row.cadence===63?'quarterly':'monthly')+' · '+row.leverage.toFixed(2)+'×';
}
function taxableSelected(data) {
  return (data.taxable_low_turnover?.results||[]).filter(r=>r.status==='complete' && (r.rule.endsWith('_passive_reinvested')||(r.rule==='spy_vol15'&&r.cadence===63)));
}
function taxableRuns(data) {
  return taxableSelected(data).map(r=>({strategy:taxableLabel(r),starting_equity:400000,
    start:r.curve[0].date,end:r.curve.at(-1).date,curve:r.curve,
    metrics:{...r.metrics,orders:r.orders,commissions:r.commissions,slippage_cost:r.slippage_cost}}));
}
function taxableExplanation(label) {
  if (!label.startsWith('SPY volatility control')) return null;
  return 'Uses the previous 60 completed daily returns to scale SPY toward 15% annual volatility, then applies the displayed exposure multiplier. Reconsiders every 63 trading sessions and skips changes smaller than 5% of equity. A 1.10× multiplier can borrow, but does not mean constant 110% stock exposure. Borrowing expense is deducted; no personal taxes are deducted. This is a fixed research rule, not a trained model or guaranteed volatility level.';
}
function renderTaxableDetails(data, choice) {
  const panel=document.getElementById('taxable-details');panel.replaceChildren();
  panel.hidden=choice!=='taxable';if(panel.hidden)return;
  const heading=document.createElement('h3');heading.textContent='Trading burden and borrowing';panel.append(heading);
  const note=document.createElement('p');note.textContent='The chart highlights the quarterly volatility-rule sensitivity alongside both passive benchmarks. These are research comparisons, not selected winners. Financing below is already deducted from the chart returns; do not subtract it again. Orders count executed buys and sells. Each ETF counts as one owned security; its underlying companies are not direct holdings.';panel.append(note);
  function table(headers,rows){const t=document.createElement('table');const h=t.insertRow();for(const label of headers){const cell=document.createElement('th');cell.textContent=label;h.append(cell);}for(const values of rows){const tr=t.insertRow();for(const value of values)tr.insertCell().textContent=String(value);}const wrap=document.createElement('div');wrap.className='overflow';wrap.append(t);return wrap;}
  const money=v=>'$'+Number(v).toLocaleString('en-US',{maximumFractionDigits:0});
  if(data.taxable_early_period?.status==='complete'){
    const warning=document.createElement('p');warning.className='note';warning.textContent='Earlier-period check: the quarterly rule did not protect reliably in 2020–2021. At 1.10× it returned 13.41% annualized with a 36.83% drawdown, versus VOO at 23.88% and 33.97%. The smaller drawdown in the later chart did not generalize. This earlier test was run after inspecting later years; no settings were changed.';panel.append(warning);
    const earlier=document.createElement('details');const label=document.createElement('summary');label.textContent='Frozen rules in January 2020–December 2021';earlier.append(label);
    earlier.append(table(['Portfolio','Annual growth','Worst drawdown','Orders'],data.taxable_early_period.results.map(r=>[taxableLabel(r),r.metrics?(100*r.metrics.cagr).toFixed(2)+'%':r.status,r.metrics?(100*r.metrics.max_drawdown).toFixed(2)+'%':'Incomplete',r.orders])));panel.append(earlier);
  }
  panel.append(table(['Portfolio','Securities owned','Financing paid','Largest loan','Rejected attempts'],taxableSelected(data).map(r=>[taxableLabel(r),r.distinct_symbols,money(r.financing_expense),money(r.maximum_debt),r.blocked_orders])));
  const annual=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Orders and turnover by year';annual.append(summary);
  const definition=document.createElement('p');definition.textContent='Gross turnover is total bought plus sold, divided by average daily portfolio value. It includes the first investment; it is not the percentage of stocks replaced. 2026 ends September 9.';annual.append(definition);
  const rows=[];for(const r of taxableSelected(data))for(const y of r.annual)rows.push([taxableLabel(r),y.year+(y.partial_year?' (partial)':''),y.executions,y.distinct_symbols,(100*y.gross_turnover).toFixed(1)+'%']);
  annual.append(table(['Portfolio','Year','Orders','Securities owned','Gross turnover'],rows));panel.append(annual);
  const all=document.createElement('details');const allSummary=document.createElement('summary');allSummary.textContent='All 20 fixed scenarios, including weaker results';all.append(allSummary);
  all.append(table(['Rule','Annual growth','Worst drawdown','Orders','Financing paid'],(data.taxable_low_turnover?.results||[]).map(r=>[taxableLabel(r),r.metrics?(100*r.metrics.cagr).toFixed(2)+'%':r.status,r.metrics?(100*r.metrics.max_drawdown).toFixed(2)+'%':'Incomplete',r.orders,money(r.financing_expense)])));panel.append(all);
  if(data.taxable_cost_stress?.status==='complete'){
    const stress=document.createElement('details');const title=document.createElement('summary');title.textContent='What if borrowing and trading cost more?';stress.append(title);
    const note=document.createElement('p');note.textContent='The original curves reproduced exactly. Borrowing stress adds 2 percentage points to the rate; combined stress also raises slippage from 5 to 25 basis points. VOO and SPY receive the same higher trading cost. These are fixed sensitivities, not forecasts of broker charges.';stress.append(note);
    const labels={base_repeat:'Original repeated',higher_borrowing:'Higher borrowing',higher_borrowing_and_execution:'Higher borrowing + trading',higher_execution:'Higher trading'};
    stress.append(table(['Portfolio','Cost assumption','Annual growth','Worst drawdown','Orders'],data.taxable_cost_stress.results.map(r=>[taxableLabel({...r,cadence:63}),labels[r.scenario],r.metrics?(100*r.metrics.cagr).toFixed(2)+'%':r.status,r.metrics?(100*r.metrics.max_drawdown).toFixed(2)+'%':'Incomplete',r.orders])));panel.append(stress);
  }
}
