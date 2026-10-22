// Day 3 virtual workbook engine: shared helpers. Everything reads data/<unit>.json.
const WB={};
WB.qs=new URLSearchParams(location.search);WB.unit=WB.qs.get('unit')||'basic_a_u06';WB.test=WB.qs.get('test')==='1';
WB.steps=[['match','Matching Columns','🔗'],['map','Map Quiz','🗺️'],['odd','Odd One Out','🤔'],['search','Word Search','🔍'],['hangman','Hangman (Snowman)','⛄'],['cross','Crossword','✏️'],['unscramble','Unscramble Words','🧩'],['dialogue','Complete the Dialogue','💬'],['climb','Mountain Quiz (Final Test)','🏔️']];
WB.key=()=> 'mrj_day3_'+WB.unit;
WB.prog=()=>{try{return JSON.parse(localStorage.getItem(WB.key()))||{}}catch(e){return{}}};
WB.save=(id,pct,right,n)=>{const p=WB.prog();const old=p[id];const pass=id!=='climb'||pct>=(WB.D.passPercent||80);
 if(!old||pct>=old.pct)p[id]={pct,right,n,pass:pass||(old&&old.pass),at:Date.now()};else if(pass)p[id].pass=true;localStorage.setItem(WB.key(),JSON.stringify(p))};
WB.done=id=>{const r=WB.prog()[id];return !!(r&&r.pass)};
WB.unlocked=id=>{if(WB.test)return true;const i=WB.steps.findIndex(s=>s[0]===id);return i<=0||WB.done(WB.steps[i-1][0])};
WB.link=(page,extra)=>page+'?unit='+encodeURIComponent(WB.unit)+(WB.test?'&test=1':'')+(extra||'');
WB.load=()=>fetch('data/'+WB.unit+'.json').then(r=>{if(!r.ok)throw Error('No unit '+WB.unit);return r.json()}).then(d=>WB.D=d);
WB.sh=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(v=>v[1]);
let _cur=null;
WB.play=src=>new Promise(res=>{try{if(_cur)_cur.pause();const a=new Audio(src);_cur=a;a.onended=res;a.onerror=res;a.play().catch(()=>res())}catch(e){res()}});
WB.seq=async list=>{for(const s of list){await WB.play(s);await new Promise(r=>setTimeout(r,250))}};
WB.line=k=>WB.play(WB.D.lineAudio+WB.D.lines[k]);
WB.all=()=>[...WB.D.words,...(WB.D.extras||[])];
WB.w=id=>WB.all().find(w=>w.id===id);
WB.end=(id,right,n)=>{const pct=n?Math.round(right/n*100):0;WB.save(id,pct,right,n);
 const i=WB.steps.findIndex(s=>s[0]===id),nx=WB.steps[i+1];
 document.getElementById('app').innerHTML=`<div class="card"><h1>${WB.steps[i][2]} ${WB.steps[i][1]}</h1><p class="pct">${pct}%</p><div style="font-size:28px">${right} / ${n} right</div>
 <div class="p">⭐ Well done! You finished!</div><p><button onclick="location.reload()">🔁 Again</button> <button onclick="location.href=WB.link('index.html')">🏠 Steps</button>
 ${nx?`<button class="ok" onclick="location.href=WB.link('${nx[0]==='climb'?'climb.html':'play.html'}','${nx[0]==='climb'?'':'&a='+nx[0]}')">Next ▶</button>`:''}</p></div>`;WB.line('done')};
WB.skipBtn=fn=>{if(!WB.test)return;let b=document.querySelector('.skip');if(!b){b=document.createElement('button');b.className='skip';b.textContent='TEST: skip ✓';document.body.appendChild(b)}b.onclick=fn};
