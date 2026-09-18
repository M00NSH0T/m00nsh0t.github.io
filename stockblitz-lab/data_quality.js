(function () {
  'use strict';
  const health = document.getElementById('health');
  const overview = document.getElementById('overview');
  if (!health || !overview) return;
  const panel = document.createElement('div');
  panel.className = 'panel quality-panel';
  health.prepend(panel);
  const notice = document.createElement('div');
  notice.className = 'panel quality-notice';
  overview.prepend(notice);
  const style = document.createElement('style');
  style.textContent = '.quality-panel{margin-bottom:24px}.quality-notice{border-left:3px solid #e5b276;margin-bottom:20px;padding:14px 18px}.quality-notice p{margin:5px 0 10px}.quality-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:22px 0}.quality-tile{border:1px solid #2b3440;padding:16px;border-radius:8px}.quality-number{font-size:28px;color:#e4eaf0}.quality-track{height:14px;background:#28313c;border-radius:4px;margin:6px 0}.quality-fill{height:100%;background:#e5b276;border-radius:4px}.quality-row{margin:18px 0}.quality-label{display:flex;justify-content:space-between;gap:14px}.quality-panel details{margin-top:20px}.quality-panel summary{cursor:pointer}.quality-panel small{display:block}.quality-panel p{max-width:1000px}@media(max-width:750px){.quality-grid{grid-template-columns:1fr}}';
  style.textContent += '.quality-controls{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.quality-controls button{background:#28313c;color:#e4eaf0;border:1px solid #2b3440;border-radius:4px;padding:6px 12px;cursor:pointer;font:inherit}.quality-controls button[aria-pressed="true"]{border-color:#e5b276}.quality-chart{display:block;width:100%;max-width:800px;max-height:300px}.quality-legend{color:#8b96a3}.quality-swatch{display:inline-block;width:10px;height:10px;border-radius:2px;margin:0 6px 0 14px;vertical-align:middle}.quality-legend .quality-swatch:first-child{margin-left:0}';
  document.head.append(style);
  function text(parent, tag, value, className) {
    const element=document.createElement(tag); element.textContent=value;
    if(className) element.className=className;
    parent.append(element); return element;
  }
  const number=value=>Number(value).toLocaleString();
  const SVG_NS='http://www.w3.org/2000/svg';
  const DURATION_LABELS={quarter:'Quarterly',annual:'Annual'};
  const CONCEPT_LABELS={Revenues:'Broad revenue tag',RevenueFromContractWithCustomerExcludingAssessedTax:'Modern revenue tag'};
  function prettyLabel(entry){
    return (DURATION_LABELS[entry.duration_class]||entry.duration_class)+' / '+(CONCEPT_LABELS[entry.revenue_concept]||entry.revenue_concept);
  }
  function svg(parent,tag,attrs){
    const element=document.createElementNS(SVG_NS,tag);
    for(const key in attrs)element.setAttribute(key,String(attrs[key]));
    parent.append(element);return element;
  }
  const share=(part,whole)=>whole>0?100*part/whole:0;
  function maskNote(feature){
    const reasons=Object.keys(feature.masked_reasons).sort().map(reason=>reason+' ×'+number(feature.masked_reasons[reason]));
    let note=number(feature.valid)+' valid';
    if(reasons.length)note+=' (masked: '+reasons.join(', ')+')';
    if(feature.finite_valid_range)note+=' [finite range '+feature.finite_valid_range[0]+' to '+feature.finite_valid_range[1]+']';
    return note;
  }
  function drawProfitabilityChart(host,entry){
    text(host,'p',prettyLabel(entry)+' · cohort of '+number(entry.issuer_count)+' saved issuers.');
    const left=34,groupWidth=44,barWidth=16,base=130;
    const width=left+entry.periods.length*groupWidth+10;
    const chart=svg(host,'svg',{viewBox:'0 0 '+width+' 156','class':'quality-chart',preserveAspectRatio:'xMinYMid meet',role:'img','aria-label':'Share of attempted computations with a finite valid margin, by period, for '+prettyLabel(entry)});
    svg(chart,'title',{}).textContent='Profitability coverage by period';
    for(const mark of [0,50,100]){
      const y=base-1.1*mark;
      svg(chart,'line',{x1:left,x2:width-6,y1:y,y2:y,stroke:'#2b3440'});
      svg(chart,'text',{x:left-4,y:y+3,'text-anchor':'end',fill:'#8b96a3','font-size':9}).textContent=mark+'%';
    }
    entry.periods.forEach((period,index)=>{
      const x=left+index*groupWidth+5;
      [['net_margin','#7ad5c1','Net margin'],['operating_margin','#94b8e5','Operating margin']].forEach((spec,slot)=>{
        const feature=period.features[spec[0]];
        const percent=share(feature.valid,period.attempted);
        const bar=svg(chart,'rect',{x:x+slot*(barWidth+2),y:base-1.1*percent,width:barWidth,height:Math.max(1.1*percent,0.5),fill:spec[1]});
        svg(bar,'title',{}).textContent=period.date+' '+spec[2]+': '+number(feature.valid)+' of '+number(period.attempted)+' attempted ('+percent.toFixed(1)+'%); denominator includes '+number(period.errors)+' errors.';
      });
      svg(chart,'text',{x:x+barWidth+1,y:base+12,'text-anchor':'middle',fill:'#8b96a3','font-size':9}).textContent=period.date.slice(0,4);
    });
    const legend=document.createElement('p');legend.className='quality-legend';host.append(legend);
    [['#7ad5c1','Net margin'],['#94b8e5','Operating margin']].forEach(item=>{
      const swatch=document.createElement('span');swatch.className='quality-swatch';swatch.style.background=item[0];legend.append(swatch);
      legend.append(document.createTextNode(item[1]));
    });
    const detail=document.createElement('details');host.append(detail);
    text(detail,'summary','Exact tags, counts and masked-value reasons');
    text(detail,'p','Duration class: '+entry.duration_class+'. Revenue concept tag: '+entry.revenue_concept+'. Different revenue tags are distinct accounting concepts; their coverage counts are not interchangeable.');
    for(const period of entry.periods)
      text(detail,'p',period.date+': '+number(period.attempted)+' attempted, '+number(period.errors)+' errors. Net margin '+maskNote(period.features.net_margin)+'. Operating margin '+maskNote(period.features.operating_margin)+'.');
  }
  function renderProfitability(entries){
    text(panel,'h3','How often do saved fundamentals yield a usable margin?');
    text(panel,'p','Coverage among saved issuers; not stock-market coverage or investment performance. Bars show finite valid margins divided by attempted computations; the denominator includes computation errors. A short bar means values were masked or errored, not proven zero.');
    const available=entries.filter(entry=>entry.status==='available');
    const missing=entries.filter(entry=>entry.status==='missing');
    const invalid=entries.filter(entry=>entry.status==='invalid');
    if(missing.length)text(panel,'small','Report missing — slice unmeasured, not zero coverage: '+missing.map(entry=>entry.report).join(', ')+'.');
    if(invalid.length)text(panel,'small','Report present but failed validation and is excluded: '+invalid.map(entry=>entry.report+' ['+entry.reason+']').join(', ')+'.');
    if(!available.length){text(panel,'p','No profitability coverage reports are usable yet.');return;}
    const controls=document.createElement('div');controls.className='quality-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Choose duration class and revenue concept');panel.append(controls);
    const host=document.createElement('div');panel.append(host);
    let selected=available[0];
    const buttons=available.map(entry=>{
      const button=text(controls,'button',prettyLabel(entry));
      button.type='button';
      button.addEventListener('click',()=>{selected=entry;update();});
      return button;
    });
    function update(){
      buttons.forEach((button,index)=>button.setAttribute('aria-pressed',String(available[index]===selected)));
      host.replaceChildren();
      drawProfitabilityChart(host,selected);
    }
    update();
  }
  function show(data) {
    panel.replaceChildren(); notice.replaceChildren();
    if(data.status!=='review_required') {
      text(panel,'h2','Data audit summary unavailable');
      text(panel,'p','Saved audit reports are missing. This does not mean the data passed review.');
      text(notice,'strong','Data audit summary unavailable — no new quality certification.');
      return;
    }
    text(notice,'strong','Older-data expansion is still under review');
    text(notice,'p','Some archived forecast studies include stale prices. Historical volumes and company identities also need reconciliation before we expand training.');
    const button=text(notice,'button','See data review');
    button.onclick=()=>document.querySelector('nav button[data-tab="health"]').click();
    text(panel,'div','CURRENT DATA REVIEW','eyebrow');
    text(panel,'h2','What is holding back more historical training?');
    text(panel,'p','We have more data, but importing it is different from proving it is suitable for a backtest. These checks preserve the original files and database. They do not establish investment performance.');
    const grid=document.createElement('div'); grid.className='quality-grid'; panel.append(grid);
    const tile=(value,title,description)=>{const box=document.createElement('div');box.className='quality-tile';grid.append(box);text(box,'div',value,'quality-number');text(box,'h3',title);text(box,'p',description);};
    tile(number(data.daily.symbols_with_nonpositive_volume)+' / '+number(data.daily.symbols),'Daily histories flagged',number(data.daily.nonpositive_volume_rows)+' zero or negative-volume rows in the inspected snapshot. Some are long runs of unchanged prices. Affected forecast evidence is not cleared for promotion.');
    tile(number(data.sec.checked_fact_snapshots),'SEC fact snapshots checked',number(data.sec.precision_collisions)+' conflicting values found in the numeric-preservation audit. Historical company-to-stock joins remain disabled until dated identities are established.');
    tile('Not yet in use','Dynamic universe in training','The stock-entry and retention foundation is tested. Existing learners still use fixed universes; delisted holdings and outstanding tax claims must keep their identity.');
    if(data.fundamentals && data.fundamentals.issuer_count>0) {
      const coverage=data.fundamentals;
      text(panel,'h3','How far back do the imported fundamentals go?');
      text(panel,'p','Among '+number(coverage.issuer_count)+' selected issuers, teal shows an available assets figure; blue shows the subset with all five balance-sheet inputs in the same filing and period. These are coverage counts, not investment returns.');
      for(const period of coverage.periods) {
        const row=document.createElement('div');row.className='quality-row';panel.append(row);
        const label=document.createElement('div');label.className='quality-label';row.append(label);
        text(label,'span',period.date);text(label,'strong',number(period.issuers_with_assets)+' assets · '+number(period.same_filing_all_five)+' all five');
        const track=document.createElement('div');track.className='quality-track';track.style.position='relative';row.append(track);
        const assets=document.createElement('div');assets.className='quality-fill';assets.style.background='#7ad5c1';assets.style.width=(100*period.issuers_with_assets/coverage.issuer_count)+'%';track.append(assets);
        const complete=document.createElement('div');complete.className='quality-fill';complete.style.cssText='position:absolute;left:0;top:0;background:#94b8e5';complete.style.width=(100*period.same_filing_all_five/coverage.issuer_count)+'%';track.append(complete);
      }
      text(panel,'p','No eligible 2005 observations were found in these structured snapshots. Older filings may require separate extraction. The five inputs are assets, liabilities, current assets, current liabilities and cash/equivalents, using exact USD concepts. Missing inputs are not zero; all five are not appropriate requirements for every industry. This selected issuer cohort is not a historical market universe.');
      const latest=coverage.periods[coverage.periods.length-1];
      if(latest && latest.assets_period_older_than_550_days)text(panel,'small',number(latest.assets_period_older_than_550_days)+' issuer has an assets period more than 550 days old at the last checkpoint. Available does not necessarily mean fresh.');
    }
    if(Array.isArray(data.profitability)&&data.profitability.length)renderProfitability(data.profitability);
    text(panel,'h3','Where do the sampled volume disagreements occur?');
    text(panel,'p',(100*data.volume.boundary_share).toFixed(2)+'% of the absolute volume differences are in opening and closing minute labels. This localizes the issue; it does not prove which provider is correct or identify the underlying auction trades.');
    const labels={opening_minute:'Opening minute',closing_minute:'Closing minute',regular_interior:'Other regular-session minutes',extended_other:'Other extended-session minutes'};
    for(const bucket of data.volume.buckets) {
      const row=document.createElement('div');row.className='quality-row';panel.append(row);
      const label=document.createElement('div');label.className='quality-label';row.append(label);
      text(label,'span',labels[bucket.id]);text(label,'strong',(100*bucket.share_of_difference).toFixed(2)+'%');
      const track=document.createElement('div');track.className='quality-track';row.append(track);
      const fill=document.createElement('div');fill.className='quality-fill';fill.style.width=(100*bucket.share_of_difference)+'%';track.append(fill);
      text(row,'small',number(bucket.exact_volume_minutes)+' of '+number(bucket.matched_minutes)+' matching minute labels have identical volume.');
    }
    text(panel,'p','Bars show each bucket’s share of total absolute SQL-versus-fresh-Alpaca volume differences, not its error rate. Sample: '+data.volume.symbols.join(', ')+' on '+data.volume.days.length+' selected dates in 2018. Unmatched labels are excluded; this is not a random sample or a certification of the whole database.');
    const detail=document.createElement('details');panel.append(detail);
    text(detail,'summary','What happens next, and what is preserved?');
    text(detail,'p','Resolve dated company identities, distinguish adjusted research prices from contemporaneous execution prices, and document how boundary trades and corrections enter each source. The next dataset must carry those choices explicitly. No global volume rescaling or overwrite has been applied.');
    text(detail,'p','Modern historical responses can include later corrections. Agreement today does not establish what an agent could have observed live in 2018.');
    text(detail,'small','Summary generated '+new Date(data.generated_at).toLocaleString()+'. Audit fingerprints are retained in the local summary.');
  }
  fetch('data_quality.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw Error('unavailable');return response.json();}).then(show).catch(()=>show({status:'unavailable'}));
}());
