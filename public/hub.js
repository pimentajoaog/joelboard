/* Joelboard Hub — app logic. © 2026 Joel Soluções LTDA.
   Classic global script (NOT a module); loads after /joelboard.js. Edit behavior here, markup in the .html. */
var greetEl=document.getElementById("greet"), btnEl=document.getElementById("authbtn");
var _hbooted=false;
var HUB_NEWS=[
  { app:'fit', kind:'novo', text:'Aba Macros — registre alimentos por refeição e acompanhe metas de P/C/G e kcal.' },
  { app:'finance', kind:'correcao', text:'Editar conta “só deste mês” não marca mais como paga automaticamente.' },
  { app:'notas', kind:'correcao', text:'Erros ao salvar na planilha agora aparecem em vez de falhar em silêncio.' },
  { app:'notas', kind:'correcao', text:'Botão de data do Prazo no editor com tamanho normal.' },
  { app:'mini', kind:'novo', text:'Refresh: contador na aba durante auto-refresh; atalho e sites permitidos corrigidos.' }
];
var HUB_NEWS_LABEL={ fit:'Fit', finance:'Finance', notas:'Notas', mini:'Mini' };
var HUB_NEWS_KIND={ novo:'Novo', correcao:'Correção' };
function renderHubNews(){
  var el=document.getElementById('hubNews'); if(!el) return;
  el.innerHTML='<div class="nov-title">Novidades</div><ul class="nov-list">'+HUB_NEWS.map(function(n){
    return '<li class="nov-item"><div class="nov-meta"><span class="nov-app '+n.app+'">'+esc(HUB_NEWS_LABEL[n.app]||n.app)+'</span><span class="nov-kind '+n.kind+'">'+esc(HUB_NEWS_KIND[n.kind]||n.kind)+'</span></div>'+esc(n.text)+'</li>';
  }).join('')+'</ul>';
}
var HUB_TOUR=[
  { title:'Bem-vindo ao Joelboard 👋', body:'Seus apps pessoais num lugar só.' },
  { sel:'.grid', title:'Seus apps', body:'Toque num card para abrir Finance, Fit, Study, Notas ou Mini (extensões Chrome).' },
  { sel:'.gear', title:'Ajustes', body:'Tema e este tutorial ficam aqui.' }
];
function hubVerTutorial(){ closeHubSet(); setTimeout(function(){ JB.tour('hub', HUB_TOUR); }, 250); }
function setGreet(){ var em=JB.email(); var on=JB.isSignedIn(); greetEl.textContent= on?("Olá, "+em.split("@")[0]+" 👋"):"Olá 👋"; btnEl.textContent= on?"Sair":"Entrar"; btnEl.onclick= on?doOut:doIn; showFbTile(); if(on && !_hbooted){ _hbooted=true; if(!JB.tourDone('hub')) setTimeout(function(){ JB.tour('hub', HUB_TOUR); }, 700); } }
function doIn(){ JB.signIn({ onSuccess: function(){ setGreet(); } }); }
function doOut(){ JB.signOut(); setGreet(); }
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
      miniRenderSites();
    };
  });
  var note=document.getElementById('miniSitesNote');
  if(note) note.textContent='Lista salva no Hub. Com a extensão instalada, alterações aqui sincronizam automaticamente nesta aba.';
}
function miniAddSite(){
  var inp=document.getElementById('miniSiteInput'); if(!inp) return;
  var h=miniNormHost(inp.value); if(!h){ if(JB.toast) JB.toast('Domínio inválido'); return; }
  var sites=miniLoadSites(); if(sites.indexOf(h)<0) sites.push(h);
  sites=miniSaveSites(sites);
  miniSyncSitesToExtensions(sites);
  inp.value='';
  miniRenderSites();
  if(JB.toast) JB.toast('Site adicionado');
}
function openMini(){
  if (!JB.isSignedIn()) {
    JB.signIn({ onSuccess: function(){ setGreet(); document.getElementById('miniViewer').classList.add('open'); miniRenderSites(); } });
    return;
  }
  document.getElementById('miniViewer').classList.add('open');
  miniRenderSites();
}
JB.applySkin('hub');
if (JB.hasSession()) { JB.ensureToken(false).then(setGreet).catch(setGreet); } else { setGreet(); }
document.addEventListener('DOMContentLoaded',function(){
  renderHubNews();
  var addBtn=document.getElementById('miniSiteAdd');
  var inp=document.getElementById('miniSiteInput');
  if(addBtn) addBtn.onclick=miniAddSite;
  if(inp) inp.onkeydown=function(e){ if(e.key==='Enter') miniAddSite(); };
});
