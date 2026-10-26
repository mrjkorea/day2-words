import json,glob,time,urllib.parse,subprocess,os
L={'ko':'ko','zh-Hans':'zh-CN','ja':'ja','es':'es','hi':'hi','de':'de','vi':'vi','pt-BR':'pt','id':'id','fr':'fr','ar':'ar','tr':'tr','it':'it','pl':'pl'}
texts=sorted({l['text'] for f in glob.glob('../data/*.json') if 'catalog' not in f for l in json.load(open(f))['lines']})
out=json.load(open('gtr.json')) if os.path.exists('gtr.json') else {}
for code,g in L.items():
  m=out.setdefault(code,{})
  todo=[t for t in texts if not m.get(t)]
  i=0
  while i<len(todo):
    b=[];n=0
    while i<len(todo) and n<1500 and len(b)<40: b.append(todo[i]);n+=len(urllib.parse.quote(todo[i]));i+=1
    url='https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl='+g+''.join('&q='+urllib.parse.quote(t,safe='') for t in b)
    for a in range(4):
      try:
        r=json.loads(subprocess.run(['curl','-s','-m','30',url],capture_output=True,text=True).stdout)
        if len(r)==len(b): break
      except Exception: pass
      time.sleep(3)
    else: print('fail',code,i,flush=True); continue
    for t,x in zip(b,r): m[t]=x if isinstance(x,str) else x[0]
    time.sleep(0.4)
  json.dump(out,open('gtr.json','w'),ensure_ascii=False)
  print(code,len(m),flush=True)
