// Day 3 activities. Each takes the unit data (WB.D) and draws into #app.
const A={};const $=s=>document.querySelector(s);const app=()=>document.getElementById('app');
const head=(id,sub,i,n)=>{const s=WB.steps.find(x=>x[0]===id);WB.voiceBtn();return `<div class="card"><h1>${s[2]} ${s[1]}</h1><div class="p">${sub}</div>${n?`<div class="bar"><i style="width:${i/n*100}%"></i></div>`:''}`};
const fb=(t,ok)=>{const f=$('#fb');if(f){f.textContent=t;f.style.color=ok?'#2f9e44':'#c92a2a'}if(t&&t.startsWith('🎉'))WB.cheer('right');else if(t&&!ok&&!t.startsWith('First'))WB.cheer('wrong')};
const U=s=>s.toUpperCase().replace(/[^A-Z]/g,'');

// 1. Matching Columns
A.match=()=>{const W=WB.D.words,n=W.length;let right=0,done=0,sel=null,miss=new Set();
 app().innerHTML=head('match','Tap a word (hear it!), then tap its picture.')+`<div class="grid2"><div id="L" style="display:grid;gap:6px"></div><div id="R" class="grid2"></div></div><div id="fb"></div></div>`;
 WB.sh(W).forEach(w=>{const b=document.createElement('button');b.textContent='🔊 '+w.en;b.dataset.id=w.id;b.onclick=()=>{if(b.disabled)return;document.querySelectorAll('#L button').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');sel=w.id;WB.play(w.audio)};$('#L').appendChild(b)});
 WB.sh(W).forEach(w=>{const b=document.createElement('button');b.style.background='#f1f9ff';b.innerHTML=WB.picHTML(w);b.dataset.id=w.id;b.onclick=()=>pick(b);$('#R').appendChild(b)});
 function hit(id,good){const l=$(`#L [data-id="${id}"]`),r=$(`#R [data-id="${id}"]`);l.disabled=r.disabled=true;l.classList.remove('sel');l.classList.add('ok');r.classList.add('ok');if(good)right++,WB.tick('match',right,n);done++;if(done===n)setTimeout(()=>WB.end('match',right,n),900)}
 function pick(b){if(b.disabled)return;if(!sel){fb('First tap a word.',false);return}
  if(b.dataset.id===sel){hit(sel,!miss.has(sel));fb('🎉 Great!',true);WB.play(WB.w(sel).audio);sel=null}
  else{miss.add(sel);b.classList.add('no');setTimeout(()=>b.classList.remove('no'),600);fb('Try again!',false)}}
 WB.skipBtn(()=>{const l=[...document.querySelectorAll('#L button')].find(x=>!x.disabled);if(l)hit(l.dataset.id,true)});};

// 2. Map Quiz: one big scene picture with hotspot boxes (unit JSON "map"), or a picture grid if there is no scene
A.map=()=>{const M=WB.D.map||{},hs=M.scene&&M.hotspots?M.hotspots:null;const W=hs?hs.map(h=>WB.w(h.id)).filter(Boolean):WB.D.words.filter(w=>w.pic).slice(0,8),order=WB.sh(W),n=order.length;let i=0,right=0,missed=false,lock=false;
 app().innerHTML=head('map',hs?'Listen. Tap that thing in the picture!':'Listen. Tap the right picture.',0,n)+`<button class="snd" id="pl">🔊 Listen</button> <b id="cnt"></b><div id="fb"></div>
 <div id="mp" class="${hs?'scene':''}">${hs?`<img src="${M.scene}" alt="scene" draggable="false">`:'<div class="grid4" id="g"></div>'}</div></div>`;
 const box=(h,cls,label)=>{const d=document.createElement('div');d.className='hit '+(cls||'');d.style.cssText=`left:${h.x}%;top:${h.y}%;width:${h.w}%;height:${h.h}%`;if(label)d.innerHTML='<span>'+label+'</span>';$('#mp').appendChild(d);return d};
 // a tap hits the smallest hotspot that contains it (so the mouse wins over the desk under it)
 const at=(px,py)=>hs.filter(h=>px>=h.x&&px<=h.x+h.w&&py>=h.y&&py<=h.y+h.h).sort((a,b)=>a.w*a.h-b.w*b.h)[0];
 if(hs)$('#mp img').onclick=e=>{const r=e.target.getBoundingClientRect();const h=at((e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*100);tapId(h&&h.id,h)};
 else WB.sh(W).forEach(w=>{const b=document.createElement('button');b.dataset.id=w.id;b.style.background='#f1f9ff';b.innerHTML=`<img class="pic" src="${w.pic}" alt=""><div class="lab" style="min-height:24px">?</div>`;b.onclick=()=>{if(!b.disabled)tapId(w.id,null,b)};$('#g').appendChild(b)});
 const say=()=>i<n&&WB.play(order[i].audio);$('#pl').onclick=say;
 function step(){missed=false;lock=false;document.querySelector('.bar i').style.width=i/n*100+'%';$('#cnt').textContent=(i+1)+' / '+n;fb('',true);setTimeout(say,300)}
 function good(){const w=order[i];lock=true;if(hs)box(hs.find(h=>h.id===w.id),'',w.en);else{const b=$(`#g [data-id="${w.id}"]`);b.classList.add('ok');b.disabled=true;b.querySelector('.lab').textContent=w.en}
  if(!missed)right++,WB.tick('map',right,n);i++;fb('🎉 Yes! '+w.en+'!',true);WB.play(w.audio);if(i>=n)setTimeout(()=>WB.end('map',right,n),1300);else setTimeout(step,1300)}
 function tapId(id,h,b){if(lock||i>=n)return;if(id===order[i].id){good();return}missed=true;
  if(h){const d=box(h,'no',WB.w(h.id)?WB.w(h.id).en:'');setTimeout(()=>d.remove(),900)}else if(b){b.classList.add('no');setTimeout(()=>b.classList.remove('no'),600)}
  fb(h||b?'Not that one. Listen again!':'Tap a thing in the picture!',false);say()}
 WB.skipBtn(()=>{if(i<n&&!lock)good()});step();};

// 3. Odd One Out
A.odd=()=>{const S=WB.D.oddOneOut,n=S.length;let i=0,right=0,lock=false;
 function show(){lock=false;const s=S[i],items=WB.sh(s.items).map(WB.w);
  app().innerHTML=head('odd','Which one does NOT belong?',i,n)+`<button class="snd" id="pl">🔊 Listen to all</button><div class="grid4" style="margin-top:8px">`+items.map(w=>`<button data-id="${w.id}" style="background:#f1f9ff"><img class="pic" src="${w.pic}" alt=""><div>${w.en}</div></button>`).join('')+`</div><div id="fb"></div></div>`;
  const all=()=>WB.seq(items.map(w=>w.audio));$('#pl').onclick=all;setTimeout(all,300);
  document.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>pick(b.dataset.id===s.odd,b))}
 function pick(ok,b){if(lock)return;lock=true;const s=S[i];if(ok){right++,WB.tick('odd',right,n);fb('🎉 Yes! It does not belong.',true)}else{b&&b.classList.add('no');fb('Oops! This one does not belong:',false)}
  $(`[data-id="${s.odd}"]`).classList.add('ok');WB.play(WB.w(s.odd).audio);setTimeout(()=>{i++;i<n?show():WB.end('odd',right,n)},ok?1300:2300)}
 WB.skipBtn(()=>{if(i<n&&!lock)pick(true,null)});show();};

// 4. Word Search (across and down only)
A.search=()=>{const cfg=WB.D.wordSearch||{},N=cfg.size||8;const W=(cfg.words||WB.D.words.map(w=>w.id)).map(WB.w).filter(w=>U(w.en).length<=N);
 let g,placed;for(let t=0;t<200;t++){g=Array.from({length:N},()=>Array(N).fill(''));placed=[];let ok=true;
  for(const w of W){const s=U(w.en);let put=false;for(let k=0;k<300&&!put;k++){const d=Math.random()<.5?[0,1]:[1,0],r=Math.floor(Math.random()*(N-d[0]*(s.length-1))),c=Math.floor(Math.random()*(N-d[1]*(s.length-1)));
   if([...s].every((ch,j)=>{const v=g[r+d[0]*j][c+d[1]*j];return v===''||v===ch})){[...s].forEach((ch,j)=>g[r+d[0]*j][c+d[1]*j]=ch);placed.push({w,r,c,d,s});put=true}}if(!put){ok=false;break}}if(ok)break}
 const AB='ABCDEFGHIJKLMNOPRSTUVWY';g=g.map(row=>row.map(v=>v||AB[Math.floor(Math.random()*AB.length)]));
 const n=placed.length;let found=new Set(),right=0,missed=false,start=null;
 app().innerHTML=head('search','Find the words. Tap the first letter, then the last letter.')+`<div class="lg" id="lg" style="grid-template-columns:repeat(${N},1fr);max-width:420px"></div>
 <div class="grid4" id="ws">`+placed.map(p=>`<div data-w="${p.w.id}" style="border-radius:12px;background:#f1f9ff;padding:4px">${WB.picHTML(p.w,"max-width:70px;min-height:50px;font-size:14px")}<button class="snd" style="font-size:15px;padding:6px">🔊 ${p.w.en}</button></div>`).join('')+`</div><div id="fb"></div></div>`;
 placed.forEach(p=>$(`[data-w="${p.w.id}"] button`).onclick=()=>WB.play(p.w.audio));
 g.forEach((row,r)=>row.forEach((ch,c)=>{const d=document.createElement('div');d.textContent=ch;d.dataset.r=r;d.dataset.c=c;d.onclick=()=>tap(r,c,d);$('#lg').appendChild(d)}));
 const cell=(r,c)=>$(`#lg [data-r="${r}"][data-c="${c}"]`);
 function mark(p){found.add(p.w.id);if(!missed)right++,WB.tick('search',right,n);missed=false;[...p.s].forEach((_,j)=>{const e=cell(p.r+p.d[0]*j,p.c+p.d[1]*j);e.classList.add('f');e.onclick=()=>WB.play(p.w.audio)});
  $(`[data-w="${p.w.id}"]`).style.background='#b2f2bb';WB.play(p.w.audio);fb('🎉 You found '+p.w.en+'!',true);if(found.size===n)setTimeout(()=>WB.end('search',right,n),1300)}
 function tap(r,c,d){if(!start){start=[r,c,d];d.classList.add('s');return}const[r0,c0,d0]=start;start=null;d0.classList.remove('s');
  const p=placed.find(p=>!found.has(p.w.id)&&((p.r===r0&&p.c===c0&&p.r+p.d[0]*(p.s.length-1)===r&&p.c+p.d[1]*(p.s.length-1)===c)||(p.r===r&&p.c===c&&p.r+p.d[0]*(p.s.length-1)===r0&&p.c+p.d[1]*(p.s.length-1)===c0)));
  if(p)mark(p);else{missed=true;fb('Not a word. Try again!',false)}}
 WB.skipBtn(()=>{const p=placed.find(p=>!found.has(p.w.id));if(p)mark(p)});};

// 5. Hangman: the student picks a style first (saved). 6 misses.
const HSTY={
 classic:{n:'Classic hangman',ic:'🙂',lose:'Oh no!',hint:'Guess before the picture is finished!',
  draw:(l,L)=>{const k=L-l,P=['<line x1="20" y1="140" x2="120" y2="140"/>','<line x1="40" y1="140" x2="40" y2="15"/><line x1="40" y1="15" x2="95" y2="15"/><line x1="95" y1="15" x2="95" y2="35"/>','<circle cx="95" cy="50" r="15" fill="#fff3bf"/><circle cx="90" cy="47" r="2" fill="#333"/><circle cx="100" cy="47" r="2" fill="#333"/><path d="M89 55 q6 5 12 0" fill="none"/>','<line x1="95" y1="65" x2="95" y2="100"/>','<line x1="95" y1="75" x2="78" y2="88"/><line x1="95" y1="75" x2="112" y2="88"/>','<line x1="95" y1="100" x2="80" y2="122"/><line x1="95" y1="100" x2="110" y2="122"/>'];
   return '<svg viewBox="0 0 140 150" stroke="#495057" stroke-width="5" stroke-linecap="round">'+P.slice(0,k).join('')+'</svg>'}},
 snow:{n:'Snowman in the sun',ic:'⛄',lose:'💧 The snowman melted!',hint:'Guess before the snowman melts!',
  draw:(l,L)=>`<span style="font-size:${30+40*(L-l)/L}px">☀️</span><span style="display:inline-block;font-size:90px;transform:scale(${.35+.65*l/L}) translateY(${(L-l)*7}px);opacity:${.35+.65*l/L}">${l?'⛄':'💧'}</span>`},
 balloon:{n:'Balloon',ic:'🎈',lose:'💥 POP!',hint:'Guess before the balloon pops!',
  draw:(l,L)=>`<span style="display:inline-block;font-size:90px;transform:scale(${l?.35+.65*l/L:1.2}) rotate(${(L-l)*4}deg)">${l?'🎈':'💥'}</span>`},
 icecream:{n:'Ice cream cone',ic:'🍦',lose:'🫠 The ice cream melted!',hint:'Guess before the ice cream melts!',
  draw:(l,L)=>`<span style="font-size:${30+40*(L-l)/L}px">☀️</span><span style="display:inline-block;font-size:90px;transform:scale(${.4+.6*l/L},${.25+.75*l/L});transform-origin:bottom">${l?'🍦':'🫠'}</span><span style="font-size:${10+6*(L-l)}px;color:#f783ac">${'💧'.repeat(Math.ceil((L-l)/2))}</span>`}
};
A.hangman=()=>{const W=WB.sh((WB.D.hangman&&WB.D.hangman.words||WB.D.words.map(w=>w.id)).map(WB.w)),n=W.length,LIVES=6;let i=0,right=0,lives,got,lock,S;
 function choose(){app().innerHTML=head('hangman','Pick your game style!')+`<div class="hstyle">`+Object.entries(HSTY).map(([k,v])=>`<button data-s="${k}"><b>${v.ic}</b>${v.n}</button>`).join('')+`</div></div>`;
  document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{localStorage.setItem('mrj_day3_hangstyle',b.dataset.s);go()})}
 function go(){S=HSTY[localStorage.getItem('mrj_day3_hangstyle')]||HSTY.snow;i=0;right=0;show()}
 function show(){lives=LIVES;got=new Set();lock=false;const w=W[i];
  app().innerHTML=head('hangman','Listen and look. '+S.hint,i,n)+`<div style="display:flex;justify-content:center;gap:16px;align-items:center;min-height:160px">${WB.picHTML(w)}<div id="sm" style="transition:.4s">${S.draw(LIVES,LIVES)}</div></div>
  <button class="snd" id="pl">🔊 Listen</button> <button id="chs" style="font-size:15px">🎨 Style</button><div id="wd" style="font-size:36px;letter-spacing:8px;margin:10px"></div><div class="keys" id="k"></div><div id="fb"></div></div>`;
  $('#pl').onclick=()=>WB.play(w.audio);$('#chs').onclick=choose;setTimeout(()=>WB.play(w.audio),300);
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(ch=>{const b=document.createElement('button');b.textContent=ch;b.onclick=()=>guess(ch,b);$('#k').appendChild(b)});draw()}
 function draw(){const w=W[i];$('#wd').textContent=[...w.en].map(ch=>ch===' '?' ':got.has(ch)?ch:'_').join('');$('#sm').innerHTML=S.draw(lives,LIVES)}
 function guess(ch,b){if(lock)return;b.disabled=true;const w=W[i];if(w.en.includes(ch)){got.add(ch);b.classList.add('ok')}else{lives--;b.classList.add('no');fb('Not in the word! '+lives+' left…',false)}draw();
  const win=[...w.en].every(c=>c===' '||got.has(c));if(win)fin(true);else if(lives<=0)fin(false)}
 function fin(ok){lock=true;const w=W[i];[...w.en].forEach(c=>got.add(c));draw();if(ok){right++,WB.tick('hangman',right,n);fb('🎉 You did it! '+w.en,true)}else fb(S.lose+' The word is: '+w.en,false);
  WB.play(w.audio);setTimeout(()=>{i++;i<n?show():WB.end('hangman',right,n)},ok?1500:2500)}
 WB.skipBtn(()=>{if(S&&!lock)fin(true)});localStorage.getItem('mrj_day3_hangstyle')?go():choose();};

// 6. Crossword: picture + sound clues
A.cross=()=>{const W=(WB.D.crossword&&WB.D.crossword.words||WB.D.words.map(w=>w.id)).map(WB.w).sort((a,b)=>U(b.en).length-U(a.en).length);
 const G=new Map(),key=(r,c)=>r+','+c,get=(r,c)=>G.get(key(r,c));const P=[];
 function can(s,r,c,d){const[dr,dc]=d;if(get(r-dr,c-dc)||get(r+dr*s.length,c+dc*s.length))return false;let cross=0;
  for(let j=0;j<s.length;j++){const rr=r+dr*j,cc=c+dc*j,v=get(rr,cc);if(v){if(v!==s[j])return false;cross++}else if(get(rr+dc,cc+dr)||get(rr-dc,cc-dr))return false}return cross>0}
 function put(w,s,r,c,d){for(let j=0;j<s.length;j++)G.set(key(r+d[0]*j,c+d[1]*j),s[j]);P.push({w,s,r,c,d})}
 W.forEach((w,k)=>{const s=U(w.en);if(!k){put(w,s,0,0,[0,1]);return}let best=null;
  for(const p of P){const d=p.d[0]?[0,1]:[1,0];for(let a=0;a<p.s.length&&!best;a++)for(let b=0;b<s.length&&!best;b++)if(p.s[a]===s[b]){const r=p.r+p.d[0]*a-d[0]*b,c=p.c+p.d[1]*a-d[1]*b;if(can(s,r,c,d))best=[r,c,d]}if(best)break}
  if(best)put(w,s,...best)});
 const rs=[...G.keys()].map(k=>+k.split(',')[0]),cs=[...G.keys()].map(k=>+k.split(',')[1]),r0=Math.min(...rs),c0=Math.min(...cs),R=Math.max(...rs)-r0+1,C=Math.max(...cs)-c0+1;
 P.forEach((p,k)=>{p.r-=r0;p.c-=c0;p.no=k+1});const n=P.length;let right=0,done=new Set(),tries={},cur=null;
 app().innerHTML=head('cross','Tap a picture clue, listen, and type the word.')+`<div class="lg" id="lg" style="grid-template-columns:repeat(${C},1fr);max-width:${Math.min(460,C*44)}px"></div>
 <div class="grid4" id="cl">`+P.map(p=>`<button data-k="${p.no}" style="background:#f1f9ff;padding:4px"><b>${p.no} ${p.d[1]?'→':'↓'}</b>${WB.picHTML(p.w,"max-width:64px;min-height:50px;font-size:13px")}</button>`).join('')+`</div>
 <div id="inp" style="margin:10px;display:none"><button class="snd" id="pl">🔊</button> <input id="ans" autocomplete="off" autocapitalize="off" style="font:inherit;font-size:22px;width:160px;padding:8px;border-radius:10px;border:3px solid #74c0fc"> <button id="go">OK</button></div><div id="fb"></div></div>`;
 for(let r=0;r<R;r++)for(let c=0;c<C;c++){const d=document.createElement('div');d.id='x'+r+'_'+c;d.className=G.has(key(r+r0,c+c0))?'c':'x';$('#lg').appendChild(d)}
 P.forEach(p=>{const e=$('#x'+p.r+'_'+p.c);if(!e.querySelector('small'))e.insertAdjacentHTML('afterbegin',`<small>${p.no}</small>`)});
 const fill=p=>[...p.s].forEach((ch,j)=>{const e=$('#x'+(p.r+p.d[0]*j)+'_'+(p.c+p.d[1]*j));e.lastChild&&e.lastChild.nodeType===3?e.lastChild.textContent=ch:e.append(ch);e.style.background='#b2f2bb'});
 const pick=k=>{cur=P[k-1];if(done.has(cur.no))return;document.querySelectorAll('#cl button').forEach(b=>b.classList.remove('sel'));$(`#cl [data-k="${k}"]`).classList.add('sel');$('#inp').style.display='block';$('#ans').value='';$('#ans').focus();WB.play(cur.w.audio)};
 document.querySelectorAll('#cl button').forEach(b=>b.onclick=()=>pick(+b.dataset.k));$('#pl').onclick=()=>cur&&WB.play(cur.w.audio);
 function solve(p,ok){done.add(p.no);if(ok)right++,WB.tick('cross',right,n);fill(p);const b=$(`#cl [data-k="${p.no}"]`);b.classList.remove('sel');b.classList.add(ok?'ok':'no');b.disabled=true;WB.play(p.w.audio);$('#inp').style.display='none';cur=null;
  if(done.size===n)setTimeout(()=>WB.end('cross',right,n),1300)}
 const check=()=>{if(!cur)return;const p=cur,v=U($('#ans').value);if(!v)return;if(v===p.s){fb('🎉 Yes! '+p.w.en,true);solve(p,!tries[p.no])}else{tries[p.no]=(tries[p.no]||0)+1;
  if(tries[p.no]>=2){fb('The word is: '+p.w.en,false);solve(p,false)}else{fb('Not quite. Listen and try again!',false);WB.play(p.w.audio)}}};
 $('#go').onclick=check;$('#ans').onkeydown=e=>{if(e.key==='Enter')check()};
 WB.skipBtn(()=>{const p=P.find(p=>!done.has(p.no));if(p)solve(p,true)});};

// 7. Unscramble Words
A.unscramble=()=>{const E=WB.D.expressions,n=E.length;let i=0,right=0,lock,missed;
 function show(){lock=false;missed=false;const e=E[i],t=e.text.split(' ');
  app().innerHTML=head('unscramble','Listen. Tap the words in order.',i,n)+`<button class="snd" id="pl">🔊 Listen</button><div class="slots" id="sl"></div><div class="tiles" id="tl">`+WB.sh(t.map((w,k)=>[w,k])).map(([w,k])=>`<button data-k="${k}">${w}</button>`).join('')+`</div><div id="fb"></div></div>`;
  $('#pl').onclick=()=>WB.play(e.audio);setTimeout(()=>WB.play(e.audio),300);
  document.querySelectorAll('#tl button').forEach(b=>b.onclick=()=>{if(lock)return;(b.parentNode.id==='tl'?$('#sl'):$('#tl')).appendChild(b);
   const got=[...document.querySelectorAll('#sl button')].map(x=>x.textContent);if(got.length===t.length){if(got.join(' ')===e.text)win();else{missed=true;fb('Not yet! Tap a word to move it back.',false)}}})}
 function win(){lock=true;const e=E[i];if(!missed)right++,WB.tick('unscramble',right,n);document.querySelectorAll('#sl button').forEach(b=>b.classList.add('ok'));fb('🎉 '+e.text,true);WB.play(e.audio).then(()=>setTimeout(()=>{i++;i<n?show():WB.end('unscramble',right,n)},600))}
 WB.skipBtn(()=>{if(lock)return;const e=E[i];$('#sl').innerHTML=e.text.split(' ').map(w=>`<button>${w}</button>`).join('');$('#tl').innerHTML='';win()});show();};

// 8. Complete the Dialogue
A.dialogue=()=>{const D=WB.D.dialogues,n=D.length;let i=0,right=0,lock;
 function show(){lock=false;const d=D[i];
  app().innerHTML=head('dialogue','Listen to the question. Pick the best answer for the AI 🤖 to say.',i,n)+`${d.pic?`<img class="pic" src="${d.pic}" alt="">`:""}<div style="font-size:26px;margin:8px">🧑 ${d.q.text} <button class="snd" id="pl">🔊</button></div>
  <div style="display:grid;gap:8px">`+d.choices.map((c,k)=>`<button data-k="${k}" style="font-size:24px">🤖 ${c.text}</button>`).join('')+`</div><div id="fb"></div></div>`;
  $('#pl').onclick=()=>WB.play(d.q.audio);setTimeout(()=>WB.play(d.q.audio),300);
  document.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>pick(+b.dataset.k===d.answer,b))}
 function pick(ok,b){if(lock)return;lock=true;const d=D[i];if(ok)right++,WB.tick('dialogue',right,n);else b&&b.classList.add('no');$(`[data-k="${d.answer}"]`).classList.add('ok');
  fb(ok?'🎉 Great! Listen to the talk.':'Oops! The right answer is green. Listen!',ok);
  setTimeout(()=>WB.seq([d.q.audio,WB.ai(d.choices[d.answer].audio)]).then(()=>setTimeout(()=>{i++;i<n?show():WB.end('dialogue',right,n)},500)),400)}
 WB.skipBtn(()=>{if(i<n&&!lock)pick(true,null)});show();};

WB.load().then(()=>{const a=WB.qs.get('a');if(!A[a]){app().innerHTML='<div class="card"><h1>Unknown activity</h1></div>';return}
 if(!WB.unlocked(a)){app().innerHTML=`<div class="card"><h1>🔒 Locked</h1><p class="p">Finish the step before this one first.</p><button onclick="location.href=WB.link('index.html')">🏠 Steps</button></div>`;return}
 document.title=WB.steps.find(s=>s[0]===a)[1];A[a]()}).catch(e=>app().innerHTML='<div class="card"><h1>Oops</h1><p>'+e.message+'</p></div>');
