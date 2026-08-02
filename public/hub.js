/* Joelboard Hub — app logic. © 2026 Joel Soluções LTDA.
   Classic global script (NOT a module); loads after /joelboard.js. Edit behavior here, markup in the .html. */
var greetEl=document.getElementById("greet"), btnEl=document.getElementById("authbtn");
var _hbooted=false;
var HUB_NEWS_ADMIN_EMAIL='joaogabrielpabarbosa@gmail.com';
var HUB_NEWS_SHEET_ID=hubNewsCleanId((typeof window!=='undefined'&&window.JB_HUB_NEWS_SHEET_ID)||'');
var HUB_NEWS_SHEET_LOCAL='jb_hub_news_sheet_id';
var HUB_NEWS_LIMIT=5;
var HUB_NEWS_DEFAULT=[
  { app:'mini', kind:'novo', text:'Sites permitidos sincronizam na planilha Joelboard Mini (aba ReplaceSites) — entre Hub, Replace e Refresh.' },
  { app:'notas', kind:'correcao', text:'Duplicatas fantasma em listas corrigidas; Remover duplicatas no menu ⋯ de cada lista.' },
  { app:'notas', kind:'novo', text:'Ícones personalizados nas listas — presets e emoji no editor e na grade inicial.' },
  { app:'mini', kind:'correcao', text:'Login e sync Replace com a extensão — página de auth espera a ponte antes de enviar o token.' },
  { app:'hub', kind:'novo', text:'Ícone Joelboard no topo de cada app leva de volta ao Hub.' }
];
var HUB_NEWS=HUB_NEWS_DEFAULT.slice();
var HUB_NEWS_LABEL={ fit:'Fit', finance:'Finance', notas:'Notas', mini:'Mini', hub:'Hub', study:'Study' };
var HUB_NEWS_KIND={ novo:'Novo', correcao:'Correção' };
var HUB_NEWS_APPS=['hub','finance','fit','study','notas','mini'];
var _hubNewsIgnoreEnv=false;

