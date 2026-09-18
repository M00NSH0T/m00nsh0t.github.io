// Fixed supervised training budgets, displayed separately from portfolio rewards.
(async () => {
  const host = document.getElementById('visual-summary');
  if (!host) return;
  const response = await fetch('forecast_curves.json', {cache:'no-store'}).catch(() => null);
  if (!response || !response.ok) return;
  const report = await response.json();
  const section = document.createElement('section'); section.id='forecast-curves'; host.prepend(section);
  const add = (tag, text, parent=section) => {
    const el=document.createElement(tag); el.textContent=text; parent.append(el); return el;
  };
  const progress=add('div','');
  async function updateProgress() {
    const statusResponse=await fetch('forecast_replication_status.json',{cache:'no-store'}).catch(()=>null);
    if(!statusResponse || !statusResponse.ok) return;
    const status=await statusResponse.json(); progress.replaceChildren();
    add('h2',status.comparison?'Completed: forecasting across four market years':'Next check: does the finding survive other market periods?',progress);
    if(status.quality_review) add('p',status.quality_review.summary,progress).style.color='#ffbe76';
    add('p',`${status.symbols} stocks · ${status.prediction_dates} daily forecast dates · ${status.first_month} through ${status.last_month}. Six neural runs use two seeds and monthly refitting; a separate job builds the ridge and constant controls. These are forecasts, not simulated portfolio returns.`,progress);
    const names={graph:'Graph',no_graph:'Without graph',shuffled_edges:'Shuffled graph',controls:'Ridge and constants'};
    for(const job of status.jobs) {
      const line=add('div',`${names[job.arm]}${job.seed?' · seed '+job.seed:''}: ${job.completed_fits}/${job.total_fits} monthly fits · ${job.status}`,progress);
      line.style.marginBottom='8px'; line.style.fontSize='14px';
      const bar=document.createElement('progress'); bar.max=job.total_fits; bar.value=job.completed_fits;
      bar.setAttribute('aria-label',line.textContent); bar.style.width='100%'; line.append(bar);
    }
    if(status.comparison) {
      add('p','All planned comparisons have finished. Below is forecast error relative to predicting no price change: 100% matches that reference; lower is better. These are not portfolio returns.',progress);
      for(const arm of ['graph','no_graph','shuffled_edges']) {
        for(const seed of [...new Set(status.comparison.rows.filter(r=>r.arm===arm).map(r=>r.seed))]) {
          const rows=status.comparison.rows.filter(r=>r.arm===arm&&r.seed===seed).sort((a,b)=>a.horizon-b.horizon);
          add('p',`${names[arm]} · seed ${seed}: ${rows.map(r=>`${r.horizon}-session ${(r.mse_relative_to_zero*100).toFixed(1)}%`).join(' · ')}`,progress);
        }
      }
      add('p',`${status.comparison.excluded_cells.toLocaleString()} unavailable stock/date/horizon cells excluded from every arm. Lower error than shuffled relationships alone is insufficient: compare against the model without graph messages and the constant references.`,progress).className='visual-note';
    }
    add('p',`Progress last collected ${new Date(status.collected_at).toLocaleString()}. Previously inspected years remain developmental evidence.`,progress).className='visual-note';
  }
  updateProgress().catch(()=>{}); setInterval(()=>updateProgress().catch(()=>{}),30000);
  add('h2', 'Does more training help the forecasts?');
  add('p', `${report.completed_runs}/${report.planned_runs} fixed-budget runs completed · ${report.symbols} stocks · ${report.train_samples} training dates · ${report.val_samples} validation dates in July–September 2021.`);
  if (report.budget_check) {
    const b=report.budget_check;
    add('p', `From ${b.from_epoch} to ${b.to_epoch} training passes, training error improved in ${b.training_error_improved}/${b.comparisons} comparisons, while validation error worsened in ${b.validation_error_worsened}/${b.comparisons}. More fitting mostly helped explain the past rather than the later period. These comparisons share data and are not independent statistical tests.`);
  }
  add('p', 'These curves separate memorizing earlier history from predicting later history. Dashed lines measure training error; solid lines measure validation error. Lower is better. A value of 1 matches a constant forecast estimated only from training history. This is prediction accuracy, not investment return.');
  function choose(caption, choices) {
    const label=add('label', caption+' '); label.style.marginRight='20px';
    const control=document.createElement('select'); control.setAttribute('aria-label',caption);
    for (const [value,name] of choices) {
      const option=document.createElement('option'); option.value=value; option.textContent=name; control.append(option);
    }
    label.append(control); return control;
  }
  const arm=choose('Model', [['graph','Graph relationships'],['no_graph','History without graph'],['shuffled_edges','Shuffled relationships']]);
  const mode=choose('Target scaling', [['standardized','Each horizon standardized'],['raw','Original fractional returns']]);
  const horizon=choose('Horizon', report.horizons.map(h=>[h,`${h} sessions`]));
  add('p', 'Standardization balances the supervised learning scales across horizons using training data only. Both modes are evaluated in original return units. It does not change the trading reward.').className='visual-note';
  const chart=add('div',''); chart.setAttribute('aria-live','polite');
  const key=add('p','Teal: seed 71 · Gold: seed 72 · Dashed: training · Solid: validation.'); key.className='visual-note';
  const details=add('p','');
  function draw() {
    chart.replaceChildren();
    const selected=report.runs.filter(r=>r.arm===arm.value && r.target_mode===mode.value && r.status==='complete');
    if (!selected.length) { add('p','This comparison has not completed yet.',chart); details.textContent=''; return; }
    const k=report.horizons.indexOf(Number(horizon.value));
    const lines=[];
    for (const r of selected) for (const split of ['train','val']) {
      const baseline=r.metrics[`train_mean_baseline_${split}_mse`][k];
      const points=r.metrics.checkpoints.map((epoch,i)=>({epoch,mse:r.metrics[`${split}_mse`][i][k],
        ratio:r.metrics[`${split}_mse`][i][k]/baseline})).filter(p=>Number.isFinite(p.ratio)&&p.ratio>0&&p.mse!==null);
      lines.push({seed:r.seed,split,points});
    }
    const values=lines.flatMap(l=>l.points.map(p=>p.ratio));
    if (!values.length) { add('p','No finite error measurements available.',chart); return; }
    const low=Math.min(.5,...values)*.9, high=Math.max(2,...values)*1.1;
    const logLow=Math.log(low), logHigh=Math.log(high);
    const x=e=>65+e/64*690, y=v=>220-(Math.log(v)-logLow)/(logHigh-logLow)*190;
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg'); svg.setAttribute('viewBox','0 0 800 275');
    svg.style.width='100%'; svg.style.maxHeight='360px'; svg.setAttribute('role','img');
    svg.setAttribute('aria-label','Training and validation prediction error across 0 to 64 training passes; logarithmic vertical scale');
    chart.append(svg);
    function shape(tag,attrs,text) {
      const el=document.createElementNS(ns,tag);
      for (const [a,v] of Object.entries(attrs)) el.setAttribute(a,v);
      if (text!==undefined) el.textContent=text; svg.append(el); return el;
    }
    for (const tick of [.0625,.125,.25,.5,1,2,4,8,16,32,64,128,256]) if(tick>=low&&tick<=high) {
      shape('line',{x1:65,x2:755,y1:y(tick),y2:y(tick),stroke:tick===1?'#fff':'#35404b','stroke-dasharray':'4 4'});
      shape('text',{x:55,y:y(tick)+4,fill:'#b8c7d5','text-anchor':'end','font-size':12},`${tick}×`);
    }
    for(const epoch of [0,3,8,16,32,64]) shape('text',{x:x(epoch),y:245,fill:'#b8c7d5','text-anchor':'middle','font-size':12},epoch);
    shape('text',{x:405,y:270,fill:'#b8c7d5','text-anchor':'middle','font-size':12},'Completed training passes (epoch 0 is the untrained model)');
    for (const line of lines) {
      const color=line.seed===71?'#7ad5c1':'#e5b276';
      shape('polyline',{points:line.points.map(p=>`${x(p.epoch)},${y(p.ratio)}`).join(' '),fill:'none',stroke:color,
        'stroke-width':2,'stroke-dasharray':line.split==='train'?'5 4':'none'});
      for (const p of line.points) {
        const point=shape('circle',{cx:x(p.epoch),cy:y(p.ratio),r:3,fill:color});
        const title=document.createElementNS(ns,'title');
        title.textContent=`Seed ${line.seed}, ${line.split==='train'?'training':'validation'}, epoch ${p.epoch}: ${p.ratio.toFixed(3)}× baseline error`; point.append(title);
      }
    }
    details.textContent='Latest validation: '+lines.filter(l=>l.split==='val').map(l=>
      `seed ${l.seed} ${(l.points[l.points.length-1]?.ratio ?? NaN).toFixed(3)}× constant-forecast error`).join('; ')+'. The vertical scale is logarithmic so initial errors and later small changes remain visible.';
  }
  for(const control of [arm,mode,horizon]) control.addEventListener('change',draw); draw();
  add('p','If training error falls while validation error rises, additional fitting is not helping generalization. Compare both seeds and the shuffled-relationship control; one favorable curve is not evidence of alpha. Earlier 2021 data are also development evidence, not a restored untouched holdout.').className='visual-note';
})();
