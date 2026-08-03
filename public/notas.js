/* Joelboard Notas — app logic. © 2026 Joel Soluções LTDA.
   Classic global script (NOT a module); loads after /joelboard.js. Edit behavior here, markup in the .html. */
var DATA=null, notasGrid={}, authDone=false, openNoteId=null, homeQuery='', _nbooted=false, _stNotasHome=false, newDue='', _selMode=false, _sel={}, _renameNoteId=null, _edMenuOpen=false;
var HIDE_DONE_KEY='jb_notas_hide_done';
function hideDonePref(){ try{ return localStorage.getItem(HIDE_DONE_KEY)==='1'; }catch(_){ return false; } }
function setHideDonePref(on){ try{ localStorage.setItem(HIDE_DONE_KEY, on?'1':'0'); }catch(_){} _doneCollapsed=!!on; }
var _doneCollapsed=hideDonePref();
var _rowCache={};
function ssCacheId(){ return (typeof ncSsId==='function')?ncSsId():JB.getSheetId('notas'); }
function rowCacheKey(tab){ return ssCacheId()+'|'+tab; }
function seedRowCacheForSid(sid, tab, rows, idCol){
  var map={};
  for(var i=1;i<(rows||[]).length;i++){ var id=String((rows[i]||[])[idCol]); if(id) map[id]=i+1; }
  _rowCache[sid+'|'+tab]=map;
}
function seedRowCache(tab, rows, idCol){ seedRowCacheForSid(ssCacheId(), tab, rows, idCol); }
function invalidateRowCache(tab){ delete _rowCache[rowCacheKey(tab)]; }
function invalidateRowCacheForSid(sid, tab){ delete _rowCache[sid+'|'+tab]; }
function itemRowMap(tab, idCol){
  idCol=(idCol==null)?5:idCol;
  var key=rowCacheKey(tab), cached=_rowCache[key];
  if(cached) return Promise.resolve(cached);
  return JB.api('GET', ssUrl('/values/'+encodeURIComponent(tab)+'?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){
    seedRowCache(tab, res.values||[], idCol);
    return _rowCache[key]||{};
  });
}
function _ncSsId(){ return (typeof ncSsId==='function')?ncSsId():JB.getSheetId('notas'); }
function _ncGrid(){ return (typeof ncGrid==='function')?ncGrid():notasGrid; }
function noteDataTab(n){ return (n&&n.collabSheetId)?'Meta':'Notas'; }
var NOTAS_TABS=[['Notas',['Titulo','Tipo','Cor','Fixado','Criado','Atualizado','ID','Vence']],['Itens',['NotaID','Ordem','Texto','Marcavel','Feito','ID','Tipo']],['Config',['Chave','Valor']],['Compartilhadas',['Titulo','SheetID','Papel','Owner','ListaID','Atualizado']]];
var KINDS=[
  {k:'compras', label:'Compras', icon:'🛒', color:'#34d399', defCheck:true},
  {k:'tarefas', label:'Tarefas', icon:'✅', color:'#60a5fa', defCheck:true},
  {k:'nota',    label:'Nota',    icon:'📝', color:'#fbbf24', defCheck:false},
  {k:'viagem',  label:'Viagem',  icon:'🧳', color:'#22d3ee', defCheck:true}
];
var ICON_EXTRAS=['📌','⭐','🎯','💡','🏠','🎵','📚','🐶','🐱','💼','🎁','🍕','☕','🌱','💪','🎨','📷','✈️','🚗','💊','🎮','❤️','🔥','🌈','📎','🗂️','💬','🔔','⏰','🏋️','🧘','🛠️','📦','🌸','🍀','🎬','🏖️','🧁','🍳'];
var MOFULL=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function $(id){ return document.getElementById(id); }
function uuid(){ return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&0x3|0x8)).toString(16);}); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(s){ return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function normText(s){ return String(s==null?'':s).trim().toLowerCase(); }
function loadingHtml(h){ $('loading').style.display='block'; $('loading').innerHTML=h; }
function toast(m){ JB.toast(m); }
function notasWriteErr(e){ toast(JB.writeErrMessage ? JB.writeErrMessage(e) : ('Erro: '+((e&&e.message)||'falha ao salvar'))); }
function notasRowErr(tab){ return new Error('Registro não encontrado em '+tab+' — atualize a página.'); }
function kindDef(k){ for(var i=0;i<KINDS.length;i++){ if(KINDS[i].k===k) return KINDS[i]; } return KINDS[1]; }
function isCustomIcon(s){ var t=String(s||'').trim(); if(!t) return false; if(/^#[0-9a-fA-F]{3,8}$/.test(t)) return false; return true; }
function noteIcon(n){ if(!n) return '📝'; if(isCustomIcon(n.cor)) return String(n.cor).trim(); return kindDef(n.tipo).icon; }
function normalizeIconInput(s){ var p=Array.from(String(s||'').trim()); return p.length?p.slice(0,2).join(''):''; }
function noteIconDraft(tipo,cor){ return isCustomIcon(cor)?String(cor).trim():kindDef(tipo).icon; }
function todayISO(){ var d=new Date(); return d.getFullYear()+'-'+(d.getMonth()<9?'0':'')+(d.getMonth()+1)+'-'+(d.getDate()<10?'0':'')+d.getDate(); }
function daysSince(iso){ if(!iso) return 1e9; var d=new Date(iso); if(isNaN(d)) return 1e9; return Math.floor((Date.now()-d.getTime())/86400000); }
function daysBetween(a,b){ return Math.round((new Date(b)-new Date(a))/86400000); }
function relTime(iso){ if(!iso) return ''; var d=new Date(iso); if(isNaN(d)) return ''; var s=Math.floor((Date.now()-d.getTime())/1000); if(s<60) return 'agora'; var m=Math.floor(s/60); if(m<60) return 'há '+m+' min'; var h=Math.floor(m/60); if(h<24) return 'há '+h+'h'; var dd=Math.floor(h/24); if(dd===1) return 'ontem'; if(dd<7) return 'há '+dd+' dias'; var w=Math.floor(dd/7); if(w<5) return 'há '+w+(w===1?' semana':' semanas'); var mo=Math.floor(dd/30); return 'há '+mo+(mo===1?' mês':' meses'); }
function relSpan(days){ if(days<14) return days+' dias'; var w=Math.round(days/7); if(w<9) return w+' semanas'; var m=Math.round(days/30); return m+(m===1?' mês':' meses'); }
function parseDISO(x){ var p=String(x||'').split('-'); return new Date(Number(p[0]),Number(p[1])-1,Number(p[2])||1); }
function daysUntilD(iso){ if(!iso) return null; var t=new Date(); t.setHours(0,0,0,0); return Math.round((parseDISO(iso)-t)/86400000); }
var MO3=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function fmtDshort(iso){ var d=parseDISO(iso); return d.getDate()+' '+MO3[d.getMonth()]; }
function dueLabel(iso){ var n=daysUntilD(iso); if(n==null) return ''; if(n<0) return 'atrasada'; if(n===0) return 'hoje'; if(n===1) return 'amanhã'; if(n<=6) return 'em '+n+' dias'; return 'até '+fmtDshort(iso); }
function dueClass(iso){ var n=daysUntilD(iso); if(n==null) return ''; if(n<0) return 'over'; if(n<=2) return 'soon'; if(n<=7) return 'warn'; return ''; }
function noteChk(n){ return (DATA.itens||[]).filter(function(x){return x.notaId===n.id && x.marcavel;}); }
function noteOpen(n){ return noteChk(n).filter(function(x){return !x.feito;}).length; }
function noteDone(n){ var c=noteChk(n); return c.length>0 && c.every(function(x){return x.feito;}); }
function dueBadge(n){ if(!n.vence) return ''; if(noteDone(n)) return ' · <span class="due-badge done">✅ feito</span>'; return ' · <span class="due-badge '+dueClass(n.vence)+'">📅 '+esc(dueLabel(n.vence))+'</span>'; }
function dueStripHtml(){
  var ds=(DATA.notas||[]).filter(function(n){ return n.vence && !noteDone(n); }).filter(function(n){ var d=daysUntilD(n.vence); return d!=null && d<=14; }).sort(function(a,b){ return String(a.vence).localeCompare(String(b.vence)); }).slice(0,8);
  if(!ds.length) return '';
  return '<div class="secbar" style="margin-bottom:8px"><div class="sect">⏳ Com prazo</div></div><div class="due-strip">'+ds.map(function(n){ var kd=kindDef(n.tipo); var open=noteOpen(n); return '<div class="due-row" style="--kc:'+kd.color+'" onclick="openNote(\''+n.id+'\')"><span class="dr-ico">'+noteIcon(n)+'</span><span class="dr-title">'+esc(n.titulo)+'</span>'+(open?'<span class="dr-rem">faltam '+open+'</span>':'')+'<span class="due-badge '+dueClass(n.vence)+'">'+esc(dueLabel(n.vence))+'</span></div>'; }).join('')+'</div>';
}
function fmtDateBR(iso){ var p=String(iso||'').split('-'); return p.length===3? (p[2]+'/'+p[1]+'/'+p[0]) : iso; }
function pickNewDate(){ JB.datePicker(newDue, function(iso){ newDue=iso; renderNewDate(); }); }
function renderNewDate(){ var b=$('newDateBtn'); if(!b) return; b.textContent = newDue? fmtDateBR(newDue) : 'Escolher data…'; b.classList.toggle('empty', !newDue); }
function pickDue(){ var n=note(openNoteId); if(!n) return; JB.datePicker(n.vence, function(iso){ commitDue(iso); }); }
function commitDue(v){ var n=note(openNoteId); if(!n) return; n.vence=v||''; touchNote(n); renderEditor(); }
function clearDue(){ var n=note(openNoteId); if(!n) return; n.vence=''; touchNote(n); renderEditor(); }

/* ---- auth (shared core) ---- */
function startAuth(){
  if (JB.cachedToken()){ afterAuth(); return; }
  if (JB.bootAuthIfExpired(function(){ authDone=false; showSignIn(true); }, function(){ authDone=true; afterAuth(); })) return;
  loadingHtml('<div class="gate"><div class="gt">📝 Joelboard Notas</div><div class="gs">Entrando…</div></div>');
  JB.requestToken(false).then(function(){ authDone=true; afterAuth(); }).catch(showSignIn);
  setTimeout(function(){ if(!authDone && !JB.cachedToken()) showSignIn(); }, 16000);
}
JB.onSessionExpired(function(){ authDone=false; showSignIn(true); });
function showSignIn(expired){ loadingHtml('<div class="gate"><div class="gt">📝 Joelboard Notas</div><div class="gs">'+(expired?'Sua sessão expirou. Entre de novo com Google para continuar.':'Listas e notas que você marca — num lugar só.')+'</div><button class="btn" onclick="doSignIn()">Entrar com Google</button></div>'); }
function doSignIn(){ JB.signIn({ onSuccess: function(){ authDone=true; afterAuth(); } }); }
function notasSignOut(){ JB.signOut(); location.reload(); }
function afterAuth(){ loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Carregando…</div></div>'); JB.fetchEmail().then(bootSheet); }

/* ---- sheet bootstrap ---- */
function ssUrl(p){ return 'https://sheets.googleapis.com/v4/spreadsheets/'+_ncSsId()+p; }
function personalSsUrl(p){ return 'https://sheets.googleapis.com/v4/spreadsheets/'+JB.getSheetId('notas')+p; }
function bootSheet(){
  loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Procurando suas listas…</div></div>');
  JB.resolveSheet({ app:'notas', namePart:'Joelboard', requiredTabs: ['Notas','Itens'] })  /* distinctive tabs only — Config is shared */
    .then(function(ctx){ notasGrid=ctx.grid; return ensureTabs().then(ensureVenceHeader).then(ensureTipoHeader).then(loadData); })
    .catch(function(e){ var m=String((e&&e.message)||''); if(m.indexOf('silent_timeout')>-1||m.indexOf('auth_failed')>-1||m.indexOf('401')>-1||m.indexOf('cancelled')>-1){ showSignIn(); return; } if(m==='JB_NEED_SHEET'){ var f=(e.files||[]); if(f.length>1) offerLink(f[0]); else gate(); return; } loadingHtml('<div class="gate"><div class="gs" style="color:var(--primary)">Erro: '+esc(m)+'</div></div>'); });
}
function ensureTabs(){
  var missing=NOTAS_TABS.filter(function(t){ return notasGrid[t[0]]==null; });
  if(!missing.length) return Promise.resolve();
  return JB.api('POST', ssUrl(':batchUpdate'), { requests: missing.map(function(t){ return { addSheet:{ properties:{ title:t[0] } } }; }) })
    .then(function(res){ (res.replies||[]).forEach(function(rep){ if(rep&&rep.addSheet){ notasGrid[rep.addSheet.properties.title]=rep.addSheet.properties.sheetId; } });
      return JB.api('POST', ssUrl('/values:batchUpdate'), { valueInputOption:'RAW', data: missing.map(function(t){ return { range:t[0]+'!A1', values:[t[1]] }; }) }); });
}
function ensureGrid(tab, minCols){ var sid=notasGrid[tab]; if(sid==null) return Promise.resolve(); return JB.api('GET','https://sheets.googleapis.com/v4/spreadsheets/'+JB.getSheetId('notas')+'?fields=sheets(properties(sheetId,gridProperties(columnCount)))').then(function(meta){ var cc=0; (meta.sheets||[]).forEach(function(sh){ if(sh.properties.sheetId===sid) cc=((sh.properties.gridProperties)||{}).columnCount||0; }); if(cc>=minCols) return; return JB.api('POST', ssUrl(':batchUpdate'), { requests:[{ updateSheetProperties:{ properties:{ sheetId:sid, gridProperties:{ columnCount:minCols } }, fields:'gridProperties.columnCount' } }] }); }).catch(function(){}); }
function ensureTipoHeader(){ if(notasGrid['Itens']==null) return Promise.resolve(); return ensureGrid('Itens',7).then(function(){ return JB.api('GET', ssUrl('/values/'+encodeURIComponent('Itens!1:1'))); }).then(function(res){ var h=(res.values&&res.values[0])||[]; if(h[6]==='Tipo') return; return JB.api('PUT', ssUrl('/values/'+encodeURIComponent('Itens!G1')+'?valueInputOption=RAW'), { values:[['Tipo']] }); }).catch(function(){}); }
function ensureVenceHeader(){ if(notasGrid['Notas']==null) return Promise.resolve(); return ensureGrid('Notas',8).then(function(){ return JB.api('GET', ssUrl('/values/'+encodeURIComponent('Notas!1:1'))); }).then(function(res){ var h=(res.values&&res.values[0])||[]; if(h[7]==='Vence') return; return JB.api('PUT', ssUrl('/values/'+encodeURIComponent('Notas!H1')+'?valueInputOption=RAW'), { values:[['Vence']] }); }).catch(function(){}); }
function gate(){
  loadingHtml('<div class="gate"><div class="gt">📝 Comece suas listas</div><div class="gs">Crie sua planilha de notas — ela fica no seu Google Drive.</div>'
    + '<button class="btn-primary" onclick="createSheet()">✨ Criar minhas notas</button>'
    + '<div style="color:var(--muted);font-size:12px;margin:16px 0 10px">— ou já tem uma? —</div>'
    + '<input class="field" id="notasUrl" placeholder="Cole o link da planilha"><button class="btn ghost" style="width:100%;margin-top:10px" onclick="linkSheet()">Conectar planilha</button>'
    + '<div id="notasErr" style="color:var(--primary);font-size:12px;margin-top:10px"></div></div>');
}
function offerLink(f){ loadingHtml('<div class="gate"><div class="gt">Encontramos suas notas 🎉</div><div class="gs">'+esc(f.name)+'</div><button class="btn-primary" onclick="pick(\''+f.id+'\')">Vincular e abrir</button><button class="del" onclick="gate()">usar outro / criar novo</button></div>'); }
function pick(id){ JB.setSheetId('notas',id); bootSheet(); }
function linkSheet(){ var u=($('notasUrl').value||'').trim(); var m=u.match(/[a-zA-Z0-9_-]{30,}/); if(!m){ $('notasErr').textContent='Link inválido.'; return; } JB.setSheetId('notas',m[0]); bootSheet(); }
function createSheet(){
  loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Criando suas notas…</div></div>');
  var title='📝 Joelboard Notas — '+(JB.email()?JB.email().split('@')[0]:'Pessoal');
  JB.api('POST','https://sheets.googleapis.com/v4/spreadsheets',{ properties:{title:title}, sheets:NOTAS_TABS.map(function(t){return {properties:{title:t[0]}};}) })
    .then(function(ss){ JB.setSheetId('notas',ss.spreadsheetId);
      var data=NOTAS_TABS.map(function(t){return {range:t[0]+'!A1',values:[t[1]]};});
      return JB.api('POST','https://sheets.googleapis.com/v4/spreadsheets/'+ss.spreadsheetId+'/values:batchUpdate',{valueInputOption:'RAW',data:data});
    }).then(bootSheet).catch(function(e){ loadingHtml('<div class="gate"><div class="gs" style="color:var(--primary)">Erro ao criar: '+esc(e.message)+'</div></div>'); });
}

/* ---- load ---- */
function body(rows){ return (rows||[]).slice(1); }
function loadData(){
  loadingHtml(JB.skeletonHtml('notas'));
  var want=NOTAS_TABS.map(function(t){return t[0];}).filter(function(t){return notasGrid[t]!=null;});
  var ranges=want.map(function(t){return 'ranges='+encodeURIComponent(t);}).join('&');
  JB.api('GET', ssUrl('/values:batchGet?'+ranges+'&valueRenderOption=UNFORMATTED_VALUE')).then(function(res){
    var by={}; (res.valueRanges||[]).forEach(function(vr,i){ by[want[i]]=vr.values||[]; });
    DATA=buildNotas(by);
    var collabLoad=(typeof ncLoadCollabLists==='function')?ncLoadCollabLists():Promise.resolve();
    collabLoad.then(function(){ show(); }).catch(function(){ show(); });
  }).catch(function(e){ var m=String(e.message||''); if(m.indexOf('403')>-1||m.indexOf('404')>-1||m.indexOf('PERMISSION')>-1){ JB.clearSheetId('notas'); bootSheet(); return; } loadingHtml('<div class="gate"><div class="gs" style="color:var(--primary)">Erro: '+esc(e.message)+'</div></div>'); });
}
function parsePersonalItemRows(rows){
  var byId={}, out=[];
  body(rows).forEach(function(r){
    if(!r[5]) return;
    var id=String(r[5]);
    if(byId[id]) return;
    byId[id]=1;
    out.push({ id:r[5], notaId:String(r[0]||''), ordem:Number(r[1])||0, texto:String(r[2]||''), marcavel:!!r[3], feito:!!r[4], tipo:String(r[6]||'') });
  });
  return out;
}
function scrubItemDupes(scopeNotaId){
  var seen={}, changed=false;
  DATA.itens=(DATA.itens||[]).filter(function(x){
    if(scopeNotaId && x.notaId!==scopeNotaId) return true;
    if(seen[x.id]){ changed=true; return false; }
    seen[x.id]=1;
    return true;
  });
  return changed;
}
function buildNotas(t){
  var config={}; body(t.Config).forEach(function(r){ if(r[0]) config[r[0]]=r[1]; });
  return {
    notas: body(t.Notas).filter(function(r){return r[6];}).map(function(r){ return { id:r[6], titulo:String(r[0]||''), tipo:String(r[1]||'tarefas'), cor:String(r[2]||''), fixado:!!r[3], criado:String(r[4]||''), atualizado:String(r[5]||''), vence:String(r[7]||'') }; }),
    itens: parsePersonalItemRows(t.Itens),
    config: config
  };
}
function show(){ $('loading').style.display='none'; $('app').style.display='block'; $('acctEmail').textContent='👤 '+((typeof ncAcctLabel==='function')?ncAcctLabel():(JB.email()||'')); render(); if(!_nbooted){ _nbooted=true; if(typeof ncCheckJoinParam==='function') ncCheckJoinParam(); if(typeof ncStartCollabPoll==='function') ncStartCollabPoll(); if(!JB.tourDone('notas')) setTimeout(function(){ JB.tour('notas', NOTAS_TOUR); }, 600); else setTimeout(checkNudges, 400); } if(!window._jbTabSync){ window._jbTabSync=1; JB.onTabVisible(refreshData); JB.watchSheet('notas', refreshData); } }
function refreshData(){
  if(!$('app') || $('app').style.display==='none' || !DATA) return;
  if(typeof ncRefreshCollabOnly==='function' && openNoteId && note(openNoteId) && note(openNoteId).collabSheetId){ ncRefreshCollabOnly(true).then(function(res){ if(typeof ncHandlePollResult==='function') ncHandlePollResult(res); else if(res && res.changed) render(); }).catch(function(){}); return; }
  var want=NOTAS_TABS.map(function(t){return t[0];}).filter(function(t){return notasGrid[t]!=null;});
  var ranges=want.map(function(t){return 'ranges='+encodeURIComponent(t);}).join('&');
  JB.syncWrap(JB.api('GET', personalSsUrl('/values:batchGet?'+ranges+'&valueRenderOption=UNFORMATTED_VALUE')).then(function(res){
    var by={}; (res.valueRanges||[]).forEach(function(vr,i){ by[want[i]]=vr.values||[]; });
    DATA=buildNotas(by);
    var collabLoad=(typeof ncLoadCollabLists==='function')?ncLoadCollabLists():Promise.resolve();
    collabLoad.then(function(){ render(); }).catch(function(){ render(); });
  })).catch(function(){});
}

/* ---- routing / render ---- */
function note(id){ return (DATA.notas||[]).find(function(n){return n.id===id;}); }
function render(){ var ed=!!(openNoteId&&note(openNoteId)); $('fab').style.display=ed?'none':'flex'; if(ed) renderEditor(); else renderHomeShell(); updateSelBar(); }
function openNote(id){ openNoteId=id; _lastTick=null; _editId=null; _renameNoteId=null; _edMenuOpen=false; if(typeof ncSetCollabWatch==='function'){ var nn=note(id); ncSetCollabWatch(nn&&nn.collabSheetId?nn.collabSheetId:null); } render(); window.scrollTo(0,0); }
function backHome(){ openNoteId=null; _edMenuOpen=false; if(typeof ncSetCollabWatch==='function') ncSetCollabWatch(null); render(); }

/* ---- home ---- */
function renderHomeShell(){
  $('main').innerHTML='<div class="jb-search searchbar">'
    +'<input class="field jb-search-input" id="homeSearch" type="search" placeholder="Buscar listas…" value="'+escAttr(homeQuery)+'" oninput="onHomeSearch(this.value)" onfocus="JB.searchFocus(this)" onblur="JB.searchBlur(this)">'
    +'<button type="button" class="jb-search-clear" id="homeSearchClear" onclick="clearHomeSearch()" aria-label="Limpar busca" style="display:'+(homeQuery?'flex':'none')+'">✕</button>'
    +'</div><div id="homeList"></div>';
  renderHomeList();
}
function onHomeSearch(v){ homeQuery=v; JB.searchClearVis('homeSearch','homeSearchClear',!!v); renderHomeList(); }
function clearHomeSearch(){ homeQuery=''; var i=$('homeSearch'); if(i) i.value=''; JB.searchClearVis('homeSearch','homeSearchClear',false); renderHomeList(); }
function itemsOf(id){
  var seen={}, out=[];
  (DATA.itens||[]).filter(function(x){return x.notaId===id;}).sort(function(a,b){ return a.ordem-b.ordem; }).forEach(function(x){
    if(seen[x.id]) return;
    seen[x.id]=1;
    out.push(x);
  });
  return out;
}
function isGroup(it){ return !!(it && (it.tipo==='g' || /^g\d+$/.test(String(it.tipo)))); }
function groupDepth(it){ if(!isGroup(it)) return -1; if(it.tipo==='g') return 0; var m=String(it.tipo).match(/^g(\d+)$/); return m?parseInt(m[1],10):0; }
function makeGroupTipo(d){ d=d|0; return d<=0?'g':('g'+d); }
function groupIndex(its, gid){ for(var k=0;k<its.length;k++){ if(its[k].id===gid) return k; } return -1; }
function groupDescendantEnd(its, gi){
  if(gi<0 || !isGroup(its[gi])) return gi;
  var gDepth=groupDepth(its[gi]), last=gi;
  for(var j=gi+1;j<its.length;j++){ if(isGroup(its[j]) && groupDepth(its[j])<=gDepth) break; last=j; }
  return last;
}
function parentGroupIndex(its, gi){
  if(gi<0) return -1;
  var d=groupDepth(its[gi]);
  if(d<=0) return -1;
  for(var k=gi-1;k>=0;k--){ if(isGroup(its[k]) && groupDepth(its[k])===d-1) return k; }
  return -1;
}
function expandGroupChain(gid){
  var its=itemsOf(openNoteId), gi=groupIndex(its, gid);
  if(gi<0) return;
  for(var k=gi;k>=0;k--){ if(isGroup(its[k]) && its[k].feito){ its[k].feito=false; saveItemRow(its[k]); } }
}
function ordemAfter(its, afterIdx){
  var lastOrd=its[afterIdx].ordem, nextO=(afterIdx+1<its.length)?its[afterIdx+1].ordem:null;
  return (nextO!=null)?(lastOrd+nextO)/2:(lastOrd+1);
}
function visualDepthAt(its, idx){
  var stack=[];
  for(var i=0;i<=idx && i<its.length;i++){
    var it=its[i];
    if(isGroup(it)){
      var d=groupDepth(it);
      while(stack.length>d) stack.pop();
      stack.push(it);
    }
  }
  return stack.length;
}
function groupOrdemBounds(its, idx){
  var depth=visualDepthAt(its, idx);
  if(depth<=0) return { lo: its[idx].ordem, hi: null };
  for(var k=idx;k>=0;k--){
    if(!isGroup(its[k]) || groupDepth(its[k])!==depth-1) continue;
    var gDepth=groupDepth(its[k]), hi=null;
    for(var j=k+1;j<its.length;j++){
      if(isGroup(its[j]) && groupDepth(its[j])<=gDepth){ hi=its[j].ordem; break; }
    }
    return { lo: its[idx].ordem, hi: hi };
  }
  return { lo: its[idx].ordem, hi: null };
}
function insertOrdemInContext(its, idx){
  if(idx+1<its.length) return (its[idx].ordem+its[idx+1].ordem)/2;
  var b=groupOrdemBounds(its, idx);
  return (b.hi!=null)?(b.lo+b.hi)/2:(b.lo+1);
}
function listCollapseStack(its){
  var stack=[], out=[];
  for(var i=0;i<its.length;i++){
    var it=its[i];
    if(isGroup(it)){
      var d=groupDepth(it);
      while(stack.length>d) stack.pop();
      var hidden=stack.some(function(s){return s.collapsed;});
      out.push({item:it,depth:d,hidden:hidden,isGroup:true});
      stack.push({collapsed:!!it.feito});
    } else {
      var hid=stack.some(function(s){return s.collapsed;});
      out.push({item:it,depth:stack.length,hidden:hid,isGroup:false});
    }
  }
  return out;
}
function depthAttr(d){ return ' style="--gdepth:'+(d|0)+'" data-gd="'+(d|0)+'"'; }
function shiftGroupDepthsInBlock(block, delta){
  var changed=[];
  block.forEach(function(it){
    if(isGroup(it)){
      var nd=groupDepth(it)+delta; if(nd<0) nd=0;
      it.tipo=makeGroupTipo(nd); changed.push(it);
    }
  });
  return changed;
}
function prevGroupSibling(its, gi){
  var d=groupDepth(its[gi]);
  for(var k=gi-1;k>=0;k--){
    if(isGroup(its[k])){ var kd=groupDepth(its[k]); if(kd===d) return k; if(kd<d) return -1; }
  }
  return -1;
}
function nextGroupSibling(its, gi){
  var d=groupDepth(its[gi]), end=groupDescendantEnd(its,gi);
  for(var k=end+1;k<its.length;k++){
    if(isGroup(its[k])){ var kd=groupDepth(its[k]); if(kd===d) return k; if(kd<d) return -1; }
  }
  return -1;
}
function reorderItsBlock(its, fromGi, toGi){
  var fromEnd=groupDescendantEnd(its,fromGi), block=its.slice(fromGi,fromEnd+1);
  var rest=its.slice(0,fromGi).concat(its.slice(fromEnd+1));
  if(toGi>fromGi) toGi-=block.length;
  return rest.slice(0,toGi).concat(block,rest.slice(toGi));
}
function commitGroupStructure(its, changedItems){
  var idOrd={}; its.forEach(function(x,i){ idOrd[x.id]=i+1; });
  (DATA.itens||[]).forEach(function(x){ if(x.notaId===openNoteId && idOrd[x.id]!=null) x.ordem=idOrd[x.id]; });
  renderItems(); persistOrder();
  if(changedItems&&changedItems.length) persistItems(changedItems);
  var n=note(openNoteId); if(n) touchNote(n);
}
function groupCtrlState(gid){
  var its=itemsOf(openNoteId), gi=groupIndex(its,gid);
  if(gi<0) return { up:false, down:false, indent:false, outdent:false };
  var psi=prevGroupSibling(its,gi);
  return { up:psi>=0, down:nextGroupSibling(its,gi)>=0, indent:psi>=0&&isGroup(its[psi]), outdent:parentGroupIndex(its,gi)>=0 };
}
function groupMoveUp(gid){
  var its=itemsOf(openNoteId), gi=groupIndex(its,gid); if(gi<0) return;
  var psi=prevGroupSibling(its,gi); if(psi<0) return;
  commitGroupStructure(reorderItsBlock(its,gi,psi),[]);
}
function groupMoveDown(gid){
  var its=itemsOf(openNoteId), gi=groupIndex(its,gid); if(gi<0) return;
  var nsi=nextGroupSibling(its,gi); if(nsi<0) return;
  var nend=groupDescendantEnd(its,nsi);
  commitGroupStructure(reorderItsBlock(its,gi,nend+1),[]);
}
function groupIndent(gid){
  var its=itemsOf(openNoteId), gi=groupIndex(its,gid); if(gi<0) return;
  var psi=prevGroupSibling(its,gi); if(psi<0||!isGroup(its[psi])) return;
  var fromEnd=groupDescendantEnd(its,gi), pend=groupDescendantEnd(its,psi);
  var block=its.slice(gi,fromEnd+1), changed=shiftGroupDepthsInBlock(block,1);
  var rest=its.slice(0,gi).concat(its.slice(fromEnd+1));
  var insertAt=pend+1; if(gi<insertAt) insertAt-=block.length;
  var next=rest.slice(0,insertAt).concat(block,rest.slice(insertAt));
  if(!dragOrderValid(next.map(function(x){return x.id;}))){ renderItems(); return; }
  commitGroupStructure(next,changed);
}
function groupOutdent(gid){
  var its=itemsOf(openNoteId), gi=groupIndex(its,gid); if(gi<0) return;
  var pi=parentGroupIndex(its,gi); if(pi<0) return;
  var fromEnd=groupDescendantEnd(its,gi);
  var block=its.slice(gi,fromEnd+1), changed=shiftGroupDepthsInBlock(block,-1);
  var rest=its.slice(0,gi).concat(its.slice(fromEnd+1));
  var insertAt=groupDescendantEnd(rest,pi)+1;
  var next=rest.slice(0,insertAt).concat(block,rest.slice(insertAt));
  if(!dragOrderValid(next.map(function(x){return x.id;}))){ renderItems(); return; }
  commitGroupStructure(next,changed);
}
function groupNameKey(e,id){
  if(e.key==='Escape'){ e.preventDefault(); exitEdit(); return; }
  if(e.key==='Tab'){ e.preventDefault(); if(e.shiftKey) groupOutdent(id); else groupIndent(id); return; }
  if(e.key==='ArrowUp'&&e.altKey){ e.preventDefault(); groupMoveUp(id); return; }
  if(e.key==='ArrowDown'&&e.altKey){ e.preventDefault(); groupMoveDown(id); return; }
  if(e.key==='Enter'){ e.preventDefault(); if(e.target.classList&&e.target.classList.contains('gname-view')) startEdit(id); else e.target.blur(); }
}
function renderHomeList(){
  var el=$('homeList'); if(!el) return; var q=normText(homeQuery);
  var ns=(DATA.notas||[]).slice().sort(function(a,b){ return String(b.atualizado||b.criado||'').localeCompare(String(a.atualizado||a.criado||'')); });
  if(q) ns=ns.filter(function(n){ if(normText(n.titulo).indexOf(q)>-1) return true; return (DATA.itens||[]).some(function(it){return it.notaId===n.id && normText(it.texto).indexOf(q)>-1;}); });
  if(!ns.length){ el.innerHTML = (DATA.notas&&DATA.notas.length)? JB.emptyState({ icon:'🔎', title:'Nada encontrado', hint:'Tente outro termo na busca.' }) : JB.emptyState({ icon:'📝', title:'Nenhuma lista ainda', hint:'Crie listas de compras, tarefas, viagens e notas.', action:'+ Nova lista', onclick:'openNew()' }); return; }
  var shared=ns.filter(function(n){return n.collabSheetId;}), priv=ns.filter(function(n){return !n.collabSheetId;});
  var pinned=priv.filter(function(n){return n.fixado;}), rest=priv.filter(function(n){return !n.fixado;});
  var html=(q?'':dueStripHtml());
  if(shared.length && !q){ html+='<div class="secbar"><div class="sect">👥 Compartilhadas</div></div><div class="notes-grid nc-shared-grid">'+shared.map(noteCard).join('')+'</div>'; }
  if(pinned.length){ html+='<div class="secbar pin-sect"><div class="sect">📌 Fixadas</div></div><div class="notes-grid">'+pinned.map(noteCard).join('')+'</div>'; }
  if(rest.length){ if(pinned.length || (shared.length && !q)) html+='<div class="secbar" style="margin-top:18px"><div class="sect">Minhas listas</div></div>'; html+='<div class="notes-grid">'+rest.map(noteCard).join('')+'</div>'; }
  el.innerHTML=html;
  if (!_stNotasHome && !q) {
    _stNotasHome = true;
    el.querySelectorAll('.notes-grid').forEach(function (g, i) { JB.staggerChildren(g, 'notas-' + i); });
  }
}
function noteCard(n){
  var kd=kindDef(n.tipo);
  if(_renameNoteId===n.id){
    return '<div class="notec notec-rename" style="--kc:'+kd.color+'" onclick="event.stopPropagation()">'
      +'<input class="nc-rename-inp field" data-rename="'+n.id+'" value="'+escAttr(n.titulo||'')+'" placeholder="Nome da lista" aria-label="Nome da lista" onkeydown="noteRenameKey(event,\''+n.id+'\')" onblur="commitNoteRename(\''+n.id+'\',this.value)">'
      +'</div>';
  }
  var its=itemsOf(n.id).filter(function(x){return !isGroup(x);}); var chk=its.filter(function(x){return x.marcavel;}); var done=chk.filter(function(x){return x.feito;}).length;
  var prog = chk.length ? ('<div class="nc-pbar"><span style="width:'+Math.round(done/chk.length*100)+'%"></span></div>') : '';
  var metaCount = chk.length ? (done+'/'+chk.length+' feitos') : (its.length+' '+(its.length===1?'linha':'linhas'));
  var avatars = (typeof ncMemberAvatarsHtml==='function')?ncMemberAvatarsHtml(n):'';
  var sharedBadge = n.collabSheetId ? '<span class="nc-shared">Compartilhada</span>' : '';
  return '<div class="notec'+(n.collabSheetId?' notec-shared':'')+'" style="--kc:'+kd.color+'" onclick="openNote(\''+n.id+'\')">'
    +'<div class="nc-top"><button type="button" class="nc-ico" onclick="startNoteIconEdit(event,\''+n.id+'\')" title="Alterar ícone" aria-label="Alterar ícone">'+noteIcon(n)+'</button><div class="nc-title">'+esc(n.titulo||'(sem título)')+'</div>'+(n.collabSheetId?'':('<button class="nc-edit" onclick="startNoteRename(event,\''+n.id+'\')" title="Renomear">✎</button><button class="nc-pin'+(n.fixado?' on':'')+'" onclick="togglePin(event,\''+n.id+'\')" title="Fixar">'+(n.fixado?'★':'☆')+'</button>'))+'</div>'
    +'<div class="nc-kind">'+sharedBadge+esc(kd.label)+'</div>'
    +'<div class="nc-meta">'+metaCount+' · '+esc(relTime(n.atualizado||n.criado))+dueBadge(n)+'</div>'+(avatars?('<div class="nc-members">'+avatars+'</div>'):'')+prog+'</div>';
}
function startNoteRename(ev,id){ ev.stopPropagation(); _renameNoteId=id; renderHomeList(); setTimeout(function(){ var inp=document.querySelector('[data-rename="'+id+'"]'); if(inp){ inp.focus(); inp.select(); } },30); }
function startNoteIconEdit(ev,id){ ev.stopPropagation(); openIconPicker(id); }
function refreshAfterIconChange(ctx){ if(openNoteId===ctx) renderEditor(); else renderHomeList(); }
function noteRenameKey(ev,id){ if(ev.key==='Enter'){ ev.preventDefault(); commitNoteRename(id,ev.target.value); } if(ev.key==='Escape'){ ev.preventDefault(); cancelNoteRename(); } }
function commitNoteRename(id,val){ var n=note(id); if(n){ var v=(val||'').trim()||'(sem título)'; if(v!==n.titulo){ n.titulo=v; touchNote(n); } } _renameNoteId=null; renderHomeList(); }
function cancelNoteRename(){ _renameNoteId=null; renderHomeList(); }
function togglePin(ev,id){ ev.stopPropagation(); var n=note(id); if(!n) return; n.fixado=!n.fixado; renderHomeList(); saveNoteRow(n); }

/* ---- new note ---- */
var newKind='tarefas', newCustomIcon='', _iconPickCtx=null;
function openNew(){ newKind='tarefas'; newCustomIcon=''; renderNewIconPicker(); renderNewKind(); $('newTitle').value=''; newDue=''; renderNewDate(); $('newOverlay').classList.add('open'); setTimeout(function(){ $('newTitle').focus(); },60); }
function closeNew(){ $('newOverlay').classList.remove('open'); }
function renderNewKind(){ var el=$('newKindWrap'); if(!el) return; var cur=kindDef(newKind); el.innerHTML='<div class="jb-dd"><button type="button" class="jb-dd-btn" onclick="JB.ddToggle(this)"><span>'+esc(cur.label)+'</span><span class="jb-dd-caret">▾</span></button><div class="jb-dd-menu">'+KINDS.map(function(k){return '<div class="jb-dd-opt'+(k.k===newKind?' is-sel':'')+'" onclick="pickNewKind(\''+k.k+'\')">'+k.icon+' '+esc(k.label)+'</div>';}).join('')+'</div></div>'; }
function pickNewKind(k){ newKind=k; if(window.JB&&JB.ddClose)JB.ddClose(); renderNewKind(); }
function renderIconPickerBody(ctx){
  var isNew=ctx==='new', n=isNew?null:note(ctx);
  var curIcon=isNew?noteIconDraft(newKind,newCustomIcon):noteIcon(n);
  var curKind=isNew?newKind:(n&&n.tipo)||'tarefas';
  var customVal=isNew?(newCustomIcon||''):((n&&isCustomIcon(n.cor))?n.cor:'');
  var h='<div class="icon-pick"><div class="icon-pick-preview">'+curIcon+'</div><div class="icon-pick-label">Presets</div><div class="icon-pick-grid">';
  KINDS.forEach(function(k){
    var on=k.k===curKind && !customVal;
    h+='<button type="button" class="icon-pick-btn'+(on?' on':'')+'" onclick="applyIconPreset(\''+escAttr(String(ctx))+'\',\''+k.k+'\')" title="'+escAttr(k.label)+'">'+k.icon+'</button>';
  });
  h+='</div><div class="icon-pick-label">Mais</div><div class="icon-pick-grid icon-pick-grid-sm">';
  ICON_EXTRAS.forEach(function(ic,i){
    var on=curIcon===ic;
    h+='<button type="button" class="icon-pick-btn'+(on?' on':'')+'" onclick="applyIconExtra(\''+escAttr(String(ctx))+'\','+i+')">'+ic+'</button>';
  });
  h+='</div><div class="icon-pick-custom"><label class="fl">Outro emoji</label><input class="field" id="iconPickCustom" maxlength="8" placeholder="Cole ou digite…" value="'+escAttr(customVal)+'" oninput="applyIconCustom(\''+escAttr(String(ctx))+'\',this.value)"></div>';
  if(customVal) h+='<button type="button" class="btn ghost icon-pick-reset" onclick="applyIconReset(\''+escAttr(String(ctx))+'\')">Usar ícone do tipo</button>';
  h+='</div>';
  return h;
}
function renderNewIconPicker(){ var el=$('newIconWrap'); if(el) el.innerHTML=renderIconPickerBody('new'); }
function openIconPicker(ctx){ _iconPickCtx=ctx; var b=$('iconPickBody'); if(b) b.innerHTML=renderIconPickerBody(ctx); var ov=$('iconOverlay'); if(ov) ov.classList.add('open'); }
function closeIconPicker(){
  var ctx=_iconPickCtx;
  var ov=$('iconOverlay'); if(ov) ov.classList.remove('open');
  _iconPickCtx=null;
  if(ctx && ctx!=='new') refreshAfterIconChange(ctx);
}
function applyIconPreset(ctx,kind){
  if(ctx==='new'){ newKind=kind; newCustomIcon=''; renderNewIconPicker(); return; }
  var n=note(ctx); if(!n) return;
  n.tipo=kind; n.cor=''; touchNote(n); saveNoteRow(n); closeIconPicker();
}
function applyIconExtra(ctx,idx){
  var ic=ICON_EXTRAS[idx]; if(!ic) return;
  if(ctx==='new'){ newCustomIcon=ic; renderNewIconPicker(); return; }
  var n=note(ctx); if(!n) return;
  n.cor=ic; touchNote(n); saveNoteRow(n); closeIconPicker();
}
function applyIconCustom(ctx,val){
  var ic=normalizeIconInput(val);
  if(ctx==='new'){ newCustomIcon=ic; renderNewIconPicker(); return; }
  var n=note(ctx); if(!n) return;
  n.cor=ic; touchNote(n); saveNoteRow(n);
  var b=$('iconPickBody'); if(b) b.innerHTML=renderIconPickerBody(ctx);
  refreshAfterIconChange(ctx);
}
function applyIconReset(ctx){
  if(ctx==='new'){ newCustomIcon=''; renderNewIconPicker(); return; }
  var n=note(ctx); if(!n) return;
  n.cor=''; touchNote(n); saveNoteRow(n); closeIconPicker();
}
function createNote(){ var t=($('newTitle').value||'').trim(); var kd=kindDef(newKind); if(!t){ var d=new Date(); t=kd.label+' — '+MOFULL[d.getMonth()]; } var now=new Date().toISOString(); var n={ id:uuid(), titulo:t, tipo:newKind, cor:newCustomIcon||'', fixado:false, criado:now, atualizado:now, vence:newDue }; DATA.notas=DATA.notas||[]; DATA.notas.push(n); appendNote(n); closeNew(); openNote(n.id); }

function noteProgressStats(){
  var its=itemsOf(openNoteId).filter(function(x){ return !isGroup(x) && x.marcavel; });
  var done=0; its.forEach(function(x){ if(x.feito) done++; });
  return { total:its.length, done:done, open:its.length-done, pct:its.length?Math.round(done/its.length*100):0 };
}
function toggleDoneCollapsed(){ setHideDonePref(!_doneCollapsed); renderItems(); }
function toggleHideDonePref(){ setHideDonePref(!hideDonePref()); var el=$('setHideDone'); if(el) el.classList.toggle('on', hideDonePref()); if(openNoteId) renderItems(); }
function toggleEdMenu(ev){ if(ev) ev.stopPropagation(); _edMenuOpen=!_edMenuOpen; var m=$('edMenu'); if(m) m.classList.toggle('open', _edMenuOpen); }
function closeEdMenu(){ _edMenuOpen=false; var m=$('edMenu'); if(m) m.classList.remove('open'); }
function edMenuDelChecked(){ closeEdMenu(); deleteChecked(); }
function renderEdDueChip(n){
  if(!n.vence) return '';
  if(noteDone(n)) return '<span class="ed-chip ed-due done">✅ feito</span>';
  return '<span class="ed-chip ed-due '+dueClass(n.vence)+'" onclick="pickDue()">📅 '+esc(dueLabel(n.vence))+'</span>';
}
function renderEdProgress(n){
  var st=noteProgressStats();
  if(!st.total) return '<span class="ed-chip ed-prog">0 itens</span>';
  return '<span class="ed-chip ed-prog">'+st.done+'/'+st.total+' feitos</span><div class="ed-progbar"><span style="width:'+st.pct+'%"></span></div>';
}
function renderEdMenu(n, doneN){
  var shareBtn=n.collabSheetId?'<button type="button" class="ed-menu-item" onclick="closeEdMenu();ncOpenShare()">👥 Compartilhar</button>':'<button type="button" class="ed-menu-item" onclick="closeEdMenu();ncShareFromPrivate()">👥 Tornar compartilhada</button>';
  var dueBtn=n.vence?'<button type="button" class="ed-menu-item" onclick="closeEdMenu();pickDue()">📅 Alterar prazo</button><button type="button" class="ed-menu-item danger" onclick="closeEdMenu();clearDue()">Remover prazo</button>':'<button type="button" class="ed-menu-item" onclick="closeEdMenu();pickDue()">📅 Definir prazo</button>';
  var delChecked='<button type="button" class="ed-menu-item danger" id="edMenuDelChecked" onclick="edMenuDelChecked()" style="display:'+(doneN?'':'none')+'">🗑 Excluir marcados ('+doneN+')</button>';
  var hideDoneBtn=doneN>0?('<button type="button" class="ed-menu-item" onclick="closeEdMenu();toggleDoneCollapsed()">'+(_doneCollapsed?'👁 Mostrar concluídos ('+doneN+')':'📦 Ocultar concluídos ('+doneN+')')+'</button>'):'';
  var dedupeBtn='<button type="button" class="ed-menu-item" onclick="closeEdMenu();dedupeItems(\''+n.id+'\')">🧹 Remover duplicatas</button>';
  var leaveLabel=n.collabSheetId?(n.collabRole==='owner'?'Excluir lista compartilhada':'Sair da lista'):'Excluir lista';
  var leaveFn=n.collabSheetId?'ncLeaveOrDelete()':'deleteNote()';
  return '<div class="ed-menu-wrap"><button type="button" class="ed-menu-btn" onclick="toggleEdMenu(event)" aria-label="Mais opções">⋯</button><div class="ed-menu" id="edMenu" onclick="event.stopPropagation()"><button type="button" class="ed-menu-item" onclick="closeEdMenu();exportCurrentList()">📤 Exportar</button>'+shareBtn+dueBtn+hideDoneBtn+delChecked+dedupeBtn+'<div class="ed-menu-div"></div><button type="button" class="ed-menu-item danger" onclick="closeEdMenu();'+leaveFn+'">'+esc(leaveLabel)+'</button></div></div>';
}

/* ---- editor ---- */
function renderEditor(){
  var n=note(openNoteId); if(!n){ openNoteId=null; renderHomeShell(); return; }
  var kd=kindDef(n.tipo); var src=lastNoteOfKind(n.tipo,n.id); var fc=fillableCount(n,src); var doneN=itemsOf(openNoteId).filter(function(x){return !isGroup(x) && x.marcavel && x.feito;}).length;
  var avatars=(typeof ncMemberAvatarsHtml==='function'&&n.collabSheetId)?('<div class="ed-head-avatars">'+ncMemberAvatarsHtml(n)+'</div>'):'';
  var html='<div class="ed-shell" style="--kc:'+kd.color+'" onclick="closeEdMenu()">'
    +'<div class="ed-top"><button class="lnk ed-back" onclick="backHome()">← Listas</button>'+(_selMode?'':renderEdMenu(n,doneN))+'</div>'
    +'<div class="ed-head"><button type="button" class="ed-ico" onclick="openIconPicker(\''+n.id+'\')" title="Alterar ícone" aria-label="Alterar ícone">'+noteIcon(n)+'</button><input class="ed-title" id="edTitle" value="'+escAttr(n.titulo)+'" placeholder="Nome da lista" aria-label="Nome da lista" onblur="commitTitle(this.value)" onkeydown="if(event.key===\'Enter\')this.blur()">'+avatars+'</div>'
    +'<div class="ed-meta">'
    +'<span class="ed-chip ed-kind">'+esc(kd.label)+'</span>'
    +renderEdProgress(n)
    +renderEdDueChip(n)
    +'</div>'
    +(_selMode? '' : (fc && !fillDismissed(n.id)? '<div class="fillrow fillrow-slim"><button class="fillbtn" onclick="fillFromLast()">↻ Preencher da última vez — <b>'+fc+' '+(fc>1?'itens':'item')+'</b> de "'+esc(src.titulo)+'"</button><button type="button" class="fill-dismiss" onclick="dismissFill()" title="Ocultar">✕</button></div>':''))
    +'<div class="ed-items-panel"><div id="edItems"></div></div>'
    +(_selMode? '' :
      '<div class="ed-add-card" onclick="event.stopPropagation()">'
        +'<div class="iadd"><span class="ico">+</span><input id="addInput" placeholder="Adicionar item… (Enter · cole várias linhas)" autocomplete="off" oninput="renderUsuals()" onkeydown="if(event.key===\'Enter\'){event.preventDefault();addItemFromInput();}" onpaste="addPaste(event)"><button type="button" class="iadd-go" onclick="addItemFromInput()" title="Adicionar">↵</button></div>'
        +'<div class="uwrap" id="edUsuals"></div>'
        +'<button type="button" class="ed-add-group" onclick="addGroup()">+ Adicionar grupo</button>'
      +'</div>')
    +'</div>';
  $('main').innerHTML=html; renderItems(); if(!_selMode) renderUsuals(); updateSelBar();
  if(_edMenuOpen){ var m=$('edMenu'); if(m) m.classList.add('open'); }
}
function renderItems(){
  scrubItemDupes(openNoteId);
  var el=$('edItems'); if(!el) return; var n=note(openNoteId); var its=itemsOf(openNoteId);
  if(!its.length){ el.innerHTML='<div class="rg" style="padding:8px 0">Lista vazia. Adicione itens abaixo'+(kindDef(n.tipo).defCheck?'':' — toque em ☑ para tornar uma linha marcável')+'.</div>'; return; }
  var layout=listCollapseStack(its), html='', togglePlaced=false;
  var doneN=layout.filter(function(m){ return !m.isGroup && !m.hidden && m.item.marcavel && m.item.feito; }).length;
  layout.forEach(function(m){
    if(m.isGroup){ html+=groupRow(m.item,m.depth,m.hidden); return; }
    var isDone=m.item.marcavel && m.item.feito;
    var hideDone=isDone && _doneCollapsed && m.item.id!==_editId;
    if(_doneCollapsed && !togglePlaced && isDone && !m.hidden && doneN>0){
      html+=doneToggleRow(doneN);
      togglePlaced=true;
    }
    html+=itemRow(m.item, m.hidden||hideDone, m.depth);
  });
  if(_doneCollapsed && !togglePlaced && doneN>0) html+=doneToggleRow(doneN);
  el.className='ed-items-tree';
  el.innerHTML=html;
  var ed=el.querySelector('#editTA'); if(ed){ ed.focus(); try{ var L=ed.value.length; ed.setSelectionRange(L,L); }catch(e){} if(ed.tagName==='TEXTAREA') autoGrow(ed); }
  updateDelChecked(); updateSelBar();
}
function doneToggleRow(n){
  return '<button type="button" class="ed-done-toggle" onclick="toggleDoneCollapsed()">✓ '+n+' concluído'+(n>1?'s':'')+' — mostrar</button>';
}
function updateDelChecked(){ var b=$('edMenuDelChecked'); if(!b) return; var dn=itemsOf(openNoteId).filter(function(x){return !isGroup(x) && x.marcavel && x.feito;}).length; b.style.display=dn?'':'none'; b.textContent='🗑 Excluir marcados ('+dn+')'; }
function autoGrow(t){ if(!t) return; t.style.height='auto'; t.style.height=(t.scrollHeight)+'px'; }
function groupStats(gid){
  var its=itemsOf(openNoteId), gi=groupIndex(its,gid);
  if(gi<0) return {done:0,total:0};
  var gDepth=groupDepth(its[gi]), done=0,total=0;
  for(var j=gi+1;j<its.length;j++){
    if(isGroup(its[j]) && groupDepth(its[j])<=gDepth) break;
    if(its[j].marcavel){ total++; if(its[j].feito) done++; }
  }
  return {done:done,total:total};
}
function groupRow(g, depth, hidden){
  depth=depth|0; hidden=!!hidden;
  var st=groupStats(g.id); var allon=st.total>0 && st.done===st.total;
  var chk = st.total>1 ? '<button class="ichk gchk'+(allon?' on':(st.done>0?' part':''))+'" onclick="toggleGroupAll(\''+g.id+'\')" title="Marcar/desmarcar todos">'+(allon?'✓':(st.done>0?'–':''))+'</button>' : '';
  var cs=groupCtrlState(g.id);
  var gctrl='<span class="gctrls">'
    +'<button type="button" class="gctrl'+(cs.outdent?'':' off')+'" onclick="groupOutdent(\''+g.id+'\')" title="Promover — subir nível (Shift+Tab)"'+(cs.outdent?'':' disabled')+'>◂</button>'
    +'<button type="button" class="gctrl'+(cs.indent?'':' off')+'" onclick="groupIndent(\''+g.id+'\')" title="Recuar — entrar no grupo acima (Tab)"'+(cs.indent?'':' disabled')+'>▸</button>'
    +'<button type="button" class="gctrl'+(cs.up?'':' off')+'" onclick="groupMoveUp(\''+g.id+'\')" title="Mover para cima (Alt+↑)"'+(cs.up?'':' disabled')+'>↑</button>'
    +'<button type="button" class="gctrl'+(cs.down?'':' off')+'" onclick="groupMoveDown(\''+g.id+'\')" title="Mover para baixo (Alt+↓)"'+(cs.down?'':' disabled')+'>↓</button>'
    +'</span>';
  return '<div class="ihdr gdepth-'+(depth|0)+(g.feito?' collapsed':'')+(hidden?' ihide':'')+'" data-id="'+g.id+'" data-g="1"'+depthAttr(depth)+'>'
  +'<button class="ihandle" onpointerdown="dragBegin(event,\''+g.id+'\')" title="Arrastar para reordenar">⠿</button>'
  +'<button class="gchev" onclick="toggleGroup(\''+g.id+'\')" title="Expandir/recolher">'+(g.feito?'▸':'▾')+'</button>'+chk
  +((g.id===_editId)
     ? '<input class="gname" id="editTA" value="'+escAttr(g.texto)+'" placeholder="Nome do grupo" autocomplete="off" onblur="commitText(\''+g.id+'\',this.value);exitEdit();" onkeydown="groupNameKey(event,\''+g.id+'\')">'
     : '<div class="gname gname-view" onclick="startEdit(\''+g.id+'\')" tabindex="0" onkeydown="groupNameKey(event,\''+g.id+'\')">'+(g.texto?mdToHtml(g.texto):'<span class="iplace">Nome do grupo</span>')+'</div>')
  +'<span class="gcount">'+(st.total?(st.done+'/'+st.total):'')+'</span>'
  +gctrl
  +'<button class="gadd" onclick="addToGroup(\''+g.id+'\')" title="Adicionar item neste grupo">+</button>'
  +'<button class="gsub" onclick="addSubgroup(\''+g.id+'\')" title="Adicionar subgrupo">⊞</button>'
  +'<button class="idel" title="Remover grupo" onclick="deleteGroup(\''+g.id+'\')">✕</button></div>';
}
function addToGroup(gid){
  var n=note(openNoteId); if(!n) return;
  var g=(DATA.itens||[]).find(function(x){return x.id===gid;}); if(!g) return;
  expandGroupChain(gid);
  var its=itemsOf(openNoteId), gi=groupIndex(its,gid); if(gi<0) return;
  var last=groupDescendantEnd(its,gi);
  var kd=kindDef(n.tipo);
  var it={ id:uuid(), notaId:openNoteId, ordem:ordemAfter(its,last), texto:'', marcavel:kd.defCheck, feito:false, tipo:'' };
  DATA.itens.push(it); appendItem(it); touchNote(n); renderItems(); startEdit(it.id);
}
function addSubgroup(gid){
  var n=note(openNoteId); if(!n) return;
  var g=(DATA.itens||[]).find(function(x){return x.id===gid;}); if(!g || !isGroup(g)) return;
  expandGroupChain(gid);
  var its=itemsOf(openNoteId), gi=groupIndex(its,gid); if(gi<0) return;
  var last=groupDescendantEnd(its,gi), childDepth=groupDepth(g)+1;
  var sg={ id:uuid(), notaId:openNoteId, ordem:ordemAfter(its,last), texto:'', marcavel:false, feito:false, tipo:makeGroupTipo(childDepth) };
  DATA.itens.push(sg); appendItem(sg); touchNote(n); renderItems();
  setTimeout(function(){ var el=$('edItems').querySelector('[data-id="'+sg.id+'"] .gname'); if(el) el.focus(); },30);
}
function toggleGroupAll(gid){
  var its=itemsOf(openNoteId), gi=groupIndex(its,gid); if(gi<0) return;
  var gDepth=groupDepth(its[gi]), members=[];
  for(var j=gi+1;j<its.length;j++){
    if(isGroup(its[j]) && groupDepth(its[j])<=gDepth) break;
    if(its[j].marcavel) members.push(its[j]);
  }
  if(!members.length) return;
  var allDone=members.every(function(m){return m.feito;}), target=!allDone;
  members.forEach(function(m){ m.feito=target; });
  renderItems(); persistItems(members);
  var nn=note(openNoteId); if(nn) touchNote(nn);
}
function persistItems(arr){
  if(!arr||!arr.length) return;
  if(typeof ncBumpCollabActivity==='function') ncBumpCollabActivity();
  notasPersist({
    run: function(){
      return itemRowMap('Itens',5).then(function(rowOf){
        var data=arr.filter(function(x){return rowOf[x.id];}).map(function(x){
          return { range:'Itens!A'+rowOf[x.id]+':G'+rowOf[x.id], values:[itemRowVals(x)] };
        });
        if(!data.length) return;
        return JB.api('POST', ssUrl('/values:batchUpdate'), { valueInputOption:'RAW', data:data });
      });
    },
    onError: notasWriteErr
  });
}
function itemRow(it, hidden, depth){
  depth=depth|0; hidden=!!hidden;
  if(_selMode){ var son=!!_sel[it.id];
    return '<div class="irow selrow'+(son?' on':'')+(hidden?' ihide':'')+'" data-id="'+it.id+'"'+depthAttr(depth)+' onpointerdown="selRowDrag(event,\''+it.id+'\')" onclick="selToggle(\''+it.id+'\')">'
      +'<button class="ihandle" onpointerdown="dragBegin(event,\''+it.id+'\')" onclick="event.stopPropagation()" title="Arrastar">⠿</button>'
      +'<span class="seldot'+(son?' on':'')+'">'+(son?'✓':'')+'</span>'
      +'<div class="itext itext-view">'+(it.texto?mdToHtml(it.texto):'<span class="iplace">(vazio)</span>')+'</div></div>';
  }
  var done=it.feito;
  var left = it.marcavel
    ? '<button class="ichk'+(done?' on':'')+'" onclick="toggleItem(event,\''+it.id+'\')" title="Marcar (shift+clique = intervalo)">'+(done?'✓':'')+'</button>'
    : '<span class="ispacer" title="linha de texto">¶</span>';
  var typeBtn = it.marcavel
    ? '<button class="itype" title="Tornar texto" onclick="convertItem(\''+it.id+'\',0)">¶</button>'
    : '<button class="itype" title="Tornar item marcável" onclick="convertItem(\''+it.id+'\',1)">☑</button>';
  var body = (it.id===_editId)
    ? '<textarea class="itext" id="editTA" rows="1" autocomplete="off" oninput="autoGrow(this)" onblur="itemBlur(\''+it.id+'\',this)" onkeydown="itemKey(event,\''+it.id+'\')" onpaste="itemPaste(event,\''+it.id+'\')">'+esc(it.texto)+'</textarea>'
    : '<div class="itext itext-view" onclick="startEdit(\''+it.id+'\')">'+(it.texto?mdToHtml(it.texto):'<span class="iplace">(vazio)</span>')+'</div>';
  return '<div class="irow'+(done?' done':'')+(hidden?' ihide':'')+'" data-id="'+it.id+'"'+depthAttr(depth)+'>'
    +'<button class="ihandle" onpointerdown="dragBegin(event,\''+it.id+'\')" title="Arrastar">⠿</button>'+left+body
    +typeBtn+'<button class="idel" title="Excluir" onclick="deleteItem(\''+it.id+'\')">✕</button></div>';
}
var _itemEnterInsert=false;
function itemBlur(id, el){ if(_itemEnterInsert) return; commitText(id,el.value); exitEdit(); }
function insertItemAfter(afterId){
  var n=note(openNoteId); if(!n) return null;
  var its=itemsOf(openNoteId), idx=-1;
  for(var k=0;k<its.length;k++){ if(its[k].id===afterId){ idx=k; break; } }
  if(idx<0) return null;
  var cur=its[idx];
  if(isGroup(cur)) return null;
  for(var k=idx;k>=0;k--){ if(isGroup(its[k]) && its[k].feito){ its[k].feito=false; saveItemRow(its[k]); } }
  var ord=insertOrdemInContext(its, idx);
  var it={ id:uuid(), notaId:openNoteId, ordem:ord, texto:'', marcavel:cur.marcavel, feito:false, tipo:'' };
  DATA.itens.push(it); appendItem(it); touchNote(n); return it;
}
function itemKey(e,id){
  if(e.key==='Escape'){ e.preventDefault(); exitEdit(); return; }
  if(e.key!=='Enter' || e.shiftKey) return;
  e.preventDefault();
  var val=e.target.value, trimmed=String(val||'').replace(/\s+$/,'').trim();
  if(!trimmed){ commitText(id,val); exitEdit(); return; }
  var it=(DATA.itens||[]).find(function(x){return x.id===id;});
  if(!it || isGroup(it)) return;
  var v=val.replace(/\s+$/,'');
  if(v!==it.texto){ it.texto=v; saveItemRow(it); var nn=note(openNoteId); if(nn) touchNote(nn); }
  var newIt=insertItemAfter(id);
  if(!newIt){ exitEdit(); return; }
  _itemEnterInsert=true;
  _editId=newIt.id;
  renderItems(); renderUsuals();
  _itemEnterInsert=false;
  var bar=$('fmtBar'); if(bar) bar.classList.add('show'); positionFmtBar();
}
function nextOrd(){ var o=1; (DATA.itens||[]).forEach(function(x){ if(x.notaId===openNoteId && x.ordem>=o) o=x.ordem+1; }); return o; }
function addItemText(text, mk){ var n=note(openNoteId); if(!n) return null; var kd=kindDef(n.tipo); var it={ id:uuid(), notaId:openNoteId, ordem:nextOrd(), texto:text, marcavel:(mk==null?kd.defCheck:!!mk), feito:false, tipo:'' }; DATA.itens=DATA.itens||[]; DATA.itens.push(it); appendItem(it); touchNote(n); return it; }
function addItemFromInput(){ var inp=$('addInput'); var v=(inp.value||'').trim(); if(!v) return; addItemText(v); inp.value=''; renderItems(); renderUsuals(); setTimeout(function(){ var a=$('addInput'); if(a) a.focus(); },10); }
function addUsual(t){ addItemText(t); var inp=$('addInput'); if(inp) inp.value=''; renderItems(); renderUsuals(); }
function toggleItem(ev,id){ var it=(DATA.itens||[]).find(function(x){return x.id===id;}); if(!it) return;
  if(ev && ev.shiftKey && _lastTick && _lastTick!==id){ var its=itemsOf(openNoteId).filter(function(x){return !isGroup(x) && x.marcavel;}); var i1=-1,i2=-1; for(var k=0;k<its.length;k++){ if(its[k].id===_lastTick) i1=k; if(its[k].id===id) i2=k; } if(i1>-1 && i2>-1){ var lo=Math.min(i1,i2), hi=Math.max(i1,i2), target=!it.feito, changed=[]; for(var j=lo;j<=hi;j++){ if(its[j].feito!==target){ its[j].feito=target; changed.push(its[j]); } } _lastTick=id; renderItems(); if(changed.length) persistItems(changed); var nn=note(openNoteId); if(nn) touchNote(nn); return; } }
  it.feito=!it.feito; _lastTick=id; renderItems(); saveItemRow(it); var n=note(openNoteId); if(n) touchNote(n); }
function convertItem(id,mk){ var it=(DATA.itens||[]).find(function(x){return x.id===id;}); if(!it) return; it.marcavel=!!mk; if(!mk) it.feito=false; renderItems(); saveItemRow(it); var n=note(openNoteId); if(n) touchNote(n); }
function commitText(id,val){ var it=(DATA.itens||[]).find(function(x){return x.id===id;}); if(!it) return; var v=val.replace(/\s+$/,''); if(isGroup(it)){ if(v===it.texto) return; it.texto=v; saveItemRow(it); var ng=note(openNoteId); if(ng) touchNote(ng); return; } if(!v.trim()){ deleteItem(id); return; } if(v===it.texto) return; it.texto=v; saveItemRow(it); var n=note(openNoteId); if(n) touchNote(n); }
function deleteItem(id){
  var n=note(openNoteId);
  notasPersist({
    run: function(){
      return findRow('Itens',5,id).then(function(row){
        if(row<0) throw notasRowErr('Itens');
        return JB.api('POST', ssUrl(':batchUpdate'), { requests:[{ deleteDimension:{ range:{ sheetId:_ncGrid()['Itens'], dimension:'ROWS', startIndex:row-1, endIndex:row } } }] });
      });
    },
    onSuccess: function(){
      DATA.itens=(DATA.itens||[]).filter(function(x){return x.id!==id;});
      renderItems(); renderUsuals();
      if(n) touchNote(n);
    },
    onError: notasWriteErr
  });
}
function commitTitle(val){ var n=note(openNoteId); if(!n) return; var v=(val||'').trim()||'(sem título)'; if(v===n.titulo) return; n.titulo=v; touchNote(n); }
function deleteNote(){ var id=openNoteId; var n=note(id); if(!n) return; if(n.collabSheetId && typeof ncLeaveOrDelete==='function'){ ncLeaveOrDelete(); return; }
  JB.confirm('Excluir lista?','"'+(n.titulo||'')+'" e seus itens serão removidos.', function(){
  notasPersist({
    run: function(){
      return findRow('Notas',6,id).then(function(noteRow){
        if(noteRow<0) throw notasRowErr('Notas');
        return JB.api('GET', ssUrl('/values/Itens?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){
          var v=res.values||[]; var rows=[]; var reqs=[];
          for(var i=1;i<v.length;i++){ if(String((v[i]||[])[0])===String(id)) rows.push(i+1); }
          rows.sort(function(a,b){return b-a;});
          rows.forEach(function(r){ reqs.push({ deleteDimension:{ range:{ sheetId:_ncGrid()['Itens'], dimension:'ROWS', startIndex:r-1, endIndex:r } } }); });
          if(noteRow>0) reqs.push({ deleteDimension:{ range:{ sheetId:_ncGrid()['Notas'], dimension:'ROWS', startIndex:noteRow-1, endIndex:noteRow } } });
          if(!reqs.length) return;
          return JB.api('POST', ssUrl(':batchUpdate'), { requests:reqs });
        });
      });
    },
    onSuccess: function(){
      DATA.notas=(DATA.notas||[]).filter(function(x){return x.id!==id;});
      DATA.itens=(DATA.itens||[]).filter(function(x){return x.notaId!==id;});
      openNoteId=null; render(); toast('✓ Excluído');
    },
    onError: notasWriteErr
  });
}, { yes:'Excluir', no:'Cancelar', danger:true }); }

/* ---- intelligence: usuals, fill-from-last, recurrence ---- */
function usuals(kind){ var map={}; (DATA.notas||[]).filter(function(n){return n.tipo===kind;}).forEach(function(n){ (DATA.itens||[]).filter(function(x){return x.notaId===n.id && !isGroup(x);}).forEach(function(it){ var t=(it.texto||'').trim(); if(!t) return; var k=normText(t); if(!map[k]) map[k]={norm:k,text:t,count:0,last:n.criado||''}; map[k].count++; if(String(n.criado||'')>String(map[k].last)){ map[k].last=n.criado; map[k].text=t; } }); }); return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){ if(b.count!==a.count) return b.count-a.count; return String(b.last||'').localeCompare(String(a.last||'')); }); }
function fillDismissed(noteId){ return !!((DATA.config||{})['fillDis_'+noteId]); }
function usualsDismissed(noteId){ return !!((DATA.config||{})['usualsDis_'+noteId]); }
function dismissFill(){ if(!openNoteId) return; saveConfig('fillDis_'+openNoteId, '1'); renderEditor(); }
function dismissUsuals(){ if(!openNoteId) return; saveConfig('usualsDis_'+openNoteId, '1'); renderEditor(); }
function renderUsuals(){
  var el=$('edUsuals'); if(!el) return; var n=note(openNoteId); if(!n){ el.innerHTML=''; return; }
  if(usualsDismissed(openNoteId)){ el.innerHTML=''; return; }
  var q=normText(($('addInput')&&$('addInput').value)||''); var present={}; (DATA.itens||[]).filter(function(x){return x.notaId===openNoteId;}).forEach(function(x){present[normText(x.texto)]=1;});
  var list=usuals(n.tipo).filter(function(u){ return !present[u.norm] && (!q || u.norm.indexOf(q)>-1); }).slice(0,12);
  if(!list.length){ el.innerHTML=''; return; }
  el.innerHTML='<div class="uhead"><div class="sect">'+(q?'Sugestões':'Frequentes')+'</div><button type="button" class="udismiss" onclick="dismissUsuals()" title="Ocultar sugestões">✕</button></div><div class="uchips">'+list.map(function(u){return '<button class="uchip" onclick="addUsual(\''+escAttr(u.text)+'\')"><span class="uplus">+</span>'+esc(u.text)+'</button>';}).join('')+'</div>';
}
function lastNoteOfKind(kind,ex){ var arr=(DATA.notas||[]).filter(function(n){return n.tipo===kind && n.id!==ex;}).sort(function(a,b){return String(b.criado||'').localeCompare(String(a.criado||''));}); return arr[0]||null; }
function fillableCount(n,src){ if(!src) return 0; var present={}; (DATA.itens||[]).filter(function(x){return x.notaId===n.id;}).forEach(function(x){present[normText(x.texto)]=1;}); return (DATA.itens||[]).filter(function(x){return x.notaId===src.id && !isGroup(x) && (x.texto||'').trim() && !present[normText(x.texto)];}).length; }
function fillFromLast(){ var n=note(openNoteId); if(!n) return; var src=lastNoteOfKind(n.tipo,n.id); if(!src) return; var present={}; (DATA.itens||[]).filter(function(x){return x.notaId===n.id;}).forEach(function(x){present[normText(x.texto)]=1;}); var from=(DATA.itens||[]).filter(function(x){return x.notaId===src.id && !isGroup(x) && (x.texto||'').trim() && !present[normText(x.texto)];}).sort(function(a,b){return a.ordem-b.ordem;}); if(!from.length){ toast('Nada novo para adicionar'); return; } var ord=nextOrd(); var add=from.map(function(s){ var it={ id:uuid(), notaId:openNoteId, ordem:ord++, texto:s.texto, marcavel:s.marcavel, feito:false, tipo:'' }; DATA.itens.push(it); return it; }); appendItems(add); touchNote(n); renderEditor(); toast('✓ '+add.length+' '+(add.length>1?'itens adicionados':'item adicionado')); }
var _nudgeAction=null, _nudgeDisKey=null;
function showNudge(html, yesLabel, onYes, disKey){ _nudgeAction=onYes; _nudgeDisKey=disKey; $('nudgeQ').innerHTML=html; $('nudgeYes').textContent=yesLabel; setTimeout(function(){ $('nudgeCard').classList.add('show'); }, 900); }
function dismissNudge(){ $('nudgeCard').classList.remove('show'); if(_nudgeDisKey) saveConfig(_nudgeDisKey, todayISO()); }
function acceptNudge(){ $('nudgeCard').classList.remove('show'); var a=_nudgeAction; _nudgeAction=null; if(a) a(); }
function checkNudges(){ if(openNoteId) return; if((DATA.config&&DATA.config.nudgePref)==='off') return; if(checkDeadlines()) return; checkRecurrence(); }
function checkDeadlines(){
  var cand=(DATA.notas||[]).filter(function(n){ return n.vence && !noteDone(n); }).map(function(n){ return {n:n,d:daysUntilD(n.vence)}; }).filter(function(o){ return o.d!=null && o.d<=2 && o.d>=-7; });
  if(!cand.length) return false; cand.sort(function(a,b){ return a.d-b.d; });
  var pick=null; for(var i=0;i<cand.length;i++){ if((((DATA.config||{})['dlDis_'+cand[i].n.id])||'')===todayISO()) continue; pick=cand[i]; break; }
  if(!pick) return false; var n=pick.n, open=noteOpen(n), kd=kindDef(n.tipo);
  var when=pick.d<0?('está atrasada há '+(-pick.d)+(-pick.d>1?' dias':' dia')):(pick.d===0?'vence hoje':(pick.d===1?'vence amanhã':'vence em '+pick.d+' dias'));
  var html=noteIcon(n)+' <strong>'+esc(n.titulo)+'</strong> '+when+(open?(' — '+(open>1?'faltam '+open+' itens':'falta 1 item')):'')+'.';
  showNudge(html, 'Abrir', function(){ openNote(n.id); }, 'dlDis_'+n.id); return true;
}
function checkRecurrence(){
  var best=null;
  KINDS.forEach(function(kd){
    var arr=(DATA.notas||[]).filter(function(n){return n.tipo===kd.k;}).sort(function(a,b){return String(a.criado||'').localeCompare(String(b.criado||''));});
    if(arr.length<2) return;
    var gaps=[]; for(var i=1;i<arr.length;i++){ var g=daysBetween(arr[i-1].criado,arr[i].criado); if(g>0) gaps.push(g); }
    if(!gaps.length) return;
    var avg=gaps.reduce(function(a,b){return a+b;},0)/gaps.length; if(avg<5) return;
    var last=arr[arr.length-1]; var since=daysSince(last.criado);
    if(since<5 || since<avg*0.85 || since>avg*3) return;
    var dis=(DATA.config&&DATA.config['nudgeDis_'+kd.k])||''; if(dis && daysSince(dis)<7) return;
    var score=since/avg; if(!best || score>best.score) best={kd:kd,last:last,since:since,score:score};
  });
  if(!best) return false; var kd2=best.kd, n=best.last; var cnt=(DATA.itens||[]).filter(function(x){return x.notaId===n.id && (x.texto||'').trim();}).length;
  var html='Há '+relSpan(best.since)+' você fez <strong>'+esc(n.titulo)+'</strong>'+(cnt?(' com '+cnt+' '+(cnt>1?'itens':'item')):'')+'. Quer recriar?';
  showNudge(html, 'Recriar', function(){ var d=new Date(); createNoteFromKind(kd2.k, kd2.label+' — '+MOFULL[d.getMonth()], true); }, 'nudgeDis_'+kd2.k); return true;
}
function createNoteFromKind(kind,titulo,fill){ var now=new Date().toISOString(); var n={ id:uuid(), titulo:titulo, tipo:kind, cor:'', fixado:false, criado:now, atualizado:now, vence:'' }; DATA.notas=DATA.notas||[]; DATA.notas.push(n); appendNote(n); openNoteId=n.id; if(fill){ var src=lastNoteOfKind(kind,n.id); if(src){ var ord=1, add=[]; (DATA.itens||[]).filter(function(x){return x.notaId===src.id && !isGroup(x) && (x.texto||'').trim();}).sort(function(a,b){return a.ordem-b.ordem;}).forEach(function(s){ var it={id:uuid(),notaId:n.id,ordem:ord++,texto:s.texto,marcavel:s.marcavel,feito:false,tipo:''}; DATA.itens.push(it); add.push(it); }); appendItems(add); } } render(); window.scrollTo(0,0); }

/* ---- persistence ---- */
function notasCollabOpen(){ var n=openNoteId&&note(openNoteId); return !!(n&&n.collabSheetId); }
function notasPersist(opts){
  opts=opts||{};
  var track=notasCollabOpen();
  if(track && typeof ncWriteBegin==='function') ncWriteBegin();
  var os=opts.onSuccess, oe=opts.onError;
  opts.onSuccess=function(r){ if(track && typeof ncWriteEnd==='function') ncWriteEnd(); if(os) os(r); };
  opts.onError=function(e){ if(track && typeof ncWriteEnd==='function') ncWriteEnd(); if(oe) oe(e); };
  return JB.persist(opts);
}
function noteRowVals(n){ return [n.titulo,n.tipo,n.cor||'',n.fixado?'1':'',n.criado,n.atualizado,n.id,n.vence||'']; }
function mdToHtml(t){ var s=esc(t); s=s.replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>'); s=s.replace(/\*([^*\n]+)\*/g,'<em>$1</em>'); s=s.replace(/__([^_\n]+)__/g,'<u>$1</u>'); s=s.replace(/~~([^~\n]+)~~/g,'<s>$1</s>'); return s; }
function startEdit(id){ if(_marqueeDidDrag) return; _editId=id; renderItems(); var bar=$('fmtBar'); if(bar) bar.classList.add('show'); positionFmtBar(); updateSelBar(); }
function exitEdit(){ if(_editId==null) return; _editId=null; var bar=$('fmtBar'); if(bar) bar.classList.remove('show'); renderItems(); updateSelBar(); if(typeof ncFlushPollStale==='function') ncFlushPollStale(); }
function wordAt(v,pos){ var i=pos,j=pos; var isW=function(c){ return c && /\S/.test(c) && c!=='*' && c!=='_' && c!=='~'; }; while(i>0 && isW(v[i-1])) i--; while(j<v.length && isW(v[j])) j++; return [i,j]; }
function fmt(mk){ var ta=$('editTA'); if(!ta) return; var v=ta.value, sS=ta.selectionStart||0, sE=ta.selectionEnd||0, L=mk.length, sel0=v.slice(sS,sE);
  // (a) selection already includes the markers -> strip them
  if(sel0.length>=2*L && sel0.slice(0,L)===mk && sel0.slice(sel0.length-L)===mk){ var inner=sel0.slice(L,sel0.length-L); ta.value=v.slice(0,sS)+inner+v.slice(sE); ta.focus(); try{ ta.setSelectionRange(sS,sS+inner.length); }catch(_){} if(ta.tagName==='TEXTAREA') autoGrow(ta); return; }
  // no selection -> expand to the word under the cursor
  if(sS===sE){ var w=wordAt(v,sS); sS=w[0]; sE=w[1]; }
  // (b) is [sS,sE] inside an enclosing mk...mk pair? -> remove that pair (toggle off)
  var open=v.lastIndexOf(mk, sS-1);
  if(open>=0){ var close=v.indexOf(mk, Math.max(sE, open+L)); if(close>=0){ var b1=v.slice(open+L,sS), b2=v.slice(sE,close); if(b1.indexOf(mk)===-1 && b2.indexOf(mk)===-1){ ta.value=v.slice(0,open)+v.slice(open+L,close)+v.slice(close+L); ta.focus(); try{ ta.setSelectionRange(sS-L,sE-L); }catch(_){} if(ta.tagName==='TEXTAREA') autoGrow(ta); return; } } }
  // (c) wrap
  var sel=v.slice(sS,sE); ta.value=v.slice(0,sS)+mk+sel+mk+v.slice(sE); ta.focus(); try{ ta.setSelectionRange(sS+L,sS+L+sel.length); }catch(_){} if(ta.tagName==='TEXTAREA') autoGrow(ta); }
function fmtApply(ev,mk){ if(ev) ev.preventDefault(); fmt(mk); }
function fmtDone(ev){ if(ev) ev.preventDefault(); var ta=$('editTA'); if(ta) ta.blur(); }
function positionFmtBar(){ var bar=$('fmtBar'); if(!bar||!bar.classList.contains('show')) return; var vv=window.visualViewport; if(vv){ var gap=window.innerHeight-(vv.height+vv.offsetTop); bar.style.bottom=(Math.max(gap,0)+8)+'px'; } else { bar.style.bottom='18px'; } }
if(window.visualViewport){ window.visualViewport.addEventListener('resize', positionFmtBar); window.visualViewport.addEventListener('scroll', positionFmtBar); }
function itemRowVals(it){ return [it.notaId,it.ordem,it.texto,it.marcavel?'1':'',it.feito?'1':'',it.id,it.tipo||'']; }
function appendNote(n){
  notasPersist({
    run: function(){
      return JB.api('POST', ssUrl('/values/Notas:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:[noteRowVals(n)] });
    },
    onError: notasWriteErr
  });
}
function saveNoteRow(n){
  var tab=noteDataTab(n);
  notasPersist({
    run: function(){
      return findRow(tab,6,n.id).then(function(row){
        if(row<0) throw notasRowErr(tab);
        return JB.api('PUT', ssUrl('/values/'+encodeURIComponent(tab+'!A'+row+':H'+row)+'?valueInputOption=RAW'), { values:[noteRowVals(n)] });
      });
    },
    onError: notasWriteErr
  });
}
function touchNote(n){ n.atualizado=new Date().toISOString(); if(typeof ncBumpCollabActivity==='function') ncBumpCollabActivity(); saveNoteRow(n); }
function appendItem(it){ appendItems([it]); }
function appendItems(arr){
  if(!arr||!arr.length) return;
  if(typeof ncBumpCollabActivity==='function') ncBumpCollabActivity();
  notasPersist({
    run: function(){
      return JB.api('POST', ssUrl('/values/Itens:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: arr.map(itemRowVals) });
    },
    onSuccess: function(){ invalidateRowCache('Itens'); },
    onError: notasWriteErr
  });
}
function saveItemRow(it){
  if(typeof ncBumpCollabActivity==='function') ncBumpCollabActivity();
  notasPersist({
    run: function(){
      return findRow('Itens',5,it.id).then(function(row){
        if(row<0) throw notasRowErr('Itens');
        return JB.api('PUT', ssUrl('/values/'+encodeURIComponent('Itens!A'+row+':G'+row)+'?valueInputOption=RAW'), { values:[itemRowVals(it)] });
      });
    },
    onError: notasWriteErr
  });
}
function findRow(tab,idCol,id){
  var key=rowCacheKey(tab), cached=_rowCache[key];
  if(cached && cached[String(id)]!=null) return Promise.resolve(cached[String(id)]);
  return JB.api('GET', ssUrl('/values/'+encodeURIComponent(tab)+'?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){
    seedRowCache(tab, res.values||[], idCol);
    var row=_rowCache[key]?_rowCache[key][String(id)]:null;
    return row!=null?row:-1;
  });
}
function saveConfig(k,v){
  DATA.config=DATA.config||{};
  DATA.config[k]=v;
  notasPersist({
    run: function(){
      return JB.api('GET', personalSsUrl('/values/Config?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){
        var vals=res.values||[];
        for(var i=1;i<vals.length;i++){
          if(String((vals[i]||[])[0])===k) return JB.api('PUT', personalSsUrl('/values/'+encodeURIComponent('Config!B'+(i+1))+'?valueInputOption=RAW'), {values:[[v]]});
        }
        return JB.api('POST', personalSsUrl('/values/Config:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {values:[[k,v]]});
      });
    },
    onError: notasWriteErr
  });
}

/* ---- settings + tour ---- */
var NOTAS_CSV_SEP = ';';
function notasCsvCell(v){
  var s=String(v==null?'':v);
  return /[";\r\n,]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}
function notasCsvLine(cells){ return cells.map(notasCsvCell).join(NOTAS_CSV_SEP); }
function notasCsvFile(lines){ return 'sep='+NOTAS_CSV_SEP+'\r\n'+lines.join('\r\n'); }
function notasCsvUtf16Blob(text){
  var bom=new Uint8Array([0xFF,0xFE]), n=text.length, raw=new Uint8Array(n*2);
  for(var i=0;i<n;i++){ var c=text.charCodeAt(i); raw[i*2]=c&255; raw[i*2+1]=c>>8; }
  return new Blob([bom,raw], {type:'text/csv;charset=utf-16le'});
}
function notasDownloadCsv(filename, content){
  var url=URL.createObjectURL(notasCsvUtf16Blob(content));
  var a=document.createElement('a');
  a.href=url; a.download=filename; a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
}
function notasDownload(filename, content, mime){
  var url=URL.createObjectURL(new Blob([content], {type:mime}));
  var a=document.createElement('a');
  a.href=url; a.download=filename; a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
}
function notasItemStatus(it){
  if(isGroup(it)) return '';
  if(!it.marcavel) return '—';
  return it.feito?'Feito':'Pendente';
}
function notasExportHeaders(includeListMeta){
  return includeListMeta
    ? ['Lista','Tipo','Prazo','Fixada','Grupo','#','Item','Marcável','Feito','Status']
    : ['Tipo','Prazo','Fixada','Grupo','#','Item','Marcável','Feito','Status'];
}
function notasExportItemRows(n, includeListMeta){
  var kd=kindDef(n.tipo);
  var rows=[], groupPath=[], num=0;
  itemsOf(n.id).forEach(function(it){
    var text=(it.texto||'').trim();
    if(isGroup(it)){
      var d=groupDepth(it);
      while(groupPath.length>d) groupPath.pop();
      groupPath[d]=text;
      return;
    }
    if(!text) return;
    num++;
    var group=groupPath.filter(Boolean).join(' › ');
    var row=includeListMeta
      ? [n.titulo||'', kd.label, n.vence?fmtDateBR(n.vence):'', n.fixado?'Sim':'Não', group, num, text, it.marcavel?'Sim':'Não', it.marcavel?(it.feito?'Sim':'Não'):'', notasItemStatus(it)]
      : [kd.label, n.vence?fmtDateBR(n.vence):'', n.fixado?'Sim':'Não', group, num, text, it.marcavel?'Sim':'Não', it.marcavel?(it.feito?'Sim':'Não'):'', notasItemStatus(it)];
    rows.push(notasCsvLine(row));
  });
  return rows;
}
function exportNotasCsv(){
  if(!DATA){ toast('Nada para exportar'); return; }
  var stamp=new Date().toISOString().slice(0,10);
  var out=[notasCsvLine(notasExportHeaders(true))];
  (DATA.notas||[]).slice().sort(function(a,b){
    return String(b.atualizado||b.criado||'').localeCompare(String(a.atualizado||a.criado||''));
  }).forEach(function(n){
    notasExportItemRows(n, true).forEach(function(line){ out.push(line); });
  });
  notasDownloadCsv('joelboard-notas-'+stamp+'.csv', notasCsvFile(out));
  toast('✓ CSV exportado');
}
function exportNotasJson(){
  if(!DATA){ toast('Nada para exportar'); return; }
  var stamp=new Date().toISOString().slice(0,10);
  var payload={ app:'notas', version:1, exportedAt:new Date().toISOString(), notas:DATA.notas||[], itens:DATA.itens||[] };
  notasDownload('joelboard-notas-'+stamp+'.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  toast('✓ Backup exportado');
}
function safeFilename(s){ return String(s||'lista').replace(/[<>:"/\\|?*\x00-\x1f]/g,'').trim().slice(0,60)||'lista'; }
function buildListCsv(n){
  var out=[notasCsvLine(notasExportHeaders(false))];
  notasExportItemRows(n, false).forEach(function(line){ out.push(line); });
  return notasCsvFile(out);
}
function exportCurrentList(){
  var n=note(openNoteId);
  if(!n){ toast('Abra uma lista primeiro'); return; }
  notasDownloadCsv(safeFilename(n.titulo)+'.csv', buildListCsv(n));
  toast('✓ Lista exportada');
}
function openSettings(){ switchSet('tema'); JB.renderSkinPicker('notas', $('setSkins')); $('setNudge').classList.toggle('on', (DATA.config&&DATA.config.nudgePref)!=='off'); $('setHideDone').classList.toggle('on', hideDonePref()); if(typeof ncInitProfileSettings==='function') ncInitProfileSettings(); $('setOverlay').classList.add('open'); }
function closeSettings(){ $('setOverlay').classList.remove('open'); }
function switchSet(name){ var ts=document.querySelectorAll('#setOverlay .set-tab'); for(var i=0;i<ts.length;i++) ts[i].classList.toggle('active',ts[i].getAttribute('data-st')===name); var ps=document.querySelectorAll('#setOverlay .set-pane'); for(var j=0;j<ps.length;j++){ var on=ps[j].getAttribute('data-pane')===name; ps[j].style.display=on?'':'none'; ps[j].classList.toggle('active', on); } }
function toggleNudgePref(){ var off=(DATA.config&&DATA.config.nudgePref)==='off'; var nv=off?'on':'off'; saveConfig('nudgePref', nv); $('setNudge').classList.toggle('on', nv!=='off'); }
var NOTAS_TOUR=[
  { title:'Bem-vindo ao Notas 📝', body:'Listas e notas que você marca: compras, tarefas, viagem ou nota livre.' },
  { sel:'#fab', title:'Nova lista', body:'Toque no + e escolha o tipo. Numa nota livre, qualquer linha vira um item marcável com um toque.' },
  { sel:'#main', title:'Suas listas', body:'Cada lista é um card com seu progresso. Toque para abrir e ir marcando.' },
  { sel:'.acct .lnk', title:'Inteligência & tema', body:'O app aprende seus itens frequentes e lembra de listas que você costuma refazer. Ajuste tudo no ⚙.' }
];
function notasVerTutorial(){ closeSettings(); setTimeout(function(){ JB.tour('notas', NOTAS_TOUR); }, 250); }

/* ---- groups, paste, drag, order ---- */
function addGroup(){ var n=note(openNoteId); if(!n) return; var g={ id:uuid(), notaId:openNoteId, ordem:nextOrd(), texto:'', marcavel:false, feito:false, tipo:'g' }; DATA.itens=DATA.itens||[]; DATA.itens.push(g); appendItem(g); touchNote(n); renderItems(); setTimeout(function(){ var el=$('edItems').querySelector('[data-id="'+g.id+'"] .gname'); if(el) el.focus(); },30); }
function toggleGroup(id){ var g=(DATA.itens||[]).find(function(x){return x.id===id;}); if(!g) return; g.feito=!g.feito; saveItemRow(g); renderItems(); }
function deleteGroup(id){
  var n=note(openNoteId);
  notasPersist({
    run: function(){
      return findRow('Itens',5,id).then(function(row){
        if(row<0) throw notasRowErr('Itens');
        return JB.api('POST', ssUrl(':batchUpdate'), { requests:[{ deleteDimension:{ range:{ sheetId:_ncGrid()['Itens'], dimension:'ROWS', startIndex:row-1, endIndex:row } } }] });
      });
    },
    onSuccess: function(){
      DATA.itens=(DATA.itens||[]).filter(function(x){return x.id!==id;});
      renderItems();
      if(n) touchNote(n);
      toast('Grupo removido (itens mantidos)');
    },
    onError: notasWriteErr
  });
}
function splitLines(txt){ return String(txt||'').split(/\r?\n/).map(function(l){ return l.replace(/^\s*[-*•·\u2022\u25AA\u25CB\u2013\u2014]\s+/,'').replace(/^\s*\d+[\.\)]\s+/,'').replace(/^\s*\[[ xX]?\]\s*/,'').trim(); }).filter(function(l){return l.length;}); }
function addManyItems(lines){ var n=note(openNoteId); if(!n||!lines.length) return; var kd=kindDef(n.tipo); var ord=nextOrd(); var add=lines.map(function(L){ var it={ id:uuid(), notaId:openNoteId, ordem:ord++, texto:L, marcavel:kd.defCheck, feito:false, tipo:'' }; DATA.itens.push(it); return it; }); appendItems(add); touchNote(n); renderEditor(); toast('✓ '+add.length+(add.length>1?' itens':' item')); }
function addPaste(e){ var t=((e.clipboardData||window.clipboardData)||{}).getData?((e.clipboardData||window.clipboardData).getData('text')):''; if(t && /\r?\n/.test(t)){ e.preventDefault(); var lines=splitLines(t); var cur=($('addInput').value||'').trim(); if(cur) lines.unshift(cur); $('addInput').value=''; addManyItems(lines); setTimeout(function(){ var a=$('addInput'); if(a) a.focus(); },10); } }
function itemPaste(e,id){ var t=((e.clipboardData||window.clipboardData)||{}).getData?((e.clipboardData||window.clipboardData).getData('text')):''; if(!t || !/\r?\n/.test(t)) return; e.preventDefault(); var lines=splitLines(t); if(!lines.length) return; var it=(DATA.itens||[]).find(function(x){return x.id===id;}); if(!it) return; it.texto=lines[0]; saveItemRow(it); var base=it.ordem, rest=lines.slice(1); var kd=kindDef(note(openNoteId).tipo); var mk=(isGroup(it)?kd.defCheck:it.marcavel); var add=rest.map(function(L,k){ var nit={ id:uuid(), notaId:openNoteId, ordem:base+0.0001*(k+1), texto:L, marcavel:mk, feito:false, tipo:'' }; DATA.itens.push(nit); return nit; }); if(add.length) appendItems(add); normalizeOrder(); touchNote(note(openNoteId)); renderEditor(); }
function normalizeOrder(){ var its=itemsOf(openNoteId); var changed=false; its.forEach(function(x,i){ if(x.ordem!==i+1){ x.ordem=i+1; changed=true; } }); if(changed) persistOrder(); }
function persistOrder(){
  if(typeof ncBumpCollabActivity==='function') ncBumpCollabActivity();
  notasPersist({
    run: function(){
      return itemRowMap('Itens',5).then(function(rowOf){
        var data=(DATA.itens||[]).filter(function(x){return x.notaId===openNoteId && rowOf[x.id];}).map(function(x){
          return { range:'Itens!B'+rowOf[x.id], values:[[x.ordem]] };
        });
        if(!data.length) return;
        return JB.api('POST', ssUrl('/values:batchUpdate'), { valueInputOption:'RAW', data:data });
      });
    },
    onError: notasWriteErr
  });
}
function applyOrder(ids){ var idx={}; ids.forEach(function(id,i){ idx[id]=i+1; }); (DATA.itens||[]).forEach(function(x){ if(x.notaId===openNoteId && idx[x.id]!=null) x.ordem=idx[x.id]; }); renderItems(); persistOrder(); var n=note(openNoteId); if(n) touchNote(n); }
var _drag=null, _lastTick=null, _editId=null, _dragDidMove=false;
function dragRowDepth(row){ var g=row&&row.getAttribute?row.getAttribute('data-gd'):null; return g!=null?parseInt(g,10):-1; }
function dragIsGroupRow(row){ return !!(row&&row.getAttribute&&row.getAttribute('data-g')==='1'); }
function dragInsertBlockBefore(cont, block, target){ block.forEach(function(b){ cont.insertBefore(b,target); }); }
function dragInsertBlockAfter(cont, block, afterRow){
  var mark=afterRow.nextElementSibling;
  while(mark && block.indexOf(mark)>=0) mark=mark.nextElementSibling;
  block.forEach(function(b){ if(mark) cont.insertBefore(b,mark); else cont.appendChild(b); });
}
function dragZoneTargets(cont, drag){
  var block=drag.block, gDepth=drag.groupDepth;
  if(gDepth===0) return [].slice.call(cont.children).filter(function(r){ return block.indexOf(r)<0 && !r.classList.contains('ihide') && dragIsGroupRow(r) && dragRowDepth(r)===0; });
  var parentRow=drag.parentId?cont.querySelector('[data-id="'+drag.parentId+'"]'):null;
  if(!parentRow) return [].slice.call(cont.children).filter(function(r){ return block.indexOf(r)<0 && !r.classList.contains('ihide') && dragIsGroupRow(r) && dragRowDepth(r)===gDepth; });
  var targets=[], sib=parentRow.nextElementSibling;
  while(sib){
    if(block.indexOf(sib)>=0){ sib=sib.nextElementSibling; continue; }
    if(sib.classList.contains('ihide')){ sib=sib.nextElementSibling; continue; }
    if(dragIsGroupRow(sib) && dragRowDepth(sib)<=gDepth){
      if(dragIsGroupRow(sib) && dragRowDepth(sib)===gDepth) targets.push(sib);
      break;
    }
    targets.push(sib);
    sib=sib.nextElementSibling;
  }
  return targets;
}
function dragOrderValid(ids){
  var map={}, ordered=[];
  (DATA.itens||[]).forEach(function(x){ if(x.notaId===openNoteId) map[x.id]=x; });
  ids.forEach(function(id){ if(map[id]) ordered.push(map[id]); });
  for(var i=0;i<ordered.length;i++){
    if(!isGroup(ordered[i])) continue;
    var d=groupDepth(ordered[i]);
    if(d<=0) continue;
    var ok=false;
    for(var k=i-1;k>=0;k--){ if(isGroup(ordered[k]) && groupDepth(ordered[k])===d-1){ ok=true; break; } if(isGroup(ordered[k]) && groupDepth(ordered[k])<d-1) break; }
    if(!ok) return false;
  }
  return true;
}
function dragBegin(ev,id){ ev.preventDefault(); var cont=$('edItems'); if(!cont) return; var block; if(_selMode && _sel[id] && selCount()>1){ block=[].slice.call(cont.children).filter(function(r){ return r.getAttribute && _sel[r.getAttribute('data-id')]; }); if(!block.length){ var rr=cont.querySelector('[data-id="'+id+'"]'); block=rr?[rr]:[]; } } else { var row=cont.querySelector('[data-id="'+id+'"]'); if(!row) return; block=[row]; if(dragIsGroupRow(row)){ var gDepth=dragRowDepth(row), sib=row.nextElementSibling; while(sib){ if(dragIsGroupRow(sib) && dragRowDepth(sib)<=gDepth) break; block.push(sib); sib=sib.nextElementSibling; } } } if(!block.length) return; var isG=dragIsGroupRow(block[0]); var gDepth=isG?dragRowDepth(block[0]):-1, parentId=null; if(isG && gDepth>0){ var its=itemsOf(openNoteId), pi=parentGroupIndex(its, groupIndex(its, id)); if(pi>=0) parentId=its[pi].id; } _drag={ block:block, cont:cont, moved:false, isGroup:isG, groupDepth:gDepth, parentId:parentId }; block.forEach(function(b){ b.classList.add('dragging'); }); document.addEventListener('pointermove', dragMove, {passive:false}); document.addEventListener('pointerup', dragEnd, {once:true}); }
function dragMove(ev){ if(!_drag) return; ev.preventDefault(); _drag.moved=true; var cont=_drag.cont, y=ev.clientY, block=_drag.block; var rows; if(_drag.isGroup) rows=dragZoneTargets(cont,_drag); else rows=[].slice.call(cont.children).filter(function(r){ return block.indexOf(r)<0 && !r.classList.contains('ihide'); }); var target=null; for(var i=0;i<rows.length;i++){ var rect=rows[i].getBoundingClientRect(); if(y < rect.top+rect.height/2){ target=rows[i]; break; } } if(target) dragInsertBlockBefore(cont, block, target); else if(_drag.isGroup && _drag.groupDepth>0 && rows.length) dragInsertBlockAfter(cont, block, rows[rows.length-1]); else if(_drag.isGroup && _drag.groupDepth===0) block.forEach(function(b){ cont.appendChild(b); }); else if(!_drag.isGroup) block.forEach(function(b){ cont.appendChild(b); }); }
function dragEnd(){ if(!_drag) return; document.removeEventListener('pointermove', dragMove); _drag.block.forEach(function(b){ b.classList.remove('dragging'); }); var cont=_drag.cont, moved=_drag.moved; _drag=null; if(moved){ _dragDidMove=true; setTimeout(function(){ _dragDidMove=false; }, 320); } if(!moved) return; var ids=[].slice.call(cont.children).filter(function(r){return r.getAttribute && r.getAttribute('data-id');}).map(function(r){return r.getAttribute('data-id');}); if(!dragOrderValid(ids)){ renderItems(); return; } applyOrder(ids); }

function deleteChecked(){ var done=itemsOf(openNoteId).filter(function(x){return !isGroup(x) && x.marcavel && x.feito;}); if(!done.length) return; var ids={}; done.forEach(function(x){ids[x.id]=1;}); JB.confirm('Excluir marcados?', done.length+(done.length>1?' itens marcados serão removidos.':' item marcado será removido.'), function(){
  notasPersist({
    run: function(){ return delItemRows(ids); },
    onSuccess: function(){
      DATA.itens=(DATA.itens||[]).filter(function(x){return !ids[x.id];});
      renderEditor();
      var n=note(openNoteId); if(n) touchNote(n);
      toast('✓ Removidos');
    },
    onError: notasWriteErr
  });
}, { yes:'Excluir', no:'Cancelar', danger:true }); }

function dedupeFinish(scopeId){
  closeEdMenu();
  closeSettings();
  if(scopeId && openNoteId===scopeId) renderEditor();
  else render();
}
function dedupeItems(scopeNotaId){
  var scopeId=scopeNotaId===undefined?openNoteId:scopeNotaId;
  var pool=(DATA.itens||[]).filter(function(x){ return !scopeId || x.notaId===scopeId; });
  if(!pool.length){ toast('Nenhuma duplicata 🎉'); return; }
  var seenId={}, seenText={}, idDupN=0, sheetDups=[], dupIds={};
  pool.slice().sort(function(a,b){ return a.ordem-b.ordem; }).forEach(function(x){
    if(seenId[x.id]){ idDupN++; return; }
    seenId[x.id]=1;
    if(isGroup(x)) return;
    var t=normText(x.texto);
    if(!t) return;
    var k=x.notaId+'|'+t;
    if(seenText[k]) sheetDups.push(x);
    else seenText[k]=1;
  });
  sheetDups.forEach(function(x){ dupIds[x.id]=1; });
  if(idDupN && scrubItemDupes(scopeId)){
    if(!sheetDups.length){ dedupeFinish(scopeId); toast('✓ '+idDupN+' fantasma'+(idDupN>1?'s':'')+' removido'+(idDupN>1?'s':'')); return; }
  }
  if(!idDupN && !sheetDups.length){ toast('Nenhuma duplicata 🎉'); return; }
  var keepN=pool.filter(function(x){ return !dupIds[x.id]; }).length;
  if(!keepN){ toast('Nada a remover — evitaria esvaziar a lista'); return; }
  var scopeLabel=scopeId?(note(scopeId)?' nesta lista':' nesta lista'):' em todas as listas';
  var msg=sheetDups.length+(sheetDups.length>1?' itens repetidos':' item repetido')+scopeLabel+' serão removidos. Um de cada é mantido.';
  if(idDupN) msg+=' '+idDupN+' fantasma'+(idDupN>1?'s':'')+' também será'+(idDupN>1?'ão':'á')+' limpo'+(idDupN>1?'s':'')+'.';
  JB.confirm('Remover duplicatas?', msg, function(){
    notasPersist({
      run: function(){ return delItemRows(dupIds); },
      onSuccess: function(){
        DATA.itens=(DATA.itens||[]).filter(function(x){ return !dupIds[x.id]; });
        scrubItemDupes(scopeId);
        dedupeFinish(scopeId); toast('✓ '+(sheetDups.length+idDupN)+' removidos');
      },
      onError: notasWriteErr
    });
  }, { yes:'Remover', no:'Cancelar', danger:true });
}

function selCount(){ return Object.keys(_sel).length; }
function selExitIfEmpty(){ return false; }
function selExitMode(){ _selMode=false; _sel={}; _editId=null; var fb=$('fmtBar'); if(fb) fb.classList.remove('show'); renderEditor(); }
function selEscKey(){
  if(_editId){ exitEdit(); return; }
  if(!_selMode) return;
  if(selCount()){ _sel={}; renderItems(); updateSelBar(); return; }
  selExitMode();
}
var _mq=null, _marqueeDidDrag=false, _MQ_MIN=6;
function selMarqueeIgnore(el){ if(!el||!el.closest) return true; if(el.closest('.ihandle,button,input,textarea,.ichk,.itype,.idel,.gchev,.gadd,.gsub,.gctrl,.gctrls,.fmtbar,.selbar,.lnk,.iadd,.ed-add-card,.uwrap,.uhead,.fillrow,.ed-head,.ed-top,.ed-meta,.ed-menu,.ed-menu-wrap,.fillbtn,.door,.fab,.overlay,.header,.foot,.toast,.confirm-card,.nc-edit,.nc-ico,.nc-rename-inp,.ed-done-toggle')) return true; if(el.closest('.ihdr')) return true; return false; }
function selMarqueeZone(){ if(!openNoteId||!$('edItems')) return null; return { top:0, bottom:window.innerHeight, left:0, right:document.documentElement.clientWidth }; }
function selMarqueeInZone(ev){ var z=selMarqueeZone(); if(!z) return false; return ev.clientX>=z.left && ev.clientX<=z.right && ev.clientY>=z.top && ev.clientY<=z.bottom; }
function selMarqueeRect(){ var l=Math.min(_mq.sx,_mq.ox), t=Math.min(_mq.sy,_mq.oy), r=Math.max(_mq.sx,_mq.ox), b=Math.max(_mq.sy,_mq.oy); return {left:l,top:t,right:r,bottom:b,width:r-l,height:b-t}; }
function selRectsHit(a,b){ return a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top; }
function selMarqueePaint(){ var box=$('selMarquee'), rc=selMarqueeRect(); if(!box) return; box.style.left=rc.left+'px'; box.style.top=rc.top+'px'; box.style.width=rc.width+'px'; box.style.height=rc.height+'px'; }
function selPaintMarqueePreview(selMap){ var cont=$('edItems'); if(!cont) return; cont.querySelectorAll('.irow[data-id]').forEach(function(row){ var id=row.getAttribute('data-id'); row.classList.toggle('mq-hit', !!(selMap&&selMap[id])); }); }
function selClearMarqueePreview(){ selPaintMarqueePreview(null); }
function selPaintRows(){ var cont=$('edItems'); if(!cont) return; cont.querySelectorAll('.irow[data-id]').forEach(function(row){ var id=row.getAttribute('data-id'), on=!!_sel[id]; row.classList.remove('mq-hit'); row.classList.toggle('on', on); var dot=row.querySelector('.seldot'); if(dot){ dot.classList.toggle('on', on); dot.textContent=on?'✓':''; } }); updateSelBar(); }
function selEnterMode(){ if(_selMode) return; _selMode=true; _editId=null; var fb=$('fmtBar'); if(fb) fb.classList.remove('show'); renderEditor(); }
function selApplyMarquee(rc, additive, base){ var next=additive?Object.assign({}, base):{}, cont=$('edItems'); if(cont) cont.querySelectorAll('.irow[data-id]:not(.ihide)').forEach(function(row){ var id=row.getAttribute('data-id'); if(id && selRectsHit(rc, row.getBoundingClientRect())) next[id]=1; }); _sel=next; if(selCount()){ if(_selMode) selPaintRows(); else selEnterMode(); } else if(_selMode){ selPaintRows(); updateSelBar(); } else selPaintMarqueePreview(next); }
function selMarqueeBegin(ev){ if(!openNoteId||_editId||_drag) return; if(!itemsOf(openNoteId).some(function(x){return !isGroup(x);})) return; if(!selMarqueeInZone(ev)) return; if(selMarqueeIgnore(ev.target)) return; var row=ev.target.closest?ev.target.closest('.irow[data-id]'):null; if(row && _selMode && _sel[row.getAttribute('data-id')]) return; _mq={ sx:ev.clientX, sy:ev.clientY, ox:ev.clientX, oy:ev.clientY, on:false, additive:!!ev.shiftKey, baseSel:Object.assign({},_sel), pid:ev.pointerId }; }
function selRowDrag(ev,id){ if(!_selMode||!_sel[id]||_drag) return; if(ev.target.closest&&ev.target.closest('.ihandle')) return; dragBegin(ev,id); }
function selMarqueeActive(ev){ if(!_mq||ev.pointerId!==_mq.pid) return false; var dx=ev.clientX-_mq.sx, dy=ev.clientY-_mq.sy; if(_mq.on) return true; if(Math.abs(dx)<_MQ_MIN && Math.abs(dy)<_MQ_MIN) return false; _mq.on=true; _marqueeDidDrag=true; document.body.classList.add('sel-mq-active'); var box=$('selMarquee'); if(box) box.classList.add('show'); try{ document.body.setPointerCapture(ev.pointerId); }catch(e){} return true; }
function selMarqueeMove(ev){ if(!_mq||ev.pointerId!==_mq.pid) return; if(!selMarqueeActive(ev)) return; ev.preventDefault(); _mq.ox=ev.clientX; _mq.oy=ev.clientY; selMarqueePaint(); selApplyMarquee(selMarqueeRect(), _mq.additive, _mq.baseSel); }
function selMarqueeEnd(ev){ if(!_mq||ev.pointerId!==_mq.pid) return; if(_mq.on){ selApplyMarquee(selMarqueeRect(), _mq.additive, _mq.baseSel); try{ document.body.releasePointerCapture(ev.pointerId); }catch(e){} } if(!_selMode) selClearMarqueePreview(); document.body.classList.remove('sel-mq-active'); var box=$('selMarquee'); if(box){ box.classList.remove('show'); box.style.width='0'; box.style.height='0'; } var did=_marqueeDidDrag&&_mq.on; _mq=null; if(did) setTimeout(function(){ _marqueeDidDrag=false; }, 320); }
function selMarqueeInit(){ if(selMarqueeInit.done) return; selMarqueeInit.done=true; document.addEventListener('pointerdown', selMarqueeBegin, true); document.addEventListener('pointermove', selMarqueeMove, {passive:false}); document.addEventListener('pointerup', selMarqueeEnd); document.addEventListener('pointercancel', selMarqueeEnd); document.addEventListener('keydown', function(e){ if(e.key!=='Escape'||!openNoteId) return; if(document.querySelector('.overlay.open')) return; var ae=document.activeElement; if(ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA')&&ae.id!=='editTA'&&!ae.classList.contains('gname')&&!ae.classList.contains('gname-view')) return; selEscKey(); }); }
function toggleSelMode(){ if(!_selMode){ _sel={}; selEnterMode(); return; } if(!selCount()) selExitMode(); else { _sel={}; renderItems(); updateSelBar(); } }
function selToggle(id){ if(_marqueeDidDrag||_dragDidMove) return; if(_sel[id]) delete _sel[id]; else _sel[id]=1; renderItems(); updateSelBar(); }
function selAll(){ var its=itemsOf(openNoteId).filter(function(x){return !isGroup(x);}); var all=its.length>0 && its.every(function(x){return _sel[x.id];}); _sel={}; if(!all) its.forEach(function(x){ _sel[x.id]=1; }); renderItems(); updateSelBar(); }
function selMark(v){ var ids=Object.keys(_sel); if(!ids.length) return; var changed=[]; ids.forEach(function(id){ var it=(DATA.itens||[]).find(function(x){return x.id===id;}); if(it && it.marcavel && it.feito!==v){ it.feito=v; changed.push(it); } }); renderItems(); if(changed.length) persistItems(changed); var n=note(openNoteId); if(n) touchNote(n); }
function delItemRows(ids){
  return itemRowMap('Itens',5).then(function(rowOf){
    var rows=[];
    Object.keys(ids).forEach(function(id){ if(rowOf[id]) rows.push(rowOf[id]); });
    rows.sort(function(a,b){return b-a;});
    if(!rows.length) return;
    return JB.api('POST', ssUrl(':batchUpdate'), { requests: rows.map(function(r){ return { deleteDimension:{ range:{ sheetId:_ncGrid()['Itens'], dimension:'ROWS', startIndex:r-1, endIndex:r } } }; }) }).then(function(){
      invalidateRowCache('Itens');
    });
  });
}
function selDelete(){ var ids=Object.keys(_sel); if(!ids.length) return; var m={}; ids.forEach(function(i){m[i]=1;}); JB.confirm('Excluir selecionados?', ids.length+(ids.length>1?' itens serão removidos.':' item será removido.'), function(){
  notasPersist({
    run: function(){ return delItemRows(m); },
    onSuccess: function(){
      DATA.itens=(DATA.itens||[]).filter(function(x){return !m[x.id];});
      _sel={}; _selMode=false; renderEditor();
      var n=note(openNoteId); if(n) touchNote(n);
      toast('✓ Removidos');
    },
    onError: notasWriteErr
  });
}, { yes:'Excluir', no:'Cancelar', danger:true }); }
function updateSelBar(){ var bar=$('selBar'); if(!bar) return; var hasItems=!!(openNoteId && itemsOf(openNoteId).some(function(x){return !isGroup(x);})); var vis=hasItems && (_selMode || !_editId); bar.classList.toggle('show', vis); bar.classList.toggle('sel-on', _selMode); var c=$('selCount'); if(c) c.textContent=selCount(); }

JB.applySkin('notas');
selMarqueeInit();
startAuth();
