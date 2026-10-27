// Day 3 virtual workbook engine: shared helpers. Everything reads data/<unit>.json.
const WB={};
WB.qs=new URLSearchParams(location.search);WB.unit=WB.qs.get('unit')||'basic_a_u06';WB.test=WB.qs.get('test')==='1';
WB.steps=[['match','Matching Columns','🔗'],['map','Map Quiz','🗺️'],['odd','Odd One Out','🤔'],['search','Word Search','🔍'],['hangman','Hangman','🎈'],['cross','Crossword','✏️'],['unscramble','Unscramble Words','🧩'],['dialogue','Complete the Dialogue','💬'],['climb','Mountain Quiz (Final Test)','🏔️']];
WB.key=()=> 'mrj_day3_'+WB.unit;
WB.prog=()=>{try{return JSON.parse(localStorage.getItem(WB.key()))||{}}catch(e){return{}}};
WB.save=(id,pct,right,n)=>{const p=WB.prog();const old=p[id];const pass=pct>=(WB.D.passPercent||80);
 if(!old||pct>=old.pct)p[id]={pct,right,n,pass:pass||(old&&old.pass),at:Date.now()};else if(pass)p[id].pass=true;localStorage.setItem(WB.key(),JSON.stringify(p))};
WB.done=id=>{const r=WB.prog()[id];return !!(r&&r.pass)};
WB.teacher=()=>{try{return!!(window.MRJTeacherUnlock&&window.MRJTeacherUnlock.isUnlocked())}catch(e){return false}};
WB.unlocked=id=>{if(WB.test||WB.teacher())return true;const i=WB.steps.findIndex(s=>s[0]===id);return i<=0||WB.done(WB.steps[i-1][0])};
WB.link=(page,extra)=>page+'?unit='+encodeURIComponent(WB.unit)+(WB.test?'&test=1':'')+(extra||'');
WB.load=()=>fetch('data/'+WB.unit+'.json').then(r=>{if(!r.ok)throw Error('No unit '+WB.unit);return r.json()}).then(d=>WB.D=d);
WB.sh=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(v=>v[1]);
let _cur=null;
// Voice picker (same voice set as Word Master / Day 2). Saved for all of Day 3.
WB.VOICES=[['us_f','Miss Harper','👩‍🏫'],['us_m','Coach Ray','🧢'],['grandma','Grandma June','👵'],['grandpa','Grandpa Walt','👴'],['robot','Robot','🤖']];
WB.voice=()=>{const v=localStorage.getItem('mrj_day3_voice');return WB.VOICES.some(x=>x[0]===v)?v:((WB.D&&WB.D.voices&&WB.D.voices.default)||'us_f')};
WB.setVoice=v=>{localStorage.setItem('mrj_day3_voice',v);document.querySelectorAll('[data-voice]').forEach(b=>b.classList.toggle('sel',b.dataset.voice===v))};
WB.voiceBar=()=>'<div class="vbar">'+WB.VOICES.map(([id,n,ic])=>`<button data-voice="${id}" class="${WB.voice()===id?'sel':''}" onclick="WB.setVoice('${id}');WB.play('audio/whatisthis.mp3')">${ic} ${n}</button>`).join('')+'</div>';
// Taught words/sentences play in the chosen voice. Coach Ray (audio/ray/) and the AI voice (audio/ai/) are never changed.
WB.vsrc=src=>{if(src&&src.includes('{v}'))return src.split('{v}').join(WB.voice());const m=/(?:^|\/)(?:audio|songs\/words)\/(\w+)\.mp3$/.exec(src||'');if(!m||/audio\/(ray|ai|v)\//.test(src))return src;return ((WB.D&&WB.D.voices&&WB.D.voices.dir)||'audio/v/')+WB.voice()+'/'+m[1]+'.mp3'};
WB.ai=src=>/\/ai\//.test(src)?src:((WB.D&&WB.D.voices&&WB.D.voices.ai)||'audio/ai/')+String(src).split('/').pop();
WB.voiceBtn=()=>{if(document.querySelector('.vpick'))return;const b=document.createElement('button');b.className='vpick snd';b.textContent='🗣️';b.title='Choose a voice';
 b.onclick=()=>{let p=document.querySelector('.vpop');if(p){p.remove();return}p=document.createElement('div');p.className='vpop card';p.innerHTML='<b>Choose a voice</b>'+WB.voiceBar();document.body.appendChild(p)};document.body.appendChild(b)};
let _res=null;WB.play=src=>new Promise(res=>{src=WB.vsrc(src);try{if(_cur){_cur.pause();const r=_res;_res=null;r&&setTimeout(r,0)}const a=new Audio(src);_cur=a;_res=res;a.onended=()=>{if(_res===res)_res=null;res()};a.onerror=res;a.play().catch(()=>res())}catch(e){res()}});
WB.seq=async list=>{for(const s of list){await WB.play(s);await new Promise(r=>setTimeout(r,250))}};
WB.line=k=>WB.cheer(k);
// Coach Ray: fun praise/feedback, random variation, queued after any word sound that is playing
WB.pick=k=>{const c=WB.D.coach;const m={great:'right',oops:'wrong',pass:'top',done:'top'}[k]||k;const a=c&&c[m];return a&&a.length?c.dir+a[Math.floor(Math.random()*a.length)]:null};
let _lastCheer=0;
WB.cheer=k=>{const src=WB.pick(k);if(!src)return Promise.resolve();if(k==='wrong'&&Date.now()-_lastCheer<2500)return Promise.resolve();_lastCheer=Date.now();
 return new Promise(res=>setTimeout(()=>{if(_cur&&!_cur.paused&&!_cur.ended){const c=_cur,old=c.onended;c.onended=()=>{old&&old();WB.play(src).then(res)}}else WB.play(src).then(res)},60))};
// 80% reached during play: big Next level button (keep going for the gold star)
WB.tick=(id,right,n)=>{if(!n||right/n<(WB.D.passPercent||80)/100||WB._nl===id)return;WB._nl=id;WB.save(id,Math.round(right/n*100),right,n);
 const i=WB.steps.findIndex(s=>s[0]===id),nx=WB.steps[i+1];const b=document.createElement('button');b.className='nextlvl ok';
 b.innerHTML=nx?'⭐ Next level ▶<small>or keep going for a gold star!</small>':(WB.D.kind==='review'?'🏆 Review passed!':'🏆 Day 3 passed!')+'<small>keep going for a gold star!</small>';
 b.onclick=()=>location.href=nx?WB.link(nx[0]==='climb'?'climb.html':'play.html',nx[0]==='climb'?'':'&a='+nx[0]):(WB.D.kind==='review'?'units.html':WB.link('index.html'));document.body.appendChild(b);setTimeout(()=>WB.cheer('next'),900)};
WB.all=()=>[...(WB.D.words||[]),...(WB.D.extras||[])];
WB.w=id=>WB.all().find(w=>w.id===id);
WB.end=(id,right,n)=>{const pct=n?Math.round(right/n*100):0;WB.save(id,pct,right,n);
 const i=WB.steps.findIndex(s=>s[0]===id),nx=WB.steps[i+1];
 document.getElementById('app').innerHTML=`<div class="card"><h1>${WB.steps[i][2]} ${WB.steps[i][1]}</h1><p class="pct">${pct}%</p><div style="font-size:28px">${right} / ${n} right</div>
 <div class="p" style="font-size:24px">${pct===100?'🌟 GOLD STAR! Perfect!':pct>=(WB.D.passPercent||80)?'⭐ Next level unlocked!':'Get '+(WB.D.passPercent||80)+'% to open the next level. Try again!'}</div><p><button onclick="location.reload()">🔁 Again</button> <button onclick="location.href=WB.link('index.html')">🏠 Steps</button>
 ${nx&&pct>=(WB.D.passPercent||80)?`<button class="ok" style="font-size:26px;padding:14px 22px" onclick="location.href=WB.link('${nx[0]==='climb'?'climb.html':'play.html'}','${nx[0]==='climb'?'':'&a='+nx[0]}')">Next level ▶</button>`:''}</p></div>`;document.querySelector('.nextlvl')?.remove();WB.cheer(pct===100||pct>=(WB.D.passPercent||80)?'top':'retry')};
WB.skipBtn=fn=>{if(!WB.test)return;let b=document.querySelector('.skip');if(!b){b=document.createElement('button');b.className='skip';b.textContent='TEST: skip ✓';document.body.appendChild(b)}b.onclick=fn};

// Picture, or a Korean-meaning card for words with no picture
WB.picHTML=(w,style)=>w&&w.pic?`<img class="pic" ${style?`style="${style}"`:''} src="${w.pic}" alt="">`:`<div class="kcard" ${style?`style="${style}"`:''}>${w&&w.ko||'?'}</div>`;
