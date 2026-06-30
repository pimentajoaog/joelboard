/* Joelboard Notas — app logic. © 2026 Joel Soluções LTDA.
   Classic global script (NOT a module); loads after /joelboard.js. Edit behavior here, markup in the .html. */
var DATA=null, notasGrid={}, authDone=false, openNoteId=null, homeQuery='', _nbooted=false;
var NOTAS_TABS=[['Notas',['Titulo','Tipo','Cor','Fixado','Criado','Atualizado','ID','Vence']],['Itens',['NotaID','Ordem','Texto','Marcavel','Feito','ID','Tipo']],['Config',['Chave','Valor']]];
var KINDS=[
  {k:'compras', label:'Compras', icon:'🛒', color:'#34d399', defCheck:true},
  {k:'tarefas', label:'Tarefas', icon:'✅', color:'#60a5fa', defCheck:true},
  {k:'nota',    label:'Nota',    icon:'📝', color:'#fbbf24', defCheck:false},
  {k:'viagem',  label:'Viagem',  icon:'🧳', color:'#22d3ee', defCheck:true}
];
var MOFULL=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function $(id){ return document.getElementById(id); }
function uuid(){ return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&0x3|0x8)).toString(16);}); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(s){ return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function normText(s){ return String(s==null?'':s).trim().toLowerCase(); }
function loadingHtml(h){ $('loading').style.display='block'; $('loading').innerHTML=h; }
function toast(m){ var t=$('toast'); t.textContent=m; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(function(){t.classList.remove('show');},2200); }
function kindDef(k){ for(var i=0;i<KINDS.length;i++){ if(KINDS[i].k===k) return KINDS[i]; } return KINDS[1]; }
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
  return '<div class="secbar" style="margin-bottom:8px"><div class="sect">⏳ Com prazo</div></div><div class="due-strip">'+ds.map(function(n){ var kd=kindDef(n.tipo); var open=noteOpen(n); return '<div class="due-row" style="--kc:'+kd.color+'" onclick="openNote(\''+n.id+'\')"><span class="dr-ico">'+kd.icon+'</span><span class="dr-title">'+esc(n.titulo)+'</span>'+(open?'<span class="dr-rem">faltam '+open+'</span>':'')+'<span class="due-badge '+dueClass(n.vence)+'">'+esc(dueLabel(n.vence))+'</span></div>'; }).join('')+'</div>';
}
function commitDue(v){ var n=note(openNoteId); if(!n) return; n.vence=v||''; touchNote(n); renderEditor(); }
function clearDue(){ var n=note(openNoteId); if(!n) return; n.vence=''; touchNote(n); renderEditor(); }

