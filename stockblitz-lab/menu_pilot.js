(function () {
  'use strict';
  const host=document.getElementById('menu-pilot'); if(!host)return;
  const colors=['#7ad5c1','#bb9ee8','#e5b276','#94b8e5'];
  const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
  const pct=x=>(100*x).toFixed(2)+'%';
  fetch('menu_pilot.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('not yet published');return r.json();}).then(data=>{
    host.className='panel';
    host.append(make('h2','Separate minute-path check: did training beat an untrained menu?'));
    host.append(make('p','This is not part of the comparable daily IRA / VOO / SPY book above. Do not rank these five-minute sampled rewards against that CAGR. Every five minutes the agent can hold or choose from a short momentum menu. These policies sample learned probabilities. Choosing only the single most probable action stayed entirely in cash.'));
    host.append(make('p','Exploratory IRA simulation · '+data.start+' to '+data.end+'. Returns include modeled commissions, zero adverse slippage and no withdrawal tax. Only 22 retrospectively selected securities.'));
    const missing=make('p','VOO is unavailable for this matched minute-data cohort; SPY is shown when present. Missing VOO is a coverage gap, not permission to substitute the daily-book VOO curve.');
    missing.className='missing-bench';
    host.append(missing);
    const label=make('label','Seed distribution — compare initialization and sampling runs: '),select=make('select');
    select.setAttribute('aria-label','Menu policy experiment seed and rollout');
    data.rows.forEach((r,i)=>{const o=make('option','Model seed '+r.seed+' · sampling run '+r.rollout);o.value=i;select.append(o);});
    label.append(select);host.append(label);
    const plot=make('div'),stats=make('div');host.append(plot,stats);
    host.append(make('p','RL added value? Not robustly. Much of the return also appears without training. The learning advantage is not stable across seeds and uncertainty assumptions. Sampling runs are alternative simulated paths, not additional independent market histories. These reused dates cannot serve as untouched evidence. Not market-ready.'));
    function render(){
      const row=data.rows[Number(select.value)],entries=Object.entries(row.series);plot.replaceChildren();stats.replaceChildren();
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 900 260');svg.setAttribute('role','img');svg.setAttribute('aria-label','Cumulative portfolio returns from starting capital on the minute menu, not the daily VOO book');svg.style.width='100%';
      const values=entries.map(([,curve])=>[0,...Object.values(curve).map(v=>v/data.capital-1)]),low=Math.min(0,...values.flat()),high=Math.max(.01,...values.flat());
      for(let tick=0;tick<=4;tick++){
        const v=low+(high-low)*tick/4,y=225-(v-low)/(high-low)*205;
        const text=document.createElementNS(svg.namespaceURI,'text');text.setAttribute('x','0');text.setAttribute('y',y);text.setAttribute('fill','#9ba9b9');text.setAttribute('font-size','12');text.textContent=pct(v);svg.append(text);
      }
      entries.forEach(([name,curve],i)=>{
        const line=document.createElementNS(svg.namespaceURI,'polyline');line.setAttribute('points',values[i].map((v,j)=>(65+j/(values[i].length-1)*825)+','+(225-(v-low)/(high-low)*205)).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke',colors[i]);line.setAttribute('stroke-width','2');svg.append(line);
        let peak=data.capital,dd=0;Object.values(curve).forEach(v=>{peak=Math.max(peak,v);dd=Math.min(dd,v/peak-1);});
        const p=make('p',name+': '+pct(values[i].at(-1))+' return · '+pct(dd)+' largest decline · '+row.orders[name]+' orders');p.style.color=colors[i];stats.append(p);
      });plot.append(svg);plot.append(make('small','Beginning of evaluation → '+data.end+' · lines start at the original account capital, including entry costs. Synthetic or minute-path rewards are not ranked against daily-book CAGR.'));
    }
    select.addEventListener('change',render);render();
  }).catch(()=>{host.textContent='Latest paired menu experiment is not available yet.';});
})();