function hubNewsCleanId(raw){
  raw=String(raw||'').trim().replace(/^["']|["']$/g,'');
  var m=raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m?m[1]:raw;
}
function hubNewsCoerceItems(items){
  if(!items||!items.length) return HUB_NEWS_DEFAULT.slice();
  return items.slice(0,HUB_NEWS_LIMIT);
}
function hubNewsAdmin(){ return (JB.email()||'').toLowerCase()===HUB_NEWS_ADMIN_EMAIL; }
function hubNewsSheetMissing(err){
  var m=String((err&&err.message)||'');
  return m.indexOf('404')>-1||m.indexOf('NOT_FOUND')>-1;
}
function hubNewsErrMsg(err){
  var m=String((err&&err.message)||'');
  if(hubNewsSheetMissing(err)) return 'Planilha não encontrada — confira VITE_HUB_NEWS_SHEET_ID no Vercel (planilha Joelboard Novidades, aba Novidades; não use a Joelboard Mini).';
  return m||'falha ao salvar';
}
function hubNewsInvalidateConfiguredId(){
  _hubNewsIgnoreEnv=true;
  hubNewsSetSheetId('');
}
function hubNewsSheetId(){
  if(!_hubNewsIgnoreEnv){
    var id=hubNewsCleanId(HUB_NEWS_SHEET_ID);
    if(id) return id;
  }
  try{ return hubNewsCleanId(localStorage.getItem(HUB_NEWS_SHEET_LOCAL)||''); }catch(_){ return ''; }
}
function hubNewsSetSheetId(id){
  try{ if(id) localStorage.setItem(HUB_NEWS_SHEET_LOCAL,id); else localStorage.removeItem(HUB_NEWS_SHEET_LOCAL); }catch(_){}
}

function hubNewsParseGviz(text){
  try{
    var m=String(text||'').match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?\s*$/);
    if(!m) return null;
    var data=JSON.parse(m[1]);
    if(!data||data.status!=='ok'||!data.table) return null;
    var out=[];
    (data.table.rows||[]).forEach(function(row){
      var c=row.c||[];
      var textVal=c[2]&&(c[2].v!=null?String(c[2].v):'');
      if(!textVal) return;
      var app=String((c[0]&&c[0].v)||'hub').toLowerCase();
      var kind=String((c[1]&&c[1].v)||'novo').toLowerCase();
      if(app==='app'&&kind==='kind'&&/^text$/i.test(textVal)) return;
      out.push({ app:app, kind:kind, text:textVal });
    });
    return out.length?out:null;
  }catch(_){ return null; }
}

function hubNewsParseApiRows(rows){
  var body=(rows||[]).slice(1), out=[];
  body.forEach(function(r){
    if(!r||!(r[2]||'').trim()) return;
    out.push({ app:String(r[0]||'hub').toLowerCase(), kind:String(r[1]||'novo').toLowerCase(), text:String(r[2]||'') });
  });
  return out.length?out:null;
}

function hubNewsFetchPublic(id){
  return fetch('https://docs.google.com/spreadsheets/d/'+encodeURIComponent(id)+'/gviz/tq?tqx=out:json&sheet=Novidades',{ cache:'no-store' })
    .then(function(r){ return r.text(); })
    .then(function(t){ return hubNewsParseGviz(t); })
    .catch(function(){ return null; });
}

function hubNewsFetchApi(id){
  return JB.api('GET','https://sheets.googleapis.com/v4/spreadsheets/'+id+'/values/Novidades?valueRenderOption=UNFORMATTED_VALUE')
    .then(function(res){ return hubNewsParseApiRows(res.values||[]); })
    .catch(function(){ return null; });
}

function hubNewsFetch(){
  var id=hubNewsSheetId();
  if(!id) return Promise.resolve(HUB_NEWS_DEFAULT.slice());
  var pub=hubNewsFetchPublic(id);
  if(hubNewsAdmin()&&JB.isSignedIn()){
    return hubNewsFetchApi(id).then(function(items){
      if(items&&items.length) return items;
      return pub;
    }).then(function(items){
      return hubNewsCoerceItems(items);
    }).catch(function(){
      return pub.then(function(items){ return hubNewsCoerceItems(items); });
    });
  }
  return pub.then(function(items){ return hubNewsCoerceItems(items); });
}

function hubNewsInit(){
  renderHubNews();
  return hubNewsFetch().then(function(items){
    HUB_NEWS=items;
    renderHubNews();
  }).catch(function(){
    HUB_NEWS=HUB_NEWS_DEFAULT.slice();
    renderHubNews();
  });
}

function renderHubNews(){
  var el=document.getElementById('hubNews'); if(!el) return;
  try{
    var list=HUB_NEWS.length?HUB_NEWS.map(function(n){
      return '<li class="nov-item"><div class="nov-meta"><span class="nov-app '+esc(n.app)+'">'+esc(HUB_NEWS_LABEL[n.app]||n.app)+'</span><span class="nov-kind '+esc(n.kind)+'">'+esc(HUB_NEWS_KIND[n.kind]||n.kind)+'</span></div>'+esc(n.text)+'</li>';
    }).join(''):'<li class="nov-item nov-empty">Nenhuma novidade publicada ainda.</li>';
    var editBtn=hubNewsAdmin()?'<button type="button" class="nov-edit" onclick="openHubNewsEditor()" title="Editar novidades" aria-label="Editar novidades">✏</button>':'';
    el.innerHTML='<div class="nov-head"><div class="nov-title">Novidades</div>'+editBtn+'</div><ul class="nov-list">'+list+'</ul>';
  }catch(_){
    HUB_NEWS=HUB_NEWS_DEFAULT.slice();
    el.innerHTML='<div class="nov-head"><div class="nov-title">Novidades</div></div><ul class="nov-list">'+HUB_NEWS.map(function(n){
      return '<li class="nov-item"><div class="nov-meta"><span class="nov-app '+n.app+'">'+esc(HUB_NEWS_LABEL[n.app]||n.app)+'</span><span class="nov-kind '+n.kind+'">'+(HUB_NEWS_KIND[n.kind]||n.kind)+'</span></div>'+esc(n.text)+'</li>';
    }).join('')+'</ul>';
  }
}

function hubNewsCreateSheet(){
  return JB.api('POST','https://sheets.googleapis.com/v4/spreadsheets',{
    properties:{ title:'Joelboard Novidades' },
    sheets:[{ properties:{ title:'Novidades' } }]
  }).then(function(ss){
    var id=ss.spreadsheetId;
    return JB.api('POST','https://sheets.googleapis.com/v4/spreadsheets/'+id+'/values:batchUpdate',{
      valueInputOption:'RAW',
      data:[{ range:'Novidades!A1', values:[['App','Kind','Text']] }]
    }).then(function(){
      return JB.api('POST','https://www.googleapis.com/drive/v3/files/'+id+'/permissions',{ role:'reader', type:'anyone' }).catch(function(){ return {}; }).then(function(){
        hubNewsSetSheetId(id);
        return id;
      });
    });
  });
}

function hubNewsEnsureNovidadesTab(id){
  return JB.api('GET','https://sheets.googleapis.com/v4/spreadsheets/'+id+'?fields=sheets.properties.title').then(function(meta){
    var has=(meta.sheets||[]).some(function(s){ return s.properties&&s.properties.title==='Novidades'; });
    if(has) return id;
    return JB.api('POST','https://sheets.googleapis.com/v4/spreadsheets/'+id+':batchUpdate',{
      requests:[{ addSheet:{ properties:{ title:'Novidades' } } }]
    }).then(function(){
      return JB.api('POST','https://sheets.googleapis.com/v4/spreadsheets/'+id+'/values:batchUpdate',{
        valueInputOption:'RAW',
        data:[{ range:'Novidades!A1', values:[['App','Kind','Text']] }]
      }).then(function(){ return id; });
    });
  });
}

function hubNewsEnsureSheet(){
  var id=hubNewsSheetId();
  if(id){
    return hubNewsEnsureNovidadesTab(id).catch(function(err){
      if(!hubNewsSheetMissing(err)) throw err;
      hubNewsInvalidateConfiguredId();
      return hubNewsCreateSheet();
    });
  }
  return hubNewsCreateSheet();
}

function hubNewsWriteRows(id, values){
  return JB.api('PUT','https://sheets.googleapis.com/v4/spreadsheets/'+id+'/values/Novidades!A1?valueInputOption=RAW',{ values:values });
}

function hubNewsSaveRows(items, retried){
  items=(items||[]).slice(0,HUB_NEWS_LIMIT);
  var values=[['App','Kind','Text']].concat(items.map(function(n){
    return [n.app||'hub', n.kind||'novo', n.text||''];
  }));
  return hubNewsEnsureSheet().then(function(id){
    return hubNewsWriteRows(id, values).then(function(){ return { id:id, recreated:!!retried||_hubNewsIgnoreEnv }; });
  }).catch(function(err){
    if(!retried&&hubNewsSheetMissing(err)){
      hubNewsInvalidateConfiguredId();
      return hubNewsSaveRows(items, true);
    }
    throw err;
  });
}

var _hubNewsDraft=null;
function openHubNewsEditor(){
  if(!hubNewsAdmin()) return;
  if(!JB.isSignedIn()){
    JB.signIn({ onSuccess:openHubNewsEditor });
    return;
  }
  _hubNewsDraft=(HUB_NEWS.length?HUB_NEWS:HUB_NEWS_DEFAULT).map(function(n){ return { app:n.app, kind:n.kind, text:n.text }; });
  hubNewsRenderEditor();
  var note=$('hubNewsSheetNote');
  if(note){
    var sid=hubNewsSheetId();
    if(sid) note.textContent='Planilha: '+sid+' (aba Novidades). Se der erro 404, o ID no Vercel provavelmente está errado — use a planilha Joelboard Novidades, não a Mini.';
    else if(HUB_NEWS_SHEET_ID&&!_hubNewsIgnoreEnv) note.textContent='VITE_HUB_NEWS_SHEET_ID no Vercel aponta para '+hubNewsCleanId(HUB_NEWS_SHEET_ID)+' — se inválido, Publicar criará uma planilha nova.';
    else note.textContent='Na primeira publicação criamos a planilha Joelboard Novidades. Depois copie o ID para VITE_HUB_NEWS_SHEET_ID no Vercel.';
  }
  var ov=$('hubNewsEditor'); if(ov) ov.classList.add('open');
}
function closeHubNewsEditor(){ var ov=$('hubNewsEditor'); if(ov) ov.classList.remove('open'); _hubNewsDraft=null; }

function hubNewsRenderEditor(){
  var list=$('hubNewsEditList'); if(!list||!_hubNewsDraft) return;
  var appOpts=function(sel){ return HUB_NEWS_APPS.map(function(a){ return '<option value="'+a+'"'+(sel===a?' selected':'')+'>'+esc(HUB_NEWS_LABEL[a]||a)+'</option>'; }).join(''); };
  var kindOpts=function(sel){ return ['novo','correcao'].map(function(k){ return '<option value="'+k+'"'+(sel===k?' selected':'')+'>'+esc(HUB_NEWS_KIND[k])+'</option>'; }).join(''); };
  list.innerHTML=_hubNewsDraft.map(function(n,i){
    return '<div class="nov-edit-row" data-i="'+i+'">'
      +'<select class="nov-edit-app" data-i="'+i+'">'+appOpts(n.app)+'</select>'
      +'<select class="nov-edit-kind" data-i="'+i+'">'+kindOpts(n.kind)+'</select>'
      +'<textarea class="nov-edit-text" data-i="'+i+'" rows="2" placeholder="Texto da novidade">'+esc(n.text)+'</textarea>'
      +'<button type="button" class="nov-edit-rm" data-i="'+i+'" title="Remover">✕</button></div>';
  }).join('');
  list.querySelectorAll('.nov-edit-app').forEach(function(el){ el.onchange=function(){ _hubNewsDraft[+el.getAttribute('data-i')].app=el.value; }; });
  list.querySelectorAll('.nov-edit-kind').forEach(function(el){ el.onchange=function(){ _hubNewsDraft[+el.getAttribute('data-i')].kind=el.value; }; });
  list.querySelectorAll('.nov-edit-text').forEach(function(el){ el.oninput=function(){ _hubNewsDraft[+el.getAttribute('data-i')].text=el.value; }; });
  list.querySelectorAll('.nov-edit-rm').forEach(function(btn){
    btn.onclick=function(){
      _hubNewsDraft.splice(+btn.getAttribute('data-i'),1);
      hubNewsRenderEditor();
    };
  });
  var add=$('hubNewsEditAdd');
  if(add) add.style.display=_hubNewsDraft.length>=HUB_NEWS_LIMIT?'none':'';
}

function hubNewsEditAdd(){
  if(!_hubNewsDraft||_hubNewsDraft.length>=HUB_NEWS_LIMIT) return;
  _hubNewsDraft.push({ app:'hub', kind:'novo', text:'' });
  hubNewsRenderEditor();
}

function hubNewsEditSave(){
  if(!_hubNewsDraft) return;
  var items=_hubNewsDraft.map(function(n){
    return { app:(n.app||'hub').toLowerCase(), kind:(n.kind||'novo').toLowerCase(), text:(n.text||'').trim() };
  }).filter(function(n){ return n.text; }).slice(0,HUB_NEWS_LIMIT);
  if(!items.length){ if(JB.toast) JB.toast('Adicione ao menos uma novidade'); return; }
  var btn=$('hubNewsEditSave'); if(btn) btn.disabled=true;
  hubNewsSaveRows(items).then(function(res){
    HUB_NEWS=items;
    renderHubNews();
    closeHubNewsEditor();
    if(JB.toast) JB.toast('✓ Novidades publicadas');
    var note=$('hubNewsSheetNote');
    if(note&&res&&res.id){
      if(_hubNewsIgnoreEnv||!HUB_NEWS_SHEET_ID||hubNewsCleanId(HUB_NEWS_SHEET_ID)!==res.id){
        note.innerHTML='No Vercel, crie a variável <b>VITE_HUB_NEWS_SHEET_ID</b> com <b>só</b> este valor (sem URL, sem nome da variável):<br><code class="hub-news-id">'+esc(res.id)+'</code>';
      }
    }
  }).catch(function(e){
    if(JB.toast) JB.toast('Erro: '+hubNewsErrMsg(e));
  }).finally(function(){ if(btn) btn.disabled=false; });
}

function $(id){ return document.getElementById(id); }
var HUB_TOUR=[
  { title:'Bem-vindo ao Joelboard 👋', body:'Seus apps pessoais num lugar só.' },
  { sel:'.grid', title:'Seus apps', body:'Toque num card para abrir Finance, Fit, Study, Notas ou Mini (extensões Chrome).' },
  { sel:'.gear', title:'Ajustes', body:'Tema e este tutorial ficam aqui.' }
];
function hubVerTutorial(){ closeHubSet(); setTimeout(function(){ JB.tour('hub', HUB_TOUR); }, 250); }

/* ---- Julioelboard easter egg (Joel + Julia only) ---- */
var JULIOEL_EMAILS=['joaogabrielpabarbosa@gmail.com','juliazin182@gmail.com'];
var JULIOEL_KEY='jb_julioel';
function julioelAllowed(){ return JULIOEL_EMAILS.indexOf((JB.email()||'').toLowerCase())>-1; }
function julioelActive(){ try{ return julioelAllowed()&&localStorage.getItem(JULIOEL_KEY)==='1'; }catch(_){ return false; } }
function setJulioel(on){ try{ if(on) localStorage.setItem(JULIOEL_KEY,'1'); else localStorage.removeItem(JULIOEL_KEY); }catch(_){} applyJulioelUI(true); }
function applyJulioelUI(animate){
  var on=julioelActive()&&julioelAllowed();
  var brand=document.getElementById('hubBrand');
  var wm=document.getElementById('hubBrandText');
  var sub=document.getElementById('hubSub');
  var movies=document.getElementById('prateleiraTile');
  function paint(){
    if(brand){ brand.classList.toggle('julioel-secret', julioelAllowed()); brand.tabIndex=julioelAllowed()?0:-1; brand.setAttribute('aria-label', on?'Julioelboard':'Joelboard'); }
    if(wm) wm.textContent=on?'Julioelboard':'Joelboard';
    if(sub) sub.textContent=on?'Modo secreto — só vocês dois.':'Seus apps, num lugar só.';
    document.body.classList.toggle('julioel-mode', on);
    if(movies) movies.setAttribute('aria-hidden', on?'false':'true');
    document.title=on?'Julioelboard':'Joelboard';
  }
  if(!animate){ paint(); return; }
  document.body.classList.add('julioel-switching');
  if(wm){ wm.classList.remove('julioel-flip'); void wm.offsetWidth; wm.classList.add('julioel-flip'); }
  paint();
  setTimeout(function(){ document.body.classList.remove('julioel-switching'); }, 420);
}
function toggleJulioel(){
  if(!julioelAllowed()) return;
  if(document.body.classList.contains('julioel-hint-on')){
    endJulioelHint(true);
    julioelConfetti();
  }
  setJulioel(!julioelActive());
}
function julioelConfetti(){
  var colors=['#e879f9','#f472b6','#a78bfa','#22d3ee','#fbbf24','#34d399'];
  for(var i=0;i<90;i++){
    var p=document.createElement('div'); p.className='julioel-confetti';
    var sz=6+Math.random()*9;
    p.style.left=(Math.random()*100)+'vw'; p.style.width=sz+'px'; p.style.height=(sz*0.6)+'px';
    p.style.background=colors[Math.floor(Math.random()*colors.length)];
    var dur=2.1+Math.random()*1.8;
    p.style.animation='julioel-confetti-fall '+dur+'s linear '+(Math.random()*0.4)+'s forwards';
    document.body.appendChild(p);
    (function(el,ms){ setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, ms); })(p,(dur+0.8)*1000);
  }
}
function endJulioelHint(markDone){
  document.body.classList.remove('julioel-hint-on');
  var ov=document.getElementById('julioelHint'); if(ov) ov.classList.remove('on');
  var brand=document.getElementById('hubBrand'); if(brand) brand.classList.remove('julioel-hint-pulse');
  if(markDone) try{ localStorage.setItem('jb_tour_julioel','1'); }catch(_){}
}
function positionJulioelHint(){
  var ov=document.getElementById('julioelHint'); if(!ov||!ov.classList.contains('on')) return;
  var brand=document.getElementById('hubBrand'); if(!brand) return;
  var hole=ov.querySelector('.jbt-hole'); var pop=ov.querySelector('.jh-pop');
  var rect=brand.getBoundingClientRect(); var pad=8;
  if(hole){
    hole.style.display='block';
    hole.style.left=(rect.left-pad)+'px'; hole.style.top=(rect.top-pad)+'px';
    hole.style.width=(rect.width+pad*2)+'px'; hole.style.height=(rect.height+pad*2)+'px';
  }
  if(pop){
    var ph=pop.offsetHeight||120, pw=pop.offsetWidth||280;
    var top=rect.bottom+14;
    if(top+ph>window.innerHeight-8) top=Math.max(8, rect.top-ph-14);
    var left=Math.min(Math.max(8, rect.left), window.innerWidth-pw-8);
    pop.style.top=top+'px'; pop.style.left=left+'px';
  }
}
function showJulioelHint(){
  if(!julioelAllowed()||!JB.isSignedIn()||JB.tourDone('julioel')||julioelActive()) return;
  var brand=document.getElementById('hubBrand'); if(!brand) return;
  var ov=document.getElementById('julioelHint');
  if(!ov){
    ov=document.createElement('div'); ov.id='julioelHint';
    ov.innerHTML='<div class="jbt-block"></div><div class="jbt-hole"></div><div class="jh-pop"><div class="jh-body">hmmm, acho que tem uma surpresa ali pra você. clica!</div><button type="button" class="jh-skip">Depois</button></div>';
    ov.querySelector('.jh-skip').onclick=function(e){ e.stopPropagation(); endJulioelHint(true); };
    document.body.appendChild(ov);
    window.addEventListener('resize', positionJulioelHint);
  }
  document.body.classList.add('julioel-hint-on');
  brand.classList.add('julioel-hint-pulse');
  ov.classList.add('on');
  positionJulioelHint();
}
function maybeJulioelHint(){
  if(!julioelAllowed()||!JB.isSignedIn()) return;
  if(julioelActive()){ if(!JB.tourDone('julioel')) endJulioelHint(true); return; }
  if(JB.tourDone('julioel')) return;
  setTimeout(showJulioelHint, 600);
}
function bootHubTours(){
  if(!JB.isSignedIn()) return;
  if(!JB.tourDone('hub')){
    setTimeout(function(){ JB.tour('hub', HUB_TOUR, { onDone: maybeJulioelHint }); }, 700);
    return;
  }
  maybeJulioelHint();
}
function setGreet(){ var em=JB.email(); var on=JB.isSignedIn(); greetEl.textContent= on?("Olá, "+em.split("@")[0]+" 👋"):"Olá 👋"; btnEl.textContent= on?"Sair":"Entrar"; btnEl.onclick= on?doOut:doIn; showFbTile(); applyJulioelUI(false); if(on && !_hbooted){ _hbooted=true; bootHubTours(); } hubNewsInit(); }
function doIn(){ JB.signIn({ onSuccess: function(){ setGreet(); } }); }
function doOut(){ try{ localStorage.removeItem(JULIOEL_KEY); }catch(_){} JB.signOut(); setGreet(); }
/* ---- Feedback viewer (owner-only; reads the form-response sheet via Sheets API) ---- */
var FB_SHEET='1vgpn1qRuKys8TYQD-Dx49cDjcOqJDZyqS0fZAvfxchs', FB_GID=749060366, FB_OWNER='joaogabrielpabarbosa@gmail.com';
var FB_STATUS=['New','Acknowledged','Fixed',"Won't fix"];
var fbEntries=[], fbFilter='all', fbOpenOnly=true, fbSearchStr='', fbTitle='', fbStatusCol=-1;
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fbOwner(){ return (JB.email()||'').toLowerCase()===FB_OWNER; }
function showFbTile(){ var t=document.getElementById('fbTile'); if(t) t.style.display=fbOwner()?'':'none'; }
function openFB(){ document.getElementById('fbViewer').classList.add('open'); loadFB(); }
function closeFB(){ document.getElementById('fbViewer').classList.remove('open'); }
function loadFB(){
  var el=document.getElementById('fbList'); el.innerHTML='<div class="empty">Carregando…</div>';
  JB.api('GET','https://sheets.googleapis.com/v4/spreadsheets/'+FB_SHEET+'?fields=sheets.properties(sheetId,title)')
    .then(function(meta){ var a=(meta.sheets||[]); var sh=a.find(function(x){return x.properties.sheetId===FB_GID;})||a[0]; fbTitle=sh.properties.title; return JB.api('GET','https://sheets.googleapis.com/v4/spreadsheets/'+FB_SHEET+'/values/'+encodeURIComponent(fbTitle)+'?valueRenderOption=FORMATTED_VALUE'); })
    .then(function(res){ fbEntries=parseFB(res.values||[]); renderFB(); })
    .catch(function(e){ document.getElementById('fbList').innerHTML='<div class="empty">Erro ao carregar: '+esc(e.message||'')+'</div>'; });
}
function parseFB(rows){
  if(!rows.length) return [];
  var hdr=rows[0].map(function(h){return String(h||'').trim().toLowerCase();});
  function col(){ for(var i=0;i<arguments.length;i++){ for(var j=0;j<hdr.length;j++){ if(hdr[j].indexOf(arguments[i])>-1) return j; } } return -1; }
  var ci={ ts:col('timestamp','carimbo','data'), name:col('name','nome'), type:col('type','tipo'), app:col('app'), msg:col('message','mensag'), status:col('status') };
  fbStatusCol=ci.status;
  var out=[];
  for(var r=1;r<rows.length;r++){
    var row=rows[r]||[]; var msg=String((ci.msg>-1?row[ci.msg]:'')||'');
    var tag=msg.match(/^\[([^\]]+)\]\s*/); var app=(ci.app>-1&&row[ci.app])?String(row[ci.app]):(tag?tag[1]:'');
    var text=tag?msg.slice(tag[0].length):msg; var em=text.match(/—\s*([\w.+-]+@[\w.-]+)\s*$/); var email=em?em[1]:''; text=text.replace(/\s*—\s*[\w.+-]+@[\w.-]+\s*$/,'').trim();
    var ts=String((ci.ts>-1?row[ci.ts]:'')||'');
    if(!text && !ts) continue;
    var type=String((ci.type>-1?row[ci.type]:'')||'');
    out.push({ row:r+1, ts:ts, name:String((ci.name>-1?row[ci.name]:'')||'Anônimo'), type:type, app:app, msg:text, email:email, status:String((ci.status>-1&&row[ci.status])||'New'), isBug:/bug/i.test(type), isFeature:/feature|ideia|recurso/i.test(type) });
  }
  return out.reverse();
}
var FB_APP_ORDER=['finance','fit','study','hub'];                 // known apps: always shown (even at 0)
var FB_KNOWN_LABEL={finance:'Finance',fit:'Fit',study:'Study',hub:'Hub',bugs:'Bugs',features:'Ideias',all:'Tudo'};
function fbAppKey(a){ return String(a||'').toLowerCase().replace(/^joelboard\s+/,'').trim(); }   // "Joelboard Study" -> "study"
function fbLabelFor(k){ return FB_KNOWN_LABEL[k] || (k.charAt(0).toUpperCase()+k.slice(1)); }
function fbAppKeys(){ // union of known apps + any app that appears in the feedback (auto-adds new apps)
  var set={}; FB_APP_ORDER.forEach(function(k){ set[k]=true; });
  fbEntries.forEach(function(e){ var k=fbAppKey(e.app); if(k) set[k]=true; });
  var known=FB_APP_ORDER.filter(function(k){ return set[k]; });
  var extra=Object.keys(set).filter(function(k){ return FB_APP_ORDER.indexOf(k)<0; }).sort();
  return known.concat(extra);
}
function fbInChip(e,f){ if(f==='all')return true; if(f==='bugs')return e.isBug; if(f==='features')return e.isFeature; return fbAppKey(e.app)===f; }
function fbInOpen(e){ return e.status==='New'||e.status==='Acknowledged'; }
function fbInSearch(e){ if(!fbSearchStr) return true; var q=fbSearchStr.toLowerCase(); return (e.name+' '+e.msg+' '+e.app+' '+e.type).toLowerCase().indexOf(q)>-1; }
function fbOnSearch(v){ fbSearchStr=v; renderFB(); }
function fbToggleOpen(btn){ fbOpenOnly=!fbOpenOnly; btn.classList.toggle('on',fbOpenOnly); renderFB(); }
function fbAppCls(a){ var k=fbAppKey(a); if(k==='fit')return 'fit'; if(k==='finance')return 'finance'; if(k==='study')return 'study'; return 'hub'; }
function fbColL(n){ var s=''; while(n>0){ var m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; }
function fbMailto(e){
  var appName=String(e.app||'').replace(/^Joelboard\s+/i,'');
  var sub='Re: seu feedback no Joelboard'+(appName?(' ('+appName+')'):'');
  var first=(e.name&&e.name!=='Anônimo')?(' '+e.name.split(/\s+/)[0]):'';
  var body='Oi'+first+',\n\nObrigado pelo feedback'+(e.type?(' ('+e.type.toLowerCase()+')'):'')+':\n\u201c'+e.msg+'\u201d\n\n';
  return 'https://mail.google.com/mail/?view=cm&fs=1&tf=1&to='+encodeURIComponent(e.email)+'&su='+encodeURIComponent(sub)+'&body='+encodeURIComponent(body);
}
function renderFB(){
  document.getElementById('fbStatNew').textContent=fbEntries.filter(function(e){return e.status==='New';}).length;
  document.getElementById('fbStatBug').textContent=fbEntries.filter(function(e){return e.isBug;}).length;
  document.getElementById('fbStatFeat').textContent=fbEntries.filter(function(e){return e.isFeature;}).length;
  var base=fbEntries.filter(function(e){ return (!fbOpenOnly||fbInOpen(e)) && fbInSearch(e); });
  renderFbChips(base);
  var vis=base.filter(function(e){return fbInChip(e,fbFilter);}), el=document.getElementById('fbList');
  if(!vis.length){ el.innerHTML='<div class="empty">Nada por aqui ainda.</div>'; return; }
  var canStatus=fbStatusCol>-1;
  el.innerHTML=vis.map(function(e){
    var ini=(e.name||'?').trim().split(/\s+/).slice(0,2).map(function(p){return (p[0]||'').toUpperCase();}).join('')||'?';
    var reply=e.email?('<a class="fbreply" href="'+fbMailto(e)+'" target="_blank" rel="noopener">✉ Responder</a>'):'';
    var statusSel=canStatus?('<select class="field fbsel" onchange="updateFB('+e.row+',this.value)">'+FB_STATUS.map(function(s){return '<option'+(s===e.status?' selected':'')+'>'+s+'</option>';}).join('')+'</select>'):'';
    var sel=(reply||statusSel)?('<div class="fbfoot">'+reply+statusSel+'</div>'):'';
    return '<div class="fbcard"><div class="fbtop"><div class="fbav">'+esc(ini)+'</div><div><div class="fbname">'+esc(e.name)+'</div><div class="fbwhen">'+esc(e.ts)+'</div></div></div><div class="fbbadges"><span class="fbbadge '+(e.isBug?'bug':'feat')+'">'+esc(e.type||'—')+'</span><span class="fbbadge '+fbAppCls(e.app)+'">'+esc(String(e.app||'—').replace(/^Joelboard\s+/i,''))+'</span></div><div class="fbmsg">'+esc(e.msg)+'</div>'+sel+'</div>';
  }).join('');
}
function updateFB(row,status){
  var e=fbEntries.find(function(x){return x.row===row;}); if(e) e.status=status; renderFB();
  if(fbStatusCol<0) return;
  var rng=fbTitle+'!'+fbColL(fbStatusCol+1)+row;
  JB.api('PUT','https://sheets.googleapis.com/v4/spreadsheets/'+FB_SHEET+'/values/'+encodeURIComponent(rng)+'?valueInputOption=RAW',{values:[[status]]}).catch(function(){ if(JB.toast)JB.toast('Erro ao salvar status'); });
}
function renderFbChips(base){ // chips = Tudo + one per app present (known apps always) + Bugs + Ideias, with live counts
  var defs=[{f:'all'}].concat(fbAppKeys().map(function(k){return {f:k};})).concat([{f:'bugs'},{f:'features'}]);
  if(defs.map(function(d){return d.f;}).indexOf(fbFilter)<0) fbFilter='all';
  document.getElementById('fbChips').innerHTML=defs.map(function(d){
    var n=base.filter(function(e){return fbInChip(e,d.f);}).length;
    return '<button class="fbchip'+(d.f===fbFilter?' on':'')+'" data-f="'+d.f+'" onclick="fbSetFilter(\''+d.f+'\')">'+esc(fbLabelFor(d.f))+' '+n+'</button>';
  }).join('');
}
function fbSetFilter(f){ fbFilter=f; renderFB(); }
function openHubSet(){ var em=JB.email(); var on=JB.isSignedIn(); document.getElementById("hubAcct").textContent = on?("Conectado: "+em):"Você não está conectado."; document.getElementById("hubAuthBtn").textContent = on?"Sair":"Entrar com Google"; JB.renderSkinPicker('hub', document.getElementById("hubSkins")); document.getElementById("hubSet").classList.add("open"); }
function closeHubSet(){ document.getElementById("hubSet").classList.remove("open"); }
function hubAuth(){ var on=JB.isSignedIn(); closeHubSet(); if(on) doOut(); else doIn(); }
function miniReplaceMsg(type, extra) {
  return new Promise(function (resolve) {
    var requestId = 'mrr' + Date.now() + Math.random().toString(36).slice(2);
    var timer = setTimeout(function () {
      window.removeEventListener('message', on);
      resolve({ ok: false, error: 'timeout' });
    }, 12000);
    function on(ev) {
      if (ev.source !== window || !ev.data || ev.data.type !== 'jb-mini-replace-reply' || ev.data.requestId !== requestId) return;
      clearTimeout(timer);
      window.removeEventListener('message', on);
      resolve(ev.data);
    }
    window.addEventListener('message', on);
    var msg = { type: type, requestId: requestId };
    if (extra) Object.keys(extra).forEach(function (k) { msg[k] = extra[k]; });
    window.postMessage(msg, '*');
  });
}

function miniEnsureReplaceSheet() {
  return JB.resolveSheet({ app: 'mini-replace', namePart: 'Joelboard Mini', requiredTabs: ['Replace', 'ReplaceVars', 'ReplaceSettings'] }).catch(function (err) {
    if (String(err.message || '') !== 'JB_NEED_SHEET') throw err;
    return JB.api('POST', 'https://sheets.googleapis.com/v4/spreadsheets', {
      properties: { title: 'Joelboard Mini' },
      sheets: [
        { properties: { title: 'Replace' } },
        { properties: { title: 'ReplaceVars' } },
        { properties: { title: 'ReplaceSettings' } },
        { properties: { title: 'ReplaceSites' } }
      ]
    }).then(function (ss) {
      JB.setSheetId('mini-replace', ss.spreadsheetId);
      return JB.api('POST', 'https://sheets.googleapis.com/v4/spreadsheets/' + ss.spreadsheetId + '/values:batchUpdate', {
        valueInputOption: 'RAW',
        data: [
          { range: 'Replace!A1', values: [['Nome', 'Trigger', 'Text', 'Enabled', 'ID']] },
          { range: 'ReplaceVars!A1', values: [['Chave', 'Valor']] },
          { range: 'ReplaceSettings!A1', values: [['Chave', 'Valor']] },
          { range: 'ReplaceSites!A1', values: [['Host']] }
        ]
      }).then(function () {
        return JB.sheetTabs(ss.spreadsheetId).then(function (grid) { return { id: ss.spreadsheetId, grid: grid }; });
      });
    });
  });
}

function miniEnsureReplaceSitesTab(ctx) {
  if (ctx.grid && ctx.grid.ReplaceSites != null) return Promise.resolve(ctx);
  return JB.api('POST', 'https://sheets.googleapis.com/v4/spreadsheets/' + ctx.id + ':batchUpdate', {
    requests: [{ addSheet: { properties: { title: 'ReplaceSites' } } }]
  }).then(function () {
    return JB.api('POST', 'https://sheets.googleapis.com/v4/spreadsheets/' + ctx.id + '/values:batchUpdate', {
      valueInputOption: 'RAW',
      data: [{ range: 'ReplaceSites!A1', values: [['Host']] }]
    });
  }).then(function () {
    return JB.sheetTabs(ctx.id).then(function (grid) { ctx.grid = grid; return ctx; });
  });
}

function miniMergeSites(a, b) {
  var seen = {}, out = [];
  (a || []).concat(b || []).forEach(function (h) {
    h = miniNormHost(h);
    if (h && !seen[h]) { seen[h] = 1; out.push(h); }
  });
  return out.length ? out : MINI_DEFAULT_SITES.slice();
}

function miniSitesFromRows(rows) {
  return miniSheetBody(rows || []).map(function (r) { return miniNormHost(r[0]); }).filter(Boolean);
}

function miniPushSitesToSheet(sites) {
  if (!JB.isSignedIn()) return Promise.resolve();
  sites = miniSaveSites(sites || miniLoadSites());
  return miniEnsureReplaceSheet().then(miniEnsureReplaceSitesTab).then(function (ctx) {
    var rows = sites.map(function (h) { return [h]; });
    return JB.api('POST', 'https://sheets.googleapis.com/v4/spreadsheets/' + ctx.id + '/values:batchUpdate', {
      valueInputOption: 'RAW',
      data: [{ range: 'ReplaceSites!A1', values: [['Host']].concat(rows) }]
    });
  });
}

function miniApplySitesFromSheet() {
  if (!JB.isSignedIn()) return Promise.resolve(miniLoadSites());
  return miniEnsureReplaceSheet().then(miniEnsureReplaceSitesTab).then(function (ctx) {
    return JB.api('GET', 'https://sheets.googleapis.com/v4/spreadsheets/' + ctx.id + '/values/ReplaceSites?valueRenderOption=UNFORMATTED_VALUE').then(function (res) {
      var remote = miniSitesFromRows(res.values || []);
      var merged = miniMergeSites(miniLoadSites(), remote);
      merged = miniSaveSites(merged);
      miniSyncSitesToExtensions(merged);
      miniRenderSites();
      return merged;
    });
  });
}

function miniSheetBody(rows) { return (rows || []).slice(1); }

function miniMergeReplaceData(local, remote) {
  local = local || { snippets: [], vars: {}, settings: {} };
  remote = remote || { snippets: [], vars: {}, settings: {} };
  var map = {};
  (local.snippets || []).forEach(function (s) { if (s.trigger) map[s.trigger] = s; });
  (remote.snippets || []).forEach(function (s) {
    if (!s.trigger) return;
    if (map[s.trigger]) {
      map[s.trigger].body = s.body;
      map[s.trigger].label = s.label;
      map[s.trigger].enabled = s.enabled !== false;
    } else map[s.trigger] = s;
  });
  return {
    snippets: Object.keys(map).map(function (k) { return map[k]; }),
    vars: Object.assign({}, remote.vars || {}, local.vars || {}),
    settings: Object.assign({}, remote.settings || {}, local.settings || {})
  };
}

function miniReplaceFromSheet(vrs) {
  var sn = miniSheetBody((vrs[0] && vrs[0].values) || []);
  var vr = miniSheetBody((vrs[1] && vrs[1].values) || []);
  var st = miniSheetBody((vrs[2] && vrs[2].values) || []);
  var snippets = sn.filter(function (r) { return r && (r[1] || r[2]); }).map(function (r) {
    return { id: String(r[4] || ''), label: String(r[0] || ''), trigger: String(r[1] || ''), body: String(r[2] != null ? r[2] : ''), enabled: String(r[3]) !== '0' };
  });
  var vars = {};
  vr.forEach(function (r) { if (r && r[0]) vars[String(r[0])] = r[1] == null ? '' : String(r[1]); });
  var settings = {};
  st.forEach(function (r) { if (r && r[0]) settings[String(r[0])] = String(r[1]) === '1'; });
  return { snippets: snippets, vars: vars, settings: settings };
}

function miniReplaceToSheet(data) {
  data = data || {};
  var snippets = (data.snippets || []).map(function (s) {
    return [s.label || '', s.trigger || '', s.body || '', s.enabled !== false ? '1' : '0', s.id || ''];
  });
  var vars = Object.keys(data.vars || {}).sort().map(function (k) { return [k, data.vars[k] == null ? '' : String(data.vars[k])]; });
  var settings = Object.keys(data.settings || {}).sort().map(function (k) { return [k, data.settings[k] ? '1' : '0']; });
  return { snippets: snippets, vars: vars, settings: settings };
}

function miniSyncReplaceViaHub() {
  return miniEnsureReplaceSheet().then(miniEnsureReplaceSitesTab).then(function (ctx) {
    return miniReplaceMsg('jb-mini-replace-get').then(function (ext) {
      var local = ext.ok ? ext.data : null;
      var ranges = ['Replace', 'ReplaceVars', 'ReplaceSettings', 'ReplaceSites'].map(function (t) {
        return 'ranges=' + encodeURIComponent(t);
      }).join('&');
      return JB.api('GET', 'https://sheets.googleapis.com/v4/spreadsheets/' + ctx.id + '/values:batchGet?' + ranges + '&valueRenderOption=UNFORMATTED_VALUE').then(function (res) {
        var vrs = res.valueRanges || [];
        var remote = miniReplaceFromSheet(vrs);
        var merged = miniMergeReplaceData(local, remote);
        var rows = miniReplaceToSheet(merged);
        var mergedSites = miniMergeSites(miniLoadSites(), miniSitesFromRows((vrs[3] && vrs[3].values) || []));
        mergedSites = miniSaveSites(mergedSites);
        miniSyncSitesToExtensions(mergedSites);
        var siteRows = mergedSites.map(function (h) { return [h]; });
        return JB.api('POST', 'https://sheets.googleapis.com/v4/spreadsheets/' + ctx.id + '/values:batchUpdate', {
          valueInputOption: 'RAW',
          data: [
            { range: 'Replace!A1', values: [['Nome', 'Trigger', 'Text', 'Enabled', 'ID']].concat(rows.snippets) },
            { range: 'ReplaceVars!A1', values: [['Chave', 'Valor']].concat(rows.vars) },
            { range: 'ReplaceSettings!A1', values: [['Chave', 'Valor']].concat(rows.settings) },
            { range: 'ReplaceSites!A1', values: [['Host']].concat(siteRows) }
          ]
        }).then(function () {
          return miniReplaceMsg('jb-mini-replace-set-sheet', { sheetId: ctx.id }).then(function () {
            return miniReplaceMsg('jb-mini-replace-set', { data: merged });
          });
        });
      });
    });
  });
}

function miniSyncReplace() {
  if (!JB.isSignedIn()) {
    JB.signIn({ onSuccess: miniSyncReplace });
    return;
  }
  var note = document.getElementById('miniReplaceSyncNote');
  if (note) note.textContent = 'Sincronizando…';
  miniReplaceMsg('jb-mini-replace-sync').then(function (res) {
    if (res.ok) {
      return miniApplySitesFromSheet().then(function () {
        if (JB.toast) JB.toast('✓ Replace sincronizado');
        if (note) note.textContent = 'Sincronizado via extensão (macros + sites).';
      });
    }
    return miniSyncReplaceViaHub().then(function () {
      miniRenderSites();
      if (JB.toast) JB.toast('✓ Replace sincronizado via Hub');
      if (note) note.textContent = 'Sincronizado via Hub (macros + sites permitidos).';
    });
  }).catch(function (e) {
    if (JB.toast) JB.toast('Erro: ' + ((e && e.message) || 'falha ao sincronizar'));
    if (note) note.textContent = 'Falha — instale a extensão Replace ou abra Ajustes → Nuvem no popup.';
  });
}

function closeMini(){ document.getElementById('miniViewer').classList.remove('open'); }

var MINI_SITES_KEY='jb_mini_sites';
var MINI_DEFAULT_SITES=['joelboard.vercel.app','docs.google.com','sheets.google.com','mail.google.com','github.com','notion.so','localhost'];
function miniNormHost(raw){
  var h=String(raw||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'').replace(/^www\./,'');
  return (!h||/\s/.test(h)||h.indexOf('/')>-1)?'':h;
}
function miniLoadSites(){
  try{ var s=JSON.parse(localStorage.getItem(MINI_SITES_KEY)||''); if(Array.isArray(s)&&s.length) return s.map(miniNormHost).filter(Boolean); }catch(_){}
  return MINI_DEFAULT_SITES.slice();
}
function miniSaveSites(sites){
  var clean=[]; (sites||[]).forEach(function(s){ var h=miniNormHost(s); if(h&&clean.indexOf(h)<0) clean.push(h); });
  if(!clean.length) clean=MINI_DEFAULT_SITES.slice();
  try{ localStorage.setItem(MINI_SITES_KEY,JSON.stringify(clean)); }catch(_){}
  return clean;
}
function miniSyncSitesToExtensions(sites){
  window.postMessage({type:'jb-mini-sites-set',sites:sites},'*');
  if(typeof chrome!=='undefined'&&chrome.runtime&&chrome.runtime.sendMessage){
    try{ chrome.runtime.sendMessage({type:'setSites',sites:sites}); }catch(_){}
  }
}
function miniRenderSites(){
  var list=document.getElementById('miniSitesList'); if(!list) return;
  var sites=miniLoadSites();
  list.innerHTML=sites.map(function(host){
    return '<span class="miniv-site-chip"><span>'+esc(host)+'</span>'
      +'<button type="button" class="miniv-site-rm" data-host="'+esc(host)+'" title="Remover">✕</button></span>';
  }).join('');
  list.querySelectorAll('.miniv-site-rm').forEach(function(btn){
    btn.onclick=function(){
      var h=btn.getAttribute('data-host');
      var next=miniSaveSites(miniLoadSites().filter(function(s){return s!==h;}));
      miniSyncSitesToExtensions(next);
      miniPushSitesToSheet(next).catch(function(){});
      miniRenderSites();
    };
  });
  var note=document.getElementById('miniSitesNote');
  if(note) note.textContent='Lista salva no Hub e na planilha Joelboard Mini. Com a extensão instalada, alterações sincronizam nesta aba e entre dispositivos.';
}
function miniAddSite(){
  var inp=document.getElementById('miniSiteInput'); if(!inp) return;
  var h=miniNormHost(inp.value); if(!h){ if(JB.toast) JB.toast('Domínio inválido'); return; }
  var sites=miniLoadSites(); if(sites.indexOf(h)<0) sites.push(h);
  sites=miniSaveSites(sites);
  miniSyncSitesToExtensions(sites);
  miniPushSitesToSheet(sites).catch(function(){});
  inp.value='';
  miniRenderSites();
  if(JB.toast) JB.toast('Site adicionado');
}
function openMini(){
  if (!JB.isSignedIn()) {
    JB.signIn({ onSuccess: function(){ setGreet(); document.getElementById('miniViewer').classList.add('open'); miniRenderSites(); miniApplySitesFromSheet().catch(function(){}); } });
    return;
  }
  document.getElementById('miniViewer').classList.add('open');
  miniRenderSites();
  if (JB.isSignedIn()) miniApplySitesFromSheet().catch(function () {});
}
JB.applySkin('hub');
if (JB.hasSession()) { JB.ensureToken(false).then(setGreet).catch(setGreet); } else { setGreet(); }
document.addEventListener('DOMContentLoaded',function(){
  hubNewsInit();
  var brand=document.getElementById('hubBrand');
  if(brand){
    brand.addEventListener('click', toggleJulioel);
    brand.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggleJulioel(); } });
  }
  var addBtn=document.getElementById('miniSiteAdd');
  var inp=document.getElementById('miniSiteInput');
  if(addBtn) addBtn.onclick=miniAddSite;
  if(inp) inp.onkeydown=function(e){ if(e.key==='Enter') miniAddSite(); };
  var syncBtn=document.getElementById('miniReplaceSync');
  if(syncBtn) syncBtn.onclick=miniSyncReplace;
});