/* ---- auth (shared core) ---- */
function startAuth(){
  if (JB.cachedToken()){ afterAuth(); return; }
  loadingHtml('<div class="gate"><div class="gt">📝 Joelboard Notas</div><div class="gs">Entrando…</div></div>');
  JB.requestToken(false).then(function(){ authDone=true; afterAuth(); }).catch(showSignIn);
  setTimeout(function(){ if(!authDone && !JB.cachedToken()) showSignIn(); }, 3000);
}
function showSignIn(){ loadingHtml('<div class="gate"><div class="gt">📝 Joelboard Notas</div><div class="gs">Listas e notas que você marca — num lugar só.</div><button class="btn" onclick="doSignIn()">Entrar com Google</button></div>'); }
function doSignIn(){ JB.requestToken(true).then(function(){ authDone=true; afterAuth(); }).catch(function(){}); }
function notasSignOut(){ JB.signOut(); location.reload(); }
function afterAuth(){ loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Carregando…</div></div>'); JB.fetchEmail().then(bootSheet); }

/* ---- sheet bootstrap ---- */
function ssUrl(p){ return 'https://sheets.googleapis.com/v4/spreadsheets/'+JB.getSheetId('notas')+p; }
function bootSheet(){
  loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Procurando suas listas…</div></div>');
  JB.resolveSheet({ app:'notas', namePart:'Joelboard', requiredTabs: ['Notas','Itens'] })  /* distinctive tabs only — Config is shared */
    .then(function(ctx){ notasGrid=ctx.grid; ensureTabs().then(ensureVenceHeader).then(ensureTipoHeader).then(loadData); })
    .catch(function(e){ var m=String((e&&e.message)||''); if(m.indexOf('silent_timeout')>-1||m.indexOf('auth_failed')>-1||m.indexOf('401')>-1||m.indexOf('cancelled')>-1){ showSignIn(); return; } if(m==='JB_NEED_SHEET'){ var f=(e.files||[]); if(f.length>1) offerLink(f[0]); else gate(); return; } loadingHtml('<div class="gate"><div class="gs" style="color:var(--primary)">Erro: '+esc(m)+'</div></div>'); });
}
function ensureTabs(){
  var missing=NOTAS_TABS.filter(function(t){ return notasGrid[t[0]]==null; });
  if(!missing.length) return Promise.resolve();
  return JB.api('POST', ssUrl(':batchUpdate'), { requests: missing.map(function(t){ return { addSheet:{ properties:{ title:t[0] } } }; }) })
    .then(function(res){ (res.replies||[]).forEach(function(rep){ if(rep&&rep.addSheet){ notasGrid[rep.addSheet.properties.title]=rep.addSheet.properties.sheetId; } });
      return JB.api('POST', ssUrl('/values:batchUpdate'), { valueInputOption:'RAW', data: missing.map(function(t){ return { range:t[0]+'!A1', values:[t[1]] }; }) }); })
    .then(function(){}).catch(function(){});
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
  loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Carregando…</div></div>');
  var want=NOTAS_TABS.map(function(t){return t[0];}).filter(function(t){return notasGrid[t]!=null;});
  var ranges=want.map(function(t){return 'ranges='+encodeURIComponent(t);}).join('&');
  JB.api('GET', ssUrl('/values:batchGet?'+ranges+'&valueRenderOption=UNFORMATTED_VALUE')).then(function(res){
    var by={}; (res.valueRanges||[]).forEach(function(vr,i){ by[want[i]]=vr.values||[]; });
    DATA=buildNotas(by); show();
  }).catch(function(e){ var m=String(e.message||''); if(m.indexOf('403')>-1||m.indexOf('404')>-1||m.indexOf('PERMISSION')>-1){ JB.clearSheetId('notas'); bootSheet(); return; } loadingHtml('<div class="gate"><div class="gs" style="color:var(--primary)">Erro: '+esc(e.message)+'</div></div>'); });
}
function buildNotas(t){
  var config={}; body(t.Config).forEach(function(r){ if(r[0]) config[r[0]]=r[1]; });
  return {
    notas: body(t.Notas).filter(function(r){return r[6];}).map(function(r){ return { id:r[6], titulo:String(r[0]||''), tipo:String(r[1]||'tarefas'), cor:String(r[2]||''), fixado:!!r[3], criado:String(r[4]||''), atualizado:String(r[5]||''), vence:String(r[7]||'') }; }),
    itens: body(t.Itens).filter(function(r){return r[5];}).map(function(r){ return { id:r[5], notaId:String(r[0]||''), ordem:Number(r[1])||0, texto:String(r[2]||''), marcavel:!!r[3], feito:!!r[4], tipo:String(r[6]||'') }; }),
    config: config
  };
}
function show(){ $('loading').style.display='none'; $('app').style.display='block'; $('acctEmail').textContent='👤 '+(JB.email()||''); render(); if(!_nbooted){ _nbooted=true; if(!JB.tourDone('notas')) setTimeout(function(){ JB.tour('notas', NOTAS_TOUR); }, 600); else setTimeout(checkNudges, 400); } }

/* ---- routing / render ---- */
function note(id){ return (DATA.notas||[]).find(function(n){return n.id===id;}); }
function render(){ var ed=!!(openNoteId&&note(openNoteId)); $('fab').style.display=ed?'none':'flex'; if(ed) renderEditor(); else renderHomeShell(); }
function openNote(id){ openNoteId=id; _lastTick=null; render(); window.scrollTo(0,0); }
function backHome(){ openNoteId=null; render(); }

/* ---- home ---- */
function renderHomeShell(){ $('main').innerHTML='<div class="searchbar"><input class="field" placeholder="🔎 Buscar listas…" value="'+escAttr(homeQuery)+'" oninput="onHomeSearch(this.value)"></div><div id="homeList"></div>'; renderHomeList(); }
function onHomeSearch(v){ homeQuery=v; renderHomeList(); }
function itemsOf(id){ return (DATA.itens||[]).filter(function(x){return x.notaId===id;}).sort(function(a,b){ return a.ordem-b.ordem; }); }
function renderHomeList(){
  var el=$('homeList'); if(!el) return; var q=normText(homeQuery);
  var ns=(DATA.notas||[]).slice().sort(function(a,b){ return String(b.atualizado||b.criado||'').localeCompare(String(a.atualizado||a.criado||'')); });
  if(q) ns=ns.filter(function(n){ if(normText(n.titulo).indexOf(q)>-1) return true; return (DATA.itens||[]).some(function(it){return it.notaId===n.id && normText(it.texto).indexOf(q)>-1;}); });
  if(!ns.length){ el.innerHTML = (DATA.notas&&DATA.notas.length)? '<div class="empty">Nada encontrado.</div>' : '<div class="empty" style="padding:40px 14px">Nenhuma lista ainda.<br>Toque no <b>+</b> para criar sua primeira.</div>'; return; }
  var pinned=ns.filter(function(n){return n.fixado;}), rest=ns.filter(function(n){return !n.fixado;}); var html=(q?'':dueStripHtml());
  if(pinned.length){ html+='<div class="secbar pin-sect"><div class="sect">📌 Fixadas</div></div><div class="notes-grid">'+pinned.map(noteCard).join('')+'</div>'; }
  if(rest.length){ if(pinned.length) html+='<div class="secbar" style="margin-top:18px"><div class="sect">Todas</div></div>'; html+='<div class="notes-grid">'+rest.map(noteCard).join('')+'</div>'; }
  el.innerHTML=html;
}
function noteCard(n){
  var kd=kindDef(n.tipo); var its=itemsOf(n.id).filter(function(x){return x.tipo!=='g';}); var chk=its.filter(function(x){return x.marcavel;}); var done=chk.filter(function(x){return x.feito;}).length;
  var prog = chk.length ? ('<div class="nc-pbar"><span style="width:'+Math.round(done/chk.length*100)+'%"></span></div>') : '';
  var metaCount = chk.length ? (done+'/'+chk.length+' feitos') : (its.length+' '+(its.length===1?'linha':'linhas'));
  return '<div class="notec" style="--kc:'+kd.color+'" onclick="openNote(\''+n.id+'\')">'
    +'<div class="nc-top"><span class="nc-ico">'+kd.icon+'</span><div class="nc-title">'+esc(n.titulo||'(sem título)')+'</div><button class="nc-pin'+(n.fixado?' on':'')+'" onclick="togglePin(event,\''+n.id+'\')" title="Fixar">'+(n.fixado?'★':'☆')+'</button></div>'
    +'<div class="nc-kind">'+esc(kd.label)+'</div>'
    +'<div class="nc-meta">'+metaCount+' · '+esc(relTime(n.atualizado||n.criado))+dueBadge(n)+'</div>'+prog+'</div>';
}
function togglePin(ev,id){ ev.stopPropagation(); var n=note(id); if(!n) return; n.fixado=!n.fixado; renderHomeList(); saveNoteRow(n); }

/* ---- new note ---- */
var newKind='tarefas';
function openNew(){ newKind='tarefas'; renderNewKind(); $('newTitle').value=''; if($('newDate'))$('newDate').value=''; $('newOverlay').classList.add('open'); setTimeout(function(){ $('newTitle').focus(); },60); }
function closeNew(){ $('newOverlay').classList.remove('open'); }
function renderNewKind(){ var el=$('newKindWrap'); if(!el) return; var cur=kindDef(newKind); el.innerHTML='<div class="jb-dd"><button type="button" class="jb-dd-btn" onclick="JB.ddToggle(this)"><span>'+cur.icon+' '+esc(cur.label)+'</span><span class="jb-dd-caret">▾</span></button><div class="jb-dd-menu">'+KINDS.map(function(k){return '<div class="jb-dd-opt'+(k.k===newKind?' is-sel':'')+'" onclick="pickNewKind(\''+k.k+'\')">'+k.icon+' '+esc(k.label)+'</div>';}).join('')+'</div></div>'; }
function pickNewKind(k){ newKind=k; if(window.JB&&JB.ddClose)JB.ddClose(); renderNewKind(); }
function createNote(){ var t=($('newTitle').value||'').trim(); var kd=kindDef(newKind); if(!t){ var d=new Date(); t=kd.label+' — '+MOFULL[d.getMonth()]; } var now=new Date().toISOString(); var n={ id:uuid(), titulo:t, tipo:newKind, cor:'', fixado:false, criado:now, atualizado:now, vence:(($('newDate')&&$('newDate').value)||'') }; DATA.notas=DATA.notas||[]; DATA.notas.push(n); appendNote(n); closeNew(); openNote(n.id); }

/* ---- editor ---- */
function renderEditor(){
  var n=note(openNoteId); if(!n){ openNoteId=null; renderHomeShell(); return; }
  var kd=kindDef(n.tipo); var src=lastNoteOfKind(n.tipo,n.id); var fc=fillableCount(n,src); var doneN=itemsOf(openNoteId).filter(function(x){return x.tipo!=='g' && x.marcavel && x.feito;}).length;
  var html='<div style="--kc:'+kd.color+'">'
    +'<button class="lnk" onclick="backHome()">← Listas</button>'
    +'<div class="ed-head"><span class="ed-ico">'+kd.icon+'</span><input class="ed-title" id="edTitle" value="'+escAttr(n.titulo)+'" onblur="commitTitle(this.value)" onkeydown="if(event.key===\'Enter\')this.blur()"></div>'
    +'<div class="ed-sub"><b>'+esc(kd.label)+'</b> · criada '+esc(relTime(n.criado))+'</div>'
    +'<div class="duerow"><span class="dl">📅 Prazo</span><input type="date" class="field due-input" id="edDue" value="'+esc(n.vence||'')+'" onchange="commitDue(this.value)">'+(n.vence?'<button class="due-clear" onclick="clearDue()" title="Remover prazo">✕</button>':'')+'</div>'
    + (fc? '<button class="fillbtn" onclick="fillFromLast()">↻ Preencher da última vez — <b>'+fc+' '+(fc>1?'itens':'item')+'</b> de "'+esc(src.titulo)+'"</button>':'')
    + (doneN? '<button class="delchecked" onclick="deleteChecked()">🗑 Excluir marcados ('+doneN+')</button>':'')
    +'<div id="edItems"></div>'
    +'<div class="iadd"><span class="ico">+</span><input id="addInput" placeholder="Adicionar item… (cole várias linhas de uma vez)" autocomplete="off" oninput="renderUsuals()" onkeydown="if(event.key===\'Enter\'){event.preventDefault();addItemFromInput();}" onpaste="addPaste(event)"><button class="iaddbtn" onclick="addItemFromInput()">Adicionar</button></div>'
    +'<button class="gaddbtn" onclick="addGroup()">＋ Adicionar grupo</button>'
    +'<div class="uwrap" id="edUsuals"></div>'
    +'<button class="del" style="margin-top:26px" onclick="deleteNote()">Excluir lista</button>'
    +'</div>';
  $('main').innerHTML=html; renderItems(); renderUsuals();
}
function renderItems(){
  var el=$('edItems'); if(!el) return; var n=note(openNoteId); var its=itemsOf(openNoteId);
  if(!its.length){ el.innerHTML='<div class="rg" style="padding:8px 0">Lista vazia. Adicione itens abaixo'+(kindDef(n.tipo).defCheck?'':' — toque em ☑ para tornar uma linha marcável')+'.</div>'; return; }
  var collapsed=false, html='';
  its.forEach(function(it){ if(it.tipo==='g'){ collapsed=!!it.feito; html+=groupRow(it); } else { html+=itemRow(it, collapsed); } });
  el.innerHTML=html;
  var tas=el.querySelectorAll('textarea.itext'); for(var i=0;i<tas.length;i++) autoGrow(tas[i]);
}
function autoGrow(t){ if(!t) return; t.style.height='auto'; t.style.height=(t.scrollHeight)+'px'; }
function groupStats(gid){ var its=itemsOf(openNoteId); var i=-1; for(var k=0;k<its.length;k++){ if(its[k].id===gid){ i=k; break; } } var done=0,total=0; for(var j=i+1;j<its.length;j++){ if(its[j].tipo==='g') break; if(its[j].marcavel){ total++; if(its[j].feito) done++; } } return {done:done,total:total}; }
function groupRow(g){ var st=groupStats(g.id); var allon=st.total>0 && st.done===st.total;
  var chk = st.total>1 ? '<button class="ichk gchk'+(allon?' on':(st.done>0?' part':''))+'" onclick="toggleGroupAll(\''+g.id+'\')" title="Marcar/desmarcar todos">'+(allon?'✓':(st.done>0?'–':''))+'</button>' : '';
  return '<div class="ihdr'+(g.feito?' collapsed':'')+'" data-id="'+g.id+'" data-g="1">'
  +'<button class="ihandle" onpointerdown="dragBegin(event,\''+g.id+'\')" title="Arrastar">⠿</button>'
  +'<button class="gchev" onclick="toggleGroup(\''+g.id+'\')" title="Expandir/recolher">'+(g.feito?'▸':'▾')+'</button>'+chk
  +'<input class="gname" value="'+escAttr(g.texto)+'" placeholder="Nome do grupo" autocomplete="off" onblur="commitText(\''+g.id+'\',this.value)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}">'
  +'<span class="gcount">'+(st.total?(st.done+'/'+st.total):'')+'</span>'
  +'<button class="idel" title="Remover grupo" onclick="deleteGroup(\''+g.id+'\')">✕</button></div>'; }
function toggleGroupAll(gid){ var its=itemsOf(openNoteId); var i=-1; for(var k=0;k<its.length;k++){ if(its[k].id===gid){ i=k; break; } } if(i<0) return; var members=[]; for(var j=i+1;j<its.length;j++){ if(its[j].tipo==='g') break; if(its[j].marcavel) members.push(its[j]); } if(!members.length) return; var allDone=members.every(function(m){return m.feito;}); var target=!allDone; members.forEach(function(m){ m.feito=target; }); renderItems(); persistItems(members); var n=note(openNoteId); if(n) touchNote(n); }
function persistItems(arr){ if(!arr||!arr.length) return; JB.api('GET', ssUrl('/values/Itens?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){ var v=res.values||[]; var rowOf={}; for(var i=1;i<v.length;i++){ rowOf[String((v[i]||[])[5])]=i+1; } var data=arr.filter(function(x){return rowOf[x.id];}).map(function(x){ return { range:'Itens!A'+rowOf[x.id]+':G'+rowOf[x.id], values:[itemRowVals(x)] }; }); if(!data.length) return; return JB.api('POST', ssUrl('/values:batchUpdate'), { valueInputOption:'RAW', data:data }); }).catch(function(){}); }
function itemRow(it, hidden){
  var done=it.feito;
  var left = it.marcavel
    ? '<button class="ichk'+(done?' on':'')+'" onclick="toggleItem(event,\''+it.id+'\')" title="Marcar (shift+clique = intervalo)">'+(done?'✓':'')+'</button>'
    : '<span class="ispacer" title="linha de texto">¶</span>';
  var typeBtn = it.marcavel
    ? '<button class="itype" title="Tornar texto" onclick="convertItem(\''+it.id+'\',0)">¶</button>'
    : '<button class="itype" title="Tornar item marcável" onclick="convertItem(\''+it.id+'\',1)">☑</button>';
  return '<div class="irow'+(done?' done':'')+(hidden?' ihide':'')+'" data-id="'+it.id+'">'
    +'<button class="ihandle" onpointerdown="dragBegin(event,\''+it.id+'\')" title="Arrastar">⠿</button>'+left
    +'<textarea class="itext" rows="1" autocomplete="off" oninput="autoGrow(this)" onblur="commitText(\''+it.id+'\',this.value)" onkeydown="itemKey(event,\''+it.id+'\')" onpaste="itemPaste(event,\''+it.id+'\')">'+esc(it.texto)+'</textarea>'
    +typeBtn+'<button class="idel" title="Excluir" onclick="deleteItem(\''+it.id+'\')">✕</button></div>';
}
function itemKey(e,id){ if(e.key==='Enter'){ e.preventDefault(); commitText(id,e.target.value); var a=$('addInput'); if(a) a.focus(); } }
function nextOrd(){ var o=1; (DATA.itens||[]).forEach(function(x){ if(x.notaId===openNoteId && x.ordem>=o) o=x.ordem+1; }); return o; }
function addItemText(text, mk){ var n=note(openNoteId); if(!n) return null; var kd=kindDef(n.tipo); var it={ id:uuid(), notaId:openNoteId, ordem:nextOrd(), texto:text, marcavel:(mk==null?kd.defCheck:!!mk), feito:false, tipo:'' }; DATA.itens=DATA.itens||[]; DATA.itens.push(it); appendItem(it); touchNote(n); return it; }
function addItemFromInput(){ var inp=$('addInput'); var v=(inp.value||'').trim(); if(!v) return; addItemText(v); inp.value=''; renderItems(); renderUsuals(); setTimeout(function(){ var a=$('addInput'); if(a) a.focus(); },10); }
function addUsual(t){ addItemText(t); var inp=$('addInput'); if(inp) inp.value=''; renderItems(); renderUsuals(); }
function toggleItem(ev,id){ var it=(DATA.itens||[]).find(function(x){return x.id===id;}); if(!it) return;
  if(ev && ev.shiftKey && _lastTick && _lastTick!==id){ var its=itemsOf(openNoteId).filter(function(x){return x.tipo!=='g' && x.marcavel;}); var i1=-1,i2=-1; for(var k=0;k<its.length;k++){ if(its[k].id===_lastTick) i1=k; if(its[k].id===id) i2=k; } if(i1>-1 && i2>-1){ var lo=Math.min(i1,i2), hi=Math.max(i1,i2), target=!it.feito, changed=[]; for(var j=lo;j<=hi;j++){ if(its[j].feito!==target){ its[j].feito=target; changed.push(its[j]); } } _lastTick=id; renderItems(); if(changed.length) persistItems(changed); var nn=note(openNoteId); if(nn) touchNote(nn); return; } }
  it.feito=!it.feito; _lastTick=id; renderItems(); saveItemRow(it); var n=note(openNoteId); if(n) touchNote(n); }
function convertItem(id,mk){ var it=(DATA.itens||[]).find(function(x){return x.id===id;}); if(!it) return; it.marcavel=!!mk; if(!mk) it.feito=false; renderItems(); saveItemRow(it); var n=note(openNoteId); if(n) touchNote(n); }
function commitText(id,val){ var it=(DATA.itens||[]).find(function(x){return x.id===id;}); if(!it) return; var v=val.replace(/\s+$/,''); if(it.tipo==='g'){ if(v===it.texto) return; it.texto=v; saveItemRow(it); var ng=note(openNoteId); if(ng) touchNote(ng); return; } if(!v.trim()){ deleteItem(id); return; } if(v===it.texto) return; it.texto=v; saveItemRow(it); var n=note(openNoteId); if(n) touchNote(n); }
function deleteItem(id){ DATA.itens=(DATA.itens||[]).filter(function(x){return x.id!==id;}); renderItems(); renderUsuals(); var n=note(openNoteId); if(n) touchNote(n); findRow('Itens',5,id).then(function(row){ if(row<0) return; return JB.api('POST', ssUrl(':batchUpdate'), { requests:[{ deleteDimension:{ range:{ sheetId:notasGrid['Itens'], dimension:'ROWS', startIndex:row-1, endIndex:row } } }] }); }).catch(function(){}); }
function commitTitle(val){ var n=note(openNoteId); if(!n) return; var v=(val||'').trim()||'(sem título)'; if(v===n.titulo) return; n.titulo=v; touchNote(n); }
function deleteNote(){ var id=openNoteId; var n=note(id); if(!n) return; JB.confirm('Excluir lista?','"'+(n.titulo||'')+'" e seus itens serão removidos.', function(){
  DATA.notas=(DATA.notas||[]).filter(function(x){return x.id!==id;});
  DATA.itens=(DATA.itens||[]).filter(function(x){return x.notaId!==id;});
  openNoteId=null; render(); toast('✓ Excluído');
  JB.api('GET', ssUrl('/values/Itens?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){ var v=res.values||[]; var rows=[]; for(var i=1;i<v.length;i++){ if(String((v[i]||[])[0])===String(id)) rows.push(i+1); } rows.sort(function(a,b){return b-a;}); if(rows.length){ return JB.api('POST', ssUrl(':batchUpdate'), { requests: rows.map(function(r){ return { deleteDimension:{ range:{ sheetId:notasGrid['Itens'], dimension:'ROWS', startIndex:r-1, endIndex:r } } }; }) }); } }).catch(function(){});
  findRow('Notas',6,id).then(function(row){ if(row<0) return; return JB.api('POST', ssUrl(':batchUpdate'), { requests:[{ deleteDimension:{ range:{ sheetId:notasGrid['Notas'], dimension:'ROWS', startIndex:row-1, endIndex:row } } }] }); }).catch(function(){});
}, { yes:'Excluir', no:'Cancelar', danger:true }); }

/* ---- intelligence: usuals, fill-from-last, recurrence ---- */
function usuals(kind){ var map={}; (DATA.notas||[]).filter(function(n){return n.tipo===kind;}).forEach(function(n){ (DATA.itens||[]).filter(function(x){return x.notaId===n.id && x.tipo!=='g';}).forEach(function(it){ var t=(it.texto||'').trim(); if(!t) return; var k=normText(t); if(!map[k]) map[k]={norm:k,text:t,count:0,last:n.criado||''}; map[k].count++; if(String(n.criado||'')>String(map[k].last)){ map[k].last=n.criado; map[k].text=t; } }); }); return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){ if(b.count!==a.count) return b.count-a.count; return String(b.last||'').localeCompare(String(a.last||'')); }); }
function renderUsuals(){
  var el=$('edUsuals'); if(!el) return; var n=note(openNoteId); if(!n){ el.innerHTML=''; return; }
  var q=normText(($('addInput')&&$('addInput').value)||''); var present={}; (DATA.itens||[]).filter(function(x){return x.notaId===openNoteId;}).forEach(function(x){present[normText(x.texto)]=1;});
  var list=usuals(n.tipo).filter(function(u){ return !present[u.norm] && (!q || u.norm.indexOf(q)>-1); }).slice(0,12);
  if(!list.length){ el.innerHTML=''; return; }
  el.innerHTML='<div class="sect">'+(q?'Sugestões':'Frequentes')+'</div><div class="uchips">'+list.map(function(u){return '<button class="uchip" onclick="addUsual(\''+escAttr(u.text)+'\')"><span class="uplus">+</span>'+esc(u.text)+'</button>';}).join('')+'</div>';
}
function lastNoteOfKind(kind,ex){ var arr=(DATA.notas||[]).filter(function(n){return n.tipo===kind && n.id!==ex;}).sort(function(a,b){return String(b.criado||'').localeCompare(String(a.criado||''));}); return arr[0]||null; }
function fillableCount(n,src){ if(!src) return 0; var present={}; (DATA.itens||[]).filter(function(x){return x.notaId===n.id;}).forEach(function(x){present[normText(x.texto)]=1;}); return (DATA.itens||[]).filter(function(x){return x.notaId===src.id && x.tipo!=='g' && (x.texto||'').trim() && !present[normText(x.texto)];}).length; }
function fillFromLast(){ var n=note(openNoteId); if(!n) return; var src=lastNoteOfKind(n.tipo,n.id); if(!src) return; var present={}; (DATA.itens||[]).filter(function(x){return x.notaId===n.id;}).forEach(function(x){present[normText(x.texto)]=1;}); var from=(DATA.itens||[]).filter(function(x){return x.notaId===src.id && x.tipo!=='g' && (x.texto||'').trim() && !present[normText(x.texto)];}).sort(function(a,b){return a.ordem-b.ordem;}); if(!from.length){ toast('Nada novo para adicionar'); return; } var ord=nextOrd(); var add=from.map(function(s){ var it={ id:uuid(), notaId:openNoteId, ordem:ord++, texto:s.texto, marcavel:s.marcavel, feito:false, tipo:'' }; DATA.itens.push(it); return it; }); appendItems(add); touchNote(n); renderEditor(); toast('✓ '+add.length+' '+(add.length>1?'itens adicionados':'item adicionado')); }
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
  var html=kd.icon+' <strong>'+esc(n.titulo)+'</strong> '+when+(open?(' — '+(open>1?'faltam '+open+' itens':'falta 1 item')):'')+'.';
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
function createNoteFromKind(kind,titulo,fill){ var now=new Date().toISOString(); var n={ id:uuid(), titulo:titulo, tipo:kind, cor:'', fixado:false, criado:now, atualizado:now, vence:'' }; DATA.notas=DATA.notas||[]; DATA.notas.push(n); appendNote(n); openNoteId=n.id; if(fill){ var src=lastNoteOfKind(kind,n.id); if(src){ var ord=1, add=[]; (DATA.itens||[]).filter(function(x){return x.notaId===src.id && x.tipo!=='g' && (x.texto||'').trim();}).sort(function(a,b){return a.ordem-b.ordem;}).forEach(function(s){ var it={id:uuid(),notaId:n.id,ordem:ord++,texto:s.texto,marcavel:s.marcavel,feito:false,tipo:''}; DATA.itens.push(it); add.push(it); }); appendItems(add); } } render(); window.scrollTo(0,0); }

/* ---- persistence ---- */
function noteRowVals(n){ return [n.titulo,n.tipo,n.cor||'',n.fixado?'1':'',n.criado,n.atualizado,n.id,n.vence||'']; }
function itemRowVals(it){ return [it.notaId,it.ordem,it.texto,it.marcavel?'1':'',it.feito?'1':'',it.id,it.tipo||'']; }
function appendNote(n){ JB.api('POST', ssUrl('/values/Notas:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:[noteRowVals(n)] }).catch(function(){ toast('Erro ao salvar'); }); }
function saveNoteRow(n){ findRow('Notas',6,n.id).then(function(row){ if(row<0) return; return JB.api('PUT', ssUrl('/values/'+encodeURIComponent('Notas!A'+row+':H'+row)+'?valueInputOption=RAW'), { values:[noteRowVals(n)] }); }).catch(function(){}); }
function touchNote(n){ n.atualizado=new Date().toISOString(); saveNoteRow(n); }
function appendItem(it){ appendItems([it]); }
function appendItems(arr){ if(!arr||!arr.length) return; JB.api('POST', ssUrl('/values/Itens:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: arr.map(itemRowVals) }).catch(function(){ toast('Erro ao salvar'); }); }
function saveItemRow(it){ findRow('Itens',5,it.id).then(function(row){ if(row<0) return; return JB.api('PUT', ssUrl('/values/'+encodeURIComponent('Itens!A'+row+':G'+row)+'?valueInputOption=RAW'), { values:[itemRowVals(it)] }); }).catch(function(){ toast('Erro ao salvar'); }); }
function findRow(tab,idCol,id){ return JB.api('GET', ssUrl('/values/'+encodeURIComponent(tab)+'?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){ var v=res.values||[]; for(var i=1;i<v.length;i++){ if(String((v[i]||[])[idCol])===String(id)) return i+1; } return -1; }); }
function saveConfig(k,v){ DATA.config=DATA.config||{}; DATA.config[k]=v; JB.api('GET', ssUrl('/values/Config?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){ var vals=res.values||[]; for(var i=1;i<vals.length;i++){ if(String((vals[i]||[])[0])===k) return JB.api('PUT', ssUrl('/values/'+encodeURIComponent('Config!B'+(i+1))+'?valueInputOption=RAW'), {values:[[v]]}); } return JB.api('POST', ssUrl('/values/Config:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {values:[[k,v]]}); }).catch(function(){}); }

/* ---- settings + tour ---- */
function openSettings(){ switchSet('tema'); JB.renderSkinPicker('notas', $('setSkins')); $('setNudge').classList.toggle('on', (DATA.config&&DATA.config.nudgePref)!=='off'); $('setOverlay').classList.add('open'); }
function closeSettings(){ $('setOverlay').classList.remove('open'); }
function switchSet(name){ var ts=document.querySelectorAll('#setOverlay .set-tab'); for(var i=0;i<ts.length;i++) ts[i].classList.toggle('active',ts[i].getAttribute('data-st')===name); var ps=document.querySelectorAll('#setOverlay .set-pane'); for(var j=0;j<ps.length;j++) ps[j].style.display=(ps[j].getAttribute('data-pane')===name)?'':'none'; }
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
function deleteGroup(id){ DATA.itens=(DATA.itens||[]).filter(function(x){return x.id!==id;}); renderItems(); var n=note(openNoteId); if(n) touchNote(n); findRow('Itens',5,id).then(function(row){ if(row<0) return; return JB.api('POST', ssUrl(':batchUpdate'), { requests:[{ deleteDimension:{ range:{ sheetId:notasGrid['Itens'], dimension:'ROWS', startIndex:row-1, endIndex:row } } }] }); }).catch(function(){}); toast('Grupo removido (itens mantidos)'); }
function splitLines(txt){ return String(txt||'').split(/\r?\n/).map(function(l){ return l.replace(/^\s*[-*•·\u2022\u25AA\u25CB\u2013\u2014]\s+/,'').replace(/^\s*\d+[\.\)]\s+/,'').replace(/^\s*\[[ xX]?\]\s*/,'').trim(); }).filter(function(l){return l.length;}); }
function addManyItems(lines){ var n=note(openNoteId); if(!n||!lines.length) return; var kd=kindDef(n.tipo); var ord=nextOrd(); var add=lines.map(function(L){ var it={ id:uuid(), notaId:openNoteId, ordem:ord++, texto:L, marcavel:kd.defCheck, feito:false, tipo:'' }; DATA.itens.push(it); return it; }); appendItems(add); touchNote(n); renderEditor(); toast('✓ '+add.length+(add.length>1?' itens':' item')); }
function addPaste(e){ var t=((e.clipboardData||window.clipboardData)||{}).getData?((e.clipboardData||window.clipboardData).getData('text')):''; if(t && /\r?\n/.test(t)){ e.preventDefault(); var lines=splitLines(t); var cur=($('addInput').value||'').trim(); if(cur) lines.unshift(cur); $('addInput').value=''; addManyItems(lines); setTimeout(function(){ var a=$('addInput'); if(a) a.focus(); },10); } }
function itemPaste(e,id){ var t=((e.clipboardData||window.clipboardData)||{}).getData?((e.clipboardData||window.clipboardData).getData('text')):''; if(!t || !/\r?\n/.test(t)) return; e.preventDefault(); var lines=splitLines(t); if(!lines.length) return; var it=(DATA.itens||[]).find(function(x){return x.id===id;}); if(!it) return; it.texto=lines[0]; saveItemRow(it); var base=it.ordem, rest=lines.slice(1); var kd=kindDef(note(openNoteId).tipo); var mk=(it.tipo==='g'?kd.defCheck:it.marcavel); var add=rest.map(function(L,k){ var nit={ id:uuid(), notaId:openNoteId, ordem:base+0.0001*(k+1), texto:L, marcavel:mk, feito:false, tipo:'' }; DATA.itens.push(nit); return nit; }); if(add.length) appendItems(add); normalizeOrder(); touchNote(note(openNoteId)); renderEditor(); }
function normalizeOrder(){ var its=itemsOf(openNoteId); var changed=false; its.forEach(function(x,i){ if(x.ordem!==i+1){ x.ordem=i+1; changed=true; } }); if(changed) persistOrder(); }
function persistOrder(){ JB.api('GET', ssUrl('/values/Itens?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){ var v=res.values||[]; var rowOf={}; for(var i=1;i<v.length;i++){ rowOf[String((v[i]||[])[5])]=i+1; } var data=(DATA.itens||[]).filter(function(x){return x.notaId===openNoteId && rowOf[x.id];}).map(function(x){ return { range:'Itens!B'+rowOf[x.id], values:[[x.ordem]] }; }); if(!data.length) return; return JB.api('POST', ssUrl('/values:batchUpdate'), { valueInputOption:'RAW', data:data }); }).catch(function(){}); }
function applyOrder(ids){ var idx={}; ids.forEach(function(id,i){ idx[id]=i+1; }); (DATA.itens||[]).forEach(function(x){ if(x.notaId===openNoteId && idx[x.id]!=null) x.ordem=idx[x.id]; }); renderItems(); persistOrder(); var n=note(openNoteId); if(n) touchNote(n); }
var _drag=null, _lastTick=null;
function dragBegin(ev,id){ ev.preventDefault(); var cont=$('edItems'); if(!cont) return; var row=cont.querySelector('[data-id="'+id+'"]'); if(!row) return; var block=[row]; if(row.getAttribute('data-g')==='1'){ var sib=row.nextElementSibling; while(sib && sib.getAttribute('data-g')!=='1'){ block.push(sib); sib=sib.nextElementSibling; } } _drag={ block:block, cont:cont, moved:false }; block.forEach(function(b){ b.classList.add('dragging'); }); document.addEventListener('pointermove', dragMove, {passive:false}); document.addEventListener('pointerup', dragEnd, {once:true}); }
function dragMove(ev){ if(!_drag) return; ev.preventDefault(); _drag.moved=true; var cont=_drag.cont, y=ev.clientY; var rows=[].slice.call(cont.children).filter(function(r){ return _drag.block.indexOf(r)<0 && !r.classList.contains('ihide'); }); var target=null; for(var i=0;i<rows.length;i++){ var rect=rows[i].getBoundingClientRect(); if(y < rect.top+rect.height/2){ target=rows[i]; break; } } _drag.block.forEach(function(b){ if(target) cont.insertBefore(b,target); else cont.appendChild(b); }); }
function dragEnd(){ if(!_drag) return; document.removeEventListener('pointermove', dragMove); _drag.block.forEach(function(b){ b.classList.remove('dragging'); }); var cont=_drag.cont, moved=_drag.moved; _drag=null; if(!moved) return; var ids=[].slice.call(cont.children).filter(function(r){return r.getAttribute && r.getAttribute('data-id');}).map(function(r){return r.getAttribute('data-id');}); applyOrder(ids); }

function deleteChecked(){ var done=itemsOf(openNoteId).filter(function(x){return x.tipo!=='g' && x.marcavel && x.feito;}); if(!done.length) return; var ids={}; done.forEach(function(x){ids[x.id]=1;}); JB.confirm('Excluir marcados?', done.length+(done.length>1?' itens marcados serão removidos.':' item marcado será removido.'), function(){ DATA.itens=(DATA.itens||[]).filter(function(x){return !ids[x.id];}); renderEditor(); var n=note(openNoteId); if(n) touchNote(n); JB.api('GET', ssUrl('/values/Itens?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){ var v=res.values||[]; var rows=[]; for(var i=1;i<v.length;i++){ if(ids[String((v[i]||[])[5])]) rows.push(i+1); } rows.sort(function(a,b){return b-a;}); if(rows.length) return JB.api('POST', ssUrl(':batchUpdate'), { requests: rows.map(function(r){ return { deleteDimension:{ range:{ sheetId:notasGrid['Itens'], dimension:'ROWS', startIndex:r-1, endIndex:r } } }; }) }); }).catch(function(){}); toast('✓ Removidos'); }, { yes:'Excluir', no:'Cancelar', danger:true }); }

JB.applySkin('notas');
startAuth();
